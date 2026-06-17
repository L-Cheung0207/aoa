import type { ReactNode } from "react";
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

type MarkdownBlock =
  | { type: "heading"; level: number; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; ordered: boolean; items: string[] }
  | { type: "image"; alt: string; src: string; poster?: string }
  | { type: "hr" };

interface MicrophoneHelpDialogProps {
  markdown: string;
  onClose(): void;
}

export function MicrophoneHelpDialog({
  markdown,
  onClose,
}: MicrophoneHelpDialogProps): React.JSX.Element {
  const blocks = parseMarkdown(markdown);

  return (
    <div
      className="microphone-help-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="microphone-help-dialog-title"
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
        <div className="microphone-help-dialog__content">
          {blocks.map((block, index) => renderBlock(block, index))}
        </div>
      </section>
    </div>
  );
}

function parseMarkdown(markdown: string): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = [];
  const paragraphLines: string[] = [];
  let pendingList: { ordered: boolean; items: string[] } | undefined;

  const flushParagraph = (): void => {
    if (paragraphLines.length === 0) {
      return;
    }
    blocks.push({ type: "paragraph", text: paragraphLines.join(" ") });
    paragraphLines.length = 0;
  };

  const flushList = (): void => {
    if (!pendingList) {
      return;
    }
    blocks.push({
      type: "list",
      ordered: pendingList.ordered,
      items: pendingList.items,
    });
    pendingList = undefined;
  };

  for (const line of markdown.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) {
      flushParagraph();
      flushList();
      continue;
    }

    const headingMatch = /^(#{1,3})\s+(.+)$/.exec(trimmed);
    if (headingMatch) {
      flushParagraph();
      flushList();
      blocks.push({
        type: "heading",
        level: headingMatch[1]?.length ?? 1,
        text: headingMatch[2] ?? "",
      });
      continue;
    }

    if (trimmed === "***" || trimmed === "---") {
      flushParagraph();
      flushList();
      blocks.push({ type: "hr" });
      continue;
    }

    const imageMatch = /^!\[([^\]]*)\]\((.+)\)$/.exec(trimmed);
    if (imageMatch) {
      flushParagraph();
      flushList();
      blocks.push(parseImageBlock(imageMatch[1] ?? "", imageMatch[2] ?? ""));
      continue;
    }

    const unorderedMatch = /^-\s+(.+)$/.exec(trimmed);
    if (unorderedMatch) {
      flushParagraph();
      if (!pendingList || pendingList.ordered) {
        flushList();
        pendingList = { ordered: false, items: [] };
      }
      pendingList.items.push(unorderedMatch[1] ?? "");
      continue;
    }

    const orderedMatch = /^\d+\.\s+(.+)$/.exec(trimmed);
    if (orderedMatch) {
      flushParagraph();
      if (!pendingList || !pendingList.ordered) {
        flushList();
        pendingList = { ordered: true, items: [] };
      }
      pendingList.items.push(orderedMatch[1] ?? "");
      continue;
    }

    flushList();
    paragraphLines.push(trimmed);
  }

  flushParagraph();
  flushList();
  return blocks;
}

function parseImageBlock(alt: string, rawTarget: string): MarkdownBlock {
  const poster = /poster=([^"\s)]+)/.exec(rawTarget)?.[1];
  const src = rawTarget
    .replace(/^video:/, "")
    .replace(/\s+".*"$/, "")
    .trim();
  return {
    type: "image",
    alt,
    src: resolveImageSource(src),
    ...(poster ? { poster: resolveImageSource(poster) } : {}),
  };
}

function resolveImageSource(src: string): string {
  return localHelpImageSources[src] ?? src;
}

function renderBlock(block: MarkdownBlock, index: number): ReactNode {
  switch (block.type) {
    case "heading": {
      const className = `microphone-help-dialog__heading microphone-help-dialog__heading--${block.level}`;
      if (block.level === 1) {
        return (
          <h2 className={className} key={index}>
            {renderInline(block.text)}
          </h2>
        );
      }
      if (block.level === 2) {
        return (
          <h3 className={className} key={index}>
            {renderInline(block.text)}
          </h3>
        );
      }
      return (
        <h4 className={className} key={index}>
          {renderInline(block.text)}
        </h4>
      );
    }
    case "paragraph":
      return <p key={index}>{renderInline(block.text)}</p>;
    case "list": {
      const Tag = block.ordered ? "ol" : "ul";
      return (
        <Tag key={index}>
          {block.items.map((item, itemIndex) => (
            <li key={itemIndex}>{renderInline(item)}</li>
          ))}
        </Tag>
      );
    }
    case "image": {
      const imageSrc = block.poster ?? block.src;
      return (
        <figure key={index}>
          <img src={imageSrc} alt={block.alt} loading="lazy" />
          <figcaption>{block.alt}</figcaption>
        </figure>
      );
    }
    case "hr":
      return <hr key={index} />;
  }
}

function renderInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|<[^>]+>|https?:\/\/\S+)/g;
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > cursor) {
      nodes.push(text.slice(cursor, match.index));
    }
    const token = match[0];
    if (token.startsWith("**")) {
      nodes.push(<strong key={nodes.length}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith("<") && token.endsWith(">")) {
      const value = token.slice(1, -1);
      const href = value.includes("@") ? `mailto:${value}` : value;
      nodes.push(
        <a key={nodes.length} href={href}>
          {value}
        </a>,
      );
    } else {
      nodes.push(
        <a key={nodes.length} href={token}>
          {token}
        </a>,
      );
    }
    cursor = match.index + token.length;
  }

  if (cursor < text.length) {
    nodes.push(text.slice(cursor));
  }
  return nodes;
}
