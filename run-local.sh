#!/usr/bin/env bash
#
# run-local.sh — launch free-code against a local OpenAI-compatible model.
#
# Zero-config helper so you don't have to paste env vars by hand. Defaults to
# Ollama on localhost; override via the env vars below before running.
#
# Usage:
#   ./run-local.sh                       # interactive REPL
#   ./run-local.sh -p "write a haiku"    # one-shot print mode
#   echo "hi" | ./run-local.sh -p        # one-shot via stdin
#
# Override defaults if needed:
#   CLAUDE_CODE_LOCAL_MODEL=llama3.1:8b ./run-local.sh
#   CLAUDE_CODE_LOCAL_BASE_URL=http://localhost:1234/v1 ./run-local.sh

set -euo pipefail

# Always run from the repo root (the dir this script lives in), so ./cli
# resolves regardless of where you invoke it from.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Provider config — these are exported for the child process only.
export CLAUDE_CODE_USE_LOCAL=1
export CLAUDE_CODE_LOCAL_MODEL="${CLAUDE_CODE_LOCAL_MODEL:-qwen2.5-coder:7b}"
export CLAUDE_CODE_LOCAL_BASE_URL="${CLAUDE_CODE_LOCAL_BASE_URL:-http://localhost:11434/v1}"

# When running a local model you typically don't want Anthropic-account
# baggage. Disable claude.ai-synced MCP servers by default — a stale/unreachable
# synced server otherwise blocks startup before the local model is ever called.
# Override by exporting ENABLE_CLAUDEAI_MCP_SERVERS=1 before running this script.
export ENABLE_CLAUDEAI_MCP_SERVERS="${ENABLE_CLAUDEAI_MCP_SERVERS:-0}"

# Build the binary if it isn't there yet.
if [[ ! -x ./cli ]]; then
  echo "[run-local] ./cli not found — building (one-time, ~30s)..." >&2
  bun run build
fi

# Sanity-check the local server is reachable before launching, so a missing
# Ollama gives a clear message instead of a silent hang.
if ! curl -fsS "${CLAUDE_CODE_LOCAL_BASE_URL}/models" >/dev/null 2>&1; then
  echo "[run-local] WARNING: no OpenAI-compatible server reachable at" >&2
  echo "            ${CLAUDE_CODE_LOCAL_BASE_URL}" >&2
  echo "            Start Ollama (it serves this by default) or set" >&2
  echo "            CLAUDE_CODE_LOCAL_BASE_URL to your server, then retry." >&2
else
  echo "[run-local] server OK at ${CLAUDE_CODE_LOCAL_BASE_URL}, model=${CLAUDE_CODE_LOCAL_MODEL}" >&2
fi

exec ./cli "$@"
