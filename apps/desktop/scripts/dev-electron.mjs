import { spawnSync } from "node:child_process";
import { copyFileSync, cpSync, existsSync, mkdirSync, readdirSync, readFileSync, symlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const PRODUCT_NAME = "Voice Assistant";
const MAC_BUNDLE_IDENTIFIER = "com.ctm.voice-assistant.dev";
const MAC_ICON_FILE_NAME = "app-icon.icns";

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
  const isMac = platform === "darwin";
  const electronExecutableRelativePath = isWindows
    ? "electron.exe"
    : join("Electron.app", "Contents", "MacOS", "Electron");
  const sourceElectronExe = join(sourceElectronDir, electronExecutableRelativePath);
  const macAppBundleRoot = join(sourceElectronDir, "Electron.app");
  const macBrandedAppBundleRoot = join(sourceElectronDir, `${PRODUCT_NAME}.app`);
  const macContentsRoot = join(macBrandedAppBundleRoot, "Contents");
  const macResourcesRoot = join(macContentsRoot, "Resources");
  const macBrandedExecutablePath = join(macContentsRoot, "MacOS", PRODUCT_NAME);
  return {
    sourceElectronDir,
    sourceElectronExe,
    devElectronDir,
    devElectronExe: isWindows
      ? join(devElectronDir, `${PRODUCT_NAME} Dev.exe`)
      : isMac
        ? macBrandedExecutablePath
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
    macIconPath: join(packageRoot, "resources", "app-icon.icns"),
    macAppBundleRoot,
    macBrandedAppBundleRoot,
    macInfoPlistPath: join(macContentsRoot, "Info.plist"),
    macBundleIconPath: join(macResourcesRoot, MAC_ICON_FILE_NAME),
    macSourceExecutablePath: sourceElectronExe,
    macBrandedExecutablePath,
    shouldPrepareExecutable: isWindows,
    shouldBrandExecutable: isWindows,
    shouldBrandMacBundle: isMac,
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

export function resolveNativeHelperNodePath(
  workspaceRoot,
) {
  return join(workspaceRoot, "packages", "native-helper", "dist", "voice_native_helper.node");
}

export function buildNativeHelperForDev({
  existsSync = () => true,
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
  const status = result.status ?? 1;
  if (status !== 0) {
    return status;
  }
  return existsSync(resolveNativeHelperNodePath(workspaceRoot)) ? 0 : 1;
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
  macBundleIconPath,
  macAppBundleRoot,
  macBrandedAppBundleRoot,
  macBrandedExecutablePath,
  macIconPath,
  macInfoPlistPath,
  macSourceExecutablePath,
  mkdirSync,
  readFileSync,
  rceditPath,
  readdirSync,
  shouldPrepareExecutable = true,
  shouldBrandExecutable = true,
  shouldBrandMacBundle = false,
  spawnSync,
  symlinkSync,
  sourceElectronExe,
  sourceElectronDir,
  devElectronDir,
  devElectronExe,
  sourceConfigPath,
  devResourcesDir,
  devConfigPath,
  writeFileSync,
}) {
  if (!shouldPrepareExecutable && !shouldBrandMacBundle) {
    return;
  }

  if (shouldPrepareExecutable && !existsSync(devElectronExe)) {
    mkdirSync(devElectronDir, { recursive: true });
    cpSync(sourceElectronDir, devElectronDir, { recursive: true, force: true });
    if (shouldBrandExecutable) {
      copyFileSync(sourceElectronExe, devElectronExe);
    }
  }
  if (shouldPrepareExecutable && sourceConfigPath && devResourcesDir && devConfigPath) {
    mkdirSync(devResourcesDir, { recursive: true });
    copyFileSync(sourceConfigPath, devConfigPath);
  }

  if (shouldBrandMacBundle) {
    if (macAppBundleRoot && macBrandedAppBundleRoot && !existsSync(macBrandedAppBundleRoot)) {
      symlinkSync(macAppBundleRoot, macBrandedAppBundleRoot, "dir");
    }
    if (macIconPath && macBundleIconPath) {
      copyFileSync(macIconPath, macBundleIconPath);
    }
    if (macSourceExecutablePath && macBrandedExecutablePath) {
      copyFileSync(macSourceExecutablePath, macBrandedExecutablePath);
    }
    if (macInfoPlistPath && readFileSync && writeFileSync) {
      const plist = readFileSync(macInfoPlistPath, "utf8")
        .replace(/<key>CFBundleDisplayName<\/key>\s*<string>[^<]*<\/string>/, `<key>CFBundleDisplayName</key>\n\t<string>${PRODUCT_NAME}</string>`)
        .replace(/<key>CFBundleName<\/key>\s*<string>[^<]*<\/string>/, `<key>CFBundleName</key>\n\t<string>${PRODUCT_NAME}</string>`)
        .replace(/<key>CFBundleExecutable<\/key>\s*<string>[^<]*<\/string>/, `<key>CFBundleExecutable</key>\n\t<string>${PRODUCT_NAME}</string>`)
        .replace(/<key>CFBundleIdentifier<\/key>\s*<string>[^<]*<\/string>/, `<key>CFBundleIdentifier</key>\n\t<string>${MAC_BUNDLE_IDENTIFIER}</string>`)
        .replace(/<key>CFBundleIconFile<\/key>\s*<string>[^<]*<\/string>/, `<key>CFBundleIconFile</key>\n\t<string>${MAC_ICON_FILE_NAME}</string>`);
      writeFileSync(macInfoPlistPath, plist);
    }
    if (macInfoPlistPath) {
      const appBundlePath = join(macInfoPlistPath, "..", "..");
      spawnSync(
        "/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister",
        ["-f", appBundlePath],
        { stdio: "ignore" },
      );
    }
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
    existsSync,
    platform: process.platform,
    spawnSync,
    workspaceRoot,
  });
  if (nativeHelperStatus !== 0) {
    console.error(
      "[dev] native helper build failed; global Right Cmd/Right Alt shortcuts cannot work.",
    );
    return nativeHelperStatus;
  }

  const paths = createDevElectronPaths(packageRoot);
  prepareDevElectronExecutable({
    copyFileSync,
    cpSync,
    existsSync,
    iconPath: paths.iconPath,
    macBundleIconPath: paths.macBundleIconPath,
    macAppBundleRoot: paths.macAppBundleRoot,
    macBrandedAppBundleRoot: paths.macBrandedAppBundleRoot,
    macBrandedExecutablePath: paths.macBrandedExecutablePath,
    macIconPath: paths.macIconPath,
    macInfoPlistPath: paths.macInfoPlistPath,
    macSourceExecutablePath: paths.macSourceExecutablePath,
    mkdirSync,
    readFileSync,
    readdirSync,
    spawnSync,
    symlinkSync,
    sourceElectronDir: paths.sourceElectronDir,
    sourceElectronExe: paths.sourceElectronExe,
    devElectronDir: paths.devElectronDir,
    devElectronExe: paths.devElectronExe,
    sourceConfigPath: paths.sourceConfigPath,
    devResourcesDir: paths.devResourcesDir,
    devConfigPath: paths.devConfigPath,
    shouldPrepareExecutable: paths.shouldPrepareExecutable,
    shouldBrandExecutable: paths.shouldBrandExecutable,
    shouldBrandMacBundle: paths.shouldBrandMacBundle,
    writeFileSync,
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
