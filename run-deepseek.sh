#!/usr/bin/env bash
#
# run-deepseek.sh — launch free-code against DeepSeek's NexusAI-compatible API.
#
# Zero-config helper so you don't have to paste env vars by hand.
# DeepSeek speaks the native NexusAI Messages API at /nexusai,
# so the standard SDK transport works — no translation adapter needed.
#
# Usage:
#   ./run-deepseek.sh                       # interactive REPL
#   ./run-deepseek.sh -p "write a haiku"    # one-shot print mode
#   echo "hi" | ./run-deepseek.sh -p        # one-shot via stdin
#
# Override defaults if needed:
#   ANTHROPIC_MODEL=deepseek-v4-flash ./run-deepseek.sh
#   DEEPSEEK_API_KEY=sk-xxx ./run-deepseek.sh

set -euo pipefail

# Always run from the repo root (the dir this script lives in), so ./cli
# resolves regardless of where you invoke it from.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# ── API Key ──────────────────────────────────────────────────────────
# Priority: DEEPSEEK_API_KEY > ANTHROPIC_AUTH_TOKEN > error
if [[ -n "${DEEPSEEK_API_KEY:-}" ]]; then
  export ANTHROPIC_AUTH_TOKEN="$DEEPSEEK_API_KEY"
elif [[ -z "${ANTHROPIC_AUTH_TOKEN:-}" ]]; then
  # Default key for convenience (user-provided during setup)
  export ANTHROPIC_AUTH_TOKEN="sk-238ea14029dc465fb2f783a81f5861d0"
fi

# ── Provider config ──────────────────────────────────────────────────
# DeepSeek's NexusAI-compatible endpoint. The SDK sends native
# NexusAI Messages API format — DeepSeek handles the translation.
export ANTHROPIC_BASE_URL="${ANTHROPIC_BASE_URL:-https://api.deepseek.com/anthropic}"

# Model overrides: map DeepCLI model tiers to DeepSeek equivalents.
# DeepSeek also does server-side mapping (deepcli-opus → deepseek-v4-pro,
# deepcli-haiku/sonnet → deepseek-v4-flash), but explicit overrides
# are clearer and avoid ambiguity.
export ANTHROPIC_MODEL="${ANTHROPIC_MODEL:-deepseek-v4-pro[1m]}"
export ANTHROPIC_DEFAULT_OPUS_MODEL="${ANTHROPIC_DEFAULT_OPUS_MODEL:-deepseek-v4-pro[1m]}"
export ANTHROPIC_DEFAULT_SONNET_MODEL="${ANTHROPIC_DEFAULT_SONNET_MODEL:-deepseek-v4-pro[1m]}"
export ANTHROPIC_DEFAULT_HAIKU_MODEL="${ANTHROPIC_DEFAULT_HAIKU_MODEL:-deepseek-v4-pro[1m]}"
export DEEPCLI_SUBAGENT_MODEL="${DEEPCLI_SUBAGENT_MODEL:-deepseek-v4-pro[1m]}"
export DEEPCLI_EFFORT_LEVEL="${DEEPCLI_EFFORT_LEVEL:-max}"

# Disable claude.ai-synced MCP servers — they're Anthropic-account-specific
# and will fail/block when using DeepSeek.
export ENABLE_CLAUDEAI_MCP_SERVERS="${ENABLE_CLAUDEAI_MCP_SERVERS:-0}"

# Emit startup checkpoints for debugging hang issues.
export DEEPCLI_PROFILE_STARTUP="${DEEPCLI_PROFILE_STARTUP:-1}"

# Clear any inherited NexusAI API key that would conflict with the
# DeepSeek auth token (ANTHROPIC_AUTH_TOKEN takes priority in the SDK,
# but an API key could confuse downstream logic).
unset ANTHROPIC_API_KEY 2>/dev/null || true

# ── HOME isolation ─────────────────────────────────────────────────────
# By default, isolate the config directory so the CLI never reads from
# or writes to the official ~/.deepcli directory. This guarantees it won't
# pick up NexusAI login data or cross-pollinate settings.
DEEPSEEK_HOME="${DEEPSEEK_HOME:-$HOME/.free-code-deepseek}"
mkdir -p "$DEEPSEEK_HOME"
export HOME="$DEEPSEEK_HOME"

# ── Build ────────────────────────────────────────────────────────────
if [[ ! -x ./cli ]]; then
  echo "[run-deepseek] ./cli not found — building (one-time, ~30s)..." >&2
  bun run ./scripts/build.ts --feature=ULTRAPLAN
fi

# ── Sanity check ─────────────────────────────────────────────────────
# Quick check that the DeepSeek endpoint is reachable.
# The /nexusai endpoint only responds to POST, so we send a minimal
# request — a 4xx proves the server is up; only connection failures warn.
if curl -fsS --max-time 5 -X POST \
     -H "Content-Type: application/json" \
     -H "x-api-key: ${ANTHROPIC_AUTH_TOKEN}" \
     -d '{}' \
     "${ANTHROPIC_BASE_URL}/v1/messages" > /dev/null 2>&1 || \
   curl -sS --max-time 5 -o /dev/null -w '%{http_code}' -X POST \
     -H "Content-Type: application/json" \
     -H "x-api-key: ${ANTHROPIC_AUTH_TOKEN}" \
     -d '{}' \
     "${ANTHROPIC_BASE_URL}/v1/messages" 2>/dev/null | grep -qE '^[2-4]'; then
  echo "[run-deepseek] DeepSeek API reachable at ${ANTHROPIC_BASE_URL}" >&2
  echo "[run-deepseek] model=${ANTHROPIC_MODEL}, subagent=${DEEPCLI_SUBAGENT_MODEL}" >&2
else
  echo "[run-deepseek] WARNING: could not reach ${ANTHROPIC_BASE_URL}" >&2
  echo "            Check your network or ANTHROPIC_BASE_URL setting." >&2
fi

exec ./cli "$@"
