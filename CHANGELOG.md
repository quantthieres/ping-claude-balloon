# Changelog

All notable changes to this project are documented in this file.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [0.2.0] — 2026-05-23

### Added

**Event-only notification mode**
- Bubble is now **hidden on startup** — the window starts invisible and only appears when a real event arrives
- `complete` (Task done) — auto-hides after **6 seconds**
- `permission` (Permission needed) — **persistent** until the user clicks or dismisses
- `waiting` (Waiting for input) — auto-hides after **8 seconds** when shown; disabled by default from hooks

**Hook filtering**
- Generic / idle `Notification` events are **suppressed by default** — no more noise while Claude is just thinking
- Set `PING_BALLOON_SHOW_WAITING=1` to restore the previous behaviour (waiting bubble on any Notification)
- `Stop` → `complete` and permission `Notification` → `permission` are unaffected and always show

**Sound**
- Short, discrete sound plays whenever the bubble appears (Web Audio API — no external audio file)
- `complete`: soft two-note ascending chime (C5 → E5)
- `permission`: three quick ascending beeps (more attention-grabbing)
- `waiting` (debug): single soft pulse
- Set `PING_BALLOON_SOUND=0` to silence all sounds
- Sound is **on by default**; theme toggle and bubble restore do not play any sound

**Dismiss & focus behaviour**
- Clicking the bubble body now **focuses the terminal and then hides the bubble**
- Clicking the **× button** hides the bubble immediately
- Theme toggle (☾/☀) still works independently and does **not** dismiss or focus the terminal

### Changed

- Window starts **hidden** instead of visible — `ping-balloon start` no longer shows a bubble immediately
- `claude-hook-notify.js`: generic `Notification` events no longer trigger a `/notify` request by default
- `handleFocusTerminal` now always dismisses the bubble after attempting focus (was focus-only before)

### Environment variables

| Variable | Default | Effect |
|---|---|---|
| `PING_BALLOON_SOUND=0` | sound on | Silence all notification sounds |
| `PING_BALLOON_SHOW_WAITING=1` | suppressed | Show `waiting` bubble on generic Notification hooks |
| `AGENT_PING_HOOK_DEBUG=1` | off | Append timestamped debug JSON to `.claude/agent-ping-hook-debug.log` |

---

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
