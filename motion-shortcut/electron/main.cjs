const {
  app,
  BrowserWindow,
  ipcMain,
  session,
  screen,
  systemPreferences,
} = require("electron");
const { execFile, spawn, spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const { promisify } = require("node:util");

const execFileAsync = promisify(execFile);

const allowedApps = Object.freeze({
  calculator: { name: "계산기", mac: "Calculator" },
  notes: { name: "메모", mac: "Notes" },
  chrome: { name: "Chrome", mac: "Google Chrome" },
  spotlight: { name: "Spotlight", action: "spotlight" },
});
let overlayWindow = null;
let keyboardWindow = null;
let keyboardVisible = false;
let motionEnabled = true;
let cursorEnabled = false;
let cursorSensitivity = 1;
let cursorHelper = null;
let cursorPosition = null;

function broadcastMotionState() {
  for (const window of BrowserWindow.getAllWindows()) {
    window.webContents.send("motion:changed", motionEnabled);
  }
}

function broadcastCursorState() {
  for (const window of BrowserWindow.getAllWindows()) {
    window.webContents.send("cursor:changed", cursorEnabled);
  }
}

function stopCursorHelper() {
  cursorHelper?.kill();
  cursorHelper = null;
  cursorPosition = null;
}

function ensureCursorHelper() {
  if (process.platform !== "darwin") return false;
  if (cursorHelper && !cursorHelper.killed) return true;
  const helperDirectory = path.join(app.getPath("userData"), "native");
  const helperPath = path.join(helperDirectory, "motion-cursor-helper");
  const sourcePath = path.join(__dirname, "cursor-helper.c");
  try {
    fs.mkdirSync(helperDirectory, { recursive: true });
    const sourceChanged =
      !fs.existsSync(helperPath) ||
      fs.statSync(sourcePath).mtimeMs > fs.statSync(helperPath).mtimeMs;
    if (sourceChanged) {
      const compiled = spawnSync(
        "/usr/bin/clang",
        [sourcePath, "-framework", "ApplicationServices", "-o", helperPath],
        { encoding: "utf8" },
      );
      if (compiled.status !== 0) {
        console.error(`[cursor-helper] ${compiled.stderr}`);
        return false;
      }
    }
  } catch (error) {
    console.error("[cursor-helper] build failed", error);
    return false;
  }
  cursorHelper = spawn(helperPath, [], { stdio: ["pipe", "ignore", "pipe"] });
  cursorHelper.on("exit", () => {
    cursorHelper = null;
    cursorPosition = null;
  });
  cursorHelper.stderr.on("data", (data) =>
    console.error(`[cursor-helper] ${String(data).trim()}`),
  );
  return true;
}

function setCursorEnabled(enabled, promptForAccess = false) {
  if (enabled && process.platform === "darwin") {
    const trusted =
      systemPreferences.isTrustedAccessibilityClient(promptForAccess);
    if (!trusted)
      return {
        ok: false,
        enabled: false,
        error: "손쉬운 사용 권한을 허용한 뒤 다시 시도하세요.",
      };
    if (!ensureCursorHelper()) {
      return {
        ok: false,
        enabled: false,
        error: "커서 제어 모듈을 시작하지 못했습니다.",
      };
    }
  }
  cursorEnabled = Boolean(enabled);
  if (!cursorEnabled) stopCursorHelper();
  broadcastCursorState();
  return { ok: true, enabled: cursorEnabled };
}

ipcMain.handle("motion:get", () => motionEnabled);
ipcMain.handle("motion:set", (_event, enabled) => {
  motionEnabled = Boolean(enabled);
  broadcastMotionState();
  return motionEnabled;
});
ipcMain.handle("motion:toggle", () => {
  motionEnabled = !motionEnabled;
  broadcastMotionState();
  return motionEnabled;
});
ipcMain.handle("cursor:get", () => cursorEnabled);
ipcMain.handle("cursor:get-sensitivity", () => cursorSensitivity);
ipcMain.handle("cursor:set-sensitivity", (_event, value) => {
  cursorSensitivity = Math.max(0.6, Math.min(2, Number(value) || 1));
  for (const window of BrowserWindow.getAllWindows()) {
    window.webContents.send("cursor:sensitivity-changed", cursorSensitivity);
  }
  return cursorSensitivity;
});
ipcMain.handle("cursor:toggle", () => setCursorEnabled(!cursorEnabled, true));
ipcMain.handle("cursor:set", (_event, enabled) =>
  setCursorEnabled(Boolean(enabled), Boolean(enabled)),
);
ipcMain.on("cursor:move", (_event, point) => {
  if (!cursorEnabled || !point || !ensureCursorHelper()) return;
  const display = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
  const area = display.bounds;
  const target = {
    x: area.x + Math.max(0, Math.min(1, Number(point.x))) * area.width,
    y: area.y + Math.max(0, Math.min(1, Number(point.y))) * area.height,
  };
  const smoothing = cursorPosition ? 0.28 : 1;
  cursorPosition = {
    x: cursorPosition
      ? cursorPosition.x + (target.x - cursorPosition.x) * smoothing
      : target.x,
    y: cursorPosition
      ? cursorPosition.y + (target.y - cursorPosition.y) * smoothing
      : target.y,
  };
  cursorHelper.stdin.write(
    `move ${cursorPosition.x.toFixed(1)} ${cursorPosition.y.toFixed(1)}\n`,
  );
});
ipcMain.on("cursor:click", () => {
  if (!cursorEnabled || !ensureCursorHelper()) return;
  cursorHelper.stdin.write("click\n");
});

function broadcastKeyboardState() {
  for (const window of BrowserWindow.getAllWindows()) {
    window.webContents.send("keyboard:changed", keyboardVisible);
  }
}

function createKeyboardWindow() {
  const area = screen.getPrimaryDisplay().workArea;
  keyboardWindow = new BrowserWindow({
    width: Math.min(920, area.width - 40),
    height: 310,
    x: area.x + Math.round((area.width - Math.min(920, area.width - 40)) / 2),
    y: area.y + area.height - 330,
    transparent: true,
    frame: false,
    resizable: false,
    hasShadow: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    focusable: false,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  keyboardWindow.setAlwaysOnTop(true, "floating");
  keyboardWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  const target = process.env.VITE_DEV_SERVER_URL
    ? `${process.env.VITE_DEV_SERVER_URL}?keyboard=1`
    : `file://${path.join(__dirname, "..", "dist", "index.html")}?keyboard=1`;
  keyboardWindow.loadURL(target);
  keyboardWindow.on("closed", () => {
    keyboardWindow = null;
  });
}

function setKeyboardVisible(visible) {
  if (!keyboardWindow) createKeyboardWindow();
  keyboardVisible = Boolean(visible);
  if (keyboardVisible) keyboardWindow.showInactive();
  else keyboardWindow.hide();
  broadcastKeyboardState();
  return keyboardVisible;
}

ipcMain.handle("keyboard:get", () => keyboardVisible);
ipcMain.handle("keyboard:set", (_event, visible) =>
  setKeyboardVisible(visible),
);
ipcMain.handle("keyboard:toggle", () => setKeyboardVisible(!keyboardVisible));
ipcMain.on("keyboard:type", (_event, key) => {
  if (!keyboardVisible || !ensureCursorHelper()) return;
  const specialKeys = { Backspace: 51, Enter: 36, Tab: 48 };
  if (Object.hasOwn(specialKeys, key)) {
    cursorHelper.stdin.write(`key ${specialKeys[key]}\n`);
  } else if (typeof key === "string" && key.length === 1) {
    cursorHelper.stdin.write(`type ${key.charCodeAt(0)}\n`);
  }
});
ipcMain.on("keyboard:pointer", (_event, sample) => {
  if (!keyboardVisible || !keyboardWindow || !sample) return;
  const display = screen.getPrimaryDisplay();
  const area = display.bounds;
  const bounds = keyboardWindow.getBounds();
  const globalX =
    area.x + Math.max(0, Math.min(1, Number(sample.x))) * area.width;
  const globalY =
    area.y + Math.max(0, Math.min(1, Number(sample.y))) * area.height;
  keyboardWindow.webContents.send("keyboard:pointer", {
    hand: sample.hand === "Left" ? "Left" : "Right",
    x: globalX - bounds.x,
    y: globalY - bounds.y,
    tap: Boolean(sample.tap),
  });
});

function createWindow() {
  const window = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 880,
    minHeight: 640,
    title: "모션 단축키",
    backgroundColor: "#080909",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    window.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    window.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  }
}

function createOverlayWindow() {
  const area = screen.getPrimaryDisplay().workArea;
  overlayWindow = new BrowserWindow({
    width: 320,
    height: 420,
    x: area.x + area.width - 340,
    y: area.y + area.height - 440,
    transparent: true,
    frame: false,
    resizable: false,
    hasShadow: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    focusable: false,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  overlayWindow.setAlwaysOnTop(true, "floating");
  overlayWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  overlayWindow.setIgnoreMouseEvents(true);
  const target = process.env.VITE_DEV_SERVER_URL
    ? `${process.env.VITE_DEV_SERVER_URL}?overlay=1`
    : `file://${path.join(__dirname, "..", "dist", "index.html")}?overlay=1`;
  overlayWindow.loadURL(target);
  overlayWindow.on("closed", () => {
    overlayWindow = null;
  });
}

ipcMain.handle("overlay:set-mode", (_event, mode) => {
  if (!["camera", "person-pet", "hand-pet"].includes(mode)) return false;
  if (!overlayWindow) createOverlayWindow();
  if (mode === "camera") overlayWindow.hide();
  else {
    overlayWindow.showInactive();
    overlayWindow.webContents.send("overlay:mode", mode);
  }
  return true;
});

ipcMain.handle("overlay:set-color", (_event, color) => {
  if (!/^#[0-9a-f]{6}$/i.test(color)) return false;
  overlayWindow?.webContents.send("overlay:color", color);
  return true;
});

ipcMain.handle("apps:launch", async (_event, appId) => {
  const target = allowedApps[appId];
  if (!target) return { ok: false, error: "허용되지 않은 프로그램입니다." };
  if (process.platform !== "darwin")
    return { ok: false, error: "현재 MVP는 macOS만 지원합니다." };

  try {
    if (target.action === "spotlight") {
      await execFileAsync("/usr/bin/osascript", [
        "-e",
        'tell application "System Events" to key code 49 using command down',
      ]);
      return { ok: true, appName: target.name };
    }
    await execFileAsync("/usr/bin/open", ["-a", target.mac]);
    return { ok: true, appName: target.name };
  } catch (error) {
    if (
      appId === "spotlight" &&
      /assistive access|not authorized|1002/i.test(String(error))
    ) {
      return {
        ok: false,
        error:
          "Spotlight 실행 권한이 없습니다. 시스템 설정 → 개인정보 보호 및 보안 → 손쉬운 사용에서 Electron을 허용하세요.",
      };
    }
    return { ok: false, error: `${target.name}을(를) 열지 못했습니다.` };
  }
});

app.whenReady().then(() => {
  session.defaultSession.setPermissionRequestHandler(
    (webContents, permission, callback) => {
      const trusted =
        webContents.getURL().startsWith("http://127.0.0.1:5173") ||
        webContents.getURL().startsWith("file:");
      callback(trusted && permission === "media");
    },
  );
  createWindow();
  createOverlayWindow();
  createKeyboardWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
app.on("before-quit", stopCursorHelper);
