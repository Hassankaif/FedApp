import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import process from 'process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let mainWindow;
let pythonProcess = null;

function createWindow() {
  const currentDirName = path.dirname(app.getAppPath());
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(currentDirName, 'preload.js'),
    },
  });

  const devUrl = 'http://localhost:5174';
  mainWindow.loadURL(devUrl);
  mainWindow.webContents.openDevTools();
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (pythonProcess) pythonProcess.kill();
  if (process.platform !== 'darwin') app.quit();
});

// IPC Handlers
ipcMain.handle('select-csv', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [{ name: 'CSV Files', extensions: ['csv'] }]
  });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('start-training', async (event, args) => {
  const { projectId, clientId, dataPath } = args;
  
  const scriptPath = path.join(__dirname, '../python/universal_client.py');
  
  console.log(`🚀 Starting Python: ${scriptPath}`);
  console.log(`Args:`, args);
  
  // FIX: Use correct server address
  pythonProcess = spawn('python', [
    scriptPath,
    '--project-id', projectId,
    '--client-id', clientId,
    '--data-path', dataPath,
    '--server', 'fl.kaif-federatedapp.me:443'  // HTTPS port
  ]);
  
  pythonProcess.stdout.on('data', (data) => {
    const msg = data.toString();
    console.log(`[PY]: ${msg}`);
    mainWindow.webContents.send('training-log', msg);
  });
  
  pythonProcess.stderr.on('data', (data) => {
    const msg = data.toString();
    console.error(`[PY-ERR]: ${msg}`);
    mainWindow.webContents.send('training-log', `❌ ${msg}`);
  });
  
  pythonProcess.on('close', (code) => {
    mainWindow.webContents.send('training-log', `✅ Process exited with code ${code}`);
    pythonProcess = null;
  });
  
  return { status: 'started' };
});

ipcMain.handle('stop-training', () => {
  if (pythonProcess) {
    pythonProcess.kill();
    pythonProcess = null;
  }
  return { status: 'stopped' };
});