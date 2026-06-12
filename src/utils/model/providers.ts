import type { AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from '../../services/analytics/index.js'
import { isEnvTruthy } from '../envUtils.js'

export type APIProvider =
  | 'firstParty'
  | 'bedrock'
  | 'vertex'
  | 'foundry'
  | 'openai'
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
 * Foundry, and local. Note this intentionally excludes Codex ('openai'), whose
 * authentication is handled via its own OAuth path.
 */
export function providerBringsOwnCredentials(): boolean {
  const p = getAPIProvider()
  return p === 'bedrock' || p === 'vertex' || p === 'foundry' || p === 'local'
}

export function getAPIProviderForStatsig(): AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {
  return getAPIProvider() as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS
}

/**
 * Always returns false — no first-party Anthropic connections permitted.
 * All API traffic routes through the local or user-configured provider.
 */
export function isFirstPartyAnthropicBaseUrl(): boolean {
  return false
}

/**
 * Always skip Anthropic-specific auth ceremony:
 * keychain prefetch, OAuth population, org validation, etc.
 *
 * All Anthropic connections have been severed. Auth is handled entirely
 * through the configured provider (local, OpenAI-compatible, etc.).
 */
export function shouldSkipAnthropicAuth(): boolean {
  return true
}
