export default function DocsHome() {
  return (
    <main style={{ padding: 32, fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}>
      <h1 style={{ marginBottom: 8 }}>react-clickmap</h1>
      <p style={{ marginTop: 0, maxWidth: 720 }}>
        Privacy-first heatmaps for React. The docs app scaffold is in place and will be expanded
        with live demos and integration guides.
      </p>
      <ul>
        <li>Capture: click, scroll, pointer move, rage-click</li>
        <li>Storage: adapter pattern for self-hosted backends</li>
        <li>Render: WebGL + Canvas fallback</li>
      </ul>
    </main>
  );
}
