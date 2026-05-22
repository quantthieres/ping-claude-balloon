#!/usr/bin/env node
'use strict';

/**
 * ping-balloon — local CLI for the Ping Balloon desktop app.
 *
 * Usage: node bin/agent-ping.js <command> [args]
 * After install: ping-balloon <command> [args]
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
  // Dev mode needs Vite and the source tree — only meaningful inside the repo.
  if (!fs.existsSync(path.join(ROOT, 'src'))) {
    console.error(
      'Dev mode is not available in an installed package.\n' +
      'To start the app:  ping-balloon start',
    );
    process.exit(1);
  }
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
      'or:   ping-balloon dev   (runs Vite + Electron dev mode, source clone only)',
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
      console.error('Ping Balloon is not running.\nStart it with:  ping-balloon start');
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
      `Usage: ping-balloon notify <complete|waiting|permission> [--title ...] [--message ...] [--meta ...]`,
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
      console.error('Ping Balloon is not running.\nStart it with:  ping-balloon start');
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
    console.error('Usage: ping-balloon hooks <install|uninstall>');
    process.exit(1);
  }

  // Run the script with the *user's* working directory as cwd so that
  // .claude/settings.local.json is created in their project, not in ROOT.
  const result = spawnSync(process.execPath, [scripts[sub]], {
    cwd: process.cwd(),
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

  // Electron installed — use module resolution so hoisted packages are found
  let electronInstalled = false;
  try { require.resolve('electron', { paths: [ROOT] }); electronInstalled = true; } catch { /* not found */ }
  check('Electron installed', electronInstalled, electronInstalled ? '' : 'run: npm install');

  // Mascots — check src/ (dev) or dist/assets/ (installed package)
  let mascotsOk     = false;
  let mascotsDetail = '';
  const srcMascotDir = path.join(ROOT, 'src', 'components', 'mascots');
  if (fs.existsSync(srcMascotDir)) {
    const expected = ['complete', 'waiting', 'permission'];
    mascotsOk     = expected.every((n) => fs.existsSync(path.join(srcMascotDir, `${n}.png`)));
    mascotsDetail = mascotsOk ? '' : 'missing in src/components/mascots/';
  } else {
    const distAssets = path.join(ROOT, 'dist', 'assets');
    if (fs.existsSync(distAssets)) {
      const pngs = fs.readdirSync(distAssets).filter((f) => f.endsWith('.png'));
      mascotsOk     = pngs.length >= 3;
      mascotsDetail = mascotsOk ? '' : `only ${pngs.length}/3 PNGs in dist/assets/`;
    } else {
      mascotsDetail = 'dist/ not found — run: npm run build';
    }
  }
  check('Mascot images (3 PNG)', mascotsOk, mascotsDetail);

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
      ? 'app not running — start with: ping-balloon start'
      : err.message;
  }
  check('HTTP server /health', healthOk, healthDetail);

  // .claude/settings.local.json — lives in the *user's* CWD, not the package dir
  const settingsPath   = path.join(process.cwd(), '.claude', 'settings.local.json');
  const settingsExists = fs.existsSync(settingsPath);
  check(
    '.claude/settings.local.json',
    settingsExists,
    settingsExists ? '' : 'run: ping-balloon hooks install',
  );

  // Agent Ping hooks
  let hooksOk     = false;
  let hooksDetail = 'not installed — run: ping-balloon hooks install';
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
        : 'partial or legacy — run: ping-balloon hooks install';
    } catch {
      hooksDetail = 'could not parse settings.local.json';
    }
  }
  check('Claude Code hooks', hooksOk, hooksDetail);

  // ── print report ──
  console.log('\nPing Balloon — Doctor Report\n');
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
ping-balloon — desktop notification bubble for terminal coding agents

Usage:
  ping-balloon <command> [args]

Commands:
  dev                       Start in dev mode (Vite dev server + Electron, source clone only)
  start                     Start using the production build in dist/
  health                    Check if the Ping Balloon HTTP server is running
  notify <state> [flags]    Send a notification to the bubble
                              states: complete | waiting | permission
                              flags:  --title "..." --message "..." --meta "..."
  hooks install             Install Claude Code hooks in .claude/settings.local.json
  hooks uninstall           Remove Ping Balloon hooks from .claude/settings.local.json
  doctor                    Run diagnostics and print a health report
  help                      Show this help message

Workflow:
  Production:    ping-balloon start
  Development:   ping-balloon dev   (requires source clone)

Examples:
  ping-balloon start
  ping-balloon health
  ping-balloon notify complete
  ping-balloon notify permission --title "Approval needed" --message "Allow bash?"
  ping-balloon notify waiting --message "Waiting for your input..."
  ping-balloon hooks install
  ping-balloon hooks uninstall
  ping-balloon doctor
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
      console.error(`Unknown command: "${cmd}"\nRun 'ping-balloon help' for usage.`);
      process.exit(1);
  }
})();
