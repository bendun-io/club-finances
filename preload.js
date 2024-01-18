const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('storage', {
  // node: () => process.versions.node,
  // chrome: () => process.versions.chrome,
  // electron: () => process.versions.electron,
  saveSettings: (settings) => ipcRenderer.invoke('saveSettings', settings),
  loadSettings: () => ipcRenderer.invoke('loadSettings'),
  loadExcelFile: (path) => ipcRenderer.invoke('loadExcelFile', path),
  createBillFolder: () => ipcRenderer.invoke('createBillFolder'),
  createBillPdf: (folderPath, billSpec, bill) => ipcRenderer.invoke('createBillPdf', folderPath, billSpec, bill),
  createSepaFiles: (folderPath, billSpec, billList) => ipcRenderer.invoke('createSepaFiles', folderPath, billSpec, billList),
})
