// Bunnyverse Cards lot 6 (the photo harvest, integrator brief 2026-11-16): the pure rules of scripts/cards/verify-harvest.mts.
// It reuses lot 3's checks (photo-checks.ts: licence, author, deletion request, file type, open licence review, news only, dates,
// sameOccasion, six at most) and the age rule of lot 2 (age-rule.ts), and adds what lot 6 asks:
//   - a person under 18 today gets no photo at all; a group with a current member under 18, or with a member whose birth date is unknown
//     or unconfirmed, gets no photo (both are LOCKED: the binder shows a pocket, the admin knows the opening month);
//   - a group photo needs the group's private lineup record (groups/<slug>.json) saying the lineup is complete, every member listed in it
//     with a people row: without it, a member under 18 the research missed could be in the frame (ORCH, 2026-11-16);
//   - an idol photo with anyone else in the frame (people_visible > 1) is pending at best, and out when any named person is under 18 on
//     the photo date; the age rule runs on each photo's date from the PRIVATE people files;
//   - the photos already in the game (lot 3's photos.json) are never proposed again: the same page or sha1 is out, sameOccasion is checked
//     against them, and they count among the six slots of a subject.
// Pure: no file, no network, no clock (today is an argument). The people files hold birth dates and stay outside the repository; nothing
// here writes one anywhere (the outputs carry verdicts, credits and counts; the opening month goes to the private locked.md only).
import { ageVerdict, dateRange, eighteenthBirthday, type AgeReason, type DatePrecision, type LineupPerson } from './age-rule';
import { plannedEditions, type Photo3 } from './catalog3-sql';
import { cropOf, sameOccasion, sourceChecks, type Candidate, type CandidateFile, type CheckedPhoto, type CommonsInfo, type Status } from './photo-checks';

// ---- inputs ----

export interface HarvestSubject {
  slug: string; kind: 'idol' | 'group'; name: string; qid: string | null; group: string | null; idol_id: number | null;
  why: 'kpopdle' | 'minor-group' | 'group';
}
export interface Membership {
  group: string; joined: string | null; joined_precision?: DatePrecision | null; left: string | null; left_precision?: DatePrecision | null; current: boolean;
}
/** One row of $HOME/kpq-o1/notes/cards-lot6/people/<lane>.json (PRIVATE: it holds birth dates). */
export interface PrivatePerson {
  qid: string; name: string; birth_date: string | null; birth_precision: DatePrecision | null;
  birth_sources?: Array<{ site: string; value: string; ref?: string }>; birth_confirmed: boolean; memberships: Membership[];
}
/** What lot 3's photos.json holds for a photo already in the game. */
export interface ExistingPhoto {
  slot: number; status: Status; page: string; sha1: string | null; date: string; event: string | null; width: number; height: number;
  stage?: boolean; quality?: number;
}
export interface Lot3Subject { slug: string; kind: 'idol' | 'group'; photos: ExistingPhoto[] }
/** One file $HOME/kpq-o1/notes/cards-lot6/groups/<slug>.json (PRIVATE, beside the people files): the researcher's statement that `members`
 *  (QIDs, current and former) is the WHOLE lineup of the group, read in Wikidata and checked against English Wikipedia (`sources`).
 *  A group photo needs it (ORCH, 2026-11-16): without a complete lineup a member under 18 the research missed could be in the frame. */
export interface GroupLineup { slug: string; complete: boolean; members: string[]; sources?: string[] }

// ---- people ----

const COARSE: Record<DatePrecision, number> = { day: 0, month: 1, year: 2 };
const norm = (s: string): string => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9ㄱ-힝]+/g, '');

/** Every people file merged by QID. Two rows of one person that disagree on the birth day make the date unconfirmed (and the latest day is
 *  kept: a minor shown by any row stays shown). A date is confirmed when no row disagrees and a row says so, or two sites give that day. */
export function mergePeople(rows: PrivatePerson[]): Map<string, PrivatePerson> {
  const by = new Map<string, PrivatePerson[]>();
  for (const r of rows) {
    const key = r.qid && /^Q\d+$/.test(r.qid) ? r.qid : `name:${norm(r.name)}`;
    by.set(key, [...(by.get(key) ?? []), r]);
  }
  const out = new Map<string, PrivatePerson>();
  for (const [key, list] of by) {
    const dated = list.filter((r) => r.birth_date);
    const days = [...new Set(dated.map((r) => r.birth_date as string))].sort();
    let birth_date: string | null = null;
    let birth_precision: DatePrecision | null = null;
    let birth_confirmed = false;
    if (days.length > 0) {
      birth_date = days[days.length - 1]!;
      birth_precision = dated.filter((r) => r.birth_date === birth_date).map((r) => r.birth_precision ?? 'day').sort((a, b) => COARSE[b] - COARSE[a])[0]!;
      if (days.length === 1) {
        const sites = new Set(list.flatMap((r) => (r.birth_sources ?? []).filter((s) => s.value === birth_date).map((s) => s.site)));
        birth_confirmed = list.some((r) => r.birth_confirmed) || sites.size >= 2;
      }
    }
    // one membership a group: joined the earliest (null: from the start), left the latest (null: never), current when any row says so
    const groups = new Map<string, Membership[]>();
    for (const m of list.flatMap((r) => r.memberships ?? [])) groups.set(m.group, [...(groups.get(m.group) ?? []), m]);
    const memberships: Membership[] = [...groups].map(([group, ms]) => {
      const joinedAny = ms.some((m) => m.joined == null);
      const leftAny = ms.some((m) => m.left == null);
      const js = ms.filter((m) => m.joined != null).sort((a, b) => (a.joined as string).localeCompare(b.joined as string));
      const ls = ms.filter((m) => m.left != null).sort((a, b) => (b.left as string).localeCompare(a.left as string));
      return {
        group, joined: joinedAny ? null : js[0]!.joined, joined_precision: joinedAny ? null : (js[0]!.joined_precision ?? 'day'),
        left: leftAny ? null : ls[0]!.left, left_precision: leftAny ? null : (ls[0]!.left_precision ?? 'day'), current: ms.some((m) => m.current),
      };
    });
    out.set(key, {
      qid: key.startsWith('Q') ? key : '', name: list[0]!.name, birth_date, birth_precision, birth_sources: list.flatMap((r) => r.birth_sources ?? []),
      birth_confirmed, memberships,
    });
  }
  return out;
}

const lineupOf = (p: PrivatePerson, m: Membership | null): LineupPerson => ({
  birth_date: p.birth_date, birth_precision: p.birth_precision, birth_confirmed: p.birth_confirmed,
  joined: m ? m.joined : null, joined_precision: m?.joined_precision ?? null, left: m ? m.left : null, left_precision: m?.left_precision ?? null,
  current: m ? m.current : true,
});

/** The people of a group: everyone with a membership of it, as the age rule reads them. */
export function groupLineup(slug: string, people: Map<string, PrivatePerson>): LineupPerson[] {
  const out: LineupPerson[] = [];
  for (const p of people.values()) {
    const m = p.memberships.find((x) => x.group === slug);
    if (m) out.push(lineupOf(p, m));
  }
  return out;
}

/** True only when the group's lineup record says complete AND every member it lists has a people row with a membership of this group. */
export function lineupComplete(slug: string, groups: Map<string, GroupLineup> | undefined, people: Map<string, PrivatePerson>): boolean {
  const rec = groups?.get(slug);
  if (!rec || rec.complete !== true || rec.members.length === 0) return false;
  return rec.members.every((q) => people.get(q)?.memberships.some((m) => m.group === slug) === true);
}

const groupNames = (slug: string, people: Map<string, PrivatePerson>): Set<string> =>
  new Set([...people.values()].filter((p) => p.memberships.some((m) => m.group === slug)).flatMap((p) => [norm(p.name), p.qid]));

// ---- the lock ----

/** A locked subject has no photo and shows as a pocket. `opens` is the month (YYYY-MM) the person, or the group's youngest, turns 18:
 *  PRIVATE, it reaches locked.md only; null when no birth date is known. */
export type Lock = { locked: false } | { locked: true; opens: string | null; cause: 'minor' | 'unknown_birth' | 'no_member' };

const monthOf = (day: number): string => new Date(day * 86_400_000).toISOString().slice(0, 7);
const opening = (p: LineupPerson): string | null => {
  const r = dateRange(p.birth_date, p.birth_precision);
  return r ? monthOf(eighteenthBirthday(r[1])) : null;
};
/** Adult today with a confirmed date (the age rule on today), minor, or unknown (no date, or one source only). */
function personState(p: LineupPerson, today: string): 'adult' | 'minor' | 'unknown' {
  const v = ageVerdict({ kind: 'idol', photo_date: today, photo_precision: 'day', lineup_complete: true, people: [{ ...p, joined: null, left: null, current: true }] }, today);
  if (v.ok) return 'adult';
  return v.reason === 'minor_today' || v.reason === 'minor_at_photo' ? 'minor' : 'unknown';
}

export function lockOfPerson(p: PrivatePerson | undefined, today: string): Lock {
  if (!p) return { locked: true, opens: null, cause: 'unknown_birth' };
  const lp = lineupOf(p, null);
  const st = personState(lp, today);
  if (st === 'adult') return { locked: false };
  return { locked: true, opens: opening(lp), cause: st === 'minor' ? 'minor' : 'unknown_birth' };
}

/** A group is locked while any current member is under 18 or has no confirmed birth date, or when no member is known at all. */
export function lockOfGroup(slug: string, people: Map<string, PrivatePerson>, today: string): Lock {
  const members = groupLineup(slug, people).filter((m) => m.current);
  if (members.length === 0) return { locked: true, opens: null, cause: 'no_member' };
  const states = members.map((m) => personState(m, today));
  if (states.every((s) => s === 'adult')) return { locked: false };
  const opens = members.map(opening);
  return {
    locked: true, opens: opens.some((o) => o == null) ? null : (opens as string[]).sort().at(-1) ?? null,
    cause: states.includes('minor') ? 'minor' : 'unknown_birth',
  };
}

const lockOf = (s: HarvestSubject, people: Map<string, PrivatePerson>, today: string): Lock =>
  s.kind === 'group' ? lockOfGroup(s.slug, people, today) : lockOfPerson(people.get(s.qid ?? ''), today);

// ---- one subject ----

const pageKey = (page: string): string => {
  try { return decodeURIComponent(page).replace(/ /g, '_'); } catch { return page.replace(/ /g, '_'); }
};

export interface HarvestInput {
  subject: HarvestSubject; lock: Lock; existing: ExistingPhoto[]; candidates: Candidate[]; info: Map<string, CommonsInfo>;
  people: Map<string, PrivatePerson>; today: string;
  /** The private lineup records (groups/<slug>.json); a group photo is out without a complete one. */
  groups?: Map<string, GroupLineup> | undefined;
  /** Pages and sha1 already used by an earlier subject of this run or by any photo of lot 3 (a file is one photo of one subject). */
  usedPages: Set<string>; usedSha1: Set<string>;
}

const findPerson = (token: string, people: Map<string, PrivatePerson>): PrivatePerson | undefined => {
  const t = token.trim();
  if (/^Q\d+$/.test(t)) return people.get(t);
  const n = norm(t);
  return n ? [...people.values()].find((p) => norm(p.name) === n) : undefined;
};

/** The persons a candidate names besides the subject (`who`: names or Wikidata ids separated by ; , or |). */
export function namedOthers(who: string | undefined, subjectQid: string | null, subjectName: string): string[] {
  return (who ?? '').split(/[;,|]/).map((x) => x.trim()).filter((x) => x && x !== subjectQid && norm(x) !== norm(subjectName));
}

const isoOf = (date: string, precision: DatePrecision): string => (precision === 'month' && /^\d{4}-\d{2}$/.test(date) ? `${date}-01` : date);

/** Every NEW photo of one subject, checked. A locked subject has none (its candidates are not even looked up). */
export function checkHarvestSubject(inp: HarvestInput): CheckedPhoto[] {
  const { subject, existing } = inp;
  if (inp.lock.locked) return [];
  const out: CheckedPhoto[] = [];
  const person = subject.kind === 'idol' ? inp.people.get(subject.qid ?? '') : undefined;
  const lineup = subject.kind === 'group' ? groupLineup(subject.slug, inp.people) : [];
  const members = subject.kind === 'group' ? groupNames(subject.slug, inp.people) : new Set<string>();
  const liveExisting = existing.filter((e) => e.status !== 'out');
  const maxSlot = liveExisting.reduce((m, e) => Math.max(m, e.slot), 0);

  for (const c of inp.candidates) {
    const reasons: string[] = [];
    const review: string[] = [];
    const precision: DatePrecision = /^\d{4}-\d{2}$/.test(c.date) ? 'month' : 'day';
    const p = {
      source: c.source, page: c.page, file: c.file, url: '', width: c.width, height: c.height, sha1: null as string | null, author: '', author_url: null as string | null,
      licence: '', licence_url: '', share_alike: false, date: c.date, date_precision: precision, event: c.event, stage: !!c.stage,
      quality: c.quality, focal: c.focal, source_path: null as string | null, news_only: c.source === 'koreanet' || !!c.news_only,
    };
    const info = p.file ? inp.info.get(`File:${p.file}`) : undefined;
    sourceChecks(p, c, info, subject.kind, reasons, review);

    // The age rule on the photo's own date, from the people files.
    const iso = isoOf(p.date, precision);
    const verdict = subject.kind === 'idol'
      ? (person
        ? ageVerdict({ kind: 'idol', photo_date: iso, photo_precision: precision, lineup_complete: true, people: [lineupOf(person, null)] }, inp.today)
        : ({ ok: false, reason: 'unknown_lineup' } as const))
      : ageVerdict({ kind: 'group', photo_date: iso, photo_precision: precision, lineup_complete: lineup.length > 0 && lineupComplete(subject.slug, inp.groups, inp.people), people: lineup }, inp.today);
    const age: { ok: boolean; reason: AgeReason | null } = verdict.ok ? { ok: true, reason: null } : { ok: false, reason: verdict.reason };
    if (!age.ok) reasons.push(`age rule: ${age.reason}`);

    // Anyone else in the frame: pending at best, out when a named one is under 18 on the photo date.
    if (subject.kind === 'idol') {
      if (c.people_visible == null) review.push('the number of people in the frame is not stated');
      else if (c.people_visible > 1) review.push(`${c.people_visible} people are in the frame`);
    } else if (c.people_visible != null && c.members_visible != null && c.people_visible > c.members_visible) {
      review.push('someone who is not a member is in the frame');
    }
    for (const t of namedOthers(c.who, subject.qid, subject.name).filter((x) => !members.has(norm(x)) && !members.has(x))) {
      const other = findPerson(t, inp.people);
      if (!other) { review.push('a person in the frame is not identified'); continue; }
      const v = ageVerdict({ kind: 'idol', photo_date: iso, photo_precision: precision, lineup_complete: true, people: [lineupOf(other, null)] }, inp.today);
      if (!v.ok && (v.reason === 'minor_at_photo' || v.reason === 'minor_today')) reasons.push('age rule: another person in the frame was under 18 on that date');
      else if (!v.ok) review.push('another person in the frame has no confirmed birth date');
    }

    // The photos already in the game and the ones kept before: never again.
    const page = pageKey(p.page);
    if (inp.usedPages.has(page) || liveExisting.some((e) => pageKey(e.page) === page)) reasons.push('this file is already a photo in the game');
    else if (p.sha1 && (inp.usedSha1.has(p.sha1) || liveExisting.some((e) => e.sha1 === p.sha1))) reasons.push('the same picture (sha1) is already a photo in the game');
    else {
      const dup = liveExisting.find((e) => sameOccasion(e, p)) ?? out.find((q) => q.status !== 'out' && sameOccasion(q, p));
      if (dup) reasons.push(`same photo occasion as an earlier photo (${dup.date}${dup.event ? `, ${dup.event}` : ''})`);
    }
    const added = out.filter((q) => q.status !== 'out').length;
    if (!reasons.length && liveExisting.length + added >= 6) reasons.push('six photos already');
    const status: Status = reasons.length ? 'out' : review.length ? 'pending' : 'auto';
    out.push({
      ...p, slot: status === 'out' ? 0 : maxSlot + added + 1, status, review, reasons, age, ...cropOf(subject.kind, p.width, p.height),
    });
    if (status !== 'out') {
      inp.usedPages.add(page);
      if (p.sha1) inp.usedSha1.add(p.sha1);
    }
  }
  return out;
}

// ---- the whole run ----

export interface HarvestRun {
  subjects: HarvestSubject[]; people: Map<string, PrivatePerson>; candidates: Map<string, CandidateFile>; lot3: Lot3Subject[];
  info: Map<string, CommonsInfo>; today: string; groups?: Map<string, GroupLineup> | undefined;
}
export interface HarvestSubjectOut {
  slug: string; name: string; kind: 'idol' | 'group'; qid: string | null; group: string | null; idol_id: number | null; why: HarvestSubject['why'];
  end_year: null; locked: boolean; shortfall: string | null; photos: CheckedPhoto[];
}
export interface HarvestPhotosFile {
  checked_on: string; rules: string; sources: string; subjects: HarvestSubjectOut[]; left_out: Array<{ slug: string; reason: string }>;
}
export interface HarvestCounts {
  subjects: number; people: number; groups: number; locked: number; auto: number; pending: number; out: number;
  cardsBefore: number; cardsAfter: number; fullArtLocked: number; byReason: Record<string, number>; lockedByGroup: Record<string, number>;
}
export interface HarvestResult { file: HarvestPhotosFile; summary: string; lockedMd: string; counts: HarvestCounts }

/** Short, name-free key of a reason for the SUMMARY. */
export function reasonKey(r: string): string {
  if (/^age rule: another person/.test(r)) return 'age rule: another person in the frame under 18';
  if (/^age rule:/.test(r)) return r;
  if (/^licence not allowed/.test(r)) return 'licence not allowed';
  if (/^on Commons:/.test(r)) return 'deletion request or missing permission on Commons';
  if (/^file type/.test(r)) return 'file type';
  if (/^same photo occasion/.test(r)) return 'same occasion as an earlier photo';
  if (/^this file is already|^the same picture/.test(r)) return 'already a photo in the game';
  return r.replace(/\s*\(.*$/, '');
}

const asPhoto3 = (e: ExistingPhoto | CheckedPhoto): Photo3 => ({
  slot: e.slot, status: e.status === 'pending' ? 'pending' : e.status === 'auto' ? 'auto' : 'approved', source: 'commons', page: e.page, url: '',
  width: e.width, height: e.height, sha1: e.sha1 ?? null, author: '', author_url: null, licence: '', licence_url: '', share_alike: false, date: e.date,
  date_precision: 'day', event: e.event, stage: !!e.stage, quality: e.quality ?? 3, focal: { x: 50, y: 50 }, source_path: null, news_only: false, review: [],
});

const RULES = 'owner decisions 2026-11-13 (one edition, one photo) and brief of lot 6: licences CC0, public domain, CC BY, CC BY-SA, KOGL Type 1, a named author, no deletion request; the age rule of lot 2 on each photo date and today; a person under 18, or a group with a current member under 18 or with a member whose birth date is unknown, has no photo (locked); an idol photo with anyone else in the frame waits for the owner, and is out when a named person was under 18 on that date. Verdicts and credits only: no birth date.';

export function runHarvest(run: HarvestRun): HarvestResult {
  const lot3 = new Map(run.lot3.map((s) => [s.slug, s]));
  const usedPages = new Set<string>();
  const usedSha1 = new Set<string>();
  for (const s of run.lot3) for (const e of s.photos) if (e.status !== 'out') { usedPages.add(pageKey(e.page)); if (e.sha1) usedSha1.add(e.sha1); }

  const subjects: HarvestSubjectOut[] = [];
  const left: Array<{ slug: string; reason: string }> = [];
  const locks = new Map<string, Lock>();
  for (const s of run.subjects) {
    const lock = lockOf(s, run.people, run.today);
    locks.set(s.slug, lock);
    const existing = lot3.get(s.slug)?.photos ?? [];
    const cand = run.candidates.get(s.slug);
    const photos = checkHarvestSubject({
      subject: s, lock, existing, candidates: cand?.photos ?? [], info: run.info, people: run.people, today: run.today, groups: run.groups, usedPages, usedSha1,
    });
    if (lock.locked) left.push({ slug: s.slug, reason: 'locked' });
    else if (!photos.some((p) => p.status !== 'out') && !existing.some((e) => e.status !== 'out')) left.push({ slug: s.slug, reason: photos.length ? 'no photo passes the checks' : 'no photo found' });
    subjects.push({
      slug: s.slug, name: s.name, kind: s.kind, qid: s.qid, group: s.group, idol_id: s.idol_id, why: s.why, end_year: null, locked: lock.locked,
      shortfall: cand?.shortfall ?? null, photos,
    });
  }

  // ---- counts ----
  const all = subjects.flatMap((s) => s.photos);
  const byReason: Record<string, number> = {};
  for (const p of all.filter((x) => x.status === 'out')) for (const r of new Set(p.reasons.map(reasonKey))) byReason[r] = (byReason[r] ?? 0) + 1;
  const lockedSubjects = subjects.filter((s) => s.locked);
  const groupOf = (s: HarvestSubjectOut): string => (s.kind === 'group' ? s.slug : (s.group ?? s.slug));
  const lockedByGroup: Record<string, number> = {};
  for (const s of lockedSubjects) lockedByGroup[groupOf(s)] = (lockedByGroup[groupOf(s)] ?? 0) + 1;

  const slugs = new Set([...lot3.keys(), ...subjects.map((s) => s.slug)]);
  let cardsBefore = 0;
  let cardsAfter = 0;
  let fullArtLocked = 0;
  const underTwo: string[] = [];
  for (const slug of slugs) {
    const s = subjects.find((x) => x.slug === slug);
    const kind = s?.kind ?? lot3.get(slug)!.kind;
    const before = (lot3.get(slug)?.photos ?? []).filter((e) => e.status !== 'out').map(asPhoto3);
    const added = (s?.photos ?? []).filter((p) => p.status !== 'out').map(asPhoto3);
    const unit = kind === 'group' ? 2 : 1;
    cardsBefore += plannedEditions(kind, before).length * unit;
    const ed = plannedEditions(kind, [...before, ...added]);
    cardsAfter += ed.length * unit;
    const live = [...before, ...added].filter((p) => p.status !== 'pending');
    if (live.length >= 6 && !ed.includes('L')) fullArtLocked += 1;
    if (s && s.kind === 'idol' && !s.locked && live.length < 2) underTwo.push(s.name);
  }
  const counts: HarvestCounts = {
    subjects: subjects.length, people: subjects.filter((s) => s.kind === 'idol').length, groups: subjects.filter((s) => s.kind === 'group').length,
    locked: lockedSubjects.length, auto: all.filter((p) => p.status === 'auto').length, pending: all.filter((p) => p.status === 'pending').length,
    out: all.filter((p) => p.status === 'out').length, cardsBefore, cardsAfter, fullArtLocked, byReason, lockedByGroup,
  };

  const file: HarvestPhotosFile = {
    checked_on: run.today, rules: RULES,
    sources: 'Wikimedia Commons API (imageinfo, extmetadata, categories, templates), read on the day above; candidates from the lot 6 researchers',
    subjects, left_out: left,
  };

  const summary = [
    '# Lot 6, the photo harvest: summary', '',
    `Checked on ${run.today}. Generated by apps/quiz/scripts/cards/verify-harvest.mts; verdicts and counts only (no birth date, no month of an 18th birthday).`, '',
    '## Subjects', '',
    `- ${counts.subjects} subjects: ${counts.people} people, ${counts.groups} groups.`,
    `- ${counts.locked} locked pockets (no photo, shown in the binder as "Carte à venir"), by group:`,
    ...Object.entries(lockedByGroup).sort(([a], [b]) => a.localeCompare(b)).map(([g, n]) => `  - ${g}: ${n}`), '',
    '## Photos', '',
    `- ${counts.auto} auto, ${counts.pending} pending (the owner's review), ${counts.out} out.`,
    '- Out, by reason (a photo can have several):',
    ...Object.entries(byReason).sort(([, a], [, b]) => b - a).map(([r, n]) => `  - ${r}: ${n}`), '',
    '## Cards the edition rules will give', '',
    `- Before lot 6 (lot 3 photos only): ${counts.cardsBefore} cards. With the auto photos of lot 6: ${counts.cardsAfter} cards, pairs counted as two (${counts.cardsAfter - counts.cardsBefore} more). Pending photos open nothing until the owner approves them.`,
    `- Full Art locked (six live photos, none with an honest 2x): ${counts.fullArtLocked} subjects.`, '',
    '## Adult idols with fewer than 2 usable photos', '',
    ...(underTwo.length ? underTwo.sort((a, b) => a.localeCompare(b)).map((n) => `- ${n}`) : ['- none']), '',
  ].join('\n');

  const rowsLocked = lockedSubjects.map((s) => {
    const l = locks.get(s.slug) as Extract<Lock, { locked: true }>;
    return [groupOf(s), s.name, l.opens ?? 'unknown'] as const;
  }).sort((a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]));
  const lockedMd = [
    '# Locked pockets of lot 6 (PRIVATE: never in the repository)', '',
    `Computed on ${run.today}. The opening month is when the person, or the youngest current member of the group, turns 18; "unknown" when no birth date is known.`, '',
    '| group | name | opens |', '| --- | --- | --- |',
    ...rowsLocked.map((r) => `| ${r.join(' | ')} |`), '',
  ].join('\n');

  return { file, summary, lockedMd, counts };
}

/** The Commons titles to ask about: the candidates of the unlocked subjects only (a locked subject's photos are never looked at). */
export function titlesToAsk(run: Pick<HarvestRun, 'subjects' | 'people' | 'candidates' | 'today'>, fileOfPage: (page: string) => string | null): string[] {
  const titles = new Set<string>();
  for (const s of run.subjects) {
    if (lockOf(s, run.people, run.today).locked) continue;
    for (const c of run.candidates.get(s.slug)?.photos ?? []) {
      if (c.source !== 'commons') continue;
      const file = c.file ?? fileOfPage(c.page);
      if (file) { c.file = file; titles.add(`File:${file}`); }
    }
  }
  return [...titles];
}
