/**
 * OpenAI-compatible Fetch Adapter (local servers + DeepSeek)
 *
 * Intercepts fetch calls from the Anthropic SDK and routes them to any
 * OpenAI-compatible `/chat/completions` endpoint, translating between the
 * Anthropic Messages API format and the OpenAI Chat Completions format.
 *
 * This is what unlocks "run any model, no API key, no callbacks home":
 *   - Ollama          (http://localhost:11434/v1)
 *   - llama.cpp / llama-server
 *   - vLLM
 *   - LM Studio       (http://localhost:1234/v1)
 *   - OpenRouter, Groq, Together, ... (any OpenAI-compatible host)
 *
 * It also powers the first-class DeepSeek provider (CLAUDE_CODE_USE_DEEPSEEK),
 * which layers DeepSeek-specific defaults on the same transport: agentic
 * default model, per-model max_tokens ceilings, reasoning_content -> thinking
 * translation, and cache-hit token accounting.
 *
 * Unlike the Codex adapter (which targets OpenAI's experimental /responses
 * API), this targets the ubiquitous /chat/completions API that essentially
 * every self-hosted and third-party inference server implements.
 *
 * Supports:
 *   - Text messages (user/assistant) and system prompts
 *   - Tool definitions (Anthropic input_schema -> OpenAI function parameters)
 *   - Tool use round-trips (tool_use <-> tool_calls, tool_result <-> role:tool)
 *   - Reasoning models (reasoning_content / reasoning -> Anthropic thinking)
 *   - Vision (Anthropic base64 image -> OpenAI image_url data URI)
 *   - Both streaming (SSE) and non-streaming responses
 *   - Token accounting incl. cached prompt tokens (DeepSeek and OpenAI styles)
 *   - count_tokens requests (answered locally; never forwarded as generations)
 *
 * Configuration (env) — local provider:
 *   CLAUDE_CODE_USE_LOCAL=1                 enable the local provider
 *   CLAUDE_CODE_LOCAL_BASE_URL=...          OpenAI-compatible base URL
 *                                           (default: http://localhost:11434/v1 for Ollama)
 *   CLAUDE_CODE_LOCAL_MODEL=...             model name to send (overrides the request model)
 *   CLAUDE_CODE_LOCAL_API_KEY=...           optional bearer token
 *   CLAUDE_CODE_LOCAL_MAX_OUTPUT_TOKENS=... clamp max_tokens to this ceiling
 *   CLAUDE_CODE_LOCAL_CONTEXT_WINDOW=...    declare the served model's context window
 *
 * Configuration (env) — DeepSeek provider:
 *   CLAUDE_CODE_USE_DEEPSEEK=1              enable the DeepSeek provider
 *   DEEPSEEK_API_KEY=...                    required bearer token
 *   DEEPSEEK_MODEL=...                      default: deepseek-chat (deepseek-reasoner for thinking)
 *   DEEPSEEK_BASE_URL=...                   default: https://api.deepseek.com/v1
 *   DEEPSEEK_MAX_OUTPUT_TOKENS=...          override the per-model max_tokens ceiling
 *   DEEPSEEK_CONTEXT_WINDOW=...             override the published 128K context window
 */

import { logForDebugging } from '../../utils/debug.js'
import {
  getDeepSeekProviderConfig,
  getLocalProviderConfig,
  maxOutputTokensForModel,
  type OpenAICompatProviderConfig,
} from './openai-compat-config.js'

// Re-exported for existing call sites and tests; the config now lives in
// openai-compat-config.ts so model/context modules can read it without
// importing this transport module.
export {
  getDeepSeekProviderConfig,
  getLocalProviderConfig,
} from './openai-compat-config.js'
export type LocalProviderConfig = OpenAICompatProviderConfig

/**
 * Inputs to createLocalFetch. Only the transport essentials are required —
 * the rest defaults to permissive 'local' behavior.
 */
export type LocalFetchConfigInput = Pick<
  OpenAICompatProviderConfig,
  'baseURL' | 'apiKey' | 'model'
> &
  Partial<OpenAICompatProviderConfig>

function normalizeConfig(
  input: LocalFetchConfigInput,
): OpenAICompatProviderConfig {
  return {
    provider: input.provider ?? 'local',
    label: input.label ?? 'Local model server',
    baseURL: input.baseURL,
    apiKey: input.apiKey,
    model: input.model,
    nativeModelPrefix: input.nativeModelPrefix ?? null,
    maxOutputTokens: input.maxOutputTokens ?? null,
    requiresApiKey: input.requiresApiKey ?? false,
    setupHint:
      input.setupHint ??
      'Is it running? Set CLAUDE_CODE_LOCAL_BASE_URL to point at your server.',
  }
}

// ── Types ───────────────────────────────────────────────────────────

interface AnthropicContentBlock {
  type: string
  text?: string
  id?: string
  name?: string
  input?: Record<string, unknown>
  tool_use_id?: string
  content?: string | AnthropicContentBlock[]
  source?: { type?: string; media_type?: string; data?: string }
  [key: string]: unknown
}

interface AnthropicMessage {
  role: string
  content: string | AnthropicContentBlock[]
}

interface AnthropicTool {
  name: string
  description?: string
  input_schema?: Record<string, unknown>
}

type OpenAIMessage = Record<string, unknown>

interface OpenAIUsage {
  prompt_tokens?: number
  completion_tokens?: number
  /** DeepSeek-style prompt cache accounting. */
  prompt_cache_hit_tokens?: number
  prompt_cache_miss_tokens?: number
  /** OpenAI-style prompt cache accounting. */
  prompt_tokens_details?: { cached_tokens?: number }
}

// ── Tool translation: Anthropic -> OpenAI ───────────────────────────

function translateTools(
  anthropicTools: AnthropicTool[],
): Array<Record<string, unknown>> {
  return anthropicTools.map(tool => ({
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description || '',
      parameters: tool.input_schema || { type: 'object', properties: {} },
    },
  }))
}

// ── Message translation: Anthropic -> OpenAI chat messages ──────────

/** Flattens an Anthropic tool_result content payload into plain text. */
function extractToolResultText(
  content: string | AnthropicContentBlock[] | undefined,
): string {
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    return content
      .map(c => {
        if (c.type === 'text') return c.text ?? ''
        if (c.type === 'image') return '[image omitted: tool returned an image]'
        return ''
      })
      .filter(Boolean)
      .join('\n')
  }
  return ''
}

function translateMessages(
  anthropicMessages: AnthropicMessage[],
  systemPrompt:
    | string
    | Array<{ type: string; text?: string }>
    | undefined,
): OpenAIMessage[] {
  const out: OpenAIMessage[] = []

  // System prompt -> leading system message
  if (systemPrompt) {
    const systemText =
      typeof systemPrompt === 'string'
        ? systemPrompt
        : systemPrompt
            .filter(b => b.type === 'text' && typeof b.text === 'string')
            .map(b => b.text!)
            .join('\n')
    if (systemText.trim()) out.push({ role: 'system', content: systemText })
  }

  for (const msg of anthropicMessages) {
    if (typeof msg.content === 'string') {
      out.push({ role: msg.role, content: msg.content })
      continue
    }
    if (!Array.isArray(msg.content)) continue

    if (msg.role === 'user') {
      // tool_result blocks must surface as separate role:"tool" messages and,
      // per the OpenAI contract, come immediately after the assistant turn
      // that issued the corresponding tool_calls. Emit them first.
      const toolMessages: OpenAIMessage[] = []
      const parts: Array<Record<string, unknown>> = []
      for (const block of msg.content) {
        if (block.type === 'tool_result') {
          toolMessages.push({
            role: 'tool',
            tool_call_id: block.tool_use_id || '',
            content: extractToolResultText(block.content) || '(no output)',
          })
        } else if (block.type === 'text' && typeof block.text === 'string') {
          parts.push({ type: 'text', text: block.text })
        } else if (
          block.type === 'image' &&
          block.source?.type === 'base64' &&
          block.source.data
        ) {
          parts.push({
            type: 'image_url',
            image_url: {
              url: `data:${block.source.media_type || 'image/png'};base64,${block.source.data}`,
            },
          })
        }
      }
      for (const t of toolMessages) out.push(t)
      if (parts.length > 0) {
        // Collapse a pure-text payload to a plain string for maximum
        // compatibility with servers that don't accept array content.
        const onlyText = parts.every(p => p.type === 'text')
        out.push({
          role: 'user',
          content: onlyText
            ? parts.map(p => (p as { text: string }).text).join('\n')
            : parts,
        })
      }
    } else if (msg.role === 'assistant') {
      // thinking/redacted_thinking blocks are intentionally dropped: reasoning
      // output is not part of the conversation context for OpenAI-compatible
      // APIs (DeepSeek explicitly documents that CoT must not be sent back).
      let text = ''
      const toolCalls: Array<Record<string, unknown>> = []
      for (const block of msg.content) {
        if (block.type === 'text' && typeof block.text === 'string') {
          text += block.text
        } else if (block.type === 'tool_use') {
          toolCalls.push({
            id: block.id || '',
            type: 'function',
            function: {
              name: block.name || '',
              arguments: JSON.stringify(block.input || {}),
            },
          })
        }
      }
      const assistantMsg: OpenAIMessage = { role: 'assistant' }
      // content must be present (null is valid when only tool_calls exist).
      assistantMsg.content = text || null
      if (toolCalls.length > 0) assistantMsg.tool_calls = toolCalls
      out.push(assistantMsg)
    }
  }

  return out
}

// ── Full request translation ────────────────────────────────────────

function translateToChatCompletionsBody(
  anthropicBody: Record<string, unknown>,
  config: OpenAICompatProviderConfig,
  stream: boolean,
): { body: Record<string, unknown>; model: string } {
  const anthropicMessages = (anthropicBody.messages || []) as AnthropicMessage[]
  const systemPrompt = anthropicBody.system as
    | string
    | Array<{ type: string; text?: string }>
    | undefined
  const anthropicTools = (anthropicBody.tools || []) as AnthropicTool[]

  // Model resolution: requests for models native to this provider pass
  // through (so /model can switch deepseek-chat <-> deepseek-reasoner at
  // runtime); anything else — typically claude-* ids from the harness — is
  // rewritten to the configured model.
  const requestedModel =
    typeof anthropicBody.model === 'string' ? anthropicBody.model : null
  const isNativeRequest = Boolean(
    config.nativeModelPrefix &&
      requestedModel?.toLowerCase().startsWith(config.nativeModelPrefix),
  )
  const model = isNativeRequest
    ? requestedModel!
    : config.model || requestedModel || 'local'

  const body: Record<string, unknown> = {
    model,
    messages: translateMessages(anthropicMessages, systemPrompt),
    stream,
  }

  if (typeof anthropicBody.max_tokens === 'number') {
    // Clamp to the provider's ceiling: the harness defaults to 32K output
    // tokens, which hosted APIs like DeepSeek reject outright.
    const cap = maxOutputTokensForModel(config, model)
    body.max_tokens =
      cap !== null
        ? Math.min(anthropicBody.max_tokens, cap)
        : anthropicBody.max_tokens
  }
  if (typeof anthropicBody.temperature === 'number') {
    body.temperature = anthropicBody.temperature
  }
  if (typeof anthropicBody.top_p === 'number') {
    body.top_p = anthropicBody.top_p
  }
  if (Array.isArray(anthropicBody.stop_sequences) &&
      anthropicBody.stop_sequences.length > 0) {
    body.stop = anthropicBody.stop_sequences
  }
  if (anthropicTools.length > 0) {
    body.tools = translateTools(anthropicTools)
    body.tool_choice = 'auto'
  }
  if (stream) {
    // Ask compatible servers to emit a trailing usage chunk.
    body.stream_options = { include_usage: true }
  }

  return { body, model }
}

// ── stop_reason mapping ─────────────────────────────────────────────

function mapFinishReason(reason: string | null | undefined): string {
  switch (reason) {
    case 'tool_calls':
      return 'tool_use'
    case 'length':
      return 'max_tokens'
    case 'content_filter':
      return 'refusal'
    case 'stop':
    default:
      return 'end_turn'
  }
}

// ── Usage translation ───────────────────────────────────────────────

/**
 * Maps OpenAI-style usage to Anthropic semantics. Anthropic's input_tokens
 * EXCLUDES cache reads, while OpenAI's prompt_tokens INCLUDES them, so cached
 * tokens are split out. Handles both DeepSeek (prompt_cache_hit_tokens) and
 * OpenAI (prompt_tokens_details.cached_tokens) cache accounting.
 */
function translateUsage(usage: OpenAIUsage | undefined): {
  input_tokens: number
  output_tokens: number
  cache_read_input_tokens: number
  cache_creation_input_tokens: number
} {
  const prompt = usage?.prompt_tokens ?? 0
  const completion = usage?.completion_tokens ?? 0
  const cacheRead =
    usage?.prompt_cache_hit_tokens ??
    usage?.prompt_tokens_details?.cached_tokens ??
    0
  return {
    input_tokens: Math.max(0, prompt - cacheRead),
    output_tokens: completion,
    cache_read_input_tokens: cacheRead,
    cache_creation_input_tokens: 0,
  }
}

// ── count_tokens handling ───────────────────────────────────────────

/**
 * OpenAI-compatible servers expose no token-counting endpoint, and forwarding
 * /v1/messages/count_tokens to /chat/completions would run a real (paid)
 * generation per estimate. Answer locally with a chars/4 heuristic instead —
 * coarse, but directionally right for context-size decisions, and the caller
 * already treats API counts as best-effort.
 */
function estimateTokenCount(anthropicBody: Record<string, unknown>): number {
  let chars = 0
  for (const key of ['system', 'messages', 'tools'] as const) {
    const value = anthropicBody[key]
    if (value !== undefined) {
      try {
        chars += JSON.stringify(value).length
      } catch {
        // Unserializable payloads contribute nothing to the estimate.
      }
    }
  }
  return Math.max(1, Math.ceil(chars / 4))
}

// ── Error translation ───────────────────────────────────────────────

/**
 * Wraps an upstream failure in an Anthropic-shaped error body, preserving the
 * status code (so the SDK's retry logic still applies to 429/5xx) and the
 * Retry-After header (so its backoff honors the server's pacing).
 */
function translateErrorResponse(
  status: number,
  errorText: string,
  label: string,
  retryAfter?: string | null,
): Response {
  // Surface the upstream error message rather than a wall of raw JSON.
  let detail = errorText.slice(0, 2_000)
  try {
    const parsed = JSON.parse(errorText) as {
      error?: { message?: string }
      message?: string
    }
    detail = parsed?.error?.message || parsed?.message || detail
  } catch {
    // Not JSON — keep the raw text.
  }

  const type =
    status === 401
      ? 'authentication_error'
      : status === 403
        ? 'permission_error'
        : status === 429
          ? 'rate_limit_error'
          : status >= 500
            ? 'api_error'
            : 'invalid_request_error'

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (retryAfter) headers['retry-after'] = retryAfter

  return new Response(
    JSON.stringify({
      type: 'error',
      error: { type, message: `${label} error (${status}): ${detail}` },
    }),
    { status, headers },
  )
}

// ── SSE helper ──────────────────────────────────────────────────────

function formatSSE(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
}

// ── Non-streaming response translation ──────────────────────────────

function translateNonStreamingResponse(
  openaiJson: Record<string, unknown>,
  model: string,
): Response {
  const choice = (openaiJson.choices as Array<Record<string, unknown>>)?.[0]
  const message = (choice?.message || {}) as Record<string, unknown>

  const content: Array<Record<string, unknown>> = []
  // Reasoning models (deepseek-reasoner, R1-style local models) return their
  // chain of thought in reasoning_content; surface it as a thinking block.
  const reasoning =
    typeof message.reasoning_content === 'string'
      ? message.reasoning_content
      : typeof message.reasoning === 'string'
        ? message.reasoning
        : ''
  if (reasoning.length > 0) {
    content.push({ type: 'thinking', thinking: reasoning, signature: '' })
  }
  if (typeof message.content === 'string' && message.content.length > 0) {
    content.push({ type: 'text', text: message.content })
  }
  const toolCalls = (message.tool_calls || []) as Array<Record<string, unknown>>
  for (const tc of toolCalls) {
    const fn = (tc.function || {}) as Record<string, unknown>
    let input: unknown = {}
    try {
      input = JSON.parse((fn.arguments as string) || '{}')
    } catch {
      logForDebugging(
        `[LOCAL] dropping unparsable tool_call arguments for ${fn.name}`,
      )
      input = {}
    }
    content.push({
      type: 'tool_use',
      id: (tc.id as string) || `call_${Math.random().toString(36).slice(2)}`,
      name: (fn.name as string) || '',
      input,
    })
  }
  if (content.length === 0) content.push({ type: 'text', text: '' })

  const anthropicResponse = {
    id: (openaiJson.id as string) || `msg_local_${Date.now()}`,
    type: 'message',
    role: 'assistant',
    model,
    content,
    stop_reason: mapFinishReason(choice?.finish_reason as string),
    stop_sequence: null,
    usage: translateUsage(openaiJson.usage as OpenAIUsage | undefined),
  }

  return new Response(JSON.stringify(anthropicResponse), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

// ── Streaming response translation: OpenAI SSE -> Anthropic SSE ──────

async function translateStreamToAnthropic(
  openaiResponse: Response,
  model: string,
): Promise<Response> {
  const messageId = `msg_local_${Date.now()}`

  const readable = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()

      const send = (event: string, data: unknown) =>
        controller.enqueue(encoder.encode(formatSSE(event, data)))

      send('message_start', {
        type: 'message_start',
        message: {
          id: messageId,
          type: 'message',
          role: 'assistant',
          content: [],
          model,
          stop_reason: null,
          stop_sequence: null,
          usage: { input_tokens: 0, output_tokens: 0 },
        },
      })
      send('ping', { type: 'ping' })

      // Block bookkeeping. Anthropic requires ordered, explicitly opened and
      // closed content blocks. We allocate indices lazily in first-seen order.
      let nextIndex = 0
      let textBlockIndex = -1 // -1 = not open
      let thinkingBlockIndex = -1 // -1 = not open
      // openai tool_call index -> anthropic block state
      const toolBlocks = new Map<
        number,
        { index: number; closed: boolean }
      >()
      let finishReason: string | null = null
      let usage = translateUsage(undefined)

      const closeTextBlock = () => {
        if (textBlockIndex >= 0) {
          send('content_block_stop', {
            type: 'content_block_stop',
            index: textBlockIndex,
          })
          textBlockIndex = -1
        }
      }

      const closeThinkingBlock = () => {
        if (thinkingBlockIndex >= 0) {
          // Anthropic thinking blocks end with a signature_delta; emit an
          // empty one so strict consumers see a spec-shaped sequence.
          send('content_block_delta', {
            type: 'content_block_delta',
            index: thinkingBlockIndex,
            delta: { type: 'signature_delta', signature: '' },
          })
          send('content_block_stop', {
            type: 'content_block_stop',
            index: thinkingBlockIndex,
          })
          thinkingBlockIndex = -1
        }
      }

      try {
        const reader = openaiResponse.body?.getReader()
        if (!reader) {
          throw new Error('No response body from model server')
        }
        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            const trimmed = line.trim()
            if (!trimmed || !trimmed.startsWith('data:')) continue
            const dataStr = trimmed.slice(5).trim()
            if (dataStr === '[DONE]') continue

            let chunk: Record<string, unknown>
            try {
              chunk = JSON.parse(dataStr)
            } catch {
              continue
            }

            // Trailing usage chunk (choices may be empty).
            if (chunk.usage) {
              usage = translateUsage(chunk.usage as OpenAIUsage)
            }

            const choice = (chunk.choices as Array<Record<string, unknown>>)?.[0]
            if (!choice) continue
            if (choice.finish_reason) {
              finishReason = choice.finish_reason as string
            }
            const delta = (choice.delta || {}) as Record<string, unknown>

            // ── Reasoning delta (deepseek-reasoner, R1-style models) ──
            const reasoningDelta =
              typeof delta.reasoning_content === 'string'
                ? delta.reasoning_content
                : typeof delta.reasoning === 'string'
                  ? delta.reasoning
                  : ''
            if (reasoningDelta.length > 0) {
              if (thinkingBlockIndex < 0) {
                closeTextBlock()
                thinkingBlockIndex = nextIndex++
                send('content_block_start', {
                  type: 'content_block_start',
                  index: thinkingBlockIndex,
                  content_block: { type: 'thinking', thinking: '', signature: '' },
                })
              }
              send('content_block_delta', {
                type: 'content_block_delta',
                index: thinkingBlockIndex,
                delta: { type: 'thinking_delta', thinking: reasoningDelta },
              })
            }

            // ── Text delta ──────────────────────────────────────
            if (typeof delta.content === 'string' && delta.content.length > 0) {
              // Reasoning always precedes the answer; close it out.
              closeThinkingBlock()
              if (textBlockIndex < 0) {
                textBlockIndex = nextIndex++
                send('content_block_start', {
                  type: 'content_block_start',
                  index: textBlockIndex,
                  content_block: { type: 'text', text: '' },
                })
              }
              send('content_block_delta', {
                type: 'content_block_delta',
                index: textBlockIndex,
                delta: { type: 'text_delta', text: delta.content },
              })
            }

            // ── Tool-call deltas ────────────────────────────────
            const toolCallDeltas = delta.tool_calls as
              | Array<Record<string, unknown>>
              | undefined
            if (Array.isArray(toolCallDeltas)) {
              // Thinking/text blocks and tool calls can't be open simultaneously.
              closeThinkingBlock()
              closeTextBlock()
              for (const tcDelta of toolCallDeltas) {
                const ti = (tcDelta.index as number) ?? 0
                const fn = (tcDelta.function || {}) as Record<string, unknown>
                let state = toolBlocks.get(ti)
                if (!state) {
                  const index = nextIndex++
                  state = { index, closed: false }
                  toolBlocks.set(ti, state)
                  send('content_block_start', {
                    type: 'content_block_start',
                    index,
                    content_block: {
                      type: 'tool_use',
                      id:
                        (tcDelta.id as string) ||
                        `call_${Date.now()}_${ti}`,
                      name: (fn.name as string) || '',
                      input: {},
                    },
                  })
                }
                if (typeof fn.arguments === 'string' && fn.arguments.length > 0) {
                  send('content_block_delta', {
                    type: 'content_block_delta',
                    index: state.index,
                    delta: {
                      type: 'input_json_delta',
                      partial_json: fn.arguments,
                    },
                  })
                }
              }
            }
          }
        }
      } catch (err) {
        // Surface the failure as visible assistant text rather than a silent hang.
        closeThinkingBlock()
        if (textBlockIndex < 0) {
          textBlockIndex = nextIndex++
          send('content_block_start', {
            type: 'content_block_start',
            index: textBlockIndex,
            content_block: { type: 'text', text: '' },
          })
        }
        send('content_block_delta', {
          type: 'content_block_delta',
          index: textBlockIndex,
          delta: {
            type: 'text_delta',
            text: `\n[model adapter error: ${
              err instanceof Error ? err.message : String(err)
            }]`,
          },
        })
      }

      // Close any still-open blocks.
      closeThinkingBlock()
      closeTextBlock()
      for (const state of toolBlocks.values()) {
        if (!state.closed) {
          send('content_block_stop', {
            type: 'content_block_stop',
            index: state.index,
          })
          state.closed = true
        }
      }

      send('message_delta', {
        type: 'message_delta',
        delta: {
          stop_reason: mapFinishReason(finishReason),
          stop_sequence: null,
        },
        usage: {
          output_tokens: usage.output_tokens,
          input_tokens: usage.input_tokens,
          cache_read_input_tokens: usage.cache_read_input_tokens,
          cache_creation_input_tokens: usage.cache_creation_input_tokens,
        },
      })
      send('message_stop', {
        type: 'message_stop',
        usage: {
          input_tokens: usage.input_tokens,
          output_tokens: usage.output_tokens,
          cache_read_input_tokens: usage.cache_read_input_tokens,
          cache_creation_input_tokens: usage.cache_creation_input_tokens,
        },
      })
      controller.close()
    },
  })

  return new Response(readable, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'x-request-id': messageId,
    },
  })
}

// ── Main fetch interceptor ──────────────────────────────────────────

/**
 * Creates a fetch function that intercepts Anthropic Messages API calls and
 * routes them to an OpenAI-compatible `/chat/completions` endpoint.
 *
 * Pass the result as the `fetch` option of the Anthropic SDK client.
 */
export function createLocalFetch(
  configInput: LocalFetchConfigInput = getLocalProviderConfig(),
): (input: RequestInfo | URL, init?: RequestInit) => Promise<Response> {
  const config = normalizeConfig(configInput)
  return async (
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> => {
    const url = input instanceof Request ? input.url : String(input)

    // Only intercept message-completion calls; let everything else pass through.
    if (!url.includes('/v1/messages')) {
      return globalThis.fetch(input, init)
    }

    let anthropicBody: Record<string, unknown>
    try {
      const bodyText =
        init?.body instanceof ReadableStream
          ? await new Response(init.body).text()
          : typeof init?.body === 'string'
            ? init.body
            : '{}'
      anthropicBody = JSON.parse(bodyText)
    } catch {
      anthropicBody = {}
    }

    // Token-count requests are answered locally — see estimateTokenCount.
    if (url.includes('/count_tokens')) {
      return new Response(
        JSON.stringify({ input_tokens: estimateTokenCount(anthropicBody) }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      )
    }

    if (config.requiresApiKey && !config.apiKey) {
      return new Response(
        JSON.stringify({
          type: 'error',
          error: {
            type: 'authentication_error',
            message: `${config.label}: no API key configured. ${config.setupHint}`,
          },
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } },
      )
    }

    const stream = anthropicBody.stream !== false
    const { body, model } = translateToChatCompletionsBody(
      anthropicBody,
      config,
      stream,
    )

    logForDebugging(
      `[${config.provider.toUpperCase()}] ${config.baseURL}/chat/completions model=${model} stream=${stream}`,
    )

    let openaiResponse: Response
    try {
      openaiResponse = await globalThis.fetch(
        `${config.baseURL}/chat/completions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: stream ? 'text/event-stream' : 'application/json',
            ...(config.apiKey
              ? { Authorization: `Bearer ${config.apiKey}` }
              : {}),
          },
          body: JSON.stringify(body),
        },
      )
    } catch (err) {
      const message =
        err instanceof Error ? err.message : String(err)
      return new Response(
        JSON.stringify({
          type: 'error',
          error: {
            type: 'api_error',
            message: `${config.label} unreachable at ${config.baseURL} (${message}). ${config.setupHint}`,
          },
        }),
        { status: 502, headers: { 'Content-Type': 'application/json' } },
      )
    }

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text().catch(() => '')
      return translateErrorResponse(
        openaiResponse.status,
        errorText,
        config.label,
        openaiResponse.headers.get('retry-after'),
      )
    }

    if (!stream) {
      const json = (await openaiResponse.json().catch(() => ({}))) as Record<
        string,
        unknown
      >
      return translateNonStreamingResponse(json, model)
    }

    return translateStreamToAnthropic(openaiResponse, model)
  }
}
