import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const packageRoot = fileURLToPath(new URL("..", import.meta.url));

process.env.ELECTRON_BUILDER_BINARIES_MIRROR ??=
  "https://npmmirror.com/mirrors/electron-builder-binaries/";
process.env.CSC_IDENTITY_AUTO_DISCOVERY ??= "false";

const result = spawnSync("electron-builder", ["--win"], {
  cwd: packageRoot,
  stdio: "inherit",
  shell: true,
  env: process.env
});

process.exit(result.status ?? 1);
