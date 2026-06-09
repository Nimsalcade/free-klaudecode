import type { ModelName } from './model.js'
import type { APIProvider } from './providers.js'

export type ModelConfig = Record<APIProvider, ModelName>

// @[MODEL LAUNCH]: Add a new DEEPCLI_*_CONFIG constant here. Double check the correct model strings
// here since the pattern may change.

export const DEEPCLI_3_7_SONNET_CONFIG = {
  firstParty: 'claude-3-7-sonnet-20250219',
  bedrock: 'us.anthropic.claude-3-7-sonnet-20250219-v1:0',
  vertex: 'claude-3-7-sonnet@20250219',
  foundry: 'claude-3-7-sonnet',
  openai: 'claude-3-7-sonnet-20250219',
  local: 'claude-3-7-sonnet-20250219',
} as const satisfies ModelConfig

export const DEEPCLI_3_5_V2_SONNET_CONFIG = {
  firstParty: 'claude-3-5-sonnet-20241022',
  bedrock: 'anthropic.claude-3-5-sonnet-20241022-v2:0',
  vertex: 'claude-3-5-sonnet-v2@20241022',
  foundry: 'claude-3-5-sonnet',
  openai: 'claude-3-5-sonnet-20241022',
  local: 'claude-3-5-sonnet-20241022',
} as const satisfies ModelConfig

export const DEEPCLI_3_5_HAIKU_CONFIG = {
  firstParty: 'claude-3-5-haiku-20241022',
  bedrock: 'us.anthropic.claude-3-5-haiku-20241022-v1:0',
  vertex: 'claude-3-5-haiku@20241022',
  foundry: 'claude-3-5-haiku',
  openai: 'claude-3-5-haiku-20241022',
  local: 'claude-3-5-haiku-20241022',
} as const satisfies ModelConfig

export const DEEPCLI_HAIKU_4_5_CONFIG = {
  firstParty: 'deepcli-haiku-4-5-20251001',
  bedrock: 'us.nexusai.deepcli-haiku-4-5-20251001-v1:0',
  vertex: 'deepcli-haiku-4-5@20251001',
  foundry: 'deepcli-haiku-4-5',
  openai: 'deepcli-haiku-4-5-20251001',
  local: 'deepcli-haiku-4-5-20251001',
} as const satisfies ModelConfig

export const DEEPCLI_SONNET_4_CONFIG = {
  firstParty: 'deepcli-sonnet-4-20250514',
  bedrock: 'us.nexusai.deepcli-sonnet-4-20250514-v1:0',
  vertex: 'deepcli-sonnet-4@20250514',
  foundry: 'deepcli-sonnet-4',
  openai: 'deepcli-sonnet-4-20250514',
  local: 'deepcli-sonnet-4-20250514',
} as const satisfies ModelConfig

export const DEEPCLI_SONNET_4_5_CONFIG = {
  firstParty: 'deepcli-sonnet-4-5-20250929',
  bedrock: 'us.nexusai.deepcli-sonnet-4-5-20250929-v1:0',
  vertex: 'deepcli-sonnet-4-5@20250929',
  foundry: 'deepcli-sonnet-4-5',
  openai: 'deepcli-sonnet-4-5-20250929',
  local: 'deepcli-sonnet-4-5-20250929',
} as const satisfies ModelConfig

export const DEEPCLI_OPUS_4_CONFIG = {
  firstParty: 'deepcli-opus-4-20250514',
  bedrock: 'us.nexusai.deepcli-opus-4-20250514-v1:0',
  vertex: 'deepcli-opus-4@20250514',
  foundry: 'deepcli-opus-4',
  openai: 'deepcli-opus-4-20250514',
  local: 'deepcli-opus-4-20250514',
} as const satisfies ModelConfig

export const DEEPCLI_OPUS_4_1_CONFIG = {
  firstParty: 'deepcli-opus-4-1-20250805',
  bedrock: 'us.nexusai.deepcli-opus-4-1-20250805-v1:0',
  vertex: 'deepcli-opus-4-1@20250805',
  foundry: 'deepcli-opus-4-1',
  openai: 'deepcli-opus-4-1-20250805',
  local: 'deepcli-opus-4-1-20250805',
} as const satisfies ModelConfig

export const DEEPCLI_OPUS_4_5_CONFIG = {
  firstParty: 'deepcli-opus-4-5-20251101',
  bedrock: 'us.nexusai.deepcli-opus-4-5-20251101-v1:0',
  vertex: 'deepcli-opus-4-5@20251101',
  foundry: 'deepcli-opus-4-5',
  openai: 'deepcli-opus-4-5-20251101',
  local: 'deepcli-opus-4-5-20251101',
} as const satisfies ModelConfig

export const DEEPCLI_OPUS_4_6_CONFIG = {
  firstParty: 'deepcli-opus-4-6',
  bedrock: 'us.nexusai.deepcli-opus-4-6-v1',
  vertex: 'deepcli-opus-4-6',
  foundry: 'deepcli-opus-4-6',
  openai: 'deepcli-opus-4-6',
  local: 'deepcli-opus-4-6',
} as const satisfies ModelConfig

export const DEEPCLI_SONNET_4_6_CONFIG = {
  firstParty: 'deepcli-sonnet-4-6',
  bedrock: 'us.nexusai.deepcli-sonnet-4-6',
  vertex: 'deepcli-sonnet-4-6',
  foundry: 'deepcli-sonnet-4-6',
  openai: 'deepcli-sonnet-4-6',
  local: 'deepcli-sonnet-4-6',
} as const satisfies ModelConfig

export const GPT_5_4_CONFIG = {
  firstParty: 'gpt-5.4',
  bedrock: 'gpt-5.4',
  vertex: 'gpt-5.4',
  foundry: 'gpt-5.4',
  openai: 'gpt-5.4',
  local: 'gpt-5.4',
} as const satisfies ModelConfig

export const GPT_5_3_CODEX_CONFIG = {
  firstParty: 'gpt-5.3-codex',
  bedrock: 'gpt-5.3-codex',
  vertex: 'gpt-5.3-codex',
  foundry: 'gpt-5.3-codex',
  openai: 'gpt-5.3-codex',
  local: 'gpt-5.3-codex',
} as const satisfies ModelConfig

export const GPT_5_4_MINI_CONFIG = {
  firstParty: 'gpt-5.4-mini',
  bedrock: 'gpt-5.4-mini',
  vertex: 'gpt-5.4-mini',
  foundry: 'gpt-5.4-mini',
  openai: 'gpt-5.4-mini',
  local: 'gpt-5.4-mini',
} as const satisfies ModelConfig

// @[MODEL LAUNCH]: Register the new config here.
export const ALL_MODEL_CONFIGS = {
  haiku35: DEEPCLI_3_5_HAIKU_CONFIG,
  haiku45: DEEPCLI_HAIKU_4_5_CONFIG,
  sonnet35: DEEPCLI_3_5_V2_SONNET_CONFIG,
  sonnet37: DEEPCLI_3_7_SONNET_CONFIG,
  sonnet40: DEEPCLI_SONNET_4_CONFIG,
  sonnet45: DEEPCLI_SONNET_4_5_CONFIG,
  sonnet46: DEEPCLI_SONNET_4_6_CONFIG,
  opus40: DEEPCLI_OPUS_4_CONFIG,
  opus41: DEEPCLI_OPUS_4_1_CONFIG,
  opus45: DEEPCLI_OPUS_4_5_CONFIG,
  opus46: DEEPCLI_OPUS_4_6_CONFIG,
  // OpenAI Codex models
  gpt54: GPT_5_4_CONFIG,
  gpt53codex: GPT_5_3_CODEX_CONFIG,
  gpt54mini: GPT_5_4_MINI_CONFIG,
} as const satisfies Record<string, ModelConfig>

export type ModelKey = keyof typeof ALL_MODEL_CONFIGS

/** Union of all canonical first-party model IDs, e.g. 'deepcli-opus-4-6' | 'deepcli-sonnet-4-5-20250929' | … */
export type CanonicalModelId =
  (typeof ALL_MODEL_CONFIGS)[ModelKey]['firstParty']

/** Runtime list of canonical model IDs — used by comprehensiveness tests. */
export const CANONICAL_MODEL_IDS = Object.values(ALL_MODEL_CONFIGS).map(
  c => c.firstParty,
) as [CanonicalModelId, ...CanonicalModelId[]]

/** Map canonical ID → internal short key. Used to apply settings-based modelOverrides. */
export const CANONICAL_ID_TO_KEY: Record<CanonicalModelId, ModelKey> =
  Object.fromEntries(
    (Object.entries(ALL_MODEL_CONFIGS) as [ModelKey, ModelConfig][]).map(
      ([key, cfg]) => [cfg.firstParty, key],
    ),
  ) as Record<CanonicalModelId, ModelKey>
