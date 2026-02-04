const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let pythonProcess = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: true, // Secure mode
      preload: path.join(__dirname, 'preload.js'), // We will make this next
    },
  });

  // In DEV mode, connect to Vite. In PROD, load the built file.
  const devUrl = 'http://localhost:5174';
  mainWindow.loadURL(devUrl);
  
  // Open DevTools so you can see errors
  mainWindow.webContents.openDevTools();
}

app.whenReady().then(createWindow);

// --- THE PYTHON HANDLER ---

// 1. Let user pick a CSV
ipcMain.handle('select-csv', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [{ name: 'CSV Files', extensions: ['csv'] }]
  });
  return result.canceled ? null : result.filePaths[0];
});

// 2. Start the Python Engine
ipcMain.handle('start-training', async (event, args) => {
  const { projectId, clientId, dataPath } = args;

  // In dev, we assume it's in electron-client/python/universal_client.py
  const scriptPath = path.join(__dirname, '../python/universal_client.py');
  
  console.log(`🚀 Spawning Python: ${scriptPath}`);
  console.log(`   Args: Project=${projectId}, Client=${clientId}`);

  // Spawn the process
  pythonProcess = spawn('python', [
    scriptPath,
    '--project-id', projectId,
    '--client-id', clientId,
    '--data-path', dataPath,
    '--server', 'fl.kaif-federatedapp.me:443' // Your Tunnel URL

  ]);

  // Listen to what Python says (Stdout)
  pythonProcess.stdout.on('data', (data) => {
    const msg = data.toString();
    console.log(`[PY]: ${msg}`);
    // Send it to the React UI
    mainWindow.webContents.send('training-log', msg);
  });

  // Listen for Python Errors (Stderr)
  pythonProcess.stderr.on('data', (data) => {
    const msg = data.toString();
    console.error(`[PY-ERR]: ${msg}`);
    mainWindow.webContents.send('training-log', `❌ ${msg}`);
  });

  return { status: 'started' };
});

// 3. Stop Training
ipcMain.handle('stop-training', () => {
  if (pythonProcess) {
    pythonProcess.kill();
    pythonProcess = null;
  }
  return { status: 'stopped' };
});