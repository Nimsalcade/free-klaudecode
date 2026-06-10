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
  let thinking = ''
  let toolName = ''
  let toolJson = ''
  let stopReason = ''
  let inputTokens = 0
  let outputTokens = 0
  let cacheReadTokens = 0
  for (const e of events) {
    if (
      e.type === 'content_block_start' &&
      (e.content_block as { type: string }).type === 'tool_use'
    ) {
      toolName = (e.content_block as { name: string }).name
    }
    if (e.type === 'content_block_delta') {
      const delta = e.delta as {
        type: string
        text?: string
        thinking?: string
        partial_json?: string
      }
      if (delta.type === 'text_delta') text += delta.text ?? ''
      if (delta.type === 'thinking_delta') thinking += delta.thinking ?? ''
      if (delta.type === 'input_json_delta') toolJson += delta.partial_json ?? ''
    }
    if (e.type === 'message_delta') {
      stopReason = (e.delta as { stop_reason: string }).stop_reason
      outputTokens = (e.usage as { output_tokens: number }).output_tokens
    }
    if (e.type === 'message_stop') {
      const usage = e.usage as {
        input_tokens: number
        cache_read_input_tokens?: number
      }
      inputTokens = usage.input_tokens
      cacheReadTokens = usage.cache_read_input_tokens ?? 0
    }
  }
  return {
    text,
    thinking,
    toolName,
    toolJson,
    stopReason,
    inputTokens,
    outputTokens,
    cacheReadTokens,
  }
}

/** Serves a fixed list of OpenAI-style SSE chunks, recording request bodies. */
function serveSSE(chunks: Array<Record<string, unknown>>): {
  server: ReturnType<typeof Bun.serve>
  getLastRequestBody: () => Record<string, unknown>
} {
  let lastRequestBody: Record<string, unknown> = {}
  const server = Bun.serve({
    port: 0,
    async fetch(req) {
      lastRequestBody = await req.json()
      const enc = new TextEncoder()
      const stream = new ReadableStream({
        start(c) {
          for (const ch of chunks) {
            c.enqueue(enc.encode(`data: ${JSON.stringify(ch)}\n\n`))
          }
          c.enqueue(enc.encode('data: [DONE]\n\n'))
          c.close()
        },
      })
      return new Response(stream, {
        headers: { 'Content-Type': 'text/event-stream' },
      })
    },
  })
  return { server, getLastRequestBody: () => lastRequestBody }
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
      expect(json.usage).toEqual({
        input_tokens: 7,
        output_tokens: 3,
        cache_read_input_tokens: 0,
        cache_creation_input_tokens: 0,
      })
    } finally {
      server.stop(true)
    }
  })
})

// ── Error handling ──────────────────────────────────────────────────

describe('createLocalFetch — errors', () => {
  test('returns a structured error when the server is unreachable', async () => {
    // A closed loopback port refuses instantly (kernel RST) — unlike
    // TEST-NET-1 addresses, which some CI networks silently drop, leaving
    // fetch hanging in SYN retries until the test times out.
    const closedPortServer = Bun.serve({ port: 0, fetch: () => new Response('') })
    const closedPort = closedPortServer.port
    closedPortServer.stop(true)
    const localFetch = createLocalFetch({
      baseURL: `http://127.0.0.1:${closedPort}/v1`,
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

  test('translates upstream error bodies and preserves status + retry-after', async () => {
    const server = Bun.serve({
      port: 0,
      fetch: () =>
        new Response(
          JSON.stringify({
            error: { message: 'rate limited, slow down', type: 'rate_limit' },
          }),
          { status: 429, headers: { 'retry-after': '7' } },
        ),
    })
    try {
      const localFetch = createLocalFetch({
        baseURL: `http://localhost:${server.port}/v1`,
        apiKey: 'k',
        model: 'm',
        label: 'DeepSeek API',
      })
      const res = await localFetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        body: JSON.stringify({ model: 'x', stream: false, messages: [] }),
      })
      expect(res.status).toBe(429)
      expect(res.headers.get('retry-after')).toBe('7')
      const json = (await res.json()) as {
        error: { type: string; message: string }
      }
      expect(json.error.type).toBe('rate_limit_error')
      expect(json.error.message).toContain('DeepSeek API')
      expect(json.error.message).toContain('rate limited, slow down')
    } finally {
      server.stop(true)
    }
  })

  test('fails fast with a 401 setup hint when a required API key is missing', async () => {
    const localFetch = createLocalFetch({
      baseURL: 'https://api.deepseek.com/v1',
      apiKey: '',
      model: 'deepseek-chat',
      label: 'DeepSeek API',
      requiresApiKey: true,
      setupHint: 'Set DEEPSEEK_API_KEY.',
    })
    const res = await localFetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      body: JSON.stringify({ model: 'x', stream: true, messages: [] }),
    })
    expect(res.status).toBe(401)
    const json = (await res.json()) as {
      error: { type: string; message: string }
    }
    expect(json.error.type).toBe('authentication_error')
    expect(json.error.message).toContain('Set DEEPSEEK_API_KEY.')
  })
})

// ── count_tokens handling ───────────────────────────────────────────

describe('createLocalFetch — count_tokens', () => {
  test('answers locally without forwarding a generation to the server', async () => {
    let serverHit = false
    const server = Bun.serve({
      port: 0,
      fetch: () => {
        serverHit = true
        return new Response('should never be called', { status: 500 })
      },
    })
    try {
      const localFetch = createLocalFetch({
        baseURL: `http://localhost:${server.port}/v1`,
        apiKey: 'not-needed',
        model: 'm',
      })
      const res = await localFetch(
        'https://api.anthropic.com/v1/messages/count_tokens?beta=true',
        {
          method: 'POST',
          body: JSON.stringify({
            model: 'claude-opus-4-6',
            messages: [{ role: 'user', content: 'a'.repeat(400) }],
          }),
        },
      )
      expect(res.status).toBe(200)
      const json = (await res.json()) as { input_tokens: number }
      expect(json.input_tokens).toBeGreaterThan(50)
      expect(serverHit).toBe(false)
    } finally {
      server.stop(true)
    }
  })
})

// ── Reasoning models (deepseek-reasoner, R1-style) ──────────────────

describe('createLocalFetch — reasoning translation', () => {
  test('streams reasoning_content as a thinking block that closes before text', async () => {
    const { server } = serveSSE([
      { choices: [{ delta: { reasoning_content: 'Let me think' } }] },
      { choices: [{ delta: { reasoning_content: ' about this.' } }] },
      { choices: [{ delta: { content: 'The answer' } }] },
      { choices: [{ delta: { content: ' is 4.' } }] },
      { choices: [{ delta: {}, finish_reason: 'stop' }] },
      { choices: [], usage: { prompt_tokens: 10, completion_tokens: 8 } },
    ])
    try {
      const localFetch = createLocalFetch({
        baseURL: `http://localhost:${server.port}/v1`,
        apiKey: 'k',
        model: 'deepseek-reasoner',
      })
      const res = await localFetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        body: JSON.stringify({
          model: 'claude-opus-4-6',
          stream: true,
          messages: [{ role: 'user', content: '2+2?' }],
        }),
      })
      const events = await readAnthropicSSE(res)
      const r = reconstruct(events)
      expect(r.thinking).toBe('Let me think about this.')
      expect(r.text).toBe('The answer is 4.')
      expect(r.stopReason).toBe('end_turn')

      // The thinking block must be fully closed before the text block opens.
      const types = events
        .filter(e => e.type === 'content_block_start' || e.type === 'content_block_stop')
        .map(e => {
          if (e.type === 'content_block_start') {
            return `start:${(e.content_block as { type: string }).type}`
          }
          return `stop:${e.index}`
        })
      expect(types).toEqual(['start:thinking', 'stop:0', 'start:text', 'stop:1'])
    } finally {
      server.stop(true)
    }
  })

  test('maps non-streaming reasoning_content to a leading thinking block', async () => {
    const server = Bun.serve({
      port: 0,
      fetch: () =>
        new Response(
          JSON.stringify({
            id: 'cmpl_r1',
            choices: [
              {
                message: {
                  reasoning_content: 'pondering deeply',
                  content: 'the answer',
                },
                finish_reason: 'stop',
              },
            ],
            usage: { prompt_tokens: 5, completion_tokens: 2 },
          }),
          { headers: { 'Content-Type': 'application/json' } },
        ),
    })
    try {
      const localFetch = createLocalFetch({
        baseURL: `http://localhost:${server.port}/v1`,
        apiKey: 'k',
        model: 'deepseek-reasoner',
      })
      const res = await localFetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        body: JSON.stringify({ model: 'x', stream: false, messages: [] }),
      })
      const json = (await res.json()) as { content: Array<Record<string, unknown>> }
      expect(json.content[0]).toMatchObject({
        type: 'thinking',
        thinking: 'pondering deeply',
      })
      expect(json.content[1]).toEqual({ type: 'text', text: 'the answer' })
    } finally {
      server.stop(true)
    }
  })
})

// ── Cache-aware usage accounting ────────────────────────────────────

describe('createLocalFetch — usage translation', () => {
  test('maps DeepSeek prompt_cache_hit_tokens to cache_read_input_tokens', async () => {
    const { server } = serveSSE([
      { choices: [{ delta: { content: 'ok' } }] },
      { choices: [{ delta: {}, finish_reason: 'stop' }] },
      {
        choices: [],
        usage: {
          prompt_tokens: 100,
          completion_tokens: 5,
          prompt_cache_hit_tokens: 80,
          prompt_cache_miss_tokens: 20,
        },
      },
    ])
    try {
      const localFetch = createLocalFetch({
        baseURL: `http://localhost:${server.port}/v1`,
        apiKey: 'k',
        model: 'deepseek-chat',
      })
      const res = await localFetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        body: JSON.stringify({ model: 'x', stream: true, messages: [] }),
      })
      const r = reconstruct(await readAnthropicSSE(res))
      // Anthropic semantics: input_tokens excludes cache reads.
      expect(r.inputTokens).toBe(20)
      expect(r.cacheReadTokens).toBe(80)
      expect(r.outputTokens).toBe(5)
    } finally {
      server.stop(true)
    }
  })

  test('maps OpenAI prompt_tokens_details.cached_tokens to cache_read_input_tokens', async () => {
    const { server } = serveSSE([
      { choices: [{ delta: { content: 'ok' } }] },
      { choices: [{ delta: {}, finish_reason: 'stop' }] },
      {
        choices: [],
        usage: {
          prompt_tokens: 50,
          completion_tokens: 3,
          prompt_tokens_details: { cached_tokens: 30 },
        },
      },
    ])
    try {
      const localFetch = createLocalFetch({
        baseURL: `http://localhost:${server.port}/v1`,
        apiKey: 'k',
        model: 'm',
      })
      const res = await localFetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        body: JSON.stringify({ model: 'x', stream: true, messages: [] }),
      })
      const r = reconstruct(await readAnthropicSSE(res))
      expect(r.inputTokens).toBe(20)
      expect(r.cacheReadTokens).toBe(30)
    } finally {
      server.stop(true)
    }
  })
})

// ── DeepSeek-specific request shaping ───────────────────────────────

describe('createLocalFetch — DeepSeek request shaping', () => {
  test('clamps max_tokens to the per-model ceiling (harness default 32k -> 8k)', async () => {
    const { server, getLastRequestBody } = serveSSE([
      { choices: [{ delta: { content: 'ok' } }, ] },
      { choices: [{ delta: {}, finish_reason: 'stop' }] },
    ])
    try {
      const localFetch = createLocalFetch({
        provider: 'deepseek',
        baseURL: `http://localhost:${server.port}/v1`,
        apiKey: 'k',
        model: 'deepseek-chat',
        nativeModelPrefix: 'deepseek',
      })
      await localFetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        body: JSON.stringify({
          model: 'claude-opus-4-6',
          stream: true,
          max_tokens: 32_000,
          messages: [{ role: 'user', content: 'hi' }],
        }),
      })
      expect(getLastRequestBody().max_tokens).toBe(8_192)
      expect(getLastRequestBody().model).toBe('deepseek-chat')
    } finally {
      server.stop(true)
    }
  })

  test('explicit maxOutputTokens config overrides the per-model default', async () => {
    const { server, getLastRequestBody } = serveSSE([
      { choices: [{ delta: {}, finish_reason: 'stop' }] },
    ])
    try {
      const localFetch = createLocalFetch({
        provider: 'deepseek',
        baseURL: `http://localhost:${server.port}/v1`,
        apiKey: 'k',
        model: 'deepseek-chat',
        maxOutputTokens: 4_000,
      })
      await localFetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        body: JSON.stringify({
          model: 'x',
          stream: true,
          max_tokens: 32_000,
          messages: [],
        }),
      })
      expect(getLastRequestBody().max_tokens).toBe(4_000)
    } finally {
      server.stop(true)
    }
  })

  test('provider-native request models pass through instead of being overridden', async () => {
    const { server, getLastRequestBody } = serveSSE([
      { choices: [{ delta: {}, finish_reason: 'stop' }] },
    ])
    try {
      const localFetch = createLocalFetch({
        provider: 'deepseek',
        baseURL: `http://localhost:${server.port}/v1`,
        apiKey: 'k',
        model: 'deepseek-chat',
        nativeModelPrefix: 'deepseek',
      })
      // /model deepseek-reasoner mid-session: passes through...
      await localFetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        body: JSON.stringify({
          model: 'deepseek-reasoner',
          stream: true,
          max_tokens: 100_000,
          messages: [],
        }),
      })
      expect(getLastRequestBody().model).toBe('deepseek-reasoner')
      // ...and gets the reasoner's (higher) max_tokens ceiling.
      expect(getLastRequestBody().max_tokens).toBe(65_536)

      // claude-* ids (background haiku tasks etc.) map to the configured model.
      await localFetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        body: JSON.stringify({
          model: 'claude-haiku-4-5',
          stream: true,
          max_tokens: 512,
          messages: [],
        }),
      })
      expect(getLastRequestBody().model).toBe('deepseek-chat')
      expect(getLastRequestBody().max_tokens).toBe(512)
    } finally {
      server.stop(true)
    }
  })
})
