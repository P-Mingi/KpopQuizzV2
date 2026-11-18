// Bunnyverse Cards, lot LAUNCH-PREP lane REFILL: writes docs/pending-migrations/cards/123-refill.sql and its rollback, and
// docs/design/cards/data/lot8/photos.json (the new photos, read by the publish workflow by source page), from the verdicts of the refill
// and the export of production with 119 applied (all under out/, git-ignored: they never enter the repository). No network, no database.
//   tsx scripts/cards/gen-refill-sql.mts [--verdicts out/launch-prep/refill/verdicts.json] [--export out/launch-prep/cards-live-2026-11-17.json]
//                                        [--entities out/launch-prep/cards-entities-2026-11-17.json] [--plan119 out/launch-prep/pc/plan.json]
// The verdicts hold, per subject, its good photos best looking first (the ids of the photos it keeps, the keys of its new photos), the new
// photos with their Commons credit and the pending photos accepted. No personal date is in them: the age rule was applied before.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { publicJson } from '../../src/lib/cards/harvest-checks';
import { after119, refillData, type RefillSubject, type State, type Unit119 } from '../../src/lib/cards/refill-data';
import { buildRefill, type RfUnit } from '../../src/lib/cards/refill-sql';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
export const OUT = path.join(REPO, 'docs/pending-migrations/cards');
export const LOT8 = path.join(REPO, 'docs/design/cards/data/lot8');

/** The lot 8 data file: lot 3's shape (subjects with photos), one entry per new photo of 123, so the publish workflow finds its original. */
export function lot8Of(units: RfUnit[], names: Map<string, { name: string; kind: string }>, checked_on: string): unknown {
  return {
    checked_on,
    rules: 'the rules of 119 (lane PHOTOCHECK, 2026-11-17) and the brief of lane REFILL (2026-11-18): a free Commons licence (CC0, public domain, CC BY, CC BY-SA, KOGL Type 1) with a named author, no deletion request and no open licence review; the subject named by the Commons title, description or categories; no other clearly visible person who is not named and verified 18 or older on the photo date; the age rule on the photo date and today; one occasion per edition; no crowd, no curtain call, not too small, not blurry, only good looking pictures; no image of the film KPop Demon Hunters. Verdicts and credits only: no personal date of anyone.',
    sources: 'Wikimedia Commons API (categories, imageinfo, extmetadata, thumbnails) and Wikidata (the dates the age rule needs and the memberships, read in memory, never written), read on the day above',
    subjects: units.filter((u) => u.add.length).map((u) => {
      const slug = u.entity.split(':')[1]!;
      const e = names.get(u.entity)!;
      return {
        slug, name: e.name, kind: e.kind, end_year: null,
        photos: u.add.map((n) => ({
          source: 'commons', page: n.page, file: decodeURIComponent(n.page.replace(/^.*\/wiki\/File:/, '')).replace(/_/g, ' '), url: n.url,
          width: n.width, height: n.height, sha1: n.sha1, author: n.author, author_url: n.author_url, licence: n.licence, licence_url: n.licence_url,
          share_alike: n.share_alike, date: n.date, date_precision: 'day', event: n.event, stage: n.stage, quality: n.quality, focal: { x: n.fx, y: n.fy },
          source_path: null, news_only: false, slot: n.slot, status: 'approved', parts: n.parts, review: [], reasons: [], age: { ok: true, reason: null },
        })),
      };
    }),
    left_out: [],
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const arg = (name: string, def: string): string => { const i = process.argv.indexOf(name); return i >= 0 ? process.argv[i + 1]! : def; };
  const read = (f: string) => JSON.parse(readFileSync(path.resolve(REPO, f), 'utf8'));
  const verdicts = read(arg('--verdicts', 'out/launch-prep/refill/verdicts.json')) as { checked_on: string; subjects: RefillSubject[] };
  const exp = read(arg('--export', 'out/launch-prep/cards-live-2026-11-17.json'));
  const ents = read(arg('--entities', 'out/launch-prep/cards-entities-2026-11-17.json')) as Array<{ id: string; kind: string; name: string; lock_reasons: Record<string, string> }>;
  const plan119 = read(arg('--plan119', 'out/launch-prep/pc/plan.json')) as { units: Unit119[] };
  const state = after119({ photos: exp.photos, catalog: exp.catalog, panoramas: exp.panoramas, entities: ents } as State, plan119.units);
  const approvedBy119 = new Set(plan119.units.flatMap((u) => u.photos.filter((p) => p.new.status === 'approved').map((p) => p.id)));
  const { data, planned } = refillData(state, verdicts.subjects, verdicts.checked_on, 'cards-live-2026-11-17.json with 119-photocheck.sql applied', approvedBy119);
  const out = buildRefill(data);
  writeFileSync(path.join(OUT, '123-refill.sql'), out.sql);
  writeFileSync(path.join(OUT, '123-refill.rollback.sql'), out.rollback);
  mkdirSync(LOT8, { recursive: true });
  writeFileSync(path.join(LOT8, 'photos.json'), publicJson(lot8Of(data.units, new Map(ents.map((e) => [e.id, e])), verdicts.checked_on)));
  writeFileSync(path.resolve(REPO, 'out/launch-prep/refill/planned.json'), JSON.stringify(planned, null, 1));
  console.log(`wrote 123 (${out.units} subjects, ${out.sql.length} bytes; rollback ${out.rollback.length} bytes) and lot8/photos.json`, JSON.stringify(data.expect));
}
