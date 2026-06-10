/**
 * Provider Adapter registry
 *
 * The single seam for per-provider behavior. free-code talks to several
 * backends — Anthropic first-party, AWS Bedrock, Google Vertex, Anthropic
 * Foundry, OpenAI Codex, and any OpenAI-compatible local server — and the
 * differences between them (auth model, whether they need a translating fetch
 * shim, display label, third-party status) used to be open-coded as scattered
 * `getAPIProvider() === 'x'` / env checks throughout the codebase.
 *
 * This module centralizes that into one declarative registry keyed by
 * APIProvider. Call sites ask the adapter what to do instead of re-deriving it.
 *
 * Capability summary:
 *
 *   provider     thirdParty  ownCreds  fetchAdapter  notes
 *   ───────────  ──────────  ────────  ────────────  ─────────────────────────
 *   firstParty   no          no        no            Anthropic API key / OAuth
 *   bedrock      yes         yes       no            AWS credentials, native SDK
 *   vertex       yes         yes       no            GCP ADC, native SDK
 *   foundry      yes         yes       no            Foundry key, native SDK
 *   openai       yes         no        yes           Codex OAuth, /responses shim
 *   deepseek     yes         yes       yes           DEEPSEEK_API_KEY, /chat/completions shim
 *   local        yes         yes       no*           OpenAI /chat/completions shim
 *
 *   (*) local brings no real credentials but is grouped with ownCreds since it
 *       requires no Anthropic login; it uses a fetch adapter for transport.
 */

import { getCodexOAuthTokens } from '../../utils/auth.js'
import type { APIProvider } from '../../utils/model/providers.js'
import { getAPIProvider } from '../../utils/model/providers.js'
import { createCodexFetch } from './codex-fetch-adapter.js'
import { createLocalFetch } from './local-fetch-adapter.js'
import { getDeepSeekProviderConfig } from './openai-compat-config.js'

export type ProviderFetch = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>

export interface ProviderAdapter {
  /** Stable provider identifier. */
  readonly id: APIProvider
  /** Human-readable label for UI / billing surfaces. */
  readonly label: string
  /** A non-first-party transport (anything other than the Anthropic API). */
  readonly isThirdParty: boolean
  /**
   * Authenticates with its own credentials (or none) and so does not require an
   * Anthropic API key / OAuth login. Mirrors providerBringsOwnCredentials().
   */
  readonly bringsOwnCredentials: boolean
  /**
   * Returns a translating fetch to hand to the Anthropic SDK, or null when the
   * provider uses a native SDK (Bedrock/Vertex/Foundry) or its credentials are
   * unavailable. When non-null, the SDK is constructed with this fetch and a
   * placeholder API key.
   */
  createFetch(): ProviderFetch | null
}

const ADAPTERS: Record<APIProvider, ProviderAdapter> = {
  firstParty: {
    id: 'firstParty',
    label: 'Anthropic API',
    isThirdParty: false,
    bringsOwnCredentials: false,
    createFetch: () => null,
  },
  bedrock: {
    id: 'bedrock',
    label: 'AWS Bedrock',
    isThirdParty: true,
    bringsOwnCredentials: true,
    createFetch: () => null,
  },
  vertex: {
    id: 'vertex',
    label: 'Google Vertex AI',
    isThirdParty: true,
    bringsOwnCredentials: true,
    createFetch: () => null,
  },
  foundry: {
    id: 'foundry',
    label: 'Anthropic Foundry',
    isThirdParty: true,
    bringsOwnCredentials: true,
    createFetch: () => null,
  },
  openai: {
    id: 'openai',
    label: 'OpenAI Codex',
    isThirdParty: true,
    bringsOwnCredentials: false,
    createFetch: () => {
      const tokens = getCodexOAuthTokens()
      return tokens?.accessToken ? createCodexFetch(tokens.accessToken) : null
    },
  },
  deepseek: {
    id: 'deepseek',
    label: 'DeepSeek',
    isThirdParty: true,
    bringsOwnCredentials: true,
    // Always returns a fetch: a missing DEEPSEEK_API_KEY surfaces as a clear
    // 401 with setup instructions instead of falling back to Anthropic auth.
    createFetch: () => createLocalFetch(getDeepSeekProviderConfig()),
  },
  local: {
    id: 'local',
    label: 'Local (OpenAI-compatible)',
    isThirdParty: true,
    bringsOwnCredentials: true,
    createFetch: () => createLocalFetch(),
  },
}

/** Returns the adapter for the currently-selected provider. */
export function getProviderAdapter(): ProviderAdapter {
  return ADAPTERS[getAPIProvider()]
}

/** Look up an adapter by id (e.g. for display of a non-active provider). */
export function getProviderAdapterById(id: APIProvider): ProviderAdapter {
  return ADAPTERS[id]
}
