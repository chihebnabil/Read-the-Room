import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import type { Receipt } from '~/lib/types'
import { SPECS, runTool, type ToolName } from '~/server/agent'

/**
 * A stateless MCP server (Streamable HTTP, JSON responses) so any MCP client, such as Claude or Cursor,
 * can use Read the Room's Qloo tools inside an agent it already has. Read-only; the Qloo key stays here.
 */

const PROTOCOL = '2025-06-18'

// Small per-IP budget so a public endpoint cannot drain the Qloo quota.
const hits = new Map<string, number[]>()
function allowed(ip: string) {
  const now = Date.now()
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 10 * 60 * 1000)
  if (recent.length >= 60) return false
  hits.set(ip, [...recent, now])
  return true
}

type RpcRequest = { jsonrpc: '2.0'; id?: string | number | null; method: string; params?: Record<string, unknown> }

const ok = (id: RpcRequest['id'], result: unknown) => ({ jsonrpc: '2.0', id: id ?? null, result })
const fail = (id: RpcRequest['id'], code: number, message: string) => ({ jsonrpc: '2.0', id: id ?? null, error: { code, message } })

function inputSchema(schema: z.ZodType) {
  const { $schema: _, ...rest } = z.toJSONSchema(schema) as Record<string, unknown>
  return rest
}

async function handle(msg: RpcRequest, ip: string) {
  switch (msg.method) {
    case 'initialize':
      return ok(msg.id, {
        protocolVersion: PROTOCOL,
        capabilities: { tools: {} },
        serverInfo: { name: 'read-the-room', version: '1.0.0' },
        instructions:
          'Tools to adapt jokes, speeches and copy to a specific crowd using Qloo taste data. Use score_references to check references for a city, find_swaps to replace weak ones, city_favorites for local material and compare_cities for touring.',
      })
    case 'ping':
      return ok(msg.id, {})
    case 'tools/list':
      return ok(msg.id, {
        tools: SPECS.map((t) => ({ name: t.name, description: t.description, inputSchema: inputSchema(t.parameters), annotations: { readOnlyHint: true } })),
      })
    case 'tools/call': {
      const name = String(msg.params?.name ?? '')
      if (!SPECS.some((t) => t.name === name)) return fail(msg.id, -32602, `Unknown tool: ${name}`)
      if (!allowed(ip)) return ok(msg.id, { isError: true, content: [{ type: 'text', text: 'Rate limit reached. Try again in a few minutes.' }] })
      const receipts: Receipt[] = []
      try {
        const out = await runTool(name as ToolName, msg.params?.arguments ?? {}, receipts)
        return ok(msg.id, {
          content: [{ type: 'text', text: JSON.stringify({ ...((out.result as object) ?? {}), qloo_requests: receipts.map((r) => ({ endpoint: r.endpoint, params: r.params, source: r.source })) }) }],
        })
      } catch (e) {
        const text = e instanceof z.ZodError ? `Invalid arguments: ${e.issues.map((i) => `${i.path.join('.')} ${i.message}`).join('; ')}` : (e as Error).message
        return ok(msg.id, { isError: true, content: [{ type: 'text', text }] })
      }
    }
    default:
      return fail(msg.id, -32601, `Method not found: ${msg.method}`)
  }
}

export const Route = createFileRoute('/api/mcp')({
  server: {
    handlers: {
      GET: async () =>
        new Response(JSON.stringify({ name: 'read-the-room', transport: 'streamable-http', tools: SPECS.map((t) => t.name) }), {
          headers: { 'content-type': 'application/json' },
        }),
      POST: async ({ request }) => {
        const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local'
        let body: RpcRequest | RpcRequest[]
        try {
          body = await request.json()
        } catch {
          return Response.json(fail(null, -32700, 'Parse error'), { status: 400 })
        }
        const batch = Array.isArray(body) ? body : [body]
        const responses = []
        for (const m of batch.slice(0, 10)) {
          // Notifications (no id) get no response.
          if (m.id === undefined) continue
          responses.push(await handle(m, ip))
        }
        if (responses.length === 0) return new Response(null, { status: 202 })
        return Response.json(Array.isArray(body) ? responses : responses[0], { headers: { 'MCP-Protocol-Version': PROTOCOL } })
      },
    },
  },
})
