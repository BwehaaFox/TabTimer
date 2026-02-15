const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  setIgnoreMouse: (ignore, options) =>
    ipcRenderer.send('set-ignore-mouse-events', ignore, options),
});
