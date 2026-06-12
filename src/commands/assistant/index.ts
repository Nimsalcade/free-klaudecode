import {
  getKairosActive,
  setKairosActive,
} from '../../bootstrap/state.js'
import {
  activateProactive,
  deactivateProactive,
} from '../../proactive/index.js'
import type { Command } from '../../types/command.js'

const assistant: Command = {
  type: 'local-jsx',
  name: 'assistant',
  description: 'Toggle KAIROS assistant mode (always-on background agent)',
  // Feature gate is at the import site (commands.ts: require gated on KAIROS).
  // This file is only loaded when the feature is active.
  isEnabled: () => true,
  immediate: true,
  load: () =>
    Promise.resolve({
      async call(onDone) {
        const current = getKairosActive()
        if (!current) {
          setKairosActive(true)
          activateProactive('slash-command')
          onDone('KAIROS assistant mode activated', { display: 'system' })
        } else {
          setKairosActive(false)
          deactivateProactive()
          onDone('KAIROS assistant mode deactivated', { display: 'system' })
        }
        return null
      },
    }),
} satisfies Command

export default assistant
