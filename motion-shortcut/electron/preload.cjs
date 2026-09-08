const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("motionAPI", {
  launchApp: (appId) => ipcRenderer.invoke("apps:launch", appId),
  setOverlayMode: (mode) => ipcRenderer.invoke("overlay:set-mode", mode),
  onOverlayMode: (callback) =>
    ipcRenderer.on("overlay:mode", (_event, mode) => callback(mode)),
  setOverlayColor: (color) => ipcRenderer.invoke("overlay:set-color", color),
  onOverlayColor: (callback) =>
    ipcRenderer.on("overlay:color", (_event, color) => callback(color)),
  getMotionEnabled: () => ipcRenderer.invoke("motion:get"),
  setMotionEnabled: (enabled) => ipcRenderer.invoke("motion:set", enabled),
  toggleMotion: () => ipcRenderer.invoke("motion:toggle"),
  onMotionChanged: (callback) =>
    ipcRenderer.on("motion:changed", (_event, enabled) => callback(enabled)),
});
