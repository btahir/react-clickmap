# @react-clickmap/cli

## Local evidence tools

```sh
npx @react-clickmap/cli --help
react-clickmap serve --project demo --origin http://localhost:3000
react-clickmap validate --file clickmap-evidence.json
react-clickmap report --file clickmap-evidence.json --format markdown
react-clickmap doctor --data .react-clickmap/events.json
react-clickmap prune --data .react-clickmap/events.json --before 2026-01-01
# Inspect the dry-run count, then add --apply to prune.
```

The collector binds to loopback, prints a session token for reads/deletes, and writes atomically. It is not a multi-process production database. CLI reports do not call an AI model. Exported IDs are pseudonymized and query strings/user IDs removed; application paths and target names still need review before sharing. The agent skill is shipped in the core package at `skills/clickmap/SKILL.md`.

## Support this project

[React Maintainer Support](https://react-tourlight.vercel.app/support) helps maintain Tourlight, Kino, Clickmap, and Redact. All features remain MIT licensed; support is optional, with recurring and one-time options.
