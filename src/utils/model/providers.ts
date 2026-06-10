import type { AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from '../../services/analytics/index.js'
import { isEnvTruthy } from '../envUtils.js'

export type APIProvider =
  | 'firstParty'
  | 'bedrock'
  | 'vertex'
  | 'foundry'
  | 'openai'
  | 'deepseek'
  | 'local'

export function getAPIProvider(): APIProvider {
  return isEnvTruthy(process.env.CLAUDE_CODE_USE_BEDROCK)
    ? 'bedrock'
    : isEnvTruthy(process.env.CLAUDE_CODE_USE_VERTEX)
      ? 'vertex'
      : isEnvTruthy(process.env.CLAUDE_CODE_USE_FOUNDRY)
        ? 'foundry'
        : isEnvTruthy(process.env.CLAUDE_CODE_USE_OPENAI)
          ? 'openai'
          : // DeepSeek's hosted API (OpenAI-compatible transport with
            // first-class defaults: model, token ceilings, context window).
            isEnvTruthy(process.env.CLAUDE_CODE_USE_DEEPSEEK)
            ? 'deepseek'
            : // Any OpenAI-compatible /chat/completions endpoint: Ollama, vLLM,
              // LM Studio, OpenRouter, Groq, etc. Runs fully local, no API key.
              isEnvTruthy(process.env.CLAUDE_CODE_USE_LOCAL)
              ? 'local'
              : 'firstParty'
}

/** True when routing to a self-hosted / OpenAI-compatible local endpoint. */
export function isLocalProvider(): boolean {
  return getAPIProvider() === 'local'
}

/**
 * Providers that route through the OpenAI-compatible /chat/completions fetch
 * adapter (src/services/api/local-fetch-adapter.ts) rather than a native SDK.
 */
export function usesOpenAICompatAdapter(): boolean {
  const p = getAPIProvider()
  return p === 'local' || p === 'deepseek'
}

// ── Canonical provider predicates ───────────────────────────────────
// Single source of truth for the "which provider are we on" branching that
// was previously open-coded across the codebase. The richer ProviderAdapter
// registry (src/services/api/providerAdapter.ts) builds on these.

/**
 * A non-first-party transport: Bedrock, Vertex, Foundry, Codex, or local.
 * Use instead of open-coding `getAPIProvider() !== 'firstParty'`.
 */
export function isThirdPartyProvider(): boolean {
  return getAPIProvider() !== 'firstParty'
}

/**
 * Providers that authenticate with their own credentials (or none at all) and
 * therefore do NOT require an Anthropic API key / OAuth login: Bedrock, Vertex,
 * Foundry, DeepSeek, and local. Note this intentionally excludes Codex
 * ('openai'), whose authentication is handled via its own OAuth path.
 */
export function providerBringsOwnCredentials(): boolean {
  const p = getAPIProvider()
  return (
    p === 'bedrock' ||
    p === 'vertex' ||
    p === 'foundry' ||
    p === 'deepseek' ||
    p === 'local'
  )
}

export function getAPIProviderForStatsig(): AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {
  return getAPIProvider() as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS
}

/**
 * Check if ANTHROPIC_BASE_URL is a first-party Anthropic API URL.
 * Returns true if not set (default API) or points to api.anthropic.com
 * (or api-staging.anthropic.com for ant users).
 */
export function isFirstPartyAnthropicBaseUrl(): boolean {
  const baseUrl = process.env.ANTHROPIC_BASE_URL
  if (!baseUrl) {
    return true
  }
  try {
    const host = new URL(baseUrl).host
    const allowedHosts = ['api.anthropic.com']
    if (process.env.USER_TYPE === 'ant') {
      allowedHosts.push('api-staging.anthropic.com')
    }
    return allowedHosts.includes(host)
  } catch {
    return false
  }
}
