import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { Spinner, pct, signed } from '~/components/ui'
import { CITIES } from '~/lib/presets'
import { VERDICT_META } from '~/lib/types'
import { labCityFn, type LabRow } from '~/server/lab'

export const Route = createFileRoute('/lab')({ component: Lab })

function Lab() {
  const runCity = useServerFn(labCityFn)
  const [rows, setRows] = useState<LabRow[]>([])
  const [mode, setMode] = useState<'live' | 'sample' | null>(null)
  const [running, setRunning] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function run() {
    setRows([])
    setError(null)
    for (const city of CITIES) {
      setRunning(city)
      try {
        const out = await runCity({ data: { city } })
        setMode(out.mode)
        setRows((r) => [...r, ...out.rows])
      } catch (e) {
        setError((e as Error).message)
      }
    }
    setRunning(null)
  }

  const comparable = rows.filter((r) => r.guess && r.qloo !== 'unknown')
  const disagree = comparable.filter((r) => r.guess !== r.qloo)
  const costly = comparable.filter((r) => r.guess === 'kills' && r.qloo === 'dies')
  const missed = comparable.filter((r) => r.guess === 'dies' && r.qloo === 'kills')
  const guessSpread = (['kills', 'risky', 'dies'] as const).map((v) => [v, comparable.filter((r) => r.guess === v).length] as const)
  const qlooSpread = (['kills', 'risky', 'dies'] as const).map((v) => [v, comparable.filter((r) => r.qloo === v).length] as const)

  return (
    <div className="wrap py-14">
      <p className="eyebrow">Benchmark</p>
      <h1 className="display mt-2 text-4xl text-stage-100 sm:text-5xl">AI alone vs. Qloo</h1>
      <p className="mt-4 max-w-3xl text-stage-300">
        Every reference in both sample scripts, in {CITIES.length} cities. For each one we compare a model’s guess with no data against the
        verdict computed from Qloo’s numbers. Disagreement does not prove the model wrong, but it shows how often a model-only tool would give
        a performer different advice than the measured data.
      </p>
      <button className="btn-bulb mt-6" disabled={running !== null} onClick={run}>
        {running ? (
          <>
            <Spinner /> Reading {running}…
          </>
        ) : rows.length ? (
          'Run again'
        ) : (
          'Run the benchmark'
        )}
      </button>
      {!rows.length && !running && (
        <p className="mt-2 text-xs text-stage-500">Takes about a minute: every reference is scored live in {CITIES.length} cities. Last run: 54% of 136 calls differed.</p>
      )}
      {mode === 'sample' && <p className="mt-2 text-sm text-risky">Qloo is in sample mode on this server, so these numbers are not meaningful.</p>}
      {error && <p className="mt-2 text-sm text-dies">{error}</p>}

      {comparable.length > 0 && (
        <>
          <div className="mt-10 grid gap-4 md:grid-cols-4">
            <Stat value={`${Math.round((disagree.length / comparable.length) * 100)}%`} label={`of ${comparable.length} calls differ from Qloo`} />
            <Stat value={String(costly.length)} label="times the AI said “kills” where Qloo says “dies”" />
            <Stat value={String(missed.length)} label="local wins the AI would have cut" />
            <div className="panel p-5 text-sm">
              <p className="eyebrow">Verdict spread</p>
              <p className="mt-2 text-stage-300">AI: {guessSpread.map(([v, n]) => `${VERDICT_META[v].emoji}${n}`).join(' ')}</p>
              <p className="text-stage-300">Qloo: {qlooSpread.map(([v, n]) => `${VERDICT_META[v].emoji}${n}`).join(' ')}</p>
            </div>
          </div>

          <div className="panel mt-6 overflow-x-auto p-4">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="text-left text-xs text-stage-500">
                  <th className="p-2">City</th>
                  <th className="p-2">Reference</th>
                  <th className="p-2">AI alone</th>
                  <th className="p-2">Qloo</th>
                  <th className="p-2">Local / lift</th>
                  <th className="p-2">AI’s reason</th>
                </tr>
              </thead>
              <tbody>
                {comparable.map((r, i) => (
                  <tr key={i} className={`border-t border-stage-800 ${r.guess !== r.qloo ? 'bg-bulb/[0.04]' : ''}`}>
                    <td className="p-2 text-stage-300">{r.city}</td>
                    <td className="p-2 text-stage-100">{r.reference}</td>
                    <td className="p-2">{r.guess && VERDICT_META[r.guess].emoji}</td>
                    <td className="p-2">{VERDICT_META[r.qloo].emoji}</td>
                    <td className="p-2 font-mono text-xs text-stage-400">
                      {pct(r.local)} / {signed(r.lift)}
                    </td>
                    <td className="p-2 text-xs text-stage-500">{r.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="panel p-5">
      <p className="display text-5xl text-bulb">{value}</p>
      <p className="mt-1 text-sm text-stage-300">{label}</p>
    </div>
  )
}
