import { existsSync } from "node:fs";
import { join, win32 } from "node:path";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";

export interface InstallerShellDefaults {
  installDir: string;
  createDesktopShortcut: boolean;
  launchAtLogin: boolean;
}

export interface InstallerShellInstallInput {
  installDir: string;
  createDesktopShortcut: boolean;
  launchAtLogin: boolean;
  updated?: boolean | undefined;
}

export interface InstallerShellInstallResult {
  ok: true;
  installDir: string;
}

export interface InstallerService {
  getDefaults(): InstallerShellDefaults;
  normalizeInstallDir(path: string): string;
  install(input: InstallerShellInstallInput): Promise<InstallerShellInstallResult>;
}

export interface CreateInstallerServiceInput {
  productName: string;
  resourcesPath: string;
  localAppData: string;
  spawn?: typeof spawn;
  existsSync?: (path: string) => boolean;
  logger?: InstallerLogger | undefined;
}

interface InstallerLogger {
  log(message: string): void;
  warn(message: string): void;
}

export function resolveDefaultInstallDir(input: {
  localAppData: string;
  productName: string;
}): string {
  return win32.join(input.localAppData, "Programs", input.productName);
}

export function resolveInstallerPayloadPath(resourcesPath: string): string {
  return join(resourcesPath, "installer-shell-payload", "app-setup.exe");
}

export function resolveInstallerModeMarkerPath(resourcesPath: string): string {
  return join(resourcesPath, "installer-shell-payload", "installer-shell.json");
}

export function shouldOpenInstallerShell(
  argv: readonly string[],
  hasInstallerMarker: boolean,
): boolean {
  if (argv.some(isUninstallArg)) {
    return false;
  }

  return (
    argv.some(isInstallerShellArg) ||
    hasInstallerMarker
  );
}

function isInstallerShellArg(arg: string): boolean {
  const normalized = arg.toLowerCase();
  return normalized === "--installer-shell" || normalized === "/installer-shell";
}

function isUninstallArg(arg: string): boolean {
  const normalized = arg.toLowerCase();
  return normalized === "--uninstall" || normalized === "/uninstall";
}

export function appendProductDirectory(path: string, productName: string): string {
  const trimmed = path.trim().replace(/[\\/]+$/, "");
  if (!trimmed) {
    return productName;
  }

  if (win32.basename(trimmed).toLowerCase() === productName.toLowerCase()) {
    return trimmed;
  }

  return win32.join(trimmed, productName);
}

export function createInstallerService(
  input: CreateInstallerServiceInput,
): InstallerService {
  const spawnProcess = input.spawn ?? spawn;
  const fileExists = input.existsSync ?? existsSync;
  const logger = input.logger ?? console;
  const payloadPath = resolveInstallerPayloadPath(input.resourcesPath);

  return {
    getDefaults: () => ({
      installDir: resolveDefaultInstallDir({
        localAppData: input.localAppData,
        productName: input.productName,
      }),
      createDesktopShortcut: true,
      launchAtLogin: true,
    }),
    normalizeInstallDir: (path) =>
      appendProductDirectory(path, input.productName),
    install: (installInput) => {
      if (!fileExists(payloadPath)) {
        logger.warn(`[installer] payload missing payloadPath=${payloadPath}`);
        return Promise.reject(
          new Error(`Installer payload not found: ${payloadPath}`),
        );
      }

      const installDir = appendProductDirectory(
        installInput.installDir,
        input.productName,
      );
      return runSilentInstaller({
        payloadPath,
        installDir,
        createDesktopShortcut: installInput.createDesktopShortcut,
        launchAtLogin: installInput.launchAtLogin,
        updated: installInput.updated,
        spawn: spawnProcess,
        logger,
      });
    },
  };
}

function runSilentInstaller(input: {
  payloadPath: string;
  installDir: string;
  createDesktopShortcut: boolean;
  launchAtLogin: boolean;
  updated?: boolean | undefined;
  spawn: typeof spawn;
  logger: InstallerLogger;
}): Promise<InstallerShellInstallResult> {
  return new Promise((resolve, reject) => {
    const args = input.updated ? ["--updated"] : [];
    args.push("/S", "/currentuser", `/D=${input.installDir}`);
    const env = { ...process.env };
    if (!input.updated) {
      env.VOICE_CREATE_DESKTOP_SHORTCUT = input.createDesktopShortcut ? "1" : "0";
      env.VOICE_LAUNCH_AT_LOGIN = input.launchAtLogin ? "1" : "0";
    }
    const child = input.spawn(
      input.payloadPath,
      args,
      {
        windowsHide: true,
        env,
      },
    ) as ChildProcessWithoutNullStreams;

    let output = "";
    input.logger.log(
      `[installer] install started payloadPath=${input.payloadPath} installDir=${
        input.installDir
      } createDesktopShortcut=${input.createDesktopShortcut} launchAtLogin=${
        input.launchAtLogin
      } updated=${Boolean(input.updated)}`
    );
    child.stdout?.on("data", (chunk: Buffer) => {
      output += chunk.toString();
    });
    child.stderr?.on("data", (chunk: Buffer) => {
      output += chunk.toString();
    });
    child.on("error", (error) => {
      input.logger.warn(
        `[installer] install start failed message=${JSON.stringify(error.message)} installDir=${input.installDir}`,
      );
      reject(
        new Error(
          `Installer failed to start. Payload: ${input.payloadPath}. Install dir: ${input.installDir}. ${error.message}`,
        ),
      );
    });
    child.on("close", (code, signal) => {
      if (code === 0) {
        input.logger.log(
          `[installer] install completed exitCode=0 signal=${signal ?? "none"} installDir=${input.installDir}`,
        );
        resolve({
          ok: true,
          installDir: input.installDir,
        });
        return;
      }
      input.logger.warn(
        `[installer] install failed exitCode=${code ?? "unknown"} signal=${
          signal ?? "none"
        } outputLength=${output.trim().length} installDir=${input.installDir}`,
      );
      reject(
        new Error(
          `Installer failed (${formatExitStatus(code, signal)}). Payload: ${input.payloadPath}. Install dir: ${input.installDir}.${formatInstallerOutput(output)}`,
        ),
      );
    });
  });
}

function formatExitStatus(
  code: number | null,
  signal: NodeJS.Signals | null,
): string {
  const formattedCode =
    code === null ? "code unknown" : `code ${code}${formatHexExitCode(code)}`;
  return signal ? `${formattedCode}, signal ${signal}` : formattedCode;
}

function formatHexExitCode(code: number): string {
  if (code < 0) {
    return "";
  }
  return ` / 0x${code.toString(16).padStart(8, "0")}`;
}

function formatInstallerOutput(output: string): string {
  const trimmed = output.trim();
  return trimmed ? ` Output: ${trimmed}` : "";
}
