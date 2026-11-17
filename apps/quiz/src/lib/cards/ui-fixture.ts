// Bunnyverse Cards, lane U: A TEST FIXTURE. It stands in for the catalog while the pages are built and tested, with invented groups, invented
// stage names and neutral placeholder pictures (a gradient and a silhouette, drawn here). It is read only when cardsFixtureOn() is true
// (a development server with CARDS_UI_FIXTURE=1, or a test); the production build never reaches it.
import { EDITIONS, computeOdds } from './rules';
import { paletteFor } from './ui-palette';

import type { LockReason, PhotoSource, Rarity } from './types';
import type { UiCard, UiCatalog, UiEntity, UiPanorama, UiPhoto } from './ui-types';
import type { GroupParts } from './types';

// Amendment 1: one free photo per subject, so 4 editions (Standard, Stage, Holo, Gold); Era and Full Art are locked pockets. No events.
interface FxGroup { name: string; debut: number; members: string[] }

const GROUPS: FxGroup[] = [
  { name: 'Aurora Nine', debut: 2014, members: ['Mira', 'Juno', 'Sol Han'] },
  { name: 'Blue Lantern', debut: 2016, members: ['Eun', 'Dalia'] },
  { name: 'Cinder Hall', debut: 2018, members: ['Ash Park', 'Pell', 'Rowan'] },
  { name: 'Delta Bloom', debut: 2020, members: ['Ari', 'Moa'] },
  { name: 'Ember Ridge', debut: 2022, members: ['Tess', 'Odin'] },
  { name: 'Foxglove', debut: 2021, members: ['Vale', 'Nia', 'Quill'] },
  { name: 'Glass Orchard', debut: 2023, members: ['Lio'] },
  { name: 'Harbor Moth', debut: 2019, members: ['Jae-min', 'Suri'] },
];

/** The editions that exist: the plan's four (C, U, R, UR). SR and L stay locked pockets. */
const FIXTURE_RARITIES: readonly Rarity[] = ['C', 'U', 'R', 'UR'];

const SOURCES: PhotoSource[] = ['commons'];
const LICENCES: [string, string, boolean][] = [
  ['CC BY-SA 4.0', 'https://creativecommons.org/licenses/by-sa/4.0/', true],
  ['CC BY 2.0', 'https://creativecommons.org/licenses/by/2.0/', false],
  ['CC BY-SA 2.0', 'https://creativecommons.org/licenses/by-sa/2.0/', true],
  ['CC BY 4.0', 'https://creativecommons.org/licenses/by/4.0/', false],
  ['KOGL Type 1', 'https://www.kogl.or.kr/info/licenseType1.do', false],
];

/** A neutral placeholder picture: a gradient with a head-and-shoulders silhouette. No outside image. */
export function placeholderPicture(entityId: string, slot: number): string {
  const p = paletteFor(`${entityId}#${slot}`);
  const shift = slot * 9;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 560" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${p.a}"/><stop offset="1" stop-color="${p.b}"/></linearGradient></defs><rect width="400" height="560" fill="url(#g)"/><circle cx="${190 + shift}" cy="${210}" r="${70}" fill="${p.c}" opacity=".78"/><path d="M${60 + shift} 560 C ${70 + shift} 380 ${140 + shift} 320 ${190 + shift} 320 C ${250 + shift} 320 ${320 + shift} 380 ${330 + shift} 560 Z" fill="${p.c}" opacity=".62"/></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function photoFor(entityId: string, serial: number): UiPhoto {
  const lic = LICENCES[serial % LICENCES.length]!;
  return {
    id: serial, slot: 1, author: `Photographer ${serial}`, authorUrl: serial % 3 ? `https://example.org/people/${serial}` : null,
    licence: lic[0], licenceUrl: lic[1], source: SOURCES[serial % SOURCES.length]!,
    sourcePage: `https://commons.wikimedia.org/wiki/File:Example-${serial}.jpg`, shareAlike: lic[2], modified: 'cropped, frame and text added',
    focalX: 50, focalY: 30, src: placeholderPicture(entityId, 1), 
  };
}

/** Lot 2: a neutral wide placeholder for a group photo (four silhouettes), so the two halves of a pair show one picture split in two.
 *  Lot 7: for a photo in 3 cards the picture is wider (six silhouettes, the 16.5:8.5 window), so the three thirds show one picture split in three. */
export function placeholderGroupPicture(entityId: string, parts: GroupParts = 2): string {
  const p = paletteFor(`${entityId}#group${parts === 3 ? '3' : ''}`);
  const w = parts === 3 ? 1650 : 1200;
  const h = parts === 3 ? 850 : 675;
  const xs = parts === 3 ? [110, 360, 610, 860, 1110, 1360] : [180, 420, 660, 900];
  const heads = xs.map((x, i) => `<circle cx="${x + 60}" cy="${250 - (i % 2) * 30}" r="70" fill="${p.c}" opacity=".78"/><path d="M${x - 40} ${h} C ${x - 30} 470 ${x + 20} 400 ${x + 60} 400 C ${x + 110} 400 ${x + 160} 470 ${x + 170} ${h} Z" fill="${p.c}" opacity=".62"/>`).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${p.a}"/><stop offset="1" stop-color="${p.b}"/></linearGradient></defs><rect width="${w}" height="${h}" fill="url(#g)"/>${heads}</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/** Lot 7: the panorama of a group edition, on the same neutral placeholder as its parts (the source photo, cropped in CSS to the window). */
function fixturePano(p: number, e: UiEntity, r: Rarity, parts: GroupParts, cardNs: number[], photo: UiPhoto): UiPanorama {
  return {
    p, num: `P-${String(p).padStart(4, '0')}`, entity: e.id, rarity: r, edition: EDITIONS[r].edition, name: e.name, parts, cards: cardNs, photo,
    image: { url: null, url2x: null, partUrls: null, sourceUrl: photo.src ?? null, focalX: 50, focalY: 50, small2x: false },
  };
}

/** The whole fixture catalog: the numbers go groups A to Z (the people, then the group card), 4 numbers a subject in the order C, U, R, UR.
 *  Lot 2: with `pairs`, a group gives a pair per edition (8 numbers, 1/2 then 2/2) on a wide placeholder; off by default, so the existing
 *  tests read the same catalog. A development server turns it on with CARDS_UI_FIXTURE_PAIRS=1. With `full` (CARDS_UI_FIXTURE_FULL=1) the Era and Full Art editions exist too.
 *  Lot 7: with `pano` (needs `pairs`; CARDS_UI_FIXTURE_PANO=1) every group edition has its panorama (P-0001 and up) and the Rare photo of Cinder Hall
 *  is in 3 cards (three consecutive numbers, 1/3 to 3/3); every part then carries `parts`, `setNs` and `pano`. */
export function buildFixtureCatalog(opts: { pairs?: boolean; full?: boolean; pano?: boolean } = {}): UiCatalog {
  // With `full` the six editions exist (Era and Full Art too), so the screen comparisons and the Full Art control have a Full Art card to show.
  const RARITIES: readonly Rarity[] = opts.full ? ['C', 'U', 'R', 'SR', 'UR', 'L'] : FIXTURE_RARITIES;
  const entities: UiEntity[] = [];
  const cards: UiCard[] = [];
  const panoramas: UiPanorama[] = [];
  let n = 0;
  let serial = 100;
  const lockAll: UiEntity['lockReasons'] = opts.full ? {} : { SR: 'one', L: 'one' };
  const push = (e: UiEntity): void => {
    serial += 1;
    if (opts.pairs && e.kind === 'group') {
      const photo: UiPhoto = { ...photoFor(e.id, serial), focalY: 50, src: placeholderGroupPicture(e.id) };
      for (const r of RARITIES) {
        // Lot 7: the Rare photo of Cinder Hall is in 3 cards (its own wide placeholder), every other one in 2.
        const parts: GroupParts = opts.pano && e.name === 'Cinder Hall' && r === 'R' ? 3 : 2;
        const shot: UiPhoto = parts === 3 ? { ...photo, src: placeholderGroupPicture(e.id, 3) } : photo;
        const ns = Array.from({ length: parts }, (_, k) => n + 1 + k);
        const pno = panoramas.length + 1;
        for (let part = 1; part <= parts; part++) {
          n += 1;
          cards.push({
            n, num: `BV1-${String(n).padStart(4, '0')}`, entity: e.id, kind: e.kind, rarity: r, edition: EDITIONS[r].edition, name: e.name,
            group: e.group, debutYear: e.debutYear, photo: shot, part: part as 1 | 2 | 3, pairN: parts === 3 ? null : part === 1 ? n + 1 : n - 1, ...(e.endYear ? { endYear: e.endYear } : {}),
            ...(opts.pano ? { parts, setNs: ns, pano: pno } : {}),
          });
        }
        if (opts.pano) panoramas.push(fixturePano(pno, e, r, parts, ns, shot));
      }
      return;
    }
    for (const r of RARITIES) {
      n += 1;
      cards.push({ n, num: `BV1-${String(n).padStart(4, '0')}`, entity: e.id, kind: e.kind, rarity: r, edition: EDITIONS[r].edition, name: e.name, group: e.group, debutYear: e.debutYear, photo: photoFor(e.id, serial) });
    }
  };
  [...GROUPS].sort((a, b) => a.name.localeCompare(b.name)).forEach((g, gi) => {
    for (const name of g.members) {
      const e: UiEntity = { id: `idol:Q${gi}${name}`, kind: 'idol', name, group: g.name, debutYear: g.debut, sortKey: `${g.name}|${name}`, lockReasons: lockAll };
      entities.push(e);
      push(e);
    }
    // Lot 2, pairs only: one invented group is disbanded, so the card shows its year (owner decision 2026-11-12).
    const end = opts.pairs && g.name === 'Harbor Moth' ? { endYear: 2023 } : {};
    const ge: UiEntity = { id: `group:Q${gi}`, kind: 'group', name: g.name, group: null, debutYear: g.debut, sortKey: `${g.name}|~`, lockReasons: lockAll, ...end };
    entities.push(ge);
    push(ge);
  });
  return { odds: computeOdds(cards.map((c) => ({ n: c.n, kind: c.kind, rarity: c.rarity, ...(opts.pairs ? { entity: c.entity } : {}) }))), cards, entities, ...(panoramas.length ? { panoramas } : {}) };
}


// ---- The prototype's catalog (development server only): the nine groups and four soloists of docs/design/cards/kpopcards-prototype-v6.html, with its photo counts
// (an idol joins packs with two free photos, one edition per photo), so the screens can be compared with the prototype box by box. Test shape (4 editions,
// invented groups) stays the default under vitest; a development server uses this one unless CARDS_UI_FIXTURE_SHAPE=small.
interface ProtoGroup { id: string; name: string; debut: number; gp: number; theme: 'girls' | 'boys'; m: [string, number, LockReason?][] }
const PROTO_GROUPS: ProtoGroup[] = [
  { id: 'bts', name: 'BTS', debut: 2013, gp: 4, theme: 'boys', m: [['RM', 6], ['Jin', 6], ['j-hope', 5], ['Jimin', 6], ['V', 6], ['Jungkook', 6]] },
  { id: 'blackpink', name: 'BLACKPINK', debut: 2016, gp: 4, theme: 'girls', m: [['Jisoo', 6], ['Jennie', 6], ['Rosé', 6], ['Lisa', 6]] },
  { id: 'twice', name: 'TWICE', debut: 2015, gp: 3, theme: 'girls', m: [['Nayeon', 6], ['Jeongyeon', 4, 'hiatus'], ['Momo', 5], ['Sana', 5], ['Jihyo', 6], ['Mina', 4, 'hiatus'], ['Dahyun', 5], ['Chaeyoung', 4], ['Tzuyu', 5]] },
  { id: 'seventeen', name: 'SEVENTEEN', debut: 2015, gp: 3, theme: 'boys', m: [['S.Coups', 4, 'hiatus'], ['Woozi', 5], ['Hoshi', 5], ['DK', 4], ['Mingyu', 6], ['Vernon', 5]] },
  { id: 'straykids', name: 'Stray Kids', debut: 2018, gp: 3, theme: 'boys', m: [['Bang Chan', 6], ['Lee Know', 5], ['Changbin', 4], ['Hyunjin', 6], ['Han', 5], ['Felix', 6], ['Seungmin', 4], ['I.N', 4, 'crop']] },
  { id: 'ateez', name: 'ATEEZ', debut: 2018, gp: 3, theme: 'boys', m: [['Hongjoong', 5], ['Seonghwa', 4], ['Yunho', 4], ['San', 5], ['Wooyoung', 4]] },
  { id: 'aespa', name: 'aespa', debut: 2020, gp: 2, theme: 'girls', m: [['Karina', 3], ['Giselle', 2, 'sameday'], ['Winter', 3], ['Ningning', 2, 'sameday']] },
  { id: 'itzy', name: 'ITZY', debut: 2019, gp: 2, theme: 'girls', m: [['Yeji', 4], ['Lia', 2, 'hiatus'], ['Ryujin', 4], ['Chaeryeong', 3], ['Yuna', 3, 'crop']] },
  { id: 'kep1er', name: 'Kep1er', debut: 2022, gp: 2, theme: 'girls', m: [['Choi Yujin', 3], ['Xiaoting', 2, 'sameday'], ['Hikaru', 2, 'sameday'], ['Chaehyun', 1], ['Dayeon', 1], ['Bahiyyih', 1]] },
];
const PROTO_SOLOISTS: [string, number, number][] = [['IU', 6, 2008], ['Taeyeon', 5, 2015], ['Chungha', 4, 2017], ['Heize', 3, 2014]];
const PROTO_RARITIES: readonly Rarity[] = ['C', 'U', 'R', 'SR', 'UR', 'L'];

/** With `pano` (CARDS_UI_FIXTURE_PANO=1) every group photo has its panorama and the Rare photo of BTS is in 3 cards; off by default so the numbers and
 *  the pages stay the prototype's (the QA harness compares them box by box). */
export function buildProtoCatalog(opts: { pano?: boolean } = {}): UiCatalog {
  const entities: UiEntity[] = [];
  const cards: UiCard[] = [];
  const panoramas: UiPanorama[] = [];
  let n = 0;
  let serial = 100;
  let q = 9000;
  const add = (e: UiEntity, r: Rarity, extra: Partial<UiCard>, photo: UiPhoto): void => {
    n += 1;
    cards.push({ n, num: `BV1-${String(n).padStart(4, '0')}`, entity: e.id, kind: e.kind, rarity: r, edition: EDITIONS[r].edition, name: e.name, group: e.group, debutYear: e.debutYear, photo, ...extra });
  };
  const idol = (name: string, photos: number, reason: LockReason | undefined, group: string | null, debut: number, order: string, slug: string): void => {
    q += 1; serial += 1;
    const lock: UiEntity['lockReasons'] = {};
    PROTO_RARITIES.forEach((r, i) => { if (!(photos >= 2 && i < photos)) lock[r] = photos < 2 ? 'one' : (reason ?? 'one'); });
    const e: UiEntity = { id: `idol:Qkc-${slug}-${q}`, kind: 'idol', name, group, debutYear: debut, sortKey: order, lockReasons: lock };
    entities.push(e);
    PROTO_RARITIES.forEach((r, i) => { if (photos >= 2 && i < photos) add(e, r, {}, photoFor(e.id, serial)); });
  };
  PROTO_GROUPS.forEach((g, gi) => {
    const key = String(gi).padStart(2, '0');
    g.m.forEach(([name, photos, reason], mi) => idol(name, photos, reason, g.name, g.debut, `${key}|${String(mi).padStart(2, '0')}`, g.id));
    q += 1; serial += 1;
    const lock: UiEntity['lockReasons'] = {};
    PROTO_RARITIES.forEach((r, i) => { if (i >= g.gp) lock[r] = 'one'; });
    const ge: UiEntity = { id: `group:Qkc-${g.id}`, kind: 'group', name: g.name, group: null, debutYear: g.debut, sortKey: `${key}|~`, lockReasons: lock };
    entities.push(ge);
    const photo: UiPhoto = { ...photoFor(ge.id, serial), focalY: 50, src: placeholderGroupPicture(ge.id) };
    PROTO_RARITIES.forEach((r, i) => {
      if (i >= g.gp) return;
      const parts: GroupParts = opts.pano && g.id === 'bts' && r === 'R' ? 3 : 2;
      const shot: UiPhoto = parts === 3 ? { ...photo, src: placeholderGroupPicture(ge.id, 3) } : photo;
      const ns = Array.from({ length: parts }, (_, k) => n + 1 + k);
      const pno = panoramas.length + 1;
      for (let part = 1; part <= parts; part++) {
        add(ge, r, { part: part as 1 | 2 | 3, pairN: parts === 3 ? null : part === 1 ? n + 2 : n, ...(opts.pano ? { parts, setNs: ns, pano: pno } : {}) }, shot);
      }
      if (opts.pano) panoramas.push(fixturePano(pno, ge, r, parts, ns, shot));
    });
  });
  PROTO_SOLOISTS.forEach(([name, photos, debut], si) => idol(name, photos, undefined, null, debut, `99|${String(si).padStart(2, '0')}`, 'solo'));
  return { odds: computeOdds(cards.map((c) => ({ n: c.n, kind: c.kind, rarity: c.rarity, entity: c.entity }))), cards, entities, ...(panoramas.length ? { panoramas } : {}) };
}

/** The theme of each entity of the prototype catalog (girl groups, boy groups, soloists); null for the small test shape. */
export function fixtureThemes(cat: UiCatalog): Map<string, 'girls' | 'boys' | 'solo'> | null {
  if (!cat.entities.some((e) => e.name === 'BTS')) return null;
  const out = new Map<string, 'girls' | 'boys' | 'solo'>();
  const themeOfGroup = new Map(PROTO_GROUPS.map((g) => [g.name, g.theme] as const));
  for (const e of cat.entities) out.set(e.id, e.kind === 'group' ? (themeOfGroup.get(e.name) ?? 'solo') : e.group ? (themeOfGroup.get(e.group) ?? 'solo') : 'solo');
  return out;
}

let memo: UiCatalog | null = null;
export function fixtureCatalog(): UiCatalog {
  // The browser's mock world reads this catalog too, and a browser bundle only inlines NEXT_PUBLIC_ variables: the dev server sets both spellings.
  const pano = process.env.NODE_ENV !== 'production' && (process.env.CARDS_UI_FIXTURE_PANO === '1' || process.env.NEXT_PUBLIC_CARDS_UI_FIXTURE_PANO === '1');
  if (process.env.NODE_ENV === 'development' && process.env.CARDS_UI_FIXTURE_SHAPE !== 'small') return (memo ??= buildProtoCatalog({ pano }));
  memo ??= buildFixtureCatalog({ pairs: pano || (process.env.NODE_ENV !== 'production' && process.env.CARDS_UI_FIXTURE_PAIRS === '1'), full: process.env.NODE_ENV !== 'production' && process.env.CARDS_UI_FIXTURE_FULL === '1', pano });
  return memo;
}
