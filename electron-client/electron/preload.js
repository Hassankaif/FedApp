// import { contextBridge, ipcRenderer } from 'electron';

// contextBridge.exposeInMainWorld('electron', {
//   selectCsv: () => ipcRenderer.invoke('select-csv'),
//   startTraining: (args) => ipcRenderer.invoke('start-training', args),
//   stopTraining: () => ipcRenderer.invoke('stop-training'),
  
//   // Log Listener
//   onLog: (callback) => {
//     const subscription = (_event, msg) => callback(msg);
//     ipcRenderer.on('training-log', subscription);
//     return () => ipcRenderer.removeListener('training-log', subscription);
//   },

//   // Status Listener (The fix for the spinner)
//   onStatus: (callback) => {
//     const subscription = (_event, data) => callback(data);
//     ipcRenderer.on('training-status', subscription);
//     return () => ipcRenderer.removeListener('training-status', subscription);
//   }
// });

// // // 🔥 New API namespace for file handling
// // contextBridge.exposeInMainWorld('electronAPI', {
// //   // Training status listener (simple form)
// //   onTrainingStatus: (callback) => ipcRenderer.on('training-status', callback),

// //   // File selector (calls the new dialog:openFile handler in main.js)
// //   selectFile: () => ipcRenderer.invoke('dialog:openFile')
// // });

// electron-client/electron/preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  // Actions
  selectCsv: () => ipcRenderer.invoke('select-csv'),
  startTraining: (args) => ipcRenderer.invoke('start-training', args),
  stopTraining: () => ipcRenderer.invoke('stop-training'),
  
  // Listeners
  onLog: (callback) => {
    // Wrap to ensure we can remove listener if needed
    const subscription = (event, msg) => callback(msg);
    ipcRenderer.on('training-log', subscription);
    return () => ipcRenderer.removeListener('training-log', subscription);
  },

  // 🔥 ADD THIS MISSING FUNCTION
  onStatus: (callback) => {
    const subscription = (event, data) => callback(data);
    ipcRenderer.on('training-status', subscription);
    return () => ipcRenderer.removeListener('training-status', subscription);
  }
});