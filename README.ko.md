![npm](https://img.shields.io/npm/v/web-platform-kit)
![bundle size](https://img.shields.io/bundlephobia/minzip/web-platform-kit)
![types](https://img.shields.io/npm/types/web-platform-kit)

*[English](./README.md) · 한국어*

# web-platform-kit

작은 TypeScript User-Agent·플랫폼 감지기 — UA 문자열에서 **OS, 브라우저, 엔진, 디바이스**를
해석하고, 가능하면 **User-Agent Client Hints**(고엔트로피)로 결과를 보정합니다.

```bash
npm install web-platform-kit
```

## API 한눈에 보기

`PlatformKit`은 싱글톤입니다. 감지 관련 필드는 모두 getter입니다.

| 멤버 | 타입 | 설명 |
|---| --- | --- |
| `PlatformKit.version` | `string` | 설치된 패키지 버전 |
| `PlatformKit.ready` | `Promise<void>` | 비동기 UA Client Hints 병합이 끝나면 resolve |
| `PlatformKit.whenReady(cb)` | `void` | `ready`의 콜백 형태. `Promise`가 없는 엔진용 |
| `PlatformKit.userAgent` | `string` (get/set) | 현재 UA 문자열을 읽거나, 임의 UA를 넣어 파싱 |
| `PlatformKit.reset()` | `void` | `userAgent` 오버라이드를 버리고 실제 환경으로 복구 |
| `PlatformKit.os` | `{ name, version }` | `name`: `unknown \| windows \| macos \| android \| ios` |
| `PlatformKit.browser` | `{ name, version }` | `name`: `unknown \| chrome \| safari \| edge \| firefox \| opera \| ie \| samsung` |
| `PlatformKit.engine` | `{ name, version }` | `name`: `blink \| webKit \| gecko \| presto \| trident \| …` |
| `PlatformKit.device` | `string` | `unknown \| mobile \| tablet \| desktop` |
| `PlatformKit.webview` | `boolean` | 임베디드 웹뷰 안에서 실행 중인지 |
| `PlatformKit.inAppBrowser` | `string \| null` | 어떤 인앱 브라우저가 페이지를 띄웠는지, 아니면 `null` |
| `PlatformKit.node` | `boolean` | Node.js에서 실행 중인지 |
| `PlatformKit.standalone` | `boolean` | 설치된 PWA로 실행됐는지 |
| `PlatformKit.compareVersion(a, b)` | `-1 \| 0 \| 1` | 점으로 구분된 버전의 숫자 비교 |

> **`ready`에 대하여:** Chromium에서 가장 정확한 OS/브라우저 **버전**은 User-Agent Client
> Hints에서 오고, 이 값은 비동기로 확정됩니다. 정확도가 중요하면 `await PlatformKit.ready`
> 이후에 읽으세요. 그 전에도 UA 문자열로 파싱한 결과를 동기적으로 받을 수 있습니다.

> **`ready` vs `whenReady`:** 기본은 `ready`입니다. `Promise`가 없는 엔진(IE, 구형 WebKit)에서
> `ready`는 `.then()` / `.catch()` / `.finally()`만 지원하는 대체 thenable을 내주며 `await`할 수
> 없습니다. 그 환경에서는 `whenReady(cb)`를 쓰세요. Client Hints는 Chromium 전용이라 그런
> 엔진에는 기다릴 것이 없고, 콜백은 동기적으로 실행됩니다.

---

## ESM

```js
import PlatformKit from 'web-platform-kit'

// 동기 (UA 문자열 기반) — 즉시 사용 가능
console.log(PlatformKit.os)      // { name: 'ios', version: '17.4' }
console.log(PlatformKit.browser) // { name: 'safari', version: '17.4' }
console.log(PlatformKit.device)  // 'mobile'

// Client Hints 로 보정 (Chromium) — 먼저 await
await PlatformKit.ready
console.log(PlatformKit.os.version) // Chromium 에서는 완전한 플랫폼 버전

// 콜백 형태 — Promise 가 없는 엔진에서도 동작
PlatformKit.whenReady(function () {
  console.log(PlatformKit.os.version)
})

// 버전 게이트
if (PlatformKit.compareVersion(PlatformKit.os.version, '15.0') >= 0) {
  // iOS 15+
}
```

## CommonJS

번들이 `exports: "named"`로 빌드되어 싱글톤은 `.default` 아래에 있습니다.

```js
const { default: PlatformKit } = require('web-platform-kit')

console.log(PlatformKit.browser.name, PlatformKit.browser.version)
```

## UMD (브라우저 `<script>`)

전역 `PlatformKit`은 네임스페이스 객체이고 싱글톤은 `PlatformKit.default`입니다.
`compareVersion`은 싱글톤의 메서드이지 별도의 네임스페이스 멤버가 아닙니다.

```html

<script src="https://unpkg.com/web-platform-kit/dist/platform-kit.umd.min.js"></script>
<script>
    var p = window.PlatformKit.default

    document.body.setAttribute('data-os', p.os.name)
    document.body.setAttribute('data-browser', p.browser.name)

    if (p.webview) {
        console.log('웹뷰 안에서 실행 중')
    }

    p.whenReady(function () {
        console.log(p.os.version)
    })
</script>
```

## TypeScript

`{ name, version }` 형태는 `NameVersionPair<T>`로, 싱글톤의 형태는 `PlatformKitInstance`로
export됩니다. `os` / `browser` / `engine` / `device`의 이름 유니온도 함께 나갑니다
(`OS`, `Browsers`, `Engines`, `Devices`).

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

## 임의의 UA 문자열 파싱

`userAgent`에 값을 넣으면 그 문자열을 파싱합니다. 서버 사이드나 테스트에서 유용합니다.
커스텀 UA를 넣으면 순수하게 그 문자열만으로 파싱합니다(Client Hints 병합 없음).

```js
import PlatformKit from 'web-platform-kit'

PlatformKit.userAgent = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) ' +
  'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36'

console.log(PlatformKit.os)      // { name: 'android', version: '14' }
console.log(PlatformKit.browser) // { name: 'chrome', version: '124.0' }
```

```js
PlatformKit.reset()  // 실제 환경으로 복구
```

> **주의:** `userAgent`는 공유 싱글톤 상태입니다 — 설정하면 모든 읽기에 전역으로 적용됩니다.
> 다른 코드가 실제 환경에 의존한다면 `reset()`을 호출하세요. Client Hints는 실제 UA에 대해서만
> 병합되므로, 커스텀 UA에서는 `ready`가 즉시 resolve됩니다.

## 인앱 브라우저

메신저·소셜 앱은 페이지를 자체 임베디드 브라우저로 띄우며, 그 안에서는 파일 업로드,
다운로드, `window.open`이 플랫폼 브라우저와 다르게 동작하는 일이 흔합니다. 인앱 안에 있다는
사실은 `webview`가, **어느 앱인지는** `inAppBrowser`가 알려줍니다.

```js
PlatformKit.webview       // true
PlatformKit.inAppBrowser  // 'kakaotalk' | 'line' | 'instagram' | 'facebook' | 'naver'
                          // | 'daum' | 'band' | 'wechat' | 'twitter' | 'tiktok' | null
```

iOS에서 이런 호스트들은 UA에 `Safari` 토큰을 아예 넣지 않습니다. 그래서 `browser`는 버전이 빈
`safari`로 보고됩니다 — 엔진은 Safari가 맞지만 사용자 앞에 있는 앱은 아닙니다. 호스트 자체로
분기해야 한다면 `inAppBrowser`를 보세요.

`webview` 판정은 명시적 시그널만 씁니다. 안드로이드의 `wv` 토큰, 레거시
`Version/x Chrome/y` 조합, `Electron/` 토큰, `Safari` 토큰이 없는 iOS UA, 그리고 인식된 인앱
브라우저입니다.

---

## 참고

- **감지는 최선의 추정입니다.** User agent는 위조할 수 있고 벤더마다 제각각입니다. 강한 힌트로
  다루되 확정된 사실로 보지 마세요. 기능 분기는 가능하면 feature detection을 쓰세요.
- **Client Hints는 Chromium 전용이고 비동기입니다.** Chromium이 아닌 브라우저에서는 `ready`가
  즉시 resolve되며, `os.version`의 정밀도는 UA 문자열이 노출하는 수준까지입니다.
- **iPadOS는 데스크톱으로 보고됩니다.** iPadOS Safari는 macOS UA를 보냅니다. 이 라이브러리는
  `navigator.standalone`이 있고 `maxTouchPoints > 2`이면 `ios`로 재분류하지만, 예외는 남습니다.
- **`device`는 Client Hints의 `formFactors`를 우선합니다.** 없으면 iOS는 `iPad` 표식으로,
  안드로이드는 태블릿에 없는 `Mobile` 토큰의 유무로 가릅니다. `mobile: false`만으로는 태블릿과
  데스크톱을 구분할 수 없어 데스크톱으로 단정하지 않습니다.
- **CJS/UMD의 `.default`** 는 default와 named export를 함께 유지한 결과입니다. 없애려면 엔트리를
  전부 named export로 바꾸고 다시 빌드하세요.

## 브라우저 지원

**IE 9**까지 동작합니다.
