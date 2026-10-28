import { z } from 'zod'

// Minimal OpenRouter client: JSON-schema structured output and a tool-calling turn.
// https://openrouter.ai/docs/api-reference/chat-completion

const ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions'

export const model = () => process.env.OPENROUTER_MODEL || 'deepseek/deepseek-v4.1-flash-1017'

export type ChatMessage =
  | { role: 'system' | 'user'; content: string }
  | { role: 'assistant'; content: string | null; tool_calls?: ToolCall[] }
  | { role: 'tool'; tool_call_id: string; content: string }

export interface ToolCall {
  id: string
  type: 'function'
  function: { name: string; arguments: string }
}

export interface ToolSpec {
  name: string
  description: string
  parameters: z.ZodType
}

/** Strict JSON schema mode needs every object closed and every property required. */
function strictSchema(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(strictSchema)
  if (!node || typeof node !== 'object') return node
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(node)) {
    if (k === '$schema') continue
    out[k] = strictSchema(v)
  }
  if (out.type === 'object' && out.properties) {
    out.additionalProperties = false
    out.required = Object.keys(out.properties as object)
  }
  return out
}

export class AIError extends Error {}

type Body = {
  model?: string
  error?: { message?: string }
  choices?: {
    finish_reason?: string
    message?: { content?: string | null; refusal?: string | null; tool_calls?: ToolCall[] }
  }[]
}

async function post(payload: Record<string, unknown>, timeoutMs = 90_000): Promise<Body> {
  const key = process.env.OPENROUTER_API_KEY
  if (!key) throw new AIError('OPENROUTER_API_KEY is not set.')
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.APP_URL || 'http://localhost:3000',
      'X-Title': 'Read the Room',
    },
    body: JSON.stringify({ model: model(), ...payload }),
    signal: AbortSignal.timeout(timeoutMs),
  }).catch((e) => {
    throw new AIError(`OpenRouter request failed: ${(e as Error).message}`)
  })
  const body = (await res.json().catch(() => null)) as Body | null
  if (!res.ok || !body || body.error) {
    throw new AIError(`OpenRouter error (${res.status}): ${body?.error?.message ?? res.statusText}`)
  }
  return body
}

export async function structuredChat<T extends z.ZodType>(opts: {
  name: string
  schema: T
  messages: ChatMessage[]
  maxTokens?: number
  timeoutMs?: number
  /** Short, well-specified tasks run without reasoning; it adds seconds without better output. */
  reasoning?: 'off' | 'low'
}): Promise<z.infer<T>> {
  const body = await post({
    messages: opts.messages,
    max_tokens: opts.maxTokens ?? 6000,
    response_format: {
      type: 'json_schema',
      json_schema: { name: opts.name, strict: true, schema: strictSchema(z.toJSONSchema(opts.schema)) },
    },
    // Only route to providers that honor the JSON schema.
    provider: { require_parameters: true },
    reasoning: opts.reasoning === 'low' ? { effort: 'low' } : { enabled: false },
  }, opts.timeoutMs)
  const choice = body.choices?.[0]
  if (choice?.message?.refusal) throw new AIError('The model declined this request.')
  const text = choice?.message?.content
  if (!text) throw new AIError('The model returned an empty response.')

  // Some providers wrap JSON in a code fence despite the schema.
  const json = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```$/, '')
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    throw new AIError('The model returned invalid JSON.')
  }
  const result = opts.schema.safeParse(parsed)
  if (!result.success) throw new AIError('The model response did not match the expected format.')
  return result.data
}

/** One model turn that may request tool calls. */
export async function toolTurn(messages: ChatMessage[], tools: ToolSpec[]) {
  const body = await post({
    messages,
    max_tokens: 3000,
    ...(tools.length > 0
      ? {
          tools: tools.map((t) => ({
            type: 'function',
            function: { name: t.name, description: t.description, parameters: strictSchema(z.toJSONSchema(t.parameters)) },
          })),
          tool_choice: 'auto',
          provider: { require_parameters: true },
        }
      : {}),
  })
  const msg = body.choices?.[0]?.message
  return { content: msg?.content ?? null, toolCalls: msg?.tool_calls ?? [] }
}
