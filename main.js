// require('update-electron-app')()

const { app, BrowserWindow, ipcMain } = require('electron')
const { saveSettings, loadSettings } = require('./js/settings')
const { loadExcelFile } = require('./js/excel')
const { createBillPdf, createSepaFiles } = require('./js/bills')
const { getProjects, createProjectFolder } = require('./js/projects.js')
const { testEmail } = require('./js/email.js')
const path = require('node:path')

const createWindow = () => {
    const win = new BrowserWindow({
      width: 1920*0.8,
      height: 1080*0.8,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js')
      },
      icon: path.join(__dirname, 'images', 'icon.png')
    })
  
    win.loadFile('index.html')
    win.setMenuBarVisibility(false)
  }

  app.whenReady().then(() => {
    ipcMain.handle('saveSettings', (_event, settings) => saveSettings(settings));
    ipcMain.handle('loadSettings', () => loadSettings());
    ipcMain.handle('loadExcelFile', (_event, path) => loadExcelFile(path));
    ipcMain.handle('createBillFolder', () => createProjectFolder());
    ipcMain.handle('createBillPdf', (_event, folderPath, billSpec, bill) => createBillPdf(folderPath, billSpec, bill)),
    ipcMain.handle('createBillPdfFiles', (_event, folderPath, billSpec, billList) => createBillPdfFiles(folderPath, billSpec, billList)),
    ipcMain.handle('createSepaFiles', (_event, folderPath, billSpec, billList) => createSepaFiles(folderPath, billSpec, billList)),
    ipcMain.handle('getProjects', () => getProjects() );
    ipcMain.handle('testEmail', (_event, receiver) => testEmail(receiver));

    createWindow()

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
      })
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })