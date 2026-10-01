'use client';

// Client calls behind the header picture sheet (passport band + settings). The
// file and link go to P10's routes (api/profile/header/*), which re-encode, store
// and save header_url; "use the theme colour" clears header_url through the
// EXISTING /api/auth/update-profile (same payload shape as the legacy settings).

export type HeaderResult = { ok: true; url: string | null } | { ok: false; error: string };

async function read(res: Response): Promise<HeaderResult> {
  let body: { url?: unknown; error?: unknown } = {};
  try { body = (await res.json()) as typeof body; } catch { /* empty */ }
  if (res.ok && typeof body.url === 'string' && /^https:\/\//.test(body.url)) return { ok: true, url: body.url };
  if (typeof body.error === 'string' && body.error) return { ok: false, error: body.error };
  return { ok: false, error: res.status === 401 ? 'Sign in to change your header.' : 'We could not save that picture. Try again.' };
}

export async function uploadHeader(file: File): Promise<HeaderResult> {
  const fd = new FormData();
  fd.append('file', file);
  try {
    return await read(await fetch('/api/profile/header/upload', { method: 'POST', body: fd, credentials: 'include' }));
  } catch {
    return { ok: false, error: 'We could not reach the server. Try again.' };
  }
}

export async function linkHeader(url: string): Promise<HeaderResult> {
  try {
    return await read(await fetch('/api/profile/header/link', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url }), credentials: 'include' }));
  } catch {
    return { ok: false, error: 'We could not reach the server. Try again.' };
  }
}

export async function clearHeader(): Promise<HeaderResult> {
  try {
    const res = await fetch('/api/auth/update-profile', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ header_url: null }), credentials: 'include' });
    if (res.ok) return { ok: true, url: null };
    let msg = 'We could not save that. Try again.';
    try { const d = (await res.json()) as { error?: string }; if (d.error) msg = d.error; } catch { /* keep */ }
    return { ok: false, error: msg };
  } catch {
    return { ok: false, error: 'We could not reach the server. Try again.' };
  }
}

/** Band / preview listeners: fired after a header change anywhere on the page. */
export const HEADER_EVENT = 'p10:header';
export function announceHeader(url: string | null): void {
  window.dispatchEvent(new CustomEvent(HEADER_EVENT, { detail: { url } }));
}
