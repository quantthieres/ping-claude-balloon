const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  hideBubble: () => ipcRenderer.send('hide-bubble'),
  showBubble: () => ipcRenderer.send('show-bubble'),
});
