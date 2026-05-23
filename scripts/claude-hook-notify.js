#!/usr/bin/env node
'use strict';

/**
 * Claude Code hook entry point — routes hook events to the Ping Balloon /notify endpoint.
 *
 * Claude Code pipes a JSON payload to stdin when invoking a hook command.
 * We read that payload, detect the hook event type, decide which visual
 * state to show, and POST to http://127.0.0.1:47321/notify.
 *
 * Event routing (v0.2.0):
 *   Stop                           → complete  (always shown)
 *   Notification + permission text → permission (always shown)
 *   Notification (generic/idle)    → skipped by default
 *                                    set PING_BALLOON_SHOW_WAITING=1 to re-enable
 *
 * This script must NEVER crash Claude Code:
 *   - all errors are swallowed
 *   - always exits with code 0
 *   - if Ping Balloon is not running, fails silently
 *
 * Usage (from hook command):
 *   node /abs/path/claude-hook-notify.js <HookEventName> >/dev/null 2>&1 || true
 *
 * Environment variables:
 *   PING_BALLOON_SHOW_WAITING=1    Show bubble for generic Notification events
 *   AGENT_PING_HOOK_DEBUG=1        Append debug JSON lines to .claude/agent-ping-hook-debug.log
 */

const http = require('http');
const fs   = require('fs');
const path = require('path');

const PORT  = 47321;
const HOST  = '127.0.0.1';
const DEBUG = process.env.AGENT_PING_HOOK_DEBUG === '1';
const SHOW_WAITING = process.env.PING_BALLOON_SHOW_WAITING === '1';
const DEBUG_LOG = path.join(process.cwd(), '.claude', 'agent-ping-hook-debug.log');

// Keywords in a Notification message that indicate permission is required
const PERMISSION_KEYWORDS = [
  'permission',
  'allow',
  'approve',
  'authorize',
  'grant',
  'blocked',
  'requires approval',
  'do you want to',
  'do you wish to',
  'confirm',
];

// ── helpers ────────────────────────────────────────────────────────────────

function dbg(data) {
  if (!DEBUG) return;
  try {
    const line = JSON.stringify({ ts: new Date().toISOString(), ...data }) + '\n';
    fs.appendFileSync(DEBUG_LOG, line);
  } catch { /* silent */ }
}

/**
 * Determine which notification state to show, or null to skip entirely.
 *
 * @returns {'complete'|'permission'|'waiting'|null}
 */
function detectState(hookEvent, payload) {
  // Stop always means the task is done — always notify
  if (hookEvent === 'Stop') return 'complete';

  if (hookEvent === 'Notification') {
    const text = [
      payload.message,
      payload.title,
      payload.notification,
    ].filter(Boolean).join(' ').toLowerCase();

    // Permission-related message — always show
    if (text && PERMISSION_KEYWORDS.some((kw) => text.includes(kw))) {
      return 'permission';
    }

    // Generic / idle notification — skip by default to reduce noise.
    // Set PING_BALLOON_SHOW_WAITING=1 to restore the legacy "waiting" bubble.
    if (SHOW_WAITING) {
      return 'waiting';
    }

    return null; // skip
  }

  // Unknown hook events — skip
  return null;
}

function sendNotify(state) {
  return new Promise((resolve) => {
    const body = JSON.stringify({ state });
    const options = {
      hostname: HOST,
      port: PORT,
      path: '/notify',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve({ ok: true, status: res.statusCode, body: data }));
    });

    req.on('error', (err) => resolve({ ok: false, error: err.message }));

    // 3 s timeout — Claude Code should not wait longer than this
    req.setTimeout(3000, () => {
      req.destroy();
      resolve({ ok: false, error: 'timeout' });
    });

    req.write(body);
    req.end();
  });
}

function readStdin() {
  return new Promise((resolve) => {
    // stdin is a terminal → nothing piped → resolve immediately
    if (process.stdin.isTTY) {
      resolve(null);
      return;
    }

    let data = '';
    // Safety timeout: if stdin is a pipe but sends no EOF within 2 s, bail
    const timer = setTimeout(() => resolve(data || null), 2000);

    process.stdin.setEncoding('utf8');
    process.stdin.on('data',  (chunk) => { data += chunk; });
    process.stdin.on('end',   () => { clearTimeout(timer); resolve(data || null); });
    process.stdin.on('error', () => { clearTimeout(timer); resolve(null); });
  });
}

// ── main ───────────────────────────────────────────────────────────────────

async function main() {
  try {
    // CLI arg is the fallback event name written by install-claude-hooks.js
    const cliEvent = process.argv[2] || 'Notification';

    const stdinRaw = await readStdin();
    let payload   = {};
    let hookEvent = cliEvent;

    if (stdinRaw) {
      try {
        payload   = JSON.parse(stdinRaw);
        hookEvent = payload.hook_event_name || cliEvent;
      } catch {
        // stdin was not valid JSON — stick with CLI arg
      }
    }

    dbg({ type: 'input', hookEvent, cliEvent, showWaiting: SHOW_WAITING, payload: stdinRaw ? payload : '(none)' });

    const state = detectState(hookEvent, payload);

    if (state === null) {
      dbg({ type: 'decision', state: 'skip', reason: 'generic notification suppressed (set PING_BALLOON_SHOW_WAITING=1 to enable)' });
      process.exit(0);
      return;
    }

    dbg({ type: 'decision', state });

    const result = await sendNotify(state);

    dbg({ type: 'result', result });

  } catch {
    // Swallow everything — Claude Code must never see an error from us
  }

  process.exit(0);
}

main();
