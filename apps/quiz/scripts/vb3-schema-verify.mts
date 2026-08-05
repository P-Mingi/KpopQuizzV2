// V-BUILDER-3 step 1 proof: the editorSchema foundation.
//   (a) COMPLETENESS: every wave-1 schema is present + well-formed; every BLOCK_SPEC
//       either carries an editorSchema or is a documented deferral (coverage report).
//   (b) VALIDATOR CLAMPS: hostile content payloads are clamped/rejected with human
//       sentences (via the real validatePresentation for module blocks, and via
//       clampPropsBySchema for the not-yet-placeable image/youtube/hero/doorway).
//   (c) BYTE-PARITY: the quote clamp reproduces the legacy validator behavior exactly.
//   npx tsx scripts/vb3-schema-verify.mts
import { EDITOR_SCHEMAS, editorSchema, clampPropsBySchema } from '../src/lib/verse/composition/editor-schema';
import { allBlockSpecs, blockSpec } from '../src/lib/verse/composition/registry';
import { validatePresentation } from '../src/lib/verse/presentation/validate';
import type { EditorField } from '../src/lib/verse/composition/editor-schema';

let failed = 0;
const check = (name: string, cond: boolean, detail = '') => {
  console.log(`  ${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? ' :: ' + detail : ''}`);
  if (!cond) failed++;
};

const WAVE1 = ['hero', 'vitals', 'members', 'image', 'youtube', 'stats', 'timeline', 'quote', 'doorway'];
const FIELD_KINDS = new Set(['text', 'richtext', 'image', 'url', 'link', 'entityRef', 'enum', 'number', 'date', 'list']);
const BINDINGS = new Set(['curator', 'entity', 'derived']);

console.log('\n(a) SCHEMA COMPLETENESS + WELL-FORMEDNESS');
for (const t of WAVE1) {
  const s = editorSchema(t);
  check(`wave-1 "${t}" has a schema`, !!s);
  if (!s) continue;
  const okShape = !!s.block && !!s.title && !!s.summary && Array.isArray(s.fields) && s.fields.length > 0;
  check(`  "${t}" schema well-formed`, okShape);
  const fieldOk = (f: EditorField): boolean => !!f.key && FIELD_KINDS.has(f.kind) && !!f.label && BINDINGS.has(f.binding)
    && (f.kind !== 'list' || (Array.isArray(f.item) && f.item.length > 0 && f.item.every(fieldOk)))
    && (f.kind !== 'enum' || (Array.isArray(f.options) && f.options.length > 0));
  check(`  "${t}" every field valid (kind + binding + list/enum shape)`, s.fields.every(fieldOk));
}

// coverage report across the whole spec registry
const specs = allBlockSpecs();
const withSchema = specs.filter((s) => s.editorSchema);
const deferred = specs.filter((s) => !s.editorSchema);
console.log(`\n  COVERAGE: ${withSchema.length}/${specs.length} BLOCK_SPECS carry an editorSchema.`);
console.log(`  with schema: ${withSchema.map((s) => s.type).sort().join(', ')}`);
console.log(`  deferred (dated to a later V-BUILDER-3 wave, see docs/vbuilder3-block-inventory.md):`);
console.log(`    ${deferred.map((s) => s.type).sort().join(', ')}`);
// the 6 wave-1 blocks that are real specs must have their schema attached
for (const t of ['vitals', 'members', 'stats', 'timeline', 'quote', 'doorway']) {
  check(`spec "${t}" carries its editorSchema`, !!blockSpec(t)?.editorSchema);
}
// the 3 not-yet-placeable wave-1 blocks have a schema but NO spec (no library pollution)
for (const t of ['hero', 'image', 'youtube']) {
  check(`"${t}" schema authored but NOT a placeable spec (library unaffected)`, !!editorSchema(t) && !blockSpec(t));
}

console.log('\n(b) VALIDATOR CLAMPS (hostile content -> human sentence)');
const base = { version: 1 as const };
const withModule = (type: string, props: unknown) => validatePresentation({ ...base, modules: [{ type, zone: 'main', order: 0, props }] });

// quote: over the hard cap -> reject with the lyric sentence
{
  const r = withModule('quote', { text: 'x'.repeat(400) });
  check('quote over 280 chars rejected', !r.ok && r.errors.some((e) => /max 280 characters/.test(e) && /lyrics/.test(e)), r.errors[0] ?? '');
}
// stats: a non-https source in a row -> reject
{
  const r = withModule('stats', { rows: [{ label: 'Debut', value: '2013', source: 'http://evil.example.com' }] });
  check('stats row with non-https source rejected', !r.ok && r.errors.some((e) => /https/.test(e)), r.errors[0] ?? '');
}
// members: a per-row link that is javascript: -> reject (link must be site or https)
{
  const r = withModule('members', { rows: [{ member: 'rm', link: 'javascript:alert(1)' }] });
  check('members row with javascript: link rejected', !r.ok && r.errors.some((e) => /site link or an https/.test(e)), r.errors[0] ?? '');
}
// timeline: too many rows caps out
{
  const rows = Array.from({ length: 80 }, (_, i) => ({ title: `Era ${i}` }));
  const r = withModule('timeline', { rows });
  check('timeline over 60 rows rejected', !r.ok && r.errors.some((e) => /too many rows/.test(e)), r.errors[0] ?? '');
}

// image / youtube / hero / doorway are not module types yet -> test the clamp directly
{
  const r = clampPropsBySchema(editorSchema('image')!, { src: 'https://pinterest.com/pin/x.jpg', alt: 'a' });
  check('image with an EXTERNAL src rejected (ingest-copy law)', r.errors.some((e) => /external URL/.test(e)), r.errors[0] ?? '');
}
{
  const r = clampPropsBySchema(editorSchema('youtube')!, { url: 'notaurl' });
  check('youtube with a non-https url rejected', r.errors.some((e) => /https/.test(e)), r.errors[0] ?? '');
}
{
  const r = clampPropsBySchema(editorSchema('image')!, { src: 'space/bts/img_123.jpg', alt: 'RM at a fansign' });
  check('image with an uploaded src + alt accepted', r.errors.length === 0 && !!r.props && r.props.src === 'space/bts/img_123.jpg');
}

console.log('\n(c) QUOTE BYTE-PARITY vs the legacy clamp');
{
  // legacy: text trimmed + kept (<=280), attribution trimmed + sliced to 80, no error.
  const r = withModule('quote', { text: '  Best fandom ever  ', attribution: 'a'.repeat(120) });
  const mod = r.ok ? r.value?.modules?.find((m) => m.type === 'quote') : undefined;
  check('valid quote accepted', !!r.ok, r.errors[0] ?? '');
  check('quote text trimmed + preserved', mod?.props?.text === 'Best fandom ever');
  check('quote attribution silently clamped to 80', typeof mod?.props?.attribution === 'string' && (mod!.props!.attribution as string).length === 80);
}

console.log(`\nRESULT: ${failed === 0 ? 'ALL PASS' : failed + ' FAILED'} (editorSchema foundation)`);
process.exit(failed === 0 ? 0 : 1);
