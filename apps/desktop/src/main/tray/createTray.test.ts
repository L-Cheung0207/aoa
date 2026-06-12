import { describe, expect, it } from "vitest";
import { createTrayMenuTemplate, wireTrayEvents } from "./createTray";

describe("tray wiring", () => {
  it("opens the home window from double click and exposes the requested menu", () => {
    const calls: string[] = [];
    const listeners = new Map<string, () => void>();
    const tray = {
      on: (event: string, callback: () => void) => {
        listeners.set(event, callback);
      },
    };

    wireTrayEvents(tray, {
      onOpenHome: () => calls.push("home"),
    });
    listeners.get("double-click")?.();

    const menu = createTrayMenuTemplate({
      onOpenHistory: () => calls.push("history-menu"),
      onOpenSettings: () => calls.push("settings-menu"),
      onCheckUpdates: () => calls.push("updates-menu"),
      onOpenAbout: () => calls.push("about-menu"),
      onQuit: () => calls.push("quit-menu"),
    });

    expect(calls).toEqual(["home"]);
    expect(menu.map((item) => item.label)).toEqual([
      "历史记录",
      "设置",
      "检查更新",
      "关于",
      undefined,
      "退出",
    ]);

    menu.find((item) => item.label === "历史记录")?.click?.();
    menu.find((item) => item.label === "设置")?.click?.();
    menu.find((item) => item.label === "检查更新")?.click?.();
    menu.find((item) => item.label === "关于")?.click?.();
    menu.find((item) => item.label === "退出")?.click?.();

    expect(calls).toEqual([
      "home",
      "history-menu",
      "settings-menu",
      "updates-menu",
      "about-menu",
      "quit-menu",
    ]);
  });
});
