# Measurement definitions

Good heatmaps begin with explicit denominators.

| Metric | Definition | Limitation |
| --- | --- | --- |
| Captured records | Number of event records returned by the cohort query | Derived signals can accompany raw clicks |
| Observed sessions | Unique project/session pairs with at least one record | Non-interacting visitors may be absent |
| Dead-click signals | Pointer releases on targets the heuristic considers non-interactive | Custom handlers and intentional clicks can be false positives |
| Rage-click signals | Repeated nearby pointer releases in a short interval | Not verified frustration or a unique failed action |
| Scroll reach | Share of project/session/route/layout maxima reaching a depth threshold | Repeated page visits in one session are combined; non-scrollers absent |
| Mean scroll maximum | Average of those maxima | Not an event-weighted mean or all-visitor engagement metric |
| Dashboard rage/dead event shares | Derived records divided by all click-like records | Not affected-user or conversion rates |
| Attention overlay | A weighted interaction-density heuristic | Not eye tracking or measured attention |

For one observed scrolling session reaching 90% and another reaching 20%, reach at 20% is 100% and at 90% is 50%. Extra scroll records from either session do not change those results.

## Compare compatible data

Filter by page, device, viewport width, and an application-provided layout revision. Old coordinates cannot reliably map onto a redesigned page. A before/after overlay is descriptive, not a randomized experiment. Sampling, partial reads, capture configuration, and privacy opt-outs affect coverage. Exports show the cohort and completeness; never interpret a bounded sample as the full population.

## Migration from 0.3

Scroll bands are now cumulative session-route reach rather than a histogram of event records. Route keys exclude query strings. Generated selectors omit DOM IDs/classes in favor of explicit stable target IDs or structural paths. Historical events remain readable, but do not blend differently collected cohorts without explaining the difference.

Time ranges use `from <= timestamp < to` consistently across adapters and rollups. A range ending at midnight excludes the next day. This corrects the old raw/rollup boundary mismatch.
