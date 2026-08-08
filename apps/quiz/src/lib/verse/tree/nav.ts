// V-FOUNDATION F1 Phase E - the curated space MENU (F3 / lean-nav amendment L-071). The
// fandom-proven shape: max 5 TOP entries, max 3 LEVELS, max 10 CHILDREN per node. The caps
// are enforced HERE (the table stores an opaque jsonb tree; arbitrary-depth caps cannot be
// a cheap CHECK, the same call 139 made). A node is a label + an optional target (a page or
// an auto-index) + optional children; a node with children and no target is a pure menu.

import type { SupabaseClient } from '@supabase/supabase-js';

export const TOP_MAX = 5;
export const LEVEL_MAX = 3;
export const CHILD_MAX = 10;
const LABEL_MAX = 40;

export type NavRef =
  | { kind: 'page'; slug: string }
  | { kind: 'index'; key: string };   // an auto-generated index (e.g. tracks A-Z), never hand-maintained

export interface NavNode {
  label: string;
  ref?: NavRef;
  children?: NavNode[];
}

export interface NavValidation { ok: boolean; tree?: NavNode[]; errors: string[] }

function validateNode(raw: unknown, level: number, errors: string[]): NavNode | null {
  if (raw == null || typeof raw !== 'object') { errors.push('Each menu entry must be an object.'); return null; }
  const r = raw as Record<string, unknown>;
  const label = typeof r.label === 'string' ? r.label.trim() : '';
  if (!label) { errors.push('Every menu entry needs a label.'); return null; }
  if (label.length > LABEL_MAX) { errors.push(`Menu label "${label.slice(0, 12)}..." is too long (max ${LABEL_MAX}).`); return null; }

  const node: NavNode = { label: label.slice(0, LABEL_MAX) };

  if (r.ref != null && typeof r.ref === 'object') {
    const ref = r.ref as Record<string, unknown>;
    if (ref.kind === 'page' && typeof ref.slug === 'string' && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(ref.slug)) node.ref = { kind: 'page', slug: ref.slug };
    else if (ref.kind === 'index' && typeof ref.key === 'string' && ref.key.trim()) node.ref = { kind: 'index', key: String(ref.key).trim().slice(0, 40) };
    else { errors.push(`"${label}" has an invalid target.`); return null; }
  }

  if (Array.isArray(r.children) && r.children.length > 0) {
    if (level >= LEVEL_MAX) { errors.push(`"${label}" is too deep - the menu is capped at ${LEVEL_MAX} levels.`); return null; }
    if (r.children.length > CHILD_MAX) { errors.push(`"${label}" has too many children (max ${CHILD_MAX}).`); return null; }
    const kids: NavNode[] = [];
    for (const c of r.children) { const k = validateNode(c, level + 1, errors); if (k) kids.push(k); }
    if (kids.length) node.children = kids;
  }

  if (!node.ref && !node.children) { errors.push(`"${label}" must link to a page/index or contain children.`); return null; }
  return node;
}

/** Validate + normalize a raw nav tree against the 5x3x10 caps. Pure. */
export function validateNavTree(raw: unknown): NavValidation {
  const errors: string[] = [];
  if (!Array.isArray(raw)) return { ok: false, errors: ['The menu must be a list of entries.'] };
  if (raw.length > TOP_MAX) errors.push(`Too many top-level entries (max ${TOP_MAX}).`);
  const tree: NavNode[] = [];
  for (const n of raw.slice(0, TOP_MAX + 1)) { const node = validateNode(n, 1, errors); if (node) tree.push(node); }
  if (errors.length) return { ok: false, errors };
  return { ok: true, tree: tree.slice(0, TOP_MAX), errors: [] };
}

export async function getNavMenu(db: SupabaseClient, spaceId: number): Promise<NavNode[] | null> {
  const { data } = await db.from('nav_menus').select('tree').eq('space_id', spaceId).maybeSingle();
  const tree = (data as { tree?: unknown } | null)?.tree;
  if (!Array.isArray(tree) || tree.length === 0) return null;
  const res = validateNavTree(tree);
  return res.ok && res.tree && res.tree.length ? res.tree : null;
}

export async function saveNavMenu(svc: SupabaseClient, spaceId: number, rawTree: unknown): Promise<{ ok: boolean; errors: string[] }> {
  const res = validateNavTree(rawTree);
  if (!res.ok) return { ok: false, errors: res.errors };
  const { error } = await svc.from('nav_menus').upsert(
    { space_id: spaceId, tree: res.tree ?? [], updated_at: new Date().toISOString() }, { onConflict: 'space_id' },
  );
  return error ? { ok: false, errors: [error.message] } : { ok: true, errors: [] };
}
