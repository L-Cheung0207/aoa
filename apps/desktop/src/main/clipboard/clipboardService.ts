export interface ClipboardAdapter {
  readText(): string;
  writeText(text: string): void;
  availableFormats?(): string[];
  readBuffer?(format: string): Buffer;
  clear?(): void;
  writeBuffer?(format: string, buffer: Buffer): void;
}

export interface ClipboardFormatSnapshot {
  format: string;
  buffer: Buffer;
}

export interface ClipboardSnapshot {
  text: string;
  formats?: ClipboardFormatSnapshot[];
}

export interface ClipboardService {
  backup(): ClipboardSnapshot;
  readText(): string;
  writeText(text: string): void;
  restore(snapshot: ClipboardSnapshot): Promise<void>;
}

export interface CreateClipboardServiceOptions {
  clipboard: ClipboardAdapter;
}

export function createClipboardService(options: CreateClipboardServiceOptions): ClipboardService {
  return {
    backup: () => {
      const text = options.clipboard.readText();
      const formats = readClipboardFormats(options.clipboard);

      return formats.length > 0 ? { text, formats } : { text };
    },
    readText: () => options.clipboard.readText(),
    writeText: (text) => {
      options.clipboard.writeText(text);
    },
    restore: async (snapshot) => {
      if (snapshot.formats && canRestoreFormats(options.clipboard)) {
        try {
          options.clipboard.clear();
          for (const entry of snapshot.formats) {
            options.clipboard.writeBuffer(entry.format, Buffer.from(entry.buffer));
          }
          return;
        } catch (error) {
          console.warn("[clipboard] failed to restore rich clipboard formats", error);
        }
      }

      options.clipboard.writeText(snapshot.text);
    }
  };
}

function readClipboardFormats(clipboard: ClipboardAdapter): ClipboardFormatSnapshot[] {
  if (
    typeof clipboard.availableFormats !== "function" ||
    typeof clipboard.readBuffer !== "function"
  ) {
    return [];
  }

  const snapshots: ClipboardFormatSnapshot[] = [];
  for (const format of clipboard.availableFormats()) {
    try {
      snapshots.push({
        format,
        buffer: Buffer.from(clipboard.readBuffer(format))
      });
    } catch (error) {
      console.warn(`[clipboard] failed to back up clipboard format "${format}"`, error);
    }
  }
  return snapshots;
}

function canRestoreFormats(
  clipboard: ClipboardAdapter
): clipboard is ClipboardAdapter & {
  clear(): void;
  writeBuffer(format: string, buffer: Buffer): void;
} {
  return (
    typeof clipboard.clear === "function" &&
    typeof clipboard.writeBuffer === "function"
  );
}
