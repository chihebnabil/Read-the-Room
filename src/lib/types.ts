/** Qloo entity categories a reference in a set can belong to (Insights `filter.type` values). */
export const KINDS = [
  'artist',
  'movie',
  'tv_show',
  'brand',
  'place',
  'person',
  'podcast',
  'video_game',
  'book',
  'destination',
] as const
export type Kind = (typeof KINDS)[number]

export const KIND_LABEL: Record<Kind, string> = {
  artist: 'Music',
  movie: 'Movie',
  tv_show: 'TV',
  brand: 'Brand',
  place: 'Place',
  person: 'Person',
  podcast: 'Podcast',
  video_game: 'Game',
  book: 'Book',
  destination: 'Destination',
}

/** A cultural reference the model found in the set. */
export interface Reference {
  id: string
  /** Exact text as it appears in the line, used for highlighting and swapping. */
  surface: string
  /** Canonical name to look up in Qloo. */
  name: string
  kind: Kind
  line: number
  /** What the joke needs this reference to stand for, e.g. "a cheesy chain restaurant". */
  role: string
}

export interface QlooEntity {
  id: string
  name: string
  kind: Kind
  popularity: number | null
  image: string | null
  description: string | null
}

/** One Qloo request, recorded so every verdict can show where its numbers came from. */
export interface Receipt {
  label: string
  endpoint: string
  params: Record<string, string>
  ms: number
  source: 'live' | 'sample' | 'cache'
  resultCount: number
}

export interface ResolvedReference extends Reference {
  entity: QlooEntity | null
  alternatives: QlooEntity[]
}

export type Verdict = 'kills' | 'risky' | 'dies' | 'unknown'

export interface Score {
  refId: string
  /** Affinity of the entity for tonight's crowd (city, optionally age). 0..1 */
  local: number | null
  /** Same entity, nationwide baseline. 0..1 */
  baseline: number | null
  /** local - baseline */
  lift: number | null
  verdict: Verdict
  why: string
}

export interface SwapCandidate {
  entity: QlooEntity
  local: number | null
  lift: number | null
}

export interface Swap {
  refId: string
  chosen: SwapCandidate | null
  candidates: SwapCandidate[]
  original: string
  rewritten: string
  note: string
}

export interface Guess {
  refId: string
  verdict: Exclude<Verdict, 'unknown'>
  reason: string
}

export interface Room {
  city: string
  age: AgeBand | null
  venue: string
}

export const AGE_BANDS = ['24_and_younger', '25_to_29', '30_to_34', '35_to_44', '45_to_54', '55_and_older'] as const
export type AgeBand = (typeof AGE_BANDS)[number]
export const AGE_LABEL: Record<AgeBand, string> = {
  '24_and_younger': 'Under 25',
  '25_to_29': '25–29',
  '30_to_34': '30–34',
  '35_to_44': '35–44',
  '45_to_54': '45–54',
  '55_and_older': '55+',
}

export interface Favorite {
  entity: QlooEntity
  local: number | null
}

export interface TasteTag {
  id: string
  name: string
  affinity: number | null
}

export interface TasteProfile {
  label: string
  tagType: string
  tags: TasteTag[]
}

export interface CrowdWork {
  favorites: Partial<Record<Kind, Favorite[]>>
  openers: { line: string; uses: string[] }[]
  /** Descriptive tags the crowd over-indexes on (Qloo taste analysis), e.g. film and TV genres. */
  profile: TasteProfile[]
  /** One-line delivery tip grounded in the profile. */
  styleTip: string | null
}

export interface TourCell {
  refId: string
  city: string
  local: number | null
  lift: number | null
  verdict: Verdict
}

export const VERDICT_META: Record<Verdict, { label: string; emoji: string; tone: string }> = {
  kills: { label: 'Kills', emoji: '🔥', tone: 'kills' },
  risky: { label: 'Risky', emoji: '😬', tone: 'risky' },
  dies: { label: 'Dies here', emoji: '💀', tone: 'dies' },
  unknown: { label: 'No data', emoji: '❔', tone: 'unknown' },
}
