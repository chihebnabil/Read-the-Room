# Read the Room

**Know the room before you walk on stage.**

Comedians, keynote speakers and touring performers write one set and perform it in dozens of cities. A reference that kills in Nashville can die in Brooklyn, and nobody knows which until the silence. Read the Room is an agent that reads your set the way tonight's crowd will hear it.

Paste a set, speech or toast and pick a city (and optionally the room: college show, corporate gig, casino theater). The agent:

1. **Finds** every cultural reference in the text: TV shows, artists, brands, places, people, podcasts, games.
2. **Matches** each one to an entity in Qloo's taste graph.
3. **Scores** it for tonight's crowd against a nationwide baseline: 🔥 kills, 😬 risky, 💀 dies here.
4. **Swaps** weak references for well-known ones this crowd actually loves, and rewrites the line so the joke still works.
5. **Builds a crowd-work cheat sheet** from what the city over-indexes on.
6. **Tour map**: the same set scored across up to 8 cities, with the city where it plays best.

It also asks a model with no data to guess the same verdicts, and shows where the guess and Qloo disagree. That is the point of the project: without Qloo, an AI can only guess in stereotypes.

### The Road Manager

A chat agent inside the report that calls Qloo on its own (OpenRouter tool calling) to answer questions like "What should I open with in Nashville?" or "Where should I take this set on tour?". Every tool call it makes is shown with the Qloo requests behind it.

### Use it from your own agent (MCP)

The same four Qloo tools are exposed as a stateless MCP server at `/api/mcp` (Streamable HTTP): `score_references`, `find_swaps`, `city_favorites`, `compare_cities`.

```bash
claude mcp add --transport http read-the-room https://<your-deployment>/api/mcp
```

## Why it needs Qloo

The model never decides a verdict. It only reads the script and rewrites lines. Every verdict comes from Qloo numbers through a fixed rule ([`src/lib/scoring.ts`](src/lib/scoring.ts)), and every number links to the exact Qloo request behind it (the **Receipts** tab).

| Step | Qloo call | Why |
| --- | --- | --- |
| Find the reference | `GET /search?query=…&types=urn:entity:<kind>` | Resolve the name in the script to one entity. Exact names win over fuzzy top hits. |
| Score it for tonight | `GET /v2/insights` with `filter.results.entities`, `signal.location.query`, `signal.demographics.age` | Affinity of the crowd for each reference. |
| Nationwide baseline | same, with `signal.location.query=United States` | The gap between local and national is what makes a reference local. |
| Find a swap | `GET /v2/insights` with `signal.interests.entities=<weak ref>`, `signal.location.query`, `filter.popularity.min=0.75` | Things like the weak reference that this crowd loves, limited to well-known ones so the room still gets it. |
| Crowd work | `GET /v2/insights` with `filter.type=urn:entity:place` + `filter.location.query`, and TV, music, brands, movies by `signal.location.query` | What the city over-indexes on. |
| Tour map | the scoring call for each city | Where the set plays best. |

## Stack

- [TanStack Start](https://tanstack.com/start) (React 19, server functions) on [Nitro](https://nitro.build), so it deploys to Vercel, Netlify, Cloudflare or any Node host.
- Qloo Insights API (hackathon host `https://hackathon.api.qloo.com`), called only from the server. The key never reaches the browser.
- [OpenRouter](https://openrouter.ai) for the model steps, default model `deepseek/deepseek-v4.1-flash-1017`, with strict JSON-schema output.
- Tailwind CSS v4.

## Run it locally

Requires Node.js 22.

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
- Qloo responses are cached in server memory only (allowed by the hackathon rules) and never committed.

## License

MIT
