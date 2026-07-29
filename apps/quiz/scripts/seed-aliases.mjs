// W3K.5 follow-up: seed group name-variant aliases from Wikidata altLabels.
// Read-only fetch, then write. Only ASCII-sluggable variants become aliases (hangul
// labels can't form a clean URL slug); an alias that collides with a real group slug
// or another group's alias is skipped. Idempotent (clears wikidata-sourced rows first).
// Run only AFTER migration 131 is applied. Run: node apps/quiz/scripts/seed-aliases.mjs
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = Object.fromEntries(
  fs.readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n').filter((l) => l.includes('='))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')]; })
);
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const { data: groups } = await db.from('groups').select('id, slug, name, wikidata_qid').not('wikidata_qid', 'is', null);
const realSlugs = new Set(groups.map((g) => g.slug));
const idByQid = Object.fromEntries(groups.map((g) => [g.wikidata_qid, g.id]));
const VALUES = groups.map((g) => `wd:${g.wikidata_qid}`).join(' ');

const slugify = (s) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 120);

const res = await fetch(`https://query.wikidata.org/sparql?query=${encodeURIComponent(`
  SELECT ?g ?alt WHERE { VALUES ?g { ${VALUES} } ?g skos:altLabel ?alt . FILTER(lang(?alt) IN ("en","ko-latn","en-ca","en-gb")) }`)}`, {
  headers: { Accept: 'application/sparql-results+json', 'User-Agent': 'KpopQuizVerse-alias-seed/1.0 (kaspermaiden@gmail.com)' },
});
const bindings = (await res.json()).results.bindings;

const claimed = new Set();       // alias already taken (by a real slug or an earlier group)
const rows = [];
for (const b of bindings) {
  const groupId = idByQid[b.g.value.split('/').pop()];
  if (!groupId) continue;
  const alias = slugify(b.alt.value);
  if (alias.length < 2 || !/^[a-z0-9-]{1,120}$/.test(alias)) continue;
  if (realSlugs.has(alias) || claimed.has(alias)) continue;   // never shadow a real space or double-claim
  claimed.add(alias);
  rows.push({ alias, group_id: groupId, kind: 'group', source: 'wikidata_altlabel' });
}

await db.from('verse_aliases').delete().eq('source', 'wikidata_altlabel');
for (let i = 0; i < rows.length; i += 200) {
  const { error } = await db.from('verse_aliases').insert(rows.slice(i, i + 200));
  if (error) { console.error('insert error:', error.message); process.exit(1); }
}

const byGroup = new Map();
for (const r of rows) byGroup.set(r.group_id, (byGroup.get(r.group_id) ?? 0) + 1);
const nameById = Object.fromEntries(groups.map((g) => [g.id, g.name]));
console.log(`\n=== ALIAS SEED COMPLETE ===`);
console.log(`aliases: ${rows.length} across ${byGroup.size} groups`);
console.log([...byGroup.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([id, n]) => `  ${nameById[id]}: ${n}`).join('\n'));
console.log('\nexamples:', rows.slice(0, 12).map((r) => `${r.alias}->${nameById[r.group_id]}`).join('  '));
