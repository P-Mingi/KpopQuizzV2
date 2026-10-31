// Daily games step 2: the browser side of the admin routes of the Photos tab (app/api/admin/photos/*). The paths carry the build's base path
// (/anime on bunnyverse.org/anime), as the anime admin's own client does (lib/anime/entity-images-api.ts).

const BASE_PATH = process.env.__NEXT_ROUTER_BASEPATH || '';

export const PHOTO_API = {
  save: `${BASE_PATH}/api/admin/photos`,
  assets: `${BASE_PATH}/api/admin/photos/assets`,
  fetch: `${BASE_PATH}/api/admin/photos/fetch`,
} as const;

/** A path of the build's public folder, with the base path (a mascot, an idol's file). */
export const withBase = (path: string): string => (path.startsWith('/') && BASE_PATH && !path.startsWith(`${BASE_PATH}/`) ? `${BASE_PATH}${path}` : path);

export type Answer = { ok: true; [k: string]: unknown } | { ok: false; error: string };

/** Posts a form; answers { ok: true, ... } or the route's own words (never a stack). */
export async function postForm(url: string, form: FormData): Promise<Answer> {
  try {
    const res = await fetch(url, { method: 'POST', body: form, credentials: 'same-origin' });
    const body = (await res.json().catch(() => null)) as Record<string, unknown> | null;
    if (res.ok && body && body.ok === true) return { ok: true, ...body };
    const words = body && typeof body.error === 'string' ? body.error : res.status === 404 ? 'Réservé à l\'admin : reconnecte-toi.' : 'L\'enregistrement a échoué. Réessaie.';
    return { ok: false, error: words };
  } catch {
    return { ok: false, error: 'Le réseau ne répond pas. Réessaie.' };
  }
}

/**
 * The bytes of a picture to put through the canvas: a file of this site is read directly (same origin); a picture of another site goes
 * through the admin's guarded fetch (the canvas cannot read another origin's pixels).
 */
export async function fetchPicture(url: string): Promise<Blob> {
  const own = url.startsWith('/') || url.startsWith(window.location.origin);
  const res = own
    ? await fetch(url, { credentials: 'same-origin' })
    : await fetch(PHOTO_API.fetch, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url }) });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? 'L\'image n\'a pas pu être lue à cette adresse.');
  }
  return res.blob();
}
