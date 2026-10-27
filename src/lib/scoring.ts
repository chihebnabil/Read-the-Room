import type { Verdict } from './types'

/**
 * Turns Qloo numbers into a stage call. Kept in one place so the thresholds are easy to audit:
 * - local: the entity's affinity with tonight's crowd (city + optional age band)
 * - baseline: the same entity's affinity nationwide
 * - popularity: how widely known the entity is at all
 */
export const THRESHOLDS = {
  killsLocal: 0.7,
  killsLift: 0.12,
  diesLocal: 0.4,
  diesLift: -0.15,
  obscure: 0.35,
}

export function verdictFor(local: number | null, baseline: number | null, popularity: number | null): { verdict: Verdict; why: string } {
  if (local === null) return { verdict: 'unknown', why: 'Qloo had no affinity score for this crowd.' }
  const lift = baseline === null ? null : local - baseline
  const pct = (n: number) => `${Math.round(n * 100)}`
  const liftText = lift === null ? '' : ` (${lift >= 0 ? '+' : ''}${pct(lift)} vs. nationwide)`

  if (popularity !== null && popularity < THRESHOLDS.obscure) {
    return { verdict: 'dies', why: `Too obscure: only ${pct(popularity)}th percentile popularity, so most rooms will not get it.` }
  }
  if ((lift !== null && lift <= THRESHOLDS.diesLift) || local < THRESHOLDS.diesLocal) {
    return { verdict: 'dies', why: `Low affinity with this crowd: ${pct(local)}/100${liftText}.` }
  }
  if ((lift !== null && lift >= THRESHOLDS.killsLift) || (local >= THRESHOLDS.killsLocal && (lift === null || lift > -0.05))) {
    return { verdict: 'kills', why: `This crowd is into it: ${pct(local)}/100${liftText}.` }
  }
  return { verdict: 'risky', why: `Lukewarm: ${pct(local)}/100${liftText}. It may land, but it will not carry the bit.` }
}

/** 0..100 room score: how much of the set's cultural material lands. */
export function roomScore(verdicts: Verdict[]) {
  const scored = verdicts.filter((v) => v !== 'unknown')
  if (scored.length === 0) return null
  const points = scored.reduce((s, v) => s + (v === 'kills' ? 1 : v === 'risky' ? 0.5 : 0), 0)
  return Math.round((points / scored.length) * 100)
}
