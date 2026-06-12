import { z } from 'zod/v4'
import { isProactiveActive } from '../../proactive/index.js'
import { buildTool, type ToolDef } from '../../Tool.js'
import { lazySchema } from '../../utils/lazySchema.js'
import { DESCRIPTION, SLEEP_TOOL_NAME, SLEEP_TOOL_PROMPT } from './prompt.js'

const inputSchema = lazySchema(() =>
  z.strictObject({
    duration: z
      .number()
      .min(1)
      .max(1800)
      .describe(
        'Seconds to sleep (1-1800). Call repeatedly for longer waits. Prefer this over Bash(sleep) — it does not hold a shell process.',
      ),
  }),
)

const outputSchema = lazySchema(() =>
  z.object({
    slept: z.number().describe('Actual seconds slept'),
    interrupted: z.boolean().describe('Whether sleep was interrupted early'),
  }),
)

type InputSchema = ReturnType<typeof inputSchema>
type Output = z.infer<ReturnType<typeof outputSchema>>

export const SleepTool = buildTool({
  name: SLEEP_TOOL_NAME,
  searchHint: 'wait, pause, sleep, delay, rest',
  maxResultSizeChars: 200,

  get inputSchema(): InputSchema {
    return inputSchema()
  },
  get outputSchema() {
    return outputSchema()
  },

  isEnabled() {
    // Feature gate is at the import site (tools.ts: require gated on PROACTIVE || KAIROS).
    // The file is only loaded when the feature is active.
    return isProactiveActive()
  },

  isConcurrencySafe() {
    return true
  },

  isReadOnly() {
    return true
  },

  toAutoClassifierInput() {
    return ''
  },

  async description() {
    return DESCRIPTION
  },

  async prompt() {
    return SLEEP_TOOL_PROMPT
  },

  mapToolResultToToolResultBlockParam(output, toolUseID) {
    const label = output.interrupted
      ? `Sleep interrupted after ${output.slept}s`
      : `Slept for ${output.slept}s`
    return {
      tool_use_id: toolUseID,
      type: 'tool_result',
      content: label,
    }
  },

  renderToolUseMessage(input) {
    return `Waiting for ${input.duration}s`
  },

  async call(
    { duration },
    context,
  ) {
    let interrupted = false

    const onAbort = () => {
      interrupted = true
    }
    context.abortController.signal.addEventListener('abort', onAbort, {
      once: true,
    })

    // Sleep in 1-second increments so we can check for abort/interrupt.
    const deadline = Date.now() + duration * 1000
    while (Date.now() < deadline) {
      if (interrupted || context.abortController.signal.aborted) {
        break
      }
      const remaining = Math.min(1000, deadline - Date.now())
      if (remaining <= 0) break
      await new Promise<void>(resolve => setTimeout(resolve, remaining))
    }

    context.abortController.signal.removeEventListener('abort', onAbort)

    const elapsed = duration - Math.max(0, (deadline - Date.now()) / 1000)
    const slept = Math.round(elapsed)

    return {
      data: {
        slept: interrupted ? slept : duration,
        interrupted,
      },
    }
  },
} satisfies ToolDef<InputSchema, Output>)
