import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// https://vite.dev/config/
export default defineConfig({
  base: "./",
  plugins: [react(), {
    name: "pdfjs-assets",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const match = req.url?.split("?")[0].match(/^\/pdfjs\/(cmaps|standard_fonts|wasm)\/([a-zA-Z0-9_.-]+)$/);
        if (!match) return next();
        try {
          const data = readFileSync(resolve("node_modules/pdfjs-dist", match[1], match[2]));
          res.setHeader("Content-Type", match[2].endsWith(".wasm") ? "application/wasm" : match[2].endsWith(".js") ? "text/javascript" : "application/octet-stream");
          res.end(data);
        } catch { next(); }
      });
    },
    generateBundle() {
      for (const directory of ["cmaps", "standard_fonts", "wasm"]) {
        const root = resolve("node_modules/pdfjs-dist", directory);
        for (const name of readdirSync(root)) {
          this.emitFile({ type: "asset", fileName: `pdfjs/${directory}/${name}`, source: readFileSync(resolve(root, name)) });
        }
      }
    },
  }],
  test: {
    include: ["src/**/*.test.{ts,tsx}"],
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
  },
});
