const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  selectCsv: () => ipcRenderer.invoke('select-csv'),
  startTraining: (args) => ipcRenderer.invoke('start-training', args),
  stopTraining: () => ipcRenderer.invoke('stop-training'),
  // Listen for logs coming FROM the main process
  onLog: (callback) => ipcRenderer.on('training-log', (event, msg) => callback(msg))
});