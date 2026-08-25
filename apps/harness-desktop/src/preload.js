const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('harnessDesktop', {
  getState: () => ipcRenderer.invoke('harness:get-state'),
  retry: () => ipcRenderer.invoke('harness:retry'),
  restart: () => ipcRenderer.invoke('harness:restart'),
  openLogs: () => ipcRenderer.invoke('harness:open-logs'),
  onState: (listener) => {
    const handler = (_event, state) => listener(state)
    ipcRenderer.on('harness:state', handler)
    return () => ipcRenderer.removeListener('harness:state', handler)
  },
})
