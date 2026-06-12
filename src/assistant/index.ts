import { getKairosActive } from '../bootstrap/state.js'

let assistantForced = false
let activationPath: string | null = null

export function isAssistantMode(): boolean {
  return getKairosActive()
}

export function isAssistantForced(): boolean {
  return assistantForced
}

export function markAssistantForced(): void {
  assistantForced = true
}

export function getAssistantActivationPath(): string | null {
  return activationPath
}

/**
 * Initialize the assistant "team" — a pre-seeded background-agent group.
 *
 * In the production Anthropic implementation, this calls into the agent swarm
 * subsystem to pre-seed worker agents. For our DeepSeek fork, this is a no-op:
 * agent swarms require coordinator mode, which is not part of the initial
 * KAIROS implementation scope.
 */
export async function initializeAssistantTeam(): Promise<void> {
  activationPath = 'settings'
}
