import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import {
  createLocalFetch,
  getLocalProviderConfig,
} from './local-fetch-adapter.js'

// ── Helpers ─────────────────────────────────────────────────────────

/** Collects an Anthropic SSE response body into parsed event objects. */
async function readAnthropicSSE(res: Response): Promise<Array<Record<string, unknown>>> {
  const text = await res.text()
  return text
    .split('\n\n')
    .filter(Boolean)
    .map(block => {
      const dataLine = block.split('\n').find(l => l.startsWith('data: '))
      return dataLine ? JSON.parse(dataLine.slice(6)) : null
    })
    .filter((e): e is Record<string, unknown> => e !== null)
}

/** Reconstructs assistant output from an Anthropic SSE event list. */
function reconstruct(events: Array<Record<string, unknown>>) {
  let text = ''
  let toolName = ''
  let toolJson = ''
  let stopReason = ''
  let inputTokens = 0
  let outputTokens = 0
  for (const e of events) {
    if (
      e.type === 'content_block_start' &&
      (e.content_block as { type: string }).type === 'tool_use'
    ) {
      toolName = (e.content_block as { name: string }).name
    }
    if (e.type === 'content_block_delta') {
      const delta = e.delta as { type: string; text?: string; partial_json?: string }
      if (delta.type === 'text_delta') text += delta.text ?? ''
      if (delta.type === 'input_json_delta') toolJson += delta.partial_json ?? ''
    }
    if (e.type === 'message_delta') {
      stopReason = (e.delta as { stop_reason: string }).stop_reason
      outputTokens = (e.usage as { output_tokens: number }).output_tokens
    }
    if (e.type === 'message_stop') {
      inputTokens = (e.usage as { input_tokens: number }).input_tokens
    }
  }
  return { text, toolName, toolJson, stopReason, inputTokens, outputTokens }
}

const ORIGINAL_ENV = { ...process.env }
afterEach(() => {
  process.env = { ...ORIGINAL_ENV }
})

// ── Config ──────────────────────────────────────────────────────────

describe('getLocalProviderConfig', () => {
  test('defaults to a local Ollama endpoint', () => {
    delete process.env.CLAUDE_CODE_LOCAL_BASE_URL
    delete process.env.CLAUDE_CODE_LOCAL_API_KEY
    delete process.env.CLAUDE_CODE_LOCAL_MODEL
    const cfg = getLocalProviderConfig()
    expect(cfg.baseURL).toBe('http://localhost:11434/v1')
    expect(cfg.apiKey).toBe('not-needed')
    expect(cfg.model).toBeNull()
  })

  test('honors env overrides and strips trailing slashes', () => {
    process.env.CLAUDE_CODE_LOCAL_BASE_URL = 'http://localhost:1234/v1///'
    process.env.CLAUDE_CODE_LOCAL_API_KEY = 'sk-test'
    process.env.CLAUDE_CODE_LOCAL_MODEL = 'qwen2.5-coder'
    const cfg = getLocalProviderConfig()
    expect(cfg.baseURL).toBe('http://localhost:1234/v1')
    expect(cfg.apiKey).toBe('sk-test')
    expect(cfg.model).toBe('qwen2.5-coder')
  })
})

// ── Streaming translation ───────────────────────────────────────────

describe('createLocalFetch — streaming', () => {
  let server: ReturnType<typeof Bun.serve>
  let lastRequestBody: Record<string, unknown> = {}

  beforeEach(() => {
    server = Bun.serve({
      port: 0,
      async fetch(req) {
        lastRequestBody = await req.json()
        const enc = new TextEncoder()
        const chunks = [
          { choices: [{ delta: { content: 'Hello' } }] },
          { choices: [{ delta: { content: ' world' } }] },
          {
            choices: [
              {
                delta: {
                  tool_calls: [
                    { index: 0, id: 'call_1', function: { name: 'get_weather', arguments: '' } },
                  ],
                },
              },
            ],
          },
          { choices: [{ delta: { tool_calls: [{ index: 0, function: { arguments: '{"city":"' } }] } }] },
          { choices: [{ delta: { tool_calls: [{ index: 0, function: { arguments: 'Paris"}' } }] } }] },
          { choices: [{ delta: {}, finish_reason: 'tool_calls' }] },
          { choices: [], usage: { prompt_tokens: 42, completion_tokens: 9 } },
        ]
        const stream = new ReadableStream({
          start(c) {
            for (const ch of chunks) c.enqueue(enc.encode(`data: ${JSON.stringify(ch)}\n\n`))
            c.enqueue(enc.encode('data: [DONE]\n\n'))
            c.close()
          },
        })
        return new Response(stream, { headers: { 'Content-Type': 'text/event-stream' } })
      },
    })
  })

  afterEach(() => server.stop(true))

  test('translates Anthropic request -> OpenAI chat completions shape', async () => {
    const localFetch = createLocalFetch({
      baseURL: `http://localhost:${server.port}/v1`,
      apiKey: 'not-needed',
      model: 'qwen2.5-coder',
    })
    await localFetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-opus-4-6',
        stream: true,
        max_tokens: 1024,
        system: 'You are helpful.',
        tools: [
          {
            name: 'get_weather',
            description: 'gets weather',
            input_schema: { type: 'object', properties: { city: { type: 'string' } } },
          },
        ],
        messages: [{ role: 'user', content: 'weather in Paris?' }],
      }),
    })

    expect(lastRequestBody.model).toBe('qwen2.5-coder') // config model wins
    expect(lastRequestBody.stream).toBe(true)
    expect(lastRequestBody.max_tokens).toBe(1024)
    const messages = lastRequestBody.messages as Array<Record<string, unknown>>
    expect(messages[0]).toEqual({ role: 'system', content: 'You are helpful.' })
    const tools = lastRequestBody.tools as Array<Record<string, unknown>>
    expect((tools[0] as { type: string }).type).toBe('function')
    expect((tools[0] as { function: { name: string } }).function.name).toBe('get_weather')
  })

  test('translates OpenAI stream -> Anthropic SSE (text, tool call, usage)', async () => {
    const localFetch = createLocalFetch({
      baseURL: `http://localhost:${server.port}/v1`,
      apiKey: 'not-needed',
      model: null,
    })
    const res = await localFetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-opus-4-6',
        stream: true,
        messages: [{ role: 'user', content: 'weather?' }],
      }),
    })
    const events = await readAnthropicSSE(res)
    expect(events[0].type).toBe('message_start')
    expect(events[events.length - 1].type).toBe('message_stop')

    const r = reconstruct(events)
    expect(r.text).toBe('Hello world')
    expect(r.toolName).toBe('get_weather')
    expect(JSON.parse(r.toolJson)).toEqual({ city: 'Paris' })
    expect(r.stopReason).toBe('tool_use')
    expect(r.inputTokens).toBe(42)
    expect(r.outputTokens).toBe(9)
  })
})

// ── Non-streaming translation ───────────────────────────────────────

describe('createLocalFetch — non-streaming', () => {
  test('translates a single OpenAI completion -> Anthropic message JSON', async () => {
    const server = Bun.serve({
      port: 0,
      fetch: () =>
        new Response(
          JSON.stringify({
            id: 'cmpl_1',
            choices: [
              {
                message: {
                  content: 'done',
                  tool_calls: [
                    {
                      id: 'call_9',
                      type: 'function',
                      function: { name: 'do_thing', arguments: '{"x":1}' },
                    },
                  ],
                },
                finish_reason: 'tool_calls',
              },
            ],
            usage: { prompt_tokens: 7, completion_tokens: 3 },
          }),
          { headers: { 'Content-Type': 'application/json' } },
        ),
    })
    try {
      const localFetch = createLocalFetch({
        baseURL: `http://localhost:${server.port}/v1`,
        apiKey: 'not-needed',
        model: 'm',
      })
      const res = await localFetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({
          model: 'claude-opus-4-6',
          stream: false,
          messages: [{ role: 'user', content: 'go' }],
        }),
      })
      const json = (await res.json()) as Record<string, unknown>
      expect(json.type).toBe('message')
      expect(json.role).toBe('assistant')
      expect(json.stop_reason).toBe('tool_use')
      const content = json.content as Array<Record<string, unknown>>
      expect(content[0]).toEqual({ type: 'text', text: 'done' })
      expect(content[1]).toMatchObject({
        type: 'tool_use',
        id: 'call_9',
        name: 'do_thing',
        input: { x: 1 },
      })
      expect(json.usage).toEqual({ input_tokens: 7, output_tokens: 3 })
    } finally {
      server.stop(true)
    }
  })
})

// ── Error handling ──────────────────────────────────────────────────

describe('createLocalFetch — errors', () => {
  test('returns a structured error when the server is unreachable', async () => {
    const localFetch = createLocalFetch({
      // Reserved TEST-NET-1 address; connection refused/unreachable.
      baseURL: 'http://192.0.2.1:9/v1',
      apiKey: 'not-needed',
      model: 'm',
    })
    const res = await localFetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'x', stream: false, messages: [] }),
    })
    expect(res.status).toBe(502)
    const json = (await res.json()) as { type: string; error: { message: string } }
    expect(json.type).toBe('error')
    expect(json.error.message).toContain('unreachable')
  })

  test('passes non-message URLs straight through to global fetch', async () => {
    const server = Bun.serve({
      port: 0,
      fetch: () => new Response('passthrough-ok'),
    })
    try {
      const localFetch = createLocalFetch({
        baseURL: 'http://localhost:11434/v1',
        apiKey: 'not-needed',
        model: 'm',
      })
      const res = await localFetch(`http://localhost:${server.port}/v1/models`)
      expect(await res.text()).toBe('passthrough-ok')
    } finally {
      server.stop(true)
    }
  })
})
