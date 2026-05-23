# Changelog

All notable changes to this project are documented in this file.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [0.2.0] — 2026-05-23

### Summary

0.2.0 changes Ping Balloon from an always-visible bubble into an event-driven one: the window starts hidden and only appears when Claude finishes a task or needs permission. Generic idle/waiting notifications are suppressed by default. Notification sounds are added, and macOS terminal focus is simplified and made more reliable.

### Added

**Event-only notifications**
- Window starts **hidden** on launch — `ping-balloon start` shows no bubble until an event arrives
- `complete` — appears, plays a short sound, auto-hides after **6 seconds**
- `permission` — appears, plays a sound, stays visible until the user clicks or dismisses (×)
- `waiting` — appears and auto-hides after **8 seconds** when sent manually; **disabled by default from Claude Code hooks**

**Notification sounds (Web Audio API)**
- Short discrete sound plays whenever the bubble appears
- `complete`: soft two-note ascending chime (C5 → E5)
- `permission`: three quick ascending beeps — more attention-grabbing
- `waiting` (debug): single soft pulse
- Theme toggle and bubble restore do **not** play any sound
- No external audio files — generated via Web Audio API in the renderer

**Environment variables**
- `PING_BALLOON_SOUND=0` — silence all notification sounds (sound is on by default)
- `PING_BALLOON_SHOW_WAITING=1` — re-enable the waiting bubble for generic Claude Code `Notification` events
- `AGENT_PING_HOOK_DEBUG=1` — existing debug flag; now also logs `skip` decisions

**Dismiss and focus improvements**
- Clicking the bubble body now **focuses the terminal and then hides the bubble**
- Bubble hides after focus only if `focusTerminal` returns `ok: true`; on failure the bubble stays visible
- `isFocusingRef` guard prevents duplicate focus calls from double-clicks
- Clicking × still hides the bubble immediately without attempting focus

### Changed

**Hook routing in `claude-hook-notify.js`**
- Generic / idle `Notification` events are now **skipped** (return `null`) by default — no `/notify` request is sent
- `PING_BALLOON_SHOW_WAITING=1` restores the previous behaviour (sends `waiting` for any `Notification`)
- `Stop` → `complete` and permission `Notification` → `permission` are unchanged

**macOS terminal focus in `electron/focus-terminal.js`**
- Removed all pre-flight "is the app running?" checks (`pgrep`, AppleScript `is running`)
- Now attempts `tell application X to activate` directly for each app in priority order
- `osascript` exit 0 → success; non-zero → try next app
- Eliminates the failure mode where both checks returned `false` inside the Electron sandbox even when the target app was running
- Log prefix updated from `[agent-ping]` to `[ping-balloon]` throughout

**`src/App.jsx`**
- `visible` starts as `false` (was `true`)
- `onNotify` handler sets `visible: true`, plays sound, and schedules auto-hide timer
- `handleFocusTerminal` only calls `handleDismiss` on successful focus (was unconditional)

**`electron/main.js`**
- `BrowserWindow` created with `show: false` — window is hidden until first notify arrives

**`electron/preload.js`**
- Exposes `window.electronAPI.env.soundEnabled` from `PING_BALLOON_SOUND` env var

### Version

- Bumped to `0.2.0`

---

## [0.1.1] — 2026-05-22

Patch release — version bump and minor fixes after npm publication.

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
- Animated mascot per state: bob animation for waiting, shake-on-hover for permission
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
- `doctor` — print a ✓/✗ diagnostics report
- `help` — show usage and examples

**Claude Code integration**
- `scripts/claude-hook-notify.js` reads Claude Code JSON payload from stdin
- Routing: `Stop` → `complete`, permission `Notification` → `permission`, other `Notification` → `waiting`
- Debug mode: `AGENT_PING_HOOK_DEBUG=1`
- `hooks install` writes to `.claude/settings.local.json`

**Terminal focus on bubble click**
- macOS: AppleScript `tell application X to activate` (Warp, iTerm2, Terminal, VS Code)
- Windows: PowerShell `AppActivate` by PID
