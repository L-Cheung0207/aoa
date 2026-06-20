import { spawnSync } from "node:child_process";
import { copyFileSync, cpSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const PRODUCT_NAME = "Voice Assistant";

export function createDevElectronPaths(
  packageRoot = fileURLToPath(new URL("..", import.meta.url)),
  workspaceRoot = fileURLToPath(new URL("../../..", import.meta.url)),
  platform = process.platform,
) {
  const sourceElectronDir = join(
    workspaceRoot,
    "node_modules",
    "electron",
    "dist",
  );
  const devElectronDir = join(packageRoot, ".dev-electron", "electron-dist");
  const isWindows = platform === "win32";
  const electronExecutableRelativePath = isWindows
    ? "electron.exe"
    : join("Electron.app", "Contents", "MacOS", "Electron");
  const sourceElectronExe = join(sourceElectronDir, electronExecutableRelativePath);
  return {
    sourceElectronDir,
    sourceElectronExe,
    devElectronDir,
    devElectronExe: isWindows
      ? join(devElectronDir, `${PRODUCT_NAME} Dev.exe`)
      : sourceElectronExe,
    sourceConfigPath: join(packageRoot, "config.json"),
    devResourcesDir: join(
      devElectronDir,
      ...(isWindows ? ["resources"] : ["Electron.app", "Contents", "Resources"]),
    ),
    devConfigPath: join(
      devElectronDir,
      ...(isWindows
        ? ["resources", "config.json"]
        : ["Electron.app", "Contents", "Resources", "config.json"]),
    ),
    iconPath: join(packageRoot, "resources", "app-icon.ico"),
    shouldPrepareExecutable: isWindows,
    shouldBrandExecutable: isWindows,
  };
}

export function createDevElectronEnv(
  baseEnv,
  devElectronExe,
) {
  return {
    ...baseEnv,
    ELECTRON_EXEC_PATH: devElectronExe,
  };
}

export function createElectronViteDevArgs(extraArgs = []) {
  const forwardedArgs = extraArgs[0] === "--" ? extraArgs.slice(1) : extraArgs;
  return ["dev", ...forwardedArgs];
}

export function shouldBuildNativeHelperForDev(platform = process.platform) {
  return platform === "darwin" || platform === "win32";
}

export function buildNativeHelperForDev({
  platform = process.platform,
  spawnSync,
  workspaceRoot,
}) {
  if (!shouldBuildNativeHelperForDev(platform)) {
    return 0;
  }

  console.log("[dev] building native helper for global shortcuts");
  const result = spawnSync(
    "pnpm",
    ["--filter", "@voice/native-helper", "build:native"],
    {
      cwd: workspaceRoot,
      shell: true,
      stdio: "inherit",
    },
  );
  return result.status ?? 1;
}

export function buildAppBuilderRceditArgs({
  exePath,
  iconPath,
}) {
  return [
    exePath,
    "--set-icon",
    iconPath,
    "--set-version-string",
    "FileDescription",
    PRODUCT_NAME,
    "--set-version-string",
    "ProductName",
    PRODUCT_NAME,
    "--set-version-string",
    "InternalName",
    `${PRODUCT_NAME} Dev`,
    "--set-version-string",
    "OriginalFilename",
    `${PRODUCT_NAME} Dev.exe`,
  ];
}

export function resolveCachedRceditPath({
  existsSync,
  localAppData = process.env.LOCALAPPDATA,
  readdirSync,
}) {
  if (!localAppData) {
    return undefined;
  }

  const cacheRoot = join(localAppData, "electron-builder", "Cache", "winCodeSign");
  if (!existsSync(cacheRoot)) {
    return undefined;
  }

  const cacheDirs = readdirSync(cacheRoot)
    .filter((entry) => !entry.endsWith(".7z"))
    .sort()
    .reverse();
  for (const cacheDir of cacheDirs) {
    const candidate = join(cacheRoot, cacheDir, "rcedit-x64.exe");
    if (existsSync(candidate)) {
      return candidate;
    }
  }
  return undefined;
}

export function prepareDevElectronExecutable({
  copyFileSync,
  cpSync,
  existsSync,
  iconPath,
  mkdirSync,
  rceditPath,
  readdirSync,
  shouldPrepareExecutable = true,
  shouldBrandExecutable = true,
  spawnSync,
  sourceElectronExe,
  sourceElectronDir,
  devElectronDir,
  devElectronExe,
  sourceConfigPath,
  devResourcesDir,
  devConfigPath,
}) {
  if (!shouldPrepareExecutable) {
    return;
  }

  if (!existsSync(devElectronExe)) {
    mkdirSync(devElectronDir, { recursive: true });
    cpSync(sourceElectronDir, devElectronDir, { recursive: true, force: true });
    if (shouldBrandExecutable) {
      copyFileSync(sourceElectronExe, devElectronExe);
    }
  }
  if (sourceConfigPath && devResourcesDir && devConfigPath) {
    mkdirSync(devResourcesDir, { recursive: true });
    copyFileSync(sourceConfigPath, devConfigPath);
  }

  if (!shouldBrandExecutable) {
    return;
  }

  const resolvedRceditPath =
    rceditPath ?? resolveCachedRceditPath({ existsSync, readdirSync });
  if (!resolvedRceditPath) {
    throw new Error(
      "rcedit-x64.exe is not available in the electron-builder cache. Run a Windows package build once so electron-builder downloads winCodeSign.",
    );
  }

  const result = spawnSync(
    resolvedRceditPath,
    buildAppBuilderRceditArgs({ exePath: devElectronExe, iconPath }),
    { stdio: "inherit" },
  );
  if ((result.status ?? 1) !== 0) {
    throw new Error(`Failed to brand development Electron executable: ${devElectronExe}`);
  }
}

export function runDevElectron(scriptUrl = import.meta.url) {
  const packageRoot = fileURLToPath(new URL("..", scriptUrl));
  const workspaceRoot = fileURLToPath(new URL("../../..", scriptUrl));
  const nativeHelperStatus = buildNativeHelperForDev({
    platform: process.platform,
    spawnSync,
    workspaceRoot,
  });
  if (nativeHelperStatus !== 0) {
    console.warn(
      "[dev] native helper build failed; continuing without global Right Cmd/Right Alt shortcuts.",
    );
  }

  const paths = createDevElectronPaths(packageRoot);
  prepareDevElectronExecutable({
    copyFileSync,
    cpSync,
    existsSync,
    iconPath: paths.iconPath,
    mkdirSync,
    readdirSync,
    spawnSync,
    sourceElectronDir: paths.sourceElectronDir,
    sourceElectronExe: paths.sourceElectronExe,
    devElectronDir: paths.devElectronDir,
    devElectronExe: paths.devElectronExe,
    sourceConfigPath: paths.sourceConfigPath,
    devResourcesDir: paths.devResourcesDir,
    devConfigPath: paths.devConfigPath,
    shouldPrepareExecutable: paths.shouldPrepareExecutable,
    shouldBrandExecutable: paths.shouldBrandExecutable,
  });

  const result = spawnSync("electron-vite", createElectronViteDevArgs(process.argv.slice(2)), {
    cwd: packageRoot,
    env: createDevElectronEnv(process.env, paths.devElectronExe),
    shell: true,
    stdio: "inherit",
  });
  return result.status ?? 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(runDevElectron());
}
