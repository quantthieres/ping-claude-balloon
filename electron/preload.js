const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  hideBubble: () => ipcRenderer.send('hide-bubble'),
  showBubble: () => ipcRenderer.send('show-bubble'),
  onNotify: (callback) => ipcRenderer.on('notify', (_event, data) => callback(data)),
  focusTerminal: (preferredApp) => ipcRenderer.invoke('focus-terminal', preferredApp),
});
