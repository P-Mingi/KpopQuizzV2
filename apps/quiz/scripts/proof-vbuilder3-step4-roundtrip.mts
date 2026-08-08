// V-BUILDER-3 step 4 receipt R-A - DRAFT ROUND-TRIP (owed from step 4).
// Scriptable, no UI, no DB: exercises the REAL save->reload path a member edit takes.
//   builder composition
//     -> compositionToPresentation           (what the save rail POSTs)
//     -> JSON.stringify / JSON.parse          (the jsonb write)
//     -> validatePresentation                 (the exact server validation on save)
//     -> JSON.stringify / JSON.parse          (the jsonb read on reload)
//     -> presentationToComposition            (what the builder re-hydrates)
// Then asserts: the member ORDER, the PHOTO override and the NAME override all
// survive intact, and EVERY block id is UNCHANGED (the stable-id law). A second
// save of the reloaded config is byte-identical (idempotent reload = no drift).
//   pnpm -C apps/quiz exec tsx scripts/proof-vbuilder3-step4-roundtrip.mts
import { compositionToPresentation, presentationToComposition } from '../src/lib/verse/composition/convert';
import { validatePresentation } from '../src/lib/verse/presentation/validate';
import type { Composition } from '../src/lib/verse/composition/types';
import type { Presentation } from '../src/lib/verse/presentation/types';

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
let failures = 0;
const check = (name: string, cond: boolean, detail = ''): void => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? `  -> ${detail}` : ''}`);
  if (!cond) failures += 1;
};

// ---------------------------------------------------------------------------
// A realistic draft: the full seoCritical spine (so the validator injects
// nothing) with STABLE persisted ids, and a members block whose `rows` prop
// carries an explicit member ORDER plus one photo override and one name
// override - exactly what the members editor writes to the draft.
// Order is intentionally NOT the roster's natural order: rows = [7, 3, 12].
// Member 3 gets a photo override (a storage path, never an external URL);
// member 12 gets a display-name override.
const PHOTO_OVERRIDE = 'space/42/9f8e7d6c5b4a.webp';  // an ingest-copied storage path (assetish)
const NAME_OVERRIDE = 'Leader Jae';

const rows = [
  { member: 7 },
  { member: 3, photo: PHOTO_OVERRIDE },
  { member: 12, name: NAME_OVERRIDE },
];

const start: Composition = {
  version: 1,
  meta: { accent: '#7c5cfc', tabs: ['home', 'members', 'community'] },
  sections: [{
    id: 'home', width: 'wide', blocks: [
      { id: 'blk-intro-0', type: 'intro', zone: 'main' },
      { id: 'blk-vitals-0', type: 'vitals', zone: 'main' },
      { id: 'blk-members-0', type: 'members', zone: 'main', props: { rows: clone(rows) } },
      { id: 'blk-discography-0', type: 'discography', zone: 'main' },
    ],
  }],
};

// ---- SAVE: composition -> presentation -> jsonb -> validate ----------------
const posted: Presentation = compositionToPresentation(start);
const onWire = clone(posted);                          // the jsonb write
const saved = validatePresentation(onWire);            // the server's save-time validation
check('save accepted (validator ok, no errors)', saved.ok && saved.errors.length === 0,
  saved.errors.join(' | ') || 'ok');
if (!saved.ok || !saved.value) { console.log(`\nR-A FAILED (${failures})`); process.exit(1); }

// ---- RELOAD: jsonb read -> presentation -> composition ---------------------
const fromDb = clone(saved.value);                     // the jsonb read on reload
const reloaded = presentationToComposition(fromDb);
const blocks = reloaded.sections[0]!.blocks;
const membersBlk = blocks.find((b) => b.type === 'members');

// ---- ASSERT: ids unchanged -------------------------------------------------
const startIds = start.sections[0]!.blocks.map((b) => b.id).sort();
const reloadIds = blocks.map((b) => b.id).sort();
check('block count unchanged (no injection, no drop)', startIds.length === reloadIds.length,
  `${startIds.length} -> ${reloadIds.length}`);
check('EVERY block id unchanged (stable-id law)', JSON.stringify(startIds) === JSON.stringify(reloadIds),
  reloadIds.join(', '));
check('members block id is still blk-members-0', membersBlk?.id === 'blk-members-0', String(membersBlk?.id));

// ---- ASSERT: member order + overrides intact -------------------------------
// NOTE: the entityRef clamp persists a member id as a STRING ("7"), by design -
// the members editor reads it back via Number(r.member), so the round-trip is
// lossless through the editor. The receipt asserts the REAL stored form.
const outRows = (membersBlk?.props?.rows ?? []) as Array<Record<string, unknown>>;
const orderOf = (rs: Array<Record<string, unknown>>) => rs.map((r) => String(r.member));
check('members rows count intact', outRows.length === 3, `${outRows.length} rows`);
check('member ORDER preserved [7,3,12]',
  JSON.stringify(orderOf(outRows)) === JSON.stringify(['7', '3', '12']),
  JSON.stringify(orderOf(outRows)));
const row3 = outRows.find((r) => String(r.member) === '3');
const row12 = outRows.find((r) => String(r.member) === '12');
check('PHOTO override preserved on member 3', row3?.photo === PHOTO_OVERRIDE, String(row3?.photo));
check('NAME override preserved on member 12', row12?.name === NAME_OVERRIDE, String(row12?.name));
check('non-overridden member 7 stays a bare row (no fabricated fields)',
  JSON.stringify(outRows.find((r) => String(r.member) === '7')) === JSON.stringify({ member: '7' }),
  JSON.stringify(outRows.find((r) => String(r.member) === '7')));

// ---- ASSERT: reload is idempotent (a re-save does not drift) ---------------
const resaved = validatePresentation(clone(compositionToPresentation(reloaded)));
check('re-save accepted', resaved.ok, resaved.errors.join(' | ') || 'ok');
check('re-saved modules byte-identical to first save (no drift on reload)',
  JSON.stringify(resaved.value?.modules) === JSON.stringify(saved.value.modules));

// ---- ASSERT: the members props survived the validator's schema clamp -------
// (member id coerced to string by the entityRef clamp; overrides verbatim.)
const expectStored = rows.map((r) => ({ ...r, member: String(r.member) }));
const savedMembers = saved.value.modules?.find((m) => m.type === 'members');
check('validator kept the members rows (schema clamp preserved overrides)',
  JSON.stringify(savedMembers?.props?.rows) === JSON.stringify(expectStored),
  JSON.stringify(savedMembers?.props?.rows));

console.log(`\nR-A round-trip: ${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`);
process.exit(failures === 0 ? 0 : 1);
