# Read the Room

**Know the room before you walk on stage.**

**Live demo:** [rtr-qloo.vercel.app](https://rtr-qloo.vercel.app) · **Benchmark:** [rtr-qloo.vercel.app/lab](https://rtr-qloo.vercel.app/lab) · **MCP endpoint:** `https://rtr-qloo.vercel.app/api/mcp`

> **Try it in a minute:** click **Run the demo**. It reads a set written for Texas in front of a Brooklyn crowd on live Qloo data: the set scores 14/100 as written, and a model with no data disagrees with Qloo on 9 of its 11 references. Then open **Rewritten set** for the swaps, **Tour map** for the cities where it plays best, and **Receipts** for the Qloo request behind every number. The first read takes about 40 seconds on a cold cache (over 100 live Qloo calls); repeat reads are served from cache.

Comedians, keynote speakers and touring performers write one set and perform it in dozens of cities. A reference that kills in Nashville can die in Brooklyn, and nobody knows which until the silence. Read the Room is an agent that reads your set the way tonight's crowd will hear it.

Paste a set, speech or toast and pick a city (and optionally the room: college show, corporate gig, casino theater). The agent:

1. **Finds** every cultural reference in the text: TV shows, artists, brands, places, people, podcasts, games.
2. **Matches** each one to an entity in Qloo's taste graph.
3. **Scores** it for tonight's crowd against the same reference in 7 other US cities: 🔥 kills, 😬 risky, 💀 dies here.
4. **Swaps** weak references for well-known ones this crowd actually loves, and rewrites the line so the joke still works.
5. **Builds a crowd-work cheat sheet** from what the city over-indexes on.
6. **Tour map**: the same set scored across up to 8 cities, with the city where it plays best.

It also asks a model with no data to guess the same verdicts, and shows where the guess and Qloo disagree. That is the point of the project: without Qloo, an AI can only guess in stereotypes.

**The benchmark** (`/lab`): every reference in both sample scripts, in 8 cities. On live Qloo data, a model with no data disagreed with Qloo on **54% of 136 calls**. Of the 35 bits Qloo says die, the model would have kept 23; it said "kills" 12 times where Qloo says "dies", and it called 🔥 78 times where the data supports 35. (The model's guesses vary slightly from run to run.) Disagreement does not prove the model wrong, since affinity is not laughter, but it shows how often a model-only tool would give a performer different advice than the measured data.

### The Road Manager

A chat agent inside the report that calls Qloo on its own (OpenRouter tool calling) to answer questions like "What should I open with in Nashville?" or "Where should I take this set on tour?". Every tool call it makes is shown with the Qloo requests behind it.

### Use it from your own agent (MCP)

The same four Qloo tools are exposed as a stateless MCP server at `/api/mcp` (Streamable HTTP): `score_references`, `find_swaps`, `city_favorites`, `compare_cities`.

```bash
claude mcp add --transport http read-the-room https://rtr-qloo.vercel.app/api/mcp
```

## Why it needs Qloo

The model never decides a verdict. It only reads the script and rewrites lines. Every verdict comes from Qloo numbers through a fixed rule ([`src/lib/scoring.ts`](src/lib/scoring.ts)), and every number links to the exact Qloo request behind it (the **Receipts** tab).

### How a verdict is computed

Qloo location affinities for well-known names sit between 0.9 and 0.99999, so the app reads them on a log scale:

```
strength = -log10(1 - affinity) / 5        # 0.99 -> 40/100, 0.999 -> 60/100, 0.9999 -> 80/100
lift     = strength here - median strength in the other panel cities
```

A reference is only ever compared with itself in other cities, never with other references. If Qloo leaves a reference out of a city's results, it measured no audience there; that counts as a measured absence (0) when other cities do have an audience, and as "no data" when none does.

- 🔥 **Kills**: at least 30/100 here, and either 5+ points above its median in the other cities or a regional favorite (measured in at most a third of them).
- 💀 **Dies**: 5+ points below its median, or no measurable audience here while other cities have one.
- 😬 **Risky**: about as strong here as anywhere, or a household name (top 0.5% popularity) this crowd does not over-index on: recognized, not loved.
- **Age bands** (college show, corporate gig, casino theater): with an age signal Qloo's location affinities all collapse to about 0.96, so the city is read on its own and the room's age band shifts the verdict one step when the reference's audience clearly skews toward or away from it (`filter.type=urn:demographics`, skew of ±0.3 or more).

The comparison panel is Nashville, Brooklyn, Austin, Salt Lake City, Los Angeles, Chicago, Boston and Atlanta.

| Step | Qloo call | Why |
| --- | --- | --- |
| Find the reference | `GET /search?query=…&types=urn:entity:<kind>` | Resolve the name in the script to one entity. Exact names win over fuzzy top hits. |
| Score it for tonight | `GET /v2/insights` with `filter.results.entities`, `signal.location.query`, `signal.demographics.age` | Affinity of the crowd for each reference. |
| Compare with other cities | same, once per panel city | The baseline: the same reference in the typical city. The gap is what makes a reference local. |
| Find a swap | `GET /v2/insights` with `signal.interests.entities=<weak ref>`, `signal.location.query`, `filter.popularity.min=0.75`, then the two scoring calls above for every candidate | Things like the weak reference, limited to well-known ones so the room still gets it, and scored exactly like the original. |
| Room taste profile | `GET /v2/insights` with `filter.type=urn:tag`, `filter.tag.types=urn:tag:theme:qloo` + `filter.parents.types=urn:entity:tv_show` (and `urn:tag:genre:music` for artists), `signal.location.query` | The TV themes and music genres the crowd over-indexes on, turned into a delivery tip. |
| Crowd work | `GET /v2/insights` with `filter.type=urn:entity:place` + `filter.location.query`, and TV, music, brands, movies by `signal.location.query` | What the city over-indexes on. |
| Tour map | the scoring call for each city | Where the set plays best. |

## Stack

- [TanStack Start](https://tanstack.com/start) (React 19, server functions) on [Nitro](https://nitro.build), so it deploys to Vercel, Netlify, Cloudflare or any Node host.
- Qloo Insights API (hackathon host `https://hackathon.api.qloo.com`), called only from the server. The key never reaches the browser.
- [OpenRouter](https://openrouter.ai) for the model steps, default model `deepseek/deepseek-v4.1-flash-1017`, with strict JSON-schema output.
- Tailwind CSS v4.

## Run it locally

Requires Node.js 22, a Qloo API key (see the [Qloo developer docs](https://docs.qloo.com) for hackathon access) and an [OpenRouter API key](https://openrouter.ai/keys).

```bash
npm install
cp .env.example .env   # add QLOO_API_KEY and OPENROUTER_API_KEY
npm run dev
```

Without `QLOO_API_KEY` the app runs on invented sample data, labeled "Sample data, not Qloo" everywhere it appears. The two sample scripts have pre-tagged references, so they work without a model key too.

`npm run probe` checks the live Qloo API with the same calls the app makes and prints the raw affinities.

## Deploy

Vercel: import the repo and set `QLOO_API_KEY`, `QLOO_BASE_URL`, `OPENROUTER_API_KEY`, `OPENROUTER_MODEL` and `APP_URL`. The build is `npm run build`; Nitro picks the Vercel preset automatically. Any other Node host: `npm run build && npm start`.

## Responsible use and limits

- Qloo results describe what groups tend to like, not what any one person in the room will do.
- Affinity is not laughter. A reference the crowd loves still needs a good joke around it.
- No personal data is sent to Qloo: only entity names, a city and an optional age band.
- Qloo responses are cached server-side for 6 hours: in the instance's memory, then in Vercel's runtime cache shared by every serverless instance. Nothing is stored in the browser or committed to the repo.
- Requests are paced under the key's 10-per-second limit, so a rate-limited call is never mistaken for "no audience here".
- Some entities (for example a few chains and actors) have no location data in Qloo; they show as "No data" instead of a guess.

## License

MIT
