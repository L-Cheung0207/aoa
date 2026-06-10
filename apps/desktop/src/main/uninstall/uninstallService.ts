import { mkdir, writeFile as writeFileFs } from "node:fs/promises";
import { dirname, join, normalize, parse, resolve } from "node:path";
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
      const executableName = parse(options.executablePath).name;
      const uninstallerPath = join(
        installDir,
        `Uninstall ${executableName}.exe`,
      );
      const cleanupPaths = uniquePaths([
        installDir,
        options.app.getPath("userData"),
        options.app.getPath("logs"),
      ]);
      for (const cleanupPath of cleanupPaths) {
        assertSafeCleanupDirectory(cleanupPath);
      }
      const scriptPath = join(
        options.tempDir,
        `voice-assistant-uninstall-${options.pid}.ps1`,
      );
      await ensureParentDirectory(scriptPath, options.ensureDirectory);
      await (options.writeFile ?? writeFileFs)(
        scriptPath,
        buildWindowsCleanupScript({
          pid: options.pid,
          uninstallerPath,
          cleanupPaths,
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
          cwd: options.tempDir,
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

function buildWindowsCleanupScript(options: {
  pid: number;
  uninstallerPath: string;
  cleanupPaths: string[];
}): string {
  const cleanupPathEntries = options.cleanupPaths
    .map((path) => `  ${toPowerShellString(path)}`)
    .join("\n");

  return `\
$ErrorActionPreference = "SilentlyContinue"
$UninstallerPath = ${toPowerShellString(options.uninstallerPath)}
$CleanupPaths = @(
${cleanupPathEntries}
)

try {
  Wait-Process -Id ${options.pid} -Timeout 30
} catch {}

Start-Sleep -Milliseconds 600

if (Test-Path -LiteralPath $UninstallerPath) {
  Start-Process -FilePath $UninstallerPath -ArgumentList @('/currentuser', '/S', '--delete-app-data') -Wait -WindowStyle Hidden
}

$CleanupPaths |
  Where-Object { $_ -and (Test-Path -LiteralPath $_) } |
  ForEach-Object {
    Remove-Item -LiteralPath $_ -Recurse -Force
  }

Remove-Item -LiteralPath $PSCommandPath -Force
`;
}

function toPowerShellString(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}
