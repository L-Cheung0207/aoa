import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig, externalizeDepsPlugin } from "electron-vite";

// Workspace 包的 `exports` 指向 TypeScript 源码，必须让 Rollup bundle 进产物，
// 否则 Node ESM 运行时无法加载 `.ts`。
const WORKSPACE_PACKAGES = [
  "@voice/shared",
  "@voice/backend-client",
  "@voice/ai",
  "@voice/db",
  "@voice/native-helper"
];

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin({ exclude: WORKSPACE_PACKAGES })],
    build: {
      rollupOptions: {
        input: resolve(__dirname, "src/main/index.ts")
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin({ exclude: WORKSPACE_PACKAGES })],
    build: {
      rollupOptions: {
        input: resolve(__dirname, "src/preload/index.ts")
      }
    }
  },
  renderer: {
    root: resolve(__dirname, "src/renderer"),
    plugins: [react()]
  }
});
