const { app, BrowserWindow, ipcMain, screen } = require('electron');
const path = require('path');
const http = require('http');
const { focusTerminal } = require('./focus-terminal');

const HTTP_PORT = 47321;
const HTTP_HOST = '127.0.0.1';
const VALID_STATES = new Set(['complete', 'waiting', 'permission']);

let win;

function createWindow() {
  const display = screen.getPrimaryDisplay();
  const { x: wx, y: wy, width: ww } = display.workArea;

  win = new BrowserWindow({
    width: 332,
    height: 180,
    x: wx + ww - 352,
    y: wy + 20,
    frame: false,
    transparent: true,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: false,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // AGENT_PING_DEV=1 → dev mode (Vite dev server at localhost:5173)
  // Not set            → production mode (dist/index.html)
  // app.isPackaged     → always production regardless of env var
  const isDev = !app.isPackaged && process.env.AGENT_PING_DEV === '1';

  if (isDev) {
    win.loadURL('http://localhost:5173');
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

function startHttpServer() {
  const server = http.createServer((req, res) => {
    res.setHeader('Content-Type', 'application/json');

    if (req.method === 'GET' && req.url === '/health') {
      res.writeHead(200);
      res.end(JSON.stringify({ ok: true, app: 'agent-ping' }));
      return;
    }

    if (req.method === 'POST' && req.url === '/notify') {
      let body = '';
      req.on('data', (chunk) => { body += chunk; });
      req.on('end', () => {
        let payload;
        try {
          payload = JSON.parse(body);
        } catch {
          res.writeHead(400);
          res.end(JSON.stringify({ ok: false, error: 'invalid JSON' }));
          return;
        }

        const { state, title, message, meta } = payload;

        if (!VALID_STATES.has(state)) {
          res.writeHead(400);
          res.end(JSON.stringify({ ok: false, error: 'state must be complete | waiting | permission' }));
          return;
        }

        if (win) {
          win.show();
          win.webContents.send('notify', { state, title, message, meta });
        }

        res.writeHead(200);
        res.end(JSON.stringify({ ok: true }));
      });
      return;
    }

    res.writeHead(404);
    res.end(JSON.stringify({ ok: false, error: 'not found' }));
  });

  server.on('error', (err) => {
    console.error(`[agent-ping] HTTP server error: ${err.message}`);
  });

  server.listen(HTTP_PORT, HTTP_HOST, () => {
    console.log(`[agent-ping] HTTP server listening on http://${HTTP_HOST}:${HTTP_PORT}`);
  });
}

app.whenReady().then(() => {
  createWindow();
  startHttpServer();
});

ipcMain.on('hide-bubble', () => win?.hide());
ipcMain.on('show-bubble', () => win?.show());

ipcMain.handle('focus-terminal', (_event, preferredApp) => focusTerminal(preferredApp));

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
