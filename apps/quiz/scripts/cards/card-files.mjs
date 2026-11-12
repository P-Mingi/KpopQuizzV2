// Bunnyverse Cards lot 2: the pure parts of the owner's script (publish-card-files.mjs), in plain node with no build step so the script and
// the tests share them: what to cut for a subject, the age rule, and the exact-name matcher of the bucket cleanup.
import { MIN_2X, cardBox, halves, pairBox, partSuffix } from './card-geometry.mjs';

/** A subject that fails the age rule (a person in the photo under 18 today or on the photo date) is never cut and never kept. A missing `age` is ok. */
export const ageOk = (s) => s?.age?.ok !== false;

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

/** An exact matcher of the card file names of the known slugs: `<slug>-<fx>-<fy>[-h1|-h2]-1x|2x.webp`. Longest slugs first; the whole name is anchored. */
export function cardFileRegex(slugs) {
  const alt = [...slugs].sort((a, b) => b.length - a.length).map(escapeRe).join('|');
  return new RegExp(`^(${alt || '(?!)'})-(\\d{1,3})-(\\d{1,3})(?:-h([12]))?-(1x|2x)\\.webp$`);
}

/**
 * Which objects of the bucket to propose for deletion. `known`: every slug of subjects.json. `current`: slug -> { group, fx, fy } for each included
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
    const cur = current.get(slug);
    if (!cur) { remove.push({ name, why: 'subject left out (age rule) or without a current photo' }); continue; }
    const part = m[4] ? Number(m[4]) : 0;
    if (cur.group !== (part !== 0)) { remove.push({ name, why: cur.group ? 'old whole-card file of a group' : 'half file of a person' }); continue; }
    if (Number(m[2]) !== cur.fx || Number(m[3]) !== cur.fy) { remove.push({ name, why: `old focal point (now ${cur.fx}/${cur.fy})` }); continue; }
    keep.push(name);
  }
  return { keep, remove };
}
