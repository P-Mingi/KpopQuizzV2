// Bunnyverse Cards lot 2: the pure parts of the owner's script (publish-card-files.mjs), in plain node with no build step so the script and
// the tests share them: what to cut for a subject, the age rule, and the exact-name matcher of the bucket cleanup.
import { MIN_2X, cardBox, halves, pairBox, partSuffix } from './card-geometry.mjs';

/** Only a subject that PASSED the age rule (every person in the photo 18 or older today and on the photo date) is cut and kept. No verdict
 *  (the age check was not run) fails closed, like gen-rebuild-sql.mts, which writes no card without one. */
export const ageOk = (s) => s?.age?.ok === true;

/** A person is `idol`; anything else is a group (a pair of cards). */
export const isGroup = (s) => s.kind !== 'idol';

/**
 * What to cut from a w x h photo for a subject at focal (fx, fy): a person gives one part 0 (the whole 5.5:8.5 card), a group gives parts 1 and 2
 * (the two halves of the one 11:8.5 window). `has2x` per part: only when that part is at least MIN_2X px wide.
 */
export function cutPlan(group, w, h, fx, fy) {
  if (!group) {
    const box = cardBox(w, h, fx, fy);
    return { window: box, parts: [{ part: 0, ...box, cropWidth: box.width, has2x: box.width >= MIN_2X }] };
  }
  const window = pairBox(w, h, fx, fy);
  return { window, parts: halves(window).map((p) => ({ ...p, cropWidth: p.width, has2x: p.width >= MIN_2X })) };
}

/** The bucket file names of one part of a stem: `<stem>-1x.webp` for a whole card, `<stem>-h1-1x.webp` for a half. */
export const partFileName = (stem, part, size) => `${stem}${partSuffix(part)}-${size}.webp`;

const escapeRe = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Lot 3 (one edition, one photo): the stem of a photo's files. Slot 1, the photo of lots 1 and 2, keeps `<slug>-<fx>-<fy>` (its published
 *  files stay valid); a lot 3 photo is `<slug>-s<slot>-<fx>-<fy>`. */
export const stemOf = (slug, slot, fx, fy) => (slot > 1 ? `${slug}-s${slot}-${fx}-${fy}` : `${slug}-${fx}-${fy}`);

/** An exact matcher of the card file names of the known slugs: `<slug>[-s<slot>]-<fx>-<fy>[-h1|-h2]-1x|2x.webp`. Longest slugs first; the
 *  whole name is anchored. Groups: 1 slug, 2 slot (undefined for slot 1), 3 fx, 4 fy, 5 half, 6 size. */
export function cardFileRegex(slugs) {
  const alt = [...slugs].sort((a, b) => b.length - a.length).map(escapeRe).join('|');
  return new RegExp(`^(${alt || '(?!)'})(?:-s([2-6]))?-(\\d{1,3})-(\\d{1,3})(?:-h([12]))?-(1x|2x)\\.webp$`);
}

/**
 * Which objects of the bucket to propose for deletion. `known`: every slug of subjects.json. `current`: slug -> { group, fx, fy } (lot 2) or
 * slug -> [{ slot, group, fx, fy }, ...] (lot 3, one entry per live photo) for each included
 * subject (age ok, with a database row), fx and fy being its current focal point (the stem of its files). `only`: a Set of slugs or null.
 * An object is KEPT only when it is a file of a current stem: the slug is current, the focal point is the current one, and the part is right
 * (a group has halves only, a person a whole card only). Everything else is proposed: the files of excluded subjects, the old whole-card
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
    const part = m[5] ? Number(m[5]) : 0;
    if (cur.group !== (part !== 0)) { remove.push({ name, why: cur.group ? 'old whole-card file of a group' : 'half file of a person' }); continue; }
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
