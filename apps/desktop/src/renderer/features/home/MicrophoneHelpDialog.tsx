import { MarkdownContent } from "../../shared/ui/MarkdownContent";
import { ThemedIcon } from "../../shared/ui/ThemedIcon";

const localHelpImages = import.meta.glob("./*.{png,jpg,jpeg,webp,gif,svg}", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

const localHelpImageSources = Object.fromEntries(
  Object.entries(localHelpImages).map(([path, url]) => [
    path.split("/").pop() ?? path,
    url,
  ]),
);

interface MicrophoneHelpDialogProps {
  markdown: string;
  onClose(): void;
}

export function MicrophoneHelpDialog({
  markdown,
  onClose,
}: MicrophoneHelpDialogProps): React.JSX.Element {
  return (
    <div
      className="microphone-help-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="microphone-help-dialog-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section className="microphone-help-dialog__window">
        <header className="microphone-help-dialog__header">
          <span className="microphone-help-dialog__icon" aria-hidden="true">
            <ThemedIcon name="microphone" mode="image" />
          </span>
          <div>
            <p>麦克风故障排查</p>
            <h1 id="microphone-help-dialog-title">麦克风不可用</h1>
          </div>
          <button
            type="button"
            className="microphone-help-dialog__close"
            aria-label="关闭麦克风帮助"
            onClick={onClose}
          >
            <ThemedIcon name="close" />
          </button>
        </header>
        <MarkdownContent
          className="microphone-help-dialog__content"
          markdown={markdown}
          resolveImageSource={resolveImageSource}
        />
      </section>
    </div>
  );
}

function resolveImageSource(src: string): string {
  return localHelpImageSources[src] ?? src;
}
