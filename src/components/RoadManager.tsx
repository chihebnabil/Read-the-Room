import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useServerFn } from '@tanstack/react-start'
import { agentTurnFn, type ToolEvent } from '~/server/agent'
import type { ChatMessage } from '~/server/llm'
import type { ReadingState } from '~/lib/useReading'
import { Spinner } from './ui'

type Item =
  | { type: 'user'; text: string }
  | { type: 'assistant'; text: string; thinking: boolean }
  | { type: 'tool'; event: ToolEvent }
  | { type: 'error'; text: string }

const TOOL_LABEL: Record<string, string> = {
  score_references: 'Scored references',
  find_swaps: 'Looked for swaps',
  city_favorites: 'Checked local favorites',
  compare_cities: 'Compared cities',
}

const MAX_TURNS = 6

function argLine(json: string) {
  let args: Record<string, unknown> = {}
  try {
    args = JSON.parse(json)
  } catch {}
  const parts: string[] = []
  if (typeof args.city === 'string') parts.push(args.city)
  if (Array.isArray(args.cities)) parts.push((args.cities as string[]).join(', '))
  const r = args.reference as { name?: string } | undefined
  if (r?.name) parts.push(r.name)
  if (Array.isArray(args.references)) parts.push((args.references as { name: string }[]).map((x) => x.name).join(', '))
  if (typeof args.kind === 'string') parts.push(args.kind.replace('_', ' '))
  if (typeof args.age === 'string') parts.push(args.age.replace(/_/g, ' '))
  return parts.join(' · ')
}

/** Tiny renderer for the model's answers: bullets and **bold** only. */
function Rich({ text }: { text: string }) {
  const inline = (s: string) =>
    s.split(/(\*\*[^*]+\*\*)/g).map((p, i) => (p.startsWith('**') && p.endsWith('**') ? <b key={i} className="text-stage-100">{p.slice(2, -2)}</b> : p))
  const blocks: ReactNode[] = []
  let bullets: string[] = []
  const flush = () => {
    if (bullets.length) blocks.push(<ul key={blocks.length} className="list-disc space-y-1 pl-5">{bullets.map((b, i) => <li key={i}>{inline(b)}</li>)}</ul>)
    bullets = []
  }
  for (const line of text.split('\n')) {
    const m = line.match(/^\s*(?:[-*•]|\d+\.)\s+(.*)/)
    if (m) bullets.push(m[1])
    else {
      flush()
      if (line.trim()) blocks.push(<p key={blocks.length}>{inline(line.replace(/^#+\s*/, ''))}</p>)
    }
  }
  flush()
  return <div className="space-y-2">{blocks}</div>
}

export function RoadManager({ state }: { state: ReadingState }) {
  const turn = useServerFn(agentTurnFn)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const end = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (items.length > 0) end.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [items])

  const weakest = state.refs.find((r) => state.scores[r.id]?.verdict === 'dies')
  const suggestions = [
    `What should I open with tonight in ${state.crowd.city}?`,
    weakest ? `Give me a local replacement for the ${weakest.name} bit.` : `Which of my references is the safest bet here?`,
    `Where should I take this set on tour: ${state.crowd.city}, Austin, Boston or Denver?`,
    `Write me a callback about something ${state.crowd.city} loves.`,
  ]

  async function send(text: string) {
    if (!text.trim() || busy) return
    setInput('')
    setBusy(true)
    let convo: ChatMessage[] = [...messages, { role: 'user', content: text.trim() }]
    setItems((s) => [...s, { type: 'user', text: text.trim() }])
    const context = { city: state.crowd.city, age: state.crowd.age, venue: state.crowd.venue, set: state.lines.join('\n') }
    try {
      for (let i = 0; i < MAX_TURNS; i++) {
        const res = await turn({ data: { messages: convo as never, context, final: i === MAX_TURNS - 1 } })
        convo = [...convo, ...(res.append as ChatMessage[])]
        const first = res.append[0] as ChatMessage
        const said = first.role === 'assistant' && first.content ? first.content.trim() : ''
        setItems((s) => [
          ...s,
          ...(said ? [{ type: 'assistant' as const, text: said, thinking: !res.done }] : []),
          ...res.events.map((event) => ({ type: 'tool' as const, event })),
        ])
        if (res.done) break
      }
    } catch (e) {
      setItems((s) => [...s, { type: 'error', text: (e as Error).message }])
    } finally {
      setMessages(convo)
      setBusy(false)
    }
  }

  return (
    <div className="panel flex min-h-[520px] flex-col p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Road manager</p>
          <p className="mt-1 text-sm text-stage-300">
            An agent that calls Qloo on its own to answer questions about tonight’s room. It knows your set and the crowd.
          </p>
        </div>
      </div>

      <div className="mt-5 flex-1 space-y-3">
        {items.length === 0 && (
          <div className="grid gap-2 sm:grid-cols-2">
            {suggestions.map((s) => (
              <button key={s} onClick={() => send(s)} className="rounded-2xl border border-stage-700 bg-stage-950 p-3 text-left text-sm text-stage-200 transition hover:border-bulb">
                {s}
              </button>
            ))}
          </div>
        )}
        {items.map((it, i) => {
          if (it.type === 'user')
            return (
              <div key={i} className="flex justify-end">
                <p className="max-w-[85%] rounded-2xl rounded-br-md bg-stage-100 px-4 py-2.5 text-sm text-stage-950">{it.text}</p>
              </div>
            )
          if (it.type === 'tool')
            return (
              <details key={i} className="animate-rise rounded-2xl border border-stage-800 bg-stage-950 px-4 py-2.5 text-xs">
                <summary className="cursor-pointer list-none">
                  <span className={it.event.error ? 'text-dies' : 'text-kills'}>{it.event.error ? '✗' : '✓'}</span>{' '}
                  <span className="font-semibold text-stage-200">{TOOL_LABEL[it.event.tool] ?? it.event.tool}</span>{' '}
                  <span className="text-stage-500">· {argLine(it.event.args)}</span>
                  <span className="mt-0.5 block truncate text-stage-400">{it.event.error ?? it.event.summary}</span>
                </summary>
                <div className="mt-2 space-y-1 font-mono text-[11px] text-stage-500">
                  {it.event.receipts.map((r, j) => (
                    <p key={j} className="break-all">
                      <span className={r.source === 'live' ? 'text-kills' : r.source === 'cache' ? 'text-stage-300' : 'text-bulb'}>{r.source.toUpperCase()}</span> {r.endpoint}?
                      {Object.entries(r.params)
                        .map(([k, v]) => `${k}=${v}`)
                        .join('&')}
                    </p>
                  ))}
                </div>
              </details>
            )
          if (it.type === 'error')
            return (
              <p key={i} className="rounded-2xl bg-dies/10 px-4 py-2.5 text-sm text-dies">
                {it.text}
              </p>
            )
          return (
            <div key={i} className={`max-w-[92%] text-sm leading-relaxed ${it.thinking ? 'text-stage-400 italic' : 'text-stage-200'}`}>
              <Rich text={it.text} />
            </div>
          )
        })}
        {busy && (
          <p className="flex items-center gap-2 text-sm text-stage-400">
            <Spinner /> Working the phones with Qloo…
          </p>
        )}
        <div ref={end} />
      </div>

      <form
        className="mt-5 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          send(input)
        }}
      >
        <input value={input} onChange={(e) => setInput(e.target.value)} className="input" placeholder="Ask about tonight’s crowd, a bit, or your tour…" />
        <button className="btn-bulb shrink-0" disabled={busy || !input.trim()}>
          Ask
        </button>
      </form>
    </div>
  )
}
