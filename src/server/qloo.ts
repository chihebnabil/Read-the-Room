import type { AgeBand, Kind, QlooEntity, Receipt, TasteTag } from '~/lib/types'
import * as sample from './sample'

// Hackathon keys only work against this host.
const BASE = process.env.QLOO_BASE_URL || 'https://hackathon.api.qloo.com'

export const qlooIsLive = () => Boolean(process.env.QLOO_API_KEY)

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

// The hackathon key allows 10 requests per second. Stay under it: a rate-limited call must never read as
// "no audience here", so we pace requests instead of relying on retries.
const PER_SECOND = 8
const sent: number[] = []
let queue = Promise.resolve()
function pace(): Promise<void> {
  const turn = queue.then(async () => {
    for (;;) {
      const now = Date.now()
      while (sent.length && now - sent[0] >= 1000) sent.shift()
      if (sent.length < PER_SECOND) break
      await new Promise((r) => setTimeout(r, 1000 - (now - sent[0]) + 5))
    }
    sent.push(Date.now())
  })
  queue = turn
  return turn
}

// Identical requests made at the same time (for example two cities sharing the comparison panel) share one call.
const inflight = new Map<string, Promise<Json>>()

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

  let pending = inflight.get(key)
  const shared = Boolean(pending)
  if (!pending) {
    pending = fetchWithRetry(url, path).finally(() => inflight.delete(key))
    inflight.set(key, pending)
  }
  const body = await pending
  if (!shared) cache.set(key, { at: Date.now(), body })
  receipts.push({ label, endpoint: path, params: p, ms: Date.now() - started, source: shared ? 'cache' : 'live', resultCount: count(body) })
  return body
}

async function fetchWithRetry(url: URL, path: string): Promise<Json> {
  for (let attempt = 1; ; attempt++) {
    await pace()
    let res: Response | undefined
    try {
      res = await fetch(url, {
        headers: { 'X-Api-Key': process.env.QLOO_API_KEY!, accept: 'application/json' },
        signal: AbortSignal.timeout(25_000),
      })
    } catch (e) {
      if (attempt >= 4) throw new QlooError(`Qloo ${path} unreachable: ${(e as Error).message}`, 0)
    }
    if (res?.ok) return (await res.json()) as Json
    // Only retry what can succeed on retry: rate limits and server errors.
    if (res && res.status !== 429 && res.status < 500) {
      const text = await res.text().catch(() => '')
      throw new QlooError(`Qloo ${path} returned ${res.status}: ${text.slice(0, 200)}`, res.status)
    }
    if (attempt >= 4) throw new QlooError(`Qloo ${path} returned ${res?.status ?? 'no response'}`, res?.status ?? 0)
    const reset = Number(res?.headers.get('x-second-ratelimit-reset'))
    await new Promise((r) => setTimeout(r, res?.status === 429 && reset > 0 ? reset * 1000 + 50 : 600 * attempt))
  }
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

// Qloo spells the video game type without the underscore.
const urn = (kind: Kind) => `urn:entity:${kind === 'video_game' ? 'videogame' : kind}`

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
export async function crowdTags(tagType: string, parents: Kind, crowd: Crowd, receipts: Receipt[], take = 10): Promise<TasteTag[]> {
  if (!qlooIsLive()) return sample.tags(tagType, crowd, receipts, take)
  const body = await get(
    `Taste profile of ${crowd.city}: ${tagType.split(':').slice(-2).join(' ')}`,
    '/v2/insights',
    { 'filter.type': 'urn:tag', 'filter.tag.types': tagType, 'filter.parents.types': urn(parents), ...crowdSignals(crowd), take: take + 4 },
    receipts,
  )
  const tags: Json[] = Array.isArray(body?.results?.tags) ? body.results.tags : entityList(body)
  const seen = new Set<string>()
  return tags
    .map((t) => ({ id: String(t.tag_id ?? t.id ?? t.name), name: tidyTag(String(t.name ?? '')), affinity: num(t.query?.affinity) }))
    .filter((t) => {
      const k = t.name.toLowerCase()
      // Music tags include place names ("nashville", "new york") and filler ("cool"); they say nothing about taste.
      if (!t.name || seen.has(k) || k === crowd.city.toLowerCase() || PLACE_TAGS.has(k) || k === 'cool') return false
      seen.add(k)
      return true
    })
    .slice(0, take)
}

const PLACE_TAGS = new Set(['new york', 'nashville', 'chicago', 'los angeles', 'atlanta', 'boston', 'austin', 'texas', 'brooklyn', 'salt lake city', 'utah', 'south africa'])

function tidyTag(name: string) {
  const s = name.replace(/\s*-\s*/g, '-').replace(/\s+/g, ' ').trim()
  return s.charAt(0).toUpperCase() + s.slice(1)
}
