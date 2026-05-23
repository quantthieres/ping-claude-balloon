'use strict';

const { execFile } = require('child_process');

// macOS: processName = what pgrep sees; activateName = AppleScript target
const MACOS_APPS = [
  { processName: 'Warp',     activateName: 'Warp',               displayName: 'Warp' },
  { processName: 'iTerm2',   activateName: 'iTerm2',             displayName: 'iTerm2' },
  { processName: 'Terminal', activateName: 'Terminal',           displayName: 'Terminal' },
  { processName: 'Code',     activateName: 'Visual Studio Code', displayName: 'VS Code' },
];

// Windows: names = candidate process names tried in order (e.g. pwsh before powershell)
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
 * Fast pgrep check — exits 0 when processName is running, 1 when not.
 * Returns false if pgrep itself fails (permission, name mismatch, etc.).
 */
function isRunningPgrep(processName) {
  return execP('pgrep', ['-x', processName]).then(() => true, () => false);
}

/**
 * AppleScript fallback — asks the OS whether the app bundle is running.
 * More reliable than pgrep for apps whose process name differs from their
 * bundle name (e.g. VS Code runs as "Electron", Warp variants, etc.).
 * Always exits 0; returns "yes" or "no" via stdout.
 */
async function isRunningAppleScript(activateName) {
  try {
    const out = await execP('osascript', [
      '-e', `if application "${activateName}" is running then "yes" else "no"`,
    ]);
    return out === 'yes';
  } catch {
    return false;
  }
}

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

    // pgrep is tried first (fast, zero AppleScript overhead).
    // If it reports "not found" — possibly a process-name mismatch or sandbox
    // restriction — we fall back to AppleScript's own 'is running' check,
    // which uses the same mechanism as 'tell application ... to activate'.
    const running =
      (await isRunningPgrep(app.processName)) ||
      (await isRunningAppleScript(app.activateName));

    if (!running) continue;

    try {
      await execP('osascript', ['-e', `tell application "${app.activateName}" to activate`]);
      console.log(`[ping-balloon] focused ${app.displayName}`);
      return { ok: true, app: app.displayName };
    } catch (err) {
      console.warn(`[ping-balloon] focus failed ${app.displayName}:`, err.stderr || err.message);
    }
  }

  return { ok: false, error: 'No supported terminal or editor found running' };
}

// ── Windows ───────────────────────────────────────────────────────────────────

// Builds a self-contained PowerShell script that walks the priority list,
// finds the first running process, and calls AppActivate on its PID.
// Outputs the display name on success, "none" if nothing matched.
// Windows foreground-lock can prevent full focus; AppActivate is best-effort.
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
    // PowerShell startup can be slow; allow extra time
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
