const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  setIgnoreMouse: (ignore, options) =>
    ipcRenderer.send('set-ignore-mouse-events', ignore, options),
  updateBounds: (bounds) => ipcRenderer.send('update-component-bounds', bounds),
  onChangeTransparentMode: (callback) =>
    ipcRenderer.on('change-transparent-mode', (event, value) =>
      callback(value),
    ),
});
