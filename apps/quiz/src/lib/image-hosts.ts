// Remote image host allowlist, mirroring next.config.ts images.remotePatterns.
//
// Why this exists: next/image THROWS during render when it gets a src whose
// hostname is not in remotePatterns ("Invalid src prop ... is not configured").
// That happens in getImgProps, before the image is ever requested, so a component
// onError handler can never catch it. One bad row in the database therefore takes
// down the whole page tree. Callers use this to check the URL FIRST and fall back
// to their own placeholder instead of handing next/image something it will reject.
//
// Keep in sync with next.config.ts.

const ALLOWED_HOSTS = [
  'i.pinimg.com',
  'lh3.googleusercontent.com',
  'drive.google.com',
  'cdn.discordapp.com',
  'i.ytimg.com',
];

const ALLOWED_SUFFIXES = ['.supabase.co'];

/**
 * True when next/image will accept this URL. Relative paths (our own /public
 * assets) are always fine. Anything unparseable or off-list returns false so the
 * caller can render a placeholder rather than crash.
 */
export function isConfiguredImageHost(url: string | null | undefined): boolean {
  if (!url) return false;
  if (url.startsWith('/')) return true; // local asset

  let host: string;
  try {
    host = new URL(url).hostname;
  } catch {
    return false;
  }

  if (ALLOWED_HOSTS.includes(host)) return true;
  return ALLOWED_SUFFIXES.some((suffix) => host.endsWith(suffix));
}
