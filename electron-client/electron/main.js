// main.js

import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let mainWindow;
let pythonProcess = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    autoHideMenuBar: true
  });

  // In development, load from Vite dev server. In production, load file.
  const startUrl = process.env.ELECTRON_START_URL || 'http://localhost:5174'; 
  mainWindow.loadURL(startUrl);
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (pythonProcess) pythonProcess.kill();
  if (process.platform !== 'darwin') app.quit();
});

// --- IPC Handlers ---

// 1. File Picker
ipcMain.handle('select-csv', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [{ name: 'CSV Files', extensions: ['csv'] }]
  });
  return result.canceled ? null : result.filePaths[0];
});

// 2. Start Training
ipcMain.handle('start-training', async (event, args) => {
  const { projectId, clientId, dataPath, apiUrl, flServerUrl } = args;
  
  // Path to python script (Adjust for production packaging!)
  const scriptPath = path.join(__dirname, '../python/universal_client.py');
  
  console.log(`🚀 Spawning Python Client...`);
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
    mainWindow.webContents.send('training-log', `🛑 Process exited with code ${code}`);
    pythonProcess = null;
  });
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