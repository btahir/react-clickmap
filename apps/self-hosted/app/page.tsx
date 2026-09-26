"use client";
import { ClickmapStudio } from "@react-clickmap/dashboard";
import { useMemo, useState } from "react";
import { ClickmapProvider, fetchAdapter } from "react-clickmap";

const captureAdapter = fetchAdapter({ endpoint: "/api/clickmap" });
export default function Workspace() {
  const [consent, setConsent] = useState(false);
  const [token, setToken] = useState("");
  const [input, setInput] = useState("");
  const [message, setMessage] = useState("");
  const admin = useMemo(
    () =>
      fetchAdapter({ endpoint: "/api/clickmap", headers: { Authorization: `Bearer ${token}` } }),
    [token],
  );
  return (
    <ClickmapProvider
      adapter={captureAdapter}
      projectId="self-hosted"
      layoutId="example-v1"
      consentRequired
      hasConsent={consent}
      capture={["click", "scroll", "dead-click", "rage-click"]}
    >
      <main style={{ maxWidth: 1200, margin: "auto" }}>
        <p>CLICKMAP / YOUR DATABASE</p>
        <h1>A complete local inspection loop.</h1>
        <p>
          This app collects only after you explicitly enable it. DNT/GPC remain respected. Data is
          stored in your Postgres instance.
        </p>
        <label data-clickmap-ignore="">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />{" "}
          Enable collection on this example
        </label>
        <section style={{ padding: "45px 0" }}>
          <h2>Your sample application</h2>
          <button
            type="button"
            data-clickmap-id="create-note"
            onClick={() => setMessage("Note created")}
          >
            Create a note
          </button>
          <output>{message}</output>
          <p data-clickmap-id="disabled-feature">This plain text has no click action.</p>
        </section>
        <section data-clickmap-ignore="">
          <h2>Administrator inspection</h2>
          <p>
            The token stays in memory and is sent only to this app's API. Do not give it to ordinary
            visitors.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setToken(input);
              setInput("");
            }}
          >
            <label>
              Administrator token{" "}
              <input
                type="password"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                autoComplete="off"
              />
            </label>
            <button type="submit">Open inspector</button>
          </form>
          {token ? (
            <>
              <button type="button" onClick={() => setToken("")}>
                Close inspector and forget token
              </button>
              <ClickmapStudio adapter={admin} projectId="self-hosted" layoutId="example-v1" />
            </>
          ) : null}
        </section>
      </main>
    </ClickmapProvider>
  );
}
