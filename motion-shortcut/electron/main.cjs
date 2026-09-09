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
let mainWindow = null;
let restoreMainWindowAfterKeyboard = false;
let keyboardVisible = false;
let overlayMode = "camera";
let motionEnabled = true;
let cursorEnabled = false;
let cursorSensitivity = 1;
let typingSensitivity = 0.35;
let cursorHelper = null;
let cursorPosition = null;
let overlayEditing = false;
let overlayScale = 1;
const lastKeyboardTap = { Left: 0, Right: 0 };
const OVERLAY_BASE_SIZE = { width: 320, height: 420 };

function overlayLayoutPath() {
  return path.join(app.getPath("userData"), "overlay-layout.json");
}

function readOverlayLayout(area) {
  try {
    const saved = JSON.parse(fs.readFileSync(overlayLayoutPath(), "utf8"));
    const scale = Math.max(0.6, Math.min(1.6, Number(saved.scale) || 1));
    const width = Math.round(OVERLAY_BASE_SIZE.width * scale);
    const height = Math.round(OVERLAY_BASE_SIZE.height * scale);
    const savedX = Number.isFinite(Number(saved.x))
      ? Number(saved.x)
      : area.x + area.width - width - 20;
    const savedY = Number.isFinite(Number(saved.y))
      ? Number(saved.y)
      : area.y + area.height - height - 20;
    return {
      x: Math.max(area.x, Math.min(area.x + area.width - width, savedX)),
      y: Math.max(area.y, Math.min(area.y + area.height - height, savedY)),
      width,
      height,
      scale,
    };
  } catch {
    return {
      x: area.x + area.width - 340,
      y: area.y + area.height - 440,
      ...OVERLAY_BASE_SIZE,
      scale: 1,
    };
  }
}

function saveOverlayLayout() {
  if (!overlayWindow) return;
  const { x, y } = overlayWindow.getBounds();
  fs.writeFileSync(
    overlayLayoutPath(),
    JSON.stringify({ x, y, scale: overlayScale }),
  );
}

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
  const isBundled = app.isPackaged || __dirname.includes("app.asar");
  const helperDirectory = path.join(app.getPath("userData"), "native");
  const helperPath = isBundled
    ? path.join(process.resourcesPath, "native", "motion-cursor-helper")
    : path.join(helperDirectory, "motion-cursor-helper");
  const sourcePath = path.join(__dirname, "cursor-helper.c");
  try {
    if (isBundled) {
      if (!fs.existsSync(helperPath)) return false;
    } else {
      fs.mkdirSync(helperDirectory, { recursive: true });
      const sourceChanged =
        !fs.existsSync(helperPath) ||
        fs.statSync(sourcePath).mtimeMs > fs.statSync(helperPath).mtimeMs;
      if (!sourceChanged) {
        cursorHelper = spawn(helperPath, [], {
          stdio: ["pipe", "ignore", "pipe"],
        });
      } else {
        const compiled = spawnSync(
          "/usr/bin/clang",
          [
            sourcePath,
            "-framework",
            "ApplicationServices",
            "-framework",
            "Carbon",
            "-o",
            helperPath,
          ],
          { encoding: "utf8" },
        );
        if (compiled.status !== 0) {
          console.error(`[cursor-helper] ${compiled.stderr}`);
          return false;
        }
      }
    }
  } catch (error) {
    console.error("[cursor-helper] build failed", error);
    return false;
  }
  if (!cursorHelper)
    cursorHelper = spawn(helperPath, [], {
      stdio: ["pipe", "ignore", "pipe"],
    });
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
      backgroundThrottling: false,
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
  if (keyboardVisible) {
    if (process.platform === "darwin") {
      const trusted = systemPreferences.isTrustedAccessibilityClient(false);
      if (trusted && ensureCursorHelper()) {
        cursorHelper.stdin.write("input-korean\n");
      }
    }
    if (mainWindow?.isFocused()) {
      restoreMainWindowAfterKeyboard = true;
      mainWindow.hide();
    }
    if (overlayMode !== "camera" && overlayWindow) {
      overlayWindow.setOpacity(0);
      overlayWindow.showInactive();
    }
    keyboardWindow.showInactive();
  } else {
    if (cursorHelper && !cursorHelper.killed) {
      cursorHelper.stdin.write("input-restore\n");
    }
    keyboardWindow.hide();
    if (restoreMainWindowAfterKeyboard && mainWindow) {
      mainWindow.show();
      restoreMainWindowAfterKeyboard = false;
    }
    if (overlayMode !== "camera" && overlayWindow) {
      overlayWindow.setOpacity(1);
      overlayWindow.showInactive();
    }
  }
  broadcastKeyboardState();
  return keyboardVisible;
}

ipcMain.handle("keyboard:get", () => keyboardVisible);
ipcMain.handle("keyboard:get-sensitivity", () => typingSensitivity);
ipcMain.handle("keyboard:set-sensitivity", (_event, value) => {
  typingSensitivity = Math.max(0.2, Math.min(1, Number(value) || 0.35));
  for (const window of BrowserWindow.getAllWindows()) {
    window.webContents.send("keyboard:sensitivity-changed", typingSensitivity);
  }
  return typingSensitivity;
});
ipcMain.handle("keyboard:set", (_event, visible) =>
  setKeyboardVisible(visible),
);
ipcMain.handle("keyboard:toggle", () => setKeyboardVisible(!keyboardVisible));
const macKeyCodes = Object.freeze({
  a: 0,
  s: 1,
  d: 2,
  f: 3,
  h: 4,
  g: 5,
  z: 6,
  x: 7,
  c: 8,
  v: 9,
  b: 11,
  q: 12,
  w: 13,
  e: 14,
  r: 15,
  y: 16,
  t: 17,
  1: 18,
  2: 19,
  3: 20,
  4: 21,
  6: 22,
  5: 23,
  9: 25,
  7: 26,
  8: 28,
  0: 29,
  o: 31,
  u: 32,
  i: 34,
  p: 35,
  l: 37,
  j: 38,
  k: 40,
  n: 45,
  m: 46,
  Space: 49,
  Backspace: 51,
  Enter: 36,
  Tab: 48,
});
ipcMain.handle("keyboard:type", (_event, key) => {
  if (!keyboardVisible) return { ok: false, error: "키보드가 닫혀 있습니다." };
  if (
    process.platform === "darwin" &&
    !systemPreferences.isTrustedAccessibilityClient(false)
  ) {
    return {
      ok: false,
      error: "시스템 설정에서 모션 단축키의 손쉬운 사용 권한이 필요합니다.",
    };
  }
  if (!ensureCursorHelper()) {
    return { ok: false, error: "macOS 입력 모듈을 시작하지 못했습니다." };
  }
  const normalized = key === " " ? "Space" : String(key);
  const baseKey =
    normalized.length === 1 ? normalized.toLowerCase() : normalized;
  const keyCode = macKeyCodes[baseKey];
  if (keyCode === undefined)
    return { ok: false, error: "지원하지 않는 키입니다." };
  const shifted = normalized.length === 1 && normalized !== baseKey;
  cursorHelper.stdin.write(`${shifted ? "keyshift" : "key"} ${keyCode}\n`);
  return { ok: true };
});
ipcMain.on("keyboard:pointer", (_event, sample) => {
  if (!keyboardVisible || !keyboardWindow || !sample) return;
  const bounds = keyboardWindow.getBounds();
  const hand = sample.hand === "Left" ? "Left" : "Right";
  let tap = Boolean(sample.tap);
  const now = Date.now();
  if (tap && now - lastKeyboardTap[hand] < 280) tap = false;
  if (tap) lastKeyboardTap[hand] = now;
  keyboardWindow.webContents.send("keyboard:pointer", {
    hand,
    x: Math.max(0, Math.min(1, Number(sample.x))) * bounds.width,
    y: Math.max(0, Math.min(1, Number(sample.y))) * bounds.height,
    tap,
  });
});
ipcMain.on("keyboard:hands", (_event, hands) => {
  if (!keyboardVisible || !keyboardWindow || !Array.isArray(hands)) return;
  keyboardWindow.webContents.send("keyboard:hands", hands);
});

function createWindow() {
  mainWindow = new BrowserWindow({
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
      backgroundThrottling: false,
    },
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  }
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function createOverlayWindow() {
  const area = screen.getPrimaryDisplay().workArea;
  const layout = readOverlayLayout(area);
  overlayScale = layout.scale;
  overlayWindow = new BrowserWindow({
    width: layout.width,
    height: layout.height,
    x: layout.x,
    y: layout.y,
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
      backgroundThrottling: false,
    },
  });
  overlayWindow.setAlwaysOnTop(true, "floating");
  overlayWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  overlayWindow.setIgnoreMouseEvents(true);
  overlayWindow.on("moved", saveOverlayLayout);
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
  overlayMode = mode;
  if (!overlayWindow) createOverlayWindow();
  if (mode === "camera") overlayWindow.hide();
  else {
    overlayWindow.setOpacity(keyboardVisible ? 0 : 1);
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

ipcMain.handle("overlay:get-layout", () => ({
  scale: overlayScale,
  editing: overlayEditing,
}));
ipcMain.handle("overlay:set-scale", (_event, nextScale) => {
  if (!overlayWindow) createOverlayWindow();
  overlayScale = Math.max(0.6, Math.min(1.6, Number(nextScale) || 1));
  const bounds = overlayWindow.getBounds();
  const width = Math.round(OVERLAY_BASE_SIZE.width * overlayScale);
  const height = Math.round(OVERLAY_BASE_SIZE.height * overlayScale);
  overlayWindow.setBounds({
    x: Math.round(bounds.x + (bounds.width - width) / 2),
    y: Math.round(bounds.y + bounds.height - height),
    width,
    height,
  });
  saveOverlayLayout();
  return overlayScale;
});
ipcMain.handle("overlay:set-editing", (_event, editing) => {
  if (!overlayWindow) createOverlayWindow();
  overlayEditing = Boolean(editing);
  overlayWindow.setIgnoreMouseEvents(!overlayEditing);
  overlayWindow.webContents.send("overlay:editing", overlayEditing);
  if (overlayEditing && overlayMode !== "camera") overlayWindow.showInactive();
  return overlayEditing;
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
