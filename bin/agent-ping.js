#!/usr/bin/env node
'use strict';

/**
 * agent-ping — local CLI for the Agent Ping desktop app.
 *
 * Usage: node bin/agent-ping.js <command> [args]
 * After `npm link`: agent-ping <command> [args]
 */

const { spawnSync, spawn } = require('child_process');
const http = require('http');
const fs   = require('fs');
const path = require('path');
const os   = require('os');

const ROOT         = path.resolve(__dirname, '..');
const PORT         = 47321;
const HOST         = '127.0.0.1';
const VALID_STATES = ['complete', 'waiting', 'permission'];

// ── HTTP helpers ───────────────────────────────────────────────────────────

function httpGet(urlPath) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { hostname: HOST, port: PORT, path: urlPath, method: 'GET' },
      (res) => {
        let body = '';
        res.on('data', (c) => { body += c; });
        res.on('end', () => {
          try { resolve({ status: res.statusCode, body: JSON.parse(body) }); }
          catch { resolve({ status: res.statusCode, body }); }
        });
      },
    );
    req.on('error', reject);
    req.setTimeout(4000, () => { req.destroy(); reject(new Error('timeout')); });
    req.end();
  });
}

function httpPost(urlPath, payload) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
    const req = http.request(
      {
        hostname: HOST, port: PORT, path: urlPath, method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
        },
      },
      (res) => {
        let body = '';
        res.on('data', (c) => { body += c; });
        res.on('end', () => {
          try { resolve({ status: res.statusCode, body: JSON.parse(body) }); }
          catch { resolve({ status: res.statusCode, body }); }
        });
      },
    );
    req.on('error', reject);
    req.setTimeout(4000, () => { req.destroy(); reject(new Error('timeout')); });
    req.write(data);
    req.end();
  });
}

// ── flag parser ────────────────────────────────────────────────────────────

function parseFlags(args) {
  const flags = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--title'   && args[i + 1]) flags.title   = args[++i];
    if (args[i] === '--message' && args[i + 1]) flags.message = args[++i];
    if (args[i] === '--meta'    && args[i + 1]) flags.meta    = args[++i];
  }
  return flags;
}

// ── platform helpers ───────────────────────────────────────────────────────

function npmBin() {
  return process.platform === 'win32' ? 'npm.cmd' : 'npm';
}

function electronBin() {
  // require('electron') returns the path to the Electron binary.
  // Wrap in try/catch in case Electron is not installed.
  try {
    // Resolve from project root so it works after npm link
    return require(require.resolve('electron', { paths: [ROOT] }));
  } catch {
    return path.join(ROOT, 'node_modules', '.bin', 'electron');
  }
}

// ── commands ───────────────────────────────────────────────────────────────

function cmdDev() {
  console.log('Starting Agent Ping in dev mode (Vite + Electron)…');
  console.log('Press Ctrl+C to stop.\n');
  const child = spawn(npmBin(), ['run', 'dev'], { cwd: ROOT, stdio: 'inherit' });
  child.on('error', (err) => {
    console.error(`Failed to start: ${err.message}`);
    process.exit(1);
  });
  child.on('exit', (code) => process.exit(code ?? 0));
}

function cmdStart() {
  const distIndex = path.join(ROOT, 'dist', 'index.html');
  if (!fs.existsSync(distIndex)) {
    console.error(
      'Production build not found.\n' +
      'Run:  npm run build\n' +
      'or:   agent-ping dev   (runs Vite + Electron dev mode)',
    );
    process.exit(1);
  }

  console.log('Starting Agent Ping (production build)…');
  console.log('Press Ctrl+C to stop.\n');

  const child = spawn(electronBin(), ['.'], { cwd: ROOT, stdio: 'inherit' });
  child.on('error', (err) => {
    console.error(`Failed to start Electron: ${err.message}`);
    process.exit(1);
  });
  child.on('exit', (code) => process.exit(code ?? 0));
}

async function cmdHealth() {
  try {
    const res = await httpGet('/health');
    if (res.body?.ok) {
      console.log('Agent Ping is running.');
      console.log(JSON.stringify(res.body, null, 2));
    } else {
      console.error('Unexpected response:', JSON.stringify(res.body));
      process.exit(1);
    }
  } catch (err) {
    if (err.code === 'ECONNREFUSED') {
      console.error('Agent Ping is not running.\nStart it with:  agent-ping start');
    } else {
      console.error(`Health check failed: ${err.message}`);
    }
    process.exit(1);
  }
}

async function cmdNotify(args) {
  const [state, ...flagArgs] = args;

  if (!VALID_STATES.includes(state)) {
    console.error(
      `Usage: agent-ping notify <complete|waiting|permission> [--title ...] [--message ...] [--meta ...]`,
    );
    process.exit(1);
  }

  const flags   = parseFlags(flagArgs);
  const payload = { state, ...flags };

  try {
    const res = await httpPost('/notify', payload);
    if (res.body?.ok) {
      console.log(`Notified: ${state}`);
    } else {
      console.error('Server error:', JSON.stringify(res.body));
      process.exit(1);
    }
  } catch (err) {
    if (err.code === 'ECONNREFUSED') {
      console.error('Agent Ping is not running.\nStart it with:  agent-ping start');
    } else {
      console.error(`Notify failed: ${err.message}`);
    }
    process.exit(1);
  }
}

function cmdHooks(args) {
  const sub = args[0];
  const scripts = {
    install:   path.join(ROOT, 'scripts', 'install-claude-hooks.js'),
    uninstall: path.join(ROOT, 'scripts', 'uninstall-claude-hooks.js'),
  };

  if (!scripts[sub]) {
    console.error('Usage: agent-ping hooks <install|uninstall>');
    process.exit(1);
  }

  const result = spawnSync(process.execPath, [scripts[sub]], {
    cwd: ROOT,
    stdio: 'inherit',
  });
  process.exit(result.status ?? 0);
}

async function cmdDoctor() {
  const checks = [];

  function check(label, ok, detail = '') {
    checks.push({ label, ok, detail });
  }

  // Node.js version
  const nodeMajor = parseInt(process.version.slice(1));
  check(
    `Node.js ${process.version}`,
    nodeMajor >= 18,
    nodeMajor < 18 ? '(requires >= 18)' : '',
  );

  // Platform
  check(`Platform: ${os.platform()} ${os.arch()}`, true, os.release());

  // package.json
  check('package.json', fs.existsSync(path.join(ROOT, 'package.json')));

  // Electron installed
  const electronBin = path.join(ROOT, 'node_modules', '.bin', 'electron');
  const electronDir = path.join(ROOT, 'node_modules', 'electron');
  check('Electron installed', fs.existsSync(electronBin) || fs.existsSync(electronDir));

  // Mascots
  const mascotNames = ['complete', 'waiting', 'permission'];
  const mascotPaths = mascotNames.map(
    (n) => path.join(ROOT, 'src', 'components', 'mascots', `${n}.png`),
  );
  const mascotsOk = mascotPaths.every((p) => fs.existsSync(p));
  check('Mascot images (3 PNG)', mascotsOk, mascotsOk ? '' : 'missing in src/components/mascots/');

  // Production build
  const distIndex = path.join(ROOT, 'dist', 'index.html');
  check(
    'Production build (dist/)',
    fs.existsSync(distIndex),
    fs.existsSync(distIndex) ? '' : 'run: npm run build',
  );

  // HTTP /health
  let healthOk     = false;
  let healthDetail = '';
  try {
    const res  = await httpGet('/health');
    healthOk   = res.body?.ok === true;
    healthDetail = healthOk
      ? `http://${HOST}:${PORT}`
      : `unexpected response: ${JSON.stringify(res.body)}`;
  } catch (err) {
    healthDetail = err.code === 'ECONNREFUSED'
      ? 'app not running — start with: agent-ping start'
      : err.message;
  }
  check('HTTP server /health', healthOk, healthDetail);

  // .claude/settings.local.json
  const settingsPath   = path.join(ROOT, '.claude', 'settings.local.json');
  const settingsExists = fs.existsSync(settingsPath);
  check(
    '.claude/settings.local.json',
    settingsExists,
    settingsExists ? '' : 'run: agent-ping hooks install',
  );

  // Agent Ping hooks
  let hooksOk     = false;
  let hooksDetail = 'not installed — run: agent-ping hooks install';
  if (settingsExists) {
    try {
      const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
      const hasStop  = settings.hooks?.Stop?.some((e) =>
        e.hooks?.some((h) => h.command?.includes('claude-hook-notify.js')),
      );
      const hasNotif = settings.hooks?.Notification?.some((e) =>
        e.hooks?.some((h) => h.command?.includes('claude-hook-notify.js')),
      );
      hooksOk     = !!(hasStop && hasNotif);
      hooksDetail = hooksOk
        ? 'Stop + Notification → claude-hook-notify.js'
        : 'partial or legacy — run: agent-ping hooks install';
    } catch {
      hooksDetail = 'could not parse settings.local.json';
    }
  }
  check('Claude Code hooks', hooksOk, hooksDetail);

  // ── print report ──
  console.log('\nAgent Ping — Doctor Report\n');
  for (const c of checks) {
    const icon   = c.ok ? '✓' : '✗';
    const detail = c.detail ? `  ${c.detail}` : '';
    console.log(`  ${icon}  ${c.label}${detail}`);
  }
  console.log('');

  const failed = checks.filter((c) => !c.ok).length;
  if (failed === 0) {
    console.log('All checks passed.');
  } else {
    console.log(`${failed} check(s) need attention.`);
    process.exit(1);
  }
}

function cmdHelp() {
  console.log(`
agent-ping — local CLI for the Agent Ping desktop app

Usage:
  agent-ping <command> [args]

Commands:
  dev                       Start in dev mode (Vite dev server + Electron)
  start                     Start using the production build in dist/
  health                    Check if the Agent Ping HTTP server is running
  notify <state> [flags]    Send a notification to the bubble
                              states: complete | waiting | permission
                              flags:  --title "..." --message "..." --meta "..."
  hooks install             Install Claude Code hooks in .claude/settings.local.json
  hooks uninstall           Remove Agent Ping hooks from .claude/settings.local.json
  doctor                    Run diagnostics and print a health report
  help                      Show this help message

Workflow:
  Development:   agent-ping dev
  Production:    npm run build && agent-ping start

Examples:
  agent-ping dev
  agent-ping start
  agent-ping health
  agent-ping notify complete
  agent-ping notify permission --title "Approval needed" --message "Allow bash?"
  agent-ping notify waiting --message "Waiting for your input..."
  agent-ping hooks install
  agent-ping hooks uninstall
  agent-ping doctor
`.trimStart());
}

// ── dispatch ───────────────────────────────────────────────────────────────

const [,, cmd, ...rest] = process.argv;

(async () => {
  switch (cmd) {
    case 'dev':                  cmdDev();             break;
    case 'start':                cmdStart();           break;
    case 'health':               await cmdHealth();    break;
    case 'notify':               await cmdNotify(rest); break;
    case 'hooks':                cmdHooks(rest);       break;
    case 'doctor':               await cmdDoctor();    break;
    case 'help':
    case '--help':
    case '-h':
    case undefined:              cmdHelp();            break;
    default:
      console.error(`Unknown command: "${cmd}"\nRun 'agent-ping help' for usage.`);
      process.exit(1);
  }
})();
