import { Menu, nativeImage, Tray, type MenuItemConstructorOptions } from "electron";

export interface CreateTrayOptions {
  onOpenHome(): void;
  onOpenHistory(): void;
  onOpenSettings(): void;
  onCheckUpdates(): void;
  onOpenAbout(): void;
  onQuit(): void;
  /** Tray icon file path; falls back to an empty icon when missing or invalid. */
  iconPath?: string;
}

interface TrayEventTarget {
  on(event: "double-click", listener: () => void): unknown;
}

export function wireTrayEvents(
  tray: TrayEventTarget,
  options: Pick<CreateTrayOptions, "onOpenHome">
): void {
  tray.on("double-click", options.onOpenHome);
}

export function createTrayMenuTemplate(
  options: Pick<
    CreateTrayOptions,
    | "onOpenHistory"
    | "onOpenSettings"
    | "onCheckUpdates"
    | "onOpenAbout"
    | "onQuit"
  >
): MenuItemConstructorOptions[] {
  return [
    { label: "历史记录", click: options.onOpenHistory },
    { label: "设置", click: options.onOpenSettings },
    { label: "检查更新", click: options.onCheckUpdates },
    { label: "关于", click: options.onOpenAbout },
    { type: "separator" },
    { label: "退出", click: options.onQuit }
  ];
}

export function createTray(options: CreateTrayOptions): Tray {
  let image = nativeImage.createEmpty();
  if (options.iconPath) {
    const loaded = nativeImage.createFromPath(options.iconPath);
    if (!loaded.isEmpty()) {
      image = loaded;
    } else {
      console.warn(`[createTray] Failed to load tray icon from ${options.iconPath}; using empty icon`);
    }
  }
  const tray = new Tray(image);
  tray.setToolTip("Voice AI");
  wireTrayEvents(tray, options);
  tray.setContextMenu(Menu.buildFromTemplate(createTrayMenuTemplate(options)));
  return tray;
}
