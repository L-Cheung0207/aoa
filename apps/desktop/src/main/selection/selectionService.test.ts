import { describe, expect, it } from "vitest";
import {
  createSelectionService,
  type SelectionClipboardService,
  type SelectionNativeBridge
} from "./selectionService";

function createClipboardService(initialText: string): SelectionClipboardService & {
  setText(text: string): void;
  writes: string[];
} {
  let currentText = initialText;
  const writes: string[] = [];

  return {
    writes,
    backup: () => ({ text: currentText }),
    readText: () => currentText,
    restore: async (snapshot) => {
      writes.push(`restore:${snapshot.text}`);
      currentText = snapshot.text;
    },
    setText: (text) => {
      currentText = text;
    }
  };
}

describe("selection service", () => {
  it("copies selected text from the target window and restores the clipboard", async () => {
    const calls: string[] = [];
    const clipboard = createClipboardService("previous clipboard");
    const nativeBridge: SelectionNativeBridge = {
      focusWindow: async (windowHandle) => {
        calls.push(`focus:${windowHandle}`);
      },
      copySelectionToClipboard: async () => {
        calls.push("copy");
        clipboard.setText("selected text");
      }
    };
    const service = createSelectionService({
      clipboard,
      nativeBridge,
      copyDelayMs: 0
    });

    const selectedText = await service.getSelectedText("12345");

    expect(selectedText).toBe("selected text");
    expect(calls).toEqual(["focus:12345", "copy"]);
    expect(clipboard.writes).toEqual(["restore:previous clipboard"]);
  });

  it("returns an empty string and still restores the clipboard when copy fails", async () => {
    const clipboard = createClipboardService("previous clipboard");
    const nativeBridge: SelectionNativeBridge = {
      focusWindow: async () => undefined,
      copySelectionToClipboard: async () => {
        throw new Error("copy rejected");
      }
    };
    const service = createSelectionService({
      clipboard,
      nativeBridge,
      copyDelayMs: 0
    });

    const selectedText = await service.getSelectedText("12345");

    expect(selectedText).toBe("");
    expect(clipboard.writes).toEqual(["restore:previous clipboard"]);
  });
});
