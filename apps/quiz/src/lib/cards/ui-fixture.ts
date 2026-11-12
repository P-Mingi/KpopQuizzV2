// Bunnyverse Cards, lane U: A TEST FIXTURE. It stands in for the catalog while the pages are built and tested, with invented groups, invented
// stage names and neutral placeholder pictures (a gradient and a silhouette, drawn here). It is read only when cardsFixtureOn() is true
// (a development server with CARDS_UI_FIXTURE=1, or a test); the production build never reaches it.
import { EDITIONS } from './rules';
import { paletteFor } from './ui-palette';

import type { PhotoSource, Rarity } from './types';
import type { UiCard, UiCatalog, UiEntity, UiPhoto } from './ui-types';

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

/** The whole fixture catalog: the numbers go groups A to Z (the people, then the group card), 4 numbers a subject in the order C, U, R, UR. */
export function buildFixtureCatalog(): UiCatalog {
  const entities: UiEntity[] = [];
  const cards: UiCard[] = [];
  let n = 0;
  let serial = 100;
  const lockAll: UiEntity['lockReasons'] = { SR: 'one', L: 'one' };
  const push = (e: UiEntity): void => {
    serial += 1;
    for (const r of FIXTURE_RARITIES) {
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
    const ge: UiEntity = { id: `group:Q${gi}`, kind: 'group', name: g.name, group: null, debutYear: g.debut, sortKey: `${g.name}|~`, lockReasons: lockAll };
    entities.push(ge);
    push(ge);
  });
  return { cards, entities };
}

let memo: UiCatalog | null = null;
export function fixtureCatalog(): UiCatalog {
  memo ??= buildFixtureCatalog();
  return memo;
}
