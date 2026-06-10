import { join } from "node:path";
import { BrowserWindow, screen } from "electron";

export type OverlayWindowLayout =
  | "pill"
  | "translatePill"
  | "recordingLimitWarning"
  | "canceledPill"
  | "thinkingPill"
  | "micError"
  | "shortcutHelp"
  | "result";

export interface OverlayWorkArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface OverlayWindowBounds {
  width: number;
  height: number;
  x: number;
  y: number;
}

export interface ScreenPoint {
  x: number;
  y: number;
}

export interface OverlayWindowTarget {
  setBounds(bounds: OverlayWindowBounds): void;
  getBounds?(): OverlayWindowBounds;
  isDestroyed?(): boolean;
  isVisible?(): boolean;
}

export interface OverlayWindowFollower {
  start(layout: OverlayWindowLayout): void;
  updateLayout(layout: OverlayWindowLayout): void;
  stop(): void;
}

interface OverlayWindowFollowerOptions {
  setIntervalFn?: typeof setInterval;
  clearIntervalFn?: typeof clearInterval;
  intervalMs?: number;
  syncLayout?: (window: OverlayWindowTarget, layout: OverlayWindowLayout) => void;
}

const OVERLAY_LAYOUT_SIZE: Record<OverlayWindowLayout, { width: number; height: number }> = {
  /** 仅容纳状态点与音量条的「胶囊」型面板。 */
  pill: { width: 160, height: 40 },
  translatePill: { width: 184, height: 70 },
  recordingLimitWarning: { width: 420, height: 196 },
  canceledPill: { width: 184, height: 40 },
  thinkingPill: { width: 380, height: 176 },
  micError: { width: 360, height: 168 },
  shortcutHelp: { width: 340, height: 258 },
  /** LLM 回答结果面板，接近 Typeless 的居中白色浮层。 */
  result: { width: 760, height: 520 }
};

/** 与屏幕底部的距离（像素）。略高于任务栏，避免被遮挡。 */
const BOTTOM_MARGIN = 72;
const OVERLAY_CURSOR_FOLLOW_INTERVAL_MS = 120;

export function calculateOverlayWindowBounds(
  workArea: OverlayWorkArea,
  layout: OverlayWindowLayout
): OverlayWindowBounds {
  const size = OVERLAY_LAYOUT_SIZE[layout];
  const x = Math.round(workArea.x + (workArea.width - size.width) / 2);
  const y = Math.round(workArea.y + workArea.height - size.height - BOTTOM_MARGIN);

  return {
    width: size.width,
    height: size.height,
    x,
    y
  };
}

export function resolveOverlayWorkArea(
  displays: ReadonlyArray<{ workArea: OverlayWorkArea }>,
  cursorPoint: ScreenPoint
): OverlayWorkArea {
  const display =
    displays.find(({ workArea }) => {
      return (
        cursorPoint.x >= workArea.x &&
        cursorPoint.x < workArea.x + workArea.width &&
        cursorPoint.y >= workArea.y &&
        cursorPoint.y < workArea.y + workArea.height
      );
    }) ?? displays[0];

  return display?.workArea ?? screen.getPrimaryDisplay().workArea;
}

export function applyOverlayWindowLayout(
  window: OverlayWindowTarget,
  layout: OverlayWindowLayout
): void {
  const cursorPoint = screen.getCursorScreenPoint();
  const workArea = resolveOverlayWorkArea(screen.getAllDisplays(), cursorPoint);
  const bounds = calculateOverlayWindowBounds(workArea, layout);
  const currentBounds = window.getBounds?.();
  if (
    currentBounds &&
    currentBounds.width === bounds.width &&
    currentBounds.height === bounds.height &&
    currentBounds.x === bounds.x &&
    currentBounds.y === bounds.y
  ) {
    return;
  }
  window.setBounds(bounds);
}

export function createOverlayWindowFollower(
  window: OverlayWindowTarget,
  options: OverlayWindowFollowerOptions = {}
): OverlayWindowFollower {
  const setIntervalFn = options.setIntervalFn ?? setInterval;
  const clearIntervalFn = options.clearIntervalFn ?? clearInterval;
  const intervalMs = options.intervalMs ?? OVERLAY_CURSOR_FOLLOW_INTERVAL_MS;
  const syncLayout = options.syncLayout ?? applyOverlayWindowLayout;
  let timer: ReturnType<typeof setInterval> | undefined;
  let currentLayout: OverlayWindowLayout = "pill";

  const sync = (): void => {
    if (window.isDestroyed?.()) {
      return;
    }
    if (window.isVisible && !window.isVisible()) {
      return;
    }
    syncLayout(window, currentLayout);
  };

  return {
    start(layout) {
      currentLayout = layout;
      sync();
      if (timer) {
        return;
      }
      timer = setIntervalFn(sync, intervalMs);
    },
    updateLayout(layout) {
      currentLayout = layout;
      sync();
    },
    stop() {
      if (!timer) {
        return;
      }
      clearIntervalFn(timer);
      timer = undefined;
    }
  };
}

export function createOverlayWindow(): BrowserWindow {
  const window = new BrowserWindow({
    title: "",
    width: OVERLAY_LAYOUT_SIZE.pill.width,
    height: OVERLAY_LAYOUT_SIZE.pill.height,
    show: false,
    frame: false,
    autoHideMenuBar: true,
    transparent: true,
    backgroundColor: "#00000000",
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    focusable: false,
    hasShadow: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      preload: join(__dirname, "../preload/index.mjs")
    }
  });

  window.setMenu(null);
  window.setTitle("");
  window.on("page-title-updated", (event) => {
    event.preventDefault();
    window.setTitle("");
  });

  applyOverlayWindowLayout(window, "pill");
  // 置顶于全屏应用之上，避免被游戏/视频遮挡。
  window.setAlwaysOnTop(true, "screen-saver");

  if (process.env.ELECTRON_RENDERER_URL) {
    window.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    window.loadFile(join(__dirname, "../renderer/index.html"));
  }

  return window;
}
