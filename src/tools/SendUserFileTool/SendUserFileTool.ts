import { z } from 'zod/v4'
import { getKairosActive } from '../../bootstrap/state.js'
import { buildTool } from '../../Tool.js'
import { lazySchema } from '../../utils/lazySchema.js'
import { DESCRIPTION, SEND_USER_FILE_TOOL_NAME, SEND_USER_FILE_TOOL_PROMPT } from './prompt.js'

const inputSchema = lazySchema(() => z.strictObject({}).passthrough())
const outputSchema = lazySchema(() => z.object({ ok: z.boolean() }))

export const SendUserFileTool = buildTool({
  name: SEND_USER_FILE_TOOL_NAME,
  maxResultSizeChars: 1000,
  searchHint: 'send a file to the user',
  get inputSchema() { return inputSchema() },
  get outputSchema() { return outputSchema() },
  isEnabled() {
    // Feature gate is at the import site (tools.ts: require gated on KAIROS).
    // The file is only loaded when the feature is active.
    return getKairosActive()
  },
  isConcurrencySafe() { return true },
  isReadOnly() { return true },
  async description() { return DESCRIPTION },
  async prompt() { return SEND_USER_FILE_TOOL_PROMPT },
  mapToolResultToToolResultBlockParam(o, id) {
    return { tool_use_id: id, type: 'tool_result', content: 'File sent.' }
  },
  renderToolUseMessage() { return 'Sending file...' },
  async call() { return { data: { ok: true } } },
})
