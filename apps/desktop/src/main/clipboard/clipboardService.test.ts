import { describe, expect, it } from "vitest";
import { createClipboardService, type ClipboardAdapter } from "./clipboardService";

function createClipboard(initialText: string): ClipboardAdapter & {
  writes: string[];
} {
  let currentText = initialText;
  const writes: string[] = [];

  return {
    writes,
    readText: () => currentText,
    writeText: (text) => {
      writes.push(text);
      currentText = text;
    }
  };
}

describe("clipboard service", () => {
  it("backs up writes target text and restores the original clipboard", async () => {
    const clipboard = createClipboard("original clipboard");
    const service = createClipboardService({ clipboard });

    const snapshot = service.backup();
    service.writeText("generated text");
    await service.restore(snapshot);

    expect(snapshot).toEqual({ text: "original clipboard" });
    expect(clipboard.writes).toEqual(["generated text", "original clipboard"]);
  });

  it("restores all captured clipboard formats when the adapter supports them", async () => {
    const writes: string[] = [];
    let formats = new Map<string, Buffer>([
      ["text/plain", Buffer.from("original clipboard", "utf8")],
      ["text/html", Buffer.from("<b>original clipboard</b>", "utf8")],
      ["image/png", Buffer.from([1, 2, 3, 4])]
    ]);
    const clipboard: ClipboardAdapter & {
      writes: string[];
    } = {
      writes,
      readText: () => formats.get("text/plain")?.toString("utf8") ?? "",
      writeText: (text) => {
        writes.push(`text:${text}`);
        formats = new Map([["text/plain", Buffer.from(text, "utf8")]]);
      },
      availableFormats: () => Array.from(formats.keys()),
      readBuffer: (format) => Buffer.from(formats.get(format) ?? Buffer.alloc(0)),
      clear: () => {
        writes.push("clear");
        formats = new Map();
      },
      writeBuffer: (format, buffer) => {
        writes.push(`buffer:${format}:${buffer.toString("utf8")}`);
        formats.set(format, Buffer.from(buffer));
      }
    };
    const service = createClipboardService({ clipboard });

    const snapshot = service.backup();
    service.writeText("generated text");
    await service.restore(snapshot);

    expect(snapshot.formats?.map((entry) => entry.format)).toEqual([
      "text/plain",
      "text/html",
      "image/png"
    ]);
    expect(formats.get("text/plain")?.toString("utf8")).toBe("original clipboard");
    expect(formats.get("text/html")?.toString("utf8")).toBe(
      "<b>original clipboard</b>"
    );
    expect(formats.get("image/png")).toEqual(Buffer.from([1, 2, 3, 4]));
    expect(writes).toEqual([
      "text:generated text",
      "clear",
      "buffer:text/plain:original clipboard",
      "buffer:text/html:<b>original clipboard</b>",
      "buffer:image/png:\u0001\u0002\u0003\u0004"
    ]);
  });
});
