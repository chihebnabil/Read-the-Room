import type { Verdict } from './types'

/**
 * Turns Qloo numbers into a stage call. Kept in one place so the thresholds are easy to audit.
 *
 * Qloo location affinities for well-known entities sit between 0.9 and 0.99999, so we read them on a log scale:
 * strength = -log10(1 - affinity) / 5, which spreads them over 0..1 (0.99 -> 40, 0.999 -> 60, 0.9999 -> 80).
 *
 * A reference is compared with itself in other cities (the panel), not with other references:
 * - local: its strength with tonight's crowd (city + optional age band). 0 = Qloo returned no measurable audience there.
 * - baseline: its median strength across the other panel cities (a city with no measurable audience counts as 0).
 * - seen / of: in how many panel cities Qloo measured an audience at all.
 */
export const THRESHOLDS = {
  /** Lift (local - baseline) at which a reference over- or under-indexes enough to change the call. */
  killsLift: 0.05,
  diesLift: -0.05,
  /** Popularity at which a reference is a household name: recognized even where nobody over-indexes on it. */
  household: 0.995,
  /** The least strength that can carry a bit: below it a reference is never a 🔥, however rare elsewhere. */
  killsStrength: 0.3,
  /** A regional favorite: strong here and measured in at most this share of other cities. */
  regionalShare: 1 / 3,
}

const SCALE = 5

export function strength(affinity: number | null | undefined): number | null {
  if (affinity === null || affinity === undefined) return null
  const gap = Math.max(1 - affinity, 1e-5)
  return Math.max(0, Math.min(1, -Math.log10(gap) / SCALE))
}

export interface Reading {
  /** Strength with tonight's crowd; null when Qloo measured no audience there. */
  local: number | null
  baseline: number | null
  seen: number
  of: number
}

const pts = (n: number) => `${Math.round(n * 100)}`
const signedPts = (n: number) => `${n >= 0 ? '+' : '−'}${Math.abs(Math.round(n * 100))}`

export function verdictFor(r: Reading, popularity: number | null, city: string): { verdict: Verdict; why: string } {
  const household = popularity !== null && popularity >= THRESHOLDS.household
  const elsewhere = `${r.seen} of ${r.of} other cities`

  if (r.local === null) {
    if (r.seen === 0) return { verdict: 'unknown', why: `Qloo has no location data for it in ${city} or the ${r.of} comparison cities.` }
    if (household)
      return {
        verdict: 'risky',
        why: `Everyone knows it, but ${city} does not over-index on it at all (it does in ${elsewhere}). Expect recognition, not love.`,
      }
    return { verdict: 'dies', why: `No measurable audience for it in ${city}, while Qloo measures one in ${elsewhere}.` }
  }

  const lift = r.baseline === null ? null : r.local - r.baseline
  const vs = lift === null ? '' : ` (${signedPts(lift)} vs. the typical city)`

  const strong = r.local >= THRESHOLDS.killsStrength
  if (strong && r.seen <= r.of * THRESHOLDS.regionalShare) {
    return { verdict: 'kills', why: `A regional favorite: strong here at ${pts(r.local)}/100, and measured in only ${elsewhere}.` }
  }
  if (lift !== null && lift >= THRESHOLDS.killsLift && strong) return { verdict: 'kills', why: `This crowd over-indexes on it: ${pts(r.local)}/100${vs}.` }
  if (lift !== null && lift <= THRESHOLDS.diesLift) return { verdict: 'dies', why: `This crowd under-indexes on it: ${pts(r.local)}/100${vs}.` }
  if (lift !== null && lift >= THRESHOLDS.killsLift)
    return { verdict: 'risky', why: `Stronger here than in the typical city${vs}, but only ${pts(r.local)}/100: too weak to carry the bit on its own.` }
  return { verdict: 'risky', why: `About as strong here as anywhere: ${pts(r.local)}/100${vs}. It will be recognized, but it will not carry the bit.` }
}

/** 0..100 room score: how much of the set's cultural material lands. */
export function roomScore(verdicts: Verdict[]) {
  const scored = verdicts.filter((v) => v !== 'unknown')
  if (scored.length === 0) return null
  const points = scored.reduce((s, v) => s + (v === 'kills' ? 1 : v === 'risky' ? 0.5 : 0), 0)
  return Math.round((points / scored.length) * 100)
}
