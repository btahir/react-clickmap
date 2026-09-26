# Privacy and capture controls

Clickmap avoids cookies and fingerprinting. It still handles interaction data and pseudonymous session identifiers; safe configuration and legal compliance depend on your application and deployment.

## Consent and browser signals

```tsx
<ClickmapProvider adapter={adapter} projectId="my-app"
  consentRequired hasConsent={consent}
  respectDoNotTrack respectGlobalPrivacyControl>
  <YourApp />
</ClickmapProvider>
```

DNT and GPC are respected by default. If either is active, capture does not start. `consentRequired` defaults to false; explicitly set it where your application requires an opt-in. Revoking consent stops further capture. Already collected data remains in the adapter until your retention/deletion policy removes it. A session ID is stored in sessionStorage; this is not a claim of completely storage-free analytics.

## What events contain

Event ID, project ID, pseudonymous session ID, optional application user ID, timestamp, pathname/route, device class, viewport dimensions/scroll position and event-specific coordinates or depth. Optional selectors and layout IDs describe the application. No input values or DOM snapshots are captured by the core.

Query strings are excluded by default. Paths themselves can contain identifiers: normalize them before capture.

```tsx
<ClickmapProvider
  adapter={adapter}
  normalizeRoute={path => path.replace(/\/customers\/[^/]+/, '/customers/:id')}
  beforeCapture={event => event.pathname.startsWith('/billing') ? null : event}
>
  <YourApp />
</ClickmapProvider>
```

Keep these callback identities stable where practical. They execute before the event reaches batching or transport.

## Exclude and mask

`data-clickmap-ignore` excludes a subtree from pointer/click capture. Studio uses its own ignored marker. Global page scroll is still observed if scroll capture is enabled.

Default selector masking covers inputs, textareas and contenteditable elements. Additional `maskSelectors` extend those defaults. A masked click's selector is omitted; coordinates and route metadata remain. Use `ignoreSelectors` when the event itself should not be recorded. Deliberate `data-clickmap-id="start-project"` labels are preferable to arbitrary DOM IDs/classes; generated selectors no longer copy those attributes.

## Storage and access

Never expose admin read/delete access or database service keys to capture clients. Enforce project identity and authorization on the server. DNT, GPC, masking, sampling and self-hosting are controls—not a legal certification or a guarantee that consent is unnecessary.

## Sharing evidence

Exports omit user IDs/query strings and replace session/event identifiers with local aliases. Application-provided paths and target names may still contain sensitive information; review before sharing. Imported evidence stays in the browser and is never written back to your adapter. Local CLI reports use no hosted AI service.
