import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = fileURLToPath(new URL("..", import.meta.url));
const sourcePath = join(packageRoot, "target", "debug", "voice_native_helper.dll");
const destinationDirectory = join(packageRoot, "dist");
const destinationPath = join(destinationDirectory, "voice_native_helper.node");

if (!existsSync(sourcePath)) {
  throw new Error(`Native helper binary does not exist: ${sourcePath}`);
}

mkdirSync(destinationDirectory, { recursive: true });
copyFileSync(sourcePath, destinationPath);

console.log(`Copied native helper binary to ${destinationPath}`);
