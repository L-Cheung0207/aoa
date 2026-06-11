import type { ClipboardSnapshot } from "../clipboard/clipboardService";

export interface SelectionClipboardService {
  backup(): ClipboardSnapshot;
  readText(): string;
  writeText(text: string): void;
  restore(snapshot: ClipboardSnapshot): Promise<void>;
}

export interface SelectionNativeBridge {
  copySelectionToClipboard(): Promise<void>;
  focusWindow(windowHandle: string): Promise<void>;
}

export interface SelectionService {
  getSelectedText(targetWindowHandle?: string | undefined): Promise<string>;
}

export interface CreateSelectionServiceOptions {
  clipboard: SelectionClipboardService;
  nativeBridge: SelectionNativeBridge;
  copyDelayMs: number;
}

const SELECTION_CLIPBOARD_SENTINEL = "__AOA_SELECTION_SENTINEL__";

export function createSelectionService(
  options: CreateSelectionServiceOptions
): SelectionService {
  return {
    getSelectedText: async (targetWindowHandle) => {
      const snapshot = options.clipboard.backup();

      try {
        await focusTargetWindow(options.nativeBridge, targetWindowHandle);
        options.clipboard.writeText(SELECTION_CLIPBOARD_SENTINEL);
        await options.nativeBridge.copySelectionToClipboard();
        await delay(options.copyDelayMs);
        const selectedText = options.clipboard.readText();
        return selectedText === SELECTION_CLIPBOARD_SENTINEL ? "" : selectedText;
      } catch (error) {
        console.warn("[selection] failed to copy selected text", error);
        return "";
      } finally {
        await options.clipboard.restore(snapshot);
      }
    }
  };
}

async function focusTargetWindow(
  nativeBridge: SelectionNativeBridge,
  targetWindowHandle: string | undefined
): Promise<void> {
  if (!targetWindowHandle) {
    console.warn("[selection] missing target window handle, copying from current focus");
    return;
  }

  try {
    await nativeBridge.focusWindow(targetWindowHandle);
  } catch (error) {
    console.warn(
      `[selection] failed to restore target focus before copy handle=${targetWindowHandle}`,
      error
    );
  }
}

function delay(milliseconds: number): Promise<void> {
  if (milliseconds <= 0) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}
