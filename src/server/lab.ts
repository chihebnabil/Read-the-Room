import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { PRESETS } from '~/lib/presets'
import type { Receipt, Verdict } from '~/lib/types'
import { qlooIsLive, searchEntity } from './qloo'
import { guessVerdicts, scoreRefs } from './room'

/**
 * The benchmark behind our "only works with Qloo" claim: for every reference in the sample scripts and
 * every city, compare a model's no-data guess with the verdict from Qloo numbers.
 */

export interface LabRow {
  preset: string
  reference: string
  city: string
  qloo: Verdict
  local: number | null
  lift: number | null
  guess: Exclude<Verdict, 'unknown'> | null
  reason: string | null
}

export const labCityFn = createServerFn({ method: 'POST' })
  .validator(z.object({ city: z.string().trim().min(2).max(80) }))
  .handler(async ({ data }) => {
    const receipts: Receipt[] = []
    const crowd = { city: data.city, age: null, venue: 'Comedy club' }
    const rows: LabRow[] = []
    for (const preset of PRESETS) {
      const refs = preset.refs.map(([, , name, kind], i) => ({ id: `${preset.id}-${i}`, name, kind }))
      const entities = await Promise.all(refs.map((r) => searchEntity(r.name, r.kind, receipts).then((e) => e[0] ?? null).catch(() => null)))
      const [scores, guesses] = await Promise.all([
        scoreRefs(refs.map((r, i) => ({ id: r.id, kind: r.kind, entity: entities[i] })), crowd, receipts),
        guessVerdicts(crowd, refs),
      ])
      for (const r of refs) {
        const s = scores.find((x) => x.refId === r.id)
        const g = guesses?.find((x) => x.refId === r.id)
        rows.push({
          preset: preset.label,
          reference: r.name,
          city: data.city,
          qloo: s?.verdict ?? 'unknown',
          local: s?.local ?? null,
          lift: s?.lift ?? null,
          guess: g?.verdict ?? null,
          reason: g?.reason ?? null,
        })
      }
    }
    return { rows, calls: receipts.length, mode: qlooIsLive() ? ('live' as const) : ('sample' as const) }
  })
