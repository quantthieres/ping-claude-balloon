# Agent Ping

> A floating desktop notification bubble for [Claude Code](https://claude.ai/code) — know instantly when your agent is done, waiting for input, or needs permission.

Agent Ping sits in the corner of your screen and changes state as Claude works:

| State | Color | Meaning |
|---|---|---|
| **complete** | Green | Task finished — Claude stopped |
| **waiting** | Blue | Claude is idle, waiting for your next prompt |
| **permission** | Amber | Claude needs your approval to continue |

Clicking the bubble brings your terminal or editor back into focus automatically.

---

## Who is it for?

Developers who run Claude Code in a terminal while working in another window (browser, design tool, docs). Instead of alt-tabbing to check on Claude, Agent Ping tells you what's happening at a glance.

---

## Requirements

- **Node.js** >= 18
- **macOS** (10.15+) or **Windows** (10+)
- [Claude Code](https://claude.ai/code) for hook integration (optional but recommended)

> Linux is not tested. The Electron app may work but terminal focus is not implemented.

---

## Installation

### Option A — Install from local package (no clone required)

```bash
# 1. Get the .tgz from the repository releases
npm install /path/to/agent-ping-desktop-0.1.0.tgz

# 2. Start the app
npx agent-ping start

# 3. In a second terminal, verify it's running
npx agent-ping health
```

### Option B — Clone and run from source

```bash
git clone https://github.com/quantthieres/ping-claude-balloon.git
cd ping-claude-balloon/agent-ping-desktop

npm install
npm run build       # generate dist/
agent-ping start    # production mode
# or
npm run dev         # development mode (Vite + Electron, hot-reload)
```

After cloning you can also install the CLI globally:

```bash
npm link            # makes `agent-ping` available everywhere
agent-ping help
```

---

## CLI Commands

```
agent-ping <command> [args]
```

| Command | Description |
|---|---|
| `dev` | Start in dev mode — Vite dev server + Electron (requires source clone) |
| `start` | Start using the production build in `dist/` |
| `health` | Check if the HTTP server is reachable |
| `notify <state>` | Send a state change to the bubble |
| `hooks install` | Wire Claude Code hooks in `.claude/settings.local.json` |
| `hooks uninstall` | Remove Agent Ping hooks |
| `doctor` | Print a full diagnostics report |
| `help` | Show usage and examples |

### `notify` flags

```bash
agent-ping notify complete
agent-ping notify waiting  --message "Waiting for your input..."
agent-ping notify permission --title "Approval needed" --message "Allow bash?" --meta "Bash"
```

### `doctor` output

```
Agent Ping — Doctor Report

  ✓  Node.js v22.0.0
  ✓  Platform: darwin arm64
  ✓  package.json
  ✓  Electron installed
  ✓  Mascot images (3 PNG)
  ✓  Production build (dist/)
  ✓  HTTP server /health  http://127.0.0.1:47321
  ✓  .claude/settings.local.json
  ✓  Claude Code hooks  Stop + Notification → claude-hook-notify.js

All checks passed.
```

---

## HTTP API

When Agent Ping is running it exposes a local server on `http://127.0.0.1:47321`.

### GET /health

```bash
curl http://127.0.0.1:47321/health
# → {"ok":true,"app":"agent-ping"}
```

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

Agent Ping hooks into Claude Code to update the bubble automatically as Claude works.

### Install hooks

```bash
# Terminal 1 — Agent Ping must be running
agent-ping start

# Terminal 2
agent-ping hooks install
```

This writes to `.claude/settings.local.json` (project-scoped, git-ignored). Hooks from other tools are preserved.

### State mapping

| Claude Code event | Condition | Bubble state |
|---|---|---|
| `Stop` | always | `complete` (green) |
| `Notification` | message contains a permission keyword | `permission` (amber) |
| `Notification` | anything else | `waiting` (blue) |

**Permission keywords** (case-insensitive): `permission`, `allow`, `approve`, `authorize`, `grant`, `blocked`, `requires approval`, `do you want to`, `confirm`

The routing depends on the actual payload Claude Code sends. If the message contains none of these keywords the default is `waiting`.

### Debug mode

```bash
AGENT_PING_HOOK_DEBUG=1 node scripts/claude-hook-notify.js Stop
cat .claude/agent-ping-hook-debug.log
```

Each hook invocation appends a JSON line with timestamp, event, payload, chosen state, and HTTP result.

### Remove hooks

```bash
agent-ping hooks uninstall
```

Only Agent Ping entries are removed. Other hooks in the same file are preserved.

---

## Terminal Focus on Click

Clicking the notification bubble tries to bring your terminal or editor to the front.

### macOS

Apps tried in order (AppleScript `tell application X to activate`):

| Priority | App |
|---|---|
| 1 | Warp |
| 2 | iTerm2 |
| 3 | Terminal |
| 4 | Visual Studio Code |

On first run macOS may ask for Automation permission — accept it for focus to work.

### Windows

Apps tried in order (PowerShell `AppActivate` by PID):

| Priority | App |
|---|---|
| 1 | Windows Terminal |
| 2 | PowerShell (`pwsh`, `powershell`) |
| 3 | cmd |
| 4 | Visual Studio Code |

The Windows foreground lock may cause the app to only flash in the taskbar rather than fully focus.

---

## npm Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Vite + Electron in development mode |
| `npm run build` | Build the React app into `dist/` |
| `npm start` | Start Electron loading `dist/` (production) |
| `npm run doctor` | Run `agent-ping doctor` |
| `npm run health` | Check if the server is up |
| `npm run notify:complete` | Send `complete` state |
| `npm run notify:waiting` | Send `waiting` state |
| `npm run notify:permission` | Send `permission` state |
| `npm run hooks:install` | Install Claude Code hooks |
| `npm run hooks:uninstall` | Remove Claude Code hooks |

---

## Manual Test Checklist

Use this checklist before tagging a release.

**App startup**
- [ ] `npm run build` completes without errors
- [ ] `agent-ping start` opens the Electron window
- [ ] Window appears in the top-right corner, always on top
- [ ] `agent-ping health` returns `{"ok":true,"app":"agent-ping"}`

**Bubble states**
- [ ] `agent-ping notify complete` → green bubble, DONE label
- [ ] `agent-ping notify waiting` → blue bubble, IDLE label, bob animation
- [ ] `agent-ping notify permission` → amber bubble, HOLD label, shake animation
- [ ] Dismiss button (×) hides the bubble
- [ ] Next notify event makes the bubble reappear

**Theme**
- [ ] ◑/◐ button toggles light/dark theme correctly

**Bubble click — terminal focus** (macOS)
- [ ] Clicking the bubble focuses the active terminal app

**Claude Code hooks**
- [ ] `agent-ping hooks install` writes to `.claude/settings.local.json`
- [ ] Running a Claude Code prompt triggers the `Stop` hook → bubble shows `complete`
- [ ] `agent-ping hooks uninstall` removes entries without touching other hooks

**CLI edge cases**
- [ ] `agent-ping notify invalid` → error message, exit 1
- [ ] `agent-ping foobar` → "Unknown command", exit 1
- [ ] `agent-ping health` when app is not running → clear error, exit 1
- [ ] `agent-ping start` when `dist/` is missing → clear error, exit 1
- [ ] `agent-ping doctor` reports all ✓ when everything is set up

**Package**
- [ ] `npm pack --dry-run` shows only expected files (no `src/`, `node_modules/`, `.claude/`)
- [ ] Installing the `.tgz` in a fresh directory: `npx agent-ping start` works
- [ ] `npx agent-ping doctor` shows ✓ for Electron, mascots, and dist/

---

## Known Limitations

- **`agent-ping dev`** is only available when running from the source repository (requires `src/` and the Vite toolchain). It shows a clear error if run from an installed package.
- Hook routing (`permission` vs `waiting`) depends on the text in Claude Code's Notification payload. If Claude Code changes its message format a keyword update in `scripts/claude-hook-notify.js` may be needed.
- On `Stop`, the hook cannot distinguish a successful task from a cancelled one — always shows `complete`.
- Multiple rapid Notifications overwrite each other; the bubble shows the last state received.
- Linux is not tested. The Electron window may open but terminal focus will not work.
- The app runs on a fixed port (47321). If that port is in use, the server will fail silently.

---

## Development

```bash
git clone https://github.com/quantthieres/ping-claude-balloon.git
cd ping-claude-balloon/agent-ping-desktop

npm install       # installs all dependencies + devDependencies
npm run dev       # Vite hot-reload + Electron
```

### Project structure

```
agent-ping-desktop/
├── bin/
│   └── agent-ping.js            ← CLI entry point
├── electron/
│   ├── main.js                  ← Electron main process + HTTP server
│   ├── preload.js               ← IPC bridge (contextBridge)
│   └── focus-terminal.js        ← macOS/Windows terminal focus
├── scripts/
│   ├── claude-hook-notify.js    ← Hook entry point (reads stdin, routes state)
│   ├── electron-dev.js          ← Cross-platform Electron dev launcher
│   ├── notify.js                ← HTTP helper for npm scripts
│   ├── install-claude-hooks.js
│   └── uninstall-claude-hooks.js
├── src/
│   ├── App.jsx                  ← State switcher + IPC listener
│   ├── main.jsx
│   └── components/
│       ├── BubbleNotification.jsx
│       ├── BubbleNotification.css
│       ├── state-config.js
│       └── mascots/             ← complete.png, waiting.png, permission.png
├── dist/                        ← Production build (generated)
├── package.json
├── README.md
├── CHANGELOG.md
└── LICENSE
```

### Building the package

```bash
npm run build           # build React app into dist/
npm pack                # creates agent-ping-desktop-x.y.z.tgz (runs build first)
npm pack --dry-run      # preview contents without creating the file
```

---

## License

[MIT](LICENSE) — © 2026 quantthieres
