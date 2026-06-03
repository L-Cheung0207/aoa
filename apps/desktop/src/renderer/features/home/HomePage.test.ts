import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createDefaultSettings } from "@voice/shared";
import { describe, expect, it } from "vitest";
import {
  buildMicrophoneLevelBarStyles,
  buildOnboardingShortcutDemoClassName,
  HomePage,
  shouldSuspendGlobalShortcutsForOnboardingStep
} from "./HomePage";

describe("HomePage", () => {
  it("renders the tray home dashboard with a settings entry and shortcut/language settings", () => {
    const html = renderToStaticMarkup(
      createElement(HomePage, {
        initialSettings: createDefaultSettings({ isPackaged: false }),
        initialSettingsOpen: true
      })
    );

    expect(html).toContain("自然说话，完美书写");
    expect(html).toContain("测试版");
    expect(html).toContain('aria-label="打开设置"');
    expect(html).toContain('aria-label="打开首次引导"');
    expect(html).toContain("首次引导");
    expect(html).toContain("语音输入");
    expect(html).toContain('aria-label="点击录制快捷键"');
    expect(html).toContain("翻译目标");
    expect(html).toContain("英语（英国）");
    expect(html).toContain("声波效果");
    expect(html).toContain("脉冲焰");
    expect(html).toContain("银核灰");
    expect(html).toContain("霓虹糖");
    expect(html).not.toContain("量子绿");
    expect(html).not.toContain("极光蓝");
    expect(html).not.toContain("矩阵光");
    expect(html).toContain("麦克风");
    expect(html).toContain("自动检测");
    expect(html).toContain("选择您首选的麦克风");
    expect(html).not.toContain("mic-level-meter");
    expect(html).not.toContain("词典");
    expect(html).not.toContain("推荐朋友");
    expect(html).not.toContain("联盟计划");
    expect(html).not.toContain(">个性化<");
  });

  it("renders the onboarding permissions guide when opened from the home page", () => {
    const html = renderToStaticMarkup(
      createElement(HomePage, {
        initialSettings: createDefaultSettings({ isPackaged: false }),
        initialOnboardingOpen: true
      })
    );

    expect(html).toContain('role="dialog"');
    expect(html).toContain("隐私清楚，使用才安心");
    expect(html).toContain("使用麦克风");
    expect(html).toContain("写入当前应用");
  });

  it("renders the onboarding microphone, shortcut, and ready steps", () => {
    const settings = createDefaultSettings({ isPackaged: false });
    const renderStep = (initialOnboardingStep: number): string =>
      renderToStaticMarkup(
        createElement(HomePage, {
          initialSettings: settings,
          initialOnboardingOpen: true,
          initialOnboardingStep
        })
      );

    const microphoneStep = renderStep(1);
    expect(microphoneStep).toContain("口述以测试您的麦克风");
    expect(microphoneStep).toContain("onboarding-guide__split--microphone");
    expect(microphoneStep).toContain('aria-label="打开麦克风选择"');
    expect(microphoneStep).not.toContain("onboarding-microphone-picker");
    expect(microphoneStep).not.toContain("mic-picker__trigger");
    expect(microphoneStep).toContain("onboarding-meter");
    expect(microphoneStep).toContain("onboarding-meter__bar");
    expect(microphoneStep).toContain("onboarding-meter__bar-fill");
    expect(microphoneStep).toContain(
      '<span class="onboarding-meter__bar"><span class="onboarding-meter__bar-fill" style="transform:scaleY(0)"></span></span>'
    );
    expect(microphoneStep).toContain("data-state=\"idle\"");
    expect(microphoneStep.indexOf("您计算机内置或外接的麦克风会影响转写效果。")).toBeLessThan(
      microphoneStep.indexOf("您在说话时看到蓝色条形图在移动吗？")
    );
    expect(microphoneStep.indexOf("您在说话时看到蓝色条形图在移动吗？")).toBeLessThan(
      microphoneStep.indexOf("onboarding-guide__actions")
    );
    const shortcutStep = renderStep(2);
    expect(shortcutStep).toContain("按下以测试您的语音输入快捷键");
    expect(shortcutStep).toContain("onboarding-guide__split--shortcut");
    expect(shortcutStep).toContain('<div class="onboarding-shortcut-demo"');
    expect(shortcutStep).not.toContain("onboarding-meter");
    expect(shortcutStep).not.toContain("onboarding-microphone-picker");
    expect(shortcutStep).not.toContain("悬浮按钮");
    expect(shortcutStep.indexOf("按下时右侧文字和边框会变蓝。")).toBeLessThan(
      shortcutStep.indexOf("按下时，您看到 Right Alt 变蓝了吗？")
    );
    expect(shortcutStep.indexOf("按下时，您看到 Right Alt 变蓝了吗？")).toBeLessThan(
      shortcutStep.indexOf("onboarding-guide__actions")
    );
    const readyStep = renderStep(3);
    expect(readyStep).toContain("说话，别打字");
    expect(readyStep).toContain("我们出发吧");
  });

  it("uses keyboard-only capture for the onboarding shortcut step", () => {
    expect(shouldSuspendGlobalShortcutsForOnboardingStep(0)).toBe(false);
    expect(shouldSuspendGlobalShortcutsForOnboardingStep(1)).toBe(false);
    expect(shouldSuspendGlobalShortcutsForOnboardingStep(2)).toBe(true);
    expect(shouldSuspendGlobalShortcutsForOnboardingStep(3)).toBe(false);
    expect(buildOnboardingShortcutDemoClassName(false)).toBe("onboarding-shortcut-demo");
    expect(buildOnboardingShortcutDemoClassName(true)).toBe(
      "onboarding-shortcut-demo onboarding-shortcut-demo--pressed"
    );
  });

  it("maps microphone level to active onboarding meter bars", () => {
    const bars = buildMicrophoneLevelBarStyles(0.42, 10);

    expect(bars).toHaveLength(10);
    expect(bars.filter((bar) => bar.active)).toHaveLength(5);
    expect(bars[0]).toMatchObject({ active: true });
    expect(bars[9]).toMatchObject({ active: false, height: 0 });
  });
});
