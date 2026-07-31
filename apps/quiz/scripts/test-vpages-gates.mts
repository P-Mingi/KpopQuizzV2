// V-PAGES step 2 - unit proofs for the kind registry + validation gates.
//   pnpm -C apps/quiz exec tsx scripts/test-vpages-gates.mts
// Proves: unknown kind rejected; disabled kind rejected on create; slug/title
// shape; fact-without-source rejected; ranked-without-methodology rejected;
// living-persons exclusions structural on EVERY kind (title, slug, infobox);
// typed infobox gates; registry enablement mechanics; presentation
// enabledKinds config shape.

import { KPOP_PAGE_REGISTRY, KPOP_DEFAULT_ENABLED, ALL_KPOP_KIND_IDS } from '../src/lib/verse/pages/kpop-kinds';
import { kindsForSpace, buildRegistry, violatesLivingPersons } from '../src/lib/verse/pages/kinds';
import { validatePageMeta } from '../src/lib/verse/pages/validate';
import { validatePresentation } from '../src/lib/verse/presentation/validate';

let pass = 0;
let fail = 0;
function ok(cond: boolean, label: string, detail?: string): void {
  if (cond) { pass++; console.log(`  ok  ${label}`); }
  else { fail++; console.log(`FAIL  ${label}${detail ? ' :: ' + detail : ''}`); }
}

const reg = KPOP_PAGE_REGISTRY;
const base = { slug: 'army-bomb', title: 'ARMY Bomb', status: 'draft' as const };

console.log('gate 1: kinds');
{
  const r = validatePageMeta(reg, { ...base, kind: 'nonsense' });
  ok(!r.ok && /Unknown page kind/.test(r.errors[0] ?? ''), 'unknown kind rejected', r.errors.join('|'));
  const r2 = validatePageMeta(reg, { ...base, kind: 'lightstick' }, { forCreate: true, enabledKinds: null });
  ok(!r2.ok && /not enabled/.test(r2.errors[0] ?? ''), 'kind outside the default set rejected on create');
  const r3 = validatePageMeta(reg, { ...base, kind: 'lightstick' }, { forCreate: true, enabledKinds: ['lightstick'] });
  ok(r3.ok, 'enabled kind accepted on create', r3.errors.join('|'));
  const r4 = validatePageMeta(reg, { ...base, kind: 'glossary-entry' }, { forCreate: true });
  ok(r4.ok, 'default-set kind accepted on create');
  const r5 = validatePageMeta(reg, { ...base, kind: 'lightstick' });
  ok(r5.ok, 'existing page of a non-enabled kind still validates (enablement gates CREATE only)');
}

console.log('gate 2: slug + title shape');
{
  ok(!validatePageMeta(reg, { ...base, kind: 'general', slug: 'Bad_Slug!' }).ok, 'bad slug rejected');
  ok(!validatePageMeta(reg, { ...base, kind: 'general', slug: 'a'.repeat(81) }).ok, 'overlong slug rejected');
  ok(!validatePageMeta(reg, { ...base, kind: 'general', title: '' }).ok, 'empty title rejected');
  ok(!validatePageMeta(reg, { ...base, kind: 'general', status: 'archived' }).ok, 'unknown status rejected');
  ok(validatePageMeta(reg, { ...base, kind: 'general' }).ok, 'clean meta accepted');
}

console.log('gate 3: facts demand sources');
{
  const noSrc = validatePageMeta(reg, { ...base, kind: 'lightstick', infobox: { official_name: { value: 'ARMY Bomb Ver.4' } } });
  ok(!noSrc.ok && /needs an https source/.test(noSrc.errors[0] ?? ''), 'fact value without source rejected', noSrc.errors.join('|'));
  const httpSrc = validatePageMeta(reg, { ...base, kind: 'lightstick', infobox: { official_name: { value: 'ARMY Bomb', source: 'http://insecure.example' } } });
  ok(!httpSrc.ok, 'http (non-https) source rejected');
  const good = validatePageMeta(reg, { ...base, kind: 'lightstick', infobox: { official_name: { value: 'ARMY Bomb Ver.4', source: 'https://www.soompi.com/article/1195479' } } });
  ok(good.ok && (good.value?.infobox.official_name as { source: string }).source.startsWith('https://'), 'fact with https source accepted + kept as {value, source}');
  const empty = validatePageMeta(reg, { ...base, kind: 'lightstick', infobox: { official_name: '' } });
  ok(empty.ok, 'empty fact field is simply absent (drafts may be incomplete)');
}

console.log('gate 4: ranked methodology');
{
  const noMeth = validatePageMeta(reg, { ...base, kind: 'ranked', status: 'published' });
  ok(!noMeth.ok && /methodology/.test(noMeth.errors[0] ?? ''), 'publish without methodology rejected');
  const review = validatePageMeta(reg, { ...base, kind: 'ranked', status: 'review' });
  ok(!review.ok, 'review without methodology rejected (cannot leave draft)');
  const draft = validatePageMeta(reg, { ...base, kind: 'ranked', status: 'draft' });
  ok(draft.ok, 'draft without methodology allowed (work in progress)');
  const withMeth = validatePageMeta(reg, {
    ...base, kind: 'ranked', status: 'published',
    infobox: { methodology: 'Weighted 60% Melon streams + 40% MV views, data from official charts, as of 2026-07-01.' },
  });
  ok(withMeth.ok, 'publish with a real methodology accepted', withMeth.errors.join('|'));
}

console.log('gate 5: living-persons exclusions, structural on EVERY kind');
{
  const idolKind = validatePageMeta(reg, { ...base, kind: 'song-story', title: 'Jimin dating timeline' });
  ok(!idolKind.ok && /excluded topic/.test(idolKind.errors[0] ?? ''), 'excluded topic in title rejected (idol-capable kind)');
  const nonIdolKind = validatePageMeta(reg, { ...base, kind: 'lightstick', title: 'Lightstick health rumors' });
  ok(!nonIdolKind.ok, 'excluded topic rejected on a NON-idol kind too (universal law)');
  const slugHit = validatePageMeta(reg, { ...base, kind: 'general', slug: 'jungkook-girlfriend' });
  ok(!slugHit.ok, 'excluded topic in slug rejected');
  const boxHit = validatePageMeta(reg, { ...base, kind: 'concert', infobox: { venue: { value: 'his family home', source: 'https://x.example' } } });
  ok(!boxHit.ok, 'excluded topic inside an infobox value rejected');
  ok(violatesLivingPersons('the ARMY Bomb Ver.4 design story') === null, 'clean text passes the exclusion scan');
}

console.log('gate 6: typed infobox');
{
  ok(!validatePageMeta(reg, { ...base, kind: 'lightstick', infobox: { made_up: 'x' } }).ok, 'unknown infobox key rejected');
  ok(!validatePageMeta(reg, { ...base, kind: 'lightstick', infobox: { release_year: { value: 1850, source: 'https://s.example' } } }).ok, 'year out of range rejected');
  ok(!validatePageMeta(reg, { ...base, kind: 'item', infobox: { item_type: 'bootleg' } }).ok, 'select outside options rejected');
  ok(!validatePageMeta(reg, { ...base, kind: 'mv', infobox: { video_url: 'ftp://weird' } }).ok, 'non-https url rejected');
  ok(!validatePageMeta(reg, { ...base, kind: 'episode', infobox: { episode_no: 'twelve' } }).ok, 'non-number rejected');
  const clean = validatePageMeta(reg, { ...base, kind: 'episode', infobox: { episode_no: 12, show: '  Going Seventeen  ' } });
  ok(clean.ok && clean.value?.infobox.episode_no === 12 && clean.value?.infobox.show === 'Going Seventeen', 'typed values sanitized + trimmed');
}

console.log('gate 7: registry mechanics');
{
  ok(kindsForSpace(reg, null).map((k) => k.kind).sort().join(',') === [...KPOP_DEFAULT_ENABLED].sort().join(','), 'no config -> the default set');
  ok(kindsForSpace(reg, ['lightstick']).length === 1, 'explicit enablement narrows to the list');
  ok(kindsForSpace(reg, ['lightstick', 'not-a-kind']).length === 1, 'unregistered ids in config are ignored (config cannot invent kinds)');
  ok(kindsForSpace(reg, ALL_KPOP_KIND_IDS).length === ALL_KPOP_KIND_IDS.length, 'encyclopedia-style full enablement works');
  let threw = false;
  try { buildRegistry([], ['ghost']); } catch { threw = true; }
  ok(threw, 'a defaultEnabled kind missing from the registry throws at build');
}

console.log('gate 8: presentation.enabledKinds config shape');
{
  const good = validatePresentation({ version: 1, enabledKinds: ['lightstick', 'lightstick', 'mv'] });
  ok(good.ok && JSON.stringify(good.value?.enabledKinds) === JSON.stringify(['lightstick', 'mv']), 'enabledKinds accepted + deduped');
  ok(!validatePresentation({ version: 1, enabledKinds: ['Bad Kind!'] }).ok, 'invalid kind id shape rejected');
  ok(!validatePresentation({ version: 1, enabledKinds: 'lightstick' }).ok, 'non-array rejected');
}

console.log('gate 9: wiki slug resolution order (REQUIREMENT 1: live page wins)');
{
  const { resolveWikiSlug } = await import('../src/lib/verse/pages/data');
  const live = { id: 1 };
  const both = resolveWikiSlug(live, 'new-slug');
  ok(both.kind === 'page', 'live page beats an alias at the same slug (alias can never shadow)');
  const aliasOnly = resolveWikiSlug(null, 'new-slug');
  ok(aliasOnly.kind === 'redirect' && (aliasOnly as { to: string }).to === 'new-slug', 'alias alone 301s to the live slug');
  const neither = resolveWikiSlug(null, null);
  ok(neither.kind === 'missing', 'no live, no alias -> 404');
}

console.log('gate 10: the rabbit-hole ledger (extraction, diff, wanted semantics)');
{
  const { extractPageRefs, diffLinkSets, isWantedTarget, targetSlugFor } = await import('../src/lib/verse/pages/links');
  const doc = {
    type: 'doc',
    content: [
      { type: 'paragraph', content: [
        { type: 'mention', attrs: { id: '/verse/bts/wiki/army-bomb', label: 'ARMY Bomb' } },
        { type: 'text', text: 'see', marks: [{ type: 'link', attrs: { href: '/verse/bts/albums/map-of-the-soul-7' } }] },
        { type: 'text', text: 'dupe', marks: [{ type: 'link', attrs: { href: '/verse/bts/wiki/army-bomb' } }] },
        { type: 'text', text: 'other space', marks: [{ type: 'link', attrs: { href: '/verse/ateez/wiki/lightstick' } }] },
        { type: 'text', text: 'external', marks: [{ type: 'link', attrs: { href: 'https://example.com/x' } }] },
      ] },
    ],
  };
  const refs = extractPageRefs(doc, 'bts');
  ok(refs.length === 2, 'mention + link extracted, duplicate + foreign-space + external ignored', JSON.stringify(refs));
  ok(refs.some((r) => r.kind === 'wiki' && r.slug === 'army-bomb'), 'wiki ref extracted from a mention chip');
  ok(refs.some((r) => r.kind === 'entity' && (r as { ref: string }).ref === 'album:map-of-the-soul-7'), 'entity ref extracted from a link mark');
  ok(targetSlugFor({ kind: 'entity', ref: 'album:x' }) === 'entity:album:x', 'entity targets carry the entity: prefix');
  ok(isWantedTarget({ target_slug: 'army-bomb', target_page_id: null }), 'unresolved wiki target IS wanted');
  ok(!isWantedTarget({ target_slug: 'entity:album:x', target_page_id: null }), 'entity target is NEVER wanted');
  ok(!isWantedTarget({ target_slug: 'army-bomb', target_page_id: 7 }), 'resolved wiki target is not wanted');
  const d = diffLinkSets(['a', 'b'], ['b', 'c']);
  ok(d.insert.join(',') === 'c' && d.remove.join(',') === 'a', 'link diff inserts and removes exactly the delta');
}

console.log('gate 11: REQUIREMENT 1 planners (create claims the URL, rename never chains)');
{
  const { aliasOpsOnCreate, aliasOpsOnRename } = await import('../src/lib/verse/pages/data');
  const create = aliasOpsOnCreate('army-bomb');
  ok(create.length === 1 && create[0]!.op === 'delete-alias-at' && (create[0] as { slug: string }).slug === 'army-bomb',
    'create at S deletes any alias at S (the live page claims the URL)');
  const rename = aliasOpsOnRename('old-name', 'new-name');
  ok(rename.length === 2 && rename[0]!.op === 'write-alias' && (rename[0] as { oldSlug: string }).oldSlug === 'old-name',
    'rename writes the old-slug alias (id-anchored: no chains possible)');
  ok(rename[1]!.op === 'delete-alias-at' && (rename[1] as { slug: string }).slug === 'new-name',
    'rename deletes any alias at the NEW slug (nothing shadows the live URL)');
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
console.log('V-PAGES gates hold.');
