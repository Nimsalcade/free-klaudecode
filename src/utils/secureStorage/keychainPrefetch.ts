/**
 * Keychain prefetch is disabled — no Anthropic connections are permitted.
 * All macOS security(1) subprocesses that would read OAuth tokens from the
 * keychain are skipped, avoiding hangs under isolated HOME directories.
 */

/**
 * No-op: keychain reads are never needed without Anthropic auth.
 */
export function startKeychainPrefetch(): void {}

/**
 * Resolves immediately — no prefetch was started.
 */
export async function ensureKeychainPrefetchCompleted(): Promise<void> {}

/**
 * Always returns null — no prefetch data is ever available.
 */
export function getLegacyApiKeyPrefetchResult(): {
  stdout: string | null
} | null {
  return null
}

/**
 * No-op.
 */
export function clearLegacyApiKeyPrefetch(): void {}
