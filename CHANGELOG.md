# Changelog

All notable changes to this project are documented in this file.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [0.1.0] — 2026-05-22

### Added

**Package**
- Published as [`@quantthieres/ping-balloon`](https://www.npmjs.com/package/@quantthieres/ping-balloon) on the public npm registry
- CLI command: `ping-balloon`
- Install: `npm install -g @quantthieres/ping-balloon`

**App**
- Electron + React floating notification bubble, frameless and always-on-top
- Three visual states: `complete` (green), `waiting` (blue), `permission` (amber)
- Animated mascot (Claudinho) per state: bob animation for waiting, shake for permission
- Light/dark theme toggle
- Bubble dismiss button; re-appears automatically on the next notify event

**HTTP server**
- Local HTTP server on `http://127.0.0.1:47321`
- `GET /health` — liveness check
- `POST /notify` — trigger a state change with optional `title`, `message`, `meta`

**CLI (`ping-balloon`)**
- `dev` — start in development mode (Vite + Electron, hot-reload, source clone only)
- `start` — start using the production build in `dist/`
- `health` — check if the HTTP server is reachable
- `notify <state>` — send a notification with optional `--title`, `--message`, `--meta`
- `hooks install` / `hooks uninstall` — manage Claude Code hook wiring
- `doctor` — print a ✓/✗ diagnostics report (Node, Electron, build, hooks, server)
- `help` — show usage and examples

**Claude Code integration**
- Hook entry point `scripts/claude-hook-notify.js` reads the Claude Code JSON payload from stdin
- Smart routing: `Stop` → `complete`, `Notification` with permission keywords → `permission`, other `Notification` → `waiting`
- Debug mode: `AGENT_PING_HOOK_DEBUG=1` appends timestamped JSON to `.claude/agent-ping-hook-debug.log`
- `hooks install` writes to `.claude/settings.local.json` (project-scoped, git-ignored)

**Terminal focus on bubble click**
- macOS: AppleScript `tell application X to activate` (Warp, iTerm2, Terminal, VS Code)
- Windows: PowerShell `Microsoft.VisualBasic.Interaction.AppActivate` by PID

**Packaging**
- `npm pack` ready: `files` field, `prepack` builds automatically
- `electron` in `dependencies` so the installed package is self-contained
- `ping-balloon dev` gracefully blocked when `src/` is absent (installed package context)
- Cross-platform dev startup via `scripts/electron-dev.js` (no Unix-only env var syntax)
