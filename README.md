![npm](https://img.shields.io/npm/v/web-platform)
![bundle size](https://img.shields.io/bundlephobia/minzip/web-platform)
![types](https://img.shields.io/npm/types/web-platform)

# web-platform

A tiny TypeScript user-agent & platform detector — resolves **OS, browser,
engine, and device** from the UA string, then refines the result with
**User-Agent Client Hints** (high-entropy) when available. Ships a typed
`compareVersion` helper and WebView / PWA / Node detection.

```bash
npm install web-platform
```

## API at a glance

`Platform` is a singleton. All detection fields are getters.

| Member | Type | Description |
| --- | --- | --- |
| `Platform.version` | `string` | The installed package version |
| `Platform.ready` | `Promise<void>` | Resolves once async UA Client Hints have merged in |
| `Platform.userAgent` | `string` (get/set) | Read the active UA string, or set one to parse a custom UA |
| `Platform.os` | `{ name, version }` | `name`: `unknown \| windows \| macos \| android \| ios` |
| `Platform.browser` | `{ name, version }` | `name`: `unknown \| chrome \| safari \| edge \| firefox \| opera \| ie \| samsung` |
| `Platform.engine` | `{ name, version }` | `name`: `blink \| webKit \| gecko \| presto \| trident \| …` |
| `Platform.device` | `string` | `unknown \| mobile \| desktop` |
| `Platform.webview` | `boolean` | Whether running inside a WebView |
| `Platform.node` | `boolean` | Whether running under Node.js |
| `Platform.standalone` | `boolean` | Whether launched as an installed PWA |
| `compareVersion(a, b)` | `-1 \| 0 \| 1` | Numeric dotted-version comparison (named export) |

> **About `ready`:** on Chromium, the most accurate OS/browser **version** comes
> from User-Agent Client Hints, which resolve asynchronously. Read fields after
> `await Platform.ready` for best accuracy; before it resolves you still get a
> synchronous result parsed from the UA string.

---

## ESM

```js
import Platform, { compareVersion } from 'web-platform'

// Synchronous (UA-string based) — available immediately
console.log(Platform.os)      // { name: 'ios', version: '17.4' }
console.log(Platform.browser) // { name: 'safari', version: '17.4' }
console.log(Platform.device)  // 'mobile'

// Refined with Client Hints (Chromium) — await first
await Platform.ready
console.log(Platform.os.version) // full platform version on Chromium

// Version gate
if (compareVersion(Platform.os.version, '15.0') >= 0) {
  // iOS 15+
}
```

## CommonJS

The bundle is built with `exports: "named"`, so the singleton lives under `.default`:

```js
const { default: Platform, compareVersion } = require('web-platform')

console.log(Platform.browser.name, Platform.browser.version)
```

## UMD (browser `<script>`)

The global `Platform` is a namespace object. The singleton is `Platform.default`;
the helper is `Platform.compareVersion`.

```html
<script src="https://unpkg.com/web-platform/dist/platform.umd.min.js"></script>
<script>
  var p = window.Platform.default

  document.body.dataset.os = p.os.name
  document.body.dataset.browser = p.browser.name

  if (p.webview) {
    console.log('running inside a WebView')
  }
</script>
```

## TypeScript

The `{ name, version }` shape is exported as `NameVersionPair<T>`; the singleton
shape is `PlatformInstance`. The `os` / `browser` / `engine` / `device` name
unions are exported too (`OS`, `Browsers`, `Engines`, `Devices`).

```ts
import Platform, {
  compareVersion,
  type OS,
  type NameVersionPair,
} from 'web-platform'

const os: NameVersionPair<OS> = Platform.os

function isModernSafari(): boolean {
  return Platform.browser.name === 'safari'
    && compareVersion(Platform.browser.version, '16.0') >= 0
}
```

## Parsing a custom UA string

Set `userAgent` to parse an arbitrary string — useful server-side or in tests.
Setting a custom UA parses purely from that string (no Client Hints merge).

```js
import Platform from 'web-platform'

Platform.userAgent = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) ' +
  'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36'

console.log(Platform.os)      // { name: 'android', version: '14' }
console.log(Platform.browser) // { name: 'chrome', version: '124.0' }
```

> **Note:** `userAgent` is shared singleton state — setting it changes detection
> globally for every reader. Restore `Platform.userAgent` if other code relies on
> the real environment.

---

## Notes

- **Detection is best-effort.** User agents are spoofable and inconsistent across
  vendors; treat the result as a strong hint, not ground truth. Prefer feature
  detection for capability decisions where possible.
- **Client Hints are Chromium-only and async.** Non-Chromium browsers resolve
  `ready` immediately with UA-string parsing; `os.version` granularity is limited
  to what the UA string exposes there.
- **iPadOS reports as desktop.** iPadOS Safari sends a macOS UA; this library
  re-classifies it as `ios` when `navigator.standalone` is present and
  `maxTouchPoints > 2`, but edge cases remain.
- **`.default` in CJS/UMD** is a consequence of keeping both a default and named
  exports. To drop it, switch the entry to fully-named exports and rebuild.
