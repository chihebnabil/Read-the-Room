import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { CITIES, TOUR_DEFAULT } from '~/lib/presets'
import { roomScore } from '~/lib/scoring'
import { AGE_LABEL, KIND_LABEL, VERDICT_META, type Kind, type ResolvedReference, type Swap, type Verdict } from '~/lib/types'
import type { ReadingState } from '~/lib/useReading'
import { RoadManager } from './RoadManager'
import { Bar, Gauge, KindTag, Spinner, VerdictBadge, pct, signed } from './ui'

type Tab = 'set' | 'rewrite' | 'crowd' | 'tour' | 'manager' | 'receipts'

const VERDICT_CHIP: Record<'kills' | 'risky' | 'dies', string> = {
  kills: 'border-kills/30 bg-kills/10 text-kills',
  risky: 'border-risky/30 bg-risky/10 text-risky',
  dies: 'border-dies/30 bg-dies/10 text-dies',
}

function swapVerdict(s: Swap | undefined): Verdict | null {
  return s?.chosen?.verdict ?? null
}

export function Report({ state, onTour }: { state: ReadingState; onTour: (cities: string[]) => void }) {
  const [tab, setTab] = useState<Tab>('set')
  const [selected, setSelected] = useState<string | null>(null)
  // Swaps for lines that die are on by default; risky lines are an optional punch-up.
  const [choice, setChoice] = useState<Record<string, boolean>>({})
  const active = (id: string) => choice[id] ?? state.scores[id]?.verdict === 'dies'
  const rejected = new Set(state.refs.filter((r) => !active(r.id)).map((r) => r.id))

  const verdicts = state.refs.map((r) => state.scores[r.id]?.verdict ?? 'unknown')
  const before = roomScore(verdicts)
  const after = roomScore(
    state.refs.map((r) => {
      const v = state.scores[r.id]?.verdict ?? 'unknown'
      const sv = rejected.has(r.id) ? null : swapVerdict(state.swaps[r.id])
      return sv && (v === 'dies' || v === 'risky') ? sv : v
    }),
  )
  const hasSwaps = Object.values(state.swaps).some((s) => s.chosen)

  // Default the detail panel to the first reference that needs work.
  useEffect(() => {
    if (selected || Object.keys(state.scores).length === 0) return
    const first = state.refs.find((r) => state.scores[r.id]?.verdict === 'dies') ?? state.refs.find((r) => state.scores[r.id]?.verdict === 'risky') ?? state.refs[0]
    if (first) setSelected(first.id)
  }, [state.scores, state.refs, selected])

  const disagreements = state.refs.filter((r) => {
    const g = state.guesses[r.id]
    const s = state.scores[r.id]
    return g && s && s.verdict !== 'unknown' && g.verdict !== s.verdict
  })

  const counts = (['kills', 'risky', 'dies'] as const).map((v) => [v, verdicts.filter((x) => x === v).length] as const)

  return (
    <div className="space-y-5">
      <div className="panel overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-5 p-5 sm:p-6">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="eyebrow">Tonight’s room</p>
              {state.mode === 'sample' && <span className="rounded-md bg-bulb/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-bulb">Sample data, not Qloo</span>}
              {state.mode === 'live' && <span className="rounded-md bg-kills/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-kills">Live Qloo data</span>}
            </div>
            <h2 className="display mt-1.5 truncate text-4xl text-stage-100 sm:text-5xl">{state.crowd.city}</h2>
            <p className="mt-1 text-sm text-stage-400">
              {state.crowd.venue}
              {state.crowd.age ? ` · crowd mostly ${AGE_LABEL[state.crowd.age]}` : ' · mixed ages'}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {counts.map(([v, n]) => (
                <span key={v} className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold ${VERDICT_CHIP[v]}`}>
                  {VERDICT_META[v].emoji} {n} {VERDICT_META[v].label.toLowerCase()}
                </span>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-3">
            <Gauge value={before} label="As written" dim={hasSwaps} />
            {hasSwaps && (
              <>
                <span className="text-xl text-stage-500" aria-hidden>
                  →
                </span>
                <Gauge value={after} label="With swaps" />
              </>
            )}
          </div>
        </div>
        {state.guessAvailable && disagreements.length > 0 && (
          <div className="border-t border-stage-800 bg-stage-850 px-5 py-3.5 sm:px-6">
            <p className="text-sm text-stage-200">
              <span className="font-bold text-bulb">
                A model with no data disagreed with Qloo on {disagreements.length} of {Object.keys(state.guesses).length} references.
              </span>{' '}
              <span className="text-stage-400">Its guess → Qloo:</span>
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {disagreements.map((r) => (
                <button
                  key={r.id}
                  onClick={() => {
                    setSelected(r.id)
                    setTab('set')
                  }}
                  className="rounded-lg border border-stage-700 bg-stage-900 px-2 py-1 text-xs text-stage-200 transition hover:border-stage-500"
                >
                  {r.name} <span className="whitespace-nowrap">{VERDICT_META[state.guesses[r.id].verdict].emoji} → {VERDICT_META[state.scores[r.id].verdict].emoji}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="no-scrollbar -mx-5 flex gap-6 overflow-x-auto border-b border-stage-800 px-5 sm:mx-0 sm:px-1">
        {(
          [
            ['set', 'Your set'],
            ['rewrite', 'Rewritten set'],
            ['crowd', 'Crowd work'],
            ['tour', 'Tour map'],
            ['manager', 'Ask the road manager'],
            ['receipts', `Receipts (${state.receipts.length})`],
          ] as [Tab, string][]
        ).map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} className={`tab ${tab === id ? 'tab-on' : ''}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'set' && (
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
          <SetView state={state} selected={selected} onSelect={setSelected} />
          {selected && state.refs.find((r) => r.id === selected) ? (
            <RefDetail
              state={state}
              refItem={state.refs.find((r) => r.id === selected)!}
              rejected={rejected.has(selected)}
              onToggle={() => setChoice((c) => ({ ...c, [selected]: !active(selected) }))}
            />
          ) : (
            <div className="panel flex items-center justify-center p-8 text-sm text-stage-500">Pick a highlighted reference.</div>
          )}
        </div>
      )}
      {tab === 'rewrite' && <RewriteView state={state} rejected={rejected} />}
      {tab === 'crowd' && <CrowdView state={state} />}
      {tab === 'tour' && <TourView state={state} onTour={onTour} />}
      <div className={tab === 'manager' ? '' : 'hidden'}>
        <RoadManager state={state} />
      </div>
      {tab === 'receipts' && <ReceiptsView state={state} />}
    </div>
  )
}

function segments(line: string, refs: ResolvedReference[]) {
  const marks = refs
    .map((r) => ({ r, at: line.indexOf(r.surface) }))
    .filter((m) => m.at >= 0)
    .sort((a, b) => a.at - b.at)
  const out: (string | ResolvedReference)[] = []
  let i = 0
  for (const m of marks) {
    if (m.at < i) continue
    out.push(line.slice(i, m.at), m.r)
    i = m.at + m.r.surface.length
  }
  out.push(line.slice(i))
  return out
}

function SetView({ state, selected, onSelect }: { state: ReadingState; selected: string | null; onSelect: (id: string) => void }) {
  return (
    <div className="panel p-5 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="eyebrow">The set, read for {state.crowd.city}</p>
        <p className="text-xs text-stage-500">Tap a reference for the numbers</p>
      </div>
      <ol className="space-y-3">
        {state.lines.map((line, i) => {
          const refs = state.refs.filter((r) => r.line === i)
          return (
            <li key={i} className="flex gap-3 text-[15px] leading-relaxed">
              <span className="w-5 shrink-0 pt-0.5 text-right font-mono text-xs text-stage-600">{i + 1}</span>
              <p className="min-w-0 text-stage-200">
                {segments(line, refs).map((seg, j) =>
                  typeof seg === 'string' ? (
                    <span key={j}>{seg}</span>
                  ) : (
                    <button
                      key={j}
                      onClick={() => {
                        onSelect(seg.id)
                        // On narrow screens the details sit under the set; bring them into view.
                        if (window.innerWidth < 1024) setTimeout(() => document.getElementById('ref-detail')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
                      }}
                      className={`rounded px-1 font-semibold text-stage-100 transition ref-${state.scores[seg.id]?.verdict ?? 'pending'} ${
                        selected === seg.id ? 'outline-2 outline-offset-1 outline-stage-100' : 'hover:brightness-125'
                      }`}
                    >
                      {seg.surface}
                      {state.scores[seg.id] && <span className="ml-1 text-xs">{VERDICT_META[state.scores[seg.id].verdict].emoji}</span>}
                    </button>
                  ),
                )}
              </p>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

function Highlight({ text, word }: { text: string; word: string | null }) {
  if (!word) return <>{text}</>
  const at = text.toLowerCase().indexOf(word.toLowerCase())
  if (at < 0) return <>{text}</>
  return (
    <>
      {text.slice(0, at)}
      <mark className="rounded bg-kills/20 px-0.5 font-semibold text-kills">{text.slice(at, at + word.length)}</mark>
      {text.slice(at + word.length)}
    </>
  )
}

function RefDetail({ state, refItem: r, rejected, onToggle }: { state: ReadingState; refItem: ResolvedReference; rejected: boolean; onToggle: () => void }) {
  const s = state.scores[r.id]
  const g = state.guesses[r.id]
  const sw = state.swaps[r.id]
  const weak = s && (s.verdict === 'dies' || s.verdict === 'risky')
  const receipts = state.receipts.filter((x) => r.entity && Object.values(x.params).some((v) => v.includes(r.entity!.id)))
  return (
    <div id="ref-detail" className="panel animate-rise scroll-mt-4 space-y-5 p-5 sm:p-6 lg:sticky lg:top-4" key={r.id}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <KindTag kind={r.kind} />
            <span className="text-xs text-stage-500">line {r.line + 1}</span>
          </div>
          <h3 className="mt-1.5 text-xl font-bold leading-tight text-stage-100">{r.name}</h3>
          <p className="mt-0.5 text-xs text-stage-400">Plays the role of: {r.role}</p>
        </div>
        <div className="shrink-0">{s ? <VerdictBadge verdict={s.verdict} size="lg" /> : <Spinner />}</div>
      </div>

      {r.entity ? (
        <div className="flex items-start gap-3 rounded-xl bg-stage-950 p-3">
          {r.entity.image ? (
            <img src={r.entity.image} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
          ) : (
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-stage-800 text-[10px] font-bold text-stage-500">{KIND_LABEL[r.kind]}</div>
          )}
          <div className="min-w-0 flex-1 text-xs">
            <p className="font-semibold text-stage-200">Qloo match: {r.entity.name}</p>
            {r.entity.description && <p className="mt-0.5 line-clamp-2 text-stage-500" title={r.entity.description}>{r.entity.description}</p>}
            {r.entity.popularity !== null && <p className="text-stage-500">Popularity: {pct(r.entity.popularity)}th percentile</p>}
          </div>
        </div>
      ) : (
        <p className="rounded-2xl bg-stage-950 p-3 text-xs text-stage-400">Not matched in Qloo yet.</p>
      )}

      {s && s.verdict !== 'unknown' && (
        <div className="space-y-3">
          <Bar label={`This crowd (${state.crowd.city})`} value={s.local} tone="bulb" />
          <Bar label={`Typical city (median of ${s.of} others)`} value={s.baseline} tone="muted" />
          <p className="text-sm leading-relaxed text-stage-300">{s.why}</p>
        </div>
      )}

      {g && s && s.verdict !== 'unknown' && (
        <div className={`rounded-2xl border p-3 text-xs ${g.verdict === s.verdict ? 'border-stage-700' : 'border-bulb/40 bg-bulb/5'}`}>
          <p className="font-semibold text-stage-200">
            AI alone, no data: {VERDICT_META[g.verdict].emoji} {VERDICT_META[g.verdict].label}{' '}
            <span className={g.verdict === s.verdict ? 'text-stage-500' : 'text-bulb'}>
              {g.verdict === s.verdict ? '· agrees with Qloo' : '· Qloo disagrees'}
            </span>
          </p>
          <p className="mt-1 text-stage-400">“{g.reason}”</p>
        </div>
      )}

      {weak && (
        <div className="space-y-3 border-t border-stage-800 pt-5">
          <p className="eyebrow">
            {s.verdict === 'risky' ? 'Optional punch-up: ' : ''}Swap it for something {state.crowd.city} loves
          </p>
          {!sw ? (
            <p className="flex items-center gap-2 text-sm text-stage-400">
              <Spinner /> Asking Qloo for alternatives…
            </p>
          ) : (
            <>
              {sw.candidates.length > 0 && (
                <ul className="space-y-1.5">
                  {sw.candidates.map((c) => (
                    <li
                      key={c.entity.id}
                      className={`flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm ${
                        sw.chosen?.entity.id === c.entity.id ? 'bg-kills/10 text-stage-100 ring-1 ring-kills/40' : 'bg-stage-950 text-stage-300'
                      }`}
                    >
                      <span className="min-w-0 truncate font-medium">
                        {sw.chosen?.entity.id === c.entity.id && '★ '}
                        {c.entity.name}
                      </span>
                      <span className="shrink-0 font-mono text-xs">
                        {pct(c.local)}
                        <span className="text-stage-500">/100</span>
                        {c.lift !== null && <span className={`ml-2 ${c.lift >= 0 ? 'text-kills' : 'text-dies'}`}>{signed(c.lift)}</span>}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <div className="space-y-2 rounded-xl bg-stage-950 p-4 text-sm">
                <p className="text-stage-500 line-through decoration-dies/60">{sw.original}</p>
                <p className="text-stage-100">
                  <Highlight text={sw.rewritten} word={sw.chosen?.entity.name ?? null} />
                </p>
                <p className="text-xs text-stage-400">{sw.note}</p>
              </div>
              {sw.chosen && (
                <button onClick={onToggle} className="btn-line text-xs">
                  {rejected ? (s.verdict === 'risky' ? 'Use this punch-up' : 'Use this swap') : 'Keep my original line'}
                </button>
              )}
            </>
          )}
        </div>
      )}

      {receipts.length > 0 && (
        <details className="text-xs text-stage-400">
          <summary className="cursor-pointer font-semibold text-stage-300">Qloo receipts for this reference ({receipts.length})</summary>
          <div className="mt-2 space-y-2">
            {receipts.map((x, i) => (
              <ReceiptLine key={i} r={x} />
            ))}
          </div>
        </details>
      )}
    </div>
  )
}

function ReceiptLine({ r }: { r: ReadingState['receipts'][number] }) {
  return (
    <div className="min-w-0 rounded-lg bg-stage-950 p-2.5 font-mono text-[11px] leading-relaxed">
      <p className="break-all text-stage-300">
        <span className={r.source === 'live' ? 'text-kills' : r.source === 'cache' ? 'text-stage-200' : 'text-bulb'}>{r.source.toUpperCase()}</span> GET {r.endpoint}
        <span className="text-stage-500"> · {r.resultCount} results{r.ms ? ` · ${r.ms}ms` : ''}</span>
      </p>
      {Object.entries(r.params).map(([k, v]) => (
        <p key={k} className="break-all text-stage-500">
          {k}=<span className="text-stage-300">{v}</span>
        </p>
      ))}
    </div>
  )
}

function RewriteView({ state, rejected }: { state: ReadingState; rejected: Set<string> }) {
  const [copied, setCopied] = useState(false)
  const lines = useMemo(
    () =>
      state.lines.map((line, i) => {
        const active = state.refs
          .filter((r) => r.line === i && !rejected.has(r.id))
          .map((r) => state.swaps[r.id])
          .filter((s): s is Swap => Boolean(s?.chosen))
        if (active.length === 0) return { text: line, changed: false, words: [] as string[] }
        if (active.length === 1) return { text: active[0].rewritten, changed: true, words: [active[0].chosen!.entity.name] }
        let text = line
        for (const s of active) {
          const ref = state.refs.find((r) => r.id === s.refId)!
          text = text.replace(ref.surface, s.chosen!.entity.name)
        }
        return { text, changed: true, words: active.map((s) => s.chosen!.entity.name) }
      }),
    [state.lines, state.refs, state.swaps, rejected.size, [...rejected].join()],
  )
  const changed = lines.filter((l) => l.changed).length
  return (
    <div className="panel p-5 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="eyebrow">
          {changed} line{changed === 1 ? '' : 's'} punched up for {state.crowd.city}
          {state.swapBy === 'simple' ? ' (simple swaps, model unavailable)' : ''}
        </p>
        <button
          className="btn-line text-xs"
          onClick={() => {
            navigator.clipboard.writeText(lines.map((l) => l.text).join('\n'))
            setCopied(true)
            setTimeout(() => setCopied(false), 1500)
          }}
        >
          {copied ? 'Copied ✓' : 'Copy set'}
        </button>
      </div>
      <ol className="space-y-3">
        {lines.map((l, i) => (
          <li key={i} className="flex gap-3 text-[15px] leading-relaxed">
            <span className="w-5 shrink-0 pt-0.5 text-right font-mono text-xs text-stage-600">{i + 1}</span>
            <div className="min-w-0">
              {l.changed && <p className="text-xs text-stage-500 line-through decoration-dies/50">{state.lines[i]}</p>}
              <p className={l.changed ? 'text-stage-100' : 'text-stage-300'}>
                {l.words.length === 1 ? <Highlight text={l.text} word={l.words[0]} /> : l.text}
              </p>
            </div>
          </li>
        ))}
      </ol>
      {Object.keys(state.swaps).length === 0 && <p className="mt-4 text-sm text-stage-500">Swaps appear here once the agent finishes.</p>}
    </div>
  )
}

function CrowdView({ state }: { state: ReadingState }) {
  const cw = state.crowdWork
  if (!cw)
    return (
      <div className="panel flex items-center gap-2 p-6 text-sm text-stage-400">
        <Spinner /> Asking Qloo what {state.crowd.city} loves…
      </div>
    )
  const kinds = Object.entries(cw.favorites).filter(([, v]) => v && v.length > 0) as [Kind, NonNullable<(typeof cw.favorites)[Kind]>][]
  const profile = cw.profile.filter((p) => p.tags.length > 0)
  return (
    <div className="space-y-5">
      {profile.length > 0 && (
        <div className="panel p-5 sm:p-6">
          <p className="eyebrow">The room’s taste profile</p>
          {cw.styleTip && <p className="mt-2 text-lg font-semibold leading-snug text-stage-100">{cw.styleTip}</p>}
          <div className="mt-4 grid gap-5 md:grid-cols-2">
            {profile.map((p) => (
              <div key={p.tagType}>
                <p className="text-xs font-semibold text-stage-400">{p.label} {state.crowd.city} over-indexes on</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {p.tags.map((t, i) => (
                    <span
                      key={t.id}
                      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold ${
                        i < 3 ? 'border-bulb/50 bg-bulb/10 text-bulb' : 'border-stage-700 text-stage-300'
                      }`}
                    >
                      {t.name}
                      <span className="font-mono text-[10px] opacity-70">{t.affinity === null ? '' : pct(t.affinity)}</span>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        {cw.openers.map((o, i) => (
          <div key={i} className="panel animate-rise p-5" style={{ animationDelay: `${i * 80}ms` }}>
            <p className="eyebrow">Opener {i + 1}</p>
            <p className="mt-2 text-lg font-semibold leading-snug text-stage-100">“{o.line}”</p>
            <p className="mt-2 text-xs text-stage-500">Uses: {o.uses.join(', ')}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {kinds.map(([kind, list]) => (
          <div key={kind} className="panel p-5">
            <p className="eyebrow">{KIND_LABEL[kind]} {state.crowd.city} over-indexes on</p>
            <ul className="mt-3 space-y-2">
              {list.map((f) => (
                <li key={f.entity.id} className="flex items-center justify-between gap-3 text-sm">
                  <span className="truncate text-stage-200">{f.entity.name}</span>
                  {f.local !== null && <span className="shrink-0 font-mono text-xs text-stage-400">{pct(f.local)}</span>}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}

function TourView({ state, onTour }: { state: ReadingState; onTour: (cities: string[]) => void }) {
  const [cities, setCities] = useState<string[]>(() => [...new Set([state.crowd.city, ...TOUR_DEFAULT])].slice(0, 6))
  const [extra, setExtra] = useState('')
  const t = state.tour
  const cellFor = (refId: string, city: string) => t.cells.find((c) => c.refId === refId && c.city === city)
  const scored = state.refs.filter((r) => r.entity)
  const cityScores = t.cities.map((c) => [c, roomScore(scored.map((r) => cellFor(r.id, c)?.verdict ?? 'unknown'))] as const)
  const best = [...cityScores].sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))[0]

  return (
    <div className="space-y-5">
      <div className="panel p-5 sm:p-6">
        <p className="eyebrow">Take this set on tour</p>
        <p className="mt-1 text-sm text-stage-400">Pick up to 8 cities. Every reference is scored in each one, with the same rules.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {[...new Set([...CITIES, ...cities])].map((c) => (
            <button
              key={c}
              onClick={() => setCities((s) => (s.includes(c) ? s.filter((x) => x !== c) : s.length >= 8 ? s : [...s, c]))}
              className={`chip ${cities.includes(c) ? 'chip-on' : ''}`}
            >
              {c}
            </button>
          ))}
          <form
            onSubmit={(e) => {
              e.preventDefault()
              const c = extra.trim()
              if (c && !cities.includes(c) && cities.length < 8) setCities((s) => [...s, c])
              setExtra('')
            }}
          >
            <input value={extra} onChange={(e) => setExtra(e.target.value)} placeholder="+ add a city" className="chip w-32 bg-stage-950 outline-none" />
          </form>
        </div>
        <button className="btn-bulb mt-4" disabled={t.status === 'running' || cities.length === 0} onClick={() => onTour(cities)}>
          {t.status === 'running' ? (
            <>
              <Spinner /> Reading {cities.length} rooms…
            </>
          ) : (
            `Read ${cities.length} rooms`
          )}
        </button>
        {t.status === 'error' && <p className="mt-2 text-sm text-dies">The tour read failed. Try again.</p>}
      </div>

      {t.status === 'done' && (
        <div className="panel overflow-x-auto p-5 sm:p-6">
          {best && best[1] !== null && (
            <p className="mb-4 text-sm text-stage-300">
              This set plays best in <span className="font-bold text-kills">{best[0]}</span> ({best[1]}/100).
            </p>
          )}
          <table className="w-full min-w-[640px] border-separate border-spacing-1 text-sm">
            <thead>
              <tr>
                <th className="text-left text-xs font-semibold text-stage-500">Reference</th>
                {t.cities.map((c) => (
                  <th key={c} className="px-1 text-center text-xs font-semibold text-stage-300">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {scored.map((r) => (
                <tr key={r.id}>
                  <td className="whitespace-nowrap pr-3 text-stage-200">{r.name}</td>
                  {t.cities.map((c) => {
                    const cell = cellFor(r.id, c)
                    return (
                      <td key={c} className={`rounded-lg px-2 py-1.5 text-center font-mono text-xs ref-${cell?.verdict ?? 'unknown'}`} title={cell ? `${pct(cell.local)}/100, ${signed(cell.lift)} vs. the typical city` : ''}>
                        {cell ? `${VERDICT_META[cell.verdict].emoji} ${pct(cell.local)}` : '–'}
                      </td>
                    )
                  })}
                </tr>
              ))}
              <tr>
                <td className="pr-3 pt-2 text-xs font-bold uppercase tracking-wider text-stage-400">Room score</td>
                {cityScores.map(([c, v]) => (
                  <td key={c} className="pt-2 text-center">
                    <span className="display text-xl text-stage-100">{v ?? '–'}</span>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function ReceiptsView({ state }: { state: ReadingState }) {
  return (
    <div className="panel p-5 sm:p-6">
      <p className="eyebrow">Every Qloo request behind this read</p>
      <p className="mt-1 text-xs text-stage-500">
        Exact parameters, no key. Qloo results describe what groups tend to like, not what any one person will do.
      </p>
      <div className="mt-4 grid gap-2 md:grid-cols-2">
        {state.receipts.map((r, i) => (
          <div key={i} className="min-w-0">
            <p className="mb-1 truncate text-xs font-semibold text-stage-300">{r.label}</p>
            <ReceiptLine r={r} />
          </div>
        ))}
      </div>
    </div>
  )
}

export function Section({ children }: { children: ReactNode }) {
  return <section className="mx-auto max-w-7xl px-6">{children}</section>
}
