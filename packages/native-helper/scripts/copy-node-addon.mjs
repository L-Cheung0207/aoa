import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * @typedef {{
 *   info(message: string): void;
 *   warn(message: string): void;
 * }} Logger
 */

/**
 * @typedef {{
 *   sourcePath: string;
 *   debugNodePath: string;
 *   destinationDirectory: string;
 *   destinationPath: string;
 *   exists: (path: string) => boolean;
 *   copyFile: (sourcePath: string, destinationPath: string) => void;
 *   mkdir: (path: string, options: { recursive: boolean }) => void;
 *   logger: Logger;
 * }} CopyNativeAddonOptions
 */

const packageRoot = fileURLToPath(new URL("..", import.meta.url));

/**
 * @param {CopyNativeAddonOptions} options
 */
export function copyNativeAddon(options) {
  if (!options.exists(options.sourcePath)) {
    throw new Error(`Native helper binary does not exist: ${options.sourcePath}`);
  }

  copyIfUnlocked(options.sourcePath, options.debugNodePath, options);
  options.mkdir(options.destinationDirectory, { recursive: true });
  copyIfUnlocked(options.sourcePath, options.destinationPath, options);
}

/**
 * @param {string} sourcePath
 * @param {string} destinationPath
 * @param {CopyNativeAddonOptions} options
 */
function copyIfUnlocked(sourcePath, destinationPath, options) {
  try {
    options.copyFile(sourcePath, destinationPath);
    options.logger.info(`Copied native helper binary to ${destinationPath}`);
  } catch (error) {
    if (isBusyError(error)) {
      options.logger.warn(
        `Skipped copying locked native helper binary to ${destinationPath}. ` +
          `Close running Electron app and rerun this command before packaging if this output is required.`
      );
      return;
    }

    throw error;
  }
}

/**
 * @param {unknown} error
 * @returns {error is NodeJS.ErrnoException}
 */
function isBusyError(error) {
  return Boolean(error && typeof error === "object" && "code" in error && error.code === "EBUSY");
}

if (import.meta.main) {
  copyNativeAddon({
    sourcePath: join(packageRoot, "target", "debug", "voice_native_helper.dll"),
    debugNodePath: join(packageRoot, "target", "debug", "voice_native_helper.node"),
    destinationDirectory: join(packageRoot, "dist"),
    destinationPath: join(packageRoot, "dist", "voice_native_helper.node"),
    exists: existsSync,
    copyFile: copyFileSync,
    mkdir: mkdirSync,
    logger: console
  });
}
