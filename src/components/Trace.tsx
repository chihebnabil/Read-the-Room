import type { ReadingState } from '~/lib/useReading'
import { Spinner } from './ui'

export function Trace({ state }: { state: ReadingState }) {
  const live = state.receipts.filter((r) => r.source === 'live').length
  const cached = state.receipts.filter((r) => r.source === 'cache').length
  return (
    <div className="panel p-5">
      <div className="flex items-center justify-between">
        <p className="eyebrow">Agent run</p>
        <p className="font-mono text-[11px] text-stage-500">
          {state.receipts.length} Qloo calls{live || cached ? ` · ${live} live · ${cached} cached` : ''}
        </p>
      </div>
      <ol className="mt-4 space-y-3">
        {state.steps.map((s, i) => (
          <li key={s.id} className="flex gap-3">
            <span
              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                s.status === 'done'
                  ? 'animate-pop bg-kills text-stage-950'
                  : s.status === 'error'
                    ? 'bg-dies text-stage-950'
                    : s.status === 'skipped'
                      ? 'bg-stage-700 text-stage-400'
                      : s.status === 'running'
                        ? 'bg-transparent'
                        : 'bg-stage-800 text-stage-500'
              }`}
            >
              {s.status === 'running' ? <Spinner /> : s.status === 'done' ? '✓' : s.status === 'error' ? '!' : s.status === 'skipped' ? '–' : i + 1}
            </span>
            <div className="min-w-0">
              <p className={`text-sm font-medium ${s.status === 'pending' ? 'text-stage-500' : 'text-stage-100'}`}>{s.label}</p>
              {s.detail && <p className={`text-xs ${s.status === 'error' ? 'text-dies' : 'text-stage-400'}`}>{s.detail}</p>}
            </div>
          </li>
        ))}
      </ol>
      {state.receipts.length > 0 && (
        <div className="mt-5 max-h-40 space-y-1 overflow-y-auto rounded-xl bg-stage-950 p-3 font-mono text-[11px] leading-relaxed text-stage-400">
          {state.receipts.slice(-30).map((r, i) => (
            <p key={i} className="animate-rise truncate">
              <span className={r.source === 'live' ? 'text-kills' : r.source === 'cache' ? 'text-stage-300' : 'text-bulb'}>
                {r.source === 'live' ? 'GET' : r.source === 'cache' ? 'HIT' : 'SAMPLE'}
              </span>{' '}
              {r.endpoint} <span className="text-stage-500">· {r.label}</span>
            </p>
          ))}
        </div>
      )}
    </div>
  )
}
