#!/usr/bin/env node
'use strict';

const http = require('http');

const PORT = 47321;
const HOST = '127.0.0.1';
const VALID_STATES = ['complete', 'waiting', 'permission'];

const [, , command, ...args] = process.argv;

function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const options = {
      hostname: HOST,
      port: PORT,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
      },
    };

    const req = http.request(options, (res) => {
      let responseBody = '';
      res.on('data', (chunk) => { responseBody += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(responseBody) });
        } catch {
          resolve({ status: res.statusCode, body: responseBody });
        }
      });
    });

    req.on('error', (err) => {
      if (err.code === 'ECONNREFUSED') {
        reject(new Error('Agent Ping app is not running. Start it with npm run dev.'));
      } else {
        reject(err);
      }
    });

    if (data) req.write(data);
    req.end();
  });
}

async function main() {
  if (command === 'health') {
    try {
      const result = await request('GET', '/health');
      console.log(JSON.stringify(result.body, null, 2));
    } catch (err) {
      console.error(err.message);
      process.exit(1);
    }
    return;
  }

  if (!VALID_STATES.includes(command)) {
    console.error('Usage: node scripts/notify.js <complete|waiting|permission>');
    console.error('       node scripts/notify.js health');
    process.exit(1);
  }

  const payload = { state: command };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--title' && args[i + 1]) payload.title = args[++i];
    if (args[i] === '--message' && args[i + 1]) payload.message = args[++i];
    if (args[i] === '--meta' && args[i + 1]) payload.meta = args[++i];
  }

  try {
    const result = await request('POST', '/notify', payload);
    console.log(JSON.stringify(result.body, null, 2));
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}

main();
