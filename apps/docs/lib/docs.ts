import { promises as fs } from "node:fs";
import path from "node:path";

export interface DocEntry {
  slug: string[];
  slugPath: string;
  section: string;
  title: string;
  description: string;
  body: string;
}

const CONTENT_ROOT = path.join(process.cwd(), "content");

interface MarkdownFile {
  slug: string[];
  filePath: string;
}

async function collectMarkdownFiles(prefix: string[] = []): Promise<MarkdownFile[]> {
  const directoryPath = path.join(CONTENT_ROOT, ...prefix);
  const entries = await fs.readdir(directoryPath, { withFileTypes: true });

  const files: MarkdownFile[] = [];

  for (const entry of entries) {
    if (entry.isDirectory()) {
      const nested = await collectMarkdownFiles(prefix.concat(entry.name));
      files.push(...nested);
      continue;
    }

    if (!entry.isFile() || !entry.name.endsWith(".md")) {
      continue;
    }

    const basename = entry.name.replace(/\.md$/, "");
    const slug = prefix.concat(basename);

    files.push({
      slug,
      filePath: path.join(directoryPath, entry.name),
    });
  }

  return files;
}

function extractTitle(content: string, fallbackSlug: string[]): string {
  const lines = content.split(/\r?\n/);

  for (const line of lines) {
    const heading = /^#\s+(.+)$/.exec(line.trim());
    if (heading?.[1]) {
      return heading[1].trim();
    }
  }

  return fallbackSlug[fallbackSlug.length - 1] ?? "Untitled";
}

function extractDescription(content: string): string {
  const lines = content.split(/\r?\n/);
  let inCodeFence = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (line.startsWith("```")) {
      inCodeFence = !inCodeFence;
      continue;
    }

    if (inCodeFence || line.length === 0) {
      continue;
    }

    if (line.startsWith("#") || line.startsWith("-") || /^\d+\./.test(line)) {
      continue;
    }

    return line;
  }

  return "No description available.";
}

function toSection(slug: string[]): string {
  if (slug.length <= 1) {
    return "overview";
  }

  return slug[0] ?? "overview";
}

export async function getAllDocs(): Promise<DocEntry[]> {
  const markdownFiles = await collectMarkdownFiles();
  const docs: DocEntry[] = [];

  for (const markdownFile of markdownFiles) {
    const body = await fs.readFile(markdownFile.filePath, "utf8");
    const slugPath = markdownFile.slug.join("/");

    // Strip the leading h1 from the body (it's rendered separately in the page header)
    const strippedBody = body.replace(/^#\s+.+\r?\n/, "");

    docs.push({
      slug: markdownFile.slug,
      slugPath,
      section: toSection(markdownFile.slug),
      title: extractTitle(body, markdownFile.slug),
      description: extractDescription(body),
      body: strippedBody,
    });
  }

  docs.sort((left, right) => left.slugPath.localeCompare(right.slugPath));
  return docs;
}

export async function getDocBySlug(slug: string[]): Promise<DocEntry | undefined> {
  const docs = await getAllDocs();
  const expected = slug.join("/");
  return docs.find((doc) => doc.slugPath === expected);
}

const SECTION_ORDER = ["overview", "guides", "api", "examples"];

export function groupDocsBySection(docs: DocEntry[]): Map<string, DocEntry[]> {
  const buckets = new Map<string, DocEntry[]>();

  for (const doc of docs) {
    const existing = buckets.get(doc.section) ?? [];
    existing.push(doc);
    buckets.set(doc.section, existing);
  }

  // Return sections in a stable, logical order
  const ordered = new Map<string, DocEntry[]>();

  for (const section of SECTION_ORDER) {
    const entries = buckets.get(section);
    if (entries) {
      ordered.set(section, entries);
    }
  }

  // Append any unexpected sections at the end
  for (const [section, entries] of buckets) {
    if (!ordered.has(section)) {
      ordered.set(section, entries);
    }
  }

  return ordered;
}
