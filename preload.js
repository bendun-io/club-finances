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
  createBillPdfFiles: (folderPath, billSpec, billList) => ipcRenderer.invoke('createBillPdfFiles', folderPath, billSpec, billList),
  createSepaFiles: (folderPath, billSpec, billList) => ipcRenderer.invoke('createSepaFiles', folderPath, billSpec, billList),
  getProjects: () => ipcRenderer.invoke('getProjects'),
  selectFolder: () => ipcRenderer.invoke('selectFolder'),
})


contextBridge.exposeInMainWorld('email', {
  sendTestMail: (receiver, includeAttachement) => ipcRenderer.invoke('testEmail', receiver, includeAttachement),
  sendEmail: (options) => ipcRenderer.invoke('sendEmail', options),
})