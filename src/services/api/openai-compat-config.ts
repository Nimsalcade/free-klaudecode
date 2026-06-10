/**
 * Configuration for the OpenAI-compatible adapter providers.
 *
 * Two providers route through the /chat/completions fetch adapter
 * (src/services/api/local-fetch-adapter.ts):
 *
 *   'deepseek'  DeepSeek's hosted API (https://api.deepseek.com). First-class
 *               preset: agentic default model, output-token ceilings, and the
 *               published 128K context window are wired in.
 *   'local'     Any OpenAI-compatible endpoint the user points at (Ollama,
 *               vLLM, LM Studio, llama.cpp, OpenRouter, Groq, Together, ...).
 *
 * This module is kept dependency-light (no fs, no logging) so low-level model
 * and context modules can read provider configuration without importing the
 * adapter's transport machinery.
 */

import { getAPIProvider } from '../../utils/model/providers.js'

export interface OpenAICompatProviderConfig {
  /** Which adapter-backed provider this config belongs to. */
  provider: 'local' | 'deepseek'
  /** Human-readable label used in error messages. */
  label: string
  /** OpenAI-compatible base URL (no trailing slash). */
  baseURL: string
  /** Bearer token. May be empty for keyless local servers. */
  apiKey: string
  /**
   * Default model sent upstream. Requests for models that are not native to
   * this provider (e.g. claude-* ids from the harness) are rewritten to this.
   */
  model: string | null
  /**
   * Request models with this prefix pass through unchanged, so /model can
   * switch between provider-native models (deepseek-chat <-> deepseek-reasoner)
   * at runtime without touching the environment.
   */
  nativeModelPrefix: string | null
  /**
   * Explicit ceiling for max_tokens, from the environment. Hosted APIs reject
   * out-of-range values (DeepSeek 400s above its per-model maximum) while the
   * harness defaults to 32K, so requests are clamped. null = use the
   * per-provider default (see maxOutputTokensForModel), which for 'local' is
   * no clamping at all.
   */
  maxOutputTokens: number | null
  /** Fail completion requests fast with a setup hint when no API key is set. */
  requiresApiKey: boolean
  /** Actionable guidance appended to configuration/transport errors. */
  setupHint: string
}

// ── DeepSeek defaults ───────────────────────────────────────────────
// `deepseek-chat` and `deepseek-reasoner` are DeepSeek's stable aliases that
// always track the latest model generation (non-thinking and thinking mode
// respectively), so defaults stay current without code changes.

export const DEEPSEEK_DEFAULT_BASE_URL = 'https://api.deepseek.com/v1'
export const DEEPSEEK_DEFAULT_MODEL = 'deepseek-chat'

/**
 * Published max-output ceilings. DeepSeek rejects max_tokens above these, so
 * the adapter clamps requests down to them. Override with
 * DEEPSEEK_MAX_OUTPUT_TOKENS if the published limits change.
 */
export const DEEPSEEK_CHAT_MAX_OUTPUT_TOKENS = 8_192
export const DEEPSEEK_REASONER_MAX_OUTPUT_TOKENS = 65_536

/** Published context window for current DeepSeek models. */
export const DEEPSEEK_CONTEXT_WINDOW = 128_000

function parsePositiveInt(value: string | undefined): number | null {
  if (!value) return null
  const n = parseInt(value, 10)
  return Number.isFinite(n) && n > 0 ? n : null
}

/**
 * Reads the local provider configuration from the environment.
 * Defaults to a local Ollama instance, which is the most common setup.
 */
export function getLocalProviderConfig(): OpenAICompatProviderConfig {
  const baseURL = (
    process.env.CLAUDE_CODE_LOCAL_BASE_URL || 'http://localhost:11434/v1'
  ).replace(/\/+$/, '')
  const apiKey = process.env.CLAUDE_CODE_LOCAL_API_KEY || 'not-needed'
  const model = process.env.CLAUDE_CODE_LOCAL_MODEL || null
  return {
    provider: 'local',
    label: 'Local model server',
    baseURL,
    apiKey,
    model,
    nativeModelPrefix: null,
    maxOutputTokens: parsePositiveInt(
      process.env.CLAUDE_CODE_LOCAL_MAX_OUTPUT_TOKENS,
    ),
    requiresApiKey: false,
    setupHint:
      'Is it running? Set CLAUDE_CODE_LOCAL_BASE_URL to point at your server.',
  }
}

/** Reads the DeepSeek provider configuration from the environment. */
export function getDeepSeekProviderConfig(): OpenAICompatProviderConfig {
  const baseURL = (
    process.env.DEEPSEEK_BASE_URL || DEEPSEEK_DEFAULT_BASE_URL
  ).replace(/\/+$/, '')
  const model = process.env.DEEPSEEK_MODEL || DEEPSEEK_DEFAULT_MODEL
  return {
    provider: 'deepseek',
    label: 'DeepSeek API',
    baseURL,
    apiKey: process.env.DEEPSEEK_API_KEY || '',
    model,
    nativeModelPrefix: 'deepseek',
    maxOutputTokens: parsePositiveInt(process.env.DEEPSEEK_MAX_OUTPUT_TOKENS),
    requiresApiKey: true,
    setupHint:
      'Set DEEPSEEK_API_KEY (create one at https://platform.deepseek.com/api_keys). ' +
      'DEEPSEEK_MODEL and DEEPSEEK_BASE_URL override the defaults.',
  }
}

/**
 * The effective max_tokens ceiling for a request. Explicit env config wins;
 * otherwise DeepSeek gets its per-model published limit and local servers get
 * no clamping.
 */
export function maxOutputTokensForModel(
  config: OpenAICompatProviderConfig,
  model: string,
): number | null {
  if (config.maxOutputTokens !== null) return config.maxOutputTokens
  if (config.provider === 'deepseek') {
    return model.includes('reasoner')
      ? DEEPSEEK_REASONER_MAX_OUTPUT_TOKENS
      : DEEPSEEK_CHAT_MAX_OUTPUT_TOKENS
  }
  return null
}

/** Config for the currently-selected provider, or null when the active provider doesn't use the adapter. */
export function getActiveOpenAICompatConfig(): OpenAICompatProviderConfig | null {
  switch (getAPIProvider()) {
    case 'deepseek':
      return getDeepSeekProviderConfig()
    case 'local':
      return getLocalProviderConfig()
    default:
      return null
  }
}

/**
 * The model identity to surface as the session default when an adapter-backed
 * provider is active. The adapter rewrites outbound models anyway; this keeps
 * the UI honest (header shows "DeepSeek Chat", not a Claude id that is never
 * actually called).
 */
export function getOpenAICompatDefaultModelSetting(): string | null {
  return getActiveOpenAICompatConfig()?.model ?? null
}

/**
 * Context window of the model actually being served, when known. DeepSeek's
 * window is 128K — smaller than the 200K Claude default — so auto-compact must
 * trigger earlier than usual or long sessions start failing upstream.
 *
 * Overrides: DEEPSEEK_CONTEXT_WINDOW / CLAUDE_CODE_LOCAL_CONTEXT_WINDOW.
 * For 'local' there is no safe assumption about the served model, so without
 * an explicit override this returns null (callers keep their default).
 */
export function getOpenAICompatContextWindow(): number | null {
  const config = getActiveOpenAICompatConfig()
  if (!config) return null
  if (config.provider === 'deepseek') {
    return (
      parsePositiveInt(process.env.DEEPSEEK_CONTEXT_WINDOW) ??
      DEEPSEEK_CONTEXT_WINDOW
    )
  }
  return parsePositiveInt(process.env.CLAUDE_CODE_LOCAL_CONTEXT_WINDOW)
}
