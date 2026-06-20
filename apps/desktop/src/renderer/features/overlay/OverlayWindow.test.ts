import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { getCopyTooltipLabel, OverlayWindow } from "./OverlayWindow";

function getCssRuleBody(css: string, selector: string): string {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = new RegExp(`${escapedSelector}\\s*\\{([^}]*)\\}`, "m").exec(css);
  return match?.[1] ?? "";
}

describe("OverlayWindow result panel", () => {
  it("renders the selected waveform style on the listening pill", () => {
    const html = renderToStaticMarkup(
      createElement(OverlayWindow, {
        state: "listening",
        level: 0.12,
        waveformStyle: "waveform-candy"
      })
    );

    expect(html).toContain('class="volume-meter volume-meter--waveform-candy"');
    expect(html).toContain('data-style="waveform-candy"');
  });

  it("uses sunset as the default waveform style", () => {
    const html = renderToStaticMarkup(
      createElement(OverlayWindow, {
        state: "listening",
        level: 0.12
      })
    );

    expect(html).toContain('class="volume-meter volume-meter--waveform-sunset"');
    expect(html).toContain('data-style="waveform-sunset"');
  });

  it("adds per-bar rhythm metadata for responsive waveform motion", () => {
    const html = renderToStaticMarkup(
      createElement(OverlayWindow, {
        state: "listening",
        level: 0.12,
        waveformStyle: "waveform-sunset"
      })
    );

    expect(html).toContain("--bar-weight:");
    expect(html).toContain("--bar-phase:");
    expect(html).toContain("--bar-opacity:");
    expect(html).toContain("transform:scaleY(");
    expect(html).toContain("transform:scaleY(1.000)");
  });

  it("renders all waveform styles with the shared pill waveform structure", () => {
    const html = renderToStaticMarkup(
      createElement(OverlayWindow, {
        state: "listening",
        level: 0.12,
        waveformStyle: "waveform-mono"
      })
    );

    expect(html).toContain('data-style="waveform-mono"');
    expect(html).toContain("volume-meter__bar");
  });

  it("renders the recording pill without the old left status dot", () => {
    const html = renderToStaticMarkup(
      createElement(OverlayWindow, {
        state: "listening",
        level: 0.12,
        waveformStyle: "waveform-sunset"
      })
    );

    expect(html).not.toContain("status-dot");
  });

  it("shows a busy hint when the shortcut is pressed during thinking", () => {
    const html = renderToStaticMarkup(
      createElement(OverlayWindow, {
        state: "processing",
        busyHintVisible: true,
        onCancel: () => undefined,
        onDismissBusyHint: () => undefined
      })
    );

    expect(html).toContain("Voice Assistant仍在处理您的上一个转录");
    expect(html).toContain("如果您想取消上一个转录，请按 Esc 或点击下面。");
    expect(html).toContain(">取消<");
  });

  it("uses waveform theme variables for the listening border and meter colors", () => {
    const css = readFileSync(new URL("../../styles/app.css", import.meta.url), "utf8");
    const listeningRule = getCssRuleBody(css, ".overlay--listening");
    const candyRule = getCssRuleBody(css, ".volume-meter--waveform-candy");

    expect(listeningRule).toContain("var(--overlay-border)");
    expect(candyRule).toContain("--wave-a:");
    expect(candyRule).toContain("--wave-glow:");
  });

  it("shows the process-selection prompt above the pill", () => {
    const html = renderToStaticMarkup(
      createElement(OverlayWindow, {
        state: "listening",
        promptLabel: "询问任何问题"
      })
    );

    expect(html).toContain("询问任何问题");
    expect(html).toContain('class="overlay-hint"');
  });

  it("shows the translation target hint above the pill", () => {
    const html = renderToStaticMarkup(
      createElement(OverlayWindow, {
        state: "listening",
        translationTargetLabel: "英语（美国）"
      })
    );

    expect(html).toContain("正在翻译为");
    expect(html).toContain("英语（美国）");
    expect(html).toContain('class="overlay-hint"');
  });

  it("shows the voice prompt with an icon instead of a visible text label", () => {
    const html = renderToStaticMarkup(
      createElement(OverlayWindow, {
        state: "result",
        result: {
          rawText: "今天天气",
          selectedText: "",
          finalText: "今天天气晴。",
          warnings: []
        }
      })
    );

    expect(html).toContain('class="result-prompt__voice-icon"');
    expect(html).not.toContain(">语音输入<");
  });

  it("shows a copy tooltip below the result copy button", () => {
    const html = renderToStaticMarkup(
      createElement(OverlayWindow, {
        state: "result",
        result: {
          rawText: "today",
          selectedText: "",
          finalText: "Done today.",
          warnings: []
        }
      })
    );

    expect(html).toContain('class="result-copy-tooltip"');
    expect(html).toContain(">复制<");
  });

  it("shows a copy fallback panel when direct insertion failed", () => {
    const html = renderToStaticMarkup(
      createElement(OverlayWindow, {
        state: "result",
        insertionFallbackText: "我就拉里的旧码入到。",
        onDismissInsertionFallback: () => undefined
      })
    );

    expect(html).toContain("复制最后的转录");
    expect(html).toContain("&quot;我就拉里的旧码入到。&quot;");
    expect(html).toContain('class="insertion-fallback-panel__copy"');
    expect(html).not.toContain('class="result-panel"');
  });

  it("uses the translation fallback title when translated text cannot be inserted", () => {
    const html = renderToStaticMarkup(
      createElement(OverlayWindow, {
        state: "result",
        insertionFallbackText: "The meeting starts now.",
        insertionFallbackMode: "translate",
        onDismissInsertionFallback: () => undefined
      })
    );

    expect(html).toContain("复制最后的翻译");
    expect(html).toContain("&quot;The meeting starts now.&quot;");
  });

  it("uses the copied label after the copy action succeeds", () => {
    expect(getCopyTooltipLabel(false)).toBe("复制");
    expect(getCopyTooltipLabel(true)).toBe("已复制");
  });

  it("does not paint an outer backdrop or shadow around the result panel", () => {
    const css = readFileSync(new URL("../../styles/app.css", import.meta.url), "utf8");
    const overlayRule = getCssRuleBody(css, ".result-overlay");
    const panelRule = getCssRuleBody(css, ".result-panel");

    expect(overlayRule).toMatch(/padding:\s*0\s*;/);
    expect(panelRule).not.toMatch(/box-shadow:\s*[^;]*rgba\(15,\s*23,\s*42/);
    expect(panelRule).toMatch(/box-shadow:\s*0 0 0 1px [^;]+ inset\s*;/);
  });
});
