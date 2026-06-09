<p align="center">
  <h1 align="center">DeepCLI (Deep Monochrome Edition)</h1>
</p>

<p align="center">
  <strong>The world's most powerful, sandboxed AI coding agent terminal.</strong><br>
  Built with React & Ink. Powered by DeepSeek-V4-Pro.
</p>

---

## ⚡️ Deep Monochrome Edition

DeepCLI has been completely overhauled with the **Deep Monochrome** aesthetic:
- Pure `#000000` backgrounds
- Stark white typography
- Electric Cyan (`#00FFFF`) accents and geometric monograms
- Hard double-line (`═══`) borders

### ✨ New Features

1. **System Dashboard (`Ctrl+S`)**
   Toggle a beautiful real-time dashboard overlay directly in the terminal! It features a mock CPU monitor with sparkline charts, memory usage stats, and a live table of active subagents.
2. **DeepSeek Integration**
   Use `./run-deepseek.sh` to automatically run DeepCLI using the Anthropic API compatibility proxy connected to DeepSeek-V4-Pro.
3. **Ultraplan Multi-Agent Architecture**
   Run `/ultraplan <prompt>` to trigger local multi-agent planning. DeepSeek-V4-Pro handles huge contexts, spawns parallel subagents, modifies files directly, and automatically fixes build errors. 

---

## 🚀 Quick Start

Ensure you have [Bun](https://bun.sh/) installed, then run:

```bash
# Clone the repository
git clone https://github.com/Nimsalcade/free-klaudecode.git
cd free-klaudecode

# Build the CLI with all experimental features unlocked
bun run scripts/build.ts --feature=ULTRAPLAN --dev

# Run DeepCLI with DeepSeek-V4-Pro
./run-deepseek.sh --dangerously-skip-permissions
```

*(Note: `--dangerously-skip-permissions` allows the agent to run terminal commands without pausing for your approval).*

## ⌨️ Shortcuts & Controls

| Shortcut | Action |
|---|---|
| `Ctrl+S` | Toggle the System Dashboard overlay |
| `Ctrl+O` | Expand background task output |
| `Ctrl+T` | Hide tasks |
| `Shift+Tab` | Cycle permission bypass modes |
| `Esc` | Interrupt agent or close dashboard |

## 🏗 Architecture

DeepCLI is a massive TypeScript project:
- **Terminal UI**: React + [Ink](https://github.com/vadimdemedes/ink)
- **State Management**: Zustand-style global `AppStateStore`
- **Agent Sandbox**: Strict filesystem and execution sandboxing
- **Feature Flags**: 54+ experimental features conditionally compiled via `bun:bundle`

---

*This project is an advanced agentic coding environment built for elite engineering workflows.*
