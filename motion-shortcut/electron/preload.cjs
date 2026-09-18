const { contextBridge, ipcRenderer } = require("electron");

function subscribe(channel, callback) {
  const listener = (_event, value) => callback(value);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
}

contextBridge.exposeInMainWorld("motionAPI", {
  sendHandOverlayFrame: (frame) => ipcRenderer.send("overlay:frame", frame),
  onHandOverlayFrame: (callback) => {
    const listener = (_event, frame) => callback(frame);
    ipcRenderer.on("overlay:frame", listener);
    return () => ipcRenderer.removeListener("overlay:frame", listener);
  },
  launchApp: (appId) => ipcRenderer.invoke("apps:launch", appId),
  executePresentationCommand: (
    command,
    presentationApp,
    presentationUrl,
    shortcut,
  ) =>
    ipcRenderer.invoke(
      "presentation:execute",
      command,
      presentationApp,
      presentationUrl,
      shortcut,
    ),
  pickPresentationFile: (applicationOnly = false) =>
    ipcRenderer.invoke("presentation:pick-file", applicationOnly),
  openPresentationResource: (resource) =>
    ipcRenderer.invoke("presentation:open-resource", resource),
  restorePresentation: () => ipcRenderer.invoke("presentation:restore"),
  openPresentationUrl: (url) =>
    ipcRenderer.invoke("presentation:open-url", url),
  goToSlide: (slide, presentationApp, presentationUrl) =>
    ipcRenderer.invoke(
      "presentation:go-to-slide",
      slide,
      presentationApp,
      presentationUrl,
    ),
  getPresentationMode: () => ipcRenderer.invoke("presentation:get-mode"),
  setPresentationMode: (mode) =>
    ipcRenderer.invoke("presentation:set-mode", mode),
  cyclePresentationMode: () => ipcRenderer.invoke("presentation:cycle-mode"),
  onPresentationModeChanged: (callback) =>
    subscribe("presentation:mode-changed", callback),
  onPresentationActivity: (callback) =>
    subscribe("presentation:activity", callback),
  moveLaser: (point) => ipcRenderer.send("laser:move", point),
  getLaserSettings: () => ipcRenderer.invoke("laser:get-settings"),
  setLaserSettings: (settings) =>
    ipcRenderer.invoke("laser:set-settings", settings),
  onLaserSettingsChanged: (callback) =>
    subscribe("laser:settings-changed", callback),
  onLaserMoved: (callback) => subscribe("laser:moved", callback),
  getOverlayMode: () => ipcRenderer.invoke("overlay:get-mode"),
  setOverlayMode: (mode) => ipcRenderer.invoke("overlay:set-mode", mode),
  onOverlayMode: (callback) => subscribe("overlay:mode", callback),
  setOverlayColor: (color) => ipcRenderer.invoke("overlay:set-color", color),
  onOverlayColor: (callback) => subscribe("overlay:color", callback),
  getOverlayLayout: () => ipcRenderer.invoke("overlay:get-layout"),
  setOverlayScale: (scale) => ipcRenderer.invoke("overlay:set-scale", scale),
  setOverlayEditing: (editing) =>
    ipcRenderer.invoke("overlay:set-editing", editing),
  onOverlayEditing: (callback) => subscribe("overlay:editing", callback),
  sendOverlayTracking: (tracking) =>
    ipcRenderer.send("overlay:tracking", tracking),
  onOverlayTracking: (callback) => subscribe("overlay:tracking", callback),
  getMotionEnabled: () => ipcRenderer.invoke("motion:get"),
  setMotionEnabled: (enabled) => ipcRenderer.invoke("motion:set", enabled),
  toggleMotion: () => ipcRenderer.invoke("motion:toggle"),
  onMotionChanged: (callback) => subscribe("motion:changed", callback),
  getCameraEnabled: () => ipcRenderer.invoke("camera:get"),
  setCameraEnabled: (enabled) => ipcRenderer.invoke("camera:set", enabled),
  onCameraChanged: (callback) => subscribe("camera:changed", callback),
  getPermissions: () => ipcRenderer.invoke("system:permissions"),
  openPermissionSettings: (permission) =>
    ipcRenderer.invoke("system:open-permission", permission),
  getDisplays: () => ipcRenderer.invoke("display:list"),
  setDisplay: (id) => ipcRenderer.invoke("display:set", id),
  getCursorEnabled: () => ipcRenderer.invoke("cursor:get"),
  setCursorEnabled: (enabled) => ipcRenderer.invoke("cursor:set", enabled),
  toggleCursor: () => ipcRenderer.invoke("cursor:toggle"),
  moveCursor: (point) => ipcRenderer.send("cursor:move", point),
  clickCursor: () => ipcRenderer.send("cursor:click"),
  getCursorSensitivity: () => ipcRenderer.invoke("cursor:get-sensitivity"),
  setCursorSensitivity: (value) =>
    ipcRenderer.invoke("cursor:set-sensitivity", value),
  onCursorSensitivityChanged: (callback) =>
    subscribe("cursor:sensitivity-changed", callback),
  onCursorChanged: (callback) => subscribe("cursor:changed", callback),
  getKeyboardVisible: () => ipcRenderer.invoke("keyboard:get"),
  setKeyboardVisible: (visible) => ipcRenderer.invoke("keyboard:set", visible),
  toggleKeyboard: () => ipcRenderer.invoke("keyboard:toggle"),
  getTypingSensitivity: () => ipcRenderer.invoke("keyboard:get-sensitivity"),
  setTypingSensitivity: (value) =>
    ipcRenderer.invoke("keyboard:set-sensitivity", value),
  onTypingSensitivityChanged: (callback) =>
    subscribe("keyboard:sensitivity-changed", callback),
  typeKey: (key) => ipcRenderer.invoke("keyboard:type", key),
  sendKeyboardPointer: (sample) => ipcRenderer.send("keyboard:pointer", sample),
  onKeyboardPointer: (callback) => subscribe("keyboard:pointer", callback),
  sendKeyboardHands: (hands) => ipcRenderer.send("keyboard:hands", hands),
  onKeyboardHands: (callback) => subscribe("keyboard:hands", callback),
  onKeyboardChanged: (callback) => subscribe("keyboard:changed", callback),
});
