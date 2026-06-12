import type { InsertStrategy } from "@voice/shared";
import type { ClipboardSnapshot } from "../clipboard/clipboardService";

export interface InsertClipboardService {
  backup(): ClipboardSnapshot;
  writeText(text: string): void;
  restore(snapshot: ClipboardSnapshot): Promise<void>;
}

export interface NativeInputBridge {
  pasteFromClipboard(): Promise<void>;
  typeText(text: string): Promise<void>;
  focusWindow(windowHandle: string): Promise<void>;
  isEditableTargetFocused(): Promise<boolean>;
}

export type InsertResult =
  | {
      ok: true;
      strategy: InsertStrategy;
    }
  | {
      ok: false;
      strategy: InsertStrategy;
      fallbackText: string;
      errorCode: "insert_failed";
      message: string;
    };

export interface InsertTextOptions {
  strategy: InsertStrategy;
  targetWindowHandle?: string | undefined;
}

export interface InsertService {
  insertText(text: string, options: InsertTextOptions): Promise<InsertResult>;
}

export interface CreateInsertServiceOptions {
  clipboard: InsertClipboardService;
  nativeBridge: NativeInputBridge;
  restoreClipboardDelayMs: number;
}

export function createInsertService(options: CreateInsertServiceOptions): InsertService {
  return {
    insertText: async (text, insertOptions) => {
      console.log(
        `[insert] 准备插入 strategy=${insertOptions.strategy} textLength=${text.length} targetHandle=${insertOptions.targetWindowHandle ?? "none"}`
      );
      if (insertOptions.strategy === "native") {
        return insertWithNativeText(
          options.nativeBridge,
          text,
          insertOptions.targetWindowHandle
        );
      }

      if (insertOptions.strategy === "auto") {
        const clipboardResult = await insertWithClipboard(
          options,
          text,
          "clipboard",
          insertOptions.targetWindowHandle
        );

        if (clipboardResult.ok) {
          return clipboardResult;
        }

        if (clipboardResult.message === "Focused target is not editable") {
          return clipboardResult;
        }

        console.warn(
          "[insert] auto strategy: clipboard paste failed, falling back to native typing"
        );
        return insertWithNativeText(
          options.nativeBridge,
          text,
          insertOptions.targetWindowHandle
        );
      }

      return insertWithClipboard(
        options,
        text,
        insertOptions.strategy,
        insertOptions.targetWindowHandle
      );
    }
  };
}

async function insertWithNativeText(
  nativeBridge: NativeInputBridge,
  text: string,
  targetWindowHandle: string | undefined
): Promise<InsertResult> {
  try {
    await focusTargetWindow(nativeBridge, targetWindowHandle);
    const editable = await verifyEditableTarget(nativeBridge, targetWindowHandle);
    if (!editable) {
      return createFailureResult(
        "native",
        text,
        new Error("Focused target is not editable")
      );
    }
    await nativeBridge.typeText(text);
    console.log("[insert] ✅ native typeText 已执行");
    return { ok: true, strategy: "native" };
  } catch (error) {
    console.error("[insert] ❌ native typeText 插入失败", error);
    return createFailureResult("native", text, error);
  }
}

async function insertWithClipboard(
  options: CreateInsertServiceOptions,
  text: string,
  strategy: InsertStrategy,
  targetWindowHandle: string | undefined
): Promise<InsertResult> {
  let snapshot: ClipboardSnapshot | undefined;
  try {
    await focusTargetWindow(options.nativeBridge, targetWindowHandle);
    const editable = await verifyEditableTarget(options.nativeBridge, targetWindowHandle);
    if (!editable) {
      return createFailureResult(
        strategy,
        text,
        new Error("Focused target is not editable")
      );
    }
    snapshot = options.clipboard.backup();
    options.clipboard.writeText(text);
    await options.nativeBridge.pasteFromClipboard();
    await delay(options.restoreClipboardDelayMs);
    console.log("[insert] ✅ clipboard paste 已执行");
    return { ok: true, strategy };
  } catch (error) {
    console.error("[insert] ❌ clipboard paste 插入失败", error);
    return createFailureResult(strategy, text, error);
  } finally {
    if (snapshot) {
      await options.clipboard.restore(snapshot);
    }
  }
}

async function focusTargetWindow(
  nativeBridge: NativeInputBridge,
  targetWindowHandle: string | undefined
): Promise<void> {
  if (!targetWindowHandle) {
    console.warn("[insert] 未提供目标窗口 handle，直接对当前焦点执行插入");
    return;
  }

  try {
    await nativeBridge.focusWindow(targetWindowHandle);
    console.log(`[insert] 🎯 已恢复目标窗口焦点 handle=${targetWindowHandle}`);
  } catch (error) {
    console.warn(
      `[insert] ⚠️ 恢复目标窗口焦点失败，继续尝试对当前焦点粘贴 handle=${targetWindowHandle}`,
      error
    );
  }
}

async function verifyEditableTarget(
  nativeBridge: NativeInputBridge,
  targetWindowHandle: string | undefined
): Promise<boolean> {
  if (!targetWindowHandle) {
    return true;
  }

  try {
    const editable = await nativeBridge.isEditableTargetFocused();
    if (!editable) {
      console.warn("[insert] focused target is not editable; skipping insert");
    }
    return editable;
  } catch (error) {
    console.warn("[insert] editable target check failed; continuing insert", error);
    return true;
  }
}

function createFailureResult(
  strategy: InsertStrategy,
  fallbackText: string,
  error: unknown
): InsertResult {
  return {
    ok: false,
    strategy,
    fallbackText,
    errorCode: "insert_failed",
    message: getErrorMessage(error)
  };
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "unknown insert error";
}

function delay(milliseconds: number): Promise<void> {
  if (milliseconds <= 0) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}
