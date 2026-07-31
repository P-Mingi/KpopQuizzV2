// V-PAGES step 8 - the exemplar pages (the templates recruits imitate), authored
// as the owner/system account on the founding spaces. Every rule visible:
// facts carry sources, fan-written kinds carry the badge, no images anywhere,
// internal refs are mention chips (the rabbit hole), one deliberate red link
// (borahae) proves the wanted-page surface. Idempotent: existing slugs skipped.
// Publish semantics mirror the API route exactly: content -> revision (history
// first, the 127 law) -> pointer -> published flags -> ledger rows.
//
//   node scripts/seed-exemplar-pages.mjs
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n').filter((l) => l.includes('=')).map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')]; }),
);
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const AUTHOR = '67358f12-5068-4cd9-ba02-ad19fdadad73'; // the owner/system account (W-SEED)
const SOOMPI = 'https://www.soompi.com/article/1195479wpp/bts-reveals-teaser-3rd-version-official-light-stick-army-bomb';

const h2 = (text) => ({ type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text }] });
const p = (...parts) => ({ type: 'paragraph', content: parts });
const t = (text) => ({ type: 'text', text });
const cite = (text, href) => ({ type: 'text', text, marks: [{ type: 'link', attrs: { href } }] });
const chip = (label, href) => ({ type: 'mention', attrs: { id: href, label } });

const PAGES = [
  {
    group: 'bts', kind: 'lightstick', slug: 'army-bomb', title: 'ARMY Bomb',
    infobox: { official_name: { value: 'ARMY Bomb', source: SOOMPI } },
    links: [],
    body: {
      type: 'doc',
      content: [
        h2('Design story'),
        p(t('The ARMY Bomb is the official BTS light stick: a clear globe on a black handle, named in the fandom’s own language. Its reveal cycles have been press events in their own right ('), cite('Soompi covered the official teaser', SOOMPI), t('), and each generation has refined the same silhouette rather than replacing it.')),
        h2('Versions'),
        p(t('Versions are catalogued in this space’s collectibles shelf as they are sourced; the catalog currently holds Ver. 4. Version-by-version details belong there, with a source per claim.')),
        h2('In the crowd'),
        p(t('Synced through the venue systems at concerts, tens of thousands of ARMY Bombs become one instrument: the purple ocean. Fans keep spares charged, name them, and pass first-timers the etiquette: raise it, sync it, never block the row behind you.')),
      ],
    },
  },
  {
    group: 'bts', kind: 'song-story', slug: 'life-goes-on', title: 'Life Goes On',
    infobox: { album: 'BE', language: 'Korean' },
    links: [
      { target_slug: 'army-bomb', resolve: true },
      { target_slug: 'borahae', resolve: false },
      { target_slug: 'entity:album:be', resolve: false },
    ],
    body: {
      type: 'doc',
      content: [
        h2('About the song'),
        p(t('The opening track of '), chip('BE', '/verse/bts/albums/be'), t(' is the quiet one: an unhurried melody written for a year when nothing went to plan. Where earlier title tracks announced themselves, this one sits down next to you. The fandom heard it as a letter, and answered it the way ARMY answers everything, in '), chip('borahae', '/verse/bts/wiki/borahae'), t(' purple.')),
        h2('Live history'),
        p(t('Its early performances belonged to the living-room era of promotion: soft staging, close cameras, the '), chip('ARMY Bomb', '/verse/bts/wiki/army-bomb'), t(' oceans replaced for a while by lit windows. Fans who were there talk about it as the song that made distance feel shared rather than empty.')),
      ],
    },
  },
  {
    group: 'blackpink', kind: 'glossary-entry', slug: 'bias', title: 'Bias',
    infobox: {},
    links: [],
    body: {
      type: 'doc',
      content: [
        h2('Definition'),
        p(t('Your bias is the member you gravitate to first: the one whose fancams you open, whose parts you wait for, whose photocards you hunt hardest. The word came into K-pop fandom from the idea of being biased toward someone, and the fandom made it warmer than it sounds: it is affection, not ranking, and it says as much about you as about them.')),
        h2('How it’s used'),
        p(t('"Jennie is my bias" claims a home base. "Bias wrecker" names the member who keeps threatening it, and "OT4" is the honest refusal to choose at all. BLINKs switch, double up, and change their answer mid-comeback, and all of it counts. The only wrong answer in the whole vocabulary is treating someone else’s bias as a mistake.')),
      ],
    },
  },
  {
    group: 'stray-kids', kind: 'culture-guide', slug: 'lightstick-etiquette', title: 'Lightstick etiquette',
    infobox: {},
    links: [],
    body: {
      type: 'doc',
      content: [
        h2('The guide'),
        p(t('A lit venue is a shared project. Keep the light stick at chest height so the row behind you keeps its sightline; raise it high for the fanchant moments, not the whole set. If the venue syncs colors centrally, let it: the ocean only works when nobody freelances.')),
        p(t('Charge it before you leave, bring spare batteries for the encore, and if a neighbour’s stick dies, share the glow: hold yours between you. First show without one? Cup your phone light: STAY has done it since the beginning, and nobody will look twice.')),
      ],
    },
  },
];

const words = (doc) => JSON.stringify(doc).match(/"text":"([^"]*)"/g)?.join(' ').split(/\s+/).length ?? 0;

for (const page of PAGES) {
  const { data: g } = await db.from('groups').select('id').eq('slug', page.group).single();
  if (!g) { console.log(`${page.group}/${page.slug}: group missing, skipped`); continue; }
  const { data: existing } = await db.from('verse_pages').select('id').eq('group_id', g.id).eq('slug', page.slug).maybeSingle();
  if (existing) { console.log(`${page.group}/${page.slug}: exists, skipped`); continue; }

  const wc = words(page.body);
  if (wc < 50) { console.log(`${page.group}/${page.slug}: body only ${wc} words, would be a stub - REFUSING (exemplars must model non-stub pages)`); continue; }

  const now = new Date().toISOString();
  const { data: created, error } = await db.from('verse_pages').insert({
    group_id: g.id, kind: page.kind, slug: page.slug, title: page.title,
    status: 'draft', infobox: page.infobox, created_by: AUTHOR,
  }).select('id').single();
  if (error) { console.log(`${page.group}/${page.slug}: ERR ${error.message}`); continue; }
  const pid = created.id;

  const { data: content } = await db.from('verse_content').insert({
    entity_type: 'page', entity_id: String(pid), section_key: 'body', content: page.body,
  }).select('id').single();
  const { data: rev } = await db.from('verse_revisions').insert({
    content_id: content.id, entity_type: 'page', entity_id: String(pid), section_key: 'body',
    author: AUTHOR, summary: 'Published page (exemplar)', content: page.body,
  }).select('id').single();
  await db.from('verse_content').update({ current_revision_id: rev.id, updated_at: now }).eq('id', content.id);
  await db.from('verse_pages').update({ status: 'published', is_stub: false, published_at: now, updated_at: now }).eq('id', pid);
  await db.from('verse_page_aliases').delete().eq('group_id', g.id).eq('old_slug', page.slug);

  console.log(`${page.group}/${page.slug}: published (${wc} words, page ${pid})`);
}

// Ledger rows (after all pages exist, so live targets resolve to real ids).
for (const page of PAGES) {
  if (!page.links.length) continue;
  const { data: g } = await db.from('groups').select('id').eq('slug', page.group).single();
  const { data: self } = await db.from('verse_pages').select('id').eq('group_id', g.id).eq('slug', page.slug).maybeSingle();
  if (!self) continue;
  for (const l of page.links) {
    let target_page_id = null;
    if (l.resolve) {
      const { data: target } = await db.from('verse_pages').select('id').eq('group_id', g.id).eq('slug', l.target_slug).maybeSingle();
      target_page_id = target?.id ?? null;
    }
    await db.from('verse_page_links').upsert({
      group_id: g.id, source_type: 'page', source_id: String(self.id), target_slug: l.target_slug, target_page_id,
    }, { onConflict: 'group_id,source_type,source_id,target_slug' });
  }
  console.log(`${page.group}/${page.slug}: ${page.links.length} ledger rows`);
}
console.log('Exemplars done.');
