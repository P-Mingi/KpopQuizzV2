import type { Placements, SubjectKind, Tier, TierListItem } from './types';

// Encode a whole board into a URL-safe base64 param so a share link and the OG
// image route need NO database: the state travels in the URL. Kept compact (short
// keys, only ranked items carried) so the link stays well under browser URL limits
// for a normal board. Isomorphic (no server imports), so the same code runs in the
// client, the edge OG route, and unit tests. Phase 3 adds an optional subject (s)
// so a shared board can be published against its bank subject; older links without
// it decode to a blank subject, so the format stays backward compatible.

export interface SharedBoard {
  title: string;
  tiers: Tier[];
  placements: Placements;
  items: TierListItem[];
  subjectGroupId?: number | null;
  subjectKind?: SubjectKind;
}

// Compact wire shape: t=title, k=tiers[[label,color]], p=placements,
// i=items[[id,name,imageOrEmpty]], s=[subjectGroupId|null, subjectKind] (optional).
interface Wire {
  t: string;
  k: [string, string][];
  p: Record<string, string[]>;
  i: [string, string, string][];
  s?: [number | null, SubjectKind];
}

// Bound the items carried in a link so even a large board (the general all-bank
// board can hold ~120 idols) stays well under browser/server URL limits. The OG
// card only ever draws a few faces per tier, and a Challenge reopens a playable
// set, so a cap loses nothing important. A board past this many carried items has
// its list truncated (ranked items are prioritised in the default link).
export const CARRY_CAP = 80;

function toBase64Url(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  const b64 = typeof btoa === 'function' ? btoa(bin) : Buffer.from(bytes).toString('base64');
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function fromBase64Url(s: string): Uint8Array {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  const bin = typeof atob === 'function' ? atob(b64) : Buffer.from(b64, 'base64').toString('binary');
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out;
}

export function encodeBoard(board: SharedBoard, opts?: { allItems?: boolean }): string {
  // Default: carry only items placed on a tier (unranked cards do not need to
  // reach the share card / OG image), keeping the link short. allItems:true (for
  // a Challenge link) carries the whole set so a friend reopens the same items on
  // an empty board.
  const ranked = new Set<string>();
  const p: Record<string, string[]> = {};
  for (const [bucket, ids] of Object.entries(board.placements)) {
    if (bucket === 'unranked' || ids.length === 0) continue;
    p[bucket] = ids;
    for (const id of ids) ranked.add(id);
  }
  // Default link carries ranked items (prioritised) first; the challenge link
  // (allItems) carries the whole set. Both are capped at CARRY_CAP so an oversized
  // general board cannot blow the URL length.
  const base = opts?.allItems ? board.items : board.items.filter((it) => ranked.has(it.id));
  const carried = base.slice(0, CARRY_CAP);
  const wire: Wire = {
    t: board.title,
    k: board.tiers.map((tier) => [tier.label, tier.color]),
    p: opts?.allItems ? {} : p,
    i: carried.map((it) => [it.id, it.name, it.image_url ?? '']),
  };
  if (board.subjectKind && board.subjectKind !== 'blank') {
    wire.s = [board.subjectGroupId ?? null, board.subjectKind];
  }
  const json = JSON.stringify(wire);
  return toBase64Url(new TextEncoder().encode(json));
}

export function decodeBoard(param: string): SharedBoard | null {
  try {
    const json = new TextDecoder().decode(fromBase64Url(param));
    const w = JSON.parse(json) as Wire;
    if (!w || typeof w.t !== 'string' || !Array.isArray(w.k) || !Array.isArray(w.i)) return null;
    return {
      title: w.t,
      tiers: w.k.map(([label, color], ord) => ({ label, color, ord })),
      placements: w.p ?? {},
      items: w.i.map(([id, name, image]) => ({ id, name, image_url: image || null, kind: 'custom' as const })),
      subjectGroupId: w.s ? w.s[0] : null,
      subjectKind: w.s ? w.s[1] : 'blank',
    };
  } catch {
    return null;
  }
}
