import { useCallback, useRef, useState } from 'react'
import { useServerFn } from '@tanstack/react-start'
import { crowdFn, extractFn, guessFn, resolveFn, scoreFn, swapFn, tourFn } from '~/server/room'
import type { AgeBand, CrowdWork, Guess, Receipt, ResolvedReference, Score, Swap, TourCell } from './types'

export interface CrowdChoice {
  city: string
  age: AgeBand | null
  venue: string
}

export type StepId = 'extract' | 'resolve' | 'score' | 'guess' | 'swap' | 'crowd'
export interface Step {
  id: StepId
  label: string
  status: 'pending' | 'running' | 'done' | 'error' | 'skipped'
  detail?: string
}

const STEPS: Omit<Step, 'status'>[] = [
  { id: 'extract', label: 'Find references' },
  { id: 'resolve', label: 'Match in Qloo' },
  { id: 'score', label: 'Score vs. 7 cities' },
  { id: 'swap', label: 'Swap and rewrite' },
  { id: 'guess', label: 'AI-only guess' },
  { id: 'crowd', label: 'Crowd work' },
]

export interface ReadingState {
  crowd: CrowdChoice
  lines: string[]
  refs: ResolvedReference[]
  scores: Record<string, Score>
  guesses: Record<string, Guess>
  guessAvailable: boolean | null
  swaps: Record<string, Swap>
  swapBy: 'model' | 'simple' | null
  crowdWork: CrowdWork | null
  tour: { cities: string[]; cells: TourCell[]; status: 'idle' | 'running' | 'done' | 'error' }
  receipts: Receipt[]
  mode: 'live' | 'sample' | null
  extractedBy: 'preset' | 'model' | null
  steps: Step[]
  running: boolean
  error: string | null
}

const empty = (crowd: CrowdChoice): ReadingState => ({
  crowd,
  lines: [],
  refs: [],
  scores: {},
  guesses: {},
  guessAvailable: null,
  swaps: {},
  swapBy: null,
  crowdWork: null,
  tour: { cities: [], cells: [], status: 'idle' },
  receipts: [],
  mode: null,
  extractedBy: null,
  steps: STEPS.map((s) => ({ ...s, status: 'pending' })),
  running: false,
  error: null,
})

export function useReading() {
  const extract = useServerFn(extractFn)
  const resolve = useServerFn(resolveFn)
  const score = useServerFn(scoreFn)
  const guess = useServerFn(guessFn)
  const swap = useServerFn(swapFn)
  const crowdWork = useServerFn(crowdFn)
  const tour = useServerFn(tourFn)

  const [state, setState] = useState<ReadingState | null>(null)
  const runId = useRef(0)

  const run = useCallback(
    async (text: string, presetId: string | null, crowd: CrowdChoice) => {
      const id = ++runId.current
      const live = () => runId.current === id
      const patch = (fn: (s: ReadingState) => Partial<ReadingState>) =>
        live() && setState((s) => (s ? { ...s, ...fn(s) } : s))
      const step = (sid: StepId, status: Step['status'], detail?: string) =>
        patch((s) => ({ steps: s.steps.map((x) => (x.id === sid ? { ...x, status, detail: detail ?? x.detail } : x)) }))
      const addReceipts = (r: Receipt[]) => patch((s) => ({ receipts: [...s.receipts, ...r] }))

      setState({ ...empty(crowd), running: true })
      const crowdInput = { city: crowd.city, age: crowd.age, venue: crowd.venue }
      let current: StepId = 'extract'
      try {
        step('extract', 'running')
        const ex = await extract({ data: { text, presetId } })
        patch(() => ({ lines: ex.lines, refs: ex.references.map((r) => ({ ...r, entity: null, alternatives: [] })), mode: ex.mode, extractedBy: ex.by }))
        step('extract', 'done', `${ex.references.length} found${ex.by === 'preset' ? ', pre-tagged' : ''}`)
        if (ex.references.length === 0) throw new Error('No cultural references found. Try a set that name-drops shows, artists, brands or places.')

        current = 'resolve'
        step('resolve', 'running')
        const rs = await resolve({ data: { references: ex.references } })
        addReceipts(rs.receipts)
        patch(() => ({ refs: rs.resolved }))
        const matched = rs.resolved.filter((r) => r.entity).length
        step('resolve', 'done', `${matched} of ${rs.resolved.length} matched`)

        current = 'score'
        step('score', 'running')
        const sc = await score({
          data: { crowd: crowdInput, references: rs.resolved.map((r) => ({ id: r.id, kind: r.kind, entity: r.entity })) },
        })
        addReceipts(sc.receipts)
        const scores = Object.fromEntries(sc.scores.map((s) => [s.refId, s]))
        patch(() => ({ scores }))
        const weak = sc.scores.filter((s) => s.verdict === 'dies' || s.verdict === 'risky')
        step('score', 'done', `${sc.scores.filter((s) => s.verdict === 'kills').length} kill · ${weak.length} need work`)

        await Promise.all([
          (async () => {
            step('swap', 'running')
            const targets = rs.resolved.filter((r) => r.entity && weak.some((w) => w.refId === r.id))
            if (targets.length === 0) return step('swap', 'skipped', 'Nothing to fix')
            try {
              const sw = await swap({
                data: {
                  crowd: crowdInput,
                  references: targets.map((r) => ({
                    id: r.id,
                    local: scores[r.id]?.local ?? null,
                    lift: scores[r.id]?.lift ?? null,
                    surface: r.surface,
                    role: r.role,
                    kind: r.kind,
                    lineText: ex.lines[r.line],
                    entity: r.entity!,
                  })),
                },
              })
              addReceipts(sw.receipts)
              patch(() => ({ swaps: Object.fromEntries(sw.swaps.map((x) => [x.refId, x])), swapBy: sw.by }))
              step('swap', 'done', `${sw.swaps.filter((x) => x.chosen).length} lines rewritten`)
            } catch (e) {
              step('swap', 'error', (e as Error).message)
            }
          })(),
          (async () => {
            step('guess', 'running')
            const g = await guess({
              data: { crowd: crowdInput, references: rs.resolved.map((r) => ({ id: r.id, name: r.name, kind: r.kind })) },
            }).catch(() => ({ guesses: [] as Guess[], available: false }))
            patch(() => ({ guesses: Object.fromEntries(g.guesses.map((x) => [x.refId, x])), guessAvailable: g.available }))
            if (!g.available) return step('guess', 'skipped', 'Model unavailable')
            const wrong = g.guesses.filter((x) => scores[x.refId] && scores[x.refId].verdict !== 'unknown' && scores[x.refId].verdict !== x.verdict).length
            step('guess', 'done', `Differs on ${wrong} of ${g.guesses.length}`)
          })(),
          (async () => {
            step('crowd', 'running')
            try {
              const cw = await crowdWork({ data: { crowd: crowdInput } })
              addReceipts(cw.receipts)
              patch(() => ({ crowdWork: cw.crowdWork }))
              step('crowd', 'done', `${cw.crowdWork.openers.length} openers ready`)
            } catch (e) {
              step('crowd', 'error', (e as Error).message)
            }
          })(),
        ])
        patch(() => ({ running: false }))
      } catch (e) {
        step(current, 'error', (e as Error).message)
        patch(() => ({ running: false, error: (e as Error).message }))
      }
    },
    [extract, resolve, score, guess, swap, crowdWork],
  )

  const runTour = useCallback(
    async (cities: string[]) => {
      const s = state
      if (!s) return
      const id = runId.current
      setState((x) => (x ? { ...x, tour: { cities, cells: [], status: 'running' } } : x))
      try {
        const out = await tour({
          data: {
            cities,
            age: s.crowd.age,
            references: s.refs.map((r) => ({ id: r.id, kind: r.kind, entity: r.entity })),
          },
        })
        if (runId.current !== id) return
        setState((x) => (x ? { ...x, tour: { cities, cells: out.cells, status: 'done' }, receipts: [...x.receipts, ...out.receipts] } : x))
      } catch {
        setState((x) => (x ? { ...x, tour: { ...x.tour, status: 'error' } } : x))
      }
    },
    [state, tour],
  )

  return { state, run, runTour }
}
