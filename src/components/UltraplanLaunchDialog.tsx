import React from 'react'
import { Box, Text } from '../ink.js'
import { Select } from './CustomSelect/index.js'
import { Dialog } from './design-system/Dialog.js'

type UltraplanLaunchChoice = 'launch' | 'cancel'

type Props = {
  onChoice: (
    choice: UltraplanLaunchChoice,
    opts?: { disconnectedBridge?: boolean },
  ) => void
}

export function UltraplanLaunchDialog({ onChoice }: Props): React.ReactNode {
  return (
    <Dialog
      title="Launch ultraplan?"
      onCancel={() => onChoice('cancel')}
    >
      <Box flexDirection="column" gap={1}>
        <Text>
          This will start an advanced local planning session to draft a complex architectural plan using DeepSeek. The plan may take a few minutes to generate. Your terminal will be busy while it works.
        </Text>
      </Box>
      <Select
        options={[
          {
            value: 'launch' as const,
            label: 'Launch ultraplan',
          },
          {
            value: 'cancel' as const,
            label: 'Cancel',
          },
        ]}
        onChange={(value: UltraplanLaunchChoice) => onChoice(value)}
      />
    </Dialog>
  )
}
