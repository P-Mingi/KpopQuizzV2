// Bunnyverse Cards lot 6: the rules of scripts/cards/verify-harvest.mts (harvest-checks.ts). No network: the Commons answers are written
// here. No real person: every name and every birth date below is invented. Checked: the people files merge by QID (a disagreement on the
// birth day makes the date unconfirmed), who is locked (a person under 18 or without a confirmed birth date, a group with such a current
// member), no photo for a locked subject, the photos already in the game never come back, an idol photo with anyone else in the frame,
// the age rule on each photo's date, the six slots, and the outputs (the SUMMARY names no minor, locked.md carries the opening month).
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  checkHarvestSubject, LEFT_OUT_PEOPLE, lineupComplete, lockOfGroup, lockOfPerson, mergePeople, namedOthers, publicJson, runHarvest, titlesToAsk,
  type ExistingPhoto, type GroupLineup, type HarvestSubject, type PrivatePerson,
} from './harvest-checks';
import type { Candidate, CommonsInfo } from './photo-checks';

const TODAY = '2026-11-16';
const person = (qid: string, name: string, birth: string | null, group: string | null, o: Partial<PrivatePerson> = {}): PrivatePerson => ({
  qid, name, birth_date: birth, birth_precision: birth ? 'day' : null, birth_sources: [], birth_confirmed: !!birth,
  memberships: group ? [{ group, joined: null, left: null, current: true }] : [], ...o,
});
const ADULT = person('Q1', 'Ada Adult', '1995-01-01', 'trio');
const ADULT2 = person('Q2', 'Bea Adult', '1996-02-02', 'trio');
const TEEN = person('Q3', 'Cleo Teen', '2010-06-15', 'trio');           // 18 on 2028-06-15
const LATE = person('Q4', 'Dan Late', '2007-03-01', 'duo');             // 18 on 2025-03-01: adult today
const LATE_PEER = person('Q5', 'Eve Peer', '1999-09-09', 'duo');
const GHOST = person('Q6', 'Fay Ghost', null, 'ghosts');
const PEOPLE = mergePeople([ADULT, ADULT2, TEEN, LATE, LATE_PEER, GHOST]);
// The private lineup records: the researcher states the whole lineup of each group (a group photo needs it).
const GROUPS = new Map<string, GroupLineup>([
  ['trio', { slug: 'trio', complete: true, members: ['Q1', 'Q2', 'Q3'] }],
  ['duo', { slug: 'duo', complete: true, members: ['Q4', 'Q5'] }],
  ['ghosts', { slug: 'ghosts', complete: true, members: ['Q6'] }],
]);

const sub = (slug: string, kind: 'idol' | 'group', qid: string | null, group: string | null = null): HarvestSubject =>
  ({ slug, kind, name: slug, qid, group, idol_id: null, why: 'kpopdle' });
const info = (file: string, o: Partial<CommonsInfo> = {}): [string, CommonsInfo] => [`File:${file}`, {
  title: `File:${file}`, missing: false, url: `https://upload.example/${file}`, width: 3000, height: 4000, sha1: `sha-${file}`, mime: 'image/jpeg',
  artist: '<a href="//commons.wikimedia.org/wiki/User:L">Lens</a>', artistUrl: null, licence: 'CC BY 4.0', licenceUrl: 'https://creativecommons.org/licenses/by/4.0',
  dateOriginal: null, categories: [], templates: [], ...o,
}];
const cand = (file: string, date: string, o: { [K in keyof Candidate]?: Candidate[K] | undefined } = {}): Candidate => ({
  source: 'commons', page: `https://commons.wikimedia.org/wiki/File:${file.replace(/ /g, '_')}`, file, width: 3000, height: 4000, date, event: `Event ${file}`,
  stage: false, people_visible: 1, who: '', focal: { x: 50, y: 30 }, quality: 4, ...(o as Partial<Candidate>),
});
const files = (...cs: Candidate[]) => new Map(cs.map((c) => info(c.file as string)));
const check = (s: HarvestSubject, cs: Candidate[], existing: ExistingPhoto[] = [], extra: Map<string, CommonsInfo> = new Map(), used = { p: new Set<string>(), h: new Set<string>() }, groups: Map<string, GroupLineup> = GROUPS) => {
  const lock = s.kind === 'group' ? lockOfGroup(s.slug, PEOPLE, TODAY) : lockOfPerson(PEOPLE.get(s.qid ?? ''), TODAY);
  return checkHarvestSubject({ subject: s, lock, existing, candidates: cs, info: new Map([...files(...cs), ...extra]), people: PEOPLE, today: TODAY, groups, usedPages: used.p, usedSha1: used.h });
};
const old = (n: number, o: Partial<ExistingPhoto> = {}): ExistingPhoto => ({
  slot: n, status: 'approved', page: `https://commons.wikimedia.org/wiki/File:Old_${n}.jpg`, sha1: `old-${n}`, date: `2022-0${n}-10`, event: `Old ${n}`, width: 3000, height: 4000, ...o,
});

describe('harvest: the people files', () => {
  it('merges the rows of one QID and makes a disagreement on the birth day unconfirmed (the latest day stays)', () => {
    const m = mergePeople([
      person('Q9', 'Gia', '1990-05-05', 'a', { birth_confirmed: true }),
      person('Q9', 'Gia', '1990-05-06', 'a', { birth_confirmed: true, memberships: [{ group: 'b', joined: '2020-01-01', left: null, current: true }] }),
    ]).get('Q9')!;
    expect(m.birth_date).toBe('1990-05-06');
    expect(m.birth_confirmed).toBe(false);
    expect(m.memberships.map((x) => x.group).sort()).toEqual(['a', 'b']);
  });
  it('confirms a date when two rows agree, or two sites give the same day', () => {
    expect(mergePeople([person('Q8', 'Hal', '1990-05-05', null), person('Q8', 'Hal', '1990-05-05', null, { birth_confirmed: false })]).get('Q8')!.birth_confirmed).toBe(true);
    const one = person('Q7', 'Ivy', '1990-05-05', null, { birth_confirmed: false, birth_sources: [{ site: 'wikidata', value: '1990-05-05' }, { site: 'enwiki', value: '1990-05-05' }] });
    expect(mergePeople([one]).get('Q7')!.birth_confirmed).toBe(true);
    expect(mergePeople([{ ...one, birth_sources: [{ site: 'wikidata', value: '1990-05-05' }] }]).get('Q7')!.birth_confirmed).toBe(false);
  });
  it('two sites agree and a third differs: the latest day read is kept, as confirmed (integrator, 2026-11-16)', () => {
    const agree = [{ site: 'agency', value: '2004-03-03' }, { site: 'jawiki', value: '2004-03-03' }];
    // the differing site gives a later day: that day is kept
    const later = mergePeople([
      person('Q11', 'Kit', '2005-01-01', 'a', { birth_confirmed: false, birth_sources: [{ site: 'musicbrainz', value: '2005-01-01' }] }),
      person('Q11', 'Kit', '2005-01-01', 'a', { birth_sources: [...agree, { site: 'musicbrainz', value: '2005-01-01' }] }),
    ]).get('Q11')!;
    expect(later).toMatchObject({ birth_date: '2005-01-01', birth_precision: 'day', birth_confirmed: true });
    // the differing site gives an earlier day: the agreed day is the latest
    const earlier = mergePeople([person('Q12', 'Lux', '2004-03-03', 'a', { birth_sources: [...agree, { site: 'musicbrainz', value: '2003-01-01' }] })]).get('Q12')!;
    expect(earlier).toMatchObject({ birth_date: '2004-03-03', birth_confirmed: true });
    // two days that each have two sites: doubt, unconfirmed
    const pairs = mergePeople([person('Q13', 'Max', '2004-03-03', 'a', {
      birth_sources: [...agree, { site: 'musicbrainz', value: '2005-01-01' }, { site: 'wikidata', value: '2005-01-01' }],
    })]).get('Q13')!;
    expect(pairs.birth_confirmed).toBe(false);
    // a later day that would make the person a minor locks them
    const minor = mergePeople([person('Q14', 'Nia', '2004-03-03', 'a', { birth_sources: [...agree, { site: 'musicbrainz', value: '2009-05-05' }] })]).get('Q14')!;
    expect(lockOfPerson(minor, TODAY)).toEqual({ locked: true, opens: '2027-05', cause: 'minor' });
  });
  it('keeps the widest membership of a person in a group (earliest join, latest leave, current when any row says so)', () => {
    const m = mergePeople([
      person('Q6', 'Jo', '1990-01-01', null, { memberships: [{ group: 'g', joined: '2015-01-01', left: '2018-01-01', current: false }] }),
      person('Q6', 'Jo', '1990-01-01', null, { memberships: [{ group: 'g', joined: '2014-01-01', left: null, current: true }] }),
    ]).get('Q6')!;
    expect(m.memberships).toEqual([{ group: 'g', joined: '2014-01-01', joined_precision: 'day', left: null, left_precision: null, current: true }]);
  });
});

describe('harvest: who is locked', () => {
  it('locks a person under 18 or without a confirmed birth date, opens an adult, and says the opening month (private)', () => {
    expect(lockOfPerson(PEOPLE.get('Q1'), TODAY)).toEqual({ locked: false });
    expect(lockOfPerson(PEOPLE.get('Q4'), TODAY)).toEqual({ locked: false });
    expect(lockOfPerson(PEOPLE.get('Q3'), TODAY)).toEqual({ locked: true, opens: '2028-06', cause: 'minor' });
    expect(lockOfPerson(PEOPLE.get('Q6'), TODAY)).toEqual({ locked: true, opens: null, cause: 'unknown_birth' });
    expect(lockOfPerson(undefined, TODAY)).toMatchObject({ locked: true, opens: null });
    // ORCH, 2026-11-16 (listed in the report): a one-source date that is 18 or more years back in every reading is no minor, so no
    // pocket; the age rule still keeps the photos out (the next describe proves it). Was: locked, cause unknown_birth.
    const unconfirmed = mergePeople([person('Q10', 'Kim', '1990-01-01', null, { birth_confirmed: false })]).get('Q10');
    expect(lockOfPerson(unconfirmed, TODAY)).toEqual({ locked: false });
    const unconfirmedTeen = mergePeople([person('Q11', 'Lee', '2009-01-01', null, { birth_confirmed: false })]).get('Q11');
    expect(lockOfPerson(unconfirmedTeen, TODAY)).toMatchObject({ locked: true });
  });
  it('locks a group while any current member is under 18 or unknown, with the youngest member\'s opening month', () => {
    expect(lockOfGroup('trio', PEOPLE, TODAY)).toEqual({ locked: true, opens: '2028-06', cause: 'minor' });
    expect(lockOfGroup('duo', PEOPLE, TODAY)).toEqual({ locked: false });
    expect(lockOfGroup('ghosts', PEOPLE, TODAY)).toMatchObject({ locked: true, opens: null });
    expect(lockOfGroup('nobody', PEOPLE, TODAY)).toEqual({ locked: true, opens: null, cause: 'no_member' });
    // the day after the opening, with the group's other members adult, the group opens
    expect(lockOfGroup('trio', PEOPLE, '2028-06-15')).toEqual({ locked: false });
    expect(lockOfGroup('trio', PEOPLE, '2028-06-14')).toMatchObject({ locked: true });
  });
});

describe('harvest: one subject', () => {
  it('gives a locked subject no photo at all, and asks Commons nothing about it', () => {
    expect(check(sub('cleo', 'idol', 'Q3', 'trio'), [cand('A.jpg', '2026-01-01')])).toEqual([]);
    expect(check(sub('trio', 'group', 'Q100'), [cand('B.jpg', '2026-01-01')])).toEqual([]);
    const candidates = new Map([['cleo', { slug: 'cleo', kind: 'idol' as const, photos: [cand('A.jpg', '2026-01-01')] }], ['ada', { slug: 'ada', kind: 'idol' as const, photos: [cand('C.jpg', '2026-01-01')] }]]);
    const t = titlesToAsk({ subjects: [sub('cleo', 'idol', 'Q3', 'trio'), sub('ada', 'idol', 'Q1', 'trio')], people: PEOPLE, candidates, today: TODAY }, () => null);
    expect(t).toEqual(['File:C.jpg']);
  });
  it('auto approves a clean photo of an adult alone in the frame, in the next free slots after the photos already in the game', () => {
    const out = check(sub('ada', 'idol', 'Q1', 'trio'), [cand('A.jpg', '2026-01-01'), cand('B.jpg', '2026-02-01')], [old(1), old(2)]);
    expect(out.map((p) => [p.status, p.slot])).toEqual([['auto', 3], ['auto', 4]]);
  });
  it('sends a photo with anyone else in the frame to the owner, and one with an unstated count too', () => {
    const [two, unknown, named] = check(sub('ada', 'idol', 'Q1', 'trio'), [
      cand('A.jpg', '2026-01-01', { people_visible: 2 }),
      cand('B.jpg', '2026-02-01', { people_visible: undefined }),
      cand('C.jpg', '2026-03-01', { people_visible: 2, who: 'Ada Adult; Bea Adult' }),
    ]);
    expect(two).toMatchObject({ status: 'pending' });
    expect(two!.review.join(' ')).toMatch(/2 people/);
    expect(unknown).toMatchObject({ status: 'pending' });
    expect(named).toMatchObject({ status: 'pending' });
  });
  it('leaves a photo out when a named person in the frame was under 18 on the photo date, by name or by QID', () => {
    const out = check(sub('ada', 'idol', 'Q1', 'trio'), [
      cand('A.jpg', '2026-01-01', { people_visible: 2, who: 'Ada Adult; Cleo Teen' }),
      cand('B.jpg', '2026-02-01', { people_visible: 2, who: 'Q1, Q3' }),
      cand('C.jpg', '2026-03-01', { people_visible: 2, who: 'Eve Peer' }),
      cand('D.jpg', '2026-04-01', { people_visible: 2, who: 'Dan Late' }),
      cand('E.jpg', '2024-04-01', { people_visible: 2, who: 'Dan Late' }),
    ]);
    expect(out.map((p) => p.status)).toEqual(['out', 'out', 'pending', 'pending', 'out']);
    expect(out[0]!.reasons.join(' ')).toMatch(/another person in the frame was under 18/);
    expect(namedOthers('Ada Adult; Q3 | Cleo Teen', 'Q1', 'Ada Adult')).toEqual(['Q3', 'Cleo Teen']);
  });
  it('applies the age rule on each photo date: a member who was 18 only later has no photo before', () => {
    const out = check(sub('dan', 'idol', 'Q4', 'duo'), [cand('A.jpg', '2024-12-31'), cand('B.jpg', '2025-03-01'), cand('C.jpg', '2025-02-28')]);
    expect(out.map((p) => p.status)).toEqual(['out', 'auto', 'out']);
    expect(out[0]!.reasons).toContain('age rule: minor_at_photo');
  });
  it('reads a group photo on its lineup, and leaves out a group photo with a person who is not a member under 18 on that date', () => {
    const out = check(sub('duo', 'group', 'Q101'), [
      cand('A.jpg', '2026-01-01', { people_visible: 2, members_visible: 2 }),
      cand('B.jpg', '2024-01-01', { people_visible: 2, members_visible: 2 }),
      cand('C.jpg', '2026-02-01', { people_visible: 3, members_visible: 2, who: 'Cleo Teen' }),
      cand('D.jpg', '2026-03-01', { people_visible: 3, members_visible: 2 }),
    ]);
    expect(out.map((p) => p.status)).toEqual(['auto', 'out', 'out', 'pending']);
    expect(out[1]!.reasons).toContain('age rule: minor_at_photo');
  });
  it('leaves out every group photo without a complete lineup record: none, not complete, or a listed member without a people row', () => {
    const photos = [cand('A.jpg', '2026-01-01', { people_visible: 2, members_visible: 2 })];
    const without = (g: Map<string, GroupLineup>) => check(sub('duo', 'group', 'Q101'), photos, [], new Map(), undefined, g);
    for (const g of [
      new Map<string, GroupLineup>(),
      new Map<string, GroupLineup>([['duo', { slug: 'duo', complete: false, members: ['Q4', 'Q5'] }]]),
      new Map<string, GroupLineup>([['duo', { slug: 'duo', complete: true, members: ['Q4', 'Q5', 'Q77'] }]]),
      new Map<string, GroupLineup>([['duo', { slug: 'duo', complete: true, members: [] }]]),
    ]) {
      const out = without(g);
      expect(out.map((p) => p.status)).toEqual(['out']);
      expect(out[0]!.reasons).toContain('age rule: unknown_lineup');
    }
    expect(lineupComplete('duo', GROUPS, PEOPLE)).toBe(true);
    expect(lineupComplete('duo', undefined, PEOPLE)).toBe(false);
    // a member listed under another group does not count for this one
    expect(lineupComplete('duo', new Map([['duo', { slug: 'duo', complete: true, members: ['Q4', 'Q1'] }]]), PEOPLE)).toBe(false);
  });
  it('never proposes a photo already in the game: the same page, the same sha1, the same occasion; and counts the six slots', () => {
    const s = sub('ada', 'idol', 'Q1', 'trio');
    const used = { p: new Set<string>(), h: new Set<string>() };
    const out = check(s, [
      cand('Old 1.jpg', '2026-05-01'),
      cand('Fresh.jpg', '2026-05-02'),
      cand('Same sha.jpg', '2026-05-03'),
      cand('Same day.jpg', '2022-02-10', { event: 'Old 2' }),
      cand('Other day.jpg', '2026-06-03'),
    ], [old(1), old(2)], new Map([info('Same sha.jpg', { sha1: 'old-2' })]), used);
    expect(out.map((p) => p.status)).toEqual(['out', 'auto', 'out', 'out', 'auto']);
    expect(out[0]!.reasons.join()).toMatch(/already a photo in the game/);
    expect(out[2]!.reasons.join()).toMatch(/same picture/);
    expect(out[3]!.reasons.join()).toMatch(/same photo occasion/);
    // six at most, the existing ones counted
    const six = check(s, ['A', 'B', 'C', 'D'].map((n, i) => cand(`${n}.jpg`, `2026-0${i + 1}-20`)), [old(1), old(2), old(3), old(4, { status: 'pending' }), old(5)]);
    expect(six.map((p) => p.status)).toEqual(['auto', 'out', 'out', 'out']);
    expect(six[1]!.reasons).toContain('six photos already');
  });
  it('applies lot 3 checks: licence, author, deletion request, file type, open review, news only', () => {
    const s = sub('ada', 'idol', 'Q1', 'trio');
    const extra = new Map([
      info('Nc.jpg', { licence: 'CC BY-NC 2.0' }), info('NoAuthor.jpg', { artist: 'Unknown' }), info('Del.jpg', { categories: ['Category:Deletion requests 2026'] }),
      info('Gif.gif', { mime: 'image/gif' }), info('Rev.jpg', { categories: ['Category:License review needed'] }),
    ]);
    const out = check(s, [
      cand('Nc.jpg', '2026-01-01'), cand('NoAuthor.jpg', '2026-02-01'), cand('Del.jpg', '2026-03-01'), cand('Gif.gif', '2026-04-01'),
      cand('Rev.jpg', '2026-05-01'), cand('News.jpg', '2026-06-01', { news_only: true }), cand('Dead.jpg', '2026-07-01'),
    ], [], new Map([...extra, ['File:Dead.jpg', { ...info('Dead.jpg')[1], missing: true, url: null }]]));
    expect(out.map((p) => p.status)).toEqual(['out', 'out', 'out', 'out', 'pending', 'pending', 'out']);
  });
  it('sends a file with Commons\' personality rights warning to the owner (integrator, 2026-11-16)', () => {
    const extra = new Map([info('Pr.jpg', { templates: ['Template:Information', 'Template:Personality rights'] }), info('Plain.jpg', { templates: ['Template:Information'] })]);
    const [pr, plain] = check(sub('ada', 'idol', 'Q1', 'trio'), [cand('Pr.jpg', '2026-01-01'), cand('Plain.jpg', '2026-02-01')], [], extra);
    expect(pr).toMatchObject({ status: 'pending' });
    expect(pr!.review.join(' ')).toMatch(/personality rights/);
    expect(plain).toMatchObject({ status: 'auto' });
  });
  it('leaves out every photo of a person the integrator left out, whoever the subject is (2026-11-16)', () => {
    const who = LEFT_OUT_PEOPLE[0]!;
    const out = check(sub('duo', 'group', 'Q101'), [
      cand(`230104 ${who.name.toUpperCase()} & EVE.jpg`, '2026-01-01', { people_visible: 2, members_visible: 2 }),
      cand('Duo.jpg', '2026-02-01', { people_visible: 2, members_visible: 2, who: `Eve Peer, ${who.name}` }),
    ]);
    expect(out.map((p) => p.status)).toEqual(['out', 'out']);
    expect(out[0]!.reasons.join(' ')).toMatch(/left out \(integrator decision, 2026-11-16\)/);
    // matched on the subject's QID too, with nothing about the person in the file's text
    const people = mergePeople([person(who.qid, 'Invented Name', '1995-01-01', null)]);
    const [byQid] = checkHarvestSubject({
      subject: sub('x', 'idol', who.qid), lock: { locked: false }, existing: [], candidates: [cand('X.jpg', '2026-01-01')], info: files(cand('X.jpg', '2026-01-01')),
      people, today: TODAY, usedPages: new Set(), usedSha1: new Set(),
    });
    expect(byQid).toMatchObject({ status: 'out' });
  });
});

describe('harvest: the outputs', () => {
  const subjects = [sub('ada', 'idol', 'Q1', 'trio'), sub('bea', 'idol', 'Q2', 'trio'), sub('cleo', 'idol', 'Q3', 'trio'), sub('trio', 'group', 'Q100'), sub('duo', 'group', 'Q101')];
  const cs = [cand('A.jpg', '2026-01-01'), cand('B.jpg', '2026-02-01')];
  const run = () => runHarvest({
    subjects, people: PEOPLE, today: TODAY, groups: GROUPS, info: files(...cs, cand('G.jpg', '2026-01-01'), cand('H.jpg', '2026-02-01')),
    candidates: new Map([['ada', { slug: 'ada', kind: 'idol' as const, photos: cs }], ['duo', { slug: 'duo', kind: 'group' as const, photos: [cand('G.jpg', '2026-01-01', { people_visible: 2, members_visible: 2 }), cand('H.jpg', '2026-02-01', { people_visible: 2, members_visible: 2 })] }]]),
    lot3: [{ slug: 'ada', kind: 'idol', photos: [old(1)] }],
  });
  it('counts subjects, locked pockets by group, photos, and the cards the editions give (pairs counted)', () => {
    const { counts, file } = run();
    expect(counts).toMatchObject({ subjects: 5, people: 3, groups: 2, locked: 2, auto: 4, pending: 0, out: 0, cardsBefore: 0, cardsAfter: 7 });
    // Ada 3 photos: C U R; the duo 2 photos: C U as two pairs (4 cards)
    expect(counts.lockedByGroup).toEqual({ trio: 2 });
    expect(file.subjects.find((s) => s.slug === 'cleo')).toMatchObject({ locked: true, photos: [] });
    expect(file.subjects.find((s) => s.slug === 'ada')!.photos.map((p) => p.slot)).toEqual([2, 3]);
  });
  it('writes a SUMMARY that names no minor and lists the adult idols left with fewer than 2 photos; locked.md carries the opening month', () => {
    const { summary, lockedMd } = run();
    expect(summary).not.toMatch(/Cleo|2028|opens/i);
    expect(summary).toMatch(/- trio: 2/);
    expect(summary).toMatch(/## Adult idols with fewer than 2 usable photos\n\n- bea/);
    expect(lockedMd).toMatch(/\| trio \| cleo \| 2028-06 \|/);
    expect(lockedMd).toMatch(/\| trio \| trio \| 2028-06 \|/);
  });
  it('writes no birth date or opening month in the public output', () => {
    const { file, summary } = run();
    const text = JSON.stringify(file) + summary;
    expect(text).not.toMatch(/"birth|1995-01-01|2010-06-15|2028-06/i);
  });
});

describe('harvest: the public photos.json holds no em or en dash', () => {
  it('writes a Commons title that has one as the JSON escape, and the data is the same once parsed', () => {
    const v = { page: `https://commons.wikimedia.org/wiki/File:A_${String.fromCharCode(0x2013)}_B.jpg`, file: `20220112${String.fromCharCode(0x2014)}C.jpg` };
    const text = publicJson(v);
    expect(text).not.toMatch(new RegExp(`[${String.fromCharCode(0x2013, 0x2014)}]`));
    expect(JSON.parse(text)).toEqual(v);
    expect(text.endsWith('}\n')).toBe(true);
  });
});

describe('verify-harvest.mts: the private paths', () => {
  it('refuses a candidates or people directory inside the repository, before any network call', () => {
    const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../..');
    const tsx = path.join(repo, 'node_modules/.bin/tsx');
    const script = path.join(repo, 'apps/quiz/scripts/cards/verify-harvest.mts');
    let err = '';
    try {
      execFileSync(tsx, [script, '--candidates', path.join(repo, 'docs'), '--people', '/tmp/kpq-nothing'], { stdio: 'pipe', timeout: 60_000 });
    } catch (e) { err = String((e as { stderr?: Buffer }).stderr ?? ''); }
    expect(err).toMatch(/refused: .*must stay outside the repository/);
  });
});

describe('harvest: the public file never carries the researcher\'s notes (ORCH, 2026-11-16)', () => {
  it('replaces a shortfall note (which can tell how old someone was on a date) by a generated count line', () => {
    const cs = [cand('Solo.jpg', '2026-01-01')];
    const { file } = runHarvest({
      subjects: [sub('ada', 'idol', 'Q1', 'trio'), sub('cleo', 'idol', 'Q3', 'trio')], people: PEOPLE, today: TODAY, groups: GROUPS, info: files(...cs), lot3: [],
      candidates: new Map([
        ['ada', { slug: 'ada', kind: 'idol' as const, photos: cs, shortfall: 'The only other photo (2019-05-05) was taken when she was 17, before her 18th birthday.' }],
        ['cleo', { slug: 'cleo', kind: 'idol' as const, photos: [], shortfall: 'under 18 until 2028-06' }],
      ]),
    });
    const text = JSON.stringify(file);
    expect(text).not.toMatch(/2019-05-05|18th birthday|was 17|2028-06/);
    expect(file.subjects.find((s) => s.slug === 'ada')!.shortfall).toBe('1 usable photo of the 6 a subject can have (the research found no more that pass the checks)');
    expect(file.subjects.find((s) => s.slug === 'cleo')!.shortfall).toBeNull();
  });
});

describe('harvest: a locked pocket is for someone who is, or could be, under 18 (ORCH, 2026-11-16)', () => {
  const ONE = person('Q20', 'One Source', '1998-03-03', 'band', { birth_confirmed: false });   // one source, 28 in every reading
  const PEER = person('Q21', 'Two Sources', '1997-04-04', 'band');
  const NODATE = person('Q22', 'No Date', null, 'quiet');
  const OLD1 = person('Q23', 'Former One', '1990-01-01', null, { memberships: [{ group: 'split', joined: null, left: '2016-11-25', current: false }] });
  const OLD2 = person('Q24', 'Former Two', '1991-01-01', null, { memberships: [{ group: 'split', joined: null, left: '2016-11-25', current: false }] });
  const P = mergePeople([ONE, PEER, NODATE, OLD1, OLD2]);
  it('an adult whose birth date has one source only has no pocket, and the age rule still keeps the photos out', () => {
    expect(lockOfPerson(P.get('Q20'), TODAY)).toEqual({ locked: false });
    const lock = lockOfPerson(P.get('Q20'), TODAY);
    const out = checkHarvestSubject({ subject: sub('one', 'idol', 'Q20', 'band'), lock, existing: [], candidates: [cand('One.jpg', '2025-01-01')], info: files(cand('One.jpg', '2025-01-01')), people: P, today: TODAY, usedPages: new Set(), usedSha1: new Set() });
    expect(out.map((p) => p.status)).toEqual(['out']);
    expect(out[0]!.reasons).toContain('age rule: unknown_birth_date');
    expect(lockOfGroup('band', P, TODAY)).toEqual({ locked: false });
  });
  it('a person with no birth date at all keeps the pocket (fail closed)', () => {
    expect(lockOfPerson(P.get('Q22'), TODAY)).toMatchObject({ locked: true, opens: null, cause: 'unknown_birth' });
    expect(lockOfGroup('quiet', P, TODAY)).toMatchObject({ locked: true, opens: null });
  });
  it('a group with no current member is read on its former members (as 102 reads a disbanded group)', () => {
    expect(lockOfGroup('split', P, TODAY)).toEqual({ locked: false });
    expect(lockOfGroup('nobody', P, TODAY)).toEqual({ locked: true, opens: null, cause: 'no_member' });
  });
});
