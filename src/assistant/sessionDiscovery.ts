/**
 * Stub: session discovery for resuming existing KAIROS sessions.
 *
 * In production Anthropic Code, this queries the sessions directory for
 * existing assistant sessions that can be resumed via `--resume`. For our
 * initial KAIROS implementation, sessions always start fresh.
 */
export async function discoverSessions(): Promise<string[]> {
  return []
}
