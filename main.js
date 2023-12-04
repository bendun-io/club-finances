const { app, BrowserWindow, ipcMain } = require('electron')
const { saveSettings, loadSettings } = require('./js/settings')
const { loadExcelFile } = require('./js/excel')
const path = require('node:path')

const createWindow = () => {
    const win = new BrowserWindow({
      width: 1920*0.8,
      height: 1080*0.8,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js')
      }
    })
  
    win.loadFile('index.html')
    win.setMenuBarVisibility(false)
  }

  app.whenReady().then(() => {
    ipcMain.handle('saveSettings', (_event, settings) => saveSettings(settings));
    ipcMain.handle('loadSettings', () => loadSettings());
    ipcMain.handle('loadExcelFile', (_event, path) => loadExcelFile(path));
    // ipcMain.handle('saveSettings', () => "saveSettings({})");

    createWindow()

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
      })
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })