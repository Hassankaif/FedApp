// main.js
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const process = require('process');
// const { fileURLToPath } = require('url');
// import { app, BrowserWindow, ipcMain, dialog } from 'electron';
// import process from 'process';
// import path from 'path';
// import { spawn } from 'child_process';
// import { fileURLToPath } from 'url';

// const __dirname = path.dirname(fileURLToPath(import.meta.url));

let mainWindow;
let pythonProcess = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "electron" ,'preload.js'),
    },
    autoHideMenuBar: true
  });

  // In development, load from Vite dev server. In production, load file.
  const startUrl = process.env.ELECTRON_START_URL || 'http://localhost:5174'; 
  mainWindow.loadURL(startUrl);
}
// --- 🔥 FIX 1: Add File Handler ---
// async function handleFileOpen() {
//   const { canceled, filePaths } = await dialog.showOpenDialog({
//     properties: ['openFile'],
//     filters: [{ name: 'CSV Files', extensions: ['csv'] }]
//   });
//   if (!canceled) {
//     return filePaths[0];
//   }
//   return null;  //extra return to ensure we always return something, even if user cancels
// }
app.whenReady().then(() => {
  // Register the file handler
  // ipcMain.handle('dialog:openFile', handleFileOpen);
  ipcMain.handle('select-csv', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      filters: [{ name: 'CSV Files', extensions: ['csv'] }]
    });
    return result.canceled ? null : result.filePaths[0];
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (pythonProcess) pythonProcess.kill(); // Ensure Python process is killed when app closes
  if (process.platform !== 'darwin') app.quit();
});

// --- IPC Training Handlers ---



// 2. Start Training
ipcMain.handle('start-training', async (event, args) => {
  const { projectId, clientId, dataPath, apiUrl, flServerUrl } = args;
  
  // Path to python script (Adjust for production packaging!)
  const scriptPath = path.join(__dirname, 'python', 'universal_client.py');
  
  console.log(`🚀 Spawning Python Client...`);
  console.log(`  Script: ${scriptPath}`);
  console.log(`   Project: ${projectId}, Client: ${clientId}`);
  console.log(`   Data: ${dataPath}`);
  
  // Kill existing process if any
  if (pythonProcess) {
    pythonProcess.kill();
  }

  // Spawn Python
  pythonProcess = spawn('python', [
    scriptPath,
    '--project-id', projectId,
    '--client-id', clientId,
    '--data-path', dataPath,
    '--api-url', apiUrl || 'http://localhost:8000',
    '--server', flServerUrl || 'localhost:8080'
  ]);
  
  // Handle Logs
  pythonProcess.stdout.on('data', (data) => {
    const msg = data.toString();
    console.log(`[PY]: ${msg}`);
    mainWindow.webContents.send('training-log', msg);
  });
  
  pythonProcess.stderr.on('data', (data) => {
    const msg = data.toString();
    console.error(`[PY-ERR]: ${msg}`);
    mainWindow.webContents.send('training-log', `⚠️ ${msg}`);
  });

  pythonProcess.on('close', (code) => {
    // This allows the Frontend to say: if (status === 'error') setSpinner(false)
    mainWindow.webContents.send('training-status', {
      status: code === 0 ? 'completed' : 'error',
      code: code
    });
    // Existing log message
    mainWindow.webContents.send('training-log', `🛑 Process exited with code ${code}`);
    pythonProcess = null;
  });

  return "Started";
});

// 3. Stop Training
ipcMain.handle('stop-training', () => {
  if (pythonProcess) {
    pythonProcess.kill();
    pythonProcess = null;
    return "Stopped";
  }
  return "No process running";
});
