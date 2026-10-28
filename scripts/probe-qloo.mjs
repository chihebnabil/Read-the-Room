// Checks the live Qloo hackathon API with the calls Read the Room makes, and prints the numbers
// we use to calibrate verdict thresholds. Never prints the key.
//   npm run probe
const KEY = process.env.QLOO_API_KEY
const BASE = process.env.QLOO_BASE_URL || 'https://hackathon.api.qloo.com'
if (!KEY) {
  console.error('QLOO_API_KEY is missing from .env')
  process.exit(1)
}

async function get(path, params) {
  const url = new URL(path, BASE)
  for (const [k, v] of Object.entries(params)) if (v !== undefined) url.searchParams.set(k, String(v))
  const t = Date.now()
  const res = await fetch(url, { headers: { 'X-Api-Key': KEY, accept: 'application/json' } })
  const text = await res.text()
  let body
  try {
    body = JSON.parse(text)
  } catch {
    body = text
  }
  return { status: res.status, ms: Date.now() - t, body }
}

const list = (b) => (Array.isArray(b?.results) ? b.results : b?.results?.entities ?? [])

const refs = [
  ['Yellowstone', 'tv_show'],
  ['Succession', 'tv_show'],
  ['H-E-B', 'brand'],
  ['Whole Foods Market', 'brand'],
  ['Nickelback', 'artist'],
  ['Morgan Wallen', 'artist'],
  ['Matthew McConaughey', 'person'],
  ['The Joe Rogan Experience', 'podcast'],
  ['Fortnite', 'videogame'],
]
const cities = ['Nashville', 'Brooklyn', 'Austin', 'Salt Lake City', 'Los Angeles']

const ids = {}
for (const [name, kind] of refs) {
  const r = await get('/search', { query: name, types: `urn:entity:${kind}`, take: 3 })
  const top = list(r.body)[0]
  console.log(`search ${name} [${kind}] -> ${r.status} ${r.ms}ms`, top ? `${top.name} ${top.entity_id} pop=${top.popularity}` : JSON.stringify(r.body).slice(0, 200))
  if (top) ids[name] = { id: top.entity_id, kind }
}

console.log('\naffinity by city (filter.results.entities + signal.location.query)')
const byKind = {}
for (const [name, v] of Object.entries(ids)) (byKind[v.kind] ??= []).push([name, v.id])
for (const city of cities) {
  for (const [kind, pairs] of Object.entries(byKind)) {
    const r = await get('/v2/insights', {
      'filter.type': `urn:entity:${kind}`,
      'filter.results.entities': pairs.map((p) => p[1]).join(','),
      'signal.location.query': city,
      take: pairs.length,
    })
    const got = list(r.body)
    const line = pairs
      .map(([n, id]) => {
        const e = got.find((x) => x.entity_id === id)
        return `${n}=${e?.query?.affinity ?? 'none'}`
      })
      .join('  ')
    console.log(`${city.padEnd(15)} ${kind.padEnd(10)} ${r.status} ${r.ms}ms  ${line}`)
    if (r.status !== 200) console.log('   ', JSON.stringify(r.body).slice(0, 300))
  }
}

console.log('\nsimilar for crowd: Yellowstone fans in Brooklyn')
if (ids.Yellowstone) {
  const r = await get('/v2/insights', {
    'filter.type': 'urn:entity:tv_show',
    'signal.interests.entities': ids.Yellowstone.id,
    'signal.location.query': 'Brooklyn',
    'filter.exclude.entities': ids.Yellowstone.id,
    'filter.popularity.min': 0.75,
    take: 8,
  })
  console.log(r.status, r.ms + 'ms', list(r.body).map((e) => `${e.name} (${e.query?.affinity?.toFixed?.(3)}, pop ${e.popularity?.toFixed?.(2)})`).join(', '))
  if (list(r.body)[0]) console.log('query keys:', Object.keys(list(r.body)[0].query ?? {}))
}

console.log('\nfavorites: places in Nashville, tv in Nashville')
for (const params of [
  { 'filter.type': 'urn:entity:place', 'filter.location.query': 'Nashville', take: 5 },
  { 'filter.type': 'urn:entity:tv_show', 'signal.location.query': 'Nashville', 'filter.popularity.min': 0.6, take: 5 },
]) {
  const r = await get('/v2/insights', params)
  console.log(params['filter.type'], r.status, r.ms + 'ms', list(r.body).map((e) => `${e.name} (${e.query?.affinity?.toFixed?.(3)})`).join(', ') || JSON.stringify(r.body).slice(0, 300))
}
