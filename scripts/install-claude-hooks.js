#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const CLAUDE_DIR    = path.join(process.cwd(), '.claude');
const SETTINGS      = path.join(CLAUDE_DIR, 'settings.local.json');
const HOOK_NOTIFY   = path.resolve(__dirname, 'claude-hook-notify.js');

function timestamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}` +
         `-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

// Quote path for use inside a shell string (handles spaces in path)
function shellQuote(s) {
  return `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

// hookEvent is the Claude Code event name (Stop, Notification, …) passed as a
// CLI fallback arg — the script also reads the real payload from stdin.
function hookCommand(hookEvent) {
  return `node ${shellQuote(HOOK_NOTIFY)} ${hookEvent} >/dev/null 2>&1 || true`;
}

function main() {
  // Ensure .claude dir exists
  if (!fs.existsSync(CLAUDE_DIR)) {
    fs.mkdirSync(CLAUDE_DIR, { recursive: true });
    console.log('Created .claude/');
  }

  // Read or initialise settings
  let settings = {};
  if (fs.existsSync(SETTINGS)) {
    try {
      settings = JSON.parse(fs.readFileSync(SETTINGS, 'utf8'));
    } catch (err) {
      console.error(`Cannot parse ${SETTINGS}: ${err.message}`);
      process.exit(1);
    }

    // Backup before any change
    const backup = path.join(CLAUDE_DIR, `settings.local.backup-${timestamp()}.json`);
    fs.copyFileSync(SETTINGS, backup);
    console.log(`Backed up → ${path.relative(process.cwd(), backup)}`);
  }

  // Merge hook events — preserve any other hooks the user may have
  settings.hooks = {
    ...(settings.hooks || {}),
    Notification: [
      {
        matcher: '',
        hooks: [{ type: 'command', command: hookCommand('Notification') }],
      },
    ],
    Stop: [
      {
        matcher: '',
        hooks: [{ type: 'command', command: hookCommand('Stop') }],
      },
    ],
  };

  fs.writeFileSync(SETTINGS, JSON.stringify(settings, null, 2) + '\n');

  console.log('');
  console.log('Claude Code hooks installed in .claude/settings.local.json');
  console.log('');
  console.log('  Notification (permission keyword)  →  agent-ping: permission (amber)');
  console.log('  Notification (other)               →  agent-ping: waiting   (blue)');
  console.log('  Stop                               →  agent-ping: complete  (green)');
  console.log('');
  console.log('Hook script:  scripts/claude-hook-notify.js');
  console.log('');
  console.log('Debug mode (logs to .claude/agent-ping-hook-debug.log):');
  console.log('  AGENT_PING_HOOK_DEBUG=1 node scripts/claude-hook-notify.js Stop');
  console.log('');
  console.log('Quick test:');
  console.log('  Terminal 1:  npm run dev');
  console.log('  Terminal 2:  open Claude Code in this project and run a prompt');
  console.log('  On Stop the bubble should appear in "complete" state.');
  console.log('');
  console.log('To remove:  npm run hooks:uninstall');
}

main();
