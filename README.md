<table>
<tr>

<td valign="middle">

<pre>
██████╗ ██╗███╗  ██╗ ██████╗   ██████╗   ████╗ ██╗     ██╗      █████╗  █████╗ ███╗  ██╗
██╔══██╗██║████╗ ██║██╔════╝   ██╔══██╗██╔══██╗██║     ██║     ██╔══██╗██╔══██╗████╗ ██║
██████╔╝██║██╔██╗██║██║   ██╗  ██████╦╝███████║██║     ██║     ██║  ██║██║  ██║██╔██╗██║
██╔═══╝ ██║██║╚████║██║   ██╗  ██╔══██╗██╔══██║██║     ██║     ██║  ██║██║  ██║██║╚████║
██║     ██║██║ ╚███║╚██████╔╝  ██████╦╝██║  ██║███████╗███████╗╚█████╔╝╚█████╔╝██║ ╚███║
╚═╝     ╚═╝╚═╝  ╚══╝ ╚═════╝   ╚═════╝  ═╝  ╚═╝╚══════╝╚══════╝ ╚════╝  ╚════╝ ╚═╝  ╚══╝
</pre>

</td>

<td valign="middle">

<img src="src/components/mascots/complete.png" width="110">

</td>

</tr>
</table>

[![npm version](https://img.shields.io/npm/v/@quantthieres/ping-balloon?label=npm&color=CB3837)](https://www.npmjs.com/package/@quantthieres/ping-balloon)
[![license MIT](https://img.shields.io/npm/l/@quantthieres/ping-balloon?color=2ea44f)](./LICENSE)
[![CI](https://github.com/quantthieres/ping-claude-balloon/actions/workflows/ci.yml/badge.svg)](https://github.com/quantthieres/ping-claude-balloon/actions/workflows/ci.yml)
[![GitHub release](https://img.shields.io/github/v/release/quantthieres/ping-claude-balloon?label=release)](https://github.com/quantthieres/ping-claude-balloon/releases)
[![Claude Code](https://img.shields.io/badge/Claude%20Code-hooks-8A2BE2)](https://github.com/quantthieres/ping-claude-balloon)
[![macOS](https://img.shields.io/badge/macOS-supported-black)](https://github.com/quantthieres/ping-claude-balloon)
[![Windows](https://img.shields.io/badge/Windows-best--effort-0078D4)](https://github.com/quantthieres/ping-claude-balloon)

> Ping Balloon — desktop notification bubble for terminal coding agents.

A floating bubble that sits in the corner of your screen and tells you when Claude finishes a task or needs your approval. The bubble is **hidden by default** — it only appears when something actually requires your attention.

| State | Colour | Behaviour |
|---|---|---|
| **complete** | Green | Appears, plays a short sound, auto-hides after 6 s |
| **permission** | Amber | Appears, plays a sound, stays visible until you act |
| **waiting** | Blue | Hidden by default — debug/optional (see [Environment Variables](#environment-variables)) |

Clicking the bubble brings your terminal or editor back into focus, then hides the bubble.

---

## Quick Start

### 1. Install from npm

```bash
npm install -g @quantthieres/ping-balloon@latest
```

Verify the installation:

```bash
ping-balloon help
ping-balloon doctor
```

### 2. Start Ping Balloon

```bash
ping-balloon start
```

This starts the app. The window opens but **the bubble stays hidden** until an event arrives — no visible clutter while you work. Keep this terminal open for as long as you want to receive notifications.

### 3. Test manually

In a second terminal:

```bash
ping-balloon health                    # confirm the server is up
ping-balloon notify complete           # bubble appears, plays sound, auto-hides
ping-balloon notify permission         # bubble appears, plays sound, stays visible
```

### 4. Use with Claude Code

**Terminal 1** — start Ping Balloon (keep running):

```bash
ping-balloon start
```

**Terminal 2** — inside your project:

```bash
cd path/to/your/project
ping-balloon hooks install
claude
```

`hooks install` needs to be run **once per project**. It writes to `.claude/settings.local.json`. If Ping Balloon is not running when Claude triggers a hook, the hook exits silently — it will never interrupt or block Claude Code.

### 5. Remove hooks

```bash
ping-balloon hooks uninstall
```

Removes only Ping Balloon entries from `.claude/settings.local.json`. Other hooks are untouched.

### 6. Update Ping Balloon

```bash
npm install -g @quantthieres/ping-balloon@latest
```

### 7. Optional — run without installing

```bash
npx --package=@quantthieres/ping-balloon ping-balloon help
npx --package=@quantthieres/ping-balloon ping-balloon start
```

For everyday use the global install (`npm install -g`) is simpler.

---

## Requirements

- **Node.js** >= 18
- **macOS** (10.15+) or **Windows** (10+)
- [Claude Code](https://claude.ai/code) for hook integration (optional but recommended)

> Linux is not tested. The Electron window may open but terminal focus is not implemented.

---

## CLI Commands

```
ping-balloon <command> [args]
```

| Command | Description |
|---|---|
| `start` | Start using the production build in `dist/` |
| `dev` | Start in dev mode — Vite dev server + Electron (source clone only) |
| `health` | Check if the HTTP server is reachable |
| `notify <state>` | Send a state change to the bubble |
| `hooks install` | Wire Claude Code hooks in `.claude/settings.local.json` |
| `hooks uninstall` | Remove Ping Balloon hooks |
| `doctor` | Print a diagnostics report |
| `help` | Show usage and examples |

### `notify` flags

```bash
ping-balloon notify complete
ping-balloon notify permission --title "Approval needed" --message "Allow bash?" --meta "Bash"
ping-balloon notify waiting     # debug/optional — hidden by default from hooks
```
<p align="center">
  <img src="https://raw.githubusercontent.com/quantthieres/ping-claude-balloon/main/assets/ping-balloon-demo.gif" alt="Ping Balloon demo" width="900">
</p>

---

## HTTP API

When Ping Balloon is running it exposes a local server on `http://127.0.0.1:47321`.

### GET /health

```bash
curl http://127.0.0.1:47321/health
# → {"ok":true,"app":"agent-ping"}
```

> **Note:** `"app":"agent-ping"` is an internal server identifier kept for compatibility.

### POST /notify

```bash
curl -X POST http://127.0.0.1:47321/notify \
  -H 'Content-Type: application/json' \
  -d '{"state":"complete"}'
```

| Field | Type | Required |
|---|---|---|
| `state` | `"complete"` \| `"waiting"` \| `"permission"` | ✓ |
| `title` | string | — |
| `message` | string | — |
| `meta` | string | — |

---

## Claude Code Integration

Ping Balloon hooks into Claude Code to update the bubble automatically as Claude works.

### Install hooks

```bash
# Terminal 1 — Ping Balloon must be running
ping-balloon start

# Terminal 2 — inside your project
ping-balloon hooks install
```

This writes to `.claude/settings.local.json` (project-scoped, typically git-ignored). Existing hooks from other tools are preserved.

### Event routing

| Claude Code event | Condition | Bubble behaviour |
|---|---|---|
| `Stop` (task done) | always | **complete** — plays sound, auto-hides after 6 s |
| `Notification` | message contains a permission keyword | **permission** — plays sound, stays until dismissed |
| `Notification` | generic / idle | **ignored by default** — set `PING_BALLOON_SHOW_WAITING=1` to re-enable |

**Permission keywords** (case-insensitive): `permission`, `allow`, `approve`, `authorize`, `grant`, `blocked`, `requires approval`, `do you want to`, `confirm`

Generic idle notifications are suppressed so the bubble does not flash every time Claude is just thinking. Only task completion and permission requests produce a visible notification.

### Debug mode

```bash
AGENT_PING_HOOK_DEBUG=1 node scripts/claude-hook-notify.js Stop
cat .claude/agent-ping-hook-debug.log
```

Each hook invocation appends a JSON line with timestamp, event, payload, chosen state (or `skip`), and HTTP result.

### Remove hooks

```bash
ping-balloon hooks uninstall
```

Only Ping Balloon entries are removed. Other hooks in the same file are preserved.

---

## Environment Variables

Set these before starting Ping Balloon or before running a hook.

| Variable | Default | Effect |
|---|---|---|
| `PING_BALLOON_SOUND=0` | sound on | Silence all notification sounds |
| `PING_BALLOON_SHOW_WAITING=1` | suppressed | Show the waiting bubble for generic Claude Code notifications |
| `AGENT_PING_HOOK_DEBUG=1` | off | Append debug JSON to `.claude/agent-ping-hook-debug.log` |

### Disabling sounds

```bash
PING_BALLOON_SOUND=0 ping-balloon start
```

### Re-enabling waiting/idle notifications

By default, generic `Notification` events from Claude Code (idle, thinking) are silently ignored. To restore the previous behaviour:

```bash
PING_BALLOON_SHOW_WAITING=1 ping-balloon start
```

> `PING_BALLOON_SHOW_WAITING` is read by `claude-hook-notify.js` at hook invocation time. Set it as a shell environment variable or in your shell profile.

---

## Terminal Focus on Click

Clicking the notification bubble tries to bring your terminal or editor to the front.

- If focus **succeeds**, the bubble hides automatically.
- If focus **fails** (no supported app found, permission not granted), the bubble stays visible — dismiss it manually with ×.

### macOS

Apps tried in order:

| Priority | App |
|---|---|
| 1 | Warp |
| 2 | iTerm2 |
| 3 | Terminal |
| 4 | Visual Studio Code |

Uses AppleScript `tell application X to activate`. On first use macOS may show an Automation permission dialog — approve it for focus to work.

### Windows

Apps tried in order:

| Priority | App |
|---|---|
| 1 | Windows Terminal |
| 2 | PowerShell (`pwsh`, `powershell`) |
| 3 | cmd |
| 4 | Visual Studio Code |

Uses PowerShell `AppActivate` by PID. The Windows foreground lock may cause the app to flash in the taskbar rather than fully focus.

---

## npm Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Vite + Electron in development mode |
| `npm run build` | Build the React app into `dist/` |
| `npm start` | Start Electron loading `dist/` (production) |
| `npm run doctor` | Run `ping-balloon doctor` |
| `npm run health` | Check if the server is up |
| `npm run notify:complete` | Send `complete` state |
| `npm run notify:waiting` | Send `waiting` state (debug) |
| `npm run notify:permission` | Send `permission` state |
| `npm run hooks:install` | Install Claude Code hooks |
| `npm run hooks:uninstall` | Remove Claude Code hooks |

---

## Manual Test Checklist

Use this checklist before tagging a release.

**App startup**
- [ ] `npm run build` completes without errors
- [ ] `ping-balloon start` starts the process — **no bubble visible on launch**
- [ ] `ping-balloon health` returns `{"ok":true,"app":"agent-ping"}`
- [ ] `ping-balloon doctor` reports all ✓

**Bubble states and timing**
- [ ] `ping-balloon notify complete` → green bubble, DONE label, sound plays, **auto-hides after ~6 s**
- [ ] `ping-balloon notify permission` → amber bubble, HOLD label, sound plays, **stays visible**
- [ ] `ping-balloon notify waiting` → blue bubble, IDLE label, sound plays, **auto-hides after ~8 s**
- [ ] Dismiss (×) hides the bubble immediately (cancels any auto-hide timer)
- [ ] Any `notify` call re-shows the bubble regardless of current visibility

**Sound**
- [ ] Sound plays on `complete`, `permission`, `waiting` events
- [ ] Theme toggle (☾/☀) produces **no sound**
- [ ] `PING_BALLOON_SOUND=0 ping-balloon start` → bubble appears but **no sound**

**Theme**
- [ ] ☾/☀ button toggles light/dark theme
- [ ] Clicking the theme button does **not** dismiss the bubble or focus the terminal

**Bubble click — terminal focus** (macOS)
- [ ] Single click on the bubble body attempts terminal focus
- [ ] If focus succeeds → terminal comes to front, bubble hides
- [ ] If focus fails → bubble stays visible
- [ ] Double-click does not trigger two focus calls (guard active)

**Claude Code hook routing**
- [ ] `echo '{"hook_event_name":"Stop"}' | node scripts/claude-hook-notify.js Stop` → complete bubble appears
- [ ] `echo '{"hook_event_name":"Notification","message":"Permission required"}' | node scripts/claude-hook-notify.js Notification` → permission bubble
- [ ] `echo '{"hook_event_name":"Notification","message":"Waiting for input"}' | node scripts/claude-hook-notify.js Notification` → **no bubble** (suppressed)
- [ ] `PING_BALLOON_SHOW_WAITING=1 echo '...' | node scripts/claude-hook-notify.js Notification` → waiting bubble
- [ ] `ping-balloon hooks install` writes to `.claude/settings.local.json`
- [ ] Claude Code `Stop` hook → complete bubble
- [ ] `ping-balloon hooks uninstall` removes entries cleanly

**CLI edge cases**
- [ ] `ping-balloon notify invalid` → error, exit 1
- [ ] `ping-balloon foobar` → "Unknown command", exit 1
- [ ] `ping-balloon health` when not running → clear error, exit 1
- [ ] `ping-balloon start` when `dist/` is missing → clear error, exit 1

**Package**
- [ ] `npm pack --dry-run` lists only expected files (no `src/`, `node_modules/`, `.claude/`)
- [ ] Version shown is `0.2.0`

---

## Known Limitations

- **`ping-balloon dev`** is only available when running from a source clone (requires `src/` and Vite). Shows a clear error from an installed package.
- **Hook routing** (`permission` vs ignored) depends on Claude Code's Notification payload text. If Claude Code changes its message format, keywords in `scripts/claude-hook-notify.js` may need updating.
- **`Stop` hook** cannot distinguish a completed task from a cancelled one — always shows `complete`.
- **Rapid notifications** overwrite each other; the bubble shows the last state received.
- **macOS Automation permission** must be granted to Ping Balloon on first use for terminal focus to work. macOS will show a permission dialog automatically.
- **Windows terminal focus** is best-effort — the foreground lock may cause the app to flash in the taskbar rather than fully focus.
- **Notification sound** depends on OS audio output being available and not muted at the system level.
- **Linux** is not tested. The Electron window may open but terminal focus is not implemented.
- **Fixed port** — the server runs on 47321. If that port is in use, the server will fail silently.
- **Internal identifiers** (`"app":"agent-ping"` in the HTTP response, `agent-ping-hook-debug.log`, `AGENT_PING_HOOK_DEBUG`) are legacy names kept for backward compatibility.

---

## Development

```bash
git clone https://github.com/quantthieres/ping-claude-balloon.git
cd ping-claude-balloon/agent-ping-desktop

npm install       # install all dependencies
npm run dev       # Vite hot-reload + Electron
```

### Project structure

```
agent-ping-desktop/
├── bin/
│   └── agent-ping.js            ← CLI entry point (ping-balloon command)
├── electron/
│   ├── main.js                  ← Electron main process + HTTP server
│   ├── preload.js               ← IPC bridge (contextBridge)
│   └── focus-terminal.js        ← macOS / Windows terminal focus
├── scripts/
│   ├── claude-hook-notify.js    ← Hook entry point (reads stdin, routes state)
│   ├── electron-dev.js          ← Cross-platform Electron dev launcher
│   ├── notify.js                ← HTTP helper for npm scripts
│   ├── install-claude-hooks.js
│   └── uninstall-claude-hooks.js
├── src/
│   ├── App.jsx                  ← State switcher, IPC listener, sound, timers
│   ├── main.jsx
│   └── components/
│       ├── BubbleNotification.jsx
│       ├── BubbleNotification.css
│       ├── state-config.js
│       └── mascots/             ← complete.png, waiting.png, permission.png
├── dist/                        ← Production build (generated by npm run build)
├── package.json
├── README.md
├── CHANGELOG.md
└── LICENSE
```

### Building

```bash
npm run build           # build React app into dist/
npm pack                # creates .tgz (runs build first via prepack)
npm pack --dry-run      # preview contents without writing the file
```

---

## License

[MIT](LICENSE) — © 2026 quantthieres
