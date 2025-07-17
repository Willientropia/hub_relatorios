const { app, BrowserWindow, session } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false
    },
    title: 'Hub de Monitoramento'
  });

  win.loadFile('src/renderer/index.html');
  
  // Abrir DevTools em desenvolvimento
  // win.webContents.openDevTools();
}

app.whenReady().then(() => {
  // Configurar a Política de Segurança de Conteúdo (CSP)
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; " +
          "script-src 'self' 'unsafe-inline' " +
          "https://unpkg.com " +
          "https://cdnjs.cloudflare.com " +
          "https://cdn.tailwindcss.com " +
          "https://www.gstatic.com " +
          "https://*.firebaseio.com " +
          "https://*.googleapis.com " +
          "https://*.firebaseapp.com; " +
          "connect-src 'self' https://*.firebaseio.com wss://*.firebaseio.com https://*.googleapis.com https://*.firebaseapp.com; " +
          "style-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com; " +
          "frame-src https://*.firebaseio.com https://*.firebaseapp.com; " +
          "img-src 'self' data: https:; " +
          "font-src 'self' data: https:"
        ]
      }
    });
  });
  
  // Criar a janela após a configuração do CSP
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
