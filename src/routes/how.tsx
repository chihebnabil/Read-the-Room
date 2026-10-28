import { useEffect, useState } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { CITIES } from '~/lib/presets'
import { THRESHOLDS } from '~/lib/scoring'

export const Route = createFileRoute('/how')({ component: How })

const calls = [
  ['Find the reference', 'GET /search', 'query=Whole Foods Market · types=urn:entity:brand', 'Resolves the name in the script to one Qloo entity. Exact names win over fuzzy top hits.'],
  ['Score it for tonight', 'GET /v2/insights', 'filter.type=urn:entity:brand · filter.results.entities=<ids> · signal.location.query=Nashville · signal.demographics.age=…', 'Affinity of each reference with this crowd. If Qloo leaves a reference out, it measured no audience for it here.'],
  ['Compare with other cities', 'GET /v2/insights', `same, once per comparison city: ${CITIES.join(', ')}`, 'The baseline is the same reference in the typical city. The gap between the two is what makes a reference local.'],
  ['Find a swap', 'GET /v2/insights', 'signal.interests.entities=<weak ref> · signal.location.query=Nashville · filter.popularity.min=0.75', 'Things like the weak reference, limited to well-known ones so the room still gets it. Each candidate is then scored exactly like the original.'],
  ['Crowd work', 'GET /v2/insights', 'filter.type=urn:entity:place · filter.location.query=Nashville (and TV, music, brands, movies by signal.location)', 'What this city over-indexes on, for openers.'],
]

function How() {
  const [origin, setOrigin] = useState('https://<your-deployment>')
  useEffect(() => setOrigin(window.location.origin), [])
  return (
    <div className="mx-auto w-full max-w-4xl px-5 py-14 sm:px-8">
      <p className="eyebrow">How it works</p>
      <h1 className="display mt-2 text-4xl text-stage-100 sm:text-5xl">The agent, step by step</h1>
      <p className="mt-4 text-lg leading-relaxed text-stage-300">
        A model alone can only guess what a city likes, and it guesses in stereotypes. Read the Room asks Qloo, which measures cultural
        affinity across 250M+ entities, and only uses the model for what models are good at: reading the script and rewriting a line so the
        joke still works.
      </p>

      <ol className="mt-10 space-y-4">
        {calls.map(([title, endpoint, params, why], i) => (
          <li key={title} className="panel p-4 sm:p-5">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="font-mono text-sm text-bulb">{String(i + 1).padStart(2, '0')}</span>
              <p className="text-lg font-bold text-stage-100">{title}</p>
              <span className="ml-auto font-mono text-xs text-kills">{endpoint}</span>
            </div>
            <p className="mt-2 break-words font-mono text-xs text-stage-400">{params}</p>
            <p className="mt-2 text-sm text-stage-300">{why}</p>
          </li>
        ))}
      </ol>

      <h2 className="display mt-14 text-3xl text-stage-100">How a verdict is decided</h2>
      <p className="mt-3 text-stage-300">
        The model never decides the verdict. A fixed rule does, using only Qloo numbers. Qloo affinities for well-known names all sit between 0.9
        and 0.99999, so we read them on a log scale: strength = −log₁₀(1 − affinity) ÷ 5, which puts 0.99 at 40/100 and 0.999 at 60/100. Then each
        reference is compared with itself in the other cities, never with other references.
      </p>
      <ul className="mt-4 space-y-2 text-sm text-stage-300">
        <li>🔥 <b>Kills</b>: at least {THRESHOLDS.killsStrength * 100}/100 here, and either {THRESHOLDS.killsLift * 100}+ points above its median in the other cities or a regional favorite (measured in at most a third of them).</li>
        <li>💀 <b>Dies</b>: at least {Math.abs(THRESHOLDS.diesLift * 100)} points below its median, or no measurable audience here while other cities have one.</li>
        <li>😬 <b>Risky</b>: about as strong here as anywhere, or a household name (popularity in the top {Math.round((1 - THRESHOLDS.household) * 1000) / 10}%) this crowd does not over-index on: recognized, not loved.</li>
        <li>❔ <b>No data</b>: Qloo has no location data for it in any of the cities.</li>
      </ul>

      <h2 className="display mt-14 text-3xl text-stage-100">Use it from your own agent</h2>
      <p className="mt-3 text-stage-300">
        Read the Room is also an MCP server, so Claude, Cursor or any MCP client can call the same Qloo tools the Road Manager uses:
        <code className="mx-1 text-bulb">score_references</code>, <code className="mx-1 text-bulb">find_swaps</code>,
        <code className="mx-1 text-bulb">city_favorites</code> and <code className="mx-1 text-bulb">compare_cities</code>.
      </p>
      <pre className="panel mt-4 overflow-x-auto p-4 font-mono text-xs text-stage-300">{`claude mcp add --transport http read-the-room ${origin}/api/mcp`}</pre>

      <h2 className="display mt-14 text-3xl text-stage-100">What it does not claim</h2>
      <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-stage-300">
        <li>Qloo results describe what groups tend to like, not what any one person in the room will do.</li>
        <li>Affinity is not laughter. A reference the crowd loves still needs a good joke around it.</li>
        <li>No personal data is sent to Qloo: only entity names, a city and an optional age band.</li>
      </ul>

      <Link to="/" className="btn-bulb mt-12">Try it</Link>
    </div>
  )
}
