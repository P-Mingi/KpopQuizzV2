#!/usr/bin/env node
// Lot K2, step 2 of 3: decide (offline, from the cache written by k2-fetch.mjs). Writes data/k2-idols.json, data/k2-conflicts.json
// and data/REPORT-K2.md.   node scripts/kpop/k2/k2-build.mjs [--target 110]
//
// Rules (K1's, applied the same way):
//  - a fact is stored when two sources agree (Wikidata, MusicBrainz, English Wikipedia); one source alone, or a disagreement, stores nothing
//    and is listed. A 2 to 1 majority is stored and listed as "resolved by majority".
//  - birth date, gender, nationality, debut year must all be there and agreed: otherwise the person is not inserted (an idol is
//    complete or absent).
//  - debut year, the owner's rule of K1: the first official release as a member of a debuted group (no survival show, no teaser). It is
//    the Wikidata work period start of the person when it agrees with the group's debut year or with MusicBrainz; for an original member
//    with no personal date it is the group's debut year, itself agreed by two of: Wikipedia years active, Wikidata inception, the
//    first release group in MusicBrainz.
//  - current members only: the member list of the group's English Wikipedia infobox, not contradicted by an end date on Wikidata
//    (P463 end time) or by MusicBrainz (relation ended).
//  - never a minor: born after (today minus 18 years) is dropped at once and only counted. No minor's name or date is written.
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CACHE_DIR, adultCutoff, clean, isAdult, norm, todayIso } from './lib.mjs';
import { GROUPS, YES_021B } from './groups.mjs';
import { leadDebutYear, stripNoise, birthFromText, birthFromWikitext, countryName, CODE_TO_COUNTRY, genderFromIntro, infoboxField, isLeaderText, nationalityFromIntro, rosterFromInfobox, sectionEntries } from './parse.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../..');
const TARGET = Number(process.argv.includes('--target') ? process.argv[process.argv.indexOf('--target') + 1] : 110);
const TODAY = todayIso();
const CUT = adultCutoff(TODAY);
const raw = JSON.parse(await readFile(path.join(CACHE_DIR, 'k2-raw.json'), 'utf8'));
const yearOf = (t) => (t ? Number(String(t).replace(/^\+/, '').slice(0, 4)) : null);
const dateOf = (t) => (t ? String(t).replace(/^\+/, '').slice(0, 10) : null);

// QIDs already in the pool or in the K1 review list (a second row for the same person would put a duplicate in the game)
const k1Qids = new Set();
for (const f of ['021a-k1-idol-gender-debut.sql', '021c-k1-idol-corrections.sql']) {
  const p = path.join(ROOT, 'docs/pending-migrations/multisite', f);
  if (existsSync(p)) for (const m of (await readFile(p, 'utf8')).matchAll(/'(Q[1-9]\d*)'/g)) k1Qids.add(m[1]);
}

const conflicts = [];   // { group, name, qid, field, kind: conflict|single|majority, note }
const addConflict = (c) => conflicts.push(c);
const counters = {};    // per group
const bump = (slug, key, n = 1) => { counters[slug] ??= {}; counters[slug][key] = (counters[slug][key] ?? 0) + n; };

// ---------------------------------------------------------------- agreement
// values: [{ src: 'wikidata'|'musicbrainz'|'wikipedia', v }] -> { status: agree|majority|single|conflict|none, value, by, against }
function agree(values) {
  const vs = values.filter((x) => x.v != null && x.v !== '');
  if (!vs.length) return { status: 'none', all: [] };
  const groups = new Map();
  for (const x of vs) { const k = JSON.stringify(x.v); groups.set(k, [...(groups.get(k) ?? []), x]); }
  const ranked = [...groups.values()].sort((a, b) => b.length - a.length);
  const top = ranked[0];
  if (top.length >= 2) {
    const rest = ranked.slice(1).flat();
    return { status: rest.length ? 'majority' : 'agree', value: top[0].v, by: top.map((x) => x.src), against: rest.map((x) => x.src), all: vs.map((x) => x.v) };
  }
  if (vs.length === 1) return { status: 'single', value: vs[0].v, by: [vs[0].src], all: [vs[0].v] };
  return { status: 'conflict', by: vs.map((x) => x.src), all: vs.map((x) => x.v) };
}

// ---------------------------------------------------------------- group level
function groupInfo(slug) {
  const G = raw.groups[slug];
  const wpField = infoboxField(G.wikitext, 'years_active');
  const wpYear = wpField ? Number((wpField.replace(/<!--[\s\S]*?-->/g, '').match(/\b(19|20)\d{2}\b/) || [null])[0]) || null : null;
  const wdYear = yearOf(G.wd?.claims?.P571?.[0]?.time);
  const EXCL = new Set(['Compilation', 'Remix', 'DJ-mix', 'Mixtape/Street', 'Demo', 'Live', 'Spokenword', 'Interview', 'Audiobook', 'Soundtrack', 'Audio drama', 'Field recording']);
  const rgs = (G.mb_release_groups ?? []).filter((r) => ['Album', 'Single', 'EP'].includes(r.type) && !(r.secondary ?? []).some((s) => EXCL.has(s)) && /^\d{4}/.test(r.date ?? ''));
  rgs.sort((a, b) => a.date.localeCompare(b.date));
  const first = rgs[0] ?? null;
  const mbYear = first ? Number(first.date.slice(0, 4)) : null;
  // the year the English Wikipedia lead says the group debuted (it knows the pre-debut years the infobox counts); the infobox years active only when the lead says nothing
  const leadYear = leadDebutYear(G.wikitext);
  const votes = agree([{ src: 'wikipedia', v: leadYear ?? wpYear }, { src: 'wikidata', v: wdYear }, { src: 'musicbrainz', v: mbYear }]);
  const wdLabels = (G.wd?.claims?.P264 ?? []).filter((c) => c.id && !c.end).map((c) => G.wd_labels?.[c.id]).filter(Boolean);
  // the main agency: the first label of the English Wikipedia infobox (it lists the main one first), checked against Wikidata P264
  const lf = infoboxField(G.wikitext, 'label');
  const wpLabel = lf ? (stripNoise(lf).match(/\[\[([^\]|#]+)/) || [null, null])[1]?.replace(/\s*\(.*\)$/, '').trim() ?? null : null;
  const labelOk = wpLabel && (!wdLabels.length || wdLabels.some((l) => norm(l) === norm(wpLabel) || norm(l).includes(norm(wpLabel)) || norm(wpLabel).includes(norm(l))));
  const labels = labelOk ? [wpLabel] : wdLabels.length ? [wdLabels[0]] : [];
  const labelNote = !labels.length ? 'no label found' : labelOk ? (wdLabels.length ? 'wikipedia + wikidata' : 'wikipedia only') : `wikipedia "${wpLabel ?? '-'}" and wikidata "${wdLabels.join(', ')}" differ: wikidata first label kept`;
  const incDate = G.wd?.claims?.P571?.[0]?.time ? dateOf(G.wd.claims.P571[0].time) : null;
  return { G, labelNote, leadYear, wpYear, wdYear, mbYear, first, year: ['agree', 'majority'].includes(votes.status) ? votes.value : null, yearStatus: votes.status, labels, incDate,
    inception_date: incDate && !/-00-/.test(incDate) && yearOf(incDate) === (['agree', 'majority'].includes(votes.status) ? votes.value : null) ? incDate : null };
}
const generationOf = (y) => (y <= 2002 ? '1st generation' : y <= 2011 ? '2nd generation' : y <= 2017 ? '3rd generation' : y <= 2022 ? '4th generation' : '5th generation');

// ---------------------------------------------------------------- persons
function wdBirth(p) {
  const c = (p.claims.P569 ?? []).filter((x) => x.precision === 11 && x.rank !== 'deprecated');
  const pref = c.filter((x) => x.rank === 'preferred');
  const use = pref.length ? pref : c;
  const vals = [...new Set(use.map((x) => dateOf(x.time)))];
  return vals.length === 1 ? vals[0] : null;
}
function entityGender(p) { const id = p.claims.P21?.[0]?.id; return id === 'Q6581072' ? 'female' : id === 'Q6581097' ? 'male' : null; }
function personKeys(p) {
  const keys = new Set([p.label, ...(p.aliases ?? []), p.enwiki, ...(p.claims.P742 ?? []).map((x) => x.text)].filter(Boolean).map((x) => norm(String(x).replace(/\s*\(.*\)$/, ''))));
  keys.delete('');
  return keys;
}

function resolveEntry(entry, G) {
  if (entry.target) { const t = raw.title_to_qid?.[entry.target]; if (t?.qid) return { qid: t.qid, how: 'link' }; }
  const cands = (G.wd_members ?? []).map((m) => m.qid).filter((q) => raw.persons[q]);
  const key = norm(entry.display);
  const hits = cands.filter((q) => personKeys(raw.persons[q]).has(key) || (entry.hangul && raw.persons[q].ko && norm(raw.persons[q].ko) === norm(entry.hangul)));
  let uniq = [...new Set(hits)];
  if (uniq.length === 1) return { qid: uniq[0], how: 'wikidata member' };
  if (!uniq.length) {   // the stage name is the given name of the full name ("Junkyu" for "Kim Jun-kyu", "준규" for "김준규"): unique within the group
    const hs = cands.filter((q) => {
      const p = raw.persons[q];
      const full = [p.label, ...(p.aliases ?? [])].map(norm);
      return (key.length >= 4 && full.some((f) => f.length > key.length && f.endsWith(key))) || (entry.hangul && norm(entry.hangul).length >= 2 && p.ko && norm(p.ko).length > norm(entry.hangul).length && norm(p.ko).endsWith(norm(entry.hangul)));
    });
    uniq = [...new Set(hs)];
    if (uniq.length === 1) return { qid: uniq[0], how: 'given name' };
  }
  return { qid: null, how: uniq.length > 1 ? 'ambiguous' : 'none' };
}

// A person Wikidata does not link to MusicBrainz: matched by Hangul name among the group's MusicBrainz members (unique match only).
function linkMusicBrainz(p, ent, G) {
  if (p.mb || !G.mb?.members?.length) return;
  const names = [p.ko, ...(p.claims.P1559 ?? []).map((x) => x.text), ent.hangul, ...(ent.natives ?? [])].filter((x) => x && /[\uac00-\ud7af\u3040-\u30ff\u4e00-\u9fff]/.test(x)).map(norm);
  if (!names.length) return;
  const arts = G.mb.members.map((m) => ({ m, a: raw.mb_artists?.[m.id] })).filter((x) => x.a);
  let hits = arts.filter(({ a }) => names.includes(norm(a.name)));
  // the given name only ("건호" for "안건호"): unique within the group, at least two characters
  if (hits.length !== 1) hits = arts.filter(({ a }) => norm(a.name).length >= 2 && names.some((n) => n.length > norm(a.name).length && n.endsWith(norm(a.name))));
  if (hits.length !== 1) return;
  const { m, a } = hits[0];
  p.mb = { ...a, groups: [{ id: G.wd?.mbid, name: G.mb.name, begin: m.begin, end: m.end, ended: m.ended }] };
  p.mb_via = 'group member by native name';
}

function memberStatus(p, G) {
  const mine = (p.claims.P463 ?? []).filter((c) => c.id === G.qid);
  const wd = !mine.length ? 'silent' : mine.some((c) => !c.end) ? 'member' : 'former';
  let mbs = 'silent';
  const mbid = p.mb?.id;
  if (mbid && G.mb?.members) { const r = G.mb.members.filter((m) => m.id === mbid); if (r.length) mbs = r.some((m) => !m.ended && !m.end) ? 'member' : 'former'; }
  return { wd, mb: mbs, wdStart: yearOf(mine.map((c) => c.start).filter(Boolean).sort()[0]) };
}

// Owner decision of 2026-11-03: LOONA's members follow the English Wikipedia list of current members, adults only, the same two-source rule for
// birth date and gender. The two groups the same women are in now (the dispute family) follow Wikipedia the same way, so that "her current
// group" is known: Wikidata end dates and MusicBrainz ended relations do not drop a member the Wikipedia list gives.
const WIKIPEDIA_DECIDES = new Set(['loona', 'artms', 'loossemble']);
const out = { generated: TODAY, adult_cutoff: CUT, groups: [], idols: [], activate_021b: [], group_updates: [] };
const reportRows = [];
const seenQid = new Map();   // qid -> slug of the first group that took it

async function processGroup(g) {
  const slug = g.slug;
  const G = raw.groups[slug];
  if (!G || G.error || !G.qid) { return { slug, skipped: `no English Wikipedia page or Wikidata item (${G?.error ?? 'missing'})`, cands: [] }; }
  if (!/band|group|duo|boy|girl/i.test(G.shortdesc ?? '')) return { slug, skipped: `the Wikipedia page "${G.wikipedia_title}" is not a music group (${G.shortdesc})`, cands: [] };
  const gi = groupInfo(slug);
  const ib = rosterFromInfobox(G.wikitext);
  const sec = sectionEntries(G.wikitext);
  let current = ib.current.length ? ib.current : sec.filter((e) => e.status === 'current');
  const past = ib.past.length ? ib.past : sec.filter((e) => e.status === 'past');
  if (!current.length) return { slug, skipped: 'membership unclear: no member list on the English Wikipedia page', cands: [] };
  // enrich with the section (hangul, leader, DOB cell)
  const secBy = new Map();
  for (const e of sec) { secBy.set(norm(e.display), e); if (e.target) secBy.set(norm(e.target), e); }
  const leaderFlags = new Map();
  const cands = [];
  const unresolved = [];
  const roster = [];
  let order = 0;
  for (const e of current) {
    order++;
    const s = secBy.get(norm(e.display)) ?? (e.target ? secBy.get(norm(e.target)) : null);
    const entry = { ...e, hangul: e.hangul ?? s?.hangul ?? null, natives: [...new Set([...(e.natives ?? []), ...(s?.natives ?? [])])], sectionText: s?.text ?? '', sectionTable: !!s?.table, order };
    const r = resolveEntry(entry, G);
    entry.qid = r.qid;
    roster.push(entry);
    if (!r.qid) { unresolved.push(entry); }
  }
  // roster completeness: the Wikipedia section must not list a current member the infobox lacks (and the reverse)
  const secCurrent = sec.filter((e) => e.status === 'current' && !e.table);
  const rosterMismatch = secCurrent.length && Math.abs(secCurrent.length - current.length) > 0;
  // birth dates of the whole current roster (for the maknae), kept in memory only
  const births = new Map();
  for (const ent of roster) {
    const p = ent.qid ? raw.persons[ent.qid] : null;
    if (!p) continue;
    linkMusicBrainz(p, ent, G);
    const wpd = p.wp?.wikitext_head ? birthFromWikitext(p.wp.wikitext_head) : null;
    const tab = ent.sectionTable ? birthFromText(ent.sectionText) : null;
    const a = agree([{ src: 'wikidata', v: wdBirth(p) }, { src: 'musicbrainz', v: /^\d{4}-\d{2}-\d{2}$/.test(p.mb?.begin ?? '') ? p.mb.begin : null }, { src: 'wikipedia', v: wpd ?? tab }]);
    ent._birth = a;
    if (['agree', 'majority'].includes(a.status)) births.set(ent.qid, a.value);
  }
  for (const ent of roster) {
    const name = clean(ent.display);
    const res = { slug, name, qid: ent.qid, order: ent.order };
    const fail = (reason, extra = {}) => { bump(slug, reason); if (extra.conflict) addConflict({ group: slug, name, qid: ent.qid, ...extra.conflict }); return null; };
    if (!ent.qid) { bump(slug, 'no_wikidata_item'); addConflict({ group: slug, name, qid: null, field: 'identity', kind: 'single', note: 'listed by English Wikipedia as a current member, no Wikidata item found for the name: not inserted' }); continue; }
    const p = raw.persons[ent.qid];
    if (!p) { fail('no_person_data'); continue; }
    if ((p.claims.P570 ?? []).length) { fail('deceased'); continue; }
    if (k1Qids.has(ent.qid)) { bump(slug, 'already_in_k1'); continue; }
    // membership
    const ms = memberStatus(p, G);
    if (ms.wd === 'former' || ms.mb === 'former') {
      if (WIKIPEDIA_DECIDES.has(slug)) {
        bump(slug, 'membership_follows_wikipedia');
        addConflict({ group: slug, name, qid: ent.qid, field: 'membership', kind: 'owner-decision', note: `English Wikipedia lists a current member; ${ms.wd === 'former' ? 'Wikidata has an end date' : ''}${ms.wd === 'former' && ms.mb === 'former' ? ' and ' : ''}${ms.mb === 'former' ? 'MusicBrainz marks the relation ended' : ''}; owner decision 2026-11-03: follow English Wikipedia` });
      } else {
        bump(slug, 'status_conflict');
        addConflict({ group: slug, name, qid: ent.qid, field: 'membership', kind: 'conflict', note: `English Wikipedia lists a current member; ${ms.wd === 'former' ? 'Wikidata has an end date' : ''}${ms.wd === 'former' && ms.mb === 'former' ? ' and ' : ''}${ms.mb === 'former' ? 'MusicBrainz marks the relation ended' : ''}: not inserted` });
        continue;
      }
    }
    // birth date and age
    const bd = ent._birth;
    if (!['agree', 'majority'].includes(bd.status)) {
      if (bd.all?.length && bd.all.every((v) => !isAdult(v, TODAY))) { bump(slug, 'minor'); continue; }   // every date any source gives is a minor's: counted only
      bump(slug, bd.status === 'conflict' ? 'birth_conflict' : 'birth_unverified');
      addConflict({ group: slug, name, qid: ent.qid, field: 'birth_date', kind: bd.status === 'conflict' ? 'conflict' : 'single', note: `${bd.status === 'conflict' ? 'sources disagree' : 'fewer than two sources'} (${(bd.by ?? []).join(', ') || 'none'}): not inserted` });
      continue;
    }
    if (!isAdult(bd.value, TODAY)) { bump(slug, 'minor'); continue; }   // counted only; nothing about the person is kept
    if (bd.status === 'majority') addConflict({ group: slug, name, qid: ent.qid, field: 'birth_date', kind: 'majority', note: `resolved by majority (${bd.by.join(' + ')} against ${bd.against.join(', ')})` });
    // gender
    const mbg = p.mb?.gender ? p.mb.gender.toLowerCase() : null;
    const gv = agree([{ src: 'wikidata', v: entityGender(p) }, { src: 'musicbrainz', v: ['female', 'male'].includes(mbg) ? mbg : null }, { src: 'wikipedia', v: genderFromIntro(p.wp?.intro) }]);
    if (!['agree', 'majority'].includes(gv.status)) {
      bump(slug, 'gender_' + gv.status);
      addConflict({ group: slug, name, qid: ent.qid, field: 'gender', kind: gv.status === 'conflict' ? 'conflict' : 'single', note: `${gv.status === 'conflict' ? 'sources disagree' : 'fewer than two sources'} (${(gv.by ?? []).join(', ') || 'none'}): not inserted` });
      continue;
    }
    if (gv.status === 'majority') addConflict({ group: slug, name, qid: ent.qid, field: 'gender', kind: 'majority', note: `resolved by majority (${gv.by.join(' + ')} against ${gv.against.join(', ')})` });
    // nationality
    const wdNat = [...new Set((p.claims.P27 ?? []).filter((c) => c.rank !== 'deprecated').map((c) => countryName(raw.labels?.[c.id] ?? '')).filter(Boolean))].sort();
    const wpNat = nationalityFromIntro(p.wp?.intro);
    const mbCode = (p.mb?.area?.codes?.[0] ?? p.mb?.begin_area?.codes?.[0] ?? null);
    const mbNat = mbCode && CODE_TO_COUNTRY[mbCode] ? [CODE_TO_COUNTRY[mbCode]] : [];
    let natValue = null; const natBy = []; let natSingle = false;
    const inter = (a, b2) => a.filter((x) => b2.includes(x));
    if (wdNat.length && inter(wdNat, wpNat).length) { natValue = wdNat; natBy.push('wikidata', 'wikipedia'); if (inter(wdNat, mbNat).length) natBy.push('musicbrainz'); }
    else if (wdNat.length && inter(wdNat, mbNat).length) { natValue = wdNat; natBy.push('wikidata', 'musicbrainz'); }
    else if (!wdNat.length && wpNat.length && inter(wpNat, mbNat).length) { natValue = inter(wpNat, mbNat); natBy.push('wikipedia', 'musicbrainz'); }
    else if (wdNat.length && !wpNat.length) { natValue = wdNat; natBy.push('wikidata'); natSingle = true; }   // MusicBrainz gives a birthplace, not a nationality: it does not contradict
    if (!natValue) {
      bump(slug, wdNat.length && wpNat.length ? 'nationality_conflict' : 'nationality_single');
      addConflict({ group: slug, name, qid: ent.qid, field: 'nationality', kind: wdNat.length && wpNat.length ? 'conflict' : 'single',
        note: `${wdNat.length && wpNat.length ? 'sources disagree' : 'fewer than two sources'} (wikidata ${wdNat.join('/') || '-'}; wikipedia ${wpNat.join('/') || '-'}; musicbrainz birthplace ${mbNat.join('/') || '-'}): not inserted` });
      continue;
    }
    if (natSingle) { bump(slug, 'nationality_stored_single'); addConflict({ group: slug, name, qid: ent.qid, field: 'nationality', kind: 'single-stored', note: `Wikidata only (${wdNat.join('/')}); English Wikipedia silent, MusicBrainz birthplace ${mbNat.join('/') || '-'} is not a nationality: stored` }); }
    // debut year
    const birthYear = Number(bd.value.slice(0, 4));
    const p2031 = (p.claims.P2031 ?? []).map((c) => yearOf(c.time)).filter(Boolean).sort()[0] ?? null;
    const mbRel = p.mb?.groups?.find((x) => x.id === G.wd?.mbid) ?? null;
    const mbBegin = yearOf(mbRel?.begin);
    let debut = null, debutBasis = null;
    const dsrc = [];
    // Owner decision of 2026-11-03: a member who debuted with the group has the group's debut year (whatever Wikidata says of an earlier
    // project, a survival show or a pre-debut release). The source recorded is the group's: Wikidata inception, MusicBrainz first release.
    const joinedLater = !!gi.year && ((mbBegin && mbBegin > gi.year) || (ms.wdStart && ms.wdStart > gi.year));
    if (gi.year && !joinedLater) {
      debut = gi.year; debutBasis = `debuted with the group: group debut year (${gi.yearStatus}: wikipedia ${gi.leadYear ?? gi.wpYear ?? '-'}, wikidata ${gi.wdYear ?? '-'}, musicbrainz first release ${gi.mbYear ?? '-'})`;
      if (gi.wdYear === gi.year) dsrc.push({ source: 'wikidata', ref: G.qid }); else if (p2031 === gi.year) dsrc.push({ source: 'wikidata', ref: ent.qid });
      if (gi.mbYear === gi.year && gi.first) dsrc.push({ source: 'musicbrainz', ref: gi.first.id }); else if (mbBegin === gi.year && p.mb?.id) dsrc.push({ source: 'musicbrainz', ref: p.mb.id });
      if (p2031 && p2031 !== gi.year) addConflict({ group: slug, name, qid: ent.qid, field: 'debut_year', kind: 'owner-decision', note: `owner rule 2026-11-03: debuted with the group, so ${gi.year}; Wikidata person work period says ${p2031}` });
    } else if (p2031 && mbBegin && p2031 === mbBegin) {
      debut = p2031; debutBasis = 'joined after the group debut: wikidata = musicbrainz (person)'; dsrc.push({ source: 'wikidata', ref: ent.qid }, { source: 'musicbrainz', ref: p.mb.id });
    } else if (gi.year) {
      bump(slug, 'debut_joined_later'); addConflict({ group: slug, name, qid: ent.qid, field: 'debut_year', kind: 'conflict', note: `joined after the group's debut year ${gi.year}; own year not agreed (wikidata ${p2031 ?? '-'}, musicbrainz ${mbBegin ?? '-'}): not inserted` }); continue;
    } else { bump(slug, 'debut_unknown'); addConflict({ group: slug, name, qid: ent.qid, field: 'debut_year', kind: 'single', note: 'the group debut year is not agreed by two sources: not inserted' }); continue; }
    if (debut < birthYear + 8 || debut > Number(TODAY.slice(0, 4)) + 1) { bump(slug, 'debut_implausible'); addConflict({ group: slug, name, qid: ent.qid, field: 'debut_year', kind: 'conflict', note: 'debut year implausible against the birth year: not inserted' }); continue; }
    // one source row per source name (entity_sources is unique on type, id, field, source)
    const dsrcUniq = []; for (const s of dsrc) if (!dsrcUniq.some((x) => x.source === s.source)) dsrcUniq.push(s);
    // role
    const leaderGroup = isLeaderText(ent.sectionText) && !ent.sectionTable ? true : ent.sectionTable ? isLeaderText(ent.sectionText.split('|').filter((c) => /leader/i.test(c)).join(' ')) : false;
    const gname = norm(String(G.wikipedia_title).replace(/\s*\(.*\)$/, ''));
    const introLeader = String(p.wp?.intro ?? '').split(/(?<=[.!?])\s/).some((sn) => /\bleader of\b/i.test(sn) && !/\b(?:sub|co|deputy|former|performance)[- ]leader\b/i.test(sn) && norm(sn).includes(gname));
    // names
    const nameKeys = personKeys(p);
    const nameAgree = nameKeys.has(norm(name));
    const label = clean(p.label).replace(/\s*\([^)]*\)\s*$/, '');
    const romanized = label && norm(label) !== norm(name) ? label : null;
    const p1559 = (p.claims.P1559 ?? []).map((x) => x.text).find((t) => /[\uac00-\ud7af]/.test(t ?? '') && norm(t).length >= 2);
    const hangul = p1559 ?? (p.ko && /[\uac00-\ud7af]/.test(p.ko) ? p.ko : null) ?? ent.hangul ?? null;
    if (!nameAgree) addConflict({ group: slug, name, qid: ent.qid, field: 'name', kind: 'single', note: `stage name taken from the English Wikipedia list; Wikidata label "${label}" does not match it (kept: the Wikipedia name)` });
    const sources = {
      birth_date: [{ source: 'wikidata', ref: ent.qid }, { source: 'musicbrainz', ref: p.mb?.id }].filter((s) => bd.by.includes(s.source) && s.ref),
      gender: [{ source: 'wikidata', ref: ent.qid }, { source: 'musicbrainz', ref: p.mb?.id }].filter((s) => gv.by.includes(s.source) && s.ref),
      nationality: [{ source: 'wikidata', ref: ent.qid }, { source: 'musicbrainz', ref: p.mb?.id }].filter((s) => natBy.includes(s.source) && s.ref),
      debut_year: dsrcUniq,
    };
    cands.push({ slug, name, name_romanized: romanized ? clean(romanized) : null, name_hangul: hangul ? clean(hangul) : null, birth_date: bd.value, nationality: natValue.join(', '),
      gender: gv.value, debut_year: debut, positions: [], other_groups: [], wikidata_qid: ent.qid, ord: ent.order, leader: !!(leaderGroup || introLeader),
      leader_sources: [leaderGroup && 'wikipedia group page', introLeader && 'wikipedia member page'].filter(Boolean),
      sources, checks: { birth_date: bd.status + ':' + bd.by.join('+'), gender: gv.status + ':' + gv.by.join('+'), nationality: natBy.join('+'), debut_year: debutBasis, membership: `wikipedia current, wikidata ${ms.wd}, musicbrainz ${ms.mb}`, name: nameAgree ? 'wikipedia + wikidata' : 'wikipedia only' } });
  }
  // positions: leader (page flags), maknae (the youngest of the whole current roster, only when every member's birth date is agreed and the youngest is unique)
  // maknae = the youngest of the whole group, former members included; set only when every current member has an agreed birth date,
  // every former member has some date, and the youngest is unique.
  let allKnown = roster.every((e) => e.qid && births.has(e.qid));
  const pastDates = [];
  for (const pe of past) {
    const r = resolveEntry(pe, G);
    const pp = r.qid ? raw.persons[r.qid] : null;
    const d = pp ? (wdBirth(pp) ?? (/^\d{4}-\d{2}-\d{2}$/.test(pp.mb?.begin ?? '') ? pp.mb.begin : null) ?? (pp.wp?.wikitext_head ? birthFromWikitext(pp.wp.wikitext_head) : null)) : null;
    if (d) pastDates.push([r.qid, d]); else allKnown = false;
  }
  let maknaeQid = null;
  if (allKnown && roster.length > 1) {
    const sorted = [...births.entries(), ...pastDates].sort((a, b2) => b2[1].localeCompare(a[1]));
    if (sorted.length > 1 && sorted[0][1] !== sorted[1][1] && births.has(sorted[0][0])) maknaeQid = sorted[0][0];
  }
  const leaders = cands.filter((c) => c.leader);
  const flagged = roster.filter((e) => isLeaderText(e.sectionText)).length;
  for (const c of cands) {
    // the member pages' "leader of" sentences count only when the group page flags nobody (they also name sub-unit leaders)
    if (flagged > 0 && !c.leader_sources.includes('wikipedia group page')) { c.leader = false; c.leader_sources = []; }
    const pos = [];
    if (c.leader) pos.push('Leader');
    if (c.wikidata_qid === maknaeQid) pos.push('Maknae');
    c.positions = pos;
    if (c.leader && c.leader_sources.length === 1) addConflict({ group: slug, name: c.name, qid: c.wikidata_qid, field: 'leader', kind: 'single', note: `leader from one source only (${c.leader_sources[0]})` });
    delete c.leader;
  }
  if (!allKnown) addConflict({ group: slug, name: '(group)', qid: G.qid, field: 'maknae', kind: 'single', note: 'a current member has no agreed birth date: no maknae is set' });
  if (leaders.length > 2) addConflict({ group: slug, name: '(group)', qid: G.qid, field: 'leader', kind: 'conflict', note: `${leaders.length} members flagged leader: check by hand` });
  void flagged;
  const rosterQids = new Set(roster.filter((e) => e.qid && raw.persons[e.qid]).filter((e) => { const m = memberStatus(raw.persons[e.qid], G); return WIKIPEDIA_DECIDES.has(slug) || (m.wd !== 'former' && m.mb !== 'former'); }).map((e) => e.qid));
  return { slug, gi, G, rosterQids, cands, unresolved, rosterSize: roster.length, pastSize: past.length, rosterMismatch };
}

// ---------------------------------------------------------------- run
const results = [];
for (const g of GROUPS) results.push({ g, r: await processGroup(g) });

// select groups in order until the target is reached
let total = 0;
const chosen = [];
for (const { g, r } of results) {
  if (r.skipped) { reportRows.push({ slug: g.slug, status: 'skipped', note: r.skipped }); continue; }
  // a person already taken by an earlier group is dropped here
  const cands = r.cands.filter((c) => { if (seenQid.has(c.wikidata_qid)) { bump(g.slug, 'duplicate_in_k2'); return false; } return true; });
  if (total >= TARGET) { reportRows.push({ slug: g.slug, status: 'not needed', available: cands.length, note: `target of ${TARGET} reached by the groups before it` }); continue; }
  for (const c of cands) seenQid.set(c.wikidata_qid, g.slug);
  total += cands.length;
  if (cands.length) chosen.push({ g, r, cands });
  reportRows.push({ slug: g.slug, status: cands.length ? 'included' : r.cands.length ? 'members carried by another group' : 'not inserted: no member passed the rules', added: cands.length, note: '' });
}
// A person who is a current member of a second target group carries that group in the game's group cell (no second row): other_groups.
const resultBySlug = Object.fromEntries(results.map(({ g, r }) => [g.slug, r]));
for (const { g, cands } of chosen) {
  for (const c of cands) c.other_groups = GROUPS.filter((x) => x.slug !== g.slug && resultBySlug[x.slug]?.rosterQids?.has(c.wikidata_qid)).map((x) => x.slug);
}
for (const { g, r, cands } of chosen) {
  const gi = r.gi;
  out.groups.push({ slug: g.slug, plays: g.plays, wikipedia_title: r.G.wikipedia_title, wikidata_qid: r.G.qid, musicbrainz_mbid: r.G.wd?.mbid ?? null, debut_year: gi.year,
    debut_year_sources: { wikipedia: gi.leadYear ?? gi.wpYear, wikidata: gi.wdYear, musicbrainz_first_release: gi.mbYear, musicbrainz_release_group: gi.first?.id ?? null }, record_label: gi.labels[0] ?? null, record_label_check: gi.labelNote,
    generation: gi.year ? generationOf(gi.year) : null, inception_date: gi.inception_date, members: cands.length });
  for (const c of cands) out.idols.push({ group_slug: c.slug, ...Object.fromEntries(Object.entries(c).filter(([k]) => k !== 'slug')) });
}
// groups need a label and a generation for their idols to be complete: report the ones that have none
for (const gr of out.groups) {
  if (gr.record_label_check.includes('differ')) addConflict({ group: gr.slug, name: '(group)', qid: gr.wikidata_qid, field: 'record_label', kind: 'conflict', note: gr.record_label_check });
  if (!gr.record_label) { addConflict({ group: gr.slug, name: '(group)', qid: gr.wikidata_qid, field: 'record_label', kind: 'single', note: 'no record label on Wikipedia or Wikidata: the group row keeps what it has, its new idols are not complete unless it has a label already' }); }
}

// ---------------------------------------------------------------- 021b: the unreserved yes
for (const [id, qid, name, title] of YES_021B) {
  const p = raw.persons[qid];
  const gp = raw.yes021b[title];
  const row = { id, qid, name, group_page: title, checks: [], ok: true };
  if (!p || !gp) { row.ok = false; row.checks.push('no data fetched'); out.activate_021b.push(row); continue; }
  const wpd = p.wp?.wikitext_head ? birthFromWikitext(p.wp.wikitext_head) : null;
  const ba = agree([{ src: 'wikidata', v: wdBirth(p) }, { src: 'musicbrainz', v: /^\d{4}-\d{2}-\d{2}$/.test(p.mb?.begin ?? '') ? p.mb.begin : null }, { src: 'wikipedia', v: wpd }]);
  if (!['agree', 'majority'].includes(ba.status)) { row.ok = false; row.checks.push(`birth date not agreed (${ba.status})`); }
  else if (!isAdult(ba.value, TODAY)) { row.ok = false; row.checks.push('not an adult'); }
  else row.checks.push(`adult, birth date agreed by ${ba.by.join(' + ')}`);
  const mine = (p.claims.P463 ?? []).filter((c) => c.id === gp.qid);
  if (!mine.length) row.checks.push('Wikidata: no membership statement for the group (silent)');
  else if (mine.every((c) => c.end)) { row.ok = false; row.checks.push('Wikidata: membership has an end date'); }
  else row.checks.push('Wikidata: member, no end date');
  const ib = rosterFromInfobox(gp.wikitext);
  const sec = sectionEntries(gp.wikitext);
  const keys = personKeys(p); keys.add(norm(name));
  // a list entry is the person when it is a stage name or link of the person, or the given name that starts the full name ("Anton" for "Anton Lee")
  const same = (e) => keys.has(norm(e.display)) || (e.target && keys.has(norm(e.target.replace(/\s*\(.*\)$/, '')))) ||
    (norm(e.display).length >= 3 && [...keys].some((k) => k.length > norm(e.display).length && (k.startsWith(norm(e.display)) || k.endsWith(norm(e.display)))));
  const cur = [...ib.current, ...sec.filter((e) => e.status === 'current')];
  const pst = [...ib.past, ...sec.filter((e) => e.status === 'past')];
  if (cur.some(same)) row.checks.push('Wikipedia: in the current list');
  else if (pst.some(same)) { row.ok = false; row.checks.push('Wikipedia: in the past list'); }
  else { row.ok = false; row.checks.push('Wikipedia: not found in the current list'); }
  if (!row.ok) addConflict({ group: row.group_page, name: clean(name), qid, field: 'activation (021b)', kind: 'conflict', note: `held back from the 021b yes list today: ${row.checks.filter((c) => /not|no |differ|past|end date|conflict/i.test(c)).join('; ') || row.checks.join('; ')}` });
  out.activate_021b.push(row);
}

// ---------------------------------------------------------------- invariants (the build refuses to write anything that breaks them)
{
  const seen = new Set(), seenName = new Set();
  for (const i of out.idols) {
    if (!(i.birth_date <= CUT)) throw new Error(`a minor reached the output: ${i.wikidata_qid}`);
    if (seen.has(i.wikidata_qid)) throw new Error(`duplicate QID ${i.wikidata_qid}`);
    if (k1Qids.has(i.wikidata_qid)) throw new Error(`QID already in K1: ${i.wikidata_qid}`);
    if (seenName.has(`${i.group_slug}|${i.name}`)) throw new Error(`duplicate name ${i.name} in ${i.group_slug}`);
    seen.add(i.wikidata_qid); seenName.add(`${i.group_slug}|${i.name}`);
    if (!['female', 'male'].includes(i.gender) || !i.nationality || !i.debut_year || !/^Q[1-9]\d*$/.test(i.wikidata_qid)) throw new Error(`incomplete idol ${i.wikidata_qid}`);
    if (!i.sources.birth_date.length || !i.sources.gender.length || !i.sources.debut_year.length || !i.sources.nationality.length) throw new Error(`no source row for a fact of ${i.wikidata_qid}`);
    for (const s of Object.values(i.sources).flat()) if (!s.ref || !['wikidata', 'musicbrainz'].includes(s.source)) throw new Error(`bad source of ${i.wikidata_qid}`);
  }
  for (const gr of out.groups) if (!gr.record_label || !gr.generation) throw new Error(`group ${gr.slug} would leave its idols without agency or generation`);
}

// ---------------------------------------------------------------- write
const dash = /[\u2013\u2014]/;
const stringify = (o) => JSON.stringify(o, null, 2);
const idolsJson = stringify(out);
if (dash.test(idolsJson)) throw new Error('an en or em dash reached the output');
await writeFile(path.join(HERE, 'data/k2-idols.json'), idolsJson + '\n');
const conflictsJson = stringify({ generated: TODAY, note: 'No birth date and no minor is listed. kind: conflict = sources disagree (nothing stored); single = fewer than two sources (nothing stored); majority = stored, 2 against 1.', conflicts: conflicts.map((c) => ({ ...c, name: clean(c.name), note: clean(c.note) })) });
await writeFile(path.join(HERE, 'data/k2-conflicts.json'), conflictsJson + '\n');

const perGroup = {};
for (const i of out.idols) perGroup[i.group_slug] = (perGroup[i.group_slug] ?? 0) + 1;
const minors = Object.values(counters).reduce((n, c) => n + (c.minor ?? 0), 0);
const minorsChosen = chosen.reduce((n, { g }) => n + (counters[g.slug]?.minor ?? 0), 0);
const kinds = (k) => conflicts.filter((c) => c.kind === k).length;
const lines = [];
lines.push('# Lot K2: report', '');
lines.push(`Run of ${TODAY} by scripts/kpop/k2 (fetch, build, sql). Adult cutoff: born on or before ${CUT}. Sources: Wikidata, MusicBrainz, English Wikipedia. Nothing was read from or written to a database.`, '');
lines.push('## Counts', '');
lines.push(`- New idols (adult, complete, double-checked): **${out.idols.length}** in ${out.groups.length} groups (target ${TARGET}).`);
lines.push(`- 021b activations (the unreserved yes of K1): **${out.activate_021b.filter((r) => r.ok).length}** of ${YES_021B.length}.`);
lines.push(`- Minors excluded: **${minorsChosen}** in the included groups (${minors} counting every group read). Counted only: no name, no date is kept.`);
lines.push(`- Conflict list: data/k2-conflicts.json, ${conflicts.length} lines (${kinds('conflict')} conflicts, ${kinds('single')} single-source, ${kinds('majority')} resolved by majority, ${kinds('owner-decision')} applied under the owner decisions of 2026-11-03).`, '');
lines.push('## Per group', '', '| group | plays | status | idols added | excluded (reason: count) | nationality from Wikidata alone |', '|---|---|---|---|---|---|');
for (const r of reportRows) {
  const c = counters[r.slug] ?? {};
  const ex = Object.entries(c).filter(([k]) => !['minor', 'nationality_stored_single', 'membership_follows_wikipedia'].includes(k)).map(([k, v]) => `${k}: ${v}`).concat(c.minor ? [`minors: ${c.minor}`] : []).join(', ');
  const plays = GROUPS.find((x) => x.slug === r.slug).plays;
  lines.push(`| ${r.slug} | ${plays} | ${r.status}${r.note ? ` (${r.note})` : ''} | ${r.added ?? (r.available != null ? `0 (${r.available} available)` : 0)} | ${ex || '-'} | ${c.nationality_stored_single ?? 0} |`);
}
// why each group that gave nothing gave nothing (this run's facts)
const WHY = {
  kickflip: 'no Wikidata item for the members (MusicBrainz has them, Wikipedia names them): one source for each fact, nothing double-checked',
  xikers: 'no Wikidata item for the members: one source for each fact',
  lngshot: 'no Wikidata item for the members: one source for each fact',
  tuide: 'neither Wikidata nor MusicBrainz gives a birth date: no age can be checked',
  kiiikiii: 'birth dates on Wikidata only (MusicBrainz has none): the age is not double-checked',
};
lines.push('', '## Groups that gave no idol, and why', '');
for (const r of reportRows) if (r.status.startsWith('not inserted') || r.status === 'skipped') lines.push(`- ${r.slug}: ${WHY[r.slug] ?? r.note ?? 'no member passed the rules'}.`);
for (const r of reportRows) if (r.status === 'members carried by another group') lines.push(`- ${r.slug}: its current members are LOONA members; each keeps one row in LOONA and carries ${r.slug} in the group column (idol_other_groups), no second row.`);
lines.push('- nct-127: not processed on purpose. Its members already have rows under NCT (K1); a second row for the same person would put a duplicate in the game.');
lines.push('', '## Conflicts by field', '', '| field | conflict | single source | resolved by majority | owner decision | stored from one source |', '|---|---|---|---|---|---|');
for (const f of [...new Set(conflicts.map((c) => c.field))].sort()) lines.push(`| ${f} | ${conflicts.filter((c) => c.field === f && c.kind === 'conflict').length} | ${conflicts.filter((c) => c.field === f && c.kind === 'single').length} | ${conflicts.filter((c) => c.field === f && c.kind === 'majority').length} | ${conflicts.filter((c) => c.field === f && c.kind === 'owner-decision').length} | ${conflicts.filter((c) => c.field === f && c.kind === 'single-stored').length} |`);
const debutHeld = conflicts.filter((c) => c.field === 'debut_year' && c.kind === 'conflict').length;
lines.push('', '## What would add idols, by decision', '', `- Debut-year conflicts left: ${debutHeld} people, members who joined after their group's debut with no agreed own year (data/k2-conflicts.json).`,
  '- Birth date on one source only (Wikidata, MusicBrainz silent): not inserted, because the age would not be double-checked. Listed as "single" in the conflicts file.');
const extraLinks = out.idols.reduce((n, i) => n + i.other_groups.length, 0);
lines.push('', '## Members of more than one group', '', `- ${out.idols.filter((i) => i.other_groups.length).length} people carry ${extraLinks} other-group links (public.idol_other_groups, created in 020): ` + [...new Set(out.idols.flatMap((i) => i.other_groups))].join(', ') + '. One idol row each, in the first group; the game\'s group cell holds both groups.');
const baseToday = Number(process.argv.includes('--base') ? process.argv[process.argv.indexOf('--base') + 1] : 112);
lines.push('', '## Pool arithmetic', '', `- Kpopdle pool in production today (caller's read-only query): ${baseToday}. Plus ${out.idols.length} new plus ${out.activate_021b.filter((r) => r.ok).length} activated = **${baseToday + out.idols.length + out.activate_021b.filter((r) => r.ok).length}**, against 200 wanted (150 at the very least). Short of 200 by ${Math.max(0, 200 - (baseToday + out.idols.length + out.activate_021b.filter((r) => r.ok).length))}.`,
  '- The local rehearsal base holds no idol of production, only the fixture rows of the 12 021b ids: its own count is the K2 contribution alone (see docs/proofs/k2-idols/).');
lines.push('', '## Group rows the SQL fills when empty', '', '| group | debut year (sources) | record label | generation | inception date |', '|---|---|---|---|---|');
for (const gr of out.groups) lines.push(`| ${gr.slug} | ${gr.debut_year} (wikipedia ${gr.debut_year_sources.wikipedia ?? '-'}, wikidata ${gr.debut_year_sources.wikidata ?? '-'}, musicbrainz ${gr.debut_year_sources.musicbrainz_first_release ?? '-'}) | ${gr.record_label ?? '-'} | ${gr.generation ?? '-'} | ${gr.inception_date ?? '-'} |`);
lines.push('', '## 021b: the unreserved yes, re-checked today', '', '| id | name | result | checks |', '|---|---|---|---|');
for (const r of out.activate_021b) lines.push(`| ${r.id} | ${clean(r.name)} | ${r.ok ? 'activate' : 'HELD BACK'} | ${r.checks.join('; ')} |`);
const rep = lines.join('\n') + '\n';
if (dash.test(rep)) throw new Error('an en or em dash reached the report');
await writeFile(path.join(HERE, 'data/REPORT-K2.md'), rep);
console.log(rep);
