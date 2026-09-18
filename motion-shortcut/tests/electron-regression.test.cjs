// OS and Electron boundaries are mocked. These tests never send real input.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const fs = require("node:fs");
const path = require("node:path");
const { EventEmitter } = require("node:events");
const { promisify } = require("node:util");

function harness() {
  const windows = [],
    writes = [],
    handlers = new Map();
  const ipcMain = new EventEmitter();
  ipcMain.handle = (name, handler) => handlers.set(name, handler);
  let ready;
  class Window extends EventEmitter {
    constructor(options) {
      super();
      this.options = options;
      this.visible = false;
      this.position = null;
      this.messages = [];
      this.webContents = {
        send: (...args) => this.messages.push(args),
        getURL: () => "file:///app/index.html",
      };
      windows.push(this);
    }
    static getAllWindows() {
      return windows;
    }
    loadURL() {}
    loadFile() {}
    setAlwaysOnTop() {}
    setVisibleOnAllWorkspaces() {}
    setIgnoreMouseEvents() {}
    setOpacity() {}
    setBounds(bounds) {
      this.bounds = bounds;
    }
    getBounds() {
      return this.bounds ?? { x: 0, y: 0, width: 320, height: 420 };
    }
    setPosition(x, y) {
      this.position = [x, y];
    }
    hide() {
      this.visible = false;
    }
    showInactive() {
      this.visible = true;
    }
  }
  const display = {
    id: 1,
    bounds: { x: 0, y: 0, width: 1000, height: 800 },
    workArea: { x: 0, y: 0, width: 1000, height: 800 },
    label: "Test display",
  };
  const electron = {
    app: {
      isPackaged: false,
      getPath: () => "/virtual",
      whenReady: () => ({
        then: (callback) => {
          ready = callback;
        },
      }),
      on() {},
    },
    BrowserWindow: Window,
    ipcMain,
    session: { defaultSession: { setPermissionRequestHandler() {} } },
    screen: {
      getAllDisplays: () => [display],
      getPrimaryDisplay: () => display,
      getCursorScreenPoint: () => ({ x: 0, y: 0 }),
      getDisplayNearestPoint: () => display,
    },
    systemPreferences: {
      isTrustedAccessibilityClient: () => true,
      getMediaAccessStatus: () => "granted",
    },
    dialog: {},
    shell: {},
  };
  function execFile() {}
  execFile[promisify.custom] = async () => ({
    stdout: "Microsoft PowerPoint",
    stderr: "",
  });
  const childProcess = {
    execFile,
    spawnSync: () => ({ status: 0 }),
    spawn: () => {
      const child = new EventEmitter();
      child.stderr = new EventEmitter();
      child.stdin = { write: (value) => writes.push(value) };
      child.kill = () => {
        child.killed = true;
      };
      return child;
    },
  };
  const context = vm.createContext({
    require: (name) =>
      name === "electron"
        ? electron
        : name === "node:child_process"
          ? childProcess
          : name === "node:fs"
            ? {
                existsSync: () => false,
                mkdirSync() {},
                readFileSync() {
                  throw Error("not found");
                },
                writeFileSync() {},
              }
            : require(name),
    __dirname: path.resolve(__dirname, "../electron"),
    process: {
      platform: "darwin",
      env: {},
      resourcesPath: "/virtual/resources",
    },
    console,
    setTimeout,
    clearTimeout,
    Buffer,
  });
  vm.runInContext(
    fs.readFileSync(path.resolve(__dirname, "../electron/main.cjs"), "utf8"),
    context,
  );
  ready();
  return {
    windows,
    writes,
    ipcMain,
    call: (name, ...args) =>
      handlers.get(name)({ sender: windows[0].webContents }, ...args),
    state: (expression) => vm.runInContext(expression, context),
  };
}

test("overlay OFF and ON preserve camera and motion state", () => {
  const h = harness();
  h.call("camera:set", true);
  h.call("motion:set", true);
  h.call("overlay:set-mode", "hand-pet");
  assert.equal(h.windows[1].visible, true);
  h.call("overlay:set-mode", "camera");
  assert.equal(h.windows[1].visible, false);
  assert.equal(h.call("camera:get"), true);
  assert.equal(h.call("motion:get"), true);
});
test("overlay only accepts main renderer frames while enabled", () => {
  const h = harness();
  h.call("camera:set", true);
  h.call("overlay:set-mode", "hand-pet");
  const frame = { hands: [], ratio: 16 / 9 };
  h.ipcMain.emit("overlay:frame", { sender: {} }, frame);
  assert.equal(
    h.windows[1].messages.filter((m) => m[0] === "overlay:frame").length,
    0,
  );
  h.ipcMain.emit("overlay:frame", { sender: h.windows[0].webContents }, frame);
  assert.equal(
    h.windows[1].messages.filter((m) => m[0] === "overlay:frame").length,
    1,
  );
  h.call("overlay:set-mode", "camera");
  h.ipcMain.emit("overlay:frame", { sender: h.windows[0].webContents }, frame);
  assert.equal(
    h.windows[1].messages.filter((m) => m[0] === "overlay:frame").length,
    1,
  );
});
test("legacy laser gesture selects the unified clickable pointer", () => {
  const h = harness();
  h.call("camera:set", true);
  h.call("motion:set", true);
  const result = h.call("presentation:set-mode", "laser");
  assert.equal(result.ok, true);
  assert.equal(result.mode, "cursor");
  assert.equal(h.call("cursor:get"), true);
});
test("native pointer and laser share the same smoothed position", () => {
  const h = harness();
  h.call("camera:set", true);
  h.call("motion:set", true);
  h.call("presentation:set-mode", "cursor");
  h.ipcMain.emit("cursor:move", {}, { x: 0.2, y: 0.375 });
  assert.equal(h.writes.at(-1), "move 200.0 300.0\n");
  assert.deepEqual(h.windows[2].position, [130, 230]);
  h.ipcMain.emit("cursor:move", {}, { x: 1, y: 1 });
  assert.equal(h.writes.at(-1), "move 424.0 440.0\n");
  assert.deepEqual(h.windows[2].position, [354, 370]);
  h.ipcMain.emit("cursor:click", {});
  assert.equal(h.writes.at(-1), "click\n");
});
test("motion and camera OFF stop pointer input and hide laser", () => {
  const h = harness();
  h.call("camera:set", true);
  h.call("motion:set", true);
  h.call("presentation:set-mode", "cursor");
  h.ipcMain.emit("cursor:move", {}, { x: 0.5, y: 0.5 });
  h.call("camera:set", false);
  const count = h.writes.length;
  h.ipcMain.emit("cursor:move", {}, { x: 0.8, y: 0.8 });
  h.ipcMain.emit("cursor:click", {});
  assert.equal(h.writes.length, count);
  assert.equal(h.call("motion:get"), false);
  assert.equal(h.windows[2].visible, false);
});
test("custom shortcuts pass modifier flags and retain command cooldown", async () => {
  const h = harness();
  const result = await h.call(
    "presentation:execute",
    "next-slide",
    "powerpoint",
    "",
    { key: "k", modifiers: ["Meta", "Shift"] },
  );
  assert.equal(result.ok, true);
  assert.equal(h.writes.at(-1), "shortcut 40 9\n");
  const again = await h.call(
    "presentation:execute",
    "next-slide",
    "powerpoint",
    "",
    { key: "k", modifiers: ["Meta", "Shift"] },
  );
  assert.equal(again.ok, false);
  assert.equal(h.writes.length, 1);
});
test("invalid shortcut and unknown commands never reach native input", async () => {
  const h = harness();
  for (const [command, shortcut] of [
    ["unknown", undefined],
    ["next-slide", { key: "no-such-key", modifiers: [] }],
    ["next-slide", { key: "k", modifiers: ["Inject"] }],
  ]) {
    assert.equal(
      (
        await h.call(
          "presentation:execute",
          command,
          "powerpoint",
          "",
          shortcut,
        )
      ).ok,
      false,
    );
  }
  assert.equal(h.writes.length, 0);
});
test("default shortcuts remain backwards compatible", async () => {
  const h = harness();
  assert.equal(
    (await h.call("presentation:execute", "next-slide", "powerpoint", "")).ok,
    true,
  );
  assert.equal(h.writes.at(-1), "shortcut 124 0\n");
});
