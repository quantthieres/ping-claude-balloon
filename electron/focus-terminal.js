'use strict';

const { execFile } = require('child_process');

// Priority order for macOS. processName = what pgrep sees; activateName = AppleScript target.
const TERMINAL_APPS = [
  { processName: 'Warp',     activateName: 'Warp',               displayName: 'Warp' },
  { processName: 'iTerm2',   activateName: 'iTerm2',             displayName: 'iTerm2' },
  { processName: 'Terminal', activateName: 'Terminal',           displayName: 'Terminal' },
  { processName: 'Code',     activateName: 'Visual Studio Code', displayName: 'VS Code' },
];

function execP(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { timeout: 3000, ...opts }, (err, stdout, stderr) => {
      if (err) reject(Object.assign(err, { stderr: stderr?.trim() }));
      else resolve(stdout.trim());
    });
  });
}

function isRunning(processName) {
  return execP('pgrep', ['-x', processName]).then(() => true, () => false);
}

async function focusMacOS(preferredApp) {
  let apps = [...TERMINAL_APPS];

  if (preferredApp) {
    const idx = apps.findIndex(
      (a) => a.displayName === preferredApp || a.activateName === preferredApp
    );
    if (idx > 0) apps = [apps[idx], ...apps.slice(0, idx), ...apps.slice(idx + 1)];
  }

  for (const app of apps) {
    if (!(await isRunning(app.processName))) continue;

    try {
      await execP('osascript', ['-e', `tell application "${app.activateName}" to activate`]);
      console.log(`[agent-ping] focused ${app.displayName}`);
      return { ok: true, app: app.displayName };
    } catch (err) {
      console.warn(`[agent-ping] activate "${app.displayName}" failed: ${err.stderr || err.message}`);
    }
  }

  return { ok: false, error: 'No supported terminal or editor found running' };
}

async function focusTerminal(preferredApp) {
  if (process.platform === 'darwin') {
    return focusMacOS(preferredApp);
  }
  // Windows support planned for a future phase
  return { ok: false, error: `Platform "${process.platform}" not yet supported` };
}

module.exports = { focusTerminal };
