import { useEffect, useRef, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Report } from '~/components/Report'
import { Trace } from '~/components/Trace'
import { Spinner } from '~/components/ui'
import { CITIES, PRESETS, VENUES } from '~/lib/presets'
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

  return (
    <>
      <section className="relative overflow-hidden">
        <div className="spotlight pointer-events-none absolute inset-0" />
        <div className="pointer-events-none absolute -top-40 left-1/2 h-[560px] w-[420px] -translate-x-1/2 animate-sweep rounded-full bg-bulb/[0.06] blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-6 pb-14 pt-14 lg:pt-20">
          <div className="mx-auto max-w-3xl text-center">
            <p className="inline-flex items-center gap-2 rounded-full border border-stage-700 bg-stage-900 px-3 py-1 text-xs font-semibold text-stage-300">
              <span className="h-1.5 w-1.5 animate-flicker rounded-full bg-bulb" /> An agent powered by Qloo’s taste graph
            </p>
            <h1 className="display mt-6 text-6xl leading-[0.95] text-stage-100 sm:text-7xl lg:text-8xl">
              Know the room <span className="text-bulb">before</span> you walk on stage
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-stage-300">
              Paste your set and pick tonight’s city. Read the Room checks every reference against what that crowd actually loves,
              tells you what will <span className="font-semibold text-kills">kill</span> and what will{' '}
              <span className="font-semibold text-dies">die</span>, and rewrites the weak lines with references they love.
            </p>
          </div>

          <div className="panel mx-auto mt-12 max-w-5xl p-5 sm:p-7">
            <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
              <div>
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <label htmlFor="set" className="eyebrow">Your set, speech or toast</label>
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
                      className="chip"
                    >
                      Write my own
                    </button>
                  </div>
                </div>
                <textarea
                  id="set"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={12}
                  placeholder="Paste your set. One bit or line per row works best."
                  className="input resize-y font-mono text-[13px] leading-relaxed"
                />
                {!preset && !config.ai && (
                  <p className="mt-2 text-xs text-risky">Custom sets need the model configured on this server. The sample sets work right away.</p>
                )}
              </div>

              <div className="flex flex-col gap-5">
                <div>
                  <label htmlFor="city" className="eyebrow mb-2 block">Tonight’s city</label>
                  <input id="city" value={city} onChange={(e) => setCity(e.target.value)} className="input" placeholder="Any city or neighborhood" />
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {CITIES.map((c) => (
                      <button key={c} type="button" onClick={() => setCity(c)} className={`chip ${city === c ? 'chip-on' : ''}`}>
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="eyebrow mb-2">The room</p>
                  <div className="grid grid-cols-2 gap-2">
                    {VENUES.map((v) => (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => setVenueId(v.id)}
                        className={`rounded-2xl border px-3 py-2.5 text-left text-sm transition ${
                          venueId === v.id ? 'border-bulb bg-bulb/10 text-stage-100' : 'border-stage-700 text-stage-300 hover:border-stage-500'
                        }`}
                      >
                        <span className="block font-semibold">{v.label}</span>
                        <span className="text-xs text-stage-500">{v.age ? (v.age === '24_and_younger' ? 'Under 25' : v.age === '55_and_older' ? '55+' : '35–44') : 'Mixed ages'}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  className="btn-bulb mt-auto py-4 text-base"
                  disabled={!canRun || state?.running}
                  onClick={() => run(text, preset?.id ?? null, { city: city.trim(), age: venue.age, venue: venue.label })}
                >
                  {state?.running ? (
                    <>
                      <Spinner /> Reading the room…
                    </>
                  ) : (
                    'Read the room →'
                  )}
                </button>
                {config.mode === 'sample' && (
                  <p className="-mt-2 text-center text-xs text-stage-500">Running on sample data until the Qloo key is configured.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div ref={results} className="scroll-mt-4">
        {state && (
          <section className="mx-auto grid max-w-7xl gap-5 px-6 pb-20 lg:grid-cols-[320px_1fr]">
            <div className="lg:sticky lg:top-4 lg:self-start">
              <Trace state={state} />
            </div>
            <div>
              {state.error && state.refs.length === 0 ? (
                <div className="panel p-6 text-sm text-dies">{state.error}</div>
              ) : (
                <Report state={state} onTour={runTour} />
              )}
            </div>
          </section>
        )}
      </div>

      {!state && <HowStrip />}
    </>
  )
}

function HowStrip() {
  const items = [
    ['01', 'Find', 'The agent pulls out every cultural reference: shows, artists, brands, places, people.'],
    ['02', 'Match', 'Each one is resolved to an entity in Qloo’s taste graph of 250M+ entities.'],
    ['03', 'Score', 'Qloo measures how tonight’s crowd feels about it, compared with the whole country.'],
    ['04', 'Rewrite', 'Weak references get swapped for ones this crowd loves, and the line is rewritten so the joke still works.'],
  ]
  return (
    <section className="border-t border-stage-800 py-16">
      <div className="mx-auto grid max-w-7xl gap-4 px-6 md:grid-cols-4">
        {items.map(([n, t, b]) => (
          <div key={n} className="panel p-6">
            <p className="font-mono text-sm text-bulb">{n}</p>
            <p className="display mt-3 text-2xl text-stage-100">{t}</p>
            <p className="mt-2 text-sm leading-relaxed text-stage-400">{b}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
