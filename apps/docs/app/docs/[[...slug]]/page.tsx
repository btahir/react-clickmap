import Link from "next/link";
import { notFound } from "next/navigation";
import { extractToc, renderMarkdown } from "../../../components/markdown-renderer";
import { getAllDocs, getDocBySlug, groupDocsBySection } from "../../../lib/docs";

const SECTION_TITLES: Record<string, string> = {
  overview: "Overview",
  guides: "Guides",
  api: "API Reference",
  examples: "Examples",
};

const SECTION_DESCRIPTIONS: Record<string, string> = {
  overview: "Start here — installation, architecture, and core concepts.",
  guides: "Step-by-step walkthroughs for common integration patterns.",
  api: "Detailed reference for every component, hook, and type.",
  examples: "Copy-paste recipes for specific use cases.",
};

const SECTION_ICONS: Record<string, string> = {
  overview: "◈",
  guides: "◉",
  api: "⬡",
  examples: "△",
};

interface DocsPageProps {
  params: Promise<{ slug?: string[] }>;
}

function toDocsHref(slug: string[]): string {
  return `/docs/${slug.join("/")}`;
}

export async function generateStaticParams() {
  const docs = await getAllDocs();
  return docs.map((doc) => ({ slug: doc.slug }));
}

export default async function DocsPage({ params }: DocsPageProps) {
  const resolved = await params;
  const slug = resolved.slug ?? [];
  const docs = await getAllDocs();
  const grouped = groupDocsBySection(docs);

  /* ---------------------------------------------------------------- */
  /*  Docs index page (/docs)                                         */
  /* ---------------------------------------------------------------- */
  if (slug.length === 0) {
    return (
      <main className="docs-shell">
        <header className="docs-nav">
          <Link href="/" className="docs-brand">
            <span className="brand-icon">◈</span>
            react-clickmap
          </Link>
          <nav className="docs-nav-links">
            <Link href="/docs" className="nav-link active">Docs</Link>
            <Link href="/docs/getting-started" className="nav-link">Get Started</Link>
          </nav>
        </header>

        <section className="docs-index">
          <div className="docs-index-header">
            <p className="doc-meta">Documentation</p>
            <h1 className="doc-title">Learn react-clickmap</h1>
            <p className="doc-description">
              Guides, API references, and practical examples for building
              privacy-first heatmap analytics.
            </p>
          </div>

          <div className="docs-sections">
            {Array.from(grouped.entries()).map(([section, entries]) => (
              <div key={section} className="docs-section-group">
                <div className="section-group-header">
                  <span className="section-icon">{SECTION_ICONS[section] ?? "◇"}</span>
                  <div>
                    <h2>{SECTION_TITLES[section] ?? section}</h2>
                    <p>{SECTION_DESCRIPTIONS[section] ?? ""}</p>
                  </div>
                </div>
                <div className="docs-card-grid">
                  {entries.map((doc) => (
                    <Link key={doc.slugPath} href={toDocsHref(doc.slug)} className="docs-card">
                      <h3>{doc.title}</h3>
                      <p>{doc.description}</p>
                      <span className="card-arrow">→</span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    );
  }

  /* ---------------------------------------------------------------- */
  /*  Individual doc page (/docs/[...slug])                           */
  /* ---------------------------------------------------------------- */
  const doc = await getDocBySlug(slug);
  if (!doc) {
    notFound();
  }

  const toc = extractToc(doc.body);

  return (
    <main className="docs-shell">
      <header className="docs-nav">
        <Link href="/" className="docs-brand">
          <span className="brand-icon">◈</span>
          react-clickmap
        </Link>
        <nav className="docs-nav-links">
          <Link href="/docs" className="nav-link">Docs</Link>
          <Link href="/docs/getting-started" className="nav-link">Get Started</Link>
        </nav>
      </header>

      <section className="docs-layout">
        {/* Left sidebar */}
        <aside className="docs-sidebar" aria-label="documentation navigation">
          {Array.from(grouped.entries()).map(([section, entries]) => (
            <div key={section} className="sidebar-section">
              <h4 className="sidebar-label">{SECTION_TITLES[section] ?? section}</h4>
              {entries.map((entry) => {
                const href = toDocsHref(entry.slug);
                const isActive = entry.slugPath === doc.slugPath;

                return (
                  <Link
                    key={entry.slugPath}
                    href={href}
                    className={`sidebar-link${isActive ? " active" : ""}`}
                  >
                    {entry.title}
                  </Link>
                );
              })}
            </div>
          ))}
        </aside>

        {/* Main content */}
        <article className="docs-content">
          <div className="doc-header">
            <span className="doc-breadcrumb">
              <Link href="/docs">Docs</Link>
              <span className="breadcrumb-sep">/</span>
              <span>{SECTION_TITLES[doc.section] ?? doc.section}</span>
            </span>
            <h1 className="doc-title">{doc.title}</h1>
            {doc.description && <p className="doc-description">{doc.description}</p>}
          </div>
          <div className="md-content">{renderMarkdown(doc.body)}</div>
        </article>

        {/* Right table of contents */}
        {toc.length > 1 && (
          <nav className="docs-toc" aria-label="table of contents">
            <h4 className="toc-label">On this page</h4>
            {toc.map((entry) => (
              <a
                key={entry.id}
                href={`#${entry.id}`}
                className={`toc-link${entry.level === 3 ? " toc-sub" : ""}`}
              >
                {entry.text}
              </a>
            ))}
          </nav>
        )}
      </section>
    </main>
  );
}
