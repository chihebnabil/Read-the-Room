import type { ReadingState } from '~/lib/useReading'
import { Spinner } from './ui'

/** The agent run as a horizontal progress strip, with the live log of Qloo calls folded underneath. */
export function Trace({ state }: { state: ReadingState }) {
  const live = state.receipts.filter((r) => r.source === 'live').length
  const cached = state.receipts.filter((r) => r.source === 'cache').length
  return (
    <div className="panel overflow-hidden">
      <ol className="grid grid-cols-2 divide-stage-800 sm:grid-cols-3 lg:grid-cols-6 lg:divide-x">
        {state.steps.map((s, i) => (
          <li key={s.id} className="flex min-w-0 items-start gap-2.5 border-b border-stage-800 px-4 py-3.5 lg:border-b-0">
            <span
              className={`mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[10px] font-bold ${
                s.status === 'done'
                  ? 'animate-pop bg-kills text-stage-950'
                  : s.status === 'error'
                    ? 'bg-dies text-stage-950'
                    : s.status === 'skipped'
                      ? 'bg-stage-700 text-stage-400'
                      : s.status === 'running'
                        ? 'text-bulb'
                        : 'bg-stage-800 text-stage-500'
              }`}
            >
              {s.status === 'running' ? <Spinner /> : s.status === 'done' ? '✓' : s.status === 'error' ? '!' : s.status === 'skipped' ? '–' : i + 1}
            </span>
            <div className="min-w-0">
              <p className={`text-[13px] font-semibold leading-snug lg:truncate ${s.status === 'pending' ? 'text-stage-500' : 'text-stage-100'}`}>{s.label}</p>
              <p className={`line-clamp-2 text-xs lg:truncate ${s.status === 'error' ? 'text-dies' : 'text-stage-400'}`} title={s.detail}>
                {s.detail ?? (s.status === 'running' ? 'Working…' : ' ')}
              </p>
            </div>
          </li>
        ))}
      </ol>
      {state.receipts.length > 0 && (
        <details className="group border-t border-stage-800">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-2.5 text-xs text-stage-400 hover:text-stage-200">
            <span className="min-w-0 truncate font-mono">
              <span className="text-stage-200">{state.receipts.length} Qloo calls</span>
              {live || cached ? ` · ${live} live · ${cached} cached` : ''}
              <span className="text-stage-500"> · last: {state.receipts.at(-1)?.label}</span>
            </span>
            <span className="shrink-0 font-semibold group-open:hidden">Show log</span>
            <span className="hidden shrink-0 font-semibold group-open:inline">Hide log</span>
          </summary>
          <div className="max-h-48 space-y-1 overflow-y-auto bg-stage-950 px-4 py-3 font-mono text-[11px] leading-relaxed text-stage-400">
            {state.receipts
              .slice(-40)
              .reverse()
              .map((r, i) => (
                <p key={i} className="truncate">
                  <span className={r.source === 'live' ? 'text-kills' : r.source === 'cache' ? 'text-stage-300' : 'text-risky'}>
                    {r.source === 'live' ? 'GET' : r.source === 'cache' ? 'HIT' : 'SAMPLE'}
                  </span>{' '}
                  {r.endpoint} <span className="text-stage-500">· {r.label}</span>
                </p>
              ))}
          </div>
        </details>
      )}
    </div>
  )
}
