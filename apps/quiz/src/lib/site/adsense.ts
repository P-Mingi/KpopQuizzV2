// Launch polish, lane ADS: the AdSense account of the hub, in ONE place. The variable NEXT_PUBLIC_ADSENSE_PUB_ID holds the publisher id exactly as the
// AdSense console shows it: `ca-pub-` and 16 digits. Two files are derived from it, and neither depends on any ad flag (Google reads them while it
// reviews the site, before a single ad may run):
//   - the meta tag  <meta name="google-adsense-account" content="ca-pub-XXXXXXXXXXXXXXXX">   (the id as it is)
//   - /ads.txt      google.com, pub-XXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0              (the id without "ca-")
// A value of another shape (a bare `pub-...`, a short id, spaces inside, a letter) is treated as not set: nothing is served, never a half line.
// The hub and kpopquiz.org (LAUNCH-POLISH-2 E, 2026-11-23: ready for AdSense, no ad slot); the anime build never serves either file.

/** Google's own certification authority id for AdSense lines of ads.txt (the same for every publisher). */
export const ADSENSE_AUTHORITY_ID = 'f08c47fec0942fa0';
export const ADSENSE_META_NAME = 'google-adsense-account';
const CLIENT_RE = /^ca-pub-\d{16}$/;

export interface AdsenseAccount {
  /** `ca-pub-XXXXXXXXXXXXXXXX`: the meta tag and the ad script. */
  readonly client: string;
  /** `pub-XXXXXXXXXXXXXXXX`: the ads.txt line. */
  readonly pub: string;
}

/** The account named by the variable, or null when it is unset or malformed. Surrounding spaces of the pasted value are ignored, nothing else. */
export function parseAdsenseAccount(raw: string | null | undefined): AdsenseAccount | null {
  const v = (raw ?? '').trim();
  return CLIENT_RE.test(v) ? { client: v, pub: v.slice(3) } : null;
}

/** The one ads.txt line, or null. */
export function adsTxtLine(account: AdsenseAccount | null): string | null {
  return account ? `google.com, ${account.pub}, DIRECT, ${ADSENSE_AUTHORITY_ID}` : null;
}

/** The body of /ads.txt (a final newline), or null when the file must answer 404. */
export function adsTxtBody(raw: string | null | undefined): string | null {
  const line = adsTxtLine(parseAdsenseAccount(raw));
  return line === null ? null : `${line}\n`;
}

/** The `other` entry of the root metadata for the verification meta tag, or an empty object. The roots of the hub and of kpopquiz.org use it. */
export function adsenseMetaOther(raw: string | null | undefined): Record<string, string> {
  const a = parseAdsenseAccount(raw);
  return a ? { [ADSENSE_META_NAME]: a.client } : {};
}
