// review-all.mjs (lot A2, gap review of the all-series pool, with judgment).
//   node scripts/anime/a2/review-all.mjs     after allseries.mjs (all 50 series done): reviews the game columns gender, species, role_at_debut,
//                                            voice_actor_ja, the TOP200 characters first, then the whole pool, and writes all-series.json,
//                                            REPORT-all-series.md and TOP200.md again (with the TOP200 and whole pool shares).
// RULE (owner, 2026-11-03). A source is a family: the Fandom wiki (character page, infobox, categories and its category pages: ONE source),
// Wikipedia (article, infobox, list: one), Wikidata, A1 (reviewed facts), the site data. A value stated by two families is "agree"; stated by one
// family and contradicted by none it is "single" and accepted. Contested values: the value stated by the most families wins; on a tie the most
// official family wins: official site or publisher, Wikipedia, A1 (reviewed by the owner), the Fandom wiki, Wikidata, the site data.
// A reviewed field has reviewed: true and review: { note, pages }. role_at_debut: the first
// appearance wins (owner rule), the sources read overall roles, so the order is A1 (reviewed by the owner), the Fandom categories
// (Protagonists / Antagonists), the section of the Wikipedia list, the site data. first_appearance is data only and is not reviewed.
import { normText } from './compare.mjs'
import { GAME_COLUMNS, SERIES, buildOutputs, merge, speciesOf, top200 } from './allseries.mjs'
import { fandomAliases, fandomCategory, fandomPage, fandomUrl } from './sources.mjs'
import { articleEvidence, pronounGender } from './wikipedia.mjs'
import { categoriesOf, plain, stripComments, stripRefs, wikiLinks } from './wikitext.mjs'

const cleanText = (raw) => plain(stripRefs(stripComments(raw)))
const asList = (v) => (Array.isArray(v) ? v : String(v ?? '').split(' / '))
const tokens = (s) => (normText(s) ?? '').split(' ').filter(Boolean).map((w) => w.replace(/(oh|ou|oo)/g, 'o').replace(/uu/g, 'u')).sort().join(' ')
const wikiOf = (ch) => new URL(ch.ids.fandom_url).host.split('.')[0]
const stats = {}
const bump = (k) => { stats[k] = (stats[k] ?? 0) + 1 }

// The page that states a source value: the character page, except for the Fandom categories, whose own category page lists the character.
function pageFor(ch, s) {
  if (s.source === 'fandom_categories' && s.raw) {
    const cat = String(s.raw).split(',')[0].trim()
    if (cat) return fandomUrl(wikiOf(ch), `Category:${cat}`)
  }
  return s.url ?? null
}

const FAMILY_ORDER = ['official', 'wikipedia', 'a1', 'fandom', 'wikidata', 'site']
const familyOf = (name) => {
  const n = String(name).replace(/^review:/, '')
  if (n.startsWith('wikipedia')) return 'wikipedia'
  if (n.startsWith('fandom')) return 'fandom'
  if (n.startsWith('wikidata')) return 'wikidata'
  if (n.startsWith('a1')) return 'a1'
  if (n.startsWith('site_data')) return 'site'
  if (n.startsWith('official')) return 'official'
  return n
}

function choose(ch, field, extras, { same, note }) {
  const f = ch.fields[field]
  const base = f.sources.filter((s) => !String(s.source).startsWith('review:'))
  const all = [...base, ...extras]
  const groups = []
  // one value per family: the first source of the family that gives one (the infobox before the categories, the article before the list)
  const seenFamily = new Set()
  for (const s of all) {
    if (s.value === null || s.value === undefined || s.value === '' || (Array.isArray(s.value) && !s.value.length)) continue
    const fam = familyOf(s.source)
    if (seenFamily.has(fam)) continue
    seenFamily.add(fam)
    const g = groups.find((x) => same(x.value, s.value))
    const url = s.url ?? null
    if (g) { g.families.add(fam); if (url) g.urls.add(url) } else groups.push({ value: s.value, families: new Set([fam]), urls: new Set(url ? [url] : []) })
  }
  f.sources = all.map((s) => ({ source: s.source, url: s.url ?? null, ...(s.raw !== undefined ? { raw: s.raw } : {}), value: s.value ?? null }))
  if (!groups.length) { f.status = 'none'; return false }
  const rank = (g) => Math.min(...[...g.families].map((x) => (FAMILY_ORDER.indexOf(x) < 0 ? 99 : FAMILY_ORDER.indexOf(x))))
  groups.sort((a, b) => b.families.size - a.families.size || rank(a) - rank(b))
  const best = groups[0]
  const before = JSON.stringify([f.value, f.status])
  f.value = field === 'voice_actor_ja' ? asList(best.value)[0] : Array.isArray(best.value) ? best.value[0] : best.value
  f.status = best.families.size >= 2 ? 'agree' : 'single'
  f.sources_agreeing = [...best.families]
  f.reviewed = true
  delete f.majority
  delete f.contested
  delete f.doubtful
  if (groups.length > 1) {
    f.contested = groups.slice(1).map((g) => ({ value: g.value, families: [...g.families], pages: [...g.urls] }))
    // genuinely doubtful: a pure tie (same number of families) between values that each rest on trusted families only (Wikipedia, A1, Fandom);
    // a tie against Wikidata or the site data alone is settled by the order and is not doubtful
    const trusted = (g) => [...g.families].every((x) => ['wikipedia', 'a1', 'official', 'fandom'].includes(x))
    if (groups[1].families.size === best.families.size && trusted(best) && trusted(groups[1])) f.doubtful = true
    f.review = { note: `${note}; rule: most families, then the most official family (Wikipedia, A1, Fandom, Wikidata, site data)`, pages: [...best.urls] }
  } else f.review = { note, pages: [...best.urls] }
  if (before !== JSON.stringify([f.value, f.status])) bump(field)
  return true
}

const FANDOM_PAGES = new Map()
async function fpage(ch) {
  const key = ch.ids.fandom_url
  if (!FANDOM_PAGES.has(key)) FANDOM_PAGES.set(key, await fandomPage(wikiOf(ch), ch.ids.fandom_title))
  return FANDOM_PAGES.get(key)
}
const SPECIES_WORDS = 'human|demon|vampire|elf|android|robot|ghoul|titan|spirit|shinigami|hollow|quincy|saiyan|namekian|dragon|cat|dog|slime|angel|god|monster|alien|oni|fairy|witch|beast|ghost'
const speciesLead = (text) => {
  const m = String(text ?? '').slice(0, 900).match(new RegExp(`\\b(?:is|was|are|were)\\s+(?:an?|the)\\s+(?:[a-z-]+\\s+){0,3}?(${SPECIES_WORDS})\\b(?!\\s+ball)`, 'i'))
  return m ? speciesOf(m[1]) : null
}

// Dragon Ball: who voices the character in Japanese, from the Fandom pages of the Japanese voice actors (their role lists link the character)
let dbActors = null
async function dragonBallActors() {
  if (dbActors) return dbActors
  dbActors = []
  for (const a of await fandomCategory('dragonball', 'Japanese voice actors')) {
    const p = await fandomPage('dragonball', a.title)
    if (p) dbActors.push({ name: a.title, url: p.url, links: new Set(wikiLinks(stripRefs(p.text)).map((l) => normText(l.target))) })
  }
  return dbActors
}

async function reviewCharacter(ch, dbAliases) {
  const f = ch.fields
  const page = await fpage(ch)
  const lead = page ? cleanText(page.text).slice(0, 1500) : ''
  const article = await articleEvidence(ch.ids.wikipedia_title)
  const pageUrl = ch.ids.fandom_url

  // gender: the pronouns of the Fandom page and of the Wikipedia article are two more witnesses
  {
    const extras = []
    const pf = pronounGender(lead)
    if (pf) extras.push({ source: 'review:fandom_page_pronouns', url: pageUrl, raw: 'pronouns of the opening text', value: pf })
    const pw = article?.text ? pronounGender(article.text) : null
    if (pw) extras.push({ source: 'review:wikipedia_pronouns', url: article.url, raw: 'pronouns of the article', value: pw })
    choose(ch, 'gender', extras, { same: (a, b) => a === b, note: 'gender by the pages that state it' })
  }

  // species at the first appearance
  {
    const extras = []
    const sl = speciesLead(lead)
    if (sl) extras.push({ source: 'review:fandom_page_lead', url: pageUrl, raw: 'opening sentence', value: sl })
    const sw = speciesLead(article?.text)
    if (sw) extras.push({ source: 'review:wikipedia_lead', url: article.url, raw: 'opening sentence', value: sw })
    choose(ch, 'species', extras, { same: (a, b) => a === b || String(a).split('-').pop() === String(b).split('-').pop(), note: 'species by the pages that state it (a conflict goes to the value stated by the most pages, then to the order of trust)' })
  }

  // role at the first appearance
  {
    choose(ch, 'role_at_debut', [], { same: (a, b) => a === b, note: 'role at the first appearance; the sources read overall roles, the first appearance wins: A1 (reviewed by the owner), then the Fandom categories, then the Wikipedia list section, then the site data' })
  }

  // Japanese voice actor (Dragon Ball: also the Japanese cast read from the Fandom pages of the Japanese voice actors)
  {
    const vextras = []
    if (ch.series === 'dragon-ball') {
      const acts = await dragonBallActors()
      const al = new Set([normText(ch.ids.fandom_title), ...(dbAliases.get(ch.ids.fandom_title) ?? []).map(normText)].filter(Boolean))
      const hit = acts.filter((a) => [...al].some((x) => a.links.has(x)))
      if (hit.length) vextras.push({ source: 'review:fandom_voice_actor_pages', url: hit[0].url, raw: hit.map((a) => a.name).join(', '), value: hit.map((a) => a.name) })
    }
    choose(ch, 'voice_actor_ja', vextras, { same: (a, b) => asList(a).some((x) => asList(b).some((y) => tokens(x) === tokens(y))), note: 'Japanese voice actor by the sources that name one (the Fandom lists include child and later versions)' })
  }
}

// ORCH rulings 2026-11-03 (the coordinator's decisions on the doubtful list). Rule for roles: how the character is presented at the first
// appearance, as for the Dragon Ball alignment. Species: one value per kind of character inside a series.
const ORCH = 'ORCH ruling 2026-11-03'
const RULINGS = [
  ...['bardock', 'chiaotzu', 'puar', 'ox-king', 'king-vegeta'].map((slug) => ({ series: 'dragon-ball', slug, field: 'role_at_debut', value: 'antagonist', rule: 'role at the first appearance: presented as an antagonist' })),
  { series: 'dragon-ball', slug: 'launch', field: 'role_at_debut', value: 'supporting', rule: 'role at the first appearance: presented as a supporting character' },
  ...['android-16', 'android-17', 'android-18'].map((slug) => ({ series: 'dragon-ball', slug, field: 'species', value: 'android', rule: 'one value for the Androids of Dr. Gero' })),
  ...['gohan', 'trunks', 'goten', 'pan'].map((slug) => ({ series: 'dragon-ball', slug, field: 'species', value: 'saiyan-human-hybrid', rule: 'one value for the Saiyan-human hybrids (a source says hybrid)' })),
  ...['frieza', 'cooler', 'king-cold'].map((slug) => ({ series: 'dragon-ball', slug, field: 'species', value: 'frost-demon', rule: 'one value for Frieza and his family' })),
  { series: 'dragon-ball', slug: 'tien-shinhan', field: 'species', value: 'human', rule: 'Tien is human (the third eye is a trait)' },
]
function applyRulings(all) {
  const find = (series, slug) => all.find((s) => s.slug === series)?.characters.find((c) => c.slug === slug)
  let n = 0
  for (const r of RULINGS) {
    const ch = find(r.series, r.slug)
    if (!ch) continue
    const f = ch.fields[r.field]
    const stated = f.sources.filter((s) => s.value !== null && s.value !== undefined && String(s.value).toLowerCase() === r.value)
    f.value = r.value
    f.status = new Set(stated.map((s) => String(s.source).replace(/^review:/, '').split('_')[0])).size >= 2 ? 'agree' : 'single'
    f.reviewed = true
    f.ruling = ORCH
    f.review = { note: `${ORCH}: ${r.rule}`, pages: stated.map((s) => s.url).filter(Boolean) }
    delete f.doubtful
    n++
  }
  stats.rulings = n
}

// Consistency pass: inside a series the same species is spelled the same way (plural and hyphen variants merged, the most frequent spelling kept)
const SPECIES_SYNONYM = { 'soul-reaper': 'shinigami', humans: 'human', devils: 'devil', demons: 'demon' }
function consistentSpecies(all) {
  const report = []
  for (const s of all) {
    const counts = new Map()
    for (const c of s.characters) { const v = c.fields.species.value; if (v) counts.set(v, (counts.get(v) ?? 0) + 1) }
    const key = (v) => (SPECIES_SYNONYM[v] ?? v).replace(/-/g, '').replace(/s$/, '')
    const best = new Map()
    for (const [v, n] of counts) { const k = key(v); const cur = best.get(k); if (!cur || n > cur.n || (n === cur.n && v < cur.v)) best.set(k, { v: SPECIES_SYNONYM[v] ?? v, n }) }
    for (const c of s.characters) {
      const f = c.fields.species
      if (!f.value) continue
      const canon = best.get(key(f.value)).v
      if (canon !== f.value) { f.review = { ...(f.review ?? { pages: [] }), note: `${f.review?.note ?? ''}; spelling aligned in the series: ${f.value} -> ${canon}` }; f.value = canon; f.reviewed = true; bump('species_spelling') }
    }
    const vocab = new Map()
    for (const c of s.characters) { const v = c.fields.species.value; if (v) vocab.set(v, (vocab.get(v) ?? 0) + 1) }
    report.push(`- ${s.slug}: ${[...vocab.entries()].sort((a, b) => b[1] - a[1]).map(([v, n]) => `${v} ${n}`).join(', ')}`)
  }
  return report
}

async function main() {
  const all = merge()
  const topKeys = top200(all).map((r) => `${r.series_slug}/${r.slug}`)
  const bySlug = new Map(all.flatMap((s) => s.characters.map((c) => [`${s.slug}/${c.slug}`, c])))
  const order = [...topKeys.map((k) => bySlug.get(k)), ...[...bySlug.entries()].filter(([k]) => !topKeys.includes(k)).map(([, c]) => c)]
  const dbAliases = await fandomAliases('dragonball', all.find((s) => s.slug === 'dragon-ball').characters.map((c) => c.ids.fandom_title))
  for (const ch of order) await reviewCharacter(ch, dbAliases)
  applyRulings(all)
  const vocab = consistentSpecies(all)
  // manga-only characters have no Japanese voice: their voice_actor_ja stays empty (status none)
  void SERIES
  void GAME_COLUMNS
  const extra = [
    '## ORCH rulings 2026-11-03',
    '',
    'Applied after the rule, each recorded on the field as ruling: "ORCH ruling 2026-11-03" with the rule as the source note. Roles at the first appearance (same rule as the Dragon Ball alignment): Bardock, Chiaotzu, Puar, Ox-King and King Vegeta antagonist, Launch supporting. Species: Androids 16, 17 and 18 "android"; Saiyan-human hybrids Gohan, Trunks, Goten and Pan "saiyan-human-hybrid" (Goten and Pan added for consistency); Frieza, Cooler and King Cold "frost-demon"; Tien Shinhan "human"; Oolong and Emperor Pilaf keep their values. Names shown in the game: Jinbe, Kozuki Oden, Kozuki Hiyori, Marco, Don Krieg, Hatchan; Goku Black stays a separate character from Zamasu.',
    '',
    '## Species vocabulary per series (after the consistency pass)',
    '',
    ...vocab,
    '',
    '## Added characters whose name was doubtful (settled by the ORCH rulings above)',
    '',
    'Checked against the Fandom page title (the name used) and the Wikipedia title, and against the site characters. Of the 108 added characters (68 One Piece, 40 Dragon Ball including the 4 GT ones), these were doubtful (the names now shown are in the ruling above):',
    '',
    '- Jinbe: kept (Wikipedia says Jimbei) (https://onepiece.fandom.com/wiki/Jinbe, https://en.wikipedia.org/wiki/Jimbei).',
    '- Kouzuki Oden and Kouzuki Hiyori: Fandom spelling Kouzuki, Wikipedia says Kozuki Oden (https://onepiece.fandom.com/wiki/Kouzuki_Oden, https://en.wikipedia.org/wiki/Kozuki_Oden).',
    '- Polo Marco: the Fandom page title; the character is known as Marco (the page "Marco" redirects to it: https://onepiece.fandom.com/wiki/Polo_Marco).',
    '- Krieg: Fandom title, Wikipedia says Don Krieg (https://en.wikipedia.org/wiki/Don_Krieg).',
    '- Hatchan: Fandom title for Hachi (the octopus fish-man).',
    '- Goku Black (Dragon Ball): the alter ego of Zamasu, who is already in the site data (https://dragonball.fandom.com/wiki/Goku_Black, https://dragonball.fandom.com/wiki/Zamasu): a possible duplicate of the same person; keep it only if the game wants the character as a separate target.',
    '- Grandpa Gohan (Dragon Ball): Wikipedia title is Grandpa Son Gohan; a different person from Gohan (in the site data), not a duplicate.',
    '- King Vegeta (Dragon Ball): a different person from Vegeta, not a duplicate.',
    '',
    '## Dragon Ball GT characters',
    '',
    'Cooler, Gogeta, Baby and Syn Shenron are in dragon-ball.json with debut series GT and a GT saga (Super 17 Saga, Shadow Dragon Saga, Black Star Dragon Ball Saga, Shadow Dragon Saga). Open fields: home_planet of Cooler and Gogeta (no page states a planet), height_cm (dropped from the game), signature_technique of Syn Shenron (none settled).',
  ]
  buildOutputs(all, `gender, species, role_at_debut and voice_actor_ja reviewed with judgment (review-all.mjs): ${JSON.stringify(stats)}. A reviewed field carries reviewed: true and the pages that state the value.`, extra)
}

await main()
void categoriesOf
