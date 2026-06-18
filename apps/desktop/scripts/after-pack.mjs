import { readdirSync, rmSync } from "node:fs";
import { join } from "node:path";

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

export default async function afterPack(context) {
  const localesDir = join(context.appOutDir, "locales");
  const removed = cleanupElectronLocales(localesDir);
  if (removed.length > 0) {
    console.log(`[afterPack] removed ${removed.length} unsupported Electron locale packs`);
  }
}
