import type { BackendClient, PostprocessRequest } from "@voice/backend-client";
import type { PostProcessInput, PostProcessOutput, PostProcessService } from "./postProcessTypes";

export interface CreatePostProcessServiceOptions {
  backendClient: Pick<BackendClient, "postprocess">;
}

export function createPostProcessService(
  options: CreatePostProcessServiceOptions
): PostProcessService {
  return {
    process: async (input) => {
      const request = createPostprocessRequest(input);

      try {
        return await options.backendClient.postprocess(request);
      } catch (error) {
        return createFallbackResult(input, error);
      }
    }
  };
}

function createPostprocessRequest(input: PostProcessInput): PostprocessRequest {
  return {
    installationId: input.installationId,
    rawText: input.rawText,
    selectedText: input.selectedText,
    appContext: input.appContext,
    mode: input.mode,
    language: input.language,
    style: input.style,
    ...(input.targetLanguage ? { targetLanguage: input.targetLanguage } : {}),
    dictionaryTerms: input.dictionaryTerms
  };
}

function createFallbackResult(input: PostProcessInput, error: unknown): PostProcessOutput {
  return {
    action: input.selectedText ? "replace_selection" : "insert",
    finalText: input.rawText,
    confidence: 0,
    usedDictionaryTermIds: [],
    warnings: [`LLM postprocess failed: ${getErrorMessage(error)}`]
  };
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "unknown error";
}
