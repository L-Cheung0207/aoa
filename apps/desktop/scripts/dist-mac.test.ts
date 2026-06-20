import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  createDistMacCommands,
  createDistMacWorkspaceCommands,
  getFileSystemType,
  parseFileSystemTypeFromDiskutilInfo,
  parseFileSystemTypeFromMountOutput,
  parseMountPointFromDfOutput,
  removeAppleDoubleFiles,
  rewriteMacAppBundleSymlinks,
  resolveElectronRuntimePaths,
  shouldCopyPathToNativeMacPackagingWorkspace,
  shouldUseNativeMacPackagingWorkspace,
  resolveMacDmgArtifactPath,
} from "./dist-mac.mjs";

describe("desktop macOS distribution script", () => {
  it("generates the macOS icon, builds the desktop app, and packages a DMG", () => {
    const scriptUrl = new URL("./dist-mac.mjs", import.meta.url);
    const commands = createDistMacCommands(scriptUrl);
    const workspaceRoot = resolve(fileURLToPath(new URL("../../..", scriptUrl)));
    const packageRoot = resolve(fileURLToPath(new URL("..", scriptUrl)));

    expect(commands).toEqual([
      {
        command: "pnpm",
        args: ["--filter", "@voice/native-helper", "build:native"],
        cwd: workspaceRoot,
        env: undefined,
      },
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
        env: { CSC_IDENTITY_AUTO_DISCOVERY: "false" },
      },
    ]);
  });

  it("can leave certificate discovery enabled for signed release builds", () => {
    const scriptUrl = new URL("./dist-mac.mjs", import.meta.url);
    const commands = createDistMacCommands(scriptUrl, { sign: true });

    expect(commands.at(-1)?.env).toBeUndefined();
  });

  it("packages the macOS native helper for global shortcut support", () => {
    const scriptUrl = new URL("./dist-mac.mjs", import.meta.url);
    const packageRoot = fileURLToPath(new URL("..", scriptUrl));
    const config = readFileSync(join(packageRoot, "electron-builder.mac.yml"), "utf8");

    expect(config).toContain("target: dmg");
    expect(config).toContain("icon: resources/app-icon.icns");
    expect(config).toContain("hardenedRuntime: true");
    expect(config).toContain("../../packages/native-helper/dist/voice_native_helper.node");
    expect(config).toContain("to: voice_native_helper.node");
  });

  it("resolves the DMG artifact name produced by the macOS build", () => {
    const scriptUrl = new URL("./dist-mac.mjs", import.meta.url);
    const packageRoot = fileURLToPath(new URL("..", scriptUrl));

    expect(resolveMacDmgArtifactPath(packageRoot)).toBe(
      join(packageRoot, "dist-electron", "Voice Assistant-0.1.0-arm64.dmg"),
    );
  });

  it("uses the package version and architecture when resolving the DMG artifact", () => {
    expect(
      resolveMacDmgArtifactPath("/app", {
        arch: "x64",
        readPackageJson: () => '{"version":"2.3.4"}',
      }),
    ).toBe(join("/app", "dist-electron", "Voice Assistant-2.3.4-x64.dmg"));
  });

  it("exposes package scripts for repeatable macOS packaging", () => {
    const scriptUrl = new URL("./dist-mac.mjs", import.meta.url);
    const packageRoot = fileURLToPath(new URL("..", scriptUrl));
    const desktopPackage = JSON.parse(
      readFileSync(join(packageRoot, "package.json"), "utf8"),
    ) as { scripts?: Record<string, string> };
    const workspacePackage = JSON.parse(
      readFileSync(join(packageRoot, "../..", "package.json"), "utf8"),
    ) as { scripts?: Record<string, string> };

    expect(desktopPackage.scripts?.["dist:mac"]).toBe("node scripts/dist-mac.mjs");
    expect(workspacePackage.scripts?.["dist:mac"]).toBe(
      "pnpm --filter @voice/desktop dist:mac",
    );
  });

  it("uses a native macOS packaging workspace for AppleDouble-prone volumes", () => {
    expect(shouldUseNativeMacPackagingWorkspace("exfat")).toBe(true);
    expect(shouldUseNativeMacPackagingWorkspace("msdos")).toBe(true);
    expect(shouldUseNativeMacPackagingWorkspace("apfs")).toBe(false);
    expect(shouldUseNativeMacPackagingWorkspace("hfs")).toBe(false);
  });

  it("detects the file system type through the path mount point", () => {
    const calls: string[] = [];
    const fileSystemType = getFileSystemType("/Volumes/990EvoPlus/project", {
      spawnSync: (command: string, args: string[]) => {
        calls.push([command, ...args].join(" "));
        if (command === "df") {
          return {
            status: 0,
            stdout:
              "Filesystem   512-blocks Used Available Capacity Mounted on\n" +
              "/dev/disk6s3 1953199616 1 1 64% /Volumes/990EvoPlus\n",
          };
        }
        if (command === "diskutil") {
          return {
            status: 0,
            stdout:
              "   Volume Name:               990EvoPlus\n" +
              "   Type (Bundle):             exfat\n",
          };
        }
        throw new Error(`unexpected command ${command}`);
      },
    });

    expect(fileSystemType).toBe("exfat");
    expect(calls).toEqual([
      "df -P /Volumes/990EvoPlus/project",
      "diskutil info /Volumes/990EvoPlus",
    ]);
  });

  it("falls back to mount output when diskutil cannot inspect the mount point", () => {
    const fileSystemType = getFileSystemType("/project", {
      spawnSync: (command: string) => {
        if (command === "df") {
          return {
            status: 0,
            stdout:
              "Filesystem 512-blocks Used Available Capacity Mounted on\n" +
              "/dev/disk3s5 1 1 1 1% /System/Volumes/Data\n",
          };
        }
        if (command === "diskutil") {
          return { status: 1, stdout: "", stderr: "Could not find disk" };
        }
        if (command === "mount") {
          return {
            status: 0,
            stdout:
              "/dev/disk3s5 on /System/Volumes/Data (apfs, local, journaled)\n",
          };
        }
        throw new Error(`unexpected command ${command}`);
      },
    });

    expect(fileSystemType).toBe("apfs");
  });

  it("parses macOS filesystem command output", () => {
    expect(
      parseMountPointFromDfOutput(
        "Filesystem 512-blocks Used Available Capacity Mounted on\n" +
          "/dev/disk7s1 1 1 1 1% /Volumes/Typeless Installer\n",
      ),
    ).toBe("/Volumes/Typeless Installer");
    expect(
      parseFileSystemTypeFromDiskutilInfo(
        "   File System Personality:   ExFAT\n   Type (Bundle):             exfat\n",
      ),
    ).toBe("exfat");
    expect(
      parseFileSystemTypeFromMountOutput(
        "/dev/disk7s1 on /Volumes/Typeless Installer (hfs, local, read-only)\n",
        "/Volumes/Typeless Installer",
      ),
    ).toBe("hfs");
  });

  it("builds and packages from the native macOS workspace when the project volume needs it", () => {
    const commands = createDistMacWorkspaceCommands({
      packageRoot: "/Volumes/External/aoa/apps/desktop",
      stagingPackageRoot: "/tmp/aoa-dist-mac/apps/desktop",
    });

    expect(commands).toEqual([
      {
        command: "pnpm",
        args: ["install", "--offline", "--frozen-lockfile"],
        cwd: "/tmp/aoa-dist-mac",
        env: undefined,
      },
      {
        command: "node",
        args: [
          "scripts/dist-mac.mjs",
          "--prepare-staging-electron",
          "--staging-package-root",
          "/tmp/aoa-dist-mac/apps/desktop",
        ],
        cwd: "/Volumes/External/aoa/apps/desktop",
        env: undefined,
      },
      {
        command: "pnpm",
        args: ["--filter", "@voice/native-helper", "build:native"],
        cwd: "/tmp/aoa-dist-mac",
        env: undefined,
      },
      {
        command: "node",
        args: ["scripts/generate-mac-icon.mjs"],
        cwd: "/tmp/aoa-dist-mac/apps/desktop",
        env: undefined,
      },
      {
        command: "pnpm",
        args: ["run", "build"],
        cwd: "/tmp/aoa-dist-mac/apps/desktop",
        env: undefined,
      },
      {
        command: "electron-builder",
        args: ["--mac", "dmg", "--config", "electron-builder.mac.yml"],
        cwd: "/tmp/aoa-dist-mac/apps/desktop",
        env: { CSC_IDENTITY_AUTO_DISCOVERY: "false" },
      },
    ]);
  });

  it("does not copy generated packaging output or AppleDouble files into the native workspace", () => {
    expect(shouldCopyPathToNativeMacPackagingWorkspace("package.json")).toBe(true);
    expect(shouldCopyPathToNativeMacPackagingWorkspace("apps/desktop/out/main/index.js")).toBe(
      true,
    );
    expect(shouldCopyPathToNativeMacPackagingWorkspace("apps/desktop/dist-electron/app.dmg")).toBe(
      false,
    );
    expect(shouldCopyPathToNativeMacPackagingWorkspace("apps/desktop/resources/app-icon.icns")).toBe(
      false,
    );
    expect(shouldCopyPathToNativeMacPackagingWorkspace("apps/desktop/resources/._app-icon.ico")).toBe(
      false,
    );
    expect(shouldCopyPathToNativeMacPackagingWorkspace("node_modules/electron/dist/version")).toBe(
      false,
    );
  });

  it("resolves source and staging Electron runtime paths", () => {
    expect(
      resolveElectronRuntimePaths({
        packageRoot: "/Volumes/External/aoa/apps/desktop",
        stagingPackageRoot: "/tmp/aoa-dist-mac/apps/desktop",
      }),
    ).toEqual({
      sourceDistPath: "/Volumes/External/aoa/node_modules/electron/dist",
      sourcePathTxtPath: "/Volumes/External/aoa/node_modules/electron/path.txt",
      stagingDistPath: "/tmp/aoa-dist-mac/node_modules/electron/dist",
      stagingElectronPackagePath: "/tmp/aoa-dist-mac/node_modules/electron",
      stagingPathTxtPath: "/tmp/aoa-dist-mac/node_modules/electron/path.txt",
    });
  });

  it("removes AppleDouble sidecar files from synced macOS artifacts", () => {
    const removed: string[] = [];

    removeAppleDoubleFiles("/dist-electron", {
      readdirSync: (path: string) => {
        if (path === "/dist-electron") {
          return [
            { isDirectory: () => true, name: "mac-arm64" },
            { isDirectory: () => false, name: "._Voice Assistant.dmg" },
            { isDirectory: () => false, name: "Voice Assistant.dmg" },
          ];
        }
        return [
          { isDirectory: () => false, name: "._Info.plist" },
          { isDirectory: () => false, name: "Info.plist" },
        ];
      },
      rmSync: (path: string) => removed.push(path),
    });

    expect(removed).toEqual([
      join("/dist-electron", "mac-arm64", "._Info.plist"),
      join("/dist-electron", "._Voice Assistant.dmg"),
    ]);
  });

  it("rewrites macOS app symlinks after syncing artifacts back from staging", () => {
    const rootDir = "/dist-electron";
    const archDir = join(rootDir, "mac-arm64");
    const appDir = join(archDir, "Voice Assistant.app");
    const rewritten: string[] = [];

    rewriteMacAppBundleSymlinks(rootDir, {
      readdirSync: (path: string) => {
        if (path === rootDir) {
          return [
            { isDirectory: () => true, name: "mac-arm64" },
            { isDirectory: () => false, name: "Voice Assistant.dmg" },
          ];
        }
        if (path === archDir) {
          return [
            { isDirectory: () => true, name: "Voice Assistant.app" },
            { isDirectory: () => false, name: "Voice Assistant.dmg" },
          ];
        }
        return [];
      },
      rewriteAbsoluteSymlinks: (path: string) => {
        rewritten.push(path);
        return [];
      },
    } as never);

    expect(rewritten).toEqual([appDir]);
  });
});
