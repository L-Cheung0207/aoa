import { describe, expect, it } from "vitest";
import { createInsertService, type InsertClipboardService, type NativeInputBridge } from "./insertService";

function createClipboardService(initialText: string): InsertClipboardService & {
  writes: string[];
} {
  let currentText = initialText;
  const writes: string[] = [];

  return {
    writes,
    backup: () => ({ text: currentText }),
    writeText: (text) => {
      writes.push(text);
      currentText = text;
    },
    restore: async (snapshot) => {
      writes.push(snapshot.text);
      currentText = snapshot.text;
    }
  };
}

describe("insert service", () => {
  it("inserts text by clipboard paste and restores the previous clipboard", async () => {
    const clipboard = createClipboardService("previous");
    const nativeBridge: NativeInputBridge = {
      pasteFromClipboard: async () => undefined,
      typeText: async () => undefined,
      focusWindow: async () => undefined,
      isEditableTargetFocused: async () => true
    };
    const service = createInsertService({
      clipboard,
      nativeBridge,
      restoreClipboardDelayMs: 0
    });

    const result = await service.insertText("hello world", { strategy: "clipboard" });

    expect(result).toEqual({ ok: true, strategy: "clipboard" });
    expect(clipboard.writes).toEqual(["hello world", "previous"]);
  });

  it("returns fallback text when clipboard paste fails and still restores clipboard", async () => {
    const clipboard = createClipboardService("previous");
    const nativeBridge: NativeInputBridge = {
      pasteFromClipboard: async () => {
        throw new Error("paste rejected");
      },
      typeText: async () => undefined,
      focusWindow: async () => undefined,
      isEditableTargetFocused: async () => true
    };
    const service = createInsertService({
      clipboard,
      nativeBridge,
      restoreClipboardDelayMs: 0
    });

    const result = await service.insertText("cannot paste", { strategy: "clipboard" });

    expect(result).toEqual({
      ok: false,
      strategy: "clipboard",
      fallbackText: "cannot paste",
      errorCode: "insert_failed",
      message: "paste rejected"
    });
    expect(clipboard.writes).toEqual(["cannot paste", "previous"]);
  });

  it("uses native typing when native strategy is requested", async () => {
    const typed: string[] = [];
    const clipboard = createClipboardService("previous");
    const nativeBridge: NativeInputBridge = {
      pasteFromClipboard: async () => undefined,
      typeText: async (text) => {
        typed.push(text);
      },
      focusWindow: async () => undefined,
      isEditableTargetFocused: async () => true
    };
    const service = createInsertService({
      clipboard,
      nativeBridge,
      restoreClipboardDelayMs: 0
    });

    const result = await service.insertText("typed text", { strategy: "native" });

    expect(result).toEqual({ ok: true, strategy: "native" });
    expect(typed).toEqual(["typed text"]);
    expect(clipboard.writes).toEqual([]);
  });

  it("falls back to native typing when auto clipboard paste fails", async () => {
    const calls: string[] = [];
    const clipboard = createClipboardService("previous");
    const nativeBridge: NativeInputBridge = {
      pasteFromClipboard: async () => {
        calls.push("paste");
        throw new Error("paste rejected");
      },
      typeText: async (text) => {
        calls.push(`type:${text}`);
      },
      focusWindow: async (windowHandle) => {
        calls.push(`focus:${windowHandle}`);
      },
      isEditableTargetFocused: async () => {
        calls.push("editable");
        return true;
      }
    };
    const service = createInsertService({
      clipboard: {
        ...clipboard,
        writeText: (text) => {
          calls.push(`write:${text}`);
          clipboard.writeText(text);
        },
        restore: async (snapshot) => {
          calls.push(`restore:${snapshot.text}`);
          await clipboard.restore(snapshot);
        }
      },
      nativeBridge,
      restoreClipboardDelayMs: 0
    });

    const result = await service.insertText("fallback text", {
      strategy: "auto",
      targetWindowHandle: "12345"
    });

    expect(result).toEqual({ ok: true, strategy: "native" });
    expect(calls).toEqual([
      "focus:12345",
      "editable",
      "write:fallback text",
      "paste",
      "restore:previous",
      "focus:12345",
      "editable",
      "type:fallback text"
    ]);
  });

  it("restores the target window focus before clipboard paste", async () => {
    const calls: string[] = [];
    const clipboard = createClipboardService("previous");
    const nativeBridge: NativeInputBridge = {
      pasteFromClipboard: async () => {
        calls.push("paste");
      },
      typeText: async () => undefined,
      focusWindow: async (windowHandle) => {
        calls.push(`focus:${windowHandle}`);
      },
      isEditableTargetFocused: async () => {
        calls.push("editable");
        return true;
      }
    };
    const service = createInsertService({
      clipboard: {
        ...clipboard,
        writeText: (text) => {
          calls.push(`write:${text}`);
          clipboard.writeText(text);
        },
        restore: async (snapshot) => {
          calls.push(`restore:${snapshot.text}`);
          await clipboard.restore(snapshot);
        }
      },
      nativeBridge,
      restoreClipboardDelayMs: 0
    });

    const result = await service.insertText("hello cursor", {
      strategy: "clipboard",
      targetWindowHandle: "12345"
    });

    expect(result).toEqual({ ok: true, strategy: "clipboard" });
    expect(calls).toEqual([
      "focus:12345",
      "editable",
      "write:hello cursor",
      "paste",
      "restore:previous"
    ]);
  });

  it("returns fallback text without pasting when the focused target is not editable", async () => {
    const calls: string[] = [];
    const clipboard = createClipboardService("previous");
    const nativeBridge: NativeInputBridge = {
      pasteFromClipboard: async () => {
        calls.push("paste");
      },
      typeText: async () => {
        calls.push("type");
      },
      focusWindow: async (windowHandle) => {
        calls.push(`focus:${windowHandle}`);
      },
      isEditableTargetFocused: async () => {
        calls.push("editable");
        return false;
      }
    };
    const service = createInsertService({
      clipboard,
      nativeBridge,
      restoreClipboardDelayMs: 0
    });

    const result = await service.insertText("answer popup text", {
      strategy: "clipboard",
      targetWindowHandle: "12345"
    });

    expect(result).toEqual({
      ok: false,
      strategy: "clipboard",
      fallbackText: "answer popup text",
      errorCode: "insert_failed",
      message: "Focused target is not editable"
    });
    expect(calls).toEqual(["focus:12345", "editable"]);
    expect(clipboard.writes).toEqual([]);
  });

  it("continues clipboard paste when target window focus cannot be restored", async () => {
    const calls: string[] = [];
    const clipboard = createClipboardService("previous");
    const nativeBridge: NativeInputBridge = {
      pasteFromClipboard: async () => {
        calls.push("paste");
      },
      typeText: async () => undefined,
      focusWindow: async (windowHandle) => {
        calls.push(`focus:${windowHandle}`);
        throw new Error("focus rejected");
      },
      isEditableTargetFocused: async () => {
        calls.push("editable");
        return true;
      }
    };
    const service = createInsertService({
      clipboard: {
        ...clipboard,
        writeText: (text) => {
          calls.push(`write:${text}`);
          clipboard.writeText(text);
        },
        restore: async (snapshot) => {
          calls.push(`restore:${snapshot.text}`);
          await clipboard.restore(snapshot);
        }
      },
      nativeBridge,
      restoreClipboardDelayMs: 0
    });

    const result = await service.insertText("fallback paste", {
      strategy: "clipboard",
      targetWindowHandle: "12345"
    });

    expect(result).toEqual({ ok: true, strategy: "clipboard" });
    expect(calls).toEqual([
      "focus:12345",
      "editable",
      "write:fallback paste",
      "paste",
      "restore:previous"
    ]);
  });
});
