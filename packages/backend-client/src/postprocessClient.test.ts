import { describe, expect, it } from "vitest";
import { createMockBackendClient } from "./mockBackendClient";

describe("backend postprocess client contract", () => {
  it("sends ASR text context to the LLM postprocess endpoint contract", async () => {
    const client = createMockBackendClient();

    const result = await client.postprocess({
      installationId: "inst_test",
      rawText: "嗯我想说不是这个改成明天下午三点开会",
      selectedText: "旧内容",
      appContext: {
        platform: "windows",
        appName: "notepad.exe",
        windowTitle: "notes.txt"
      },
      mode: "clean",
      language: "zh-CN",
      style: "natural",
      dictionaryTerms: [
        {
          id: "term_1",
          source: "CTM",
          replacement: "CTM",
          description: "项目名"
        }
      ]
    });

    expect(result).toEqual({
      action: "replace_selection",
      finalText: "明天下午三点开会。",
      confidence: 0.92,
      usedDictionaryTermIds: ["term_1"],
      warnings: []
    });
  });

  it("returns translated text for translate mode", async () => {
    const client = createMockBackendClient();

    const result = await client.postprocess({
      installationId: "inst_test",
      rawText: "明天下午三点开会",
      selectedText: "",
      appContext: {
        platform: "windows",
        appName: "chrome.exe",
        windowTitle: "Gmail"
      },
      mode: "translate",
      language: "zh-CN",
      style: "natural",
      dictionaryTerms: []
    });

    expect(result.finalText).toBe("Meeting tomorrow at 3 PM.");
    expect(result.action).toBe("insert");
  });
});
