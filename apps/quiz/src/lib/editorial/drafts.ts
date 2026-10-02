// Validation of an editorial draft (pure, unit tested). Limits match the CHECK
// constraints of v12-g9-editorial.sql and of community_debates (a debate draft is
// published into that table), so a draft that passes here cannot fail on a
// constraint at publish time.

import { DRAFT_KINDS } from './types';

import type { DraftInput, DraftKind, DraftSource, EditorialDraft } from './types';

export type Checked<T> = { ok: true; value: T } | { ok: false; error: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const MAX_BODY = 20000;
/** community_debates.body is capped at 2000. */
export const MAX_DEBATE_BODY = 2000;
export const MAX_SOURCES = 20;

/** Only an absolute http(s) URL is kept as a link (stored values are never trusted at the sink). */
export function safeUrl(raw: unknown): string | null {
  const s = typeof raw === 'string' ? raw.trim() : '';
  return /^https?:\/\/[^\s<>"']+$/i.test(s) && s.length <= 500 ? s : null;
}

export function cleanSources(raw: unknown): DraftSource[] | null {
  if (raw == null) return [];
  if (!Array.isArray(raw) || raw.length > MAX_SOURCES) return null;
  const out: DraftSource[] = [];
  for (const r of raw) {
    const o = (r ?? {}) as Record<string, unknown>;
    const label = String(o.label ?? '').trim();
    const rawUrl = typeof o.url === 'string' ? o.url.trim() : '';
    if (!label && !rawUrl) continue; // an empty row of the form
    if (!label || label.length > 200) return null;
    const url = safeUrl(rawUrl);
    if (rawUrl && !url) return null;
    out.push({ label, url });
  }
  return out;
}

export function checkDraftInput(body: unknown): Checked<DraftInput> {
  const b = (body ?? {}) as Record<string, unknown>;
  const account = String(b.account_id ?? '').trim().toLowerCase();
  if (!UUID.test(account)) return { ok: false, error: 'bad_account' };
  const kind = String(b.kind ?? '') as DraftKind;
  if (!DRAFT_KINDS.includes(kind)) return { ok: false, error: 'bad_kind' };
  const title = String(b.title ?? '').trim();
  if (title.length < 5 || title.length > 160) return { ok: false, error: 'bad_title' };
  const text = String(b.body ?? '').replace(/\r\n/g, '\n').trim();
  if (text.length > (kind === 'debate' ? MAX_DEBATE_BODY : MAX_BODY)) return { ok: false, error: 'too_long' };
  if (kind !== 'debate' && !text) return { ok: false, error: 'empty_body' };
  const gid = b.group_id == null || b.group_id === '' ? null : Number(b.group_id);
  if (gid !== null && (!Number.isInteger(gid) || gid <= 0)) return { ok: false, error: 'bad_group' };
  const sources = cleanSources(b.sources);
  if (!sources) return { ok: false, error: 'bad_sources' };

  let options: string[] | null = null;
  let days: 1 | 3 | 7 | null = null;
  if (kind === 'debate') {
    const raw = Array.isArray(b.options) ? b.options : [];
    const list = raw.map((o) => String(o ?? '').trim()).filter(Boolean);
    if (list.length < 2 || list.length > 4 || raw.length > 4) return { ok: false, error: 'bad_options' };
    if (list.some((o) => o.length > 80)) return { ok: false, error: 'bad_options' };
    if (new Set(list.map((o) => o.toLowerCase())).size !== list.length) return { ok: false, error: 'bad_options' };
    options = list;
    const d = b.debate_days == null || b.debate_days === '' ? 3 : Number(b.debate_days);
    if (d !== 1 && d !== 3 && d !== 7) return { ok: false, error: 'bad_days' };
    days = d;
  }
  return { ok: true, value: { account_id: account, kind, group_id: gid, title, body: text, options, sources, debate_days: days } };
}

/** The date an admin approves a draft for. Any valid instant; a past one means "next run". */
export function checkSchedule(raw: unknown): Checked<string> {
  const s = typeof raw === 'string' ? raw.trim() : '';
  const t = s ? Date.parse(s) : NaN;
  if (!Number.isFinite(t)) return { ok: false, error: 'bad_date' };
  return { ok: true, value: new Date(t).toISOString() };
}

/** What stops an approval (SYSTEM.md 5.6: no invented facts, every factual line of a
 *  blog cites a source). Null = it can be approved. */
export function approvalBlocker(d: Pick<EditorialDraft, 'kind' | 'sources' | 'status' | 'template_key'>): string | null {
  if (d.status === 'published') return 'already_published';
  if (d.kind === 'blog' && d.sources.length === 0) return 'blog_needs_sources';
  // A draft built from data states facts: it keeps the sources the template gave it.
  if (d.template_key && d.sources.length === 0) return 'template_needs_sources';
  return null;
}
