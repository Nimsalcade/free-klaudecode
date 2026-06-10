import { afterEach, describe, expect, test } from 'bun:test'
import {
  DEEPSEEK_CHAT_MAX_OUTPUT_TOKENS,
  DEEPSEEK_CONTEXT_WINDOW,
  DEEPSEEK_REASONER_MAX_OUTPUT_TOKENS,
  getActiveOpenAICompatConfig,
  getDeepSeekProviderConfig,
  getLocalProviderConfig,
  getOpenAICompatContextWindow,
  getOpenAICompatDefaultModelSetting,
  maxOutputTokensForModel,
} from './openai-compat-config.js'

const PROVIDER_ENV_VARS = [
  'CLAUDE_CODE_USE_BEDROCK',
  'CLAUDE_CODE_USE_VERTEX',
  'CLAUDE_CODE_USE_FOUNDRY',
  'CLAUDE_CODE_USE_OPENAI',
  'CLAUDE_CODE_USE_DEEPSEEK',
  'CLAUDE_CODE_USE_LOCAL',
  'DEEPSEEK_API_KEY',
  'DEEPSEEK_MODEL',
  'DEEPSEEK_BASE_URL',
  'DEEPSEEK_MAX_OUTPUT_TOKENS',
  'DEEPSEEK_CONTEXT_WINDOW',
  'CLAUDE_CODE_LOCAL_MODEL',
  'CLAUDE_CODE_LOCAL_CONTEXT_WINDOW',
]

function clearEnv() {
  for (const v of PROVIDER_ENV_VARS) delete process.env[v]
}

const ORIGINAL_ENV = { ...process.env }
afterEach(() => {
  process.env = { ...ORIGINAL_ENV }
})

describe('getDeepSeekProviderConfig', () => {
  test('defaults to the hosted DeepSeek API with the agentic chat model', () => {
    clearEnv()
    const cfg = getDeepSeekProviderConfig()
    expect(cfg.provider).toBe('deepseek')
    expect(cfg.baseURL).toBe('https://api.deepseek.com/v1')
    expect(cfg.model).toBe('deepseek-chat')
    expect(cfg.apiKey).toBe('')
    expect(cfg.requiresApiKey).toBe(true)
    expect(cfg.nativeModelPrefix).toBe('deepseek')
    expect(cfg.maxOutputTokens).toBeNull()
  })

  test('honors env overrides and strips trailing slashes', () => {
    clearEnv()
    process.env.DEEPSEEK_API_KEY = 'sk-ds-test'
    process.env.DEEPSEEK_MODEL = 'deepseek-reasoner'
    process.env.DEEPSEEK_BASE_URL = 'https://proxy.example.com/v1///'
    process.env.DEEPSEEK_MAX_OUTPUT_TOKENS = '6000'
    const cfg = getDeepSeekProviderConfig()
    expect(cfg.apiKey).toBe('sk-ds-test')
    expect(cfg.model).toBe('deepseek-reasoner')
    expect(cfg.baseURL).toBe('https://proxy.example.com/v1')
    expect(cfg.maxOutputTokens).toBe(6000)
  })

  test('ignores invalid DEEPSEEK_MAX_OUTPUT_TOKENS values', () => {
    clearEnv()
    process.env.DEEPSEEK_MAX_OUTPUT_TOKENS = 'lots'
    expect(getDeepSeekProviderConfig().maxOutputTokens).toBeNull()
  })
})

describe('maxOutputTokensForModel', () => {
  test('applies DeepSeek per-model ceilings by default', () => {
    clearEnv()
    const cfg = getDeepSeekProviderConfig()
    expect(maxOutputTokensForModel(cfg, 'deepseek-chat')).toBe(
      DEEPSEEK_CHAT_MAX_OUTPUT_TOKENS,
    )
    expect(maxOutputTokensForModel(cfg, 'deepseek-reasoner')).toBe(
      DEEPSEEK_REASONER_MAX_OUTPUT_TOKENS,
    )
  })

  test('local provider has no ceiling unless configured', () => {
    clearEnv()
    const cfg = getLocalProviderConfig()
    expect(maxOutputTokensForModel(cfg, 'qwen2.5-coder')).toBeNull()
  })
})

describe('active provider resolution', () => {
  test('returns null when no adapter provider is active', () => {
    clearEnv()
    expect(getActiveOpenAICompatConfig()).toBeNull()
    expect(getOpenAICompatDefaultModelSetting()).toBeNull()
    expect(getOpenAICompatContextWindow()).toBeNull()
  })

  test('CLAUDE_CODE_USE_DEEPSEEK surfaces the DeepSeek model and 128K window', () => {
    clearEnv()
    process.env.CLAUDE_CODE_USE_DEEPSEEK = '1'
    expect(getActiveOpenAICompatConfig()?.provider).toBe('deepseek')
    expect(getOpenAICompatDefaultModelSetting()).toBe('deepseek-chat')
    expect(getOpenAICompatContextWindow()).toBe(DEEPSEEK_CONTEXT_WINDOW)
  })

  test('DEEPSEEK_CONTEXT_WINDOW overrides the published window', () => {
    clearEnv()
    process.env.CLAUDE_CODE_USE_DEEPSEEK = '1'
    process.env.DEEPSEEK_CONTEXT_WINDOW = '256000'
    expect(getOpenAICompatContextWindow()).toBe(256_000)
  })

  test('local provider: model surfaces only when configured, window only when declared', () => {
    clearEnv()
    process.env.CLAUDE_CODE_USE_LOCAL = '1'
    expect(getOpenAICompatDefaultModelSetting()).toBeNull()
    expect(getOpenAICompatContextWindow()).toBeNull()

    process.env.CLAUDE_CODE_LOCAL_MODEL = 'qwen2.5-coder:32b'
    process.env.CLAUDE_CODE_LOCAL_CONTEXT_WINDOW = '32768'
    expect(getOpenAICompatDefaultModelSetting()).toBe('qwen2.5-coder:32b')
    expect(getOpenAICompatContextWindow()).toBe(32_768)
  })
})
