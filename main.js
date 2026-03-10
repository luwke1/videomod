const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 900,
    backgroundColor: '#050505', // Deep black
    frame: false, // Frameless for custom avant-garde header
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false, // Simplified for local demo
      webSecurity: false
    },
  });

  mainWindow.loadURL('http://localhost:5173'); // Vite dev server
}

ipcMain.handle('select-file', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [{ name: 'Videos', extensions: ['mp4', 'mov', 'avi'] }]
  });
  return result.filePaths[0];
});

ipcMain.on('run-process', (event, args) => {
  const { videoPath, trimStart, trimEnd, useCuda } = args;
  const outputDir = path.join(path.dirname(videoPath), 'splat_output');
  const pythonExecutable = path.join(__dirname, 'venv', 'Scripts', 'python.exe');

  const pythonProcess = spawn(pythonExecutable, [
    '-u', // Force unbuffered output
    path.join(__dirname, 'backend/pipeline.py'),
    '--video', videoPath,
    '--start', trimStart,
    '--end', trimEnd,
    '--cuda', useCuda,
    '--out', outputDir
  ]);

  // Buffer to hold incoming stream chunks
  let streamBuffer = '';

  const processStream = (data) => {
    streamBuffer += data.toString();
    
    // Split by newline OR carriage return (to catch tqdm progress bars)
    const parts = streamBuffer.split(/[\r\n]+/);
    
    // Pop the last element (which might be an incomplete line) back into the buffer
    streamBuffer = parts.pop();

    parts.forEach(part => {
      const cleanPart = part.trim();
      if (!cleanPart) return;

      // Check for the success trigger
      if (cleanPart.startsWith('RESULT:')) {
        const finalPath = cleanPart.replace('RESULT:', '').trim();
        mainWindow.webContents.send('process-complete', finalPath);
      } else {
        // Route ALL other logs (Python prints, AI progress bars, warnings) to the UI
        let cleanLog = cleanPart.replace('STATUS:', '').replace('LOG:', '').trim();
        mainWindow.webContents.send('status-update', cleanLog);
      }
    });
  };

  // Listen to BOTH normal output and error/progress output
  pythonProcess.stdout.on('data', processStream);
  pythonProcess.stderr.on('data', processStream);
});

app.whenReady().then(createWindow);