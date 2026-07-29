import packageJSON from "./package.json" with {type: 'json'};

declare const global: unknown;

interface NavigatorLike {
    userAgent?: string;
    userAgentData?: UserAgentData;
    standalone?: boolean;
    maxTouchPoints?: number;
}

interface NodeProcessVersionsLike {
    node?: string;
}

interface NodeProcessLike {
    versions?: NodeProcessVersionsLike;
}

interface MediaQueryListLike {
    matches: boolean;
}

interface GlobalLike {
    navigator?: NavigatorLike;
    process?: NodeProcessLike;

    matchMedia?(query: string): MediaQueryListLike;
}

/**
 * User-agent & platform detector for the current environment.
 *
 * Resolves OS, browser, engine, and device from the UA string, then refines the
 * result with User-Agent Client Hints (high-entropy) where available. Also exposes
 * WebView / PWA / Node detection and a version-comparison helper.
 *
 * @remarks
 * Detection is best-effort — user agents are spoofable and inconsistent across
 * vendors. On Chromium, the most accurate versions come from Client Hints, which
 * resolve asynchronously; await {@link PlatformKitInstance.ready} before reading
 * for best accuracy. State is shared: setting {@link PlatformKitInstance.userAgent}
 * changes detection globally for every reader.
 *
 * @example
 * ```ts
 * await PlatformKit.ready;
 * if (PlatformKit.os.name === 'ios' && PlatformKit.compareVersion(PlatformKit.os.version, '15.0') >= 0) {
 *   // iOS 15+
 * }
 * ```
 */
export interface PlatformKitInstance {
    /**
     * The installed package version.
     */
    readonly version: string;

    /**
     * Resolves once the asynchronous User-Agent Client Hints have merged in.
     *
     * @remarks
     * Before this settles, `os` / `browser` / `engine` return values parsed from the
     * UA string alone. On non-Chromium browsers it resolves immediately, since Client
     * Hints are unavailable there. Re-created whenever `userAgent` is set.
     */
    get ready(): Promise<void>;

    /**
     * Callback form of {@link PlatformKitInstance.ready}.
     *
     * @param callback - Invoked once Client Hints have merged in.
     *
     * @remarks
     * Prefer `ready` on modern engines. This exists for environments without `Promise`
     * (IE, old WebKit), where `ready` hands out a `then`-able stand-in that cannot be
     * `await`ed. There the callback runs synchronously, since there is nothing to wait for.
     */
    whenReady(callback: () => void): void;

    /**
     * Overrides the UA string to parse an arbitrary user agent.
     *
     * @param userAgent - The UA string to parse from.
     *
     * @remarks
     * This is shared singleton state — the override changes detection for every reader,
     * not just the next call. Parsing a custom UA is purely string-based (no Client
     * Hints merge). Restore the original if other code relies on the real environment.
     */
    set userAgent(userAgent: string);

    /**
     * Restores detection to the real environment's user agent.
     *
     * @remarks
     * Undoes a {@link PlatformKitInstance.userAgent} override and re-runs the Client Hints
     * merge. A no-op when no override is active.
     */
    reset(): void;

    /**
     * The UA string currently used for detection (the real environment's, or an override).
     */
    get userAgent(): string;

    /**
     * The detected operating system as a `{ name, version }` pair.
     *
     * @remarks
     * `name` is one of `'windows'`, `'macos'`, `'android'`, `'ios'`, or `'unknown'`.
     * iPadOS reporting a desktop UA is re-classified to `'ios'` when standalone with
     * `maxTouchPoints > 2`.
     */
    get os(): NameVersionPair<OS>;

    /**
     * The detected browser as a `{ name, version }` pair.
     *
     * @remarks
     * `name` is one of `'chrome'`, `'safari'`, `'edge'`, `'firefox'`, `'opera'`,
     * `'ie'`, `'samsung'`, or `'unknown'`.
     */
    get browser(): NameVersionPair<Browsers>;

    /**
     * The detected rendering engine as a `{ name, version }` pair.
     *
     * @remarks
     * `name` covers `'blink'`, `'webKit'`, `'gecko'`, `'presto'`, `'trident'`,
     * `'edgeHtml'`, `'arkWeb'`, and others, or `'unknown'`.
     */
    get engine(): NameVersionPair<Engines>;

    /**
     * The device form factor: `'mobile'`, `'tablet'`, `'desktop'`, or `'unknown'`.
     *
     * @remarks
     * Prefers the Client Hints `formFactors` signal when the real UA is active. Otherwise
     * iOS is split by the `iPad` marker and Android by the presence of the `Mobile` token,
     * which tablets omit. `mobile: false` on its own is not treated as desktop, since it
     * cannot distinguish a tablet from one.
     */
    get device(): Devices;

    /**
     * Whether the current context appears to be an embedded web view.
     *
     * @remarks
     * Detected from explicit host signals: the Android `wv` token, the legacy
     * `Version/x Chrome/y` pairing, an `Electron/` token, an iOS UA carrying no `Safari`
     * token, or any recognised {@link PlatformKitInstance.inAppBrowser}.
     */
    get webview(): boolean;

    /**
     * Which in-app browser is hosting the page, or `null` when it is not one.
     *
     * @remarks
     * These are the messenger and social apps that render pages in their own embedded
     * browser, where features such as file upload, downloads and `window.open` routinely
     * behave differently from the platform browser. On iOS such hosts omit the `Safari`
     * token, so {@link PlatformKitInstance.browser} reports `'safari'` with no version —
     * this property tells you which app is actually in front of the user.
     */
    get inAppBrowser(): InAppBrowsers | null;

    /**
     * Whether the code is running under Node.js.
     */
    get node(): boolean;

    /**
     * Whether the page is running as an installed PWA (standalone display mode).
     *
     * @remarks
     * On iOS this reads `navigator.standalone`; elsewhere it checks the
     * `(display-mode: standalone)` media query.
     */
    get standalone(): boolean;

    /**
     * Compares two dotted version strings numerically.
     *
     * @param lhs - The left-hand version (e.g. `'17.4'`).
     * @param rhs - The right-hand version (e.g. `'15.0'`).
     * @returns `1` if `lhs > rhs`, `-1` if `lhs < rhs`, `0` if equal.
     *
     * @remarks
     * Compares segment by segment as integers, treating missing segments as `0`
     * (so `'15'` equals `'15.0'`). Intended for numeric versions; Windows label
     * strings such as `'XP'` or `'Vista'` are not numeric and will not compare
     * meaningfully — compare within a single OS's numeric versions.
     */
    compareVersion(lhs: string, rhs: string): -1 | 0 | 1;
}

type UserAgentDataBrand = | ModernUserAgentDataBrand | string | null | undefined;
export type OS = 'unknown' | 'windows' | 'macos' | 'android' | 'ios';
export type Browsers = 'unknown' | 'chrome' | 'safari' | 'edge' | 'firefox' | 'opera' | 'ie' | 'samsung';
export type Engines = 'unknown' | 'edgeHtml' | 'arkWeb' | 'blink' | 'presto' | 'webKit' | 'trident' | 'netFront' | 'khtml' | 'tasman' | 'gecko';
export type Devices = 'unknown' | 'mobile' | 'tablet' | 'desktop';
export type InAppBrowsers = 'kakaotalk' | 'line' | 'instagram' | 'facebook' | 'naver' | 'daum' | 'band' | 'wechat' | 'twitter' | 'tiktok';
type VersionResolver = undefined | string | ((value: string | undefined) => string);

interface ModernUserAgentDataBrand {
    brand: string;
    version: string;
}

interface UserAgentDataValues {
    brands?: UserAgentDataBrand[];
    fullVersionList?: UserAgentDataBrand[];
    platformVersion?: string | null | undefined;
    platform?: string | null | undefined;
    formFactors?: string[] | null | undefined;
    mobile?: boolean;
}

interface UserAgentData {
    getHighEntropyValues?(hints: string[]): Promise<UserAgentDataValues>;
}

interface ParsedCache {
    userAgent: string;
    os: NameVersionPair<OS>;
    browser: NameVersionPair<Browsers>;
    engine: NameVersionPair<Engines>;
}

export interface NameVersionPair<T> {
    readonly name: T;
    readonly version: string;
}

function getGlobal(): GlobalLike {
    if (typeof globalThis !== 'undefined') return globalThis as GlobalLike;
    if (typeof self !== 'undefined') return self as GlobalLike;
    if (typeof window !== 'undefined') return window as GlobalLike;
    if (typeof global !== 'undefined') return global as GlobalLike;

    return {};
}

const GLOBAL: GlobalLike = getGlobal();
const NAVIGATOR: NavigatorLike | undefined = GLOBAL.navigator;
const USER_AGENT: string = typeof NAVIGATOR !== 'undefined' && NAVIGATOR !== null && typeof NAVIGATOR.userAgent === 'string' ? NAVIGATOR.userAgent : '';
const USER_AGENT_DATA: UserAgentData | undefined = typeof NAVIGATOR !== 'undefined' && NAVIGATOR !== null ? NAVIGATOR.userAgentData : undefined;

const OS_RESOLVER_MAP: [RegExp, OS, VersionResolver?][] = [
    // Windows RT
    [/windows nt (6\.[23]); arm/i, 'windows', 'RT'],
    // Windows IoT/Mobile/Phone
    [/windows (?:phone|mobile|iot)(?: os)?[\/ ]?([\d.]*( se)?)/i, 'windows'],
    // Windows ME identifies itself as "Windows 98; Win 9x 4.90", so it must be checked
    // before the label pattern below claims the `98`
    [/win 9x 4\.90/i, 'windows', 'ME'],
    // Windows NT/3.1/95/98/ME/2000/XP/Vista/7/8/8.1/10/11
    [/windows[\/ ](1[01]|2000|3\.1|7|8(\.1)?|9[58]|me|server 20\d\d( r2)?|vista|xp)/i, 'windows'],
    [/windows nt ?([\d.)]*)(?!.+xbox)/i, 'windows', resolveWindowsVersion],
    [/\bwin(?=3| ?9|n)(?:nt| 9x )?([\d.;]*)/i, 'windows', resolveWindowsVersion],
    // Windows CE
    [/windows ce\/?([\d.]*)/i, 'windows'],

    // iOS
    [/[adehimnop]{4,7}\b(?:.*os (\w+) like mac|; opera)/i, 'ios', resolveUnderscoreVersion],
    [/(?:ios;fbsv|ios(?=.+ip(?:ad|hone))|ip(?:ad|hone)(?: |.+i(?:pad)?)os)[\/ ]([\w.]+)/i, 'ios', resolveUnderscoreVersion],
    [/cfnetwork\/.+darwin/i, 'ios', resolveUnderscoreVersion],

    // MacOS
    [/mac os x ?([\w. ]*)/i, 'macos', resolveUnderscoreVersion],
    [/(?:macintosh|mac_powerpc\b)(?!.+(haiku|morphos))/i, 'macos', resolveUnderscoreVersion],

    // Android-x86
    [/droid ([\w.]+)\b.+(android[- ]x86)/i, 'android'],
    // Android
    [/android\w*[-\/.; ]?([\d.]*)/i, 'android'],
];

const BROWSER_RESOLVER_MAP: [RegExp, Browsers, VersionResolver?][] = [
    // Chrome Mobile
    [/\b(?:crmo|crios)\/([\w.]+)/i, 'chrome'],

    // Microsoft Edge WebView
    [/webview.+edge\/([\w.]+)/i, 'edge'],
    // Microsoft Edge
    [/edg(?:e|ios|a)?\/([\w.]+)/i, 'edge'],

    // Opera Mini
    [/opera mini\/([-\w.]+)/i, 'opera'],
    // Opera Mobile/Tablet
    [/opera [mobileta]{3,6}\b.+version\/([-\w.]+)/i, 'opera'],
    // Opera
    [/opera(?:.+version\/|[\/ ]+)([\w.]+)/i, 'opera'],
    // Opera Mini (iOS ≥ 8.0)
    [/opios[\/ ]+([\w.]+)/i, 'opera'],
    // Opera GX
    [/\bop(?:rg)?x\/([\w.]+)/i, 'opera'],
    // Opera Webkit
    [/\bopr\/([\w.]+)/i, 'opera'],

    // Internet Explorer Mobile
    [/iemobile(?:browser|boat|jet)[\/ ]?([\d.]*)/i, 'ie'],
    // Internet Explorer
    [/(?:ms|\()ie ([\w.]+)/i, 'ie'],
    // Internet Explorer 11
    [/trident.+rv[: ]([\w.]{1,9})\b.+like gecko/i, 'ie'],

    // Firefox Focus
    [/\bfocus\/([\w.]+)/i, 'firefox'],

    // Opera Touch
    [/\bopt\/([\w.]+)/i, 'opera'],
    // Opera Coast
    [/coast\/([\w.]+)/i, 'opera'],

    // Firefox (iOS)
    [/fxios\/([\w.-]+)/i, 'firefox'],

    // Samsung Internet
    [/samsungbrowser\/([\w.]+)/i, 'samsung'],

    // Chrome Headless
    [/headlesschrome(?:\/([\w.]+)| )/i, 'chrome'],

    // Edge WebView
    [/wv\).+chrome\/([\w.]+).+edgw\//i, 'edge'],

    // Chrome WebView
    [/ wv\).+chrome\/([\w.]+)/i, 'chrome'],
    // Chrome Mobile
    [/chrome\/([\w.]+) mobile/i, 'chrome'],
    // Chrome
    [/chrome\/v?([\w.]+)/i, 'chrome'],

    // Safari Mobile
    [/version\/([\w.,]+) .*mobile(?:\/\w+ | ?)safari/i, 'safari'],
    // Safari
    [/iphone .*mobile(?:\/\w+ | ?)safari/i, 'safari'],
    [/version\/([\w.,]+) .*safari/i, 'safari'],
    // Safari (< 3.0)
    [/webkit.+?(?:mobile ?safari|safari)(\/[\w.]+)/i, 'safari', '1'],

    // iOS in-app WKWebView
    [/(?:iphone|ipad|ipod).+applewebkit(?!.*safari)/i, 'safari'],

    // Firefox Mobile
    [/(?:mobile|tablet);.*firefox\/([\w.-]+)/i, 'firefox'],
    // Firefox Reality
    [/mobile vr; rv:([\w.]+)\).+firefox/i, 'firefox'],
    // Firefox
    [/firefox\/([\w.]+)/i, 'firefox'],
];

const ENGINE_RESOLVER_MAP: [RegExp, Engines, VersionResolver?][] = [
    // EdgeHTML
    [/windows.+ edge\/([\w.]+)/i, 'edgeHtml'],
    // ArkWeb
    [/arkweb\/([\w.]+)/i, 'arkWeb'],
    // Blink
    [/webkit\/537\.36.+chrome\/(?!27)([\w.]+)/i, 'blink'],
    // Presto
    [/presto\/([\w.]+)/i, 'presto'],
    // WebKit
    [/webkit\/([\w.]+)/i, 'webKit'],
    // Trident
    [/trident\/([\w.]+)/i, 'trident'],
    // NetFront
    [/netfront\/([\w.]+)/i, 'netFront'],
    // KHTML
    [/khtml[\/ ]\(?([\w.]+)/i, 'khtml'],
    // Tasman
    [/tasman[\/ ]\(?([\w.]+)/i, 'tasman'],
    // Gecko
    [/rv:([\w.]{1,9})\b.+gecko/i, 'gecko']
];

const IN_APP_BROWSER_RESOLVER_MAP: [RegExp, InAppBrowsers][] = [
    [/kakaotalk/i, 'kakaotalk'],
    [/\bline\/[\d.]/i, 'line'],
    [/instagram/i, 'instagram'],
    [/\bfban\/|\bfbav\/|fb_iab/i, 'facebook'],
    [/naver\(inapp/i, 'naver'],
    [/daumapps/i, 'daum'],
    [/\bband\/[\d.]/i, 'band'],
    [/micromessenger/i, 'wechat'],
    [/twitter for|twitterandroid/i, 'twitter'],
    [/musical_ly|bytedancewebview|\btiktok/i, 'tiktok'],
];

const HIGH_ENTROPY_BRAND_NAME_MAP: Record<string, string> = {
    'Google Chrome': 'Chrome',
    'Microsoft Edge': 'Edge',
    'Microsoft Edge WebView2': 'Edge WebView2',
    'Android WebView': 'Chrome WebView',
    'HeadlessChrome': 'Chrome Headless',
    'OperaMobile': 'Opera Mobi',
};

let currentUserAgent: string = USER_AGENT;
let parsedCache: ParsedCache | null = null;
let parsedFromHighEntropyValuesOSName: OS | undefined = undefined;
let parsedFromHighEntropyValuesOSVersion: string | undefined = undefined;
let parsedFromHighEntropyValuesBrowserName: Browsers | undefined = undefined;
let parsedFromHighEntropyValuesBrowserVersion: string | undefined = undefined;
let parsedFromHighEntropyValuesEngineVersion: string | undefined = undefined;
let parsedFromHighEntropyValuesDevice: Devices | null = null;
let ready: Promise<void>;

function resolveWindowsVersion(string: string | undefined): string {
    if (typeof string === 'undefined') return '';

    const mapped: string | undefined = {
        '4.90': 'ME',
        '3.51': 'NT 3.51',
        '4.0': 'NT 4.0',
        '5.0': '2000',
        '5.1': 'XP',
        '5.2': 'XP',
        '6.0': 'Vista',
        '6.1': '7',
        '6.2': '8',
        '6.3': '8.1',
        '6.4': '10',
        '10.0': '10'
    }[string.replace(/[^\d.]/g, '')];

    if (typeof mapped !== 'undefined') return mapped;
    return string;
}

function resolveUnderscoreVersion(string: string | undefined): string {
    if (typeof string === 'undefined') return '';
    return string.replace(/_/g, '.');
}

function resolveVersion(string: string | undefined, resolver: VersionResolver): string {
    if (typeof resolver === 'function') return resolver(string);
    if (typeof resolver === 'string') return resolver;
    if (typeof string === 'undefined') return '';
    return string;
}

function compareVersion(lhs: string, rhs: string): -1 | 0 | 1 {
    const pa: string[] = lhs.split('.');
    const pb: string[] = rhs.split('.');
    const length: number = Math.max(pa.length, pb.length);

    for (let i: number = 0; i < length; i++) {
        let a: number;
        let b: number;

        if (i < pa.length) a = parseInt(pa[i], 10);
        else a = 0;

        if (i < pb.length) b = parseInt(pb[i], 10);
        else b = 0;

        if (a > b) return 1;
        if (a < b) return -1;
    }

    return 0;
}

function parseOS(): NameVersionPair<OS> {
    let name: OS = 'unknown';
    let version: string = '';

    for (let i: number = 0; i < OS_RESOLVER_MAP.length; i++) {
        const map: [RegExp, OS, VersionResolver?] = OS_RESOLVER_MAP[i];
        const matched: RegExpMatchArray | null = currentUserAgent.match(map[0]);

        if (matched !== null) {
            name = map[1];
            version = resolveVersion(matched[1], map[2]);
            break;
        }
    }

    // iOS 26 freezes the UA at `OS 18_6` for compatibility and moves the real version into the `Version/` token; unfreeze it here. A future freeze will need the same treatment.
    if (name === 'ios' && compareVersion(version, '18.6') === 0) {
        const execs: RegExpExecArray | null = /\) Version\/([\d.]+)/.exec(currentUserAgent);

        if (execs !== null) {
            const major: number = parseInt(execs[1].split('.')[0], 10);

            if (major >= 26) version = execs[1];
        }
    }

    if (currentUserAgent === USER_AGENT) {
        if (typeof parsedFromHighEntropyValuesOSName !== 'undefined') name = parsedFromHighEntropyValuesOSName;
        if (typeof parsedFromHighEntropyValuesOSVersion !== 'undefined') version = parsedFromHighEntropyValuesOSVersion;
        if (name === 'macos' && typeof NAVIGATOR !== 'undefined' && NAVIGATOR !== null && typeof NAVIGATOR.standalone !== 'undefined' && typeof NAVIGATOR.maxTouchPoints === 'number' && NAVIGATOR.maxTouchPoints > 2) name = 'ios';
    }

    return {
        name: name,
        version: version
    };
}

function parseBrowser(): NameVersionPair<Browsers> {
    let name: Browsers = 'unknown';
    let version: string = '';

    for (let i: number = 0; i < BROWSER_RESOLVER_MAP.length; i++) {
        const map: [RegExp, Browsers, VersionResolver?] = BROWSER_RESOLVER_MAP[i];
        const matched: RegExpMatchArray | null = currentUserAgent.match(map[0]);

        if (matched !== null) {
            name = map[1];
            version = resolveVersion(matched[1], map[2]);
            break;
        }
    }

    if (currentUserAgent === USER_AGENT) {
        if (typeof parsedFromHighEntropyValuesBrowserName !== 'undefined') name = parsedFromHighEntropyValuesBrowserName;
        if (typeof parsedFromHighEntropyValuesBrowserVersion !== 'undefined') version = parsedFromHighEntropyValuesBrowserVersion;
    }

    return {
        name: name,
        version: version
    };
}

function parseEngine(): NameVersionPair<Engines> {
    let name: Engines = 'unknown';
    let version: string = '';

    for (let i: number = 0; i < ENGINE_RESOLVER_MAP.length; i++) {
        const map: [RegExp, Engines, VersionResolver?] = ENGINE_RESOLVER_MAP[i];
        const matched: RegExpMatchArray | null = currentUserAgent.match(map[0]);

        if (matched !== null) {
            name = map[1];
            version = resolveVersion(matched[1], map[2]);
            break;
        }
    }

    if (currentUserAgent === USER_AGENT) {
        if (typeof parsedFromHighEntropyValuesEngineVersion !== 'undefined') version = parsedFromHighEntropyValuesEngineVersion;
    }

    return {
        name: name,
        version: version
    };
}

function parseInAppBrowser(): InAppBrowsers | null {
    for (let i: number = 0; i < IN_APP_BROWSER_RESOLVER_MAP.length; i++) {
        if (IN_APP_BROWSER_RESOLVER_MAP[i][0].test(currentUserAgent)) return IN_APP_BROWSER_RESOLVER_MAP[i][1];
    }

    return null;
}

function parseWebview(): boolean {
    // Android WebView: the `wv` token, or the legacy `Version/x Chrome/y` pairing that only a WebView (or the old stock browser) emits.
    if (/; ?wv\)/i.test(currentUserAgent)) return true;
    if (/\bversion\/[\d.]+ chrome\//i.test(currentUserAgent)) return true;
    // Desktop shells
    if (/\belectron\//i.test(currentUserAgent)) return true;
    // iOS WKWebView: an iOS UA with no `Safari` token at all
    if (/iphone|ipad|ipod/i.test(currentUserAgent) && /applewebkit/i.test(currentUserAgent) && /safari/i.test(currentUserAgent) === false) return true;

    return parseInAppBrowser() !== null;
}

/**
 * The device form factor.
 *
 * @remarks
 * Client Hints `formFactors` wins when present. Otherwise iOS is split by the `iPad`
 * marker (iPadOS sends a desktop UA, which {@link parseOS} already re-classifies via
 * `maxTouchPoints`), and Android by the presence of the `Mobile` token — tablets omit it.
 */
function parseDevice(): Devices {
    if (currentUserAgent === USER_AGENT && parsedFromHighEntropyValuesDevice !== null) return parsedFromHighEntropyValuesDevice;

    const osName: OS = getParsedCache().os.name;

    if (osName === 'ios') {
        if (/ipad/i.test(currentUserAgent) || /macintosh/i.test(currentUserAgent)) return 'tablet';

        return 'mobile';
    }

    if (osName === 'android') return /\bmobile\b/i.test(currentUserAgent) ? 'mobile' : 'tablet';
    if (osName === 'windows' || osName === 'macos') return 'desktop';

    return 'unknown';
}

function getParsedCache(): ParsedCache {
    if (parsedCache !== null && parsedCache.userAgent === currentUserAgent) return parsedCache;

    parsedCache = {
        userAgent: currentUserAgent,
        os: parseOS(),
        browser: parseBrowser(),
        engine: parseEngine(),
    };

    return parsedCache;
}

function invalidateCache(): void {
    parsedCache = null;

    parsedFromHighEntropyValuesOSName = undefined;
    parsedFromHighEntropyValuesOSVersion = undefined;
    parsedFromHighEntropyValuesBrowserName = undefined;
    parsedFromHighEntropyValuesBrowserVersion = undefined;
    parsedFromHighEntropyValuesEngineVersion = undefined;
    parsedFromHighEntropyValuesDevice = null;
}

function normalizeBrand(entry: UserAgentDataBrand): ModernUserAgentDataBrand {
    if (entry === null || typeof entry === 'undefined') return {brand: '', version: ''};
    if (typeof entry === 'string') return {brand: entry, version: ''};
    return {brand: entry.brand, version: entry.version};
}

function resolvedThenable(): Promise<void> {
    if (typeof Promise === 'function') return Promise.resolve();

    const thenable: { then: Function; catch: Function; finally: Function } = {
        then: function (onFulfilled?: (value: void) => unknown): unknown {
            if (typeof onFulfilled === 'function') onFulfilled(undefined);

            return thenable;
        },
        catch: function (): unknown {
            return thenable;
        },
        finally: function (onFinally?: () => void): unknown {
            if (typeof onFinally === 'function') onFinally();

            return thenable;
        },
    };

    return thenable as unknown as Promise<void>;
}

function parseFromHighEntropyValues(): Promise<void> {
    if (typeof USER_AGENT_DATA === 'undefined' || typeof USER_AGENT_DATA.getHighEntropyValues === 'undefined') return resolvedThenable();

    return USER_AGENT_DATA
        .getHighEntropyValues(['brands', 'fullVersionList', 'mobile', 'platform', 'platformVersion', 'formFactors'])
        .then(function (result: UserAgentDataValues): void {
            try {
                const brands: UserAgentDataBrand[] = result.fullVersionList || result.brands || [];
                const platformVersion: string | null | undefined = result.platformVersion;
                const platform: string | null | undefined = result.platform;
                let browserName: string = getParsedCache().browser.name;
                let prevBrandName: string | null = null;

                for (let i: number = 0; i < brands.length; i++) {
                    const brand: ModernUserAgentDataBrand = normalizeBrand(brands[i]);
                    const brandVersion: string = brand.version;
                    let brandName: string = brand.brand;

                    if (/not.a.brand/i.test(brandName)) continue;

                    if (prevBrandName === null || (/Chrom/.test(prevBrandName) && brandName !== 'Chromium') || (prevBrandName === 'Edge' && /WebView2/.test(brandName))) {
                        brandName = HIGH_ENTROPY_BRAND_NAME_MAP[brandName] || brandName;
                        prevBrandName = browserName;

                        if (prevBrandName === null || /Chrom/.test(prevBrandName) || !/Chrom/.test(brandName)) {
                            browserName = brandName;

                            if (browserName === 'Chrome' || browserName === 'Chrome WebView' || browserName === 'Chrome Headless') parsedFromHighEntropyValuesBrowserName = 'chrome';
                            else if (browserName === 'Edge' || browserName === 'Edge WebView2') parsedFromHighEntropyValuesBrowserName = 'edge';
                            else if (browserName === 'Opera Mobi') parsedFromHighEntropyValuesBrowserName = 'opera';

                            parsedFromHighEntropyValuesBrowserVersion = brandVersion;
                        }

                        prevBrandName = brandName;
                    }

                    if (brandName === 'Chromium') parsedFromHighEntropyValuesEngineVersion = brandVersion;
                }

                if (typeof platformVersion === 'string') {
                    if (getParsedCache().os.name === 'windows') {
                        if (parseInt(platformVersion.split('.')[0], 10) >= 13) parsedFromHighEntropyValuesOSVersion = '11';
                        else parsedFromHighEntropyValuesOSVersion = '10';
                    } else {
                        parsedFromHighEntropyValuesOSVersion = platformVersion;
                    }
                }

                if (typeof platform === 'string') {
                    if (/android/i.test(platform)) parsedFromHighEntropyValuesOSName = 'android';
                    else if (/ios|iphone|ipad/i.test(platform)) parsedFromHighEntropyValuesOSName = 'ios';
                    else if (/windows|win32/i.test(platform)) parsedFromHighEntropyValuesOSName = 'windows';
                    else if (/macos|macintel/i.test(platform)) parsedFromHighEntropyValuesOSName = 'macos';
                }

                const formFactors: string[] | null | undefined = result.formFactors;

                if (typeof formFactors !== 'undefined' && formFactors !== null && typeof formFactors.length === 'number') {
                    for (let i: number = 0; i < formFactors.length; i++) {
                        const formFactor: string = String(formFactors[i]).toLowerCase();

                        if (formFactor === 'tablet') parsedFromHighEntropyValuesDevice = 'tablet';
                        else if (formFactor === 'mobile') parsedFromHighEntropyValuesDevice = 'mobile';
                        else if (formFactor === 'desktop') parsedFromHighEntropyValuesDevice = 'desktop';
                    }
                }

                if (parsedFromHighEntropyValuesDevice === null && result.mobile === true) parsedFromHighEntropyValuesDevice = 'mobile';
            } catch (_: unknown) {
            } finally {
                parsedCache = null;
            }
        })
        .catch(function (): void {
            parsedCache = null;
        });
}

ready = parseFromHighEntropyValues();

const PlatformKit: PlatformKitInstance = {
    version: packageJSON.version,

    get ready(): Promise<void> {
        return ready;
    },

    whenReady(callback: () => void): void {
        if (typeof callback !== 'function') return;

        ready.then(function (): void {
            callback();
        });
    },

    set userAgent(userAgent: string) {
        if (currentUserAgent === userAgent) return;

        currentUserAgent = userAgent;
        invalidateCache();

        // Client Hints describe the real environment, so they are only merged back in when the real UA is active. Re-requesting them for a custom UA is pure waste.
        ready = userAgent === USER_AGENT ? parseFromHighEntropyValues() : resolvedThenable();
    },

    reset(): void {
        if (currentUserAgent === USER_AGENT) return;

        currentUserAgent = USER_AGENT;
        invalidateCache();

        ready = parseFromHighEntropyValues();
    },

    get userAgent(): string {
        return currentUserAgent;
    },

    get os(): NameVersionPair<OS> {
        return getParsedCache().os;
    },

    get browser(): NameVersionPair<Browsers> {
        return getParsedCache().browser;
    },

    get engine(): NameVersionPair<Engines> {
        return getParsedCache().engine;
    },

    get device(): Devices {
        return parseDevice();
    },

    get webview(): boolean {
        return parseWebview();
    },

    get inAppBrowser(): InAppBrowsers | null {
        return parseInAppBrowser();
    },

    get node(): boolean {
        const nodeProcess: NodeProcessLike | undefined = GLOBAL.process;

        return typeof nodeProcess !== 'undefined' && nodeProcess !== null && typeof nodeProcess.versions !== 'undefined' && nodeProcess.versions !== null && typeof nodeProcess.versions.node !== 'undefined';
    },

    get standalone(): boolean {
        const osName: OS = getParsedCache().os.name;

        if (osName === 'ios') return typeof NAVIGATOR !== 'undefined' && NAVIGATOR !== null && NAVIGATOR.standalone === true;
        if (typeof GLOBAL.matchMedia !== 'function') return false;

        try {
            return GLOBAL.matchMedia('(display-mode: standalone)').matches === true;
        } catch (_: unknown) {
            return false;
        }
    },

    compareVersion(lhs: string, rhs: string): -1 | 0 | 1 {
        return compareVersion(lhs, rhs);
    }
}

export default PlatformKit;
