import { useEffect, useRef, useState } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { Report } from '~/components/Report'
import { Trace } from '~/components/Trace'
import { Spinner } from '~/components/ui'
import { CITIES, PRESETS, VENUES } from '~/lib/presets'
import { AGE_LABEL } from '~/lib/types'
import { useReading } from '~/lib/useReading'
import { configFn } from '~/server/room'

export const Route = createFileRoute('/')({
  loader: () => configFn(),
  component: Home,
})

function Home() {
  const config = Route.useLoaderData()
  const { state, run, runTour } = useReading()
  const [presetId, setPresetId] = useState<string | null>(PRESETS[0].id)
  const [text, setText] = useState(PRESETS[0].text)
  const [city, setCity] = useState('Brooklyn')
  const [venueId, setVenueId] = useState(VENUES[0].id)
  const results = useRef<HTMLDivElement>(null)

  const venue = VENUES.find((v) => v.id === venueId)!
  const preset = PRESETS.find((p) => p.id === presetId && p.text === text)
  const canRun = text.trim().length >= 10 && city.trim().length >= 2 && (preset || config.ai)

  useEffect(() => {
    if (state?.running && state.steps[0].status === 'running') results.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [state?.running, state?.steps])

  const demo = () => {
    const p = PRESETS[0]
    setPresetId(p.id)
    setText(p.text)
    setCity('Brooklyn')
    setVenueId(VENUES[0].id)
    run(p.text, p.id, { city: 'Brooklyn', age: VENUES[0].age, venue: VENUES[0].label })
  }

  return (
    <>
      <section className="relative">
        <div className="spotlight pointer-events-none absolute inset-0" />
        <div className="wrap relative grid items-center gap-10 py-14 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-14 lg:py-20">
          <div>
            <p className="eyebrow text-bulb">For comedians, speakers and hosts</p>
            <h1 className="display mt-4 text-[44px] leading-[0.95] text-stage-100 sm:text-6xl lg:text-[68px]">
              <span className="block">Know the room</span>
              <span className="block [text-wrap:balance]">
                <span className="text-bulb">before</span> you walk on stage
              </span>
            </h1>
            <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-stage-300">
              The same joke kills in Austin and dies in Brooklyn. Paste your set, pick tonight’s city, and Read the Room checks every
              reference against what that crowd actually loves, using Qloo’s taste data, then rewrites the lines that will not land.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <button className="btn-bulb px-5 py-3.5" disabled={state?.running} onClick={demo}>
                {state?.running ? <Spinner /> : <span aria-hidden>▶</span>} Run the demo
              </button>
              <a href="#try" className="btn-line px-5 py-3.5">
                Use my own set
              </a>
            </div>
            <p className="mt-3 text-xs text-stage-500">The demo reads a set written for Texas in front of a Brooklyn crowd. About 30 seconds, live Qloo data.</p>
          </div>
          <OneLineTwoRooms />
        </div>
      </section>

      <div ref={results} className="scroll-mt-4">
        {state && (
          <section className="wrap space-y-5 pb-16">
            <Trace state={state} />
            {state.error && state.refs.length === 0 ? (
              <div className="panel p-6 text-sm text-dies">{state.error}</div>
            ) : (
              <Report state={state} onTour={runTour} />
            )}
          </section>
        )}
      </div>

      <section id="try" className="scroll-mt-4 border-t border-stage-800 py-14">
        <div className="wrap">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="eyebrow">Try it</p>
              <h2 className="display mt-2 text-3xl text-stage-100 sm:text-4xl">Read your own set</h2>
            </div>
            {config.mode === 'sample' && <p className="text-xs text-risky">Running on sample data until the Qloo key is configured.</p>}
          </div>

          <div className="panel mt-6 grid lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
            <div className="min-w-0 border-b border-stage-800 p-5 sm:p-6 lg:border-b-0 lg:border-r">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <label htmlFor="set" className="flex items-center gap-2.5 text-sm font-semibold text-stage-100">
                  <span className="step-num">1</span> Your set, speech or toast
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {PRESETS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setPresetId(p.id)
                        setText(p.text)
                      }}
                      className={`chip ${preset?.id === p.id ? 'chip-on' : ''}`}
                    >
                      {p.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      setPresetId(null)
                      setText('')
                    }}
                    className={`chip ${!preset ? 'chip-on' : ''}`}
                  >
                    Write my own
                  </button>
                </div>
              </div>
              <textarea
                id="set"
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={13}
                placeholder="Paste your set. One bit or line per row works best."
                className="input resize-y font-mono text-[13px] leading-relaxed"
              />
              {!preset && !config.ai && (
                <p className="mt-2 text-xs text-risky">Custom sets need the model configured on this server. The sample sets work right away.</p>
              )}
            </div>

            <div className="flex min-w-0 flex-col gap-6 p-5 sm:p-6">
              <div>
                <label htmlFor="city" className="mb-3 flex items-center gap-2.5 text-sm font-semibold text-stage-100">
                  <span className="step-num">2</span> Tonight’s city
                </label>
                <input id="city" value={city} onChange={(e) => setCity(e.target.value)} className="input" placeholder="Any US city or neighborhood" />
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {CITIES.map((c) => (
                    <button key={c} type="button" onClick={() => setCity(c)} className={`chip ${city === c ? 'chip-on' : ''}`}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-3 flex items-center gap-2.5 text-sm font-semibold text-stage-100">
                  <span className="step-num">3</span> The room
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {VENUES.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setVenueId(v.id)}
                      className={`rounded-xl border px-3 py-2.5 text-left transition ${
                        venueId === v.id ? 'border-bulb/70 bg-bulb/10' : 'border-stage-700 hover:border-stage-500'
                      }`}
                    >
                      <span className={`block text-sm font-semibold ${venueId === v.id ? 'text-stage-100' : 'text-stage-200'}`}>{v.label}</span>
                      <span className="text-xs text-stage-500">{v.age ? AGE_LABEL[v.age] : 'Mixed ages'}</span>
                    </button>
                  ))}
                </div>
              </div>
              <button
                className="btn-bulb mt-auto w-full py-3.5"
                disabled={!canRun || state?.running}
                onClick={() => run(text, preset?.id ?? null, { city: city.trim(), age: venue.age, venue: venue.label })}
              >
                {state?.running ? (
                  <>
                    <Spinner /> Reading the room…
                  </>
                ) : (
                  <>Read the room for {city.trim() || '…'} →</>
                )}
              </button>
            </div>
          </div>
        </div>
      </section>

      <HowStrip />
      <WhyQloo />
      <WhoFor />
    </>
  )
}

/** The product's one idea, shown with a real line from the demo set. */
function OneLineTwoRooms() {
  const rows = [
    { city: 'Austin', verdict: '🔥 Kills', tone: 'text-kills border-kills/30 bg-kills/10', note: 'Over-indexes strongly against 7 other cities' },
    { city: 'Brooklyn', verdict: '💀 Dies', tone: 'text-dies border-dies/30 bg-dies/10', note: 'Under-indexes against the typical city' },
  ]
  return (
    <div className="panel overflow-hidden">
      <div className="flex items-center justify-between border-b border-stage-800 px-5 py-3">
        <p className="eyebrow">One line, two rooms</p>
        <p className="hidden font-mono text-[11px] text-stage-500 sm:block">line 11 of the demo set</p>
      </div>
      <div className="space-y-5 p-5">
        <p className="font-mono text-[15px] leading-relaxed text-stage-200">
          I fell asleep to <span className="ref-risky rounded px-1 font-semibold text-stage-100">The Joe Rogan Experience</span> and woke up owning an ice bath.
        </p>
        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={r.city} className="flex items-center gap-3 rounded-xl bg-stage-950 px-3.5 py-3">
              <span className="w-20 shrink-0 text-sm font-semibold text-stage-100">{r.city}</span>
              <span className="hidden min-w-0 flex-1 truncate text-xs text-stage-400 sm:block">{r.note}</span>
              <span className="flex-1 sm:hidden" />
              <span className={`shrink-0 rounded-md border px-2 py-0.5 text-xs font-bold ${r.tone}`}>{r.verdict}</span>
            </li>
          ))}
        </ul>
        <div className="rounded-xl border border-dashed border-stage-700 p-3.5">
          <p className="text-[11px] font-bold uppercase tracking-wider text-kills">Rewritten for Brooklyn</p>
          <p className="mt-1.5 font-mono text-[13px] leading-relaxed text-stage-200">
            I fell asleep to <mark className="rounded bg-kills/20 px-1 font-semibold text-kills">The Brilliant Idiots</mark> and woke up owning an ice bath.
          </p>
        </div>
      </div>
    </div>
  )
}

function HowStrip() {
  const items = [
    ['Find', 'A model pulls out every cultural reference: shows, artists, brands, places, people.'],
    ['Match', 'Each one is resolved to an entity in Qloo’s taste graph.'],
    ['Score', 'Qloo measures how tonight’s crowd feels about it, compared with the same reference in 7 other cities.'],
    ['Rewrite', 'Weak references are swapped for ones this crowd loves, and the line is rewritten so the joke still works.'],
  ]
  return (
    <section className="border-t border-stage-800 py-14">
      <div className="wrap">
        <p className="eyebrow">How it works</p>
        <ol className="mt-6 grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
          {items.map(([t, b], i) => (
            <li key={t} className="border-t border-stage-700 pt-4">
              <p className="font-mono text-xs text-bulb">0{i + 1}</p>
              <p className="mt-1 text-lg font-bold text-stage-100">{t}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-stage-400">{b}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

function WhyQloo() {
  return (
    <section className="border-t border-stage-800 py-14">
      <div className="wrap grid items-center gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <div>
          <p className="eyebrow">Why not just ask a chatbot?</p>
          <h2 className="display mt-2 text-3xl text-stage-100 sm:text-4xl">A model guesses. Qloo measures.</h2>
          <p className="mt-4 max-w-xl leading-relaxed text-stage-300">
            Ask an AI whether a McConaughey bit works in Brooklyn and it reasons from clichés: “universally loved”. Qloo measures that
            Brooklyn under-indexes on him while Austin over-indexes. Every read in this app also asks a model with no data to guess, so you
            can see where the guess would have cost you the laugh. Every number links to the Qloo request behind it.
          </p>
        </div>
        <Link to="/lab" className="panel group block p-6 transition hover:border-bulb/40">
          <p className="eyebrow">Benchmark · 8 cities · live Qloo data</p>
          <p className="display mt-3 text-6xl text-bulb">51%</p>
          <p className="mt-2 text-sm leading-relaxed text-stage-300">
            of 130 calls where a model with no data disagreed with Qloo. It called 🔥 twice as often as the data supports.
          </p>
          <p className="mt-4 text-sm font-semibold text-bulb group-hover:underline">See every call →</p>
        </Link>
      </div>
    </section>
  )
}

function WhoFor() {
  const who = [
    ['Touring comedians', 'One set, 40 cities. Know which bits travel and which need a local swap before soundcheck.'],
    ['Keynote speakers', 'Open with a reference the room actually shares, not the one that played well at headquarters.'],
    ['Agencies and brands', 'Localize one campaign script for every market: the same read works on ad copy and radio spots.'],
    ['Hosts, MCs and toasts', 'Weddings, galas and award shows: know the room’s age and city before you pick the references.'],
  ]
  return (
    <section className="border-t border-stage-800 py-14">
      <div className="wrap">
        <p className="eyebrow">Who it is for</p>
        <h2 className="display mt-2 text-3xl text-stage-100 sm:text-4xl">Anyone who talks to a room they have never met</h2>
        <div className="mt-6 grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
          {who.map(([t, b]) => (
            <div key={t} className="border-t border-stage-700 pt-4">
              <p className="font-bold text-stage-100">{t}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-stage-400">{b}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
