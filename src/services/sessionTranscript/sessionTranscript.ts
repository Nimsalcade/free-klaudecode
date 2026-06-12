/**
 * Stub: Session transcript persistence.
 *
 * In production Anthropic Code, this writes assistant session transcripts
 * to the sessions directory for durability across crashes. For our initial
 * KAIROS implementation, this is a no-op.
 */
export function flushOnDateChange(
  _messages: unknown[],
  _currentDate: string,
): void {
  // Stub
}

export function writeSessionTranscriptSegment(_messages: unknown[]): void {
  // Stub
}
