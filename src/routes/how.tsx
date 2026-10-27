import { Link, createFileRoute } from '@tanstack/react-router'
import { THRESHOLDS } from '~/lib/scoring'

export const Route = createFileRoute('/how')({ component: How })

const calls = [
  ['Find the reference', 'GET /search', 'query=Whole Foods Market · types=urn:entity:brand', 'Resolves the name in the script to one Qloo entity. Exact names win over fuzzy top hits.'],
  ['Score it for tonight', 'GET /v2/insights', 'filter.type=urn:entity:brand · filter.results.entities=<ids> · signal.location.query=Nashville · signal.demographics.age=…', 'Affinity of each reference with this crowd.'],
  ['Compare with the country', 'GET /v2/insights', 'same, with signal.location.query=United States', 'The baseline. The gap between the two is what makes a reference local.'],
  ['Find a swap', 'GET /v2/insights', 'signal.interests.entities=<weak ref> · signal.location.query=Nashville · filter.popularity.min=0.75', 'Things like the weak reference that this crowd loves, limited to well-known ones so the room still gets it.'],
  ['Crowd work', 'GET /v2/insights', 'filter.type=urn:entity:place · filter.location.query=Nashville (and TV, music, brands, movies by signal.location)', 'What this city over-indexes on, for openers.'],
]

function How() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <p className="eyebrow">How it works</p>
      <h1 className="display mt-2 text-5xl text-stage-100">The agent, step by step</h1>
      <p className="mt-4 text-lg leading-relaxed text-stage-300">
        A model alone can only guess what a city likes, and it guesses in stereotypes. Read the Room asks Qloo, which measures cultural
        affinity across 250M+ entities, and only uses the model for what models are good at: reading the script and rewriting a line so the
        joke still works.
      </p>

      <ol className="mt-10 space-y-4">
        {calls.map(([title, endpoint, params, why], i) => (
          <li key={title} className="panel p-5">
            <div className="flex items-baseline gap-3">
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
      <p className="mt-3 text-stage-300">The model never decides the verdict. A fixed rule does, using only Qloo numbers:</p>
      <ul className="mt-4 space-y-2 text-sm text-stage-300">
        <li>🔥 <b>Kills</b>: local affinity at least {THRESHOLDS.killsLocal * 100}/100, or at least {THRESHOLDS.killsLift * 100} points above nationwide.</li>
        <li>💀 <b>Dies</b>: local affinity under {THRESHOLDS.diesLocal * 100}/100, at least {Math.abs(THRESHOLDS.diesLift * 100)} points below nationwide, or too obscure (popularity under {THRESHOLDS.obscure * 100}th percentile).</li>
        <li>😬 <b>Risky</b>: everything in between.</li>
      </ul>

      <h2 className="display mt-14 text-3xl text-stage-100">Use it from your own agent</h2>
      <p className="mt-3 text-stage-300">
        Read the Room is also an MCP server, so Claude, Cursor or any MCP client can call the same Qloo tools the Road Manager uses:
        <code className="mx-1 text-bulb">score_references</code>, <code className="mx-1 text-bulb">find_swaps</code>,
        <code className="mx-1 text-bulb">city_favorites</code> and <code className="mx-1 text-bulb">compare_cities</code>.
      </p>
      <pre className="panel mt-4 overflow-x-auto p-4 font-mono text-xs text-stage-300">{`claude mcp add --transport http read-the-room ${typeof window === 'undefined' ? 'https://<your-deployment>' : window.location.origin}/api/mcp`}</pre>

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
