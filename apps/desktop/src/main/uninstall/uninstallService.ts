import path from "node:path";

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

      const pathApi = options.platform === "win32" ? path.win32 : path;
      const installDir = pathApi.dirname(options.executablePath);
      assertSafeInstallDirectory(installDir);
      const cleanupPaths = uniquePaths([
        installDir,
        options.app.getPath("userData"),
        options.app.getPath("logs"),
      ], pathApi);
      for (const cleanupPath of cleanupPaths) {
        assertSafeCleanupDirectory(cleanupPath, "cleanup directory", pathApi);
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

function uniquePaths(paths: string[], pathApi: Pick<typeof path, "normalize">): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const candidate of paths) {
    const normalized = pathApi.normalize(candidate);
    const key = normalized.toLocaleLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      result.push(normalized);
    }
  }
  return result;
}

function assertSafeInstallDirectory(candidate: string): void {
  assertSafeCleanupDirectory(candidate, "install directory", path.win32);
}

function assertSafeCleanupDirectory(
  candidate: string,
  label = "cleanup directory",
  pathApi: Pick<typeof path, "resolve" | "parse" | "normalize" | "dirname"> = path,
): void {
  const resolved = pathApi.resolve(candidate);
  const root = pathApi.parse(resolved).root;
  const parent = pathApi.dirname(resolved);
  if (resolved === root || parent === root) {
    throw new Error(
      `Refusing to uninstall from unsafe ${label}: ${candidate}`,
    );
  }
}
