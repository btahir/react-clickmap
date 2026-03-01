import Link from "next/link";
import { notFound } from "next/navigation";
import { renderMarkdown } from "../../../components/markdown-renderer";
import { getAllDocs, getDocBySlug, groupDocsBySection } from "../../../lib/docs";

const SECTION_TITLES: Record<string, string> = {
  overview: "Overview",
  guides: "Guides",
  api: "API",
  examples: "Examples",
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

  if (slug.length === 0) {
    return (
      <main className="docs-shell">
        <header className="docs-nav">
          <Link href="/" className="docs-brand">
            react-clickmap
          </Link>
          <nav className="docs-nav-links">
            <Link href="/docs">Docs</Link>
            <Link href="/docs/getting-started">Getting Started</Link>
          </nav>
        </header>

        <section className="docs-container">
          <div className="docs-panel">
            <p className="doc-meta">Documentation</p>
            <h1 className="doc-title">Build Privacy-First Clickmaps</h1>
            <p className="doc-description">
              Browse guides, API references, and practical examples for integrating react-clickmap.
            </p>
            <div className="docs-card-grid">
              {docs.map((doc) => (
                <Link key={doc.slugPath} href={toDocsHref(doc.slug)} className="docs-card">
                  <h3>{doc.title}</h3>
                  <p>{doc.description}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>
    );
  }

  const doc = await getDocBySlug(slug);
  if (!doc) {
    notFound();
  }

  return (
    <main className="docs-shell">
      <header className="docs-nav">
        <Link href="/" className="docs-brand">
          react-clickmap
        </Link>
        <nav className="docs-nav-links">
          <Link href="/docs">Docs</Link>
          <Link href="/docs/getting-started">Getting Started</Link>
        </nav>
      </header>

      <section className="docs-container docs-grid">
        <aside className="docs-sidebar" aria-label="documentation navigation">
          {Array.from(grouped.entries()).map(([section, entries]) => (
            <div key={section}>
              <h3>{SECTION_TITLES[section] ?? section}</h3>
              {entries.map((entry) => {
                const href = toDocsHref(entry.slug);
                const isActive = entry.slugPath === doc.slugPath;

                return (
                  <Link key={entry.slugPath} href={href} className={isActive ? "active" : ""}>
                    {entry.title}
                  </Link>
                );
              })}
            </div>
          ))}
        </aside>

        <article className="docs-panel">
          <p className="doc-meta">{SECTION_TITLES[doc.section] ?? doc.section}</p>
          <h1 className="doc-title">{doc.title}</h1>
          <p className="doc-description">{doc.description}</p>
          <div className="md-content">{renderMarkdown(doc.body)}</div>
        </article>
      </section>
    </main>
  );
}
