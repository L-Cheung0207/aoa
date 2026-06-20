import { existsSync, readlinkSync, readdirSync, rmSync, statSync, symlinkSync, unlinkSync } from "node:fs";
import { isAbsolute, join, relative } from "node:path";

const SUPPORTED_ELECTRON_LOCALES = new Set([
  "en-US.pak",
  "zh-CN.pak",
  "zh-TW.pak"
]);

export function cleanupElectronLocales(localesDir) {
  const removed = [];

  for (const fileName of readdirSync(localesDir)) {
    if (!fileName.endsWith(".pak") || SUPPORTED_ELECTRON_LOCALES.has(fileName)) {
      continue;
    }

    rmSync(join(localesDir, fileName), { force: true });
    removed.push(fileName);
  }

  return removed.sort();
}

export function resolveElectronLocalesDir(appOutDir) {
  const directLocalesDir = join(appOutDir, "locales");
  if (existsSync(directLocalesDir)) {
    return directLocalesDir;
  }

  const macAppBundle = readdirSync(appOutDir).find((fileName) =>
    fileName.endsWith(".app")
  );
  if (!macAppBundle) {
    return undefined;
  }

  const macLocalesDir = join(
    appOutDir,
    macAppBundle,
    "Contents",
    "Resources",
    "locales"
  );
  return existsSync(macLocalesDir) ? macLocalesDir : undefined;
}

export function resolveMacAppBundleDir(appOutDir) {
  const macAppBundle = readdirSync(appOutDir).find((fileName) =>
    fileName.endsWith(".app")
  );
  return macAppBundle ? join(appOutDir, macAppBundle) : undefined;
}

export function rewriteAbsoluteSymlinks(rootDir, options = {}) {
  const readDir = options.readdirSync ?? readdirSync;
  const stat = options.statSync ?? statSync;
  const exists = options.existsSync ?? existsSync;
  const readLink = options.readlinkSync ?? readlinkSync;
  const unlink = options.unlinkSync ?? unlinkSync;
  const symlink = options.symlinkSync ?? symlinkSync;
  const rewritten = [];

  const visit = (dir) => {
    for (const entry of readDir(dir, { withFileTypes: true })) {
      const entryPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        visit(entryPath);
        continue;
      }
      if (!entry.isSymbolicLink?.()) {
        continue;
      }

      const target = readLink(entryPath);
      if (!isAbsolute(target)) {
        continue;
      }

      const localTarget = resolveLocalBundleTarget(rootDir, target);
      if (!localTarget || !exists(localTarget)) {
        continue;
      }

      const type = stat(localTarget).isDirectory() ? "dir" : "file";
      const relativeTarget = relative(dir, localTarget);
      unlink(entryPath);
      symlink(relativeTarget, entryPath, type);
      rewritten.push(entryPath);
    }
  };

  visit(rootDir);
  return rewritten.sort();
}

function resolveLocalBundleTarget(rootDir, target) {
  if (target.startsWith(rootDir)) {
    return target;
  }

  const marker = "/Contents/Frameworks/";
  const markerIndex = target.indexOf(marker);
  if (markerIndex < 0) {
    return undefined;
  }

  return join(rootDir, "Contents", "Frameworks", target.slice(markerIndex + marker.length));
}

export default async function afterPack(context) {
  const localesDir = resolveElectronLocalesDir(context.appOutDir);
  if (!localesDir) {
    console.log(`[afterPack] Electron locale packs not found under ${context.appOutDir}`);
  } else {
    const removed = cleanupElectronLocales(localesDir);
    if (removed.length > 0) {
      console.log(`[afterPack] removed ${removed.length} unsupported Electron locale packs`);
    }
  }

  const macAppBundleDir = resolveMacAppBundleDir(context.appOutDir);
  if (macAppBundleDir) {
    const rewritten = rewriteAbsoluteSymlinks(macAppBundleDir);
    if (rewritten.length > 0) {
      console.log(`[afterPack] rewrote ${rewritten.length} absolute macOS bundle symlinks`);
    }
  }
}
