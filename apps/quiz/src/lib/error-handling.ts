/**
 * Helpers for safely catching errors in server components without
 * swallowing Next.js's internal bailout signals.
 *
 * Next uses thrown errors with specific `digest` prefixes to signal:
 *  - DYNAMIC_SERVER_USAGE: route reads cookies/headers, bail out of static gen
 *  - NEXT_NOT_FOUND: call notFound(), render the 404 page
 *  - NEXT_REDIRECT: call redirect(), emit a 3xx
 *
 * If a page's .catch() swallows these, the page renders wrong. Use
 * `safeFetch` / `isNextInternalError` to re-throw only those and handle
 * real DB/network errors with a fallback.
 */

const INTERNAL_ERROR_PREFIXES = [
  'DYNAMIC_SERVER_USAGE',
  'NEXT_NOT_FOUND',
  'NEXT_REDIRECT',
  'NEXT_HTTP_ERROR_FALLBACK',
] as const;

export function isNextInternalError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const digest = (err as { digest?: unknown }).digest;
  if (typeof digest !== 'string') return false;
  return INTERNAL_ERROR_PREFIXES.some((p) => digest.startsWith(p));
}

/**
 * Wraps a promise so real errors become the `fallback` and Next's internal
 * errors (dynamic bailout, notFound, redirect) are re-thrown so Next can
 * handle them.
 *
 * Usage:
 *   const quizzes = await safeFetch(getTrendingQuizzes(0, 24), [], '[home] trending');
 */
export async function safeFetch<T>(
  promise: Promise<T>,
  fallback: T,
  label: string,
): Promise<T> {
  try {
    return await promise;
  } catch (err) {
    if (isNextInternalError(err)) throw err;
    console.error(`${label} failed:`, err);
    return fallback;
  }
}
