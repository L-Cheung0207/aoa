import { mkdir, writeFile as writeFileFs } from "node:fs/promises";
import { dirname, join, normalize, resolve } from "node:path";
import { spawn, type SpawnOptions } from "node:child_process";

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
  pid: number;
  platform: NodeJS.Platform;
  tempDir: string;
  ensureDirectory?: (path: string) => Promise<void>;
  writeFile?: (path: string, content: string) => Promise<void>;
  spawnDetached?: (
    command: string,
    args: string[],
    options: SpawnOptions,
  ) => void;
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
      const scriptPath = join(
        options.tempDir,
        `voice-assistant-uninstall-${options.pid}.ps1`,
      );
      await ensureParentDirectory(scriptPath, options.ensureDirectory);
      await (options.writeFile ?? writeFileFs)(
        scriptPath,
        buildWindowsCleanupScript({
          pid: options.pid,
          installDir,
          cleanupPaths,
          scriptPath,
        }),
      );
      const spawnDetached = options.spawnDetached ?? defaultSpawnDetached;
      spawnDetached(
        "powershell.exe",
        [
          "-NoProfile",
          "-ExecutionPolicy",
          "Bypass",
          "-WindowStyle",
          "Hidden",
          "-File",
          scriptPath,
        ],
        {
          detached: true,
          stdio: "ignore",
          windowsHide: true,
        },
      );

      return {
        ok: true,
        mode: "packaged",
        launchedCleanup: true,
        cleanupPaths,
      };
    },
  };
}

function defaultSpawnDetached(
  command: string,
  args: string[],
  options: SpawnOptions,
): void {
  spawn(command, args, options).unref();
}

async function ensureParentDirectory(
  path: string,
  ensureDirectory = defaultEnsureDirectory,
): Promise<void> {
  await ensureDirectory(dirname(path));
}

async function defaultEnsureDirectory(path: string): Promise<void> {
  await mkdir(path, { recursive: true });
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
  const resolved = resolve(path);
  const parsedRoot = resolve(resolved, "..");
  if (resolved === parsedRoot || resolved.split(/[\\/]+/).length < 3) {
    throw new Error(
      `Refusing to uninstall from unsafe install directory: ${path}`,
    );
  }
}

function buildWindowsCleanupScript(options: {
  pid: number;
  installDir: string;
  cleanupPaths: string[];
  scriptPath: string;
}): string {
  const cleanupPaths = options.cleanupPaths
    .map((path) => `  ${toPowerShellString(path)}`)
    .join(",\n");

  return `\
$ErrorActionPreference = "SilentlyContinue"
$InstallDir = ${toPowerShellString(options.installDir)}
$CleanupPaths = @(
${cleanupPaths}
)

try {
  Wait-Process -Id ${options.pid} -Timeout 30
} catch {}

Start-Sleep -Milliseconds 600

foreach ($Path in $CleanupPaths) {
  if ([string]::IsNullOrWhiteSpace($Path)) {
    continue
  }
  if (Test-Path -LiteralPath $Path) {
    Remove-Item -LiteralPath $Path -Recurse -Force
  }
}

Remove-Item -LiteralPath ${toPowerShellString(options.scriptPath)} -Force
`;
}

function toPowerShellString(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}
