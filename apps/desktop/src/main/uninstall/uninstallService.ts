import { dirname, normalize, resolve } from "node:path";

export interface UninstallResult {
  ok: true;
  mode: "development" | "packaged";
  launchedCleanup: boolean;
  cleanupPaths: string[];
}

export interface UninstallService {
  performUninstall(): Promise<UninstallResult>;
}

interface ElectronAppLike {
  isPackaged: boolean;
  getPath(name: "userData" | "logs"): string;
  setLoginItemSettings(settings: {
    openAtLogin: boolean;
    openAsHidden: boolean;
  }): void;
}

export interface CreateUninstallServiceOptions {
  app: ElectronAppLike;
  executablePath: string;
  platform: NodeJS.Platform;
}

export function createUninstallService(
  options: CreateUninstallServiceOptions,
): UninstallService {
  return {
    performUninstall: async () => {
      options.app.setLoginItemSettings({
        openAtLogin: false,
        openAsHidden: false,
      });

      if (!options.app.isPackaged) {
        return {
          ok: true,
          mode: "development",
          launchedCleanup: false,
          cleanupPaths: [],
        };
      }

      if (options.platform !== "win32") {
        return {
          ok: true,
          mode: "packaged",
          launchedCleanup: false,
          cleanupPaths: [],
        };
      }

      const installDir = dirname(options.executablePath);
      assertSafeInstallDirectory(installDir);
      const cleanupPaths = uniquePaths([
        installDir,
        options.app.getPath("userData"),
        options.app.getPath("logs"),
      ]);
      for (const cleanupPath of cleanupPaths) {
        assertSafeCleanupDirectory(cleanupPath);
      }

      return {
        ok: true,
        mode: "packaged",
        launchedCleanup: false,
        cleanupPaths,
      };
    },
  };
}

function uniquePaths(paths: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const path of paths) {
    const normalized = normalize(path);
    const key = normalized.toLocaleLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      result.push(normalized);
    }
  }
  return result;
}

function assertSafeInstallDirectory(path: string): void {
  assertSafeCleanupDirectory(path, "install directory");
}

function assertSafeCleanupDirectory(
  path: string,
  label = "cleanup directory",
): void {
  const resolved = resolve(path);
  const parsedRoot = resolve(resolved, "..");
  if (resolved === parsedRoot || resolved.split(/[\\/]+/).length < 3) {
    throw new Error(
      `Refusing to uninstall from unsafe ${label}: ${path}`,
    );
  }
}
