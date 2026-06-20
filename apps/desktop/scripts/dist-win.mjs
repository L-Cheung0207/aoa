import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync
} from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

process.env.ELECTRON_BUILDER_BINARIES_MIRROR ??=
  "https://npmmirror.com/mirrors/electron-builder-binaries/";
process.env.CSC_IDENTITY_AUTO_DISCOVERY ??= "false";

const VERSION_PHASES = new Set(["ALPHA", "BETA", "RELEASE"]);

export function parseDistWinOptions(argv = []) {
  const phaseIndex = argv.findIndex((arg) => arg === "--phase");
  if (phaseIndex < 0) {
    return {};
  }
  const rawPhase = argv[phaseIndex + 1];
  const phase = rawPhase?.trim().toUpperCase();
  if (!phase || !VERSION_PHASES.has(phase)) {
    throw new Error(`Unsupported version phase: ${rawPhase ?? ""}`);
  }
  return { phase };
}

function createBuildEnv(options = {}) {
  return options.phase ? { AOA_VERSION_PHASE: options.phase } : undefined;
}

export function createDistWinCommands(scriptUrl = import.meta.url, options = {}) {
  const packageRoot = fileURLToPath(new URL("..", scriptUrl));
  const workspaceRoot = fileURLToPath(new URL("../../..", scriptUrl));
  const env = createBuildEnv(options);

  return [
    {
      command: "pnpm",
      args: ["--filter", "@voice/native-helper", "build:native"],
      cwd: workspaceRoot,
      env
    },
    {
      command: "pnpm",
      args: ["run", "build"],
      cwd: packageRoot,
      env
    },
    {
      command: "electron-builder",
      args: ["--win", "nsis", "--config", "electron-builder.yml"],
      cwd: packageRoot,
      env
    }
  ];
}


export function createDistInstallerShellCommands(
  scriptUrl = import.meta.url,
  options = {}
) {
  const packageRoot = fileURLToPath(new URL("..", scriptUrl));

  return [
    ...createDistWinCommands(scriptUrl, options),
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
    },
    {
      command: "node",
      args: ["scripts/dist-win.mjs", "--remove-legacy-installer-shell-artifacts"],
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

const MIN_EMBEDDED_NSIS_PAYLOAD_BYTES = 10 * 1024 * 1024;

export function validateInstallerPayloadSetup(setupPath, options = {}) {
  const getStats = options.statSync ?? statSync;
  const listDir = options.readdirSync ?? readdirSync;
  const setupSize = getStats(setupPath).size;
  const externalPackages = listDir(dirname(setupPath)).filter((fileName) =>
    fileName.endsWith(".nsis.7z")
  );

  if (
    setupSize < MIN_EMBEDDED_NSIS_PAYLOAD_BYTES ||
    externalPackages.length > 0
  ) {
    throw new Error(
      `Installer payload looks incomplete: ${setupPath} is only ${setupSize} bytes` +
        (externalPackages.length > 0
          ? ` and ${basename(dirname(setupPath))} contains ${externalPackages.join(", ")}`
          : "") +
        ". Remove dist-electron and rebuild the inner NSIS installer before preparing the installer shell payload."
    );
  }
}

export function prepareInstallerShellPayload(scriptUrl = import.meta.url) {
  const packageRoot = fileURLToPath(new URL("..", scriptUrl));
  const payloadRoot = join(packageRoot, "dist-installer-shell-payload");
  const setupPath = resolveInstallerPayloadSetupPath(packageRoot);
  validateInstallerPayloadSetup(setupPath);
  rmSync(payloadRoot, { recursive: true, force: true });
  mkdirSync(payloadRoot, { recursive: true });
  copyFileSync(setupPath, join(payloadRoot, "app-setup.exe"));
  writeFileSync(
    join(payloadRoot, "installer-shell.json"),
    JSON.stringify({ mode: "installer-shell" }, null, 2)
  );
  rmSync(setupPath, { force: true });
  rmSync(`${setupPath}.blockmap`, {
    force: true
  });
}

export function createInstallerShellCommands(scriptUrl = import.meta.url) {
  const packageRoot = fileURLToPath(new URL("..", scriptUrl));
  return [
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

export function removeLegacyInstallerShellArtifacts(packageRoot, options = {}) {
  const listDir = options.readdirSync ?? readdirSync;
  const removeFile = options.rmSync ?? rmSync;
  const outputDir = join(packageRoot, "dist-electron");
  for (const fileName of listDir(outputDir)) {
    if (fileName.startsWith("Voice Assistant Installer ")) {
      removeFile(join(outputDir, fileName), { force: true });
    }
  }
}

export function runDistWin(commands = createDistWinCommands()) {
  for (const { command, args, cwd, env } of commands) {
    const result = spawnSync(command, args, {
      cwd,
      stdio: "inherit",
      shell: true,
      env: { ...process.env, ...env }
    });
    const status = result.status ?? 1;
    if (status !== 0) {
      return status;
    }
  }
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const options = parseDistWinOptions(process.argv.slice(2));
  if (process.argv.includes("--prepare-installer-shell-payload")) {
    prepareInstallerShellPayload();
    process.exit(0);
  }
  if (process.argv.includes("--installer-shell")) {
    process.exit(runDistWin(createDistInstallerShellCommands(import.meta.url, options)));
  }
  if (process.argv.includes("--remove-legacy-installer-shell-artifacts")) {
    removeLegacyInstallerShellArtifacts(fileURLToPath(new URL("..", import.meta.url)));
    process.exit(0);
  }
  process.exit(runDistWin(createDistWinCommands(import.meta.url, options)));
}
