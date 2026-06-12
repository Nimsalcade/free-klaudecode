import {
  activateProactive,
  deactivateProactive,
  isProactiveActive,
} from '../proactive/index.js'
import type { Command } from '../types/command.js'

const proactive: Command = {
  type: 'local-jsx',
  name: 'proactive',
  description: 'Toggle proactive/autonomous mode',
  // Feature gate is at the import site (commands.ts: require gated on PROACTIVE || KAIROS).
  // This file is only loaded when the feature is active.
  isEnabled: () => true,
  immediate: true,
  load: () =>
    Promise.resolve({
      async call(onDone) {
        if (isProactiveActive()) {
          deactivateProactive()
          onDone('Proactive mode deactivated', { display: 'system' })
        } else {
          activateProactive('slash-command')
          onDone('Proactive mode activated', { display: 'system' })
        }
        return null
      },
    }),
} satisfies Command

export default proactive
