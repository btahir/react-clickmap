import type { ReactNode } from "react";
import { CodeBlock } from "./code-block";

/* ------------------------------------------------------------------ */
/*  Heading extraction (for table of contents)                        */
/* ------------------------------------------------------------------ */

export interface TocEntry {
  id: string;
  text: string;
  level: 2 | 3;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function extractToc(markdown: string): TocEntry[] {
  const entries: TocEntry[] = [];

  for (const line of markdown.split(/\r?\n/)) {
    const trimmed = line.trim();
    const m3 = /^###\s+(.+)/.exec(trimmed);
    if (m3?.[1]) {
      entries.push({ id: slugify(m3[1]), text: m3[1], level: 3 });
      continue;
    }
    const m2 = /^##\s+(.+)/.exec(trimmed);
    if (m2?.[1]) {
      entries.push({ id: slugify(m2[1]), text: m2[1], level: 2 });
    }
  }

  return entries;
}

/* ------------------------------------------------------------------ */
/*  Inline parsing (code, bold, italic, links, strikethrough)         */
/* ------------------------------------------------------------------ */

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  // Order matters: links first (they contain [] and ()), then bold, italic, code, strikethrough
  const pattern =
    /(\[([^\]]+)\]\(([^)]+)\))|(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*]+\*)|(\~\~[^~]+\~\~)/g;

  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let partIndex = 0;

  while ((match = pattern.exec(text)) !== null) {
    // Text before the match
    if (match.index > lastIndex) {
      parts.push(
        <span key={`${keyPrefix}-t-${partIndex}`}>
          {text.slice(lastIndex, match.index)}
        </span>,
      );
      partIndex += 1;
    }

    const full = match[0];

    if (match[1]) {
      // Link: [text](url)
      const linkText = match[2] ?? "";
      const href = match[3] ?? "";
      parts.push(
        <a key={`${keyPrefix}-a-${partIndex}`} href={href}>
          {linkText}
        </a>,
      );
    } else if (full.startsWith("`")) {
      // Inline code
      parts.push(
        <code key={`${keyPrefix}-c-${partIndex}`}>
          {full.slice(1, -1)}
        </code>,
      );
    } else if (full.startsWith("**")) {
      // Bold
      parts.push(
        <strong key={`${keyPrefix}-b-${partIndex}`}>
          {full.slice(2, -2)}
        </strong>,
      );
    } else if (full.startsWith("~~")) {
      // Strikethrough
      parts.push(
        <del key={`${keyPrefix}-s-${partIndex}`}>
          {full.slice(2, -2)}
        </del>,
      );
    } else if (full.startsWith("*")) {
      // Italic
      parts.push(
        <em key={`${keyPrefix}-i-${partIndex}`}>
          {full.slice(1, -1)}
        </em>,
      );
    }

    lastIndex = match.index + full.length;
    partIndex += 1;
  }

  // Remaining text
  if (lastIndex < text.length) {
    parts.push(
      <span key={`${keyPrefix}-t-${partIndex}`}>
        {text.slice(lastIndex)}
      </span>,
    );
  }

  return parts.length > 0 ? parts : [<span key={`${keyPrefix}-empty`}>{text}</span>];
}

/* ------------------------------------------------------------------ */
/*  Block detection helpers                                           */
/* ------------------------------------------------------------------ */

function isSpecialBlockStart(line: string): boolean {
  return (
    line.startsWith("#") ||
    line.startsWith("```") ||
    line.startsWith("|") ||
    line.startsWith(">") ||
    line.startsWith("---") ||
    line.startsWith("- [") || // checkbox
    /^[-*]\s+/.test(line) ||
    /^\d+\.\s+/.test(line)
  );
}

/* ------------------------------------------------------------------ */
/*  Table parser                                                      */
/* ------------------------------------------------------------------ */

function parseTableRow(row: string): string[] {
  return row
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

function isAlignmentRow(row: string): boolean {
  const cells = parseTableRow(row);
  return cells.every((cell) => /^:?-+:?$/.test(cell));
}

function parseAlignment(cell: string): "left" | "center" | "right" {
  const trimmed = cell.trim();
  if (trimmed.startsWith(":") && trimmed.endsWith(":")) return "center";
  if (trimmed.endsWith(":")) return "right";
  return "left";
}

/* ------------------------------------------------------------------ */
/*  Main renderer                                                     */
/* ------------------------------------------------------------------ */

export function renderMarkdown(markdown: string): ReactNode[] {
  const lines = markdown.split(/\r?\n/);
  const nodes: ReactNode[] = [];
  let index = 0;

  while (index < lines.length) {
    const current = lines[index] ?? "";
    const trimmed = current.trim();

    // Empty line
    if (trimmed.length === 0) {
      index += 1;
      continue;
    }

    // Horizontal rule
    if (/^---+$/.test(trimmed)) {
      nodes.push(<hr key={`hr-${index}`} />);
      index += 1;
      continue;
    }

    // Code block
    if (trimmed.startsWith("```")) {
      const language = trimmed.slice(3).trim();
      const codeLines: string[] = [];
      index += 1;

      while (index < lines.length && !(lines[index] ?? "").trim().startsWith("```")) {
        codeLines.push(lines[index] ?? "");
        index += 1;
      }
      index += 1; // skip closing ```

      const codeText = codeLines.join("\n");
      nodes.push(
        <CodeBlock key={`codeblock-${index}`} language={language || undefined} code={codeText}>
          {codeText}
        </CodeBlock>,
      );
      continue;
    }

    // Table
    if (trimmed.startsWith("|")) {
      const tableLines: string[] = [];

      while (index < lines.length && (lines[index] ?? "").trim().startsWith("|")) {
        tableLines.push((lines[index] ?? "").trim());
        index += 1;
      }

      if (tableLines.length >= 2) {
        const headerCells = parseTableRow(tableLines[0]!);
        const hasAlignment = tableLines.length >= 2 && isAlignmentRow(tableLines[1]!);
        const alignRow = hasAlignment ? parseTableRow(tableLines[1]!) : [];
        const alignments = alignRow.map(parseAlignment);
        const bodyStart = hasAlignment ? 2 : 1;

        nodes.push(
          <div key={`table-wrap-${index}`} className="table-wrap">
            <table key={`table-${index}`}>
              <thead>
                <tr>
                  {headerCells.map((cell, ci) => (
                    <th key={ci} style={alignments[ci] ? { textAlign: alignments[ci] } : undefined}>
                      {renderInline(cell, `th-${index}-${ci}`)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableLines.slice(bodyStart).map((row, ri) => {
                  const cells = parseTableRow(row);
                  return (
                    <tr key={ri}>
                      {cells.map((cell, ci) => (
                        <td key={ci} style={alignments[ci] ? { textAlign: alignments[ci] } : undefined}>
                          {renderInline(cell, `td-${index}-${ri}-${ci}`)}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>,
        );
      }
      continue;
    }

    // Blockquote
    if (trimmed.startsWith(">")) {
      const quoteLines: string[] = [];

      while (index < lines.length) {
        const line = (lines[index] ?? "").trim();
        if (!line.startsWith(">") && line.length > 0) break;
        if (line.length === 0 && index + 1 < lines.length && !(lines[index + 1] ?? "").trim().startsWith(">")) break;
        if (line.length === 0) { index += 1; continue; }
        quoteLines.push(line.replace(/^>\s?/, ""));
        index += 1;
      }

      nodes.push(
        <blockquote key={`bq-${index}`}>
          {quoteLines.map((line, li) => (
            <p key={li}>{renderInline(line, `bq-${index}-${li}`)}</p>
          ))}
        </blockquote>,
      );
      continue;
    }

    // Checkbox list (- [ ] or - [x])
    if (/^[-*]\s+\[[ x]\]/.test(trimmed)) {
      const items: Array<{ checked: boolean; text: string }> = [];

      while (index < lines.length && /^[-*]\s+\[[ x]\]/.test((lines[index] ?? "").trim())) {
        const line = (lines[index] ?? "").trim();
        const checked = /^[-*]\s+\[x\]/i.test(line);
        const text = line.replace(/^[-*]\s+\[[ x]\]\s*/, "");
        items.push({ checked, text });
        index += 1;
      }

      nodes.push(
        <ul key={`checklist-${index}`} className="checklist">
          {items.map((item, ii) => (
            <li key={ii} className={item.checked ? "checked" : ""}>
              <span className="checkbox">{item.checked ? "✓" : ""}</span>
              {renderInline(item.text, `check-${index}-${ii}`)}
            </li>
          ))}
        </ul>,
      );
      continue;
    }

    // Headings
    if (/^###\s+/.test(trimmed)) {
      const text = trimmed.replace(/^###\s+/, "");
      const id = slugify(text);
      nodes.push(
        <h3 key={`h3-${index}`} id={id}>
          <a href={`#${id}`} className="heading-anchor" aria-hidden="true">#</a>
          {text}
        </h3>,
      );
      index += 1;
      continue;
    }

    if (/^##\s+/.test(trimmed)) {
      const text = trimmed.replace(/^##\s+/, "");
      const id = slugify(text);
      nodes.push(
        <h2 key={`h2-${index}`} id={id}>
          <a href={`#${id}`} className="heading-anchor" aria-hidden="true">#</a>
          {text}
        </h2>,
      );
      index += 1;
      continue;
    }

    if (/^#\s+/.test(trimmed)) {
      nodes.push(<h1 key={`h1-${index}`}>{trimmed.replace(/^#\s+/, "")}</h1>);
      index += 1;
      continue;
    }

    // Unordered list
    if (/^[-*]\s+/.test(trimmed)) {
      const items: string[] = [];

      while (index < lines.length && /^[-*]\s+/.test((lines[index] ?? "").trim())) {
        items.push((lines[index] ?? "").trim().replace(/^[-*]\s+/, ""));
        index += 1;
      }

      nodes.push(
        <ul key={`ul-${index}`}>
          {items.map((item, ii) => (
            <li key={ii}>{renderInline(item, `ul-${index}-${ii}`)}</li>
          ))}
        </ul>,
      );
      continue;
    }

    // Ordered list
    if (/^\d+\.\s+/.test(trimmed)) {
      const items: string[] = [];

      while (index < lines.length && /^\d+\.\s+/.test((lines[index] ?? "").trim())) {
        items.push((lines[index] ?? "").trim().replace(/^\d+\.\s+/, ""));
        index += 1;
      }

      nodes.push(
        <ol key={`ol-${index}`}>
          {items.map((item, ii) => (
            <li key={ii}>{renderInline(item, `ol-${index}-${ii}`)}</li>
          ))}
        </ol>,
      );
      continue;
    }

    // Paragraph (default fallback)
    const paragraph: string[] = [trimmed];
    index += 1;

    while (index < lines.length) {
      const line = (lines[index] ?? "").trim();
      if (line.length === 0 || isSpecialBlockStart(line)) break;
      paragraph.push(line);
      index += 1;
    }

    nodes.push(
      <p key={`p-${index}`}>{renderInline(paragraph.join(" "), `p-${index}`)}</p>,
    );
  }

  return nodes;
}
