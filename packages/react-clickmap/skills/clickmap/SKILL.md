---
name: clickmap
description: Integrate, validate, and interpret self-owned React interaction evidence.
---
# Clickmap

Use `react-clickmap` for React capture/rendering, `@react-clickmap/dashboard` for optional Studio, `react-clickmap/contracts` for pure validation/reporting, and `@react-clickmap/next/server` for server handlers. Read installed package README and schema version first.

1. Confirm the project, data source, time range and captured event types.
2. Inspect exact payload fields and application route identifiers; normalize sensitive paths before collection.
3. Validate evidence with `react-clickmap validate --file evidence.json` then `react-clickmap report --file evidence.json`.
4. Treat session counts as observed interactions, scroll reach as session-route-layout maxima, and dead/rage clicks as heuristics. Report sample size, query and completeness. Never invent all-visitor denominators or claim conversion causation.
5. Use named targets and layout/viewport cohorts. Do not overlay another route or revision as if it were the current UI.
6. Keep analytics reads/deletes authorized and server-project scoped. Never expose database credentials or admin tokens in capture code.
7. Produce evidence and a proposed change for human review. Do not publish, charge, delete production data or modify a live app unless explicitly requested.

No external LLM service is required. Use JSON/Markdown evidence with the user's chosen agent. Review exported app-specific paths/selectors before sharing.
