import { afterEach, describe, expect, test } from 'bun:test'
import {
  getProviderAdapter,
  getProviderAdapterById,
} from './providerAdapter.js'
import {
  isThirdPartyProvider,
  providerBringsOwnCredentials,
} from '../../utils/model/providers.js'

const PROVIDER_ENV_VARS = [
  'DEEPCLI_USE_BEDROCK',
  'DEEPCLI_USE_VERTEX',
  'DEEPCLI_USE_FOUNDRY',
  'DEEPCLI_USE_OPENAI',
  'DEEPCLI_USE_LOCAL',
]

function clearProviderEnv() {
  for (const v of PROVIDER_ENV_VARS) delete process.env[v]
}

const ORIGINAL_ENV = { ...process.env }
afterEach(() => {
  process.env = { ...ORIGINAL_ENV }
})

describe('provider selection', () => {
  test('defaults to firstParty with no env set', () => {
    clearProviderEnv()
    const a = getProviderAdapter()
    expect(a.id).toBe('firstParty')
    expect(a.isThirdParty).toBe(false)
    expect(a.bringsOwnCredentials).toBe(false)
    expect(a.createFetch()).toBeNull()
    expect(isThirdPartyProvider()).toBe(false)
    expect(providerBringsOwnCredentials()).toBe(false)
  })

  test('DEEPCLI_USE_LOCAL selects the local adapter with a fetch shim', () => {
    clearProviderEnv()
    process.env.DEEPCLI_USE_LOCAL = '1'
    const a = getProviderAdapter()
    expect(a.id).toBe('local')
    expect(a.isThirdParty).toBe(true)
    expect(a.bringsOwnCredentials).toBe(true)
    expect(typeof a.createFetch()).toBe('function')
    expect(isThirdPartyProvider()).toBe(true)
    expect(providerBringsOwnCredentials()).toBe(true)
  })

  test('native-SDK providers expose no fetch adapter', () => {
    clearProviderEnv()
    process.env.DEEPCLI_USE_BEDROCK = '1'
    const a = getProviderAdapter()
    expect(a.id).toBe('bedrock')
    expect(a.createFetch()).toBeNull()
    expect(a.bringsOwnCredentials).toBe(true)
  })

  test('provider precedence: bedrock wins over local', () => {
    clearProviderEnv()
    process.env.DEEPCLI_USE_BEDROCK = '1'
    process.env.DEEPCLI_USE_LOCAL = '1'
    expect(getProviderAdapter().id).toBe('bedrock')
  })
})

describe('registry metadata', () => {
  test('every provider has a non-empty label', () => {
    for (const id of [
      'firstParty',
      'bedrock',
      'vertex',
      'foundry',
      'openai',
      'local',
    ] as const) {
      expect(getProviderAdapterById(id).label.length).toBeGreaterThan(0)
      expect(getProviderAdapterById(id).id).toBe(id)
    }
  })

  test('codex (openai) is third-party but does not bring its own credentials', () => {
    const a = getProviderAdapterById('openai')
    expect(a.isThirdParty).toBe(true)
    expect(a.bringsOwnCredentials).toBe(false)
  })

  test('only firstParty is not third-party', () => {
    for (const id of ['bedrock', 'vertex', 'foundry', 'openai', 'local'] as const) {
      expect(getProviderAdapterById(id).isThirdParty).toBe(true)
    }
    expect(getProviderAdapterById('firstParty').isThirdParty).toBe(false)
  })
})

describe('registry-driven local fetch', () => {
  test('produces a working translating fetch end-to-end', async () => {
    clearProviderEnv()
    const server = Bun.serve({
      port: 0,
      fetch() {
        const enc = new TextEncoder()
        const stream = new ReadableStream({
          start(c) {
            c.enqueue(
              enc.encode(
                `data: ${JSON.stringify({ choices: [{ delta: { content: 'hi' } }] })}\n\n`,
              ),
            )
            c.enqueue(
              enc.encode(
                `data: ${JSON.stringify({ choices: [{ delta: {}, finish_reason: 'stop' }] })}\n\n`,
              ),
            )
            c.enqueue(enc.encode('data: [DONE]\n\n'))
            c.close()
          },
        })
        return new Response(stream, {
          headers: { 'Content-Type': 'text/event-stream' },
        })
      },
    })
    try {
      process.env.DEEPCLI_USE_LOCAL = '1'
      process.env.DEEPCLI_LOCAL_BASE_URL = `http://localhost:${server.port}/v1`
      const fetchImpl = getProviderAdapter().createFetch()
      expect(fetchImpl).not.toBeNull()
      const res = await fetchImpl!('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'nexusai-version': '2023-06-01' },
        body: JSON.stringify({
          model: 'x',
          stream: true,
          messages: [{ role: 'user', content: 'hi' }],
        }),
      })
      const body = await res.text()
      expect(body).toContain('"text":"hi"')
      expect(body).toContain('message_stop')
    } finally {
      server.stop(true)
    }
  })
})
