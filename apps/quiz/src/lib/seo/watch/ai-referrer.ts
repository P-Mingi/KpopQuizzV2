// SEO Mission 3, part D, point 4: which visits come from an AI assistant. Pure, edge safe (the
// middleware imports it), no personal data: the answer is an assistant name and the landing
// path, nothing about the visitor (no IP, no user id, no user agent, no cookie).
//
// A visit counts when it is a real page load (GET, not a Next prefetch or RSC request) and
//   - its Referer host is one of the four assistants (or a subdomain, e.g. www.perplexity.ai), or
//   - it has no such Referer but its utm_source names one (ChatGPT adds utm_source=chatgpt.com
//     to the links it shows, and apps often send no Referer at all).
//
// The middleware matcher (src/middleware.ts) only invokes the middleware for those requests on
// pages it otherwise skips. A matcher must be a literal in that file, so the two patterns below
// are copied there; ai-referrer.test.ts fails if the copies drift.

export type AiSource = 'chatgpt' | 'perplexity' | 'copilot' | 'gemini';

export const AI_SOURCES: readonly AiSource[] = ['chatgpt', 'perplexity', 'copilot', 'gemini'];

export const AI_SOURCE_LABEL: Record<AiSource, string> = {
  chatgpt: 'ChatGPT',
  perplexity: 'Perplexity',
  copilot: 'Copilot',
  gemini: 'Gemini',
};

const HOSTS: ReadonlyArray<[AiSource, string]> = [
  ['chatgpt', 'chatgpt.com'],
  ['perplexity', 'perplexity.ai'],
  ['copilot', 'copilot.microsoft.com'],
  ['gemini', 'gemini.google.com'],
];

/** The Referer header regex of the middleware matcher (anchored by Next: ^...$). */
export const AI_REFERER_MATCHER = 'https?://(?:[a-z0-9-]+\\.)*(?:chatgpt\\.com|perplexity\\.ai|copilot\\.microsoft\\.com|gemini\\.google\\.com)(?:[/:?#].*)?';

/** The utm_source regex of the middleware matcher (anchored by Next: ^...$). */
export const AI_UTM_MATCHER = '(?:chatgpt\\.com|perplexity(?:\\.ai)?|copilot(?:\\.microsoft\\.com)?|gemini(?:\\.google\\.com)?)';

function hostSource(host: string): AiSource | null {
  const h = host.toLowerCase().replace(/\.$/, '');
  for (const [source, base] of HOSTS) if (h === base || h.endsWith(`.${base}`)) return source;
  return null;
}

/** The assistant a Referer points at, or null. Only http(s) URLs count. */
export function sourceFromReferer(referer: string | null | undefined): AiSource | null {
  if (!referer) return null;
  try {
    const u = new URL(referer);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
    return hostSource(u.hostname);
  } catch {
    return null;
  }
}

/** The assistant a utm_source value names, or null. */
export function sourceFromUtm(utm: string | null | undefined): AiSource | null {
  if (!utm) return null;
  return new RegExp(`^${AI_UTM_MATCHER}$`).test(utm.trim()) ? (utm.trim().split('.')[0] as AiSource) : null;
}

export interface RequestLike {
  method: string;
  headers: { get(name: string): string | null };
  nextUrl: { pathname: string; searchParams: { get(name: string): string | null } };
}

/**
 * Prefetches and client navigations are not visits. The real guard is the Referer: every
 * request a page makes after it loads carries kpopquiz.org as Referer, never the assistant. Next
 * also strips the RSC and router-prefetch headers before the middleware sees the request (seen
 * on the dev server, 2026-10-15), so these checks only catch what reaches us unstripped (the
 * browser's Purpose / Sec-Purpose prefetch headers) and keep the function honest elsewhere.
 */
function isPrefetchOrData(headers: RequestLike['headers']): boolean {
  if (headers.get('rsc') || headers.get('next-router-prefetch') || headers.get('next-router-state-tree')) return true;
  const purpose = `${headers.get('purpose') ?? ''} ${headers.get('sec-purpose') ?? ''}`.toLowerCase();
  return purpose.includes('prefetch');
}

/** A path we store: the pathname only, plain characters, at most 200. */
export function storablePath(pathname: string): string | null {
  if (!pathname.startsWith('/') || pathname.length > 200) return null;
  return /^\/[A-Za-z0-9._~%/-]*$/.test(pathname) ? pathname : null;
}

/** The AI visit this request is, or null. */
export function aiVisitFromRequest(req: RequestLike): { source: AiSource; path: string } | null {
  if (req.method !== 'GET') return null;
  if (isPrefetchOrData(req.headers)) return null;
  const source = sourceFromReferer(req.headers.get('referer')) ?? sourceFromUtm(req.nextUrl.searchParams.get('utm_source'));
  if (!source) return null;
  const path = storablePath(req.nextUrl.pathname);
  return path ? { source, path } : null;
}
