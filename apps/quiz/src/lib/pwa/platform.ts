// Run PWA: what the browser is, for the install banner. Pure over the values it is given (the user agent, the platform, the touch points,
// a matchMedia), so the tests run it with strings. No window access here.

/** Browsers that run on iOS or iPadOS but are not Safari (or are an app's own web view): they have their own share sheet, the guide is Safari's. */
const IOS_NOT_SAFARI = /CriOS|FxiOS|EdgiOS|OPiOS|OPT\/|DuckDuckGo|GSA\/|FBAN|FBAV|FB_IAB|Instagram|Line\/|Twitter|Snapchat|MicroMessenger|Pinterest|TikTok|musical_ly/i;

/** An iPhone, an iPod or an iPad. An iPad on iPadOS 13 or later says "Macintosh" and is told apart by its touch screen. */
export function isIos(userAgent: string, platform: string, maxTouchPoints: number): boolean {
  if (/iPhone|iPad|iPod/.test(userAgent)) return true;
  return platform === 'MacIntel' && maxTouchPoints > 1;
}

/** Safari on iPhone or iPad: the one place with no install window, where the banner shows the two gestures instead. */
export function isIosSafari(userAgent: string, platform: string, maxTouchPoints: number): boolean {
  return isIos(userAgent, platform, maxTouchPoints) && /Safari\//.test(userAgent) && !IOS_NOT_SAFARI.test(userAgent);
}

export interface DisplayEnv {
  readonly matchMedia?: ((query: string) => { readonly matches: boolean }) | undefined;
  /** iOS Safari's own flag for a page opened from the home screen. */
  readonly navigatorStandalone?: boolean | undefined;
}

/** True when the page runs as an installed app: the standalone display mode, or the home screen app of iOS. */
export function isStandalone(env: DisplayEnv): boolean {
  if (env.navigatorStandalone === true) return true;
  try {
    return env.matchMedia?.('(display-mode: standalone)').matches === true || env.matchMedia?.('(display-mode: minimal-ui)').matches === true;
  } catch {
    return false;
  }
}
