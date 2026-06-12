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
        spawn: spawnProcess,
      });
    },
  };
}

function runSilentInstaller(input: {
  payloadPath: string;
  installDir: string;
  createDesktopShortcut: boolean;
  launchAtLogin: boolean;
  spawn: typeof spawn;
}): Promise<InstallerShellInstallResult> {
  return new Promise((resolve, reject) => {
    const child = input.spawn(
      input.payloadPath,
      ["/S", "/currentuser", `/D=${input.installDir}`],
      {
        windowsHide: true,
        env: {
          ...process.env,
          VOICE_CREATE_DESKTOP_SHORTCUT: input.createDesktopShortcut
            ? "1"
            : "0",
          VOICE_LAUNCH_AT_LOGIN: input.launchAtLogin ? "1" : "0",
        },
      },
    ) as ChildProcessWithoutNullStreams;

    let output = "";
    child.stdout?.on("data", (chunk: Buffer) => {
      output += chunk.toString();
    });
    child.stderr?.on("data", (chunk: Buffer) => {
      output += chunk.toString();
    });
    child.on("error", (error) => {
      reject(
        new Error(
          `Installer failed to start. Payload: ${input.payloadPath}. Install dir: ${input.installDir}. ${error.message}`,
        ),
      );
    });
    child.on("close", (code, signal) => {
      if (code === 0) {
        resolve({
          ok: true,
          installDir: input.installDir,
        });
        return;
      }
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
