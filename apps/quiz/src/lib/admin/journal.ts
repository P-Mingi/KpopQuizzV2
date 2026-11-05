// ADMIN-2 (owner, 2026-10-30; PLAN-ADMIN-2 section 4): the action journal. Every write route of the admin calls logAdminAction after the
// write succeeded; the Journal page reads the last lines. The table (docs/pending-migrations/multisite/026-admin-actions.sql, applied by the
// owner) is closed to every browser role: only the service-role client writes and reads it. Append only.
//
// Two rules. The journal never fails the write it records: a missing table (the migration not applied yet), a refused insert or a timeout is
// logged without any value and swallowed. And it holds no personal data: the detail keeps ids, counts and short codes, never an email, a
// name, a message or a free text typed by a user; keys that sound like such data are dropped before the insert.
import { createServiceRoleClient } from '@/lib/supabase/server';

import { parseSite } from './site';

import type { SiteId } from '@/lib/site/types';

export type JournalValue = string | number | boolean | null | ReadonlyArray<string | number | boolean | null>;
export type JournalDetail = Readonly<Record<string, JournalValue>>;

export interface AdminActionInput {
  readonly site: SiteId;
  /** A short dotted code: 'quiz.remove', 'group.approve'. */
  readonly action: string;
  readonly targetType?: string;
  readonly targetId?: string | number | null;
  readonly detail?: JournalDetail;
  readonly requestId?: string | null;
}

/** Who acted: anything with the verified user's id (an AdminContext, or { user: { id } } from a route kit that holds only the id). */
export interface JournalActor { readonly user: { readonly id: string } }

const ACTION_RE = /^[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*){0,3}$/;
const KEY_RE = /^[a-z][a-z0-9_]{0,39}$/;
/** Keys that name personal data or free text: never stored, whatever the call passes. */
const PERSONAL_KEY = /mail|password|token|secret|phone|address|ip_|_ip$|^ip$|text|body|message|comment|content|bio|reason|note|name|title|label|url|link/i;
const MAX_STRING = 120;
const MAX_ITEMS = 150;
const MAX_KEYS = 20;

function scalar(v: unknown): string | number | boolean | null | undefined {
  if (v === null || typeof v === 'boolean') return v;
  if (typeof v === 'number') return Number.isFinite(v) ? v : undefined;
  if (typeof v === 'string') return v.slice(0, MAX_STRING);
  return undefined;
}

/** The detail as it is stored: scalar values and short arrays of them under plain keys; personal-sounding keys and anything else dropped. */
export function sanitizeDetail(detail: unknown): Record<string, JournalValue> {
  const out: Record<string, JournalValue> = {};
  if (!detail || typeof detail !== 'object' || Array.isArray(detail)) return out;
  for (const [key, value] of Object.entries(detail as Record<string, unknown>)) {
    if (Object.keys(out).length >= MAX_KEYS) break;
    if (!KEY_RE.test(key) || PERSONAL_KEY.test(key)) continue;
    if (Array.isArray(value)) {
      const items = value.slice(0, MAX_ITEMS).map(scalar).filter((x): x is string | number | boolean | null => x !== undefined);
      out[key] = items;
      continue;
    }
    const s = scalar(value);
    if (s !== undefined) out[key] = s;
  }
  return out;
}

/** The request id kept with a line: Vercel's, else none. It identifies a request, never a person. */
export function requestIdOf(request: { readonly headers: { get(name: string): string | null } }): string | null {
  const id = request.headers.get('x-vercel-id') ?? request.headers.get('x-request-id');
  return id ? id.slice(0, 100) : null;
}

/** Records one admin action. Call it after the write succeeded. Never throws, never blocks the answer on an error. Resolves true when the line was stored. */
export async function logAdminAction(actor: JournalActor, input: AdminActionInput): Promise<boolean> {
  try {
    const site = parseSite(input.site);
    if (site === null || !ACTION_RE.test(input.action)) {
      console.error('[admin-journal] refused a malformed entry');
      return false;
    }
    const { error } = await createServiceRoleClient().from('admin_actions').insert({
      admin_id: actor.user.id,
      site_id: site,
      action: input.action,
      target_type: input.targetType ? input.targetType.slice(0, 40) : null,
      target_id: input.targetId === undefined || input.targetId === null ? null : String(input.targetId).slice(0, 200),
      detail: sanitizeDetail(input.detail),
      request_id: input.requestId ?? null,
    });
    if (error) {
      console.error('[admin-journal] insert failed:', error.code ?? 'error');
      return false;
    }
    return true;
  } catch (err) {
    console.error('[admin-journal] insert failed:', err instanceof Error ? err.name : typeof err);
    return false;
  }
}

export interface JournalRow {
  readonly id: number;
  readonly at: string;
  readonly admin_id: string;
  readonly site_id: string;
  readonly action: string;
  readonly target_type: string | null;
  readonly target_id: string | null;
  readonly detail: Record<string, unknown>;
  readonly request_id: string | null;
}

/** The last `limit` lines (200 at most), newest first, optionally of one site. Read-only. Empty with `available: false` when the table is not there yet. */
export async function readJournal(site: SiteId | null, limit = 200): Promise<{ rows: JournalRow[]; available: boolean }> {
  try {
    let q = createServiceRoleClient()
      .from('admin_actions')
      .select('id, at, admin_id, site_id, action, target_type, target_id, detail, request_id')
      .order('id', { ascending: false })
      .limit(Math.min(Math.max(1, Math.floor(limit)), 200));
    if (site !== null) q = q.eq('site_id', site);
    const { data, error } = await q;
    if (error) return { rows: [], available: false };
    return { rows: (data ?? []) as JournalRow[], available: true };
  } catch {
    return { rows: [], available: false };
  }
}

/** The detail of the most recent line of `action` on `targetId` (any site), or null: a later action may need what an earlier one recorded. */
export async function lastActionDetail(action: string, targetId: string): Promise<Record<string, unknown> | null> {
  try {
    const { data, error } = await createServiceRoleClient()
      .from('admin_actions')
      .select('detail')
      .eq('action', action)
      .eq('target_id', targetId)
      .order('id', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error || !data) return null;
    const detail = (data as { detail?: unknown }).detail;
    return detail && typeof detail === 'object' && !Array.isArray(detail) ? (detail as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}
