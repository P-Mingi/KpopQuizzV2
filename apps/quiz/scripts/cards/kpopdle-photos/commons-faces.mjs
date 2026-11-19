// commons-faces.mjs: the pure part of kpopdle-commons.mjs (plain node, no build step, no network, no database, no clock): which Commons photo of the
// cards gives a Kpopdle idol its face, from the verdicts of lane PHOTOCHECK, and the row that goes with it.
//
// An idol of the game gets a Commons face only when ALL of this holds, else it keeps its drawn card (no photo at all, never the old photo):
//   - it has a card subject (the idol's Wikidata id is the subject's qid, exactly one subject) that is a person, active, and not age locked
//     (the age rule of the cards: a subject under 18, or not proven 18 or older, is locked, so its photos never serve);
//   - a photo of that subject is live (status auto or approved), is not marked news only, shows no image of the film KPop Demon Hunters, has a named
//     author and a free Commons licence (cardLicence), a page and an original of Commons, and an original large enough for the 4:5 crop (400 px wide);
//   - PHOTOCHECK's verdict for that photo is OK. RECROP and REPLACE never serve (a RECROP photo only once its new focal point is applied and the
//     verdict file says OK); a photo with no verdict never serves. Among the OK photos the best rank wins (column `rank`, 1 = best, per subject).
// A verdict file without a `rank` column stops the selection with an error (never a silent fallback to the first slot).
import { faceBox } from './face-box.mjs';

export { faceBox };

/** The licences a live photo may carry for the game, as entity_images.license has them (same reading as cardLicence of lib/dle/idol-pictures.ts). */
export function cardLicence(licence) {
  const l = String(licence ?? '').trim();
  if (/\b(NC|ND)\b/i.test(l)) return null;
  if (/^CC0\b/i.test(l)) return 'cc0';
  if (/^public domain\b/i.test(l)) return 'public_domain';
  if (/^CC BY-SA\b/i.test(l)) return 'cc_by_sa';
  if (/^CC BY\b/i.test(l)) return 'cc_by';
  return null;
}

/** The film KPop Demon Hunters must never appear (owner rule): a photo whose page, event or file name speaks of it is out. */
export const KDH_RE = /demon[\s_.-]*hunters?|kpop[\s_.-]*demon|\bhuntrix\b|\bhuntr\/x\b|\bk[\s_.-]?d[\s_.-]?h\b/i;
export const isKdh = (photo) => [photo.source_page, photo.event_name, photo.modified, photo.file_url].some((t) => typeof t === 'string' && KDH_RE.test(decodeSafe(t)));
const decodeSafe = (t) => { try { return decodeURIComponent(t); } catch { return t; } };

/** "File:Name.jpg" of a Commons file page address, or null. */
export function commonsFileOf(page) {
  if (typeof page !== 'string') return null;
  let u;
  try { u = new URL(page); } catch { return null; }
  if (u.protocol !== 'https:' || u.hostname !== 'commons.wikimedia.org') return null;
  const m = /^\/wiki\/(File:.+)$/.exec(u.pathname);
  if (!m) return null;
  const f = decodeSafe(m[1]);
  return f.length <= 300 ? f : null;
}

// ---- the verdict file --------------------------------------------------------------------------------------------------------------------------

/** A CSV text (quotes, doubled quotes, CRLF) as rows of strings. */
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let q = false;
  const t = String(text).replace(/^﻿/, '');
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) {
      if (c === '"') { if (t[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && t[i + 1] === '\n') i++;
      row.push(cell); cell = '';
      if (row.some((x) => x.trim() !== '')) rows.push(row);
      row = [];
    } else cell += c;
  }
  row.push(cell);
  if (row.some((x) => x.trim() !== '')) rows.push(row);
  return rows;
}

const headerKey = (h) => String(h).trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
export const VERDICTS = new Set(['OK', 'RECROP', 'REPLACE']);

/**
 * The verdicts of lane PHOTOCHECK: Map photo id -> { verdict, rank }. Columns (header names read loosely: "photo id" or photo_id or id; verdict; rank).
 * Throws, before anything is chosen, when: a column is missing (a missing `rank` included), a photo id is not a whole number or appears twice,
 * a verdict is not OK, RECROP or REPLACE, or an OK row has no rank that is a whole number from 1 up.
 */
export function parseVerdicts(csv) {
  const rows = parseCsv(csv);
  if (rows.length === 0) throw new Error('the verdict file is empty');
  const head = rows[0].map(headerKey);
  const col = (...names) => head.findIndex((h) => names.includes(h));
  const iId = col('photo_id', 'id', 'photo');
  const iVerdict = col('verdict');
  const iRank = col('rank');
  if (iId < 0) throw new Error('the verdict file has no photo id column (photo_id, "photo id" or id)');
  if (iVerdict < 0) throw new Error('the verdict file has no verdict column');
  if (iRank < 0) throw new Error('the verdict file has no rank column (PHOTOCHECK ranks the OK photos of each subject, 1 = best): selection stopped');
  const out = new Map();
  for (const [n, r] of rows.slice(1).entries()) {
    const line = n + 2;
    const id = Number(String(r[iId] ?? '').trim());
    if (!Number.isInteger(id) || id <= 0) throw new Error(`verdict file line ${line}: the photo id is not a whole number`);
    if (out.has(id)) throw new Error(`verdict file line ${line}: photo ${id} appears twice`);
    const verdict = String(r[iVerdict] ?? '').trim().toUpperCase();
    if (!VERDICTS.has(verdict)) throw new Error(`verdict file line ${line}: photo ${id} has the verdict "${verdict}" (OK, RECROP or REPLACE)`);
    const rawRank = String(r[iRank] ?? '').trim();
    let rank = null;
    if (verdict === 'OK') {
      rank = /^\d{1,4}$/.test(rawRank) ? Number(rawRank) : NaN;
      if (!Number.isInteger(rank) || rank < 1) throw new Error(`verdict file line ${line}: photo ${id} is OK but its rank is "${rawRank}" (a whole number from 1 up)`);
    } else if (/^\d{1,4}$/.test(rawRank)) rank = Number(rawRank);
    out.set(id, { verdict, rank });
  }
  return out;
}

// ---- the selection ---------------------------------------------------------------------------------------------------------------------------

/** Why an idol keeps its drawn card (words for the report). */
export const KEEP = {
  no_subject: 'no card subject carries its Wikidata id',
  ambiguous_subject: 'more than one card subject carries its Wikidata id',
  not_a_person: 'its card subject is not a person',
  inactive: 'its card subject is not active',
  age_locked: 'its card subject is age locked (the age rule of the cards)',
  no_live_photo: 'no live card photo of its subject',
  no_ok_verdict: 'no photo of its subject has the verdict OK',
  no_usable_photo: 'no OK photo is usable (author, free licence, Commons page, size)',
};

const LIVE = new Set(['auto', 'approved']);

/** Why one photo cannot give a face, or null when it can. `box` is the 4:5 window of the original at the photo's focal point. */
export function photoProblem(p) {
  if (!LIVE.has(p.status)) return 'not live';
  if (p.news_only === true) return 'news only';
  if (isKdh(p)) return 'KPop Demon Hunters';
  if (!p.sha1 || typeof p.file_url !== 'string' || !/^https:\/\/upload\.wikimedia\.org\//.test(p.file_url)) return 'no Commons original';
  if (commonsFileOf(p.source_page) === null) return 'no Commons page';
  if (cardLicence(p.licence) === null) return 'licence not free';
  if (!p.author || !String(p.author).trim() || String(p.author).trim().length > 200) return 'no author';
  const w = Number(p.source_width);
  const h = Number(p.source_height);
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return 'no size';
  if (faceBox(w, h, Number(p.focal_x), Number(p.focal_y)).width < 400) return 'original too small';
  return null;
}

/**
 * idols: [{ idol_id, name, group, qid }]; entities: cards_entities rows { id, kind, qid, active, age_lock }; photos: cards_photos rows; verdicts: parseVerdicts().
 * Returns { chosen: [{ idol, entity, photo, rank }], keep: [{ idol, why, detail }] }, one entry per idol, in the order of `idols`.
 */
export function selectFaces({ idols, entities, photos, verdicts }) {
  if (!(verdicts instanceof Map)) throw new Error('selectFaces needs the verdicts of PHOTOCHECK (parseVerdicts)');
  const byQid = new Map();
  for (const e of entities) if (e.qid) byQid.set(e.qid, [...(byQid.get(e.qid) ?? []), e]);
  const photosOf = new Map();
  for (const p of photos) photosOf.set(p.entity_id, [...(photosOf.get(p.entity_id) ?? []), p]);
  const chosen = [];
  const keep = [];
  for (const idol of idols) {
    const ents = idol.qid ? byQid.get(idol.qid) ?? [] : [];
    if (ents.length === 0) { keep.push({ idol, why: 'no_subject' }); continue; }
    if (ents.length > 1) { keep.push({ idol, why: 'ambiguous_subject' }); continue; }
    const entity = ents[0];
    if (entity.kind !== 'idol') { keep.push({ idol, why: 'not_a_person' }); continue; }
    if (entity.active !== true) { keep.push({ idol, why: 'inactive' }); continue; }
    if (entity.age_lock !== false) { keep.push({ idol, why: 'age_locked' }); continue; } // anything but a plain false (true, null, missing) fails closed
    const mine = (photosOf.get(entity.id) ?? []).filter((p) => LIVE.has(p.status));
    if (mine.length === 0) { keep.push({ idol, why: 'no_live_photo' }); continue; }
    const ok = mine.filter((p) => verdicts.get(p.id)?.verdict === 'OK');
    if (ok.length === 0) { keep.push({ idol, why: 'no_ok_verdict' }); continue; }
    // The best rank first; a tie (not expected) is broken by the lowest slot, then the lowest id, so the pick never moves.
    const ranked = ok.slice().sort((a, b) => verdicts.get(a.id).rank - verdicts.get(b.id).rank || (a.slot ?? 0) - (b.slot ?? 0) || a.id - b.id);
    const usable = ranked.find((p) => photoProblem(p) === null);
    if (!usable) { keep.push({ idol, why: 'no_usable_photo', detail: [...new Set(ranked.map(photoProblem))].join(', ') }); continue; }
    chosen.push({ idol, entity, photo: usable, rank: verdicts.get(usable.id).rank });
  }
  return { chosen, keep };
}

/** The entity_images fields of a chosen photo (the credit is the Commons one: source page, author, licence and its address, the file). */
export function faceFields(photo, paths) {
  const license = cardLicence(photo.licence);
  const url = typeof photo.licence_url === 'string' && /^https:\/\//.test(photo.licence_url) && photo.licence_url.length <= 2000 ? photo.licence_url : null;
  const note = `Commons photo of the cards, cropped to 4:5 around the subject${photo.modified ? `; changes by the uploader: ${String(photo.modified).slice(0, 200)}` : ''}.`;
  return {
    path: paths.p1, width: 400, height: 500, thumb_path: paths.pt, focal_x: 50, focal_y: 50,
    source_url: photo.source_page, author: String(photo.author).trim(), license, license_url: url,
    commons_file: commonsFileOf(photo.source_page), license_verified: true, license_note: note.slice(0, 500),
  };
}

/** The rows the old script wrote (licence "other", source not recorded): the ones this run may remove for an idol that gets no Commons face. */
export const OLD_NOTE = /^Photo (already used on kpopquiz\.org|supplied by the owner)/;
export const isOldRow = (row) => row.license === 'other' && typeof row.license_note === 'string' && OLD_NOTE.test(row.license_note);
