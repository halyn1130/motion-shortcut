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
  getCursorEnabled: () => ipcRenderer.invoke("cursor:get"),
  setCursorEnabled: (enabled) => ipcRenderer.invoke("cursor:set", enabled),
  toggleCursor: () => ipcRenderer.invoke("cursor:toggle"),
  moveCursor: (point) => ipcRenderer.send("cursor:move", point),
  clickCursor: () => ipcRenderer.send("cursor:click"),
  getCursorSensitivity: () => ipcRenderer.invoke("cursor:get-sensitivity"),
  setCursorSensitivity: (value) =>
    ipcRenderer.invoke("cursor:set-sensitivity", value),
  onCursorSensitivityChanged: (callback) =>
    ipcRenderer.on("cursor:sensitivity-changed", (_event, value) =>
      callback(value),
    ),
  onCursorChanged: (callback) =>
    ipcRenderer.on("cursor:changed", (_event, enabled) => callback(enabled)),
  getKeyboardVisible: () => ipcRenderer.invoke("keyboard:get"),
  setKeyboardVisible: (visible) => ipcRenderer.invoke("keyboard:set", visible),
  toggleKeyboard: () => ipcRenderer.invoke("keyboard:toggle"),
  typeKey: (key) => ipcRenderer.send("keyboard:type", key),
  sendKeyboardPointer: (sample) => ipcRenderer.send("keyboard:pointer", sample),
  onKeyboardPointer: (callback) =>
    ipcRenderer.on("keyboard:pointer", (_event, sample) => callback(sample)),
  onKeyboardChanged: (callback) =>
    ipcRenderer.on("keyboard:changed", (_event, visible) => callback(visible)),
});
