# Privacy and Consent Guide

react-clickmap is designed for privacy-first analytics. It collects no PII by default, uses no cookies, does no fingerprinting, and respects browser privacy signals out of the box.

## Built-in privacy controls

### Do Not Track

```tsx
<ClickmapProvider respectDoNotTrack>
```

When enabled, the provider checks `navigator.doNotTrack` on mount. If the value is `"1"` or `"yes"`, no event listeners are started and no events are captured. This respects the user's browser-level privacy preference.

### Global Privacy Control

```tsx
<ClickmapProvider respectGlobalPrivacyControl>
```

When enabled, checks `navigator.globalPrivacyControl`. If `true`, capture is disabled. GPC is a newer standard supported by Firefox, Brave, and DuckDuckGo.

### Both together

```tsx
<ClickmapProvider respectDoNotTrack respectGlobalPrivacyControl>
```

Either signal being active will disable capture.

## Consent management

For applications that require explicit opt-in (e.g., GDPR jurisdictions), use the consent props:

```tsx
function App() {
  const [hasConsent, setHasConsent] = useState(false);

  return (
    <>
      <ConsentBanner onAccept={() => setHasConsent(true)} onReject={() => setHasConsent(false)} />

      <ClickmapProvider
        adapter={adapter}
        consentRequired={true}
        hasConsent={hasConsent}
      >
        <YourApp />
      </ClickmapProvider>
    </>
  );
}
```

### How consent affects capture

| `consentRequired` | `hasConsent` | Behavior |
|---|---|---|
| `false` | — | Capture starts immediately |
| `true` | `undefined` | No capture (waiting for decision) |
| `true` | `false` | No capture |
| `true` | `true` | Capture starts |

When `hasConsent` changes from `true` to `false`:

1. Event listeners are stopped
2. Any events already in the batcher queue are flushed best-effort (so you don't lose data the user already consented to)
3. No new events are captured

When `hasConsent` changes from `false` to `true`:

1. Event listeners are started
2. Capture resumes normally

## Sampling

```tsx
<ClickmapProvider sampleRate={0.25}>
```

Only 25% of sessions will have events captured. The decision is deterministic per session — a hash of the session ID is compared against the sample rate, so the same session always gets the same decision. This means:

- No "flickering" behavior within a session
- Consistent capture across page reloads (same tab)
- Predictable data volumes

## Selector masking

Mask sensitive elements so their selectors are not included in events:

```tsx
<ClickmapProvider
  maskSelectors={[".pii-field", "[data-sensitive]", "input[type=password]"]}
>
```

When a click lands on a masked element, the event's `selector` field is replaced with a generic placeholder. The `x`/`y` coordinates are still captured (they're viewport percentages, not tied to element identity).

## Selector ignoring

Completely exclude elements from capture:

```tsx
<ClickmapProvider
  ignoreSelectors={[".clickmap-ignore", "[data-no-track]"]}
>
```

Clicks on ignored elements produce no events at all.

## What react-clickmap does NOT collect

- No cookies are set or read
- No browser fingerprinting (canvas fingerprint, WebGL fingerprint, etc.)
- No IP addresses (your server might log these, but react-clickmap doesn't)
- No form values or input content
- No personal identifiers (unless you explicitly set `userId`)
- No third-party requests (all data goes to your own endpoint)

## Data minimization recommendations

1. **Enable selector masking** for form inputs, password fields, and PII-related elements
2. **Avoid passing PII** as `userId` — use an opaque identifier instead
3. **Scope by `projectId`** to keep data separated across apps or environments
4. **Set data retention** at the database layer — see the [Persistence Guide](persistence.md) for retention recommendations
5. **Implement `deleteEvents`** in your adapter for GDPR right-to-erasure requests

## GDPR / CCPA compliance checklist

- [ ] Enable `respectDoNotTrack` and/or `respectGlobalPrivacyControl`
- [ ] Use `consentRequired` + `hasConsent` if you need explicit opt-in
- [ ] Set `sampleRate` to reduce data volume
- [ ] Enable `maskSelectors` for sensitive form fields
- [ ] Use opaque identifiers for `userId`
- [ ] Implement `deleteEvents()` in your adapter for right-to-erasure
- [ ] Set up database-level data retention (30–90 day recommended)
- [ ] Document your data processing in your privacy policy
