import type { ReactNode } from "react";

export type MarkdownImageResolver = (src: string) => string;

type MarkdownBlock =
  | { type: "heading"; level: number; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; ordered: boolean; items: string[] }
  | { type: "table"; rows: string[][] }
  | { type: "image"; alt: string; src: string; poster?: string }
  | { type: "hr" };

interface MarkdownContentProps {
  className?: string;
  markdown: string;
  resolveImageSource?: MarkdownImageResolver;
}

export function MarkdownContent({
  className,
  markdown,
  resolveImageSource,
}: MarkdownContentProps): React.JSX.Element {
  const blocks = parseMarkdown(markdown, resolveImageSource);
  return (
    <div className={className}>
      {blocks.map((block, index) => renderBlock(block, index))}
    </div>
  );
}

function parseMarkdown(
  markdown: string,
  resolveImageSource: MarkdownImageResolver = (src) => src,
): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = [];
  const paragraphLines: string[] = [];
  let pendingList: { ordered: boolean; items: string[] } | undefined;
  let pendingTable: string[][] | undefined;

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

  const flushTable = (): void => {
    if (!pendingTable) {
      return;
    }
    if (pendingTable.length > 0) {
      blocks.push({ type: "table", rows: pendingTable });
    }
    pendingTable = undefined;
  };

  const flushTextBlocks = (): void => {
    flushParagraph();
    flushList();
    flushTable();
  };

  for (const line of markdown.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) {
      flushTextBlocks();
      continue;
    }

    const headingMatch = /^(#{1,3})\s+(.+)$/.exec(trimmed);
    if (headingMatch) {
      flushTextBlocks();
      blocks.push({
        type: "heading",
        level: headingMatch[1]?.length ?? 1,
        text: headingMatch[2] ?? "",
      });
      continue;
    }

    if (trimmed === "***" || trimmed === "---") {
      flushTextBlocks();
      blocks.push({ type: "hr" });
      continue;
    }

    const tableCells = parseTableRow(trimmed);
    if (tableCells) {
      flushParagraph();
      flushList();
      if (isMarkdownTableSeparator(tableCells)) {
        continue;
      }
      pendingTable = pendingTable ?? [];
      pendingTable.push(tableCells);
      continue;
    }

    flushTable();

    const imageMatch = /^!\[([^\]]*)\]\((.+)\)$/.exec(trimmed);
    if (imageMatch) {
      flushParagraph();
      flushList();
      blocks.push(
        parseImageBlock(
          imageMatch[1] ?? "",
          imageMatch[2] ?? "",
          resolveImageSource,
        ),
      );
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

  flushTextBlocks();
  return blocks;
}

function parseTableRow(line: string): string[] | undefined {
  if (!line.includes("|")) {
    return undefined;
  }
  const cells = line
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
  return cells.length > 1 ? cells : undefined;
}

function isMarkdownTableSeparator(cells: string[]): boolean {
  return cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}

function parseImageBlock(
  alt: string,
  rawTarget: string,
  resolveImageSource: MarkdownImageResolver,
): MarkdownBlock {
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

function renderBlock(block: MarkdownBlock, index: number): ReactNode {
  switch (block.type) {
    case "heading": {
      const className = `markdown-content__heading markdown-content__heading--${block.level}`;
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
    case "table":
      return (
        <table key={index}>
          <tbody>
            {block.rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, cellIndex) => {
                  const Cell = rowIndex === 0 ? "th" : "td";
                  return <Cell key={cellIndex}>{renderInline(cell)}</Cell>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      );
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
