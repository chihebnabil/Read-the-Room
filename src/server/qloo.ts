import type { AgeBand, Kind, QlooEntity, Receipt, TasteTag } from '~/lib/types'
import * as sample from './sample'

// Hackathon keys only work against this host.
const BASE = process.env.QLOO_BASE_URL || 'https://hackathon.api.qloo.com'

export const qlooIsLive = () => Boolean(process.env.QLOO_API_KEY)

export const NATIONAL = 'United States'

type Json = Record<string, any>
type Params = Record<string, string | number | undefined>

export class QlooError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
  }
}

// Private server-side caching is allowed by the hackathon rules and keeps us well inside the quota.
const cache = new Map<string, { at: number; body: Json }>()
const TTL = 6 * 60 * 60 * 1000

// Bounded concurrency so one read never floods the API.
let active = 0
const waiting: (() => void)[] = []
async function slot<T>(fn: () => Promise<T>): Promise<T> {
  if (active >= 6) await new Promise<void>((r) => waiting.push(r))
  active++
  try {
    return await fn()
  } finally {
    active--
    waiting.shift()?.()
  }
}

function clean(params: Params) {
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== '') out[k] = String(v)
  return out
}

async function get(label: string, path: string, params: Params, receipts: Receipt[]): Promise<Json> {
  const p = clean(params)
  const url = new URL(path, BASE)
  for (const [k, v] of Object.entries(p)) url.searchParams.set(k, v)
  const key = url.pathname + url.search
  const started = Date.now()

  const hit = cache.get(key)
  if (hit && Date.now() - hit.at < TTL) {
    receipts.push({ label, endpoint: path, params: p, ms: 0, source: 'cache', resultCount: count(hit.body) })
    return hit.body
  }

  const body = await slot(async () => {
    for (let attempt = 1; ; attempt++) {
      let res: Response | undefined
      try {
        res = await fetch(url, {
          headers: { 'X-Api-Key': process.env.QLOO_API_KEY!, accept: 'application/json' },
          signal: AbortSignal.timeout(25_000),
        })
      } catch (e) {
        if (attempt >= 3) throw new QlooError(`Qloo ${path} unreachable: ${(e as Error).message}`, 0)
      }
      if (res?.ok) return (await res.json()) as Json
      // Only retry what can succeed on retry: rate limits and server errors.
      if (res && res.status !== 429 && res.status < 500) {
        const text = await res.text().catch(() => '')
        throw new QlooError(`Qloo ${path} returned ${res.status}: ${text.slice(0, 200)}`, res.status)
      }
      if (attempt >= 3) throw new QlooError(`Qloo ${path} returned ${res?.status ?? 'no response'}`, res?.status ?? 0)
      await new Promise((r) => setTimeout(r, 800 * attempt))
    }
  })

  cache.set(key, { at: Date.now(), body })
  receipts.push({ label, endpoint: path, params: p, ms: Date.now() - started, source: 'live', resultCount: count(body) })
  return body
}

function count(body: Json) {
  return entityList(body).length
}

function entityList(body: Json): Json[] {
  const r = body?.results
  if (Array.isArray(r)) return r
  if (Array.isArray(r?.entities)) return r.entities
  if (Array.isArray(body?.entities)) return body.entities
  return []
}

const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null)

function toEntity(e: Json, kind: Kind): QlooEntity {
  return {
    id: String(e.entity_id ?? e.id),
    name: String(e.name),
    kind,
    popularity: num(e.popularity),
    image: e.properties?.image?.url ?? null,
    description:
      e.properties?.short_description ??
      e.properties?.short_descriptions?.find?.((d: Json) => d.languages?.includes('en'))?.value ??
      e.properties?.description ??
      e.disambiguation ??
      null,
  }
}

const urn = (kind: Kind) => `urn:entity:${kind}`

/** The crowd we are reading: a locality (and optionally an age band) as Qloo signals. */
export interface Crowd {
  city: string
  age?: AgeBand | null
}

function crowdSignals(crowd: Crowd): Params {
  return {
    'signal.location.query': crowd.city,
    'signal.demographics.age': crowd.age ?? undefined,
  }
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

/** Resolve a name to Qloo entities. The first result is the best match: exact names win over fuzzy top hits. */
export async function searchEntity(name: string, kind: Kind, receipts: Receipt[]): Promise<QlooEntity[]> {
  if (!qlooIsLive()) return sample.search(name, kind, receipts)
  const body = await get(`Find "${name}"`, '/search', { query: name, types: urn(kind), take: 5 }, receipts)
  const list = entityList(body).filter((e) => e?.name).map((e) => toEntity(e, kind))
  const exact = list.findIndex((e) => norm(e.name) === norm(name))
  if (exact > 0) list.unshift(...list.splice(exact, 1))
  return list
}

/** How strongly a crowd affiliates with specific entities (Insights with filter.results.entities). */
export async function affinityFor(
  kind: Kind,
  ids: string[],
  crowd: Crowd,
  receipts: Receipt[],
  label?: string,
): Promise<Map<string, number | null>> {
  if (ids.length === 0) return new Map()
  if (!qlooIsLive()) return sample.affinity(kind, ids, crowd, receipts, label)
  const body = await get(
    label ?? `Score ${ids.length} ${kind.replace('_', ' ')} reference${ids.length > 1 ? 's' : ''} in ${crowd.city}`,
    '/v2/insights',
    {
      'filter.type': urn(kind),
      'filter.results.entities': ids.join(','),
      ...crowdSignals(crowd),
      take: ids.length,
    },
    receipts,
  )
  const out = new Map<string, number | null>(ids.map((id) => [id, null]))
  for (const e of entityList(body)) {
    const id = String(e.entity_id ?? e.id)
    if (out.has(id)) out.set(id, num(e.query?.affinity))
  }
  return out
}

/** Entities like `id` that this crowd loves, limited to well-known ones so the swap still gets recognized. */
export async function similarForCrowd(
  kind: Kind,
  id: string,
  crowd: Crowd,
  receipts: Receipt[],
  take = 8,
): Promise<{ entity: QlooEntity; affinity: number | null }[]> {
  if (!qlooIsLive()) return sample.similar(kind, id, crowd, receipts, take)
  const body = await get(
    `Find ${kind.replace('_', ' ')}s like it that ${crowd.city} loves`,
    '/v2/insights',
    {
      'filter.type': urn(kind),
      'signal.interests.entities': id,
      ...crowdSignals(crowd),
      'filter.exclude.entities': id,
      'filter.popularity.min': 0.75,
      take,
    },
    receipts,
  )
  return entityList(body).map((e) => ({ entity: toEntity(e, kind), affinity: num(e.query?.affinity) }))
}

/** What this crowd over-indexes on in a category. Places are restricted to the city itself. */
export async function favoritesOf(
  kind: Kind,
  crowd: Crowd,
  receipts: Receipt[],
  take = 6,
): Promise<{ entity: QlooEntity; affinity: number | null }[]> {
  if (!qlooIsLive()) return sample.favorites(kind, crowd, receipts, take)
  const params: Params =
    kind === 'place'
      ? { 'filter.type': urn(kind), 'filter.location.query': crowd.city, 'signal.demographics.age': crowd.age ?? undefined, take }
      : { 'filter.type': urn(kind), ...crowdSignals(crowd), 'filter.popularity.min': 0.6, take }
  const body = await get(`What ${crowd.city} loves: ${kind.replace('_', ' ')}`, '/v2/insights', params, receipts)
  return entityList(body).map((e) => ({ entity: toEntity(e, kind), affinity: num(e.query?.affinity) }))
}

/** Taste analysis: the descriptive tags (genres, styles) a crowd over-indexes on. */
export async function crowdTags(tagType: string, crowd: Crowd, receipts: Receipt[], take = 10): Promise<TasteTag[]> {
  if (!qlooIsLive()) return sample.tags(tagType, crowd, receipts, take)
  const body = await get(
    `Taste profile of ${crowd.city}: ${tagType.split(':').slice(-2).join(' ')}`,
    '/v2/insights',
    { 'filter.type': 'urn:tag', 'filter.tag.types': tagType, ...crowdSignals(crowd), take },
    receipts,
  )
  const tags: Json[] = Array.isArray(body?.results?.tags) ? body.results.tags : entityList(body)
  const seen = new Set<string>()
  return tags
    .map((t) => ({ id: String(t.tag_id ?? t.id ?? t.name), name: String(t.name ?? '').replace(/\s+/g, ' ').trim(), affinity: num(t.query?.affinity) }))
    .filter((t) => {
      const k = t.name.toLowerCase()
      if (!t.name || seen.has(k) || k === crowd.city.toLowerCase()) return false
      seen.add(k)
      return true
    })
}
