import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ICON_SIZES = [
  [16, "icon_16x16.png"],
  [32, "icon_16x16@2x.png"],
  [32, "icon_32x32.png"],
  [64, "icon_32x32@2x.png"],
  [128, "icon_128x128.png"],
  [256, "icon_128x128@2x.png"],
  [256, "icon_256x256.png"],
];

export function createGenerateMacIconCommands(scriptUrl = import.meta.url) {
  const packageRoot = fileURLToPath(new URL("..", scriptUrl));
  const resourcesRoot = join(packageRoot, "resources");
  const sourceIconPath = join(resourcesRoot, "app-icon.ico");
  const pngIconPath = join(resourcesRoot, "app-icon.png");
  const iconsetPath = join(resourcesRoot, "app-icon.iconset");
  const destinationIconPath = join(resourcesRoot, "app-icon.icns");

  const commands = [
    {
      command: "sips",
      args: ["-s", "format", "png", sourceIconPath, "--out", pngIconPath],
      cwd: packageRoot,
    },
    ...ICON_SIZES.map(([size, fileName]) => ({
      command: "sips",
      args: [
        "-z",
        String(size),
        String(size),
        pngIconPath,
        "--out",
        join(iconsetPath, fileName),
      ],
      cwd: packageRoot,
    })),
    {
      command: "iconutil",
      args: ["-c", "icns", iconsetPath, "-o", destinationIconPath],
      cwd: packageRoot,
    },
  ];

  return {
    commands,
    destinationIconPath,
    iconsetPath,
    packageRoot,
    pngIconPath,
    sourceIconPath,
  };
}

export function runGenerateMacIcon(options = createGenerateMacIconCommands()) {
  if (!existsSync(options.sourceIconPath)) {
    console.error(`[dist:mac] source icon is missing: ${options.sourceIconPath}`);
    return 1;
  }

  rmSync(options.iconsetPath, { recursive: true, force: true });
  mkdirSync(options.iconsetPath, { recursive: true });

  for (const { command, args, cwd } of options.commands) {
    const result = spawnSync(command, args, {
      cwd,
      stdio: "inherit",
      shell: false,
    });
    const status = result.status ?? 1;
    if (status !== 0) {
      return status;
    }
  }

  rmSync(options.iconsetPath, { recursive: true, force: true });
  rmSync(options.pngIconPath, { force: true });
  if (!existsSync(options.destinationIconPath)) {
    console.error(`[dist:mac] generated icon is missing: ${options.destinationIconPath}`);
    return 1;
  }

  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(runGenerateMacIcon());
}
