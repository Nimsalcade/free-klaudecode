import * as React from 'react';
import { Box, Text } from '../../ink.js';

export type ClawdPose = 'default' | 'arms-up' | 'look-left' | 'look-right';

type Props = {
  pose?: ClawdPose;
};

export function Clawd({ pose = 'default' }: Props = {}): React.ReactNode {
  // A sleek, minimal monogram for DeepCLI replacing the legacy space invader
  return (
    <Box flexDirection="column" alignItems="center" marginRight={2}>
      <Text color="clawd_body"> ▛▀▀▜ ▛▀▀▖ </Text>
      <Text color="clawd_body"> ▌  ▐ ▌    </Text>
      <Text color="clawd_body"> ▙▄▄▟ ▙▄▄▘ </Text>
    </Box>
  );
}