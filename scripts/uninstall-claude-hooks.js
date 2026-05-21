#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const CLAUDE_DIR = path.join(process.cwd(), '.claude');
const SETTINGS   = path.join(CLAUDE_DIR, 'settings.local.json');
const NOTIFY     = path.resolve(__dirname, 'notify.js');

function timestamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}` +
         `-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

// Returns true if a hook entry was injected by agent-ping (identified by notify.js path)
function isAgentPingEntry(entry) {
  return entry.hooks?.some(
    (h) => h.type === 'command' && h.command?.includes(NOTIFY),
  ) ?? false;
}

function main() {
  if (!fs.existsSync(SETTINGS)) {
    console.log('No .claude/settings.local.json found — nothing to remove.');
    return;
  }

  let settings;
  try {
    settings = JSON.parse(fs.readFileSync(SETTINGS, 'utf8'));
  } catch (err) {
    console.error(`Cannot parse ${SETTINGS}: ${err.message}`);
    process.exit(1);
  }

  if (!settings.hooks) {
    console.log('No hooks in settings.local.json — nothing to remove.');
    return;
  }

  // Backup before any change
  const backup = path.join(CLAUDE_DIR, `settings.local.backup-${timestamp()}.json`);
  fs.copyFileSync(SETTINGS, backup);
  console.log(`Backed up → ${path.relative(process.cwd(), backup)}`);

  // Filter out only agent-ping entries; preserve any user-added hooks in the same events
  const EVENTS = ['Notification', 'Stop'];
  let removed = 0;

  for (const event of EVENTS) {
    if (!settings.hooks[event]) continue;

    const before = settings.hooks[event].length;
    settings.hooks[event] = settings.hooks[event].filter(
      (entry) => !isAgentPingEntry(entry),
    );
    const after = settings.hooks[event].length;
    removed += before - after;

    // Drop the key entirely if the array is now empty
    if (settings.hooks[event].length === 0) {
      delete settings.hooks[event];
    }
  }

  // Drop hooks key if nothing is left
  if (Object.keys(settings.hooks).length === 0) {
    delete settings.hooks;
  }

  fs.writeFileSync(SETTINGS, JSON.stringify(settings, null, 2) + '\n');

  if (removed > 0) {
    console.log('');
    console.log(`Claude Code hooks removed (${removed} entr${removed === 1 ? 'y' : 'ies'}).`);
  } else {
    console.log('No agent-ping hooks found — nothing was removed.');
  }
}

main();
