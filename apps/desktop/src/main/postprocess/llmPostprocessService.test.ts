import { describe, expect, it, vi } from "vitest";
import type { PostprocessRequest } from "@voice/backend-client";
import type { AppSettings, LlmModelConfig } from "@voice/shared";
import {
  createAosoPostprocessClient,
  createLlmPostprocessService,
  createOpenAiCompatibleChatClient,
  type LlmChatClient
} from "./llmPostprocessService";

function createModel(overrides: Partial<LlmModelConfig> = {}): LlmModelConfig {
  return {
    baseUrl: "https://llm.example/v1",
    apiKey: "secret-key",
    modelName: "Qwen",
    ...overrides
  };
}

function createSettings(llm: AppSettings["llm"]): Pick<AppSettings, "llm"> {
  return { llm };
}

function createPostprocessRequest(
  overrides: Partial<PostprocessRequest> = {}
): PostprocessRequest {
  return {
    installationId: "install-1",
    rawText: "make this shorter",
    selectedText: "This is the old selected text.",
    appContext: {
      platform: "windows",
      appName: "Docs",
      windowTitle: "Draft"
    },
    mode: "clean",
    language: "en-US",
    style: "natural",
    targetLanguage: "zh-CN",
    dictionaryTerms: [],
    ...overrides
  };
}

describe("LLM postprocess service", () => {
  it("uses the AOSO API client when configured", async () => {
    const requests: PostprocessRequest[] = [];
    const service = createLlmPostprocessService({
      getSettings: () =>
        createSettings({
          models: [createModel({ baseUrl: "http://172.30.21.67:9066" })],
          selectedIndex: 0
        }),
      postprocessClient: {
        postprocess: async ({ request }) => {
          requests.push(request);
          return { text: "润色后的文本", warnings: ["server warning"] };
        }
      }
    });

    const result = await service.postprocess(createPostprocessRequest({ selectedText: "" }));

    expect(requests).toHaveLength(1);
    expect(result).toEqual({
      action: "insert",
      finalText: "润色后的文本",
      confidence: 0.85,
      usedDictionaryTermIds: [],
      warnings: ["server warning"]
    });
  });

  it("uses the selected LLM model from settings and replaces active selection", async () => {
    const calls: Parameters<LlmChatClient["createCompletion"]>[] = [];
    const chatClient: LlmChatClient = {
      createCompletion: async (...args) => {
        calls.push(args);
        return "Shorter text.";
      }
    };
    const service = createLlmPostprocessService({
      getSettings: () =>
        createSettings({
          models: [
            createModel({ modelName: "unused" }),
            createModel({
              baseUrl: "https://selected.example/v1",
              apiKey: "selected-key",
              modelName: "SelectedModel"
            })
          ],
          selectedIndex: 1
        }),
      chatClient
    });

    const result = await service.postprocess(createPostprocessRequest());

    expect(result).toEqual({
      action: "replace_selection",
      finalText: "Shorter text.",
      confidence: 0.85,
      usedDictionaryTermIds: [],
      warnings: []
    });
    expect(calls[0]?.[0].config).toEqual({
      baseUrl: "https://selected.example/v1",
      apiKey: "selected-key",
      modelName: "SelectedModel"
    });
    expect(calls[0]?.[0].messages.map((message) => message.role)).toEqual([
      "system",
      "user"
    ]);
    expect(calls[0]?.[0].messages.at(-1)?.content).toContain(
      "This is the old selected text."
    );
  });

  it("uses insert action for translation output", async () => {
    const chatClient: LlmChatClient = {
      createCompletion: async () => "Translated text."
    };
    const service = createLlmPostprocessService({
      getSettings: () =>
        createSettings({
          models: [createModel()],
          selectedIndex: 0
        }),
      chatClient
    });

    const result = await service.postprocess(
      createPostprocessRequest({
        mode: "translate",
        selectedText: ""
      })
    );

    expect(result.action).toBe("insert");
    expect(result.finalText).toBe("Translated text.");
  });

  it("removes model thinking traces and keeps only the final answer", async () => {
    const chatClient: LlmChatClient = {
      createCompletion: async () =>
        [
          "Thinking Process:",
          "",
          "1. Analyze the request.",
          "2. Translate the raw transcript.",
          "</think>",
          "",
          "This sentence is English.",
          "",
          ""
        ].join("\n")
    };
    const service = createLlmPostprocessService({
      getSettings: () =>
        createSettings({
          models: [createModel()],
          selectedIndex: 0
        }),
      chatClient
    });

    const result = await service.postprocess(
      createPostprocessRequest({
        rawText: "呢句係英文。",
        selectedText: "",
        mode: "translate",
        language: "auto",
        targetLanguage: "en-US"
      })
    );

    expect(result.finalText).toBe("This sentence is English.");
  });

  it("removes thinking traces from Right Alt + Space clean output", async () => {
    const chatClient: LlmChatClient = {
      createCompletion: async () =>
        [
          "Thinking Process:",
          "",
          "1. Read the selected text.",
          "2. Apply the spoken instruction.",
          "",
          "Final Answer:",
          "Shorter selected text."
        ].join("\n")
    };
    const service = createLlmPostprocessService({
      getSettings: () =>
        createSettings({
          models: [createModel()],
          selectedIndex: 0
        }),
      chatClient
    });

    const result = await service.postprocess(
      createPostprocessRequest({
        rawText: "make it shorter",
        selectedText: "This is the old selected text.",
        mode: "clean"
      })
    );

    expect(result.action).toBe("replace_selection");
    expect(result.finalText).toBe("Shorter selected text.");
  });

  it("removes markdown labelled thinking traces from Right Alt + Space revision output", async () => {
    const chatClient: LlmChatClient = {
      createCompletion: async () =>
        [
          "Thinking Process:",
          "",
          "1. **Analyze the Request:**",
          "   * **Task:** Use the raw transcript as the instruction.",
          "",
          "2. **Draft Revision:**",
          "   * Keep the selected text meaning.",
          "",
          "**Final Revised Text:**",
          "Use a clearer growth plan and invite better suggestions."
        ].join("\n")
    };
    const service = createLlmPostprocessService({
      getSettings: () =>
        createSettings({
          models: [createModel()],
          selectedIndex: 0
        }),
      chatClient
    });

    const result = await service.postprocess(
      createPostprocessRequest({
        rawText: "make it more natural",
        selectedText: "This is the old selected text.",
        mode: "clean"
      })
    );

    expect(result.action).toBe("replace_selection");
    expect(result.finalText).toBe(
      "Use a clearer growth plan and invite better suggestions."
    );
  });

  it("removes thinking traces before Chinese final revision labels", async () => {
    const chatClient: LlmChatClient = {
      createCompletion: async () =>
        [
          "Thinking Process:",
          "",
          "1. Analyze the selected text.",
          "2. Rewrite it naturally.",
          "",
          "最终修改文本：",
          "这个是有原因的，如果你有更好的建议，可以提出来，我们一起改进。"
        ].join("\n")
    };
    const service = createLlmPostprocessService({
      getSettings: () =>
        createSettings({
          models: [createModel()],
          selectedIndex: 0
        }),
      chatClient
    });

    const result = await service.postprocess(
      createPostprocessRequest({
        rawText: "我係天慈。",
        selectedText: "这个是有原因的，增量方式如果你有更好建议，可以提出来大家改进过程。",
        mode: "clean",
        language: "auto"
      })
    );

    expect(result.finalText).toBe(
      "这个是有原因的，如果你有更好的建议，可以提出来，我们一起改进。"
    );
  });

  it("removes thinking traces before italic result labels", async () => {
    const chatClient: LlmChatClient = {
      createCompletion: async () =>
        [
          "Thinking Process:",
          "",
          "1. Analyze the request.",
          "2. Prepare the answer.",
          "",
          "*Result:*",
          "Only the final answer remains."
        ].join("\n")
    };
    const service = createLlmPostprocessService({
      getSettings: () =>
        createSettings({
          models: [createModel()],
          selectedIndex: 0
        }),
      chatClient
    });

    const result = await service.postprocess(
      createPostprocessRequest({
        rawText: "answer directly",
        selectedText: "",
        mode: "clean"
      })
    );

    expect(result.finalText).toBe("Only the final answer remains.");
  });

  it("treats clean mode without selected text as a standalone user request", async () => {
    const calls: Parameters<LlmChatClient["createCompletion"]>[] = [];
    const chatClient: LlmChatClient = {
      createCompletion: async (...args) => {
        calls.push(args);
        return "It is sunny today.";
      }
    };
    const service = createLlmPostprocessService({
      getSettings: () =>
        createSettings({
          models: [createModel()],
          selectedIndex: 0
        }),
      chatClient
    });

    await service.postprocess(
      createPostprocessRequest({
        rawText: "what is the weather today",
        selectedText: "",
        mode: "clean"
      })
    );

    const userPrompt = calls[0]?.[0].messages.at(-1)?.content ?? "";
    expect(userPrompt).toContain("Treat the raw transcript as the user's request");
    expect(userPrompt).toContain("what is the weather today");
  });
});

describe("AOSO postprocess client", () => {
  it("posts clean dictation to the rewrite endpoint", async () => {
    const fetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        rewritten_text: "我想去北京，天气很不错。",
        warning: "Rewrite warning"
      }),
      text: async () => ""
    }));
    const client = createAosoPostprocessClient({ fetch });

    const result = await client.postprocess({
      config: createModel({ baseUrl: "http://172.30.21.67:9066/" }),
      request: createPostprocessRequest({
        rawText: "嗯...我想去那个...北京，然后就是天气天气很不错。",
        selectedText: "",
        mode: "clean"
      })
    });

    expect(result).toEqual({
      text: "我想去北京，天气很不错。",
      warnings: ["Rewrite warning"]
    });
    const [url, init] = fetch.mock.calls[0] ?? [];
    expect(url).toBe("http://172.30.21.67:9066/aoaapi_ctm/rewrite");
    expect(JSON.parse(String(init?.body))).toEqual({
      text: "嗯...我想去那个...北京，然后就是天气天气很不错。",
      stream: false
    });
  });

  it("posts translation requests to the translate endpoint with the documented language names", async () => {
    const fetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ translated_text: "Hello world." }),
      text: async () => ""
    }));
    const client = createAosoPostprocessClient({ fetch });

    const result = await client.postprocess({
      config: createModel({ baseUrl: "http://172.30.21.67:9066" }),
      request: createPostprocessRequest({
        rawText: "你好世界",
        selectedText: "",
        mode: "translate",
        targetLanguage: "en-US"
      })
    });

    expect(result.text).toBe("Hello world.");
    const [url, init] = fetch.mock.calls[0] ?? [];
    expect(url).toBe("http://172.30.21.67:9066/aoa_api/voice/translate");
    expect(JSON.parse(String(init?.body))).toEqual({
      text: "你好世界",
      language: "英語",
      stream: false
    });
  });

  it("uses template rewrite when spoken instructions target selected text", async () => {
    const fetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ rewritten_text: "<html><body>商务邮件</body></html>" }),
      text: async () => ""
    }));
    const client = createAosoPostprocessClient({ fetch });

    await client.postprocess({
      config: createModel({ baseUrl: "http://172.30.21.67:9066" }),
      request: createPostprocessRequest({
        rawText: "帮我写一封正式的商务邮件给客户",
        selectedText: "张总您好，关于项目进度想跟您确认一下。",
        mode: "clean"
      })
    });

    const [url, init] = fetch.mock.calls[0] ?? [];
    expect(url).toBe("http://172.30.21.67:9066/aoaapi_ctm/rewrite_by_templete");
    expect(JSON.parse(String(init?.body))).toEqual({
      text: "帮我写一封正式的商务邮件给客户",
      text_to_rewrite: "张总您好，关于项目进度想跟您确认一下。",
      stream: false
    });
  });
});

describe("OpenAI-compatible chat client", () => {
  it("posts chat completions to the configured model endpoint", async () => {
    const fetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [{ message: { content: "Cleaned text." } }]
      }),
      text: async () => ""
    }));
    const client = createOpenAiCompatibleChatClient({ fetch });

    const content = await client.createCompletion({
      config: createModel({
        baseUrl: "https://llm.example/v1/",
        apiKey: "secret-key",
        modelName: "Qwen"
      }),
      messages: [
        { role: "system", content: "system prompt" },
        { role: "user", content: "user prompt" }
      ]
    });

    expect(content).toBe("Cleaned text.");
    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, init] = fetch.mock.calls[0] ?? [];
    expect(url).toBe("https://llm.example/v1/chat/completions");
    expect(init?.headers).toMatchObject({
      "Content-Type": "application/json",
      Authorization: "Bearer secret-key"
    });
    expect(JSON.parse(String(init?.body))).toMatchObject({
      model: "Qwen",
      messages: [
        { role: "system", content: "system prompt" },
        { role: "user", content: "user prompt" }
      ]
    });
  });
});
