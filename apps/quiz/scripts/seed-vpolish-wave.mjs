// V-POLISH step 9 (audit item 10) - THE SEED WAVE. Lands the publication-grade
// starter content drafted with sources: three BTS era stories, one flagship
// essay, the ARMY Bomb version catalog, the BE Deluxe photocard set, the
// name_hangul backfill and three discussion starters. Everything is credited to
// the KpopVerse system account (the 209ab01 precedent) and every write is
// IDEMPOTENT: existing rows are never clobbered (fan edits always win).
// Usage: node --env-file=.env.local scripts/seed-vpolish-wave.mjs
import process from 'node:process';

if (process.env.NODE_ENV === 'production') {
  console.error('Refusing to run against production NODE_ENV.');
  process.exit(1);
}

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_ || !KEY) { console.error('Missing Supabase env.'); process.exit(1); }
const SYSTEM = '67358f12-5068-4cd9-ba02-ad19fdadad73'; // credited as KpopVerse

const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' };
const get = (path) => fetch(`${URL_}/rest/v1/${path}`, { headers: H }).then((r) => r.json());
const post = (path, body, prefer = 'return=representation') =>
  fetch(`${URL_}/rest/v1/${path}`, { method: 'POST', headers: { ...H, Prefer: prefer }, body: JSON.stringify(body) })
    .then(async (r) => ({ ok: r.ok, status: r.status, body: await r.json().catch(() => null) }));
const patch = (path, body) =>
  fetch(`${URL_}/rest/v1/${path}`, { method: 'PATCH', headers: H, body: JSON.stringify(body) }).then((r) => r.ok);

const doc = (paragraphs) => ({ type: 'doc', content: paragraphs.map((t) => ({ type: 'paragraph', content: [{ type: 'text', text: t }] })) });
const log = (...a) => console.log('[seed]', ...a);

// ---------- 1. ERA STORIES ----------
const ERA_STORIES = [
  { eraName: '화양연화 pt.1', exact: true, paragraphs: [
    'There is a before and after HYYH in the BTS story, and every ARMY knows it. Across two 2015 mini albums, The Most Beautiful Moment in Life Pt.1 and Pt.2, the group traded the brash swagger of their school trilogy for something softer and more bruised: I NEED U, Run, Butterfly. The prologue film and music videos kicked off the Bangtan Universe storyline we are still decoding years later, and the music finally sounded the way being twenty actually feels, euphoric and terrified in the same breath.',
    'The receipts came fast. Pt.2 became the first BTS album ever to enter the Billboard 200, debuting at No. 171 in December 2015, a modest number that changed everything about what felt possible. A year later the era’s compilation, Young Forever, took Album of the Year at the 2016 Melon Music Awards, the group’s first daesang, and the members stood on that stage in tears while we lost it right along with them. (source: https://www.billboard.com/pro/bts-most-beautiful-moment-in-life-pt-2-billboard-200-charts/) (source: https://www.soompi.com/article/916995wpp/bts-wins-best-album-year-2016-melon-music-awards)',
  ] },
  { eraName: 'LOVE YOURSELF', exact: false, paragraphs: [
    'LOVE YOURSELF was the era where the message became the mission. Over three releases from 2017 to 2018, Her, Tear, and Answer, BTS mapped the whole arc of a love story, from the flutter of DNA to the collapse of Fake Love to the hard-won calm of Epiphany. It ended with RM standing at the United Nations in September 2018, asking a generation to speak themselves, and suddenly the songs we had been screaming at concerts sounded like a promise we had made together.',
    'And the charts kept up with the feelings. In May 2018, Love Yourself: Tear opened at No. 1 on the Billboard 200 with 135,000 units, the first K-pop album ever to top the chart. Three months later Answer did it again, back to back No. 1s in a single era. Whatever metric you reach for, this is the stretch where BTS stopped knocking on the door of the mainstream and simply walked through it. (source: https://www.billboard.com/pro/bts-love-yourself-tear-first-k-pop-album-no-1-billboard-200/) (source: https://www.billboard.com/articles/columns/chart-beat/8473245/bts-love-yourself-answer-album-debuts-No1-billboard-200-chart)',
  ] },
  { eraName: 'MAP OF THE SOUL : 7', exact: true, paragraphs: [
    'MAP OF THE SOUL turned inward just as everything around BTS got bigger than ever. Persona arrived in April 2019 riding the pastel high of Boy With Luv, then 7 landed in February 2020 as a retrospective of seven members and seven years, with Black Swan and ON digging into the cost of the dream. This was the stadium era, the Rose Bowl and Wembley in the summer of 2019, right up until the pandemic emptied the stadiums, and 7 quietly became the album that kept a scattered fandom company through lockdown.',
    'The numbers were staggering even by their standards. Map of the Soul: 7 opened atop the Billboard 200 with 422,000 units, the biggest week of any 2020 release, and became their fourth No. 1 album in under two years, with Persona having already topped the chart in 2019. But ask ARMY what defines this era and most of us will point somewhere quieter: Bang Bang Con streamed into our living rooms, the Black Swan art film, and a group brave enough to interrogate its own shadow in public. (source: https://www.billboard.com/pro/bts-fourth-no-1-album-map-of-the-soul-7/)',
  ] },
];

async function seedEraStories() {
  const eras = await get('eras?select=id,name&group_id=eq.1');
  for (const s of ERA_STORIES) {
    const era = s.exact
      ? eras.find((e) => e.name === s.eraName)
      : eras.filter((e) => e.name.includes(s.eraName)).sort((a, b) => a.id - b.id)[0];
    if (!era) { log('era NOT FOUND:', s.eraName); continue; }
    const existing = await get(`verse_content?select=entity_id&entity_type=eq.era&entity_id=eq.${era.id}&section_key=eq.era_story`);
    if (existing.length) { log('era story exists, skipping:', era.name); continue; }
    const rev = await post('verse_revisions', {
      entity_type: 'era', entity_id: String(era.id), section_key: 'era_story',
      author: SYSTEM, summary: 'Starter era story, seeded by KpopVerse', content: doc(s.paragraphs),
    });
    const revId = rev.body?.[0]?.id;
    if (!revId) { log('era revision FAILED:', era.name, rev.status, JSON.stringify(rev.body).slice(0, 200)); continue; }
    const c = await post('verse_content', {
      entity_type: 'era', entity_id: String(era.id), section_key: 'era_story',
      content: doc(s.paragraphs), current_revision_id: revId,
    }, 'return=minimal');
    log('era story seeded:', era.name, c.ok ? 'OK' : `FAILED ${c.status} ${JSON.stringify(c.body).slice(0, 200)}`);
  }
}

// ---------- 2. FLAGSHIP ESSAY ----------
const ESSAY = {
  title: 'Why ARMY documents everything: the archive instinct of a fandom',
  slug: 'why-army-documents-everything',
  paragraphs: [
    'Every fandom remembers. ARMY writes it down. Ask a question about any stage, any era, any stray piece of lore, and within minutes someone appears with the date, the link and a timestamped clip. This is not an accident of size. It is a culture that decided, early, that the story of BTS was worth keeping accurately, and that keeping it was fan work as real as streaming or voting.',
    'Part of it comes from how the group tells its own story. The Bangtan Universe scattered clues across music videos and notes; theories demanded receipts, and receipts demanded archives. Fans built subtitle teams, chart trackers, translation accounts and timeline threads, an entire volunteer infrastructure that treats accuracy as a form of love. When something needed proving, ARMY did not argue louder. It cited.',
    'The instinct shows up offline too. When the group spoke about the Black Lives Matter movement in 2020 and donated one million dollars, fans matched it in about a day through the #MatchAMillion campaign, and then, characteristically, documented the whole effort in public trackers so every claim could be checked. (source: https://www.billboard.com/music/music-news/bts-army-match-1-million-donation-black-lives-matter-9401755/)',
    'That is the spirit this space runs on. Facts carry sources here not because rules demand it but because that is how this fandom already works. The wiki, the timeline and the collection shelves are just the archive instinct given a permanent home, one that credits the fans who keep it. If you have ever corrected a wrong date in a group chat at 2am, you already know how to contribute. Welcome home.',
  ],
};

async function seedEssay() {
  const existing = await get(`verse_essays?select=id&slug=eq.${ESSAY.slug}`);
  if (existing.length) { log('essay exists, skipping'); return; }
  const now = new Date().toISOString();
  const r = await post('verse_essays', {
    group_id: 1, author: SYSTEM, title: ESSAY.title, slug: ESSAY.slug,
    content: doc(ESSAY.paragraphs), status: 'featured',
    reviewed_by: SYSTEM, reviewed_at: now, featured_at: now,
  }, 'return=minimal');
  log('essay seeded:', r.ok ? 'OK' : `FAILED ${r.status} ${JSON.stringify(r.body).slice(0, 300)}`);
}

// ---------- 3. LIGHTSTICK VERSIONS ----------
const LIGHTSTICKS = [
  { name: 'ARMY Bomb Ver.1', era: '2015', version: 'Ver.1', source_url: 'https://bts101.info/resources-list/army-bomb-history/', source_note: 'Design unveiled March 2015' },
  { name: 'ARMY Bomb Ver.2', era: '2017', version: 'Ver.2', source_url: 'https://bts101.info/resources-list/army-bomb-history/', source_note: 'Released February 2017, first Bluetooth version' },
  { name: 'ARMY Bomb Ver.3', era: '2018', version: 'Ver.3', source_url: 'https://bts101.info/resources-list/army-bomb-history/', source_note: 'Released July 2018 for the Love Yourself world tour, app-synchronized' },
  { name: 'ARMY Bomb Map of the Soul Special Edition', era: '2020', version: 'MOTS SE', source_url: 'https://www.koreaboo.com/news/bts-releases-map-soul-lightstick-bang-bang-con/', source_note: 'Released April 2020 on Weverse Shop, timed with Bang Bang Con' },
];

async function seedLightsticks() {
  const existing = await get('collectibles?select=name&group_id=eq.1&kind=eq.lightstick');
  const have = new Set(existing.map((r) => r.name));
  for (const l of LIGHTSTICKS) {
    if ([...have].some((n) => n.toLowerCase().includes(l.version.toLowerCase()) || n === l.name)) { log('lightstick exists, skipping:', l.name); continue; }
    const r = await post('collectibles', {
      group_id: 1, kind: 'lightstick', category: 'official version', name: l.name,
      era: l.era, version: l.version, source_url: l.source_url, source_note: l.source_note,
      status: 'published', created_by: SYSTEM,
    }, 'return=minimal');
    log('lightstick seeded:', l.name, r.ok ? 'OK' : `FAILED ${r.status} ${JSON.stringify(r.body).slice(0, 200)}`);
  }
}

// ---------- 4. BE DELUXE PHOTOCARD SET ----------
const PC_MEMBERS = ['RM', 'Jin', 'Suga', 'J-Hope', 'Jimin', 'V', 'Jungkook'];

async function seedPhotocards() {
  const existing = await get('photocards?select=id&group_id=eq.1&era=eq.BE');
  if (existing.length) { log('BE photocards exist, skipping'); return; }
  const idols = await get('idols?select=id,name&group_id=eq.1');
  const albums = await get('albums?select=id,title&group_id=eq.1&title=eq.BE');
  const albumId = albums[0]?.id ?? null;
  for (const m of PC_MEMBERS) {
    const idol = idols.find((i) => i.name.toLowerCase() === m.toLowerCase());
    const r = await post('photocards', {
      group_id: 1, idol_id: idol?.id ?? null, album_id: albumId,
      name: `${m} · BE Deluxe Edition`, card_type: 'album', era: 'BE', version: 'Deluxe Edition',
      source_url: 'https://cokodive.com/products/bts-special-album-be-deluxe-edition',
      source_note: 'Official components list: Photo Card Set 8ea, released Nov 20, 2020',
      status: 'published', created_by: SYSTEM,
    }, 'return=minimal');
    log('photocard seeded:', m, r.ok ? 'OK' : `FAILED ${r.status} ${JSON.stringify(r.body).slice(0, 200)}`);
  }
}

// ---------- 5. NAME_HANGUL BACKFILL ----------
const HANGUL = [
  { name: 'RM', hangul: '김남준' },       // Kim Nam-joon (Billboard profile)
  { name: 'J-Hope', hangul: '정호석' },   // Jung Ho-seok (Billboard profile)
  { name: 'Jungkook', hangul: '전정국' }, // Jeon Jung-kook (Billboard profile)
];

async function seedHangul() {
  for (const h of HANGUL) {
    const rows = await get(`idols?select=id,name,name_hangul&group_id=eq.1&name=eq.${encodeURIComponent(h.name)}`);
    const row = rows[0];
    if (!row) { log('idol NOT FOUND:', h.name); continue; }
    if (row.name_hangul) { log('hangul exists, skipping:', h.name); continue; }
    const ok = await patch(`idols?id=eq.${row.id}`, { name_hangul: h.hangul });
    log('hangul backfilled:', h.name, ok ? 'OK' : 'FAILED');
  }
}

// ---------- 6. DISCUSSION STARTERS ----------
const STARTERS = [
  'Which B-side do you think deserved its own music video? We will go first: Dis-ease from BE still goes harder live than half the title tracks, and we will die on that hill.',
  'What was your gateway BTS song, the one that pulled you all the way in? And be honest, would you still use it to recruit a friend today, or has your pick changed?',
  'With all seven back and the group chapter open again, what are you hoping for most from this era: the full album, a tour date you can actually get to, or just seven guys in one room doing a Festa dinner like old times?',
];

async function seedStarters() {
  const existing = await get('verse_discussions?select=id&entity_type=eq.group&entity_id=eq.1&author=eq.' + SYSTEM);
  if (existing.length) { log('starters exist, skipping'); return; }
  for (const body of STARTERS) {
    const r = await post('verse_discussions', {
      entity_type: 'group', entity_id: '1', author: SYSTEM, body, parent_id: null, status: 'visible',
    }, 'return=minimal');
    log('starter seeded:', body.slice(0, 40) + '...', r.ok ? 'OK' : `FAILED ${r.status} ${JSON.stringify(r.body).slice(0, 200)}`);
  }
}

await seedEraStories();
await seedEssay();
await seedLightsticks();
await seedPhotocards();
await seedHangul();
await seedStarters();
log('done');
