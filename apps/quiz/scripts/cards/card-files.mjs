// Bunnyverse Cards lot 2: the pure parts of the owner's script (publish-card-files.mjs), in plain node with no build step so the script and
// the tests share them: what to cut for a subject, the age rule, and the exact-name matcher of the bucket cleanup.
import { MIN_2X, cardBox, groupBox, panoSuffix, partSuffix, splitParts } from './card-geometry.mjs';

/** Only a subject that PASSED the age rule (every person in the photo 18 or older today and on the photo date) is cut and kept. No verdict
 *  (the age check was not run) fails closed, like gen-rebuild-sql.mts, which writes no card without one. */
export const ageOk = (s) => s?.age?.ok === true;

/** A person is `idol`; anything else is a group (a pair of cards). */
export const isGroup = (s) => s.kind !== 'idol';

/**
 * What to cut from a w x h photo for a subject at focal (fx, fy): a person gives one part 0 (the whole 5.5:8.5 card), a group gives its `parts`
 * (2: the two halves of the 11:8.5 window, as before lot 7; 3: the thirds of the 16.5:8.5 window) and the panorama, the whole window.
 * `has2x` per part: only when that part is at least MIN_2X px wide; the panorama has its 2x only when every part has it. A person has no panorama.
 */
export function cutPlan(group, w, h, fx, fy, parts = 2) {
  if (!group) {
    const box = cardBox(w, h, fx, fy);
    return { window: box, parts: [{ part: 0, ...box, cropWidth: box.width, has2x: box.width >= MIN_2X }], pano: null };
  }
  const n = parts === 3 ? 3 : 2;
  const window = groupBox(w, h, n, fx, fy);
  const list = splitParts(window, n).map((p) => ({ ...p, cropWidth: p.width, has2x: p.width >= MIN_2X }));
  return { window, parts: list, pano: { ...window, has2x: list.every((p) => p.has2x) } };
}

/** The bucket file names of one part of a stem: `<stem>-1x.webp` for a whole card, `<stem>-h1-1x.webp` for a half, `<stem>-t1-1x.webp` for a third. */
export const partFileName = (stem, part, size, parts = 2) => `${stem}${partSuffix(part, parts)}-${size}.webp`;

/** The panorama file of a stem: `<stem>-p2-1x.webp` (a photo in 2 cards), `<stem>-p3-2x.webp` (in 3). */
export const panoFileName = (stem, parts, size) => `${stem}${panoSuffix(parts)}-${size}.webp`;

/**
 * Lot 7: what to do with one live photo row. `row` carries the columns of cards_photos read with select=*: a database before 118 has no
 * `parts`, `file_parts` or `file_pano` (the photo is then a pair, as today, and no panorama is cut). Returns { parts, action } with action
 * 'skip' (the files match the focal point and the parts, and the panorama exists), 'pano' (a group cut before lot 7 at its current focal
 * point: only its panorama is missing, the parts are not re-uploaded) or 'full'.
 */
export function fileAction(row, stem, group) {
  const hasParts = 'parts' in row;
  const parts = group && hasParts && row.parts === 3 ? 3 : 2;
  const fileParts = 'file_parts' in row && row.file_parts === 3 ? 3 : 2;
  const matches = row.storage_path === stem && row.file_focal_x === row.focal_x && row.file_focal_y === row.focal_y && (!group || fileParts === parts);
  if (!matches) return { parts, action: 'full' };
  if (!group || !('file_pano' in row) || row.file_pano === true) return { parts, action: 'skip' };
  return { parts, action: 'pano' };
}

/** The PATCH body that closes a photo: the stem and the focal point, plus `file_parts` and `file_pano` only for the columns the database has
 *  (`has` = { fileParts, filePano }, read from the row). A person has no panorama: file_pano false. */
export function filePatch({ stem, fx, fy, parts, pano }, has = { fileParts: true, filePano: true }) {
  const body = { storage_path: stem, file_focal_x: fx, file_focal_y: fy };
  if (has.fileParts) body.file_parts = parts === 3 ? 3 : 2;
  if (has.filePano) body.file_pano = pano === true;
  return body;
}

const escapeRe = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Lot 3 (one edition, one photo): the stem of a photo's files. Slot 1, the photo of lots 1 and 2, keeps `<slug>-<fx>-<fy>` (its published
 *  files stay valid); a lot 3 photo is `<slug>-s<slot>-<fx>-<fy>`. */
export const stemOf = (slug, slot, fx, fy) => (slot > 1 ? `${slug}-s${slot}-${fx}-${fy}` : `${slug}-${fx}-${fy}`);

/** An exact matcher of the card file names of the known slugs: `<slug>[-s<slot>]-<fx>-<fy>[-h1|-h2|-t1..-t3|-p2|-p3]-1x|2x.webp`. Longest slugs first; the
 *  whole name is anchored. Groups: 1 slug, 2 slot (undefined for slot 1), 3 fx, 4 fy, 5 half (only for -h; use fileKind for the rest), 6 size. */
/** What a matched card file is: 'whole', 'half' / 'third' (with its part) or 'pano' (with the number of cards it was cut for). */
export function fileKind(m) {
  const t = /-(?:([ht])([123])|p([23]))-(?:1x|2x)\.webp$/.exec(m[0]);
  if (!t) return { kind: 'whole', part: 0 };
  if (t[3]) return { kind: 'pano', parts: Number(t[3]) };
  return { kind: t[1] === 'h' ? 'half' : 'third', part: Number(t[2]) };
}

export function cardFileRegex(slugs) {
  const alt = [...slugs].sort((a, b) => b.length - a.length).map(escapeRe).join('|');
  return new RegExp(`^(${alt || '(?!)'})(?:-s([2-6]))?-(\\d{1,3})-(\\d{1,3})(?:-h([12])|-t[123]|-p[23])?-(1x|2x)\\.webp$`);
}

/**
 * Which objects of the bucket to propose for deletion. `known`: every slug of subjects.json. `current`: slug -> { group, fx, fy, parts? } (lot 2; `parts` 2 or 3, 2 when absent, lot 7) or
 * slug -> [{ slot, group, fx, fy }, ...] (lot 3, one entry per live photo) for each included
 * subject (age ok, with a database row), fx and fy being its current focal point (the stem of its files). `only`: a Set of slugs or null.
 * An object is KEPT only when it is a file of a current stem: the slug is current, the focal point is the current one, and the part is right
 * (a group in 2 has its halves and `-p2` only, a group in 3 its thirds and `-p3` only, a person a whole card only). Everything else is proposed: the files of excluded subjects, the old whole-card
 * files of a group, the files at an old focal point, unknown names. With `only`, only the objects of those slugs are considered.
 * `skip`: slugs never to touch (no database row to read the focal point from).
 */
export function planRemovals(names, { known, current, only = null, skip = new Set() }) {
  const re = cardFileRegex(known);
  const keep = [];
  const remove = [];
  for (const name of names) {
    const m = re.exec(name);
    if (!m) {
      if (!only) remove.push({ name, why: 'not a card file of a known subject' });
      continue;
    }
    const slug = m[1];
    if (only && !only.has(slug)) continue;
    if (skip.has(slug)) continue;
    const got = current.get(slug);
    if (!got) { remove.push({ name, why: 'subject left out (age rule) or without a current photo' }); continue; }
    // Lot 3: a subject has one entry per live photo ({ slot, group, fx, fy }); lot 2 passed one object (its slot 1).
    const list = Array.isArray(got) ? got : [{ slot: 1, ...got }];
    const slot = m[2] ? Number(m[2]) : 1;
    const cur = list.find((x) => (x.slot ?? 1) === slot);
    if (!cur) { remove.push({ name, why: `photo ${slot} of this subject is no longer live (refused, removed or dropped)` }); continue; }
    const k = fileKind(m);
    if (cur.group !== (k.kind !== 'whole')) {
      remove.push({ name, why: cur.group ? 'old whole-card file of a group' : k.kind === 'half' ? 'half file of a person' : k.kind === 'pano' ? 'panorama file of a person' : 'part file of a person' });
      continue;
    }
    const now = cur.parts === 3 ? 3 : 2;
    if (k.kind === 'half' && now === 3) { remove.push({ name, why: 'half file of a photo now in 3 cards' }); continue; }
    if (k.kind === 'third' && now === 2) { remove.push({ name, why: 'third file of a photo now in 2 cards' }); continue; }
    if (k.kind === 'pano' && k.parts !== now) { remove.push({ name, why: `panorama file for ${k.parts} cards of a photo now in ${now}` }); continue; }
    if (Number(m[3]) !== cur.fx || Number(m[4]) !== cur.fy) { remove.push({ name, why: `old focal point (now ${cur.fx}/${cur.fy})` }); continue; }
    keep.push(name);
  }
  return { keep, remove };
}

/**
 * Lot 6 (the photo harvest): lot 3's photos.json and lot 6's (docs/design/cards/data/lot6/photos.json) read as one. A subject of lot 6 that is
 * already in lot 3 (a person who is a subject of both, found by the same slug) gains its new photos after the old ones (lot 6 slots start after
 * the lot 3 ones); a new subject is added whole; a locked subject has no photo and is only a left-out line. No file is read here.
 */
export function mergePhotoFiles(base, extra) {
  if (!extra) return base;
  const subjects = base.subjects.map((s) => ({ ...s, photos: [...s.photos] }));
  for (const x of extra.subjects) {
    if (!x.photos || x.photos.length === 0) continue;
    const at = subjects.find((s) => s.slug === x.slug);
    if (at) at.photos.push(...x.photos);
    else subjects.push({ slug: x.slug, name: x.name, kind: x.kind, end_year: x.end_year ?? null, returning: false, shortfall: x.shortfall ?? null, photos: [...x.photos] });
  }
  const seen = new Set(base.left_out.map((l) => l.slug));
  return { ...base, subjects, left_out: [...base.left_out, ...extra.left_out.filter((l) => !seen.has(l.slug))] };
}

/** Statuses worth another try, for a Commons download and for every request to the Supabase project: a timeout, the rate limit, a busy
 *  server, and the passing errors of Cloudflare in front of Supabase (520 to 524; lot CPUB-RETRY: a 520 on one upload stopped the first
 *  run of cards-publish). A 400, 401, 403, 404, 409 or 413 is never tried again: the same request would get the same answer. */
export const RETRY_STATUS = new Set([408, 429, 500, 502, 503, 504, 520, 521, 522, 523, 524]);

/** The wait in ms before try `n + 1` of a download: the server's Retry-After in seconds (at most 60) when it sends a number, else 5 s after the
 *  first try and 20 s after the second. */
export function retryWait(n, retryAfter) {
  const t = retryAfter === null || retryAfter === undefined ? '' : String(retryAfter).trim();
  if (/^\d+$/.test(t)) return Math.min(Number(t), 60) * 1000;
  return n === 1 ? 5000 : 20000;
}

const realSleep = (ms) => new Promise((ok) => setTimeout(ok, ms));

/** One request with its tries (lot CPUB-RETRY): `doFetch(n)` is called for try n (1, 2, ...) and must send the same idempotent request each
 *  time (an upload with x-upsert, a PATCH of the same values, a read, an upsert). Tried again on a status of RETRY_STATUS and when doFetch
 *  throws (the network), after retryWait (the server's Retry-After, at most 60 s). Returns the last answer, ok or not (the caller reads its
 *  status); throws the last network error when every try threw. Pure: the fetch and the sleep are given. */
export async function fetchRetry(doFetch, { tries = 4, sleep = realSleep } = {}) {
  for (let n = 1; ; n++) {
    let r;
    try {
      r = await doFetch(n);
    } catch (e) {
      if (n >= tries) throw e;
      await sleep(retryWait(n, null));
      continue;
    }
    if (r.ok || !RETRY_STATUS.has(r.status) || n >= tries) return r;
    const retryAfter = r.headers?.get?.('retry-after') ?? null;
    try { await r.body?.cancel?.(); } catch { /* the body of an answer tried again is not read */ }
    await sleep(retryWait(n, retryAfter));
  }
}
