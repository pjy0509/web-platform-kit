![npm](https://img.shields.io/npm/v/web-platform-kit)
![bundle size](https://img.shields.io/bundlephobia/minzip/web-platform-kit)
![types](https://img.shields.io/npm/types/web-platform-kit)

# web-platform-kit

A tiny TypeScript user-agent & platform detector — resolves **OS, browser,
engine, and device** from the UA string, then refines the result with
**User-Agent Client Hints** (high-entropy) when available.

```bash
npm install web-platform-kit
```

## API at a glance

`PlatformKit` is a singleton. All detection fields are getters.

| Member                             | Type | Description |
|------------------------------------| --- | --- |
| `PlatformKit.version`              | `string` | The installed package version |
| `PlatformKit.ready`                | `Promise<void>` | Resolves once async UA Client Hints have merged in |
| `PlatformKit.userAgent`            | `string` (get/set) | Read the active UA string, or set one to parse a custom UA |
| `PlatformKit.os`                   | `{ name, version }` | `name`: `unknown \| windows \| macos \| android \| ios` |
| `PlatformKit.browser`              | `{ name, version }` | `name`: `unknown \| chrome \| safari \| edge \| firefox \| opera \| ie \| samsung` |
| `PlatformKit.engine`               | `{ name, version }` | `name`: `blink \| webKit \| gecko \| presto \| trident \| …` |
| `PlatformKit.device`               | `string` | `unknown \| mobile \| desktop` |
| `PlatformKit.webview`              | `boolean` | Whether running inside a WebView |
| `PlatformKit.node`                 | `boolean` | Whether running under Node.js |
| `PlatformKit.standalone`           | `boolean` | Whether launched as an installed PWA |
| `PlatformKit.compareVersion(a, b)` | `-1 \| 0 \| 1` | Numeric dotted-version comparison (named export) |

> **About `ready`:** on Chromium, the most accurate OS/browser **version** comes
> from User-Agent Client Hints, which resolve asynchronously. Read fields after
> `await PlatformKit.ready` for best accuracy; before it resolves you still get a
> synchronous result parsed from the UA string.

---

## ESM

```js
import PlatformKit from 'web-platform-kit'

// Synchronous (UA-string based) — available immediately
console.log(PlatformKit.os)      // { name: 'ios', version: '17.4' }
console.log(PlatformKit.browser) // { name: 'safari', version: '17.4' }
console.log(PlatformKit.device)  // 'mobile'

// Refined with Client Hints (Chromium) — await first
await PlatformKit.ready
console.log(PlatformKit.os.version) // full platform version on Chromium

// Version gate
if (PlatformKit.compareVersion(PlatformKit.os.version, '15.0') >= 0) {
  // iOS 15+
}
```

## CommonJS

The bundle is built with `exports: "named"`, so the singleton lives under `.default`:

```js
const { default: PlatformKit } = require('web-platform-kit')

console.log(PlatformKit.browser.name, PlatformKit.browser.version)
```

## UMD (browser `<script>`)

The global `PlatformKit` is a namespace object. The singleton is `PlatformKit.default`;
the helper is `PlatformKit.compareVersion`.

```html

<script src="https://unpkg.com/web-platform-kit/dist/platform-kit.umd.min.js"></script>
<script>
    var p = window.PlatformKit.default

    document.body.dataset.os = p.os.name
    document.body.dataset.browser = p.browser.name

    if (p.webview) {
        console.log('running inside a WebView')
    }
</script>
```

## TypeScript

The `{ name, version }` shape is exported as `NameVersionPair<T>`; the singleton
shape is `PlatformKitInstance`. The `os` / `browser` / `engine` / `device` name
unions are exported too (`OS`, `Browsers`, `Engines`, `Devices`).

```ts
import PlatformKit, {
  type OS,
  type NameVersionPair,
} from 'web-platform-kit'

const os: NameVersionPair<OS> = PlatformKit.os

function isModernSafari(): boolean {
  return PlatformKit.browser.name === 'safari'
    && PlatformKit.compareVersion(PlatformKit.browser.version, '16.0') >= 0
}
```

## Parsing a custom UA string

Set `userAgent` to parse an arbitrary string — useful server-side or in tests.
Setting a custom UA parses purely from that string (no Client Hints merge).

```js
import PlatformKit from 'web-platform-kit'

PlatformKit.userAgent = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) ' +
  'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36'

console.log(PlatformKit.os)      // { name: 'android', version: '14' }
console.log(PlatformKit.browser) // { name: 'chrome', version: '124.0' }
```

> **Note:** `userAgent` is shared singleton state — setting it changes detection
> globally for every reader. Restore `PlatformKit.userAgent` if other code relies on
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
