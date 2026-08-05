// V-BUILDER-3 step 2 proof: the content-tab plumbing logic (pure).
//   (a) validateField clamps ONE field: valid -> value/no error; hostile -> error + no value.
//   (b) the commit rule (mirror of ContentTab.commit): only VALID field values are kept, so a
//       hostile value is dropped (never corrupts the draft) while the others save.
//   (c) bound-field override model: a field's presence in props IS the override; absence = data.
//   npx tsx scripts/vb3-content-verify.mts
import { editorSchema, validateField, clampPropsBySchema } from '../src/lib/verse/composition/editor-schema';
import type { EditorSchema } from '../src/lib/verse/composition/editor-schema';

let failed = 0;
const check = (name: string, cond: boolean, detail = '') => {
  console.log(`  ${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? ' :: ' + detail : ''}`);
  if (!cond) failed++;
};

// the commit rule the ContentTab uses: keep only valid, defined field values.
function commit(schema: EditorSchema, draft: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of schema.fields) { const { value } = validateField(f, draft[f.key]); if (value !== undefined) out[f.key] = value; }
  return out;
}

console.log('\n(a) validateField (one field at a time)');
const quote = editorSchema('quote')!;
const textField = quote.fields.find((f) => f.key === 'text')!;
{
  const ok = validateField(textField, '  Best fandom  ');
  check('valid text -> trimmed value, no error', ok.value === 'Best fandom' && !ok.error);
  const bad = validateField(textField, 'x'.repeat(400));
  check('over-cap quote text -> error + no value', !!bad.error && /max 280/.test(bad.error!) && bad.value === undefined, bad.error ?? '');
}
const stats = editorSchema('stats')!;
const sourceField = (stats.fields.find((f) => f.key === 'rows')!.item!).find((f) => f.key === 'source')!;
{
  const bad = validateField(sourceField, 'http://insecure.example.com');
  check('non-https url field -> error + no value', !!bad.error && /https/.test(bad.error!) && bad.value === undefined, bad.error ?? '');
  const ok = validateField(sourceField, 'https://en.wikipedia.org/wiki/BTS');
  check('https url field -> value, no error', ok.value === 'https://en.wikipedia.org/wiki/BTS' && !ok.error);
}
const doorway = editorSchema('doorway')!;
const formatField = doorway.fields.find((f) => f.key === 'format')!;
{
  check('valid enum -> value', validateField(formatField, 'card').value === 'card');
  check('bad enum -> error', !!validateField(formatField, 'evil').error);
}

console.log('\n(b) commit keeps only valid fields (hostile value dropped, draft uncorrupted)');
{
  const good = commit(quote, { text: 'Real quote', attribution: 'a fan' });
  check('valid quote commits both fields', good.text === 'Real quote' && good.attribution === 'a fan');
  const mixed = commit(quote, { text: 'Kept', attribution: 'y'.repeat(200) }); // attribution over 80 -> clamped (soft), text kept
  check('soft-cap attribution clamped, text kept', mixed.text === 'Kept' && typeof mixed.attribution === 'string' && (mixed.attribution as string).length === 80);
  const hostile = commit(quote, { text: 'z'.repeat(400) }); // hard cap -> dropped
  check('hostile text dropped from commit (draft uncorrupted)', hostile.text === undefined);
}

console.log('\n(c) bound-field override model (presence = override, absence = data)');
{
  const vitals = editorSchema('vitals')!;
  check('vitals with no chips -> no override stored (Data)', Object.keys(commit(vitals, {})).length === 0);
  const withChip = commit(vitals, { chips: [{ label: 'Debut', value: '2013' }] });
  check('vitals with a chip -> override stored (Edited)', Array.isArray(withChip.chips) && (withChip.chips as unknown[]).length === 1);
  check('empty chip row dropped', Object.keys(commit(vitals, { chips: [{}] })).length === 0);
}

console.log('\n(d) whole-props clamp still holds (server validator path)');
{
  const r = clampPropsBySchema(editorSchema('stats')!, { rows: [{ label: 'A', value: '1', source: 'http://x' }] });
  check('server clamp rejects the non-https source', r.errors.some((e) => /https/.test(e)));
}

console.log(`\nRESULT: ${failed === 0 ? 'ALL PASS' : failed + ' FAILED'} (content-tab plumbing logic)`);
process.exit(failed === 0 ? 0 : 1);
