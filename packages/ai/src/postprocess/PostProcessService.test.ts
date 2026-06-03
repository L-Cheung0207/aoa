import { describe, expect, it } from "vitest";
import type { BackendClient, PostprocessRequest } from "@voice/backend-client";
import { createPostProcessService } from "./PostProcessService";

describe("post process service", () => {
  it("forwards ASR text and context to the external LLM postprocess client", async () => {
    const requests: PostprocessRequest[] = [];
    const backendClient: Pick<BackendClient, "postprocess"> = {
      postprocess: async (request) => {
        requests.push(request);
        return {
          action: "replace_selection",
          finalText: "Tomorrow at 3 PM.",
          confidence: 0.88,
          usedDictionaryTermIds: ["term_1"],
          warnings: []
        };
      }
    };
    const service = createPostProcessService({ backendClient });

    const result = await service.process({
      installationId: "inst_test",
      rawText: "change this to tomorrow at 3",
      selectedText: "old text",
      appContext: {
        platform: "windows",
        appName: "notepad.exe",
        windowTitle: "notes.txt"
      },
      mode: "clean",
      language: "en-US",
      style: "natural",
      targetLanguage: "zh-CN",
      dictionaryTerms: [
        {
          id: "term_1",
          source: "ASR",
          replacement: "ASR"
        }
      ]
    });

    expect(requests).toEqual([
      {
        installationId: "inst_test",
        rawText: "change this to tomorrow at 3",
        selectedText: "old text",
        appContext: {
          platform: "windows",
          appName: "notepad.exe",
          windowTitle: "notes.txt"
        },
        mode: "clean",
        language: "en-US",
        style: "natural",
        targetLanguage: "zh-CN",
        dictionaryTerms: [
          {
            id: "term_1",
            source: "ASR",
            replacement: "ASR"
          }
        ]
      }
    ]);
    expect(result.finalText).toBe("Tomorrow at 3 PM.");
  });

  it("falls back to insertable ASR text when external LLM postprocess fails", async () => {
    const backendClient: Pick<BackendClient, "postprocess"> = {
      postprocess: async () => {
        throw new Error("backend down");
      }
    };
    const service = createPostProcessService({ backendClient });

    const result = await service.process({
      installationId: "inst_test",
      rawText: "raw transcript",
      selectedText: "",
      appContext: {
        platform: "windows",
        appName: "chrome.exe",
        windowTitle: "Gmail"
      },
      mode: "translate",
      language: "en-US",
      style: "natural",
      targetLanguage: "zh-CN",
      dictionaryTerms: []
    });

    expect(result).toEqual({
      action: "insert",
      finalText: "raw transcript",
      confidence: 0,
      usedDictionaryTermIds: [],
      warnings: ["LLM postprocess failed: backend down"]
    });
  });
});
