'use strict';

const { execFile } = require('child_process');

// macOS apps tried in priority order.
// activateName = exact string passed to "tell application X to activate".
const MACOS_APPS = [
  { activateName: 'Warp',               displayName: 'Warp' },
  { activateName: 'iTerm2',             displayName: 'iTerm2' },
  { activateName: 'Terminal',           displayName: 'Terminal' },
  { activateName: 'Visual Studio Code', displayName: 'VS Code' },
];

// Windows: names = candidate process names tried in order
const WINDOWS_APPS = [
  { names: ['WindowsTerminal'],      displayName: 'Windows Terminal' },
  { names: ['pwsh', 'powershell'],   displayName: 'PowerShell' },
  { names: ['cmd'],                  displayName: 'cmd' },
  { names: ['Code'],                 displayName: 'VS Code' },
];

function execP(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { timeout: 3000, ...opts }, (err, stdout, stderr) => {
      if (err) reject(Object.assign(err, { stderr: stderr?.trim() }));
      else resolve(stdout.trim());
    });
  });
}

// ── macOS ─────────────────────────────────────────────────────────────────────

/**
 * Try to bring each terminal/editor to the front using AppleScript activate.
 *
 * We skip all pre-flight "is the app running?" checks — those checks
 * (pgrep, AppleScript "is running") can fail inside the Electron sandbox
 * even when the target app is clearly running. Instead we attempt
 * `tell application X to activate` directly:
 *
 *  • exit 0  → the app was activated (or just launched if it wasn't running)
 *  • non-0   → the app is not installed / automation permission denied
 *              → try the next app
 *
 * On first use, macOS may show an Automation permission dialog.
 * Once approved, subsequent calls are instant.
 */
async function focusMacOS(preferredApp) {
  let apps = [...MACOS_APPS];

  if (preferredApp) {
    const idx = apps.findIndex(
      (a) => a.displayName === preferredApp || a.activateName === preferredApp,
    );
    if (idx > 0) apps = [apps[idx], ...apps.slice(0, idx), ...apps.slice(idx + 1)];
  }

  for (const app of apps) {
    console.log(`[ping-balloon] trying to focus ${app.displayName}`);
    try {
      await execP('osascript', ['-e', `tell application "${app.activateName}" to activate`]);
      console.log(`[ping-balloon] focused ${app.displayName}`);
      return { ok: true, app: app.displayName };
    } catch (err) {
      console.warn(`[ping-balloon] focus failed ${app.displayName}:`, err.stderr || err.message);
    }
  }

  return { ok: false, error: 'No supported terminal or editor could be focused' };
}

// ── Windows ───────────────────────────────────────────────────────────────────

function buildWindowsScript(apps) {
  const appDefs = apps
    .map((app) => {
      const names = app.names.map((n) => `"${n}"`).join(',');
      return `@{names=@(${names}); display="${app.displayName}"}`;
    })
    .join(',');

  return [
    '$ErrorActionPreference = "SilentlyContinue"',
    'Add-Type -AssemblyName Microsoft.VisualBasic',
    `$apps = @(${appDefs})`,
    'foreach ($app in $apps) {',
    '  $proc = $null',
    '  foreach ($name in $app.names) {',
    '    $proc = Get-Process -Name $name | Select-Object -First 1',
    '    if ($proc) { break }',
    '  }',
    '  if (-not $proc) { continue }',
    '  try {',
    '    [Microsoft.VisualBasic.Interaction]::AppActivate($proc.Id) | Out-Null',
    '    Write-Output $app.display',
    '    exit 0',
    '  } catch {}',
    '}',
    'Write-Output "none"',
  ].join('\n');
}

async function focusWindows(preferredApp) {
  let apps = [...WINDOWS_APPS];

  if (preferredApp) {
    const idx = apps.findIndex((a) => a.displayName === preferredApp);
    if (idx > 0) apps = [apps[idx], ...apps.slice(0, idx), ...apps.slice(idx + 1)];
  }

  const script = buildWindowsScript(apps);
  let result;

  try {
    result = await execP(
      'powershell',
      ['-NoProfile', '-NonInteractive', '-Command', script],
      { timeout: 8000 },
    );
  } catch (err) {
    return { ok: false, error: err.message };
  }

  if (!result || result === 'none') {
    return { ok: false, error: 'No supported terminal or editor found running' };
  }

  console.log(`[ping-balloon] focused ${result}`);
  return { ok: true, app: result };
}

// ── Entry point ───────────────────────────────────────────────────────────────

async function focusTerminal(preferredApp) {
  if (process.platform === 'darwin') return focusMacOS(preferredApp);
  if (process.platform === 'win32')  return focusWindows(preferredApp);
  return { ok: false, error: `Platform "${process.platform}" not yet supported` };
}

module.exports = { focusTerminal };
