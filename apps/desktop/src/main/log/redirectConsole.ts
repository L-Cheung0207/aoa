import { appendFileSync, existsSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname } from "node:path";
import { format } from "node:util";
import { getNativeAddonCandidatePaths } from "@voice/native-helper";

interface LogAddon {
  writeLogLine?: (text: string) => void;
}

export interface InstallConsoleRedirectOptions {
  logFilePath?: string;
}

type ConsoleLevel = "log" | "info" | "warn" | "error";

/**
 * On Windows, route console output through the native helper when possible so
 * terminal output keeps correct Unicode rendering, while also teeing logs to a file.
 */
export function installConsoleRedirect(options: InstallConsoleRedirectOptions = {}): void {
  const writeTerminalLine = resolveTerminalWriter();
  const writeFileLine = options.logFilePath ? createFileLogWriter(options.logFilePath) : undefined;

  console.log = createConsoleWrite("log", writeTerminalLine, writeFileLine);
  console.info = createConsoleWrite("info", writeTerminalLine, writeFileLine);
  console.warn = createConsoleWrite("warn", writeTerminalLine, writeFileLine);
  console.error = createConsoleWrite("error", writeTerminalLine, writeFileLine);
}

export function formatLogFileLine(level: ConsoleLevel, args: unknown[], now: Date = new Date()): string {
  return `${now.toISOString()} [${level.toUpperCase()}] ${format(...args)}\n`;
}

function createConsoleWrite(
  level: ConsoleLevel,
  writeTerminalLine: (text: string) => void,
  writeFileLine?: (text: string) => void
): (...args: unknown[]) => void {
  return (...args: unknown[]): void => {
    const terminalText = format(...args) + "\n";
    writeTerminalLine(terminalText);

    if (!writeFileLine) {
      return;
    }

    try {
      writeFileLine(formatLogFileLine(level, args));
    } catch (error) {
      writeTerminalLine(
        `[log] failed to append to log file: ${format(error instanceof Error ? error.stack ?? error.message : error)}\n`
      );
    }
  };
}

function resolveTerminalWriter(): (text: string) => void {
  if (process.platform === "win32") {
    const addon = tryLoadLogAddon();
    if (addon?.writeLogLine) {
      const writeLogLine = addon.writeLogLine.bind(addon);
      return (text) => {
        try {
          writeLogLine(text);
        } catch {
          process.stderr.write(text);
        }
      };
    }
  }

  return (text) => {
    process.stderr.write(text);
  };
}

function createFileLogWriter(logFilePath: string): (text: string) => void {
  mkdirSync(dirname(logFilePath), { recursive: true });
  return (text) => {
    appendFileSync(logFilePath, text, "utf8");
  };
}

function tryLoadLogAddon(): LogAddon | undefined {
  try {
    const require = createRequire(import.meta.url);
    const packageRoot = dirname(require.resolve("@voice/native-helper/package.json"));
    for (const candidatePath of getNativeAddonCandidatePaths(packageRoot)) {
      if (!existsSync(candidatePath)) {
        continue;
      }
      const candidate = require(candidatePath) as LogAddon;
      if (candidate && typeof candidate.writeLogLine === "function") {
        return candidate;
      }
    }
  } catch {
    // ignore and fall back to stderr
  }
  return undefined;
}
