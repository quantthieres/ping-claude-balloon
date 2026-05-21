#!/usr/bin/env node
'use strict';

// Spawns Electron with AGENT_PING_DEV=1 set in the environment.
// Using a Node script instead of an inline env var (AGENT_PING_DEV=1 electron .)
// makes this work on macOS, Linux, and Windows without cross-env.

const { spawn } = require('child_process');
const path = require('path');

const ROOT        = path.resolve(__dirname, '..');
const electronBin = require('electron'); // electron pkg exports the binary path

const child = spawn(electronBin, ['.'], {
  cwd: ROOT,
  stdio: 'inherit',
  env: { ...process.env, AGENT_PING_DEV: '1' },
});

child.on('exit', (code) => process.exit(code ?? 0));
