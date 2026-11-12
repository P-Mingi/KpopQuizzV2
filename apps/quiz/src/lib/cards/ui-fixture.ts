// Bunnyverse Cards, lane U: A TEST FIXTURE. It stands in for the catalog while the pages are built and tested, with invented groups, invented
// stage names and neutral placeholder pictures (a gradient and a silhouette, drawn here). It is read only when cardsFixtureOn() is true
// (a development server with CARDS_UI_FIXTURE=1, or a test); the production build never reaches it.
import { EDITIONS, KIND_RARITIES, RARITIES } from './rules';
import { paletteFor } from './ui-palette';

import type { LockReason, PhotoSource, Rarity } from './types';
import type { UiCard, UiCatalog, UiEntity, UiPhoto } from './ui-types';

interface FxGroup { name: string; debut: number; members: [string, 1 | 2 | 3, LockReason?][] }

const GROUPS: FxGroup[] = [
  { name: 'Aurora Nine', debut: 2014, members: [['Mira', 3], ['Juno', 3], ['Sol', 3], ['Hana Park', 3], ['Revi', 3], ['Tae', 3]] },
  { name: 'Blue Lantern', debut: 2016, members: [['Eun', 3], ['Dalia', 3], ['Nori', 3], ['Kaya', 3]] },
  { name: 'Cinder Hall', debut: 2018, members: [['Ash', 3], ['Pell', 3], ['Rowan', 3], ['Ivo', 3], ['Lune', 3]] },
  { name: 'Delta Bloom', debut: 2020, members: [['Ari', 3], ['Moa', 3], ['Zen', 3], ['Yui Ko', 3]] },
  { name: 'Ember Ridge', debut: 2022, members: [['Tess', 2, 'newg'], ['Odin', 2, 'newg'], ['Pia', 2, 'newg'], ['Rex', 1, 'hiatus']] },
  { name: 'Foxglove', debut: 2021, members: [['Vale', 2, 'sameday'], ['Nia', 2, 'sameday'], ['Bo', 2, 'sameday'], ['Quill', 1, 'one'], ['Sera', 1, 'one']] },
  { name: 'Glass Orchard', debut: 2023, members: [['Lio', 1, 'newg'], ['Maru', 1, 'newg'], ['Cleo', 2, 'newg']] },
  { name: 'Harbor Moth', debut: 2019, members: [['Jae-min', 3], ['Suri', 3], ['Dov', 3], ['Echo', 2, 'crop']] },
];

const EVENTS: { name: string; year: number; type: string }[] = [
  { name: 'Lantern Music Awards', year: 2018, type: 'Award show' },
  { name: 'Golden Reel Awards', year: 2018, type: 'Award show' },
  { name: 'Harvest Stage Festival', year: 2017, type: 'Festival' },
  { name: 'Riverside Live Concert', year: 2019, type: 'Concert' },
  { name: 'Night Market Fest', year: 2023, type: 'Festival' },
];

const SOURCES: PhotoSource[] = ['commons', 'commons', 'koreanet', 'flickr', 'commons', 'dvids'];
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

function photoFor(entityId: string, slot: 1 | 2 | 3, serial: number): UiPhoto {
  const lic = LICENCES[serial % LICENCES.length]!;
  return {
    id: serial, slot, author: `Photographer ${serial}`, authorUrl: serial % 3 ? `https://example.org/people/${serial}` : null,
    licence: lic[0], licenceUrl: lic[1], source: SOURCES[serial % SOURCES.length]!,
    sourcePage: `https://commons.wikimedia.org/wiki/File:Example-${serial}.jpg`, shareAlike: lic[2], modified: 'cropped, frame and text added',
    focalX: 40 + (serial * 7) % 25, focalY: 18 + (serial * 5) % 14, src: placeholderPicture(entityId, slot), eventName: `Example event ${serial}`,
  };
}

/** The whole fixture catalog: the numbers go groups A to Z (idols, then the group cards), events last, as decision 2 of the plan. */
export function buildFixtureCatalog(): UiCatalog {
  const entities: UiEntity[] = [];
  const cards: UiCard[] = [];
  let n = 0;
  let serial = 100;
  const push = (e: UiEntity, rarities: readonly Rarity[]): void => {
    for (const r of rarities) {
      const info = EDITIONS[r];
      n += 1;
      const photo = e.kind === 'event' ? null : photoFor(e.id, info.photoSlot, ++serial + (info.photoSlot - 1) * 17);
      cards.push({ n, num: `BV1-${String(n).padStart(4, '0')}`, entity: e.id, kind: e.kind, rarity: r, edition: info.edition, name: e.name, group: e.group, debutYear: e.debutYear, photo });
    }
  };
  [...GROUPS].sort((a, b) => a.name.localeCompare(b.name)).forEach((g, gi) => {
    for (const [name, photos, reason] of g.members) {
      const have = RARITIES.filter((r) => (r === 'SR' ? photos >= 2 : r === 'L' ? photos >= 3 : true));
      const locks: UiEntity['lockReasons'] = {};
      if (photos < 3) locks.L = reason ?? 'crop';
      if (photos < 2) locks.SR = reason ?? 'one';
      const e: UiEntity = { id: `idol:Q${gi}${name}`, kind: 'idol', name, group: g.name, debutYear: g.debut, sortKey: `${g.name}|${name}`, lockReasons: locks };
      entities.push(e);
      push(e, have);
    }
    const ge: UiEntity = { id: `group:Q${gi}`, kind: 'group', name: g.name, group: null, debutYear: g.debut, sortKey: `${g.name}|~`, lockReasons: {} };
    entities.push(ge);
    push(ge, KIND_RARITIES.group);
  });
  for (const ev of EVENTS) {
    const e: UiEntity = { id: `event:${ev.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`, kind: 'event', name: ev.name, group: null, debutYear: ev.year, sortKey: `~|${ev.name}`, lockReasons: {}, eventType: ev.type };
    entities.push(e);
    push(e, KIND_RARITIES.event);
  }
  return { cards, entities };
}

let memo: UiCatalog | null = null;
export function fixtureCatalog(): UiCatalog {
  memo ??= buildFixtureCatalog();
  return memo;
}
