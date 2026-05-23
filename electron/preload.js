const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  hideBubble: () => ipcRenderer.send('hide-bubble'),
  showBubble: () => ipcRenderer.send('show-bubble'),
  onNotify: (callback) => ipcRenderer.on('notify', (_event, data) => callback(data)),
  focusTerminal: (preferredApp) => ipcRenderer.invoke('focus-terminal', preferredApp),
  // Environment flags — read once at startup from the Electron process environment.
  // Renderer has no direct access to process.env; preload bridges the gap.
  env: {
    // Set PING_BALLOON_SOUND=0 to silence all notification sounds.
    soundEnabled: process.env.PING_BALLOON_SOUND !== '0',
  },
});
