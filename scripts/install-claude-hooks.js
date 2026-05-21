#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const CLAUDE_DIR  = path.join(process.cwd(), '.claude');
const SETTINGS    = path.join(CLAUDE_DIR, 'settings.local.json');
const NOTIFY      = path.resolve(__dirname, 'notify.js');

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

function hookCommand(state) {
  // >/dev/null 2>&1 || true — silent + always exits 0 so Claude Code is never disrupted
  return `node ${shellQuote(NOTIFY)} ${state} >/dev/null 2>&1 || true`;
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
        hooks: [{ type: 'command', command: hookCommand('waiting') }],
      },
    ],
    Stop: [
      {
        matcher: '',
        hooks: [{ type: 'command', command: hookCommand('complete') }],
      },
    ],
  };

  fs.writeFileSync(SETTINGS, JSON.stringify(settings, null, 2) + '\n');

  console.log('');
  console.log('Claude Code hooks installed in .claude/settings.local.json');
  console.log('');
  console.log('  Notification  →  agent-ping: waiting');
  console.log('  Stop          →  agent-ping: complete');
  console.log('');
  console.log('Hook command:');
  console.log(' ', hookCommand('<state>'));
  console.log('');
  console.log('Quick test:');
  console.log('  Terminal 1:  npm run dev');
  console.log('  Terminal 2:  open Claude Code in this project and run a prompt');
  console.log('  On Stop the bubble should appear in "complete" state.');
  console.log('');
  console.log('To remove:  npm run hooks:uninstall');
}

main();
