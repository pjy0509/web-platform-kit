declare global {
    interface Navigator {
        userAgentData?: UserAgentData;
        standalone?: boolean;
    }

    interface NodeProcessVersions {
        node?: string;
    }

    interface NodeProcess {
        versions?: NodeProcessVersions;
    }

    var process: NodeProcess | undefined;
}

type UserAgentDataBrand = | ModernUserAgentDataBrand | string | null | undefined;
export type OS = 'unknown' | 'windows' | 'macos' | 'android' | 'ios';
export type Browsers = 'unknown' | 'chrome' | 'safari' | 'edge' | 'firefox' | 'opera' | 'ie' | 'samsung';
export type Engines = 'unknown' | 'edgeHtml' | 'arkWeb' | 'blink' | 'presto' | 'webKit' | 'trident' | 'netFront' | 'khtml' | 'tasman' | 'gecko';
export type Devices = 'unknown' | 'mobile' | 'desktop';
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

const NAVIGATOR: Navigator = globalThis.navigator;
const USER_AGENT: string = typeof NAVIGATOR !== 'undefined' ? NAVIGATOR.userAgent : '';
const USER_AGENT_DATA: UserAgentData | undefined = typeof NAVIGATOR !== 'undefined' ? NAVIGATOR.userAgentData : undefined;

const OS_RESOLVER_MAP: [RegExp, OS, VersionResolver?][] = [
    // Windows RT
    [/windows nt (6\.[23]); arm/i, 'windows', resolveWindowsVersion],
    // Windows IoT/Mobile/Phone
    [/windows (?:phone|mobile|iot)(?: os)?[\/ ]?([\d.]*( se)?)/i, 'windows', resolveWindowsVersion],
    // Windows NT/3.1/95/98/ME/2000/XP/Vista/7/8/8.1/10/11
    [/windows[\/ ](1[01]|2000|3\.1|7|8(\.1)?|9[58]|me|server 20\d\d( r2)?|vista|xp)/i, 'windows', resolveWindowsVersion],
    [/windows nt ?([\d.)]*)(?!.+xbox)/i, 'windows', resolveWindowsVersion],
    [/\bwin(?=3| ?9|n)(?:nt| 9x )?([\d.;]*)/i, 'windows', resolveWindowsVersion],
    // Windows CE
    [/windows ce\/?([\d.]*)/i, 'windows', resolveWindowsVersion],

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
    [/ wv\).+(chrome)\/([\w.]+)/i, 'chrome'],
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

    // Firefox Mobile
    [/(?:mobile|tablet);.*firefox\/([\w.-]+)/i, 'firefox'],
    // Firefox Reality
    [/mobile vr; rv:([\w.]+)\).+firefox/i, 'firefox'],
    // Firefox
    [/firefox\/([\w.]+)/i, 'firefox'],
];

export const ENGINE_RESOLVER_MAP: [RegExp, Engines, VersionResolver?][] = [
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

export const HIGH_ENTROPY_BRAND_NAME_MAP: Record<string, string> = {
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
        'NT3.51': 'NT 3.11',
        'NT4.0': 'NT 4.0',
        'NT 5.0': '2000',
        'NT 5.1': 'XP',
        'NT 5.2': 'XP',
        'NT 6.0': 'Vista',
        'NT 6.1': '7',
        'NT 6.2': '8',
        'NT 6.3': '8.1',
        'NT 6.4': '10',
        'NT 10.0': '10',
        'ARM': 'RT'
    }[string];

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
        if (name === 'macos' && typeof globalThis.navigator.standalone !== 'undefined' && typeof globalThis.navigator.maxTouchPoints !== 'undefined' && globalThis.navigator.maxTouchPoints > 2) name = 'ios';
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

function parseFromHighEntropyValues(): Promise<void> {
    if (typeof USER_AGENT_DATA === 'undefined' || typeof USER_AGENT_DATA.getHighEntropyValues === 'undefined') return Promise.resolve();

    return USER_AGENT_DATA
        .getHighEntropyValues(['brands', 'fullVersionList', 'mobile', 'model', 'platform', 'platformVersion', 'architecture', 'formFactors', 'bitness', 'uaFullVersion', 'wow64'])
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

                if (result.mobile === true) parsedFromHighEntropyValuesDevice = 'mobile';

                parsedCache = null;

            } catch (_: unknown) {
            }
        })
        .catch(function (): void {
            parsedCache = null;
        });
}

ready = parseFromHighEntropyValues();

export function compareVersion(lhs: string, rhs: string): -1 | 0 | 1 {
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

export default function parseUserAgent() {
    return {
        get ready(): Promise<void> {
            return ready;
        },

        set userAgent(userAgent: string) {
            if (currentUserAgent === userAgent) return;

            currentUserAgent = userAgent;
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
            if (currentUserAgent === USER_AGENT && parsedFromHighEntropyValuesDevice !== null) return parsedFromHighEntropyValuesDevice;

            const osName: OS = getParsedCache().os.name;

            if (osName === 'ios' || osName === 'android') return 'mobile';
            if (osName === 'windows' || osName === 'macos') return 'desktop';
            return 'unknown';
        },

        get webview(): boolean {
            return /; ?wv|applewebkit(?!.*safari)/i.test(currentUserAgent);
        },

        get node(): boolean {
            return typeof globalThis.process !== 'undefined' && typeof globalThis.process.versions !== 'undefined' && typeof globalThis.process.versions.node !== 'undefined';
        },

        get standalone(): boolean {
            const osName: OS = getParsedCache().os.name;

            if (osName === 'ios') return globalThis.navigator.standalone === true;
            if (typeof globalThis.matchMedia === 'undefined') return false;

            return globalThis.matchMedia('(display-mode: standalone)').matches;
        },
    }
}
