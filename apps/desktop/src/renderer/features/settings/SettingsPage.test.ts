import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createDefaultSettings } from "@voice/shared";
import { describe, expect, it } from "vitest";
import { SettingsPage } from "./SettingsPage";

describe("SettingsPage", () => {
  it("renders the waveform style selector in recording settings", () => {
    const html = renderToStaticMarkup(
      createElement(SettingsPage, {
        initialSettings: createDefaultSettings({ isPackaged: false })
      })
    );

    expect(html).toContain('id="recording-waveform"');
    expect(html).toContain('class="settings__select"');
    expect(html).toContain('value="waveform-sunset"');
    expect(html).toContain('value="waveform-mono"');
    expect(html).toContain('value="waveform-candy"');
    expect(html).not.toContain('role="radiogroup"');
    expect(html).not.toContain('role="radio"');
    expect(html).not.toContain("waveform-preview waveform-preview--");
    expect(html).toContain("脉冲焰");
    expect(html).toContain("银核灰");
    expect(html).toContain("霓虹糖");
    expect(html).not.toContain("量子绿");
    expect(html).not.toContain("极光蓝");
    expect(html).not.toContain("矩阵光");
    expect(html).toContain("麦克风");
    expect(html).toContain("recording-input-device");
    expect(html).toContain("自动检测");
  });
});
