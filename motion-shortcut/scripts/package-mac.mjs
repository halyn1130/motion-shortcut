import { execFileSync } from "node:child_process";
import {
  cpSync,
  mkdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(".");
const releaseDirectory = join(root, "release");
const stagingDirectory = join(root, ".package-staging");
const appName = "Motion Shortcut.app";
const appPath = join(releaseDirectory, appName);
const resourcesPath = join(appPath, "Contents", "Resources");
const plistPath = join(appPath, "Contents", "Info.plist");
const version = JSON.parse(
  readFileSync(join(root, "package.json"), "utf8"),
).version;
const artifactBase = `Motion-Shortcut-${version}-arm64`;

rmSync(releaseDirectory, { recursive: true, force: true });
rmSync(stagingDirectory, { recursive: true, force: true });
mkdirSync(releaseDirectory, { recursive: true });
mkdirSync(stagingDirectory, { recursive: true });

cpSync(
  join(root, "node_modules", "electron", "dist", "Electron.app"),
  appPath,
  {
    recursive: true,
    verbatimSymlinks: true,
  },
);

const appSource = join(stagingDirectory, "app");
mkdirSync(appSource, { recursive: true });
cpSync(join(root, "dist"), join(appSource, "dist"), { recursive: true });
cpSync(join(root, "electron"), join(appSource, "electron"), {
  recursive: true,
});
cpSync(join(root, "package.json"), join(appSource, "package.json"));
rmSync(join(resourcesPath, "default_app.asar"), { force: true });
execFileSync(
  join(root, "node_modules", ".bin", "asar"),
  ["pack", appSource, join(resourcesPath, "app.asar")],
  { stdio: "inherit" },
);

mkdirSync(join(resourcesPath, "native"), { recursive: true });
cpSync(
  join(root, "build", "native", "motion-cursor-helper"),
  join(resourcesPath, "native", "motion-cursor-helper"),
);

const plistBuddy = "/usr/libexec/PlistBuddy";
const setPlist = (key, value, type = "string") => {
  try {
    execFileSync(plistBuddy, ["-c", `Set :${key} ${value}`, plistPath]);
  } catch {
    execFileSync(plistBuddy, ["-c", `Add :${key} ${type} ${value}`, plistPath]);
  }
};
setPlist("CFBundleDisplayName", "모션 단축키");
setPlist("CFBundleIdentifier", "com.motionshortcut.app");
setPlist("CFBundleShortVersionString", version);
setPlist("CFBundleVersion", version);
setPlist(
  "NSCameraUsageDescription",
  "손동작을 인식하여 모션 단축키를 실행하기 위해 카메라를 사용합니다.",
);
setPlist("LSApplicationCategoryType", "public.app-category.utilities");

// app.asar와 Info.plist를 교체하면 Electron 원본 서명이 무효가 된다.
// 배포 앱 전체를 하나의 안정된 macOS 신원으로 다시 서명한다.
execFileSync(
  "/usr/bin/codesign",
  ["--force", "--deep", "--sign", "-", appPath],
  { stdio: "inherit" },
);
execFileSync(
  "/usr/bin/codesign",
  ["--verify", "--deep", "--strict", "--verbose=2", appPath],
  { stdio: "inherit" },
);

execFileSync(
  "/usr/bin/ditto",
  [
    "-c",
    "-k",
    "--sequesterRsrc",
    "--keepParent",
    appPath,
    join(releaseDirectory, `${artifactBase}.zip`),
  ],
  { stdio: "inherit" },
);

const dmgSource = join(stagingDirectory, "dmg");
mkdirSync(dmgSource, { recursive: true });
cpSync(appPath, join(dmgSource, appName), {
  recursive: true,
  verbatimSymlinks: true,
});
symlinkSync("/Applications", join(dmgSource, "Applications"));
writeFileSync(
  join(dmgSource, "처음 실행 안내.txt"),
  "Apple Silicon Mac 전용입니다.\n\n1. 앱을 Applications로 드래그합니다.\n2. 앱을 우클릭하고 ‘열기’를 선택합니다.\n3. 카메라 및 손쉬운 사용 권한을 허용합니다.\n4. 권한 변경 후 앱을 다시 실행합니다.\n",
);
execFileSync(
  "/usr/bin/hdiutil",
  [
    "create",
    "-volname",
    `모션 단축키 ${version}`,
    "-srcfolder",
    dmgSource,
    "-ov",
    "-format",
    "UDZO",
    join(releaseDirectory, `${artifactBase}.dmg`),
  ],
  { stdio: "inherit" },
);

rmSync(stagingDirectory, { recursive: true, force: true });
console.log(`Created ${join(releaseDirectory, `${artifactBase}.dmg`)}`);
console.log(`Created ${join(releaseDirectory, `${artifactBase}.zip`)}`);
