import { useEffect } from 'react'

// Module-level state - not in bootstrap/state.ts because this module is
// conditionally required (DCE'd when PROACTIVE/KAIROS are not enabled).
let proactiveActive = false
let proactivePaused = false
let contextBlocked = false
const subscribers = new Set<() => void>()

function notify() {
  for (const cb of subscribers) {
    cb()
  }
}

export function isProactiveActive(): boolean {
  return proactiveActive
}

export function isProactivePaused(): boolean {
  return proactivePaused
}

export function pauseProactive(): void {
  proactivePaused = true
  notify()
}

export function resumeProactive(): void {
  proactivePaused = false
  notify()
}

export function setContextBlocked(blocked: boolean): void {
  contextBlocked = blocked
  notify()
}

export function isContextBlocked(): boolean {
  return contextBlocked
}

export function activateProactive(source: string): void {
  proactiveActive = true
  contextBlocked = false
  notify()
}

export function deactivateProactive(): void {
  proactiveActive = false
  proactivePaused = false
  contextBlocked = false
  notify()
}

export function subscribeToProactiveChanges(callback: () => void): () => void {
  subscribers.add(callback)
  return () => {
    subscribers.delete(callback)
  }
}

let onTickSubmit: ((prompt: string) => void) | undefined
let onTickQueue: ((prompt: string) => void) | undefined

export function useProactive(opts?: {
  onSubmitTick?: (prompt: string) => void
  onQueueTick?: (prompt: string) => void
}): void {
  useEffect(() => {
    if (opts?.onSubmitTick) {
      onTickSubmit = opts.onSubmitTick
    }
    if (opts?.onQueueTick) {
      onTickQueue = opts.onQueueTick
    }
    return () => {
      onTickSubmit = undefined
      onTickQueue = undefined
    }
  }, [opts?.onSubmitTick, opts?.onQueueTick])
}

// Internal — called by scheduleProactiveTick to route ticks through
// the REPL-level handlers when they're registered.
export function getTickHandlers() {
  return { onSubmitTick: onTickSubmit, onQueueTick: onTickQueue }
}
