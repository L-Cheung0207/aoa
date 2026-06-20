import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
} from "node:fs";
import { arch as osArch, tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { rewriteAbsoluteSymlinks } from "./after-pack.mjs";

const APPLEDOUBLE_PRONE_FILE_SYSTEMS = new Set(["exfat", "msdos", "ntfs"]);
const DIST_MAC_STAGING_ROOT = "aoa-desktop-dist-mac";

export function createDistMacCommands(scriptUrl = import.meta.url, options = {}) {
  const packageRoot = resolve(fileURLToPath(new URL("..", scriptUrl)));
  const packagingEnv = options.sign
    ? undefined
    : { CSC_IDENTITY_AUTO_DISCOVERY: "false" };

  return [
    {
      command: "node",
      args: ["scripts/generate-mac-icon.mjs"],
      cwd: packageRoot,
      env: undefined,
    },
    {
      command: "pnpm",
      args: ["run", "build"],
      cwd: packageRoot,
      env: undefined,
    },
    {
      command: "electron-builder",
      args: ["--mac", "dmg", "--config", "electron-builder.mac.yml"],
      cwd: packageRoot,
      env: packagingEnv,
    },
  ];
}

export function createDistMacWorkspaceCommands(options) {
  const { packageRoot, stagingPackageRoot } = options;
  const stagingWorkspaceRoot = resolve(stagingPackageRoot, "../..");

  return [
    {
      command: "pnpm",
      args: ["install", "--offline", "--frozen-lockfile"],
      cwd: stagingWorkspaceRoot,
      env: undefined,
    },
    {
      command: "node",
      args: [
        "scripts/dist-mac.mjs",
        "--prepare-staging-electron",
        "--staging-package-root",
        stagingPackageRoot,
      ],
      cwd: packageRoot,
      env: undefined,
    },
    ...createDistMacCommands(
      pathToFileURL(join(stagingPackageRoot, "scripts", "dist-mac.mjs")).href,
      options
    ),
  ];
}

export function resolveMacDmgArtifactPath(packageRoot, options = {}) {
  const readPackageJson =
    options.readPackageJson ??
    (() => readFileSync(join(packageRoot, "package.json"), "utf8"));
  const { version } = JSON.parse(readPackageJson());
  const arch = options.arch ?? osArch();

  return join(packageRoot, "dist-electron", `Voice Assistant-${version}-${arch}.dmg`);
}

export function shouldUseNativeMacPackagingWorkspace(fileSystemType) {
  return APPLEDOUBLE_PRONE_FILE_SYSTEMS.has(fileSystemType.trim().toLowerCase());
}

export function shouldCopyPathToNativeMacPackagingWorkspace(relativePath) {
  const normalizedPath = relativePath.replace(/\\/g, "/");
  const baseName = normalizedPath.split("/").pop() ?? normalizedPath;

  if (!normalizedPath) {
    return true;
  }
  if (baseName.startsWith("._")) {
    return false;
  }
  if (normalizedPath === "node_modules" || normalizedPath.startsWith("node_modules/")) {
    return false;
  }
  if (normalizedPath.includes("/node_modules/")) {
    return false;
  }
  if (normalizedPath === ".git" || normalizedPath.startsWith(".git/")) {
    return false;
  }
  if (normalizedPath.endsWith(".tsbuildinfo")) {
    return false;
  }

  const generatedRoots = [
    "dist-electron",
    "dist-installer-shell-payload",
    "apps/desktop/dist-electron",
    "apps/desktop/dist-installer-shell-payload",
    "apps/desktop/dist",
    "apps/desktop/resources/app-icon.icns",
    "apps/desktop/resources/app-icon.iconset",
    "apps/desktop/resources/app-icon.png",
    "packages/native-helper/target",
  ];

  return !generatedRoots.some(
    (root) => normalizedPath === root || normalizedPath.startsWith(`${root}/`)
  );
}

export function parseMountPointFromDfOutput(output) {
  const lines = output.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) {
    return undefined;
  }

  const fields = lines.at(-1)?.trim().split(/\s+/);
  if (!fields || fields.length < 6) {
    return undefined;
  }

  return fields.slice(5).join(" ");
}

export function parseFileSystemTypeFromDiskutilInfo(output) {
  const match = output.match(/^\s*Type \(Bundle\):\s*(\S+)/m);
  return match?.[1]?.trim().toLowerCase();
}

export function parseFileSystemTypeFromMountOutput(output, mountPoint) {
  const escapedMountPoint = mountPoint.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = output.match(new RegExp(` on ${escapedMountPoint} \\(([^,\\)]+)`));
  return match?.[1]?.trim().toLowerCase();
}

export function getFileSystemType(path, options = {}) {
  const spawn = options.spawnSync ?? spawnSync;
  const dfResult = spawn("df", ["-P", path], {
    encoding: "utf8",
    shell: false,
  });
  if ((dfResult.status ?? 1) !== 0) {
    return undefined;
  }

  const mountPoint = parseMountPointFromDfOutput(dfResult.stdout);
  if (!mountPoint) {
    return undefined;
  }

  const diskutilResult = spawn("diskutil", ["info", mountPoint], {
    encoding: "utf8",
    shell: false,
  });
  if ((diskutilResult.status ?? 1) === 0) {
    const fileSystemType = parseFileSystemTypeFromDiskutilInfo(diskutilResult.stdout);
    if (fileSystemType) {
      return fileSystemType;
    }
  }

  const mountResult = spawn("mount", [], {
    encoding: "utf8",
    shell: false,
  });
  if ((mountResult.status ?? 1) !== 0) {
    return undefined;
  }
  return parseFileSystemTypeFromMountOutput(mountResult.stdout, mountPoint);
}

export function createNativeMacPackagingWorkspace(options) {
  const packageRoot = options.packageRoot;
  const workspaceRoot = resolve(packageRoot, "../..");
  const stagingWorkspaceRoot = join(tmpdir(), DIST_MAC_STAGING_ROOT);
  const stagingPackageRoot = join(stagingWorkspaceRoot, "apps", "desktop");

  rmSync(stagingWorkspaceRoot, { recursive: true, force: true });
  mkdirSync(dirname(stagingWorkspaceRoot), { recursive: true });
  cpSync(workspaceRoot, stagingWorkspaceRoot, {
    dereference: false,
    errorOnExist: false,
    filter: (source) =>
      shouldCopyPathToNativeMacPackagingWorkspace(relative(workspaceRoot, source)),
    force: true,
    preserveTimestamps: true,
    recursive: true,
  });

  return { stagingPackageRoot, stagingWorkspaceRoot };
}

export function resolveElectronRuntimePaths(options) {
  const workspaceRoot = resolve(options.packageRoot, "../..");
  const stagingWorkspaceRoot = resolve(options.stagingPackageRoot, "../..");
  const sourceElectronPackagePath = join(workspaceRoot, "node_modules", "electron");
  const stagingElectronPackagePath = join(stagingWorkspaceRoot, "node_modules", "electron");

  return {
    sourceDistPath: join(sourceElectronPackagePath, "dist"),
    sourcePathTxtPath: join(sourceElectronPackagePath, "path.txt"),
    stagingDistPath: join(stagingElectronPackagePath, "dist"),
    stagingElectronPackagePath,
    stagingPathTxtPath: join(stagingElectronPackagePath, "path.txt"),
  };
}

export function prepareStagingElectronRuntime(options) {
  const paths = resolveElectronRuntimePaths(options);

  if (!existsSync(paths.sourceDistPath)) {
    console.error(`[dist:mac] source Electron runtime is missing: ${paths.sourceDistPath}`);
    return 1;
  }
  if (!existsSync(paths.sourcePathTxtPath)) {
    console.error(`[dist:mac] source Electron path.txt is missing: ${paths.sourcePathTxtPath}`);
    return 1;
  }
  if (!existsSync(paths.stagingElectronPackagePath)) {
    console.error(
      `[dist:mac] staging Electron package is missing: ${paths.stagingElectronPackagePath}`
    );
    return 1;
  }

  rmSync(paths.stagingDistPath, { recursive: true, force: true });
  cpSync(paths.sourceDistPath, paths.stagingDistPath, {
    dereference: false,
    errorOnExist: false,
    filter: (source) =>
      shouldCopyPathToNativeMacPackagingWorkspace(relative(paths.sourceDistPath, source)),
    force: true,
    preserveTimestamps: true,
    recursive: true,
  });
  copyFileSync(paths.sourcePathTxtPath, paths.stagingPathTxtPath);

  return 0;
}

export function syncNativeMacPackagingOutput(options) {
  const sourceDistDir = join(options.stagingPackageRoot, "dist-electron");
  const destinationDistDir = join(options.packageRoot, "dist-electron");

  if (!existsSync(sourceDistDir)) {
    console.error(`[dist:mac] staging output is missing: ${sourceDistDir}`);
    return 1;
  }

  rmSync(destinationDistDir, { recursive: true, force: true });
  mkdirSync(dirname(destinationDistDir), { recursive: true });
  cpSync(sourceDistDir, destinationDistDir, {
    dereference: false,
    errorOnExist: false,
    filter: (source) =>
      shouldCopyPathToNativeMacPackagingWorkspace(relative(sourceDistDir, source)),
    force: true,
    preserveTimestamps: true,
    recursive: true,
  });
  rewriteMacAppBundleSymlinks(destinationDistDir);

  const sourceIconPath = join(options.stagingPackageRoot, "resources", "app-icon.icns");
  const destinationIconPath = join(options.packageRoot, "resources", "app-icon.icns");
  if (existsSync(sourceIconPath)) {
    copyFileSync(sourceIconPath, destinationIconPath);
  }

  removeAppleDoubleFiles(destinationDistDir);
  removeAppleDoubleFiles(join(options.packageRoot, "resources"));

  return 0;
}

export function rewriteMacAppBundleSymlinks(rootDir, options = {}) {
  const listDir = options.readdirSync ?? ((path) => readdirSync(path, { withFileTypes: true }));
  const rewriteSymlinks = options.rewriteAbsoluteSymlinks ?? rewriteAbsoluteSymlinks;

  const visit = (dir) => {
    for (const entry of listDir(dir)) {
      if (!entry.isDirectory()) {
        continue;
      }
      const entryPath = join(dir, entry.name);
      if (entry.name.endsWith(".app")) {
        rewriteSymlinks(entryPath);
        continue;
      }
      visit(entryPath);
    }
  };

  visit(rootDir);
}

export function removeAppleDoubleFiles(rootDir, options = {}) {
  const listDir = options.readdirSync ?? ((path) => readdirSync(path, { withFileTypes: true }));
  const removeFile = options.rmSync ?? ((path) => rmSync(path, { force: true }));

  for (const entry of listDir(rootDir)) {
    const entryPath = join(rootDir, entry.name);
    if (entry.isDirectory()) {
      removeAppleDoubleFiles(entryPath, options);
      continue;
    }
    if (entry.name.startsWith("._")) {
      removeFile(entryPath);
    }
  }
}

export function runDistMac(commands = createDistMacCommands()) {
  for (const { command, args, cwd, env } of commands) {
    const result = spawnSync(command, args, {
      cwd,
      stdio: "inherit",
      shell: true,
      env: { ...process.env, ...env },
    });
    const status = result.status ?? 1;
    if (status !== 0) {
      return status;
    }
  }
  return 0;
}

export function runDistMacForPackageRoot(packageRoot) {
  const sign = process.env.AOA_MAC_SIGN === "true";
  const fileSystemType = getFileSystemType(packageRoot);
  if (!fileSystemType || !shouldUseNativeMacPackagingWorkspace(fileSystemType)) {
    return runDistMac(createDistMacCommands(import.meta.url, { sign }));
  }

  console.log(
    `[dist:mac] ${packageRoot} is on ${fileSystemType}; packaging from a native macOS temp workspace to avoid AppleDouble ._* files.`
  );
  const workspace = createNativeMacPackagingWorkspace({ packageRoot });
  const status = runDistMac(
    createDistMacWorkspaceCommands({
      packageRoot,
      sign,
      stagingPackageRoot: workspace.stagingPackageRoot,
    })
  );
  if (status !== 0) {
    return status;
  }
  return syncNativeMacPackagingOutput({
    packageRoot,
    stagingPackageRoot: workspace.stagingPackageRoot,
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv.includes("--prepare-staging-electron")) {
    const stagingPackageRootFlagIndex = process.argv.indexOf("--staging-package-root");
    const stagingPackageRoot = process.argv[stagingPackageRootFlagIndex + 1];
    if (stagingPackageRootFlagIndex < 0 || !stagingPackageRoot) {
      console.error("[dist:mac] --staging-package-root is required");
      process.exit(1);
    }
    process.exit(
      prepareStagingElectronRuntime({
        packageRoot: fileURLToPath(new URL("..", import.meta.url)),
        stagingPackageRoot,
      })
    );
  }

  process.exit(runDistMacForPackageRoot(fileURLToPath(new URL("..", import.meta.url))));
}
