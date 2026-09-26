import Link from "next/link";
import { InspectionDemo } from "../components/inspection-demo";
export default function Home() {
  return (
    <main>
      <nav className="site-nav">
        <Link href="/" className="wordmark">
          <span aria-hidden>◉</span> clickmap<span className="wordmark-tag">for React</span>
        </Link>
        <div>
          <Link href="/docs/getting-started">Docs</Link>
          <a href="https://github.com/btahir/react-clickmap">GitHub ↗</a>
          <a href="#inspect" className="nav-cta">
            Try the inspector
          </a>
        </div>
      </nav>
      <header className="hero">
        <p className="kicker">OPEN SOURCE · SELF-OWNED BEHAVIOR ANALYTICS</p>
        <h1>
          Find the friction.
          <br />
          <em>Keep the evidence.</em>
        </h1>
        <p className="hero-copy">
          A small React collector. A thoughtful inspection desk.
          <br />
          Understand where people get stuck, with data that stays in your database.
        </p>
        <div className="hero-actions">
          <a className="primary" href="#inspect">
            Open the live demo <span aria-hidden>↘</span>
          </a>
          <Link href="/docs/getting-started">Add to your app →</Link>
        </div>
        <div className="install">
          <code>npm install react-clickmap @react-clickmap/dashboard</code>
          <span>MIT licensed. No required vendor backend.</span>
        </div>
      </header>
      <div className="trust-line">
        <span>React 18 + 19</span>
        <span>Next.js App Router</span>
        <span>Your Postgres</span>
        <span>Portable evidence</span>
      </div>
      <div id="inspect">
        <InspectionDemo />
      </div>
      <section className="workflow">
        <div>
          <p className="kicker">ONE COMPLETE WORKFLOW</p>
          <h2>
            Not another dashboard
            <br />
            you forget to open.
          </h2>
          <p>
            Inspect the interface where it lives. Give your designer, developer, and coding agent
            the same bounded evidence.
          </p>
        </div>
        <ol>
          <li>
            <span>01</span>
            <div>
              <h3>Connect your app</h3>
              <p>
                Add a provider and an adapter. Preview exactly what gets collected and verify your
                first event.
              </p>
            </div>
          </li>
          <li>
            <span>02</span>
            <div>
              <h3>Ask a narrower question</h3>
              <p>
                Choose a page, device, and layout revision. Inspect stable element targets and
                scroll reach with explicit denominators.
              </p>
            </div>
          </li>
          <li>
            <span>03</span>
            <div>
              <h3>Take the evidence with you</h3>
              <p>
                Export JSON, Markdown, CSV, or an overlay image. Run local reports from your
                terminal. No model subscription required.
              </p>
            </div>
          </li>
        </ol>
      </section>
      <section className="ownership">
        <div>
          <p className="kicker">SMALL BY DESIGN</p>
          <h2>
            Your app.
            <br />
            Your boundaries.
          </h2>
          <p>
            The collector, Studio, and server tools are separate. Use an in-memory demo, your own
            endpoint, or a database adapter. Authentication and retention stay under your control.
          </p>
          <Link href="/docs/guides/studio">Explore the architecture →</Link>
        </div>
        <pre>
          <code>{`<ClickmapProvider\n  adapter={yourAdapter}\n  projectId="your-app"\n  layoutId="pricing-v2"\n  consentRequired\n  hasConsent={consent}\n>\n  <YourApp />\n</ClickmapProvider>\n\n// Behind your admin authorization:\n<ClickmapStudio\n  adapter={authorizedAdapter}\n  projectId="your-app"\n/>`}</code>
        </pre>
      </section>
      <section className="honesty">
        <h2>Useful signals. Honest limits.</h2>
        <p>
          A heatmap is a clue, not a conclusion. Clickmap labels observed sessions, heuristic
          frustration signals, and incomplete samples. No cookie-free compliance promises. No “AI
          increased conversions” claims. Just tools you can inspect, understand, and improve.
        </p>
        <Link href="/docs/guides/measurement">Read the measurement guide →</Link>
      </section>
      <footer className="site-footer">
        <span className="wordmark">◉ clickmap</span>
        <p>
          Free to use. Yours to improve. MIT licensed. Shared support funds maintenance of
          Tourlight, Kino, Clickmap, and Redact.
        </p>
        <div>
          <a href="https://react-tourlight.vercel.app/support">Support this project</a>
          <Link href="/docs">Documentation</Link>
          <a href="https://github.com/btahir/react-clickmap">Source ↗</a>
          <a href="https://www.npmjs.com/package/react-clickmap">npm ↗</a>
        </div>
      </footer>
    </main>
  );
}
