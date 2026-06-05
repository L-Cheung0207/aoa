import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync
} from "node:fs";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

process.env.ELECTRON_BUILDER_BINARIES_MIRROR ??=
  "https://npmmirror.com/mirrors/electron-builder-binaries/";
process.env.CSC_IDENTITY_AUTO_DISCOVERY ??= "false";

export function createDistWinCommands(scriptUrl = import.meta.url) {
  const packageRoot = fileURLToPath(new URL("..", scriptUrl));
  const workspaceRoot = fileURLToPath(new URL("../../..", scriptUrl));

  return [
    {
      command: "pnpm",
      args: ["--filter", "@voice/native-helper", "build:native"],
      cwd: workspaceRoot
    },
    {
      command: "pnpm",
      args: ["run", "build"],
      cwd: packageRoot
    },
    {
      command: "electron-builder",
      args: ["--win", "nsis", "--config", "electron-builder.yml"],
      cwd: packageRoot
    },
    {
      command: "node",
      args: ["scripts/dist-win.mjs", "--prepare-installer-shell-payload"],
      cwd: packageRoot
    },
    {
      command: "electron-builder",
      args: [
        "--win",
        "portable",
        "--config",
        "electron-builder.installer-shell.yml"
      ],
      cwd: packageRoot
    }
  ];
}

export function resolveInstallerPayloadSetupPath(packageRoot, options = {}) {
  const readPackageJson =
    options.readPackageJson ??
    (() => readFileSync(join(packageRoot, "package.json"), "utf8"));
  const { version } = JSON.parse(readPackageJson());
  return join(packageRoot, "dist-electron", `Voice Assistant Setup ${version}.exe`);
}

export function prepareInstallerShellPayload(scriptUrl = import.meta.url) {
  const packageRoot = fileURLToPath(new URL("..", scriptUrl));
  const payloadRoot = join(packageRoot, "dist-installer-shell-payload");
  rmSync(payloadRoot, { recursive: true, force: true });
  mkdirSync(payloadRoot, { recursive: true });
  copyFileSync(
    resolveInstallerPayloadSetupPath(packageRoot),
    join(payloadRoot, "app-setup.exe")
  );
  writeFileSync(
    join(payloadRoot, "installer-shell.json"),
    JSON.stringify({ mode: "installer-shell" }, null, 2)
  );
}

export function runDistWin(commands = createDistWinCommands()) {
  for (const { command, args, cwd } of commands) {
    const result = spawnSync(command, args, {
      cwd,
      stdio: "inherit",
      shell: true,
      env: process.env
    });
    const status = result.status ?? 1;
    if (status !== 0) {
      return status;
    }
  }
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv.includes("--prepare-installer-shell-payload")) {
    prepareInstallerShellPayload();
    process.exit(0);
  }
  process.exit(runDistWin());
}
