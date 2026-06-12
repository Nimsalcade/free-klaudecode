import { readFile } from 'fs/promises'
import { join } from 'path'
import { isEnvTruthy } from '../utils/envUtils.js'

/**
 * Check whether KAIROS assistant mode is enabled.
 *
 * Replaces the GrowthBook `tengu_kairos` remote config gate with
 * self-contained local checks:
 *   1. KAIROS_ENABLED env var (for testing / CI)
 *   2. assistant: true in .claude/settings.json
 *
 * Called from main.tsx during bootstrap. Async because main.tsx awaits it,
 * though the checks themselves are fast.
 */
export async function isKairosEnabled(): Promise<boolean> {
  // 1. Env var override — fastest path
  if (isEnvTruthy(process.env.KAIROS_ENABLED)) {
    return true
  }

  // 2. Settings file — check .claude/settings.json
  try {
    const settingsPath = join(process.cwd(), '.claude', 'settings.json')
    const raw = await readFile(settingsPath, 'utf-8')
    const settings = JSON.parse(raw) as Record<string, unknown>
    if (settings.assistant === true) {
      return true
    }
  } catch {
    // File missing or malformed — fall through to default
  }

  return false
}
