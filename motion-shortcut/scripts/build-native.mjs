import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

const outputDirectory = resolve("build/native");
mkdirSync(outputDirectory, { recursive: true });
execFileSync(
  "/usr/bin/clang",
  [
    "-arch",
    "arm64",
    resolve("electron/cursor-helper.c"),
    "-framework",
    "ApplicationServices",
    "-o",
    resolve(outputDirectory, "motion-cursor-helper"),
  ],
  { stdio: "inherit" },
);
execFileSync(
  "/usr/bin/codesign",
  ["--force", "--sign", "-", resolve(outputDirectory, "motion-cursor-helper")],
  { stdio: "inherit" },
);
