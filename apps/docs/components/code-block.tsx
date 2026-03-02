"use client";

import type { ReactNode } from "react";
import { CopyButton } from "./copy-button";

interface CodeBlockProps {
  language?: string | undefined;
  children: ReactNode;
  code: string;
}

const LANG_LABELS: Record<string, string> = {
  ts: "TypeScript",
  tsx: "TSX",
  js: "JavaScript",
  jsx: "JSX",
  bash: "Shell",
  sh: "Shell",
  sql: "SQL",
  css: "CSS",
  json: "JSON",
  html: "HTML",
};

export function CodeBlock({ language, children, code }: CodeBlockProps) {
  const label = language ? (LANG_LABELS[language] ?? language) : undefined;

  return (
    <div className="code-block">
      <div className="code-block-header">
        {label && <span className="code-lang">{label}</span>}
        <CopyButton text={code} />
      </div>
      <pre>
        <code className={language ? `language-${language}` : undefined}>
          {children}
        </code>
      </pre>
    </div>
  );
}
