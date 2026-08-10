const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  getInfo: (url) => ipcRenderer.invoke("get-info", url),
  downloadVideo: (payload) => ipcRenderer.invoke("download-video", payload),
  downloadAudio: (payload) => ipcRenderer.invoke("download-audio", payload),
  openDownloadsFolder: () => ipcRenderer.invoke("open-downloads-folder"),
  getDownloadDir: () => ipcRenderer.invoke("get-download-dir"),
  chooseDownloadDir: () => ipcRenderer.invoke("choose-download-dir"),
  getHistory: () => ipcRenderer.invoke("get-history"),
  clearHistory: () => ipcRenderer.invoke("clear-history"),
  openHistoryFolder: (dir) => ipcRenderer.invoke("open-history-folder", dir),
  onProgress: (callback) => {
    ipcRenderer.on("download-progress", (_event, percent) => callback(percent));
  }
});