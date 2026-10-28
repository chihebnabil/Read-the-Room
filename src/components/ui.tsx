import { KIND_LABEL, VERDICT_META, type Kind, type Verdict } from '~/lib/types'

export const pct = (n: number | null | undefined) => (n === null || n === undefined ? '–' : `${Math.round(n * 100)}`)
export const ordinal = (n: number) => {
  const r = Math.round(n)
  const s = r % 100 >= 11 && r % 100 <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[r % 10] ?? 'th'
  return `${r}${s}`
}
export const signed = (n: number | null | undefined) =>
  n === null || n === undefined ? '–' : `${n >= 0 ? '+' : '−'}${Math.abs(Math.round(n * 100))}`

const TONE: Record<Verdict, string> = {
  kills: 'border-kills/40 bg-kills/10 text-kills',
  risky: 'border-risky/40 bg-risky/10 text-risky',
  dies: 'border-dies/40 bg-dies/10 text-dies',
  unknown: 'border-stage-600 bg-stage-800 text-stage-300',
}

export function VerdictBadge({ verdict, size = 'sm' }: { verdict: Verdict; size?: 'sm' | 'lg' }) {
  const m = VERDICT_META[verdict]
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border font-bold ${TONE[verdict]} ${
        size === 'lg' ? 'px-3 py-1.5 text-sm' : 'px-2 py-0.5 text-xs'
      }`}
    >
      <span aria-hidden>{m.emoji}</span>
      {m.label}
    </span>
  )
}

export function KindTag({ kind }: { kind: Kind }) {
  return (
    <span className="rounded-md bg-stage-800 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-stage-400">
      {KIND_LABEL[kind]}
    </span>
  )
}

const BAR_TONE = { kills: 'bg-kills', risky: 'bg-risky', dies: 'bg-dies', muted: 'bg-stage-500' }

export function Bar({ value, label, tone }: { value: number | null; label: string; tone: keyof typeof BAR_TONE }) {
  return (
    <div>
      <div className="flex items-baseline justify-between text-xs">
        <span className="font-semibold text-stage-300">{label}</span>
        <span className="font-mono text-stage-100">{pct(value)}<span className="text-stage-500">/100</span></span>
      </div>
      <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-stage-800">
        <div
          className={`h-full rounded-full transition-all duration-700 ${BAR_TONE[tone]}`}
          style={{ width: `${value === null ? 0 : Math.max(2, value * 100)}%` }}
        />
      </div>
    </div>
  )
}

export function Gauge({ value, label, dim }: { value: number | null; label: string; dim?: boolean }) {
  const v = value ?? 0
  const r = 52
  const c = Math.PI * r
  const color = v >= 70 ? 'var(--color-kills)' : v >= 45 ? 'var(--color-risky)' : 'var(--color-dies)'
  return (
    <div className={`flex flex-col items-center ${dim ? 'opacity-60' : ''}`}>
      <svg viewBox="0 0 128 72" className="w-36">
        <path d="M12 66 A52 52 0 0 1 116 66" fill="none" stroke="var(--color-stage-800)" strokeWidth="12" strokeLinecap="round" />
        <path
          d="M12 66 A52 52 0 0 1 116 66"
          fill="none"
          stroke={value === null ? 'transparent' : color}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (c * v) / 100}
          style={{ transition: 'stroke-dashoffset 1s ease-out' }}
        />
        <text x="64" y="62" textAnchor="middle" className="display" fontSize="30" fill="var(--color-stage-100)">
          {value === null ? '–' : value}
        </text>
      </svg>
      <p className="eyebrow -mt-1">{label}</p>
    </div>
  )
}

export function Spinner() {
  return <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-bulb border-t-transparent" />
}
