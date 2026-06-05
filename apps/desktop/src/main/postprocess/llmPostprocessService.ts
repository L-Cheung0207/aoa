import { Agent, ProxyAgent, fetch as undiciFetch, type Dispatcher } from "undici";
import type { PostprocessRequest, PostprocessResult } from "@voice/backend-client";
import type { AppSettings, LlmModelConfig } from "@voice/shared";
import { logHttpRequest } from "../log/requestLog";

export interface LlmChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LlmChatCompletionRequest {
  config: LlmModelConfig;
  messages: LlmChatMessage[];
}

export interface LlmChatClient {
  createCompletion(request: LlmChatCompletionRequest): Promise<string>;
}

export interface AosoPostprocessClientRequest {
  config: LlmModelConfig;
  request: PostprocessRequest;
}

export interface AosoPostprocessClientResult {
  text: string;
  warnings: string[];
}

export interface AosoPostprocessClient {
  postprocess(request: AosoPostprocessClientRequest): Promise<AosoPostprocessClientResult>;
}

export interface LlmPostprocessService {
  postprocess(request: PostprocessRequest): Promise<PostprocessResult>;
}

export interface CreateLlmPostprocessServiceOptions {
  getSettings(): Pick<AppSettings, "llm">;
  chatClient?: LlmChatClient;
  postprocessClient?: AosoPostprocessClient;
}

interface LlmFetchResponse {
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
  text(): Promise<string>;
}

interface LlmFetchInit {
  method: "POST";
  headers: Record<string, string>;
  body: string;
  signal: AbortSignal;
  dispatcher: Dispatcher;
}

type LlmFetch = (url: string, init: LlmFetchInit) => Promise<LlmFetchResponse>;

export interface CreateOpenAiCompatibleChatClientOptions {
  fetch?: LlmFetch;
  timeoutMs?: number;
}

export interface CreateAosoPostprocessClientOptions {
  fetch?: LlmFetch;
  timeoutMs?: number;
}

const DEFAULT_LLM_TIMEOUT_MS = 60_000;
const AOSO_VOICE_PATH = "/aoa_api/voice";
const THINKING_TRACE_PREFIX_PATTERN =
  /^(?:thinking process|thought process|reasoning|analysis)\s*:/i;
const FINAL_CONTENT_LABEL_PATTERN = [
  "final\\s+(?:answer|response|result|output|text|revised\\s+text|rewritten\\s+text|translation)",
  "answer|response|result|output|revised\\s+text|rewritten\\s+text|translation|translated\\s+text",
  "最终(?:答案|回复|响应|结果|输出|文本|修改文本|修订文本|改写文本|翻译|翻译结果)",
  "答案|回复|响应|结果|输出|文本|修改文本|修订文本|改写文本|翻译结果|译文"
].join("|");

export function createLlmPostprocessService(
  options: CreateLlmPostprocessServiceOptions
): LlmPostprocessService {
  return {
    postprocess: async (request) => {
      const settings = options.getSettings();
      const model = resolveSelectedLlmModel(settings.llm);
      if (!model) {
        throw new Error("No LLM model configured");
      }

      const content = options.postprocessClient
        ? await options.postprocessClient.postprocess({ config: model, request })
        : {
            text: cleanModelText(
              await requireChatClient(options.chatClient).createCompletion({
                config: model,
                messages: buildPostprocessMessages(request)
              })
            ),
            warnings: [] as string[]
          };
      const finalText = content.text.trim();
      if (!finalText) {
        throw new Error("LLM returned an empty postprocess result");
      }

      return {
        action: request.mode === "translate" || !request.selectedText ? "insert" : "replace_selection",
        finalText,
        confidence: 0.85,
        usedDictionaryTermIds: [],
        warnings: content.warnings
      };
    }
  };
}

export function createAosoPostprocessClient(
  options: CreateAosoPostprocessClientOptions = {}
): AosoPostprocessClient {
  const fetchImpl = options.fetch ?? (undiciFetch as unknown as LlmFetch);
  const timeoutMs = options.timeoutMs ?? DEFAULT_LLM_TIMEOUT_MS;

  return {
    postprocess: async ({ config, request }) => {
      const apiRequest = buildAosoRequest(request);
      const url = buildAosoUrl(config.baseUrl, apiRequest.path);
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        logHttpRequest(url, apiRequest.body);
        const response = await fetchImpl(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(apiRequest.body),
          signal: controller.signal,
          dispatcher: createDispatcher(config)
        });

        if (!response.ok) {
          const text = await safeReadText(response);
          throw new Error(`AOSO API HTTP ${response.status}: ${truncate(text, 300)}`);
        }

        return extractAosoContent(await response.json(), apiRequest.responseField);
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          throw new Error(`AOSO API request timed out after ${timeoutMs / 1000}s`);
        }
        throw error;
      } finally {
        clearTimeout(timer);
      }
    }
  };
}

export function createOpenAiCompatibleChatClient(
  options: CreateOpenAiCompatibleChatClientOptions = {}
): LlmChatClient {
  const fetchImpl = options.fetch ?? (undiciFetch as unknown as LlmFetch);
  const timeoutMs = options.timeoutMs ?? DEFAULT_LLM_TIMEOUT_MS;

  return {
    createCompletion: async ({ config, messages }) => {
      const url = buildChatCompletionsUrl(config.baseUrl);
      const body = {
        model: config.modelName,
        messages,
        temperature: 0.2,
        max_tokens: 1200
      };
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        logHttpRequest(url, body);
        const response = await fetchImpl(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${config.apiKey}`
          },
          body: JSON.stringify(body),
          signal: controller.signal,
          dispatcher: createDispatcher(config)
        });

        if (!response.ok) {
          const text = await safeReadText(response);
          throw new Error(`LLM HTTP ${response.status}: ${truncate(text, 300)}`);
        }

        return extractAssistantContent(await response.json());
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          throw new Error(`LLM request timed out after ${timeoutMs / 1000}s`);
        }
        throw error;
      } finally {
        clearTimeout(timer);
      }
    }
  };
}

function requireChatClient(chatClient: LlmChatClient | undefined): LlmChatClient {
  if (!chatClient) {
    throw new Error("No postprocess client configured");
  }
  return chatClient;
}

type AosoResponseField = "rewritten_text" | "translated_text";

interface AosoApiRequest {
  path: string;
  body: Record<string, unknown>;
  responseField: AosoResponseField;
}

function buildAosoRequest(request: PostprocessRequest): AosoApiRequest {
  if (request.mode === "translate") {
    return {
      path: AOSO_VOICE_PATH,
      body: {
        text: request.rawText,
        language: toAosoTargetLanguage(request.targetLanguage),
        stream: false
      },
      responseField: "translated_text"
    };
  }

  if (shouldUseTemplateRewrite(request)) {
    return {
      path: AOSO_VOICE_PATH,
      body: {
        text: buildTemplateInstruction(request),
        text_to_rewrite: request.selectedText || request.rawText,
        stream: false
      },
      responseField: "rewritten_text"
    };
  }

  return {
    path: AOSO_VOICE_PATH,
    body: {
      text: request.rawText,
      stream: false
    },
    responseField: "rewritten_text"
  };
}

function shouldUseTemplateRewrite(request: PostprocessRequest): boolean {
  return (
    request.selectedText.trim().length > 0 ||
    request.mode === "formal" ||
    request.mode === "summarize" ||
    request.mode === "list"
  );
}

function buildTemplateInstruction(request: PostprocessRequest): string {
  if (request.selectedText.trim().length > 0) {
    return request.rawText;
  }

  switch (request.mode) {
    case "formal":
      return "请用正式语气重写以下文本";
    case "summarize":
      return "请总结以下文本";
    case "list":
      return "请整理为清晰列表";
    case "clean":
    case "direct":
    case "translate":
      return request.rawText;
  }
}

function toAosoTargetLanguage(targetLanguage: PostprocessRequest["targetLanguage"]): string {
  switch (targetLanguage) {
    case "zh-CN":
      return "簡體中文";
    case "en-US":
    default:
      return "英語";
  }
}

function buildAosoUrl(baseUrl: string, path: string): string {
  let base = baseUrl.trim();
  if (base.endsWith("/")) {
    base = base.slice(0, -1);
  }
  return `${base}${path}`;
}

function extractAosoContent(
  payload: unknown,
  responseField: AosoResponseField
): AosoPostprocessClientResult {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    throw new Error("AOSO API response was not a JSON object");
  }

  const record = payload as Record<string, unknown>;
  const value = record[responseField];
  if (typeof value !== "string") {
    if (typeof record.error === "string") {
      throw new Error(`AOSO API error: ${record.error}`);
    }
    throw new Error(`AOSO API response did not include ${responseField}`);
  }

  return {
    text: value,
    warnings: typeof record.warning === "string" ? [record.warning] : []
  };
}

function resolveSelectedLlmModel(llm: AppSettings["llm"]): LlmModelConfig | undefined {
  if (llm.models.length === 0) {
    return undefined;
  }
  const index = clampIndex(llm.selectedIndex, llm.models.length);
  return llm.models[index];
}

function buildPostprocessMessages(request: PostprocessRequest): LlmChatMessage[] {
  return [
    {
      role: "system",
      content:
        "You are a desktop voice assistant and text post-processing engine. Return only the final response text. Do not include labels or surrounding quotes."
    },
    {
      role: "user",
      content: [
        `Task: ${describeMode(request)}`,
        `Style: ${request.style}`,
        `Recognition language: ${request.language}`,
        "Context:",
        JSON.stringify(request.appContext, null, 2),
        "Raw transcript:",
        request.rawText,
        request.selectedText ? "Selected text to transform:" : "Selected text to transform: none",
        request.selectedText || "",
        "Dictionary terms:",
        request.dictionaryTerms.length > 0
          ? JSON.stringify(request.dictionaryTerms, null, 2)
          : "[]"
      ].join("\n")
    }
  ];
}

function describeMode(request: PostprocessRequest): string {
  switch (request.mode) {
    case "translate":
      return `Translate the raw transcript to ${request.targetLanguage ?? "the target language"}.`;
    case "formal":
      return "Rewrite the raw transcript in a formal tone.";
    case "summarize":
      return "Summarize the raw transcript concisely.";
    case "list":
      return "Turn the raw transcript into a clear list.";
    case "clean":
      return request.selectedText
        ? "Use the raw transcript as the user's instruction to revise the selected text."
        : "Treat the raw transcript as the user's request and answer or complete it directly.";
    case "direct":
      return "Clean up obvious dictation errors while preserving the original meaning.";
  }
}

function cleanModelText(text: string): string {
  const withoutThinking = stripThinkingTrace(text);
  const trimmed = withoutThinking.trim();
  const fenceMatch = /^```(?:text)?\s*([\s\S]*?)\s*```$/i.exec(trimmed);
  return stripFinalAnswerLabel(fenceMatch?.[1] ?? trimmed).trim();
}

function stripThinkingTrace(text: string): string {
  const closingThinkIndex = text.toLowerCase().lastIndexOf("</think>");
  if (closingThinkIndex >= 0) {
    return text.slice(closingThinkIndex + "</think>".length);
  }

  return stripLeadingThinkingProcess(text.replace(/<think>[\s\S]*?<\/think>/gi, ""));
}

function stripLeadingThinkingProcess(text: string): string {
  const trimmedStart = text.trimStart();
  if (!THINKING_TRACE_PREFIX_PATTERN.test(trimmedStart)) {
    return text;
  }

  const markers = Array.from(trimmedStart.matchAll(createFinalContentMarkerRegex()));
  const lastMarker = markers.at(-1);
  if (lastMarker?.index === undefined) {
    return trimmedStart;
  }

  return trimmedStart.slice(lastMarker.index + lastMarker[0].length);
}

function stripFinalAnswerLabel(text: string): string {
  return text.trimStart().replace(createFinalContentMarkerRegex("^"), "");
}

function createFinalContentMarkerRegex(linePrefix = "(?:^|\\n)"): RegExp {
  return new RegExp(
    `${linePrefix}\\s*(?:[-*]\\s*)?(?:\\d+[.)]\\s*)?(?:\\*{1,2})?(?:${FINAL_CONTENT_LABEL_PATTERN})\\s*(?:\\*{1,2})?\\s*[:：]\\s*(?:\\*{1,2})?\\s*`,
    "gi"
  );
}

function extractAssistantContent(payload: unknown): string {
  if (typeof payload !== "object" || payload === null) {
    throw new Error("LLM response was not a JSON object");
  }
  const choices = (payload as { choices?: unknown }).choices;
  if (!Array.isArray(choices) || choices.length === 0) {
    throw new Error("LLM response did not include choices");
  }
  const first = choices[0] as { message?: { content?: unknown }; text?: unknown };
  const content = first.message?.content ?? first.text;
  if (typeof content === "string") {
    return content;
  }
  if (Array.isArray(content)) {
    return content
      .map((part) =>
        typeof part === "object" && part !== null && typeof (part as { text?: unknown }).text === "string"
          ? (part as { text: string }).text
          : ""
      )
      .join("");
  }
  throw new Error("LLM response did not contain assistant content");
}

function buildChatCompletionsUrl(baseUrl: string): string {
  let base = baseUrl.trim();
  if (base.endsWith("/")) {
    base = base.slice(0, -1);
  }
  if (base.endsWith("/chat/completions")) {
    return base;
  }
  return `${base}/chat/completions`;
}

function createDispatcher(config: LlmModelConfig): Dispatcher {
  const proxyUrl = buildProxyUrl(config);
  return proxyUrl
    ? new ProxyAgent({
        uri: proxyUrl,
        requestTls: { rejectUnauthorized: false }
      })
    : new Agent({ connect: { rejectUnauthorized: false } });
}

function buildProxyUrl(config: {
  proxy?: string;
  proxyUsername?: string;
  proxyPassword?: string;
}): string | undefined {
  const raw = (config.proxy ?? "").trim();
  if (!raw) {
    return undefined;
  }
  const prefixed = raw.startsWith("http://") || raw.startsWith("https://") ? raw : `http://${raw}`;
  const user = (config.proxyUsername ?? "").trim();
  const pass = (config.proxyPassword ?? "").trim();
  if (!user && !pass) {
    return prefixed;
  }
  try {
    const parsed = new URL(prefixed);
    parsed.username = user;
    parsed.password = pass;
    return parsed.toString();
  } catch {
    return prefixed;
  }
}

async function safeReadText(response: { text: () => Promise<string> }): Promise<string> {
  try {
    return await response.text();
  } catch {
    return "";
  }
}

function truncate(text: string, limit: number): string {
  return text.length > limit ? `${text.slice(0, limit)}...` : text;
}

function clampIndex(value: number, length: number): number {
  if (!Number.isFinite(value) || value < 0) {
    return 0;
  }
  if (value >= length) {
    return length - 1;
  }
  return Math.floor(value);
}
