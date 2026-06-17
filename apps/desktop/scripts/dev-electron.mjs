import { spawnSync } from "node:child_process";
import { copyFileSync, cpSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const PRODUCT_NAME = "Voice Assistant";

export function createDevElectronPaths(
  packageRoot = fileURLToPath(new URL("..", import.meta.url)),
  workspaceRoot = fileURLToPath(new URL("../../..", import.meta.url)),
) {
  const sourceElectronDir = join(
    workspaceRoot,
    "node_modules",
    "electron",
    "dist",
  );
  const devElectronDir = join(packageRoot, ".dev-electron", "electron-dist");
  return {
    sourceElectronDir,
    sourceElectronExe: join(sourceElectronDir, "electron.exe"),
    devElectronDir,
    devElectronExe: join(devElectronDir, `${PRODUCT_NAME} Dev.exe`),
    iconPath: join(packageRoot, "resources", "app-icon.ico"),
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
  spawnSync,
  sourceElectronExe,
  sourceElectronDir,
  devElectronDir,
  devElectronExe,
}) {
  if (!existsSync(devElectronExe)) {
    mkdirSync(devElectronDir, { recursive: true });
    cpSync(sourceElectronDir, devElectronDir, { recursive: true, force: true });
    copyFileSync(sourceElectronExe, devElectronExe);
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
  });

  const result = spawnSync("electron-vite", ["dev"], {
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
