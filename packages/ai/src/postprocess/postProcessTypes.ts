import type {
  AppContext,
  DictionaryTermContext,
  PostprocessMode,
  PostprocessResult,
  PostprocessStyle
} from "@voice/backend-client";

export interface PostProcessInput {
  installationId: string;
  rawText: string;
  selectedText: string;
  appContext: AppContext;
  mode: PostprocessMode;
  language: "auto" | "zh-CN" | "en-US";
  style: PostprocessStyle;
  targetLanguage?: "zh-CN" | "en-US";
  dictionaryTerms: DictionaryTermContext[];
}

export type PostProcessOutput = PostprocessResult;

export interface PostProcessService {
  process(input: PostProcessInput): Promise<PostProcessOutput>;
}
