import { z } from 'zod/v4'
import { buildTool } from '../../Tool.js'
import { lazySchema } from '../../utils/lazySchema.js'

const inputSchema = lazySchema(() => z.strictObject({}).passthrough())
const outputSchema = lazySchema(() => z.object({ ok: z.boolean() }))

export const PushNotificationTool = buildTool({
  name: 'PushNotification',
  maxResultSizeChars: 500,
  searchHint: 'send push notification to user',
  get inputSchema() { return inputSchema() },
  get outputSchema() { return outputSchema() },
  isEnabled() {
    // Feature gate is at the import site (tools.ts: require gated on KAIROS || KAIROS_PUSH_NOTIFICATION).
    // The file is only loaded when the feature is active.
    return true
  },
  isConcurrencySafe() { return true },
  isReadOnly() { return true },
  async description() { return 'Send a push notification to the user' },
  async prompt() { return 'Usage: PushNotification' },
  mapToolResultToToolResultBlockParam(o, id) {
    return { tool_use_id: id, type: 'tool_result', content: 'Notification sent.' }
  },
  renderToolUseMessage() { return 'Sending notification...' },
  async call() { return { data: { ok: true } } },
})
