// Bunnyverse Cards lot 3: the pure rules of scripts/cards/verify-photos.mts (owner decision 2026-11-13, "one edition, one photo"):
// licences, author, deletion requests, open licence reviews, dates, repeated occasions, the age rule on each photo's date, review reasons
// and slots. No file, no network: the script passes the Commons answers in. Tested by verify-photos.test.ts.
import { ageVerdict, type AgeReason, type DatePrecision, type LineupPerson } from './age-rule';
import { fullOk, windowWidth, type Photo3 } from './catalog3-sql';

export interface Candidate {
  source: Photo3['source']; page: string; file: string | null; flickr_id?: string | null; width: number; height: number;
  date: string; date_source?: string; event: string | null; stage: boolean; people_visible?: number; members_visible?: number | null;
  lineup_full?: boolean | null; who?: string; focal: { x: number; y: number }; quality: number; news_only?: boolean;
  licence_review_pending?: boolean; note?: string;
}
export interface CandidateFile {
  slug: string; kind: 'idol' | 'group'; photos: Candidate[]; shortfall?: string;
  existing?: { quality?: number; stage?: boolean; event?: string | null; focal?: { x: number; y: number } };
}
export interface Lot2Subject {
  slug: string; name: string; kind: 'idol' | 'group';
  photo: { bucket: string; path: string; commons_page: string; file: string; author: string; licence: string; licence_url: string; share_alike: boolean; date: string };
  original?: { url: string; width: number; height: number; sha1: string; mime: string };
  focal: { x: number; y: number };
  disbanded: { year: number } | null;
}
export interface ResearchPerson extends LineupPerson { qid?: string; name?: string; agree?: boolean }
export interface ResearchRow { slug: string; kind: 'idol' | 'group'; lineup_complete: boolean; people: ResearchPerson[] }
export interface Confirmation { slug: string; name: string; qid?: string; agrees?: boolean | null; left?: string; left_source?: string }

/** What the Commons API says about one file. */
export interface CommonsInfo {
  title: string; missing: boolean; url: string | null; width: number; height: number; sha1: string | null; mime: string | null;
  artist: string | null; artistUrl: string | null; licence: string | null; licenceUrl: string | null; dateOriginal: string | null;
  categories: string[]; templates: string[];
}

export type Status = 'approved' | 'auto' | 'pending' | 'out';
export interface CheckedPhoto extends Omit<Photo3, 'status'> {
  status: Status; file: string | null; reasons: string[]; age: { ok: boolean; reason: AgeReason | null };
  window_width: number; full_ok: boolean; halves?: Array<{ part: 1 | 2; width: number; small_2x: boolean }>; small_2x?: boolean;
}

const LICENCE_OK = /^(cc0( 1\.0)?|public domain|pd|cc by(-sa)? \d(\.\d)?( [a-z]{2,6})?|kogl type (1|i))$/i;
/** CC0, public domain, CC BY, CC BY-SA (any version, ported or not), KOGL Type 1; never NC or ND. */
export const licenceOk = (l: string | null): boolean => !!l && LICENCE_OK.test(l.trim()) && !/\b(nc|nd)\b/i.test(l);
export const shareAlike = (l: string): boolean => /-sa\b/i.test(l);

/** The plain text of the Artist field (it is HTML), and the first link in it. */
export function artistOf(html: string | null): { name: string | null; url: string | null } {
  if (!html) return { name: null, url: null };
  const href = /href="([^"]+)"/.exec(html)?.[1] ?? null;
  const name = html.replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&').replace(/&#039;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();
  const url = href ? (href.startsWith('//') ? `https:${href}` : href.startsWith('/') ? `https://commons.wikimedia.org${href}` : href) : null;
  return { name: name && !/^(unknown|anonymous|author unknown|see source)$/i.test(name) ? name : null, url };
}

/** A deletion request, a copyright violation, a missing permission, source or licence: the file must not be used. */
export const deletionFlag = (cats: string[], tpls: string[]): string | null => {
  const c = cats.find((x) => /deletion request|candidates for speedy deletion|copyright violation|media missing permission|media without a (source|license)|possibly unfree|dubious/i.test(x));
  if (c) return c;
  const t = tpls.find((x) => /^Template:(delete|speedydelete|sd|copyvio|no permission since|no license since|no source since|npd|nld|nsd|dw no source since|deletion request)$/i.test(x));
  return t ?? null;
};
/** A licence review (Flickr, YouTube, any import) still open on Commons. */
export const reviewOpen = (cats: string[]): boolean => cats.some((x) => /review needed|needing human review|license review needed|unreviewed/i.test(x));

/** The day (or month) at the start of a date text: "2023-05-12 19:22" -> 2023-05-12. */
export function dayOf(text: string | null): { date: string; precision: DatePrecision } | null {
  if (!text) return null;
  const plain = text.replace(/<[^>]*>/g, ' ');
  const d = /(\d{4})-(\d{2})-(\d{2})/.exec(plain);
  if (d) return { date: `${d[1]}-${d[2]}-${d[3]}`, precision: 'day' };
  const m = /^\s*(\d{4})-(\d{2})\s*$/.exec(plain);
  if (m) return { date: `${m[1]}-${m[2]}`, precision: 'month' };
  return null;
}

const normEvent = (e: string | null): string => (e ?? '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9ㄱ-힝]+/g, '');
/** The owner's rule: two photos of a subject must differ by file AND by event or date. Same day with no two named different events: same. */
export function sameOccasion(a: { date: string; event: string | null; sha1: string | null }, b: { date: string; event: string | null; sha1: string | null }): boolean {
  if (a.sha1 && b.sha1 && a.sha1 === b.sha1) return true;
  if (a.date.slice(0, 10) !== b.date.slice(0, 10)) return false;
  const ea = normEvent(a.event);
  const eb = normEvent(b.event);
  return !ea || !eb || ea === eb;
}

/** The people of a subject with their confirmations applied: a second agreeing source confirms a birth date; T-ARA's Jiae gets her leaving date. */
export function peopleOf(row: ResearchRow, confirm: Confirmation[]): ResearchPerson[] {
  return row.people.map((p) => {
    const c = confirm.find((x) => x.slug === row.slug && ((x.qid && x.qid === p.qid) || x.name === p.name));
    const agreed = p.agree !== false || c?.agrees === true;
    const out: ResearchPerson = { ...p, birth_confirmed: agreed };
    if (c?.left && !p.left) {
      out.left = c.left;
      out.left_precision = /^\d{4}$/.test(c.left) ? 'year' : /^\d{4}-\d{2}$/.test(c.left) ? 'month' : 'day';
      if (out.left_precision === 'year') out.left = `${c.left}-12-31`;
      out.current = false;
    }
    return out;
  });
}

export function cropOf(kind: 'idol' | 'group', w: number, h: number): Pick<CheckedPhoto, 'window_width' | 'full_ok' | 'halves' | 'small_2x'> {
  const ww = windowWidth(kind, w, h);
  if (kind === 'group') {
    const l = Math.floor(ww / 2);
    return { window_width: ww, full_ok: fullOk(kind, w, h), halves: [{ part: 1, width: l, small_2x: l < 640 }, { part: 2, width: ww - l, small_2x: ww - l < 640 }] };
  }
  return { window_width: ww, full_ok: fullOk(kind, w, h), small_2x: ww < 640 };
}

/** The checks every photo shares, lot 3 and lot 6: the Commons answer (file, licence, author, deletion request, type, review, date), a source other
 *  than Commons, Korea.net's news use, a group photo without the whole lineup, a month-only date. Fills `p` from Commons and pushes the reasons
 *  that leave a photo out and the notes that send it to the owner. */
export function sourceChecks(
  p: { source: Photo3['source']; file: string | null; url: string; width: number; height: number; sha1: string | null; author: string; author_url: string | null;
       licence: string; licence_url: string; share_alike: boolean; page: string; date: string; date_precision: 'day' | 'month'; news_only: boolean },
  c: Candidate | null, info: CommonsInfo | undefined, kind: 'idol' | 'group', reasons: string[], review: string[],
): void {
  if (p.source === 'commons') {
    if (!info || info.missing || !info.url) reasons.push('the file is not on Commons');
    else {
      p.url = info.url; p.width = info.width; p.height = info.height; p.sha1 = info.sha1;
      const a = artistOf(info.artist);
      if (!a.name) reasons.push('no author named');
      p.author = a.name ?? ''; p.author_url = a.url;
      if (!licenceOk(info.licence)) reasons.push(`licence not allowed (${info.licence ?? 'none'})`);
      p.licence = info.licence ?? ''; p.licence_url = info.licenceUrl ?? p.page; p.share_alike = shareAlike(p.licence);
      const del = deletionFlag(info.categories, info.templates);
      if (del) reasons.push(`on Commons: ${del.replace(/^(Category|Template):/, '')}`);
      if (!/^image\/(jpeg|png|webp)$/.test(info.mime ?? '')) reasons.push(`file type ${info.mime ?? 'unknown'}`);
      if (reviewOpen(info.categories) || c?.licence_review_pending) review.push('the licence review is still open on Commons');
      const fileDay = dayOf(info.dateOriginal);
      if (c && fileDay && fileDay.precision === 'day' && p.date_precision === 'day' && fileDay.date !== p.date) {
        review.push(`the file's date (${fileDay.date}) differs from the description's (${p.date})`);
      }
    }
  } else {
    review.push(`not a Commons file (${p.source}): check the licence and the author on the source page`);
    reasons.push('this lot cuts its cards from Commons originals only');
  }
  if (p.news_only) review.push('Korea.net marks it for news use');
  if (c && kind === 'group' && c.lineup_full === false) review.push('not the whole lineup of that date');
  if (p.date_precision === 'month') review.push('the date is known to the month only');
}

export interface CheckInput {
  slug: string; kind: 'idol' | 'group'; existing: (Omit<Photo3, 'status' | 'review'> & { file: string }) | null;
  candidates: Candidate[]; info: Map<string, CommonsInfo>; research: ResearchRow | null; confirm: Confirmation[]; today: string;
}

/** Every photo of one subject, checked: status, reasons, age verdict, crop. Pure (the Commons answers are passed in). */
export function checkSubject(inp: CheckInput): CheckedPhoto[] {
  const out: CheckedPhoto[] = [];
  const people = inp.research ? peopleOf(inp.research, inp.confirm) : null;
  const ageOf = (date: string, precision: DatePrecision): { ok: boolean; reason: AgeReason | null } => {
    if (!inp.research || !people) return { ok: false, reason: 'unknown_lineup' };
    // the rule reads a full date; a month-only date is its first day with the month's precision (the whole month must pass)
    const iso = precision === 'month' && /^\d{4}-\d{2}$/.test(date) ? `${date}-01` : date;
    const v = ageVerdict({ kind: inp.kind, photo_date: iso, photo_precision: precision, lineup_complete: inp.research.lineup_complete, people }, inp.today);
    return v.ok ? { ok: true, reason: null } : { ok: false, reason: v.reason };
  };
  const rows: Array<{ c: Candidate | null; base: Omit<Photo3, 'status' | 'review' | 'slot'> & { file: string | null } }> = [];
  if (inp.existing) rows.push({ c: null, base: inp.existing });
  for (const c of inp.candidates) {
    rows.push({ c, base: {
      source: c.source, page: c.page, file: c.file, url: '', width: c.width, height: c.height, sha1: null, author: '', author_url: null,
      licence: '', licence_url: '', share_alike: false, date: c.date, date_precision: /^\d{4}-\d{2}$/.test(c.date) ? 'month' : 'day',
      event: c.event, stage: !!c.stage, quality: c.quality, focal: c.focal, source_path: null, news_only: c.source === 'koreanet' || !!c.news_only,
    } });
  }
  for (const { c, base } of rows) {
    const reasons: string[] = [];
    const review: string[] = [];
    const p = { ...base };
    const title = p.file ? `File:${p.file}` : null;
    const info = title ? inp.info.get(title) : undefined;
    sourceChecks(p, c, info, inp.kind, reasons, review);
    const age = ageOf(p.date, p.date_precision);
    if (!age.ok) reasons.push(`age rule: ${age.reason}`);
    const dup = out.find((q) => q.status !== 'out' && sameOccasion(q, p));
    if (dup) reasons.push(`same photo occasion as slot ${dup.slot} (${dup.date}${dup.event ? `, ${dup.event}` : ''})`);
    const live = out.filter((q) => q.status !== 'out').length;
    if (!reasons.length && live >= 6) reasons.push('six photos already');
    const status: Status = reasons.length ? 'out' : !c ? 'approved' : review.length ? 'pending' : 'auto';
    // Slots: 1 is the photo of lots 1 and 2 (or the first new one of a returning group), then the others best first as proposed.
    out.push({
      ...p, slot: status === 'out' ? 0 : live + 1, status, review, reasons, age,
      ...cropOf(inp.kind, p.width, p.height),
    });
  }
  return out;
}

