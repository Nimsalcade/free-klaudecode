// Content for the deepcli-api bundled skill.
// Each .md file is inlined as a string at build time via Bun's text loader.

import csharpClaudeApi from './deepcli-api/csharp/deepcli-api.md'
import curlExamples from './deepcli-api/curl/examples.md'
import goClaudeApi from './deepcli-api/go/deepcli-api.md'
import javaClaudeApi from './deepcli-api/java/deepcli-api.md'
import phpClaudeApi from './deepcli-api/php/deepcli-api.md'
import pythonAgentSdkPatterns from './deepcli-api/python/agent-sdk/patterns.md'
import pythonAgentSdkReadme from './deepcli-api/python/agent-sdk/README.md'
import pythonClaudeApiBatches from './deepcli-api/python/deepcli-api/batches.md'
import pythonClaudeApiFilesApi from './deepcli-api/python/deepcli-api/files-api.md'
import pythonClaudeApiReadme from './deepcli-api/python/deepcli-api/README.md'
import pythonClaudeApiStreaming from './deepcli-api/python/deepcli-api/streaming.md'
import pythonClaudeApiToolUse from './deepcli-api/python/deepcli-api/tool-use.md'
import rubyClaudeApi from './deepcli-api/ruby/deepcli-api.md'
import skillPrompt from './deepcli-api/SKILL.md'
import sharedErrorCodes from './deepcli-api/shared/error-codes.md'
import sharedLiveSources from './deepcli-api/shared/live-sources.md'
import sharedModels from './deepcli-api/shared/models.md'
import sharedPromptCaching from './deepcli-api/shared/prompt-caching.md'
import sharedToolUseConcepts from './deepcli-api/shared/tool-use-concepts.md'
import typescriptAgentSdkPatterns from './deepcli-api/typescript/agent-sdk/patterns.md'
import typescriptAgentSdkReadme from './deepcli-api/typescript/agent-sdk/README.md'
import typescriptClaudeApiBatches from './deepcli-api/typescript/deepcli-api/batches.md'
import typescriptClaudeApiFilesApi from './deepcli-api/typescript/deepcli-api/files-api.md'
import typescriptClaudeApiReadme from './deepcli-api/typescript/deepcli-api/README.md'
import typescriptClaudeApiStreaming from './deepcli-api/typescript/deepcli-api/streaming.md'
import typescriptClaudeApiToolUse from './deepcli-api/typescript/deepcli-api/tool-use.md'

// @[MODEL LAUNCH]: Update the model IDs/names below. These are substituted into {{VAR}}
// placeholders in the .md files at runtime before the skill prompt is sent.
// After updating these constants, manually update the two files that still hardcode models:
//   - deepcli-api/SKILL.md (Current Models pricing table)
//   - deepcli-api/shared/models.md (full model catalog with legacy versions and alias mappings)
export const SKILL_MODEL_VARS = {
  OPUS_ID: 'deepcli-opus-4-6',
  OPUS_NAME: 'DeepCLI Opus 4.6',
  SONNET_ID: 'deepcli-sonnet-4-6',
  SONNET_NAME: 'DeepCLI Sonnet 4.6',
  HAIKU_ID: 'deepcli-haiku-4-5',
  HAIKU_NAME: 'DeepCLI Haiku 4.5',
  // Previous Sonnet ID — used in "do not append date suffixes" example in SKILL.md.
  PREV_SONNET_ID: 'deepcli-sonnet-4-5',
} satisfies Record<string, string>

export const SKILL_PROMPT: string = skillPrompt

export const SKILL_FILES: Record<string, string> = {
  'csharp/deepcli-api.md': csharpClaudeApi,
  'curl/examples.md': curlExamples,
  'go/deepcli-api.md': goClaudeApi,
  'java/deepcli-api.md': javaClaudeApi,
  'php/deepcli-api.md': phpClaudeApi,
  'python/agent-sdk/README.md': pythonAgentSdkReadme,
  'python/agent-sdk/patterns.md': pythonAgentSdkPatterns,
  'python/deepcli-api/README.md': pythonClaudeApiReadme,
  'python/deepcli-api/batches.md': pythonClaudeApiBatches,
  'python/deepcli-api/files-api.md': pythonClaudeApiFilesApi,
  'python/deepcli-api/streaming.md': pythonClaudeApiStreaming,
  'python/deepcli-api/tool-use.md': pythonClaudeApiToolUse,
  'ruby/deepcli-api.md': rubyClaudeApi,
  'shared/error-codes.md': sharedErrorCodes,
  'shared/live-sources.md': sharedLiveSources,
  'shared/models.md': sharedModels,
  'shared/prompt-caching.md': sharedPromptCaching,
  'shared/tool-use-concepts.md': sharedToolUseConcepts,
  'typescript/agent-sdk/README.md': typescriptAgentSdkReadme,
  'typescript/agent-sdk/patterns.md': typescriptAgentSdkPatterns,
  'typescript/deepcli-api/README.md': typescriptClaudeApiReadme,
  'typescript/deepcli-api/batches.md': typescriptClaudeApiBatches,
  'typescript/deepcli-api/files-api.md': typescriptClaudeApiFilesApi,
  'typescript/deepcli-api/streaming.md': typescriptClaudeApiStreaming,
  'typescript/deepcli-api/tool-use.md': typescriptClaudeApiToolUse,
}
