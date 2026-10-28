/**
 * Sample mode: used only when no QLOO_API_KEY is set, so the app can be developed and previewed
 * without a key. Every number here is invented and the UI labels it "Sample data", never as Qloo's.
 */
import type { Kind, QlooEntity, Receipt, TasteTag } from '~/lib/types'
import type { Crowd } from './qloo'

type Region = 'south' | 'northeast' | 'west' | 'midwest' | 'mountain'
type Lean = Partial<Record<Region | 'young' | 'old', number>>
type Item = { name: string; pop: number; lean?: Lean }

const CATALOG: Partial<Record<Kind, Item[]>> = {
  artist: [
    { name: 'Taylor Swift', pop: 0.99, lean: { young: 0.1 } },
    { name: 'Morgan Wallen', pop: 0.95, lean: { south: 0.3, midwest: 0.1, northeast: -0.2, west: -0.15 } },
    { name: 'Luke Combs', pop: 0.93, lean: { south: 0.28, midwest: 0.12, west: -0.12 } },
    { name: 'Chris Stapleton', pop: 0.9, lean: { south: 0.3, mountain: 0.1 } },
    { name: 'Dolly Parton', pop: 0.96, lean: { south: 0.3, old: 0.15 } },
    { name: 'Zach Bryan', pop: 0.9, lean: { south: 0.18, midwest: 0.18, young: 0.1 } },
    { name: 'Nickelback', pop: 0.88, lean: { midwest: 0.12, northeast: -0.1, west: -0.08 } },
    { name: 'Phoebe Bridgers', pop: 0.8, lean: { west: 0.22, northeast: 0.2, south: -0.22, young: 0.15 } },
    { name: 'Kendrick Lamar', pop: 0.95, lean: { west: 0.2, young: 0.15, old: -0.15 } },
    { name: 'Billy Joel', pop: 0.94, lean: { northeast: 0.28, old: 0.2, young: -0.1 } },
    { name: 'Bruce Springsteen', pop: 0.93, lean: { northeast: 0.3, old: 0.2 } },
    { name: 'Imagine Dragons', pop: 0.92, lean: { mountain: 0.28 } },
    { name: 'Beyoncé', pop: 0.98, lean: { south: 0.15 } },
    { name: 'Olivia Rodrigo', pop: 0.92, lean: { young: 0.3, old: -0.2 } },
    { name: 'Jimmy Buffett', pop: 0.88, lean: { south: 0.2, old: 0.25, young: -0.15 } },
    { name: 'Fleetwood Mac', pop: 0.93, lean: { west: 0.1, old: 0.2 } },
  ],
  tv_show: [
    { name: 'Yellowstone', pop: 0.95, lean: { south: 0.3, mountain: 0.28, midwest: 0.1, northeast: -0.22, young: -0.1 } },
    { name: 'Succession', pop: 0.9, lean: { northeast: 0.3, west: 0.15, south: -0.22, mountain: -0.15 } },
    { name: 'The Bachelor', pop: 0.9, lean: { south: 0.12, midwest: 0.1 } },
    { name: 'Duck Dynasty', pop: 0.85, lean: { south: 0.32, west: -0.3, northeast: -0.28 } },
    { name: 'Euphoria', pop: 0.88, lean: { young: 0.3, west: 0.1, old: -0.25 } },
    { name: "Grey's Anatomy", pop: 0.94 },
    { name: 'The Office', pop: 0.98, lean: { young: 0.1 } },
    { name: 'Severance', pop: 0.85, lean: { west: 0.22, northeast: 0.2, south: -0.12 } },
    { name: 'Friday Night Lights', pop: 0.88, lean: { south: 0.32, midwest: 0.1 } },
    { name: 'The Real Housewives of Atlanta', pop: 0.85, lean: { south: 0.25 } },
    { name: 'Ted Lasso', pop: 0.9, lean: { northeast: 0.08 } },
    { name: 'Fixer Upper', pop: 0.86, lean: { south: 0.26, old: 0.1 } },
    { name: 'Ozark', pop: 0.9, lean: { midwest: 0.2, south: 0.1 } },
    { name: 'Shark Tank', pop: 0.92, lean: { midwest: 0.1, old: 0.1 } },
    { name: 'The White Lotus', pop: 0.88, lean: { northeast: 0.22, west: 0.2, south: -0.1 } },
  ],
  brand: [
    { name: 'Whole Foods Market', pop: 0.92, lean: { northeast: 0.2, west: 0.22, south: -0.12 } },
    { name: 'Cracker Barrel', pop: 0.9, lean: { south: 0.3, old: 0.2, west: -0.25, northeast: -0.18 } },
    { name: 'H-E-B', pop: 0.95, lean: { south: 0.36, northeast: -0.3, west: -0.25 } },
    { name: 'Peloton', pop: 0.86, lean: { northeast: 0.22, west: 0.1 } },
    { name: 'Patagonia', pop: 0.9, lean: { west: 0.3, mountain: 0.24, south: -0.1 } },
    { name: 'Chick-fil-A', pop: 0.96, lean: { south: 0.3 } },
    { name: 'Whataburger', pop: 0.98, lean: { south: 0.3, northeast: -0.25, west: -0.1 } },
    { name: "Trader Joe's", pop: 0.94, lean: { west: 0.22, northeast: 0.15 } },
    { name: 'Waffle House', pop: 0.9, lean: { south: 0.36, west: -0.25 } },
    { name: 'YETI', pop: 0.99, lean: { south: 0.2, mountain: 0.2, northeast: -0.15 } },
    { name: 'In-N-Out Burger', pop: 0.92, lean: { west: 0.36, northeast: -0.25 } },
    { name: "Dunkin'", pop: 0.94, lean: { northeast: 0.36, west: -0.22 } },
    { name: 'Bass Pro Shops', pop: 0.88, lean: { south: 0.25, midwest: 0.15, northeast: -0.15 } },
    { name: 'Lululemon', pop: 0.9, lean: { west: 0.16, young: 0.12 } },
  ],
  movie: [
    { name: 'Barbie', pop: 0.96, lean: { young: 0.15 } },
    { name: 'Top Gun: Maverick', pop: 0.96, lean: { south: 0.15, old: 0.1 } },
    { name: 'Oppenheimer', pop: 0.95, lean: { northeast: 0.1, west: 0.1 } },
    { name: 'Everything Everywhere All at Once', pop: 0.88, lean: { west: 0.22, young: 0.2, south: -0.1 } },
    { name: 'Talladega Nights: The Ballad of Ricky Bobby', pop: 0.88, lean: { south: 0.3 } },
    { name: 'Napoleon Dynamite', pop: 0.85, lean: { mountain: 0.36 } },
    { name: 'Step Brothers', pop: 0.9, lean: { young: 0.1 } },
    { name: 'The Notebook', pop: 0.9, lean: { south: 0.12 } },
    { name: 'Dune: Part Two', pop: 0.92, lean: { young: 0.15 } },
  ],
  podcast: [
    { name: 'The Joe Rogan Experience', pop: 0.97, lean: { south: 0.15, young: 0.1, northeast: -0.12 } },
    { name: 'Call Her Daddy', pop: 0.9, lean: { young: 0.32, old: -0.25 } },
    { name: 'SmartLess', pop: 0.88, lean: { west: 0.12 } },
    { name: 'The Daily', pop: 0.9, lean: { northeast: 0.3, south: -0.15 } },
    { name: 'Crime Junkie', pop: 0.9, lean: { midwest: 0.2 } },
  ],
  video_game: [
    { name: 'Fortnite', pop: 0.97, lean: { young: 0.35, old: -0.3 } },
    { name: 'Minecraft', pop: 0.97, lean: { young: 0.25 } },
    { name: 'Call of Duty: Modern Warfare', pop: 0.93, lean: { south: 0.1, midwest: 0.1 } },
    { name: 'Animal Crossing: New Horizons', pop: 0.9, lean: { young: 0.15, west: 0.1 } },
    { name: 'Candy Crush Saga', pop: 0.9, lean: { old: 0.2 } },
  ],
  person: [
    { name: 'Joe Rogan', pop: 0.95, lean: { south: 0.15, northeast: -0.12 } },
    { name: 'Elon Musk', pop: 0.98, lean: { south: 0.08, west: -0.05 } },
    { name: 'Oprah Winfrey', pop: 0.96, lean: { midwest: 0.15, old: 0.15 } },
    { name: 'Kim Kardashian', pop: 0.97, lean: { west: 0.12, young: 0.1 } },
    { name: 'Tom Brady', pop: 0.96, lean: { northeast: 0.32, south: 0.05 } },
    { name: 'Gordon Ramsay', pop: 0.95 },
    { name: 'Matthew McConaughey', pop: 0.94, lean: { south: 0.3 } },
    { name: 'Martha Stewart', pop: 0.92, lean: { old: 0.22, northeast: 0.1 } },
    { name: 'Matthew McConaughey', pop: 0.98, lean: { south: 0.25, mountain: 0.1, northeast: -0.12 } },
    { name: 'Mark Cuban', pop: 0.9, lean: { south: 0.12 } },
    { name: 'Sam Elliott', pop: 0.86, lean: { south: 0.25, mountain: 0.2, old: 0.2 } },
    { name: 'Timothée Chalamet', pop: 0.9, lean: { northeast: 0.2, west: 0.15, young: 0.2, south: -0.15 } },
  ],
}

const PLACES: Record<string, string[]> = {
  nashville: ['Ryman Auditorium', "Hattie B's Hot Chicken", 'The Bluebird Cafe', "Tootsie's Orchid Lounge", 'Broadway'],
  austin: ['Franklin Barbecue', "Torchy's Tacos", 'Barton Springs Pool', 'Rainey Street', 'Zilker Park'],
  'new york': ["Katz's Delicatessen", "Joe's Pizza", 'Central Park', 'Madison Square Garden', 'Bodega on the corner'],
  brooklyn: ["Peter Luger Steak House", 'Prospect Park', 'Smorgasburg', "L&B Spumoni Gardens", 'Barclays Center'],
  chicago: ["Portillo's", "Lou Malnati's Pizzeria", 'Wrigley Field', 'The Bean', 'Navy Pier'],
  'los angeles': ['Grand Central Market', 'Griffith Observatory', 'The Comedy Store', 'Erewhon', 'Venice Beach'],
  'salt lake city': ['Crown Burgers', 'Temple Square', 'Red Iguana', 'Swig', 'Park City'],
  atlanta: ['The Varsity', 'Ponce City Market', 'Mercedes-Benz Stadium', 'Busy Bee Cafe', 'Piedmont Park'],
  denver: ['Red Rocks Amphitheatre', 'Casa Bonita', "Voodoo Doughnut", 'Coors Field', 'Union Station'],
  boston: ['Fenway Park', "Mike's Pastry", 'Faneuil Hall', 'Legal Sea Foods', 'The Freedom Trail'],
}

const REGION_OF: Record<string, Region> = {
  nashville: 'south', austin: 'south', atlanta: 'south', houston: 'south', dallas: 'south', 'new orleans': 'south',
  birmingham: 'south', memphis: 'south', charlotte: 'south', miami: 'south', tampa: 'south',
  'new york': 'northeast', brooklyn: 'northeast', boston: 'northeast', philadelphia: 'northeast', 'washington': 'northeast',
  'los angeles': 'west', 'san francisco': 'west', seattle: 'west', portland: 'west', 'san diego': 'west', 'las vegas': 'west',
  chicago: 'midwest', detroit: 'midwest', minneapolis: 'midwest', cleveland: 'midwest', columbus: 'midwest', 'st. louis': 'midwest',
  denver: 'mountain', 'salt lake city': 'mountain', boise: 'mountain', phoenix: 'mountain',
}

const key = (s: string) => s.toLowerCase().replace(/,.*$/, '').trim()
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

function hash(s: string) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return ((h >>> 0) % 10000) / 10000
}

const clamp = (n: number) => Math.max(0.02, Math.min(0.99, n))

function itemById(id: string): { item: Item; kind: Kind } | null {
  const [, kind, s] = id.split(':')
  const item = CATALOG[kind as Kind]?.find((i) => slug(i.name) === s)
  return item ? { item, kind: kind as Kind } : null
}

function toEntity(item: Item, kind: Kind): QlooEntity {
  return { id: `sample:${kind}:${slug(item.name)}`, name: item.name, kind, popularity: item.pop, image: null, description: null }
}

// Sample strengths live on our 0..1 strength scale; Qloo reports affinity, so convert back (strength = -log10(1 - a) / 5).
const toAffinity = (strength: number) => Math.round((1 - Math.pow(10, -5 * strength)) * 1e6) / 1e6
// Like Qloo, leave out entities a crowd shows no measurable audience for.
const MEASURABLE = 0.3

function score(id: string, crowd: Crowd) {
  const found = itemById(id)
  const lean = found?.item.lean ?? {}
  const region = REGION_OF[key(crowd.city)]
  let a = 0.55 + (hash(id + '|' + key(crowd.city)) - 0.5) * 0.3
  if (region) a += lean[region] ?? 0
  if (crowd.age && ['24_and_younger', '25_to_29'].includes(crowd.age)) a += lean.young ?? 0
  if (crowd.age && ['45_to_54', '55_and_older'].includes(crowd.age)) a += lean.old ?? 0
  return Math.round(clamp(a) * 1000) / 1000
}

function receipt(receipts: Receipt[], label: string, endpoint: string, params: Record<string, string | number | undefined>, n: number) {
  const p: Record<string, string> = {}
  for (const [k, v] of Object.entries(params)) if (v !== undefined) p[k] = String(v)
  receipts.push({ label, endpoint, params: p, ms: 0, source: 'sample', resultCount: n })
}

export function search(name: string, kind: Kind, receipts: Receipt[]): QlooEntity[] {
  const items = CATALOG[kind] ?? []
  const n = name.toLowerCase()
  const match = items.find((i) => i.name.toLowerCase() === n) ?? items.find((i) => i.name.toLowerCase().includes(n) || n.includes(i.name.toLowerCase()))
  const entity = match
    ? toEntity(match, kind)
    : { id: `sample:${kind}:${slug(name)}`, name, kind, popularity: Math.round((0.55 + hash(name) * 0.4) * 100) / 100, image: null, description: null }
  receipt(receipts, `Find "${name}"`, '/search', { query: name, types: `urn:entity:${kind}`, take: 5 }, 1)
  return [entity]
}

export function affinity(kind: Kind, ids: string[], crowd: Crowd, receipts: Receipt[], label?: string) {
  receipt(
    receipts,
    label ?? `Score ${ids.length} ${kind.replace('_', ' ')} reference${ids.length > 1 ? 's' : ''} in ${crowd.city}`,
    '/v2/insights',
    {
      'filter.type': `urn:entity:${kind}`,
      'filter.results.entities': ids.join(','),
      'signal.location.query': crowd.city,
      'signal.demographics.age': crowd.age ?? undefined,
      take: ids.length,
    },
    ids.length,
  )
  return new Map(
    ids.map((id) => {
      const x = score(id, crowd)
      return [id, x < MEASURABLE ? null : toAffinity(x)] as [string, number | null]
    }),
  )
}

export function similar(kind: Kind, id: string, crowd: Crowd, receipts: Receipt[], take: number) {
  const out = (CATALOG[kind] ?? [])
    .map((i) => toEntity(i, kind))
    .filter((e) => e.id !== id && (e.popularity ?? 0) >= 0.75)
    .map((entity) => ({ entity, affinity: toAffinity(score(entity.id, crowd)) as number | null }))
    .sort((a, b) => (b.affinity ?? 0) - (a.affinity ?? 0))
    .slice(0, take)
  receipt(
    receipts,
    `Find ${kind.replace('_', ' ')}s like it that ${crowd.city} loves`,
    '/v2/insights',
    {
      'filter.type': `urn:entity:${kind}`,
      'signal.interests.entities': id,
      'signal.location.query': crowd.city,
      'signal.demographics.age': crowd.age ?? undefined,
      'filter.exclude.entities': id,
      'filter.popularity.min': 0.75,
      take,
    },
    out.length,
  )
  return out
}

export function favorites(kind: Kind, crowd: Crowd, receipts: Receipt[], take: number) {
  let out: { entity: QlooEntity; affinity: number | null }[]
  if (kind === 'place') {
    out = (PLACES[key(crowd.city)] ?? []).slice(0, take).map((name, i) => ({
      entity: { id: `sample:place:${slug(name)}`, name, kind, popularity: 0.9 - i * 0.04, image: null, description: null },
      affinity: toAffinity(0.75 - i * 0.05),
    }))
  } else {
    out = (CATALOG[kind] ?? [])
      .map((i) => ({ entity: toEntity(i, kind), affinity: toAffinity(score(toEntity(i, kind).id, crowd)) as number | null }))
      .sort((a, b) => (b.affinity ?? 0) - (a.affinity ?? 0))
      .slice(0, take)
  }
  receipt(
    receipts,
    `What ${crowd.city} loves: ${kind.replace('_', ' ')}`,
    '/v2/insights',
    kind === 'place'
      ? { 'filter.type': 'urn:entity:place', 'filter.location.query': crowd.city, take }
      : { 'filter.type': `urn:entity:${kind}`, 'signal.location.query': crowd.city, 'filter.popularity.min': 0.6, take },
    out.length,
  )
  return out
}

const TAGS: Record<string, Item[]> = {
  'urn:tag:theme:qloo': [
    { name: 'Dark Comedy', pop: 0.8, lean: { northeast: 0.25, west: 0.15, young: 0.1 } },
    { name: 'Satire', pop: 0.8, lean: { northeast: 0.22, west: 0.18 } },
    { name: 'Western', pop: 0.8, lean: { south: 0.3, mountain: 0.3, northeast: -0.2 } },
    { name: 'Family', pop: 0.8, lean: { mountain: 0.3, south: 0.15, old: 0.1 } },
    { name: 'Reality', pop: 0.8, lean: { south: 0.2, midwest: 0.1 } },
    { name: 'Sitcom', pop: 0.8, lean: { midwest: 0.2 } },
    { name: 'Indie', pop: 0.8, lean: { northeast: 0.25, west: 0.2, south: -0.15 } },
    { name: 'Sports', pop: 0.8, lean: { south: 0.2, midwest: 0.2 } },
    { name: 'Absurdist', pop: 0.8, lean: { northeast: 0.18, young: 0.2 } },
    { name: 'Faith', pop: 0.8, lean: { south: 0.25, mountain: 0.25, northeast: -0.25 } },
    { name: 'Crime', pop: 0.8, lean: { midwest: 0.15 } },
  ],
  'urn:tag:genre:music': [
    { name: 'Country', pop: 0.8, lean: { south: 0.35, mountain: 0.2, northeast: -0.25 } },
    { name: 'Indie Rock', pop: 0.8, lean: { northeast: 0.25, west: 0.2 } },
    { name: 'Hip Hop', pop: 0.8, lean: { south: 0.15, northeast: 0.15, young: 0.2 } },
    { name: 'Classic Rock', pop: 0.8, lean: { midwest: 0.2, old: 0.25 } },
    { name: 'Americana', pop: 0.8, lean: { south: 0.25 } },
    { name: 'Electronic', pop: 0.8, lean: { west: 0.2, young: 0.2 } },
    { name: 'Jazz', pop: 0.8, lean: { northeast: 0.15, south: 0.1, old: 0.15 } },
    { name: 'Pop', pop: 0.8, lean: { young: 0.2 } },
  ],
}

export function tags(tagType: string, crowd: Crowd, receipts: Receipt[], take: number): TasteTag[] {
  const region = REGION_OF[key(crowd.city)]
  const out = (TAGS[tagType] ?? [])
    .map((t) => {
      const id = `sample:tag:${slug(t.name)}`
      let a = 0.55 + (hash(id + key(crowd.city)) - 0.5) * 0.2 + (region ? (t.lean?.[region] ?? 0) : 0)
      if (crowd.age && ['24_and_younger', '25_to_29'].includes(crowd.age)) a += t.lean?.young ?? 0
      if (crowd.age && ['45_to_54', '55_and_older'].includes(crowd.age)) a += t.lean?.old ?? 0
      return { id, name: t.name, affinity: toAffinity(clamp(a)) as number | null }
    })
    .sort((a, b) => (b.affinity ?? 0) - (a.affinity ?? 0))
    .slice(0, take)
  receipt(
    receipts,
    `Taste profile of ${crowd.city}: ${tagType.split(':').slice(-2).join(' ')}`,
    '/v2/insights',
    { 'filter.type': 'urn:tag', 'filter.tag.types': tagType, 'signal.location.query': crowd.city, 'signal.demographics.age': crowd.age ?? undefined, take },
    out.length,
  )
  return out
}
