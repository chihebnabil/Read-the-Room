import { CITIES } from '~/lib/presets'
import { applyAge, strength, verdictFor, type Reading } from '~/lib/scoring'
import type { Kind, QlooEntity, Receipt, Verdict } from '~/lib/types'
import { affinityFor, ageSkewFor, type Crowd } from './qloo'

/**
 * How a reference plays with a crowd, read the way Qloo means it: the same entity compared across cities.
 * The panel is our comparison set of US cities; a reference's baseline is its median strength across the
 * panel cities other than tonight's.
 */
export const PANEL = CITIES

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase()

export interface Read extends Reading {
  verdict: Verdict
  why: string
  /** The strength to display: 0 when Qloo measured no audience here. */
  shown: number | null
  lift: number | null
  /** How the reference's audience skews for tonight's age band, -1..1. */
  ageSkew: number | null
}

function median(xs: number[]) {
  if (xs.length === 0) return null
  const s = [...xs].sort((a, b) => a - b)
  const m = s.length >> 1
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

/**
 * Score entities of one kind for a crowd against the panel. Throws if tonight's crowd cannot be read.
 * Panel cities that fail are left out of the baseline rather than counted as "no audience".
 */
export async function readKind(kind: Kind, entities: QlooEntity[], crowd: Crowd, receipts: Receipt[]): Promise<Map<string, Read>> {
  const ids = [...new Set(entities.map((e) => e.id))]
  if (ids.length === 0) return new Map()
  const label = (city: string) => `Score ${ids.length} ${kind.replace('_', ' ')}${ids.length > 1 ? 's' : ''} in ${city}`
  const others = PANEL.filter((c) => !same(c, crowd.city))
  // With an age signal every affinity collapses to about 0.96, so the city is read on its own and
  // the age band is applied from each audience's age skew.
  const [local, skews, ...panel] = await Promise.all([
    affinityFor(kind, ids, { city: crowd.city }, receipts),
    crowd.age ? ageSkewFor(ids, receipts).catch(() => null) : Promise.resolve(null),
    ...others.map((city) => affinityFor(kind, ids, { city }, receipts, `${label(city)} (comparison)`).catch(() => null)),
  ])
  const answered = panel.filter((p): p is Map<string, number | null> => p !== null)

  const out = new Map<string, Read>()
  for (const e of entities) {
    const values = answered.map((p) => strength(p.get(e.id) ?? null))
    const seen = values.filter((v) => v !== null).length
    const reading: Reading = {
      local: strength(local.get(e.id) ?? null),
      baseline: seen === 0 ? null : median(values.map((v) => v ?? 0)),
      seen,
      of: answered.length,
    }
    const ageSkew = crowd.age ? (skews?.get(e.id)?.[crowd.age] ?? null) : null
    const cityCall = verdictFor(reading, e.popularity, crowd.city)
    const v = crowd.age ? applyAge(cityCall, ageSkew, crowd.age, reading.local) : cityCall
    const shown = reading.local ?? (seen > 0 ? 0 : null)
    out.set(e.id, { ...reading, ...v, shown, ageSkew, lift: shown !== null && reading.baseline !== null ? shown - reading.baseline : null })
  }
  return out
}

/** readKind for a mixed list, grouped by kind. Kinds whose crowd call fails come back missing. */
export async function readAll(items: { kind: Kind; entity: QlooEntity }[], crowd: Crowd, receipts: Receipt[]) {
  const byKind = new Map<Kind, QlooEntity[]>()
  for (const i of items) byKind.set(i.kind, [...(byKind.get(i.kind) ?? []), i.entity])
  const out = new Map<string, Read>()
  await Promise.all(
    [...byKind].map(async ([kind, list]) => {
      const reads = await readKind(kind, list, crowd, receipts).catch(() => null)
      reads?.forEach((r, id) => out.set(id, r))
    }),
  )
  return out
}
