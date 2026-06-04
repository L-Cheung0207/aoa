import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const packageRoot = fileURLToPath(new URL("..", import.meta.url));

process.env.ELECTRON_BUILDER_BINARIES_MIRROR ??=
  "https://npmmirror.com/mirrors/electron-builder-binaries/";
process.env.CSC_IDENTITY_AUTO_DISCOVERY ??= "false";

const buildResult = spawnSync("pnpm", ["run", "build"], {
  cwd: packageRoot,
  stdio: "inherit",
  shell: true,
  env: process.env
});

if ((buildResult.status ?? 1) !== 0) {
  process.exit(buildResult.status ?? 1);
}

const result = spawnSync(
  "electron-builder",
  ["--win", "nsis", "--config", "electron-builder.yml"],
  {
    cwd: packageRoot,
    stdio: "inherit",
    shell: true,
    env: process.env
  }
);

process.exit(result.status ?? 1);
