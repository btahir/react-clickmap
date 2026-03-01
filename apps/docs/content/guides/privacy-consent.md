# Privacy and Consent Guide

## Built-in privacy controls

`ClickmapProvider` supports:

- `respectDoNotTrack`
- `respectGlobalPrivacyControl`
- selector masking via `maskSelectors`
- selector ignore lists via `ignoreSelectors`

## Consent lifecycle

Use:

- `consentRequired={true}`
- `hasConsent={consentState}`

When consent is revoked, capture stops on provider reconfiguration.

Grant/revoke behavior:

- `hasConsent = false`: no new listeners start, no new events captured.
- `hasConsent = true`: capture starts again on provider reconfiguration.
- On stop/unload paths, queued events are drained best-effort.

## Data minimization recommendations

- Keep selector masking enabled for form-like inputs.
- Avoid storing raw PII in payload extensions.
- Scope data by `projectId` and optional `userId`.
