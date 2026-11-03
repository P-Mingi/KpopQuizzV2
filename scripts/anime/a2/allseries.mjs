// allseries.mjs (lot A2): the Otakudle pool of the 50 launch series, collected and cross-checked by script.
//   node scripts/anime/a2/allseries.mjs [--deadline 480] [--only slug,slug]   process the series not done yet (a series result is cached
//                                        under ~/kpq-o1/a2-cache/allseries/, so a rerun goes on where the last one stopped)
//   node scripts/anime/a2/allseries.mjs --final                               merge into data/all-series.json, REPORT-all-series.md, TOP200.md
// Columns of Otakudle (docs/o1/contracts/dle-a1-characters.md): gender, species at the first appearance, role at the first appearance
// (main, supporting, antagonist, other), first_appearance (data, not a hint), voice_actor_ja (the hint); and the series demographic.
// Pool sizes: the owner's table (docs/o1/PLAN-LANCEMENT.md, annex). One Piece and Dragon Ball reuse their pools of onepiece.mjs /
// dragonball.mjs. Identity and spoilers do not filter a character; the values describe the character at the debut.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { failures } from './http.mjs'
import { GENDER, OVERLAP, TEXT, noDash, normText, renderReport, resolveField } from './compare.mjs'
import { percentileRanks } from './pool.mjs'
import { fandomInfoboxHtml, fandomInfoboxPage, fandomLengths, fandomPage, fandomUrl, wdClaim, wdEntities, wdSearch, wdSitelinkCounts, wdSparql, wikidataUrl, wpPage } from './sources.mjs'
import { articleEvidence, listEvidence, loadLists, pronounGender } from './wikipedia.mjs'
import { categoriesOf, plain, stripRefs } from './wikitext.mjs'
import { slugify } from './fandomparse.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..', '..', '..')
const OUT = join(homedir(), 'kpq-o1', 'a2-cache', 'allseries')
const A1 = JSON.parse(readFileSync(join(ROOT, 'scripts/anime/a1/data/a1-facts.json'), 'utf8'))
const QIDS = JSON.parse(readFileSync(join(ROOT, 'scripts/anime/a1/data/series-qids.json'), 'utf8'))

export const FIELDS = ['gender', 'species', 'role_at_debut', 'first_appearance', 'voice_actor_ja']

// slug, class, pool (owner's table), Fandom wiki. Order: the ten other Otakudle series first, then the others.
export const SERIES = [
  ['one-piece', 'One Piece', 100, 'onepiece'], ['dragon-ball', 'Dragon Ball', 70, 'dragonball'],
  ['naruto', 'grosse', 25, 'naruto'], ['demon-slayer', 'grosse', 25, 'kimetsu-no-yaiba'], ['jujutsu-kaisen', 'grosse', 25, 'jujutsu-kaisen'],
  ['attack-on-titan', 'grosse', 25, 'attackontitan'], ['my-hero-academia', 'grosse', 25, 'bokunoheroacademia'], ['bleach', 'grosse', 25, 'bleach'],
  ['hunter-x-hunter', 'grosse', 25, 'hunterxhunter'], ['chainsaw-man', 'moyenne', 12, 'chainsaw-man'], ['frieren', 'moyenne', 12, 'frieren'], ['black-clover', 'moyenne', 12, 'blackclover'],
  ['detective-conan', 'grosse', 25, 'detectiveconan'], ['code-geass', 'moyenne', 12, 'codegeass'], ['dandadan', 'moyenne', 12, 'dandadan'], ['dr-stone', 'moyenne', 12, 'dr-stone'],
  ['fairy-tail', 'moyenne', 12, 'fairytail'], ['fruits-basket', 'moyenne', 12, 'fruitsbasket'], ['fullmetal-alchemist', 'moyenne', 12, 'fma'], ['gintama', 'moyenne', 12, 'gintama'],
  ['haikyu', 'moyenne', 12, 'haikyuu'], ['inuyasha', 'moyenne', 12, 'inuyasha'], ['jojo', 'moyenne', 12, 'jojo'], ['kaguya-sama-love-is-war', 'moyenne', 12, 'kaguyasama-wa-kokurasetai'],
  ['mob-psycho-100', 'moyenne', 12, 'mob-psycho-100'], ['oshi-no-ko', 'moyenne', 12, 'oshinoko'], ['re-zero', 'moyenne', 12, 'rezero'], ['sakamoto-days', 'moyenne', 12, 'sakamoto-days'],
  ['slam-dunk', 'moyenne', 12, 'slamdunk'], ['solo-leveling', 'moyenne', 12, 'solo-leveling'], ['spy-x-family', 'moyenne', 12, 'spy-x-family'], ['sword-art-online', 'moyenne', 12, 'swordartonline'],
  ['that-time-i-got-reincarnated-as-a-slime', 'moyenne', 12, 'tensura'], ['tokyo-ghoul', 'moyenne', 12, 'tokyoghoul'], ['tokyo-revengers', 'moyenne', 12, 'tokyorevengers'], ['tower-of-god', 'moyenne', 12, 'towerofgod'],
  ['apothecary-diaries', 'courte', 5, 'kusuriya'], ['blue-lock', 'courte', 5, 'blue-lock'], ['bocchi-the-rock', 'courte', 5, 'bocchi-the-rock'], ['cowboy-bebop', 'courte', 5, 'cowboybebop'],
  ['death-note', 'courte', 5, 'deathnote'], ['evangelion', 'courte', 5, 'evangelion'], ['kagurabachi', 'courte', 5, 'kagurabachi'], ['kaiju-no-8', 'courte', 5, 'kaiju-no-8'],
  ['omniscient-readers-viewpoint', 'courte', 5, 'omniscient-readers-viewpoint'], ['one-punch-man', 'courte', 5, 'onepunchman'], ['sailor-moon', 'courte', 5, 'sailormoon'],
  ['steins-gate', 'courte', 5, 'steins-gate'], ['vinland-saga', 'courte', 5, 'vinlandsaga'], ['violet-evergarden', 'courte', 5, 'violet-evergarden'],
].map(([slug, cls, pool, wiki]) => ({ slug, cls, pool, wiki }))

// ---------------------------------------------------------------- readers (pure)
export const genderOf = (s) => {
  const t = String(s ?? '').toLowerCase()
  if (!t.trim()) return null
  if (/\b(female|woman|girl)\b/.test(t)) return 'female'
  if (/\b(male|man|boy)\b/.test(t)) return 'male'
  return null
}
const SPECIES_ALIAS = { earthling: 'human', 'soul-reaper': 'shinigami', 'homo-sapiens': 'human', 'human-being': 'human', humans: 'human', humanoid: 'human', earthling: 'human', 'normal-human': 'human', ningen: 'human' }
// one lower-case word (or hyphenated words) as the contract wants: "Human (Fullbringer)" -> human, "Demons" -> demon
export function speciesOf(s) {
  // "Soul (Shinigami)": the species written in parentheses wins when it is a known one
  const paren = String(s ?? '').match(/\(([A-Za-z -]{3,20})\)/)?.[1]
  if (paren && /^(shinigami|hollow|quincy|vampire|demon|elf|ghoul|titan|saiyan|oni|android|robot|dragon|angel|god)s?$/i.test(paren.trim())) return paren.trim().toLowerCase().replace(/s$/, '')
  let t = String(s ?? '').toLowerCase().split(/[;,(\/\u2013]| - /)[0].replace(/\bthe\b/g, ' ').replace(/[^a-z0-9 -]/g, ' ').trim().replace(/\s+/g, '-')
  if (!t) return null
  if (/^human\b/.test(t) || /^human-/.test(t)) t = 'human'
  t = SPECIES_ALIAS[t] ?? t
  if (t.endsWith('s') && !t.endsWith('ss') && t.length > 4) t = t.slice(0, -1)
  t = SPECIES_ALIAS[t] ?? t
  return /^[a-z][a-z0-9-]{0,39}$/.test(t) ? t : null
}
const WD_SPECIES = [[/\bhuman\b/, 'human'], [/demon/, 'demon'], [/vampire/, 'vampire'], [/\belf\b|elves/, 'elf'], [/robot|android|cyborg|gynoid/, 'robot'], [/ghoul/, 'ghoul'], [/titan/, 'titan'], [/spirit|ghost/, 'spirit'], [/\bgod\b|deity/, 'god'], [/alien|extraterrestrial/, 'alien'], [/shinigami|soul reaper/, 'shinigami'], [/\bcat\b|feline/, 'cat'], [/\bdog\b|canine/, 'dog'], [/animal|beast/, 'animal'], [/dragon/, 'dragon'], [/slime/, 'slime'], [/angel/, 'angel'], [/monster|creature/, 'monster']]
// a category counts only when it is the species itself ("Demons", "Humans"), not a group that has the word in its name
export function speciesFromCategories(cats) {
  for (const c of cats) {
    const t = String(c).toLowerCase().replace(/ characters?$/, '').trim()
    const sp = speciesOf(t)
    if (sp && /^(human|demon|vampire|elf|robot|android|ghoul|titan|spirit|ghost|god|shinigami|cat|dog|dragon|slime|angel|monster|saiyan|hollow|quincy|mutant|oni|fairy|witch|beast|alien)$/.test(sp) && sp !== 'alien' && sp !== 'mutant' && t.split(' ').length <= 2) return sp
  }
  return null
}
// species of two sources are the same word, or end with the same word (cursed-spirit and spirit, eternal-dragon and dragon)
const SPECIES = { norm: (v) => (typeof v === 'string' && v ? v : null), same: (a, b) => a === b || a.split('-').pop() === b.split('-').pop() }
export const speciesFromWikidata = (labels) => { for (const l of labels) for (const [re, sp] of WD_SPECIES) if (re.test(String(l).toLowerCase())) return sp; return null }
export function firstAppearanceOf(chapterText, episodeText) {
  const c = String(chapterText ?? '').match(/(?:chapter|ch\.?)\s*(\d+)/i)
  const e = String(episodeText ?? '').match(/(?:episode|ep\.?)\s*(\d+)/i)
  return { chapter: c ? +c[1] : null, episode: e ? +e[1] : null }
}
export const firstLabel = (f) => (f.chapter !== null && f.episode !== null ? `Chapter ${f.chapter} / Episode ${f.episode}` : f.chapter !== null ? `Chapter ${f.chapter}` : f.episode !== null ? `Episode ${f.episode}` : null)
const FIRST = {
  norm: (v) => (v && (v.chapter !== null || v.episode !== null) ? v : null),
  same: (a, b) => (a.chapter !== null && b.chapter !== null ? a.chapter === b.chapter : a.episode !== null && b.episode !== null ? a.episode === b.episode : false),
}
// a name as a set of words, spelling variants of the long vowels (Ohtsuka, Otsuka, Ootsuka) made one
const tokensOf = (s) => (normText(s) ?? '').split(' ').filter(Boolean).map((w) => w.replace(/(oh|ou|oo)/g, 'o').replace(/uu/g, 'u')).sort().join(' ') || null
// a Japanese voice actor: the first names of a list, without the notes in parentheses and the versions (Pilot OVA, 1999, 2011)
export function namesOf(text) {
  return String(text ?? '').split(/;|,|~~|\band\b|\//).map((x) => x.replace(/\(.*?\)|\[.*?\]/g, '').replace(/\d{4}/g, '').trim()).filter((x) => /^\p{L}[\p{L} .'-]{2,}$/u.test(x) && x.split(' ').length <= 4 && !/\b(child|young|ep|episode|episodes|ova|movie|film|mission|rescue|pilot|kai|part)\b/i.test(x))
}
const VOICE = { ...OVERLAP(tokensOf), norm: (v) => (Array.isArray(v) && v.length ? [...new Set(v.map(tokensOf).filter(Boolean))] : null) }
export function roleFromText(s) {
  const t = String(s ?? '').toLowerCase()
  if (/antagonist|villain|\bboss\b|enem/.test(t)) return 'antagonist'
  if (/protagonist|main character|main hero|\bmain\b/.test(t)) return 'main'
  if (/support|secondary|ally|allies|minor|rival|mentor|\bother\b/.test(t)) return 'supporting'
  return null
}
const compact = (k) => String(k).toLowerCase().replace(/[^a-z0-9]/g, '')
const KEY = {
  gender: (k) => /^(gender|sex)$/.test(compact(k)),
  species: (k) => /^(species|race|kind|racespecies)$/.test(compact(k)),
  // the Japanese voice actor: the key names differ from wiki to wiki
  voice: (k) => { const c = compact(k); return /^(jpva|jva|jvoice|japvoice|japanesevoice|japanesevoiceactor|japaneseva|japaneseactor|japanactor|japaneseseiyuu|seiyuu|seiyu|voiceactor|vajap|animevoicedby|jpvoice|japanese|javoiceactor|javoice|jaactor|voice|va|voicedby|japvoiceactor|jav|cv)$/.test(c) && !/eng|drama|netflix|live/.test(c) },
  chapter: (k) => /^(mangadebut|debutmanga|manga|firstmanga|firstchapter|chapter|debutchapter|firstappearance|debut|first|firstvn)$/.test(compact(k)),
  episode: (k) => /^(animedebut|debutanime|anime|firstanime|firstepisode|episode|firstanimeappearance|debutepisode|firstappearance|debut|first)$/.test(compact(k)),
}
const pick = (items, test) => { for (const [k, v] of items) if (test(k)) return v; return null }
const MAGAZINE = [[/young jump|ultra jump|business jump|morning|afternoon|evening|spirits|young magazine|young animal|young champion|big comic|monthly comic gene|comic ryu|ikki|harta|bessatsu shonen|gangan joker|young ace/i, 'seinen'], [/nakayoshi|ribon|hana to yume|margaret|betsucomi|bessatsu margaret|ciao|shojo|shōjo|hana ?to ?yume|lala|dessert|sho-comi|monthly flowers/i, 'shojo'], [/kiss|feel young|ladies|josei|office you|you\b/i, 'josei'], [/corocoro|kodomo|pokemon|ciao/i, 'kodomo'], [/shonen|shōnen|jump|sunday|magazine|champion|ace|gangan|dengeki|comic/i, 'shonen']]
export const demographicOf = (magazine) => { for (const [re, d] of MAGAZINE) if (re.test(String(magazine ?? ''))) return d; return null }

// ---------------------------------------------------------------- collection of one series
async function series(def, deadline) {
  const file = join(OUT, `${def.slug}.json`)
  if (existsSync(file)) return JSON.parse(readFileSync(file, 'utf8'))
  const site = JSON.parse(readFileSync(join(ROOT, `docs/anime/data/series/${def.slug}.json`), 'utf8'))
  const qid = QIDS[def.slug] ?? site.series.wikidata_qid
  const title = site.series.title_en
  const W = def.wiki
  const a1 = new Map(A1.characters.filter((c) => c.series === def.slug).map((c) => [c.slug, c.values]))
  const a1series = A1.series.find((s) => s.slug === def.slug)

  // 1. the pool: One Piece and Dragon Ball keep their pools, the others are ranked
  let picked = []
  let candidates = 0
  if (def.slug === 'one-piece' || def.slug === 'dragon-ball') {
    const d = JSON.parse(readFileSync(join(HERE, 'data', def.slug + '.json'), 'utf8'))
    candidates = d.header.ranking.candidates
    picked = d.characters.map((c) => ({ slug: c.slug, name: c.name, inSite: c.in_site_data, qid: c.ids.wikidata_qid, fandomTitle: c.ids.fandom_title, sitelinks: c.rank.wikidata_sitelinks, bytes: c.rank.fandom_page_bytes + c.rank.fandom_subpage_bytes, wpTitle: c.ids.wikipedia_title, score: c.rank.score, position: c.rank.position }))
  } else {
    const cand = new Map()
    const add = (qidc, label, sl, fd) => {
      const cur = cand.get(qidc) ?? { qid: qidc, label, sitelinks: 0, fandomTitle: null }
      cur.sitelinks = Math.max(cur.sitelinks, sl)
      if (fd && fd.startsWith(`${W}:`) && !cur.fandomTitle) cur.fandomTitle = decodeURIComponent(fd.slice(W.length + 1)).replace(/_/g, ' ')
      cand.set(qidc, cur)
    }
    const typed = '?c wdt:P31/wdt:P279* wd:Q95074 . ?c wikibase:sitelinks ?sl . OPTIONAL { ?c wdt:P6262 ?fd } SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }'
    for (const q of [
      `SELECT ?c ?cLabel ?sl ?fd WHERE { ?c wdt:P1441 ?w . ?w wdt:P361* wd:${qid} . ${typed} }`,
      `SELECT ?c ?cLabel ?sl ?fd WHERE { ?c wdt:P1441 wd:${qid} . ${typed} }`,
      `SELECT ?c ?cLabel ?sl ?fd WHERE { ?c wdt:P6262 ?fd FILTER(STRSTARTS(?fd, "${W}:")) . ${typed} }`,
    ]) {
      try { for (const r of await wdSparql(q)) add(r.c.value.split('/').pop(), r.cLabel?.value ?? '', +r.sl.value, r.fd?.value) } catch { /* the query timed out: the other queries and the site data still give candidates */ }
    }
    // the characters of the site data, with their Fandom page
    const siteInfo = new Map()
    const resolved = await fandomLengths(W, site.characters.map((c) => c.name))
    for (const c of site.characters) {
      const r = resolved.get(c.name)
      let hit = [...cand.values()].find((x) => x.fandomTitle && r && normText(x.fandomTitle) === normText(r.title)) ?? [...cand.values()].find((x) => normText(x.label) === normText(c.name))
      if (!hit) {
        const words = title.split(/[:\u2013-]/)[0].trim()
        const re = new RegExp(words.split(' ')[0].replace(/[^A-Za-z0-9]/g, ''), 'i')
        const found = (await wdSearch(c.name)).find((h) => re.test(h.description) && /character/i.test(h.description))
        if (found) { hit = { qid: found.id, label: found.label, sitelinks: 0, fandomTitle: null }; cand.set(found.id, hit) }
      }
      if (hit) hit.site = c
      siteInfo.set(c.slug, { c, hit, fandomTitle: r?.title ?? hit?.fandomTitle ?? c.name, bytes: r?.length ?? 0 })
    }
    // sitelinks of the items found by search, Fandom page size of every candidate
    const missing = [...cand.values()].filter((x) => !x.sitelinks && x.qid)
    const counts = await wdSitelinkCounts(missing.map((x) => x.qid))
    for (const x of missing) x.sitelinks = counts.get(x.qid) ?? 0
    const want = [...new Set([...cand.values()].map((x) => x.fandomTitle ?? x.label).filter(Boolean))]
    const lens = await fandomLengths(W, want)
    const rows = []
    for (const x of cand.values()) {
      const l = lens.get(x.fandomTitle ?? x.label)
      if (!l) continue
      rows.push({ qid: x.qid, name: x.label, fandomTitle: l.title, sitelinks: x.sitelinks, bytes: l.length, site: x.site ?? null })
    }
    for (const [slugc, si] of siteInfo) if (!rows.some((r) => r.site?.slug === slugc)) rows.push({ qid: si.hit?.qid ?? null, name: si.c.name, fandomTitle: si.fandomTitle, sitelinks: si.hit?.sitelinks ?? 0, bytes: si.bytes, site: si.c })
    const dedup = new Map()
    for (const r of rows) { const k = normText(r.fandomTitle); const cur = dedup.get(k); if (!cur || (r.site && !cur.site) || r.sitelinks > cur.sitelinks) dedup.set(k, { ...r, site: r.site ?? cur?.site ?? null }) }
    const list = [...dedup.values()]
    candidates = list.length
    const ps = percentileRanks(list.map((x) => x.sitelinks))
    const pl = percentileRanks(list.map((x) => x.bytes))
    list.forEach((x, i) => { x.score = ps[i] + pl[i] })
    list.sort((a, b) => b.score - a.score || b.sitelinks - a.sitelinks || b.bytes - a.bytes)
    list.forEach((x, i) => { x.position = i + 1 })
    // the site characters first (by rank), then the best ranked others
    const inSite = list.filter((x) => x.site)
    const others = list.filter((x) => !x.site && x.qid)
    picked = [...inSite.slice(0, def.pool), ...others.slice(0, Math.max(0, def.pool - inSite.length))].map((x) => ({ slug: x.site?.slug ?? slugify(x.fandomTitle), name: x.site?.name ?? x.fandomTitle, inSite: Boolean(x.site), qid: x.qid, fandomTitle: x.fandomTitle, sitelinks: x.sitelinks, bytes: x.bytes, score: x.score, position: x.position, siteRole: x.site?.role ?? null }))
  }

  // 2. facts
  const ents = await wdEntities(picked.map((p) => p.qid).filter(Boolean))
  const classIds = new Set()
  const actorIds = new Set()
  for (const e of Object.values(ents)) {
    for (const v of wdClaim(e, 'P31')) classIds.add(v.id)
    for (const v of wdClaim(e, 'P725')) actorIds.add(v.id)
  }
  const classLabels = {}
  for (const [id, e] of Object.entries(await wdEntities([...classIds]))) classLabels[id] = e.labels?.en?.value ?? ''
  const actors = await wdEntities([...actorIds])
  const siteBySlug = new Map(site.characters.map((c) => [c.slug, c]))
  const listTitles = [`List of ${title} characters`, `List of ${title.split(':')[0].trim()} characters`, `${title.split(':')[0].trim()} characters`]
  let lists = []
  for (const t of listTitles) { lists = await loadLists([t]); if (lists.length) break }

  const characters = []
  for (const p of picked) {
    if (deadline && Date.now() > deadline) throw new Error('DEADLINE')
    const ent = p.qid ? ents[p.qid] : null
    const a = a1.get(p.slug) ?? null
    const siteC = siteBySlug.get(p.slug) ?? null
    const fb = (await fandomInfoboxHtml(W, p.fandomTitle)) ?? null
    const fi = fb && fb.items.size ? fb : (await fandomInfoboxPage(W, p.fandomTitle)) ?? fb
    const items = new Map([...(fi?.items ?? new Map())].map(([k, v]) => [k.replace(/_/g, ' ').trim(), v]))
    const pageUrl = fandomUrl(W, p.fandomTitle)
    const fpage = await fandomPage(W, p.fandomTitle)
    const fcats = fpage ? categoriesOf(fpage.text) : []
    const wpTitle = p.wpTitle ?? ent?.sitelinks?.enwiki?.title ?? null
    const article = await articleEvidence(wpTitle)
    const ev = listEvidence(lists, [p.name, p.fandomTitle, wpTitle, ent?.labels?.en?.value].filter(Boolean))
    const wpText = article?.text && article.text.length > 300 ? { text: article.text, url: article.url } : ev ? { text: ev.text, url: ev.url } : null
    const f = {}
    const a1src = (name, v) => ({ source: 'a1_facts', url: v?.source_url ?? null, raw: v?.evidence ?? null, value: v?.value ?? null, _n: name })

    // gender
    {
      const wd = wdClaim(ent, 'P21')[0]?.id
      f.gender = resolveField([
        { source: 'fandom_infobox', url: pageUrl, raw: pick(items, KEY.gender), value: genderOf(pick(items, KEY.gender)) },
        { source: 'fandom_categories', url: pageUrl, raw: fcats.filter((c) => /^(male|female|males|females)( characters)?$/i.test(c)).join(', ') || null, value: fcats.some((c) => /^(female|females)( characters)?$/i.test(c)) ? 'female' : fcats.some((c) => /^(male|males)( characters)?$/i.test(c)) ? 'male' : null },
        { source: 'wikidata_P21', url: p.qid ? wikidataUrl(p.qid) : null, raw: wd ?? null, value: wd === 'Q6581097' ? 'male' : wd === 'Q6581072' ? 'female' : null },
        { source: 'wikipedia', url: wpText?.url ?? null, raw: wpText ? 'pronouns of the text' : null, value: pronounGender(wpText?.text) },
        ...(a ? [{ ...a1src('gender', a.gender) }] : []),
      ], GENDER)
    }
    // species at the first appearance
    {
      const classes = wdClaim(ent, 'P31').map((v) => classLabels[v.id])
      const own = pick(items, KEY.species)
      const others = [speciesOf(own), speciesFromCategories(fcats), speciesOf(article?.params?.species ? plain(article.params.species) : null), a?.species?.value ?? null].filter(Boolean)
      let wdSpecies = speciesFromWikidata(classes)
      // "fictional human" is the class Wikidata gives to any humanoid: it is ignored when another source names a species
      const wdIgnored = wdSpecies === 'human' && others.some((x) => x !== 'human')
      if (wdIgnored) wdSpecies = null
      f.species = resolveField([
        { source: 'fandom_infobox', url: pageUrl, raw: own, value: speciesOf(own) },
        { source: 'fandom_categories', url: pageUrl, raw: fcats.filter((c) => speciesFromCategories([c])).join(', ') || null, value: speciesFromCategories(fcats) },
        { source: 'wikidata_P31', url: p.qid ? wikidataUrl(p.qid) : null, raw: classes.join(', ') ? classes.join(', ') + (wdIgnored ? ' (generic human ignored)' : '') : null, value: wdSpecies },
        { source: 'wikipedia_infobox', url: article?.url ?? null, raw: article?.params?.species ?? null, value: speciesOf(article?.params?.species ? plain(article.params.species) : null) },
        ...(a ? [{ ...a1src('species', a.species) }] : []),
      ], SPECIES)
    }
    // role at the first appearance
    {
      const cats = [...(fi?.categories ?? []), ...fcats].filter((c) => /protagonist|antagonist|villain|main character|supporting|minor character|ally|allies/i.test(c))
      const catRole = cats.map(roleFromText).find(Boolean) ?? null
      const sectionRole = ev ? roleFromText(`${ev.path ?? ''}`) : null
      f.role_at_debut = resolveField([
        ...(a ? [{ ...a1src('role', a.role_at_debut) }] : []),
        { source: 'site_data_role', url: siteC ? `docs/anime/data/series/${def.slug}.json` : null, raw: siteC ? siteC.role : null, value: siteC?.role ?? null },
        { source: 'fandom_categories', url: pageUrl, raw: cats.join(', ') || null, value: catRole },
        { source: 'wikipedia_list_section', url: ev?.url ?? null, raw: ev?.path ?? null, value: sectionRole },
      ], TEXT)
    }
    // first appearance (chapter, episode)
    {
      const ch = pick(items, KEY.chapter)
      const ep = pick(items, KEY.episode)
      const own = firstAppearanceOf(ch, ep)
      const wpFirst = article?.params?.first ? firstAppearanceOf(plain(stripRefs(article.params.first)), plain(stripRefs(article.params.first))) : { chapter: null, episode: null }
      const a1f = a?.first_appearance?.value ? firstAppearanceOf(a.first_appearance.value, a.first_appearance.value) : null
      f.first_appearance = resolveField([
        { source: 'fandom_infobox', url: pageUrl, raw: [ch, ep].filter(Boolean).join(' / ') || null, value: own },
        { source: 'wikipedia_infobox', url: article?.url ?? null, raw: article?.params?.first ? plain(stripRefs(article.params.first)).slice(0, 80) : null, value: wpFirst },
        ...(a1f ? [{ source: 'a1_facts', url: a.first_appearance.source_url, raw: a.first_appearance.value, value: a1f }] : []),
      ], FIRST)
      const v = f.first_appearance.value
      f.first_appearance.value = v ? firstLabel(v) : null
      for (const s of f.first_appearance.sources) s.value = s.value && typeof s.value === 'object' ? firstLabel(s.value) : s.value
    }
    // Japanese voice actor
    {
      const own = pick(items, KEY.voice)
      const names = []
      for (const c of wdClaim(ent, 'P725')) {
        const act = actors[c.id]
        const lang = (c.qualifiers?.P407 ?? []).some((q) => q.datavalue?.value?.id === 'Q5287')
        const jp = lang || wdClaim(act, 'P27').some((v) => v.id === 'Q17') || wdClaim(act, 'P103').some((v) => v.id === 'Q5287') || wdClaim(act, 'P1412').some((v) => v.id === 'Q5287')
        if (jp && act?.labels?.en?.value) names.push(act.labels.en.value)
      }
      // the infobox of the Wikipedia article: "voice = Japanese: [[Ryo Horikawa]] ...", or a label "Voiced by (Japanese)" with its data
      let infoboxVoice = null
      const japaneseLink = (text) => {
        const t = String(text ?? '')
        // "[[Name]]<br>(Japanese)": the language comes after the actor
        const after = t.match(/\[\[([^\]|]+)(?:\|[^\]]*)?\]\][^\[]{0,40}?\(\s*Japanese/i)?.[1]
        if (after) return after
        const i = t.search(/Japanese/i)
        if (i < 0) return null
        // from the word Japanese to the next language name: the first link is the Japanese actor
        const rest = t.slice(i + 8)
        const j = rest.search(/English|Korean|French|Spanish|German|Italian|Portuguese|Mandarin|Cantonese|Russian|Latin/i)
        return (j >= 0 ? rest.slice(0, j) : rest).match(/\[\[([^\]|]+)/)?.[1] ?? null
      }
      if (article?.params) {
        const p2 = article.params
        infoboxVoice = japaneseLink(p2.voice ?? p2.voiced_by ?? p2.voiced)
        if (!infoboxVoice) for (const [k, v] of Object.entries(p2)) if (/^lbl\d*$/.test(k) && /voiced by.*japanese|japanese.*voic|japanese voice/i.test(plain(v))) infoboxVoice = String(p2['data' + k.slice(3)] ?? '').match(/\[\[([^\]|]+)/)?.[1] ?? null
      }
      const raw = ev?.raw ?? ''
      const wpName0 = raw.match(/Japanese(?: version| anime)?[:\s]+\[\[([^\]|]+)/)?.[1] ?? raw.match(/\[\[([^\]|]+)\]\]\s*\((?:in )?Japanese\)/i)?.[1] ?? null
      const wpName = wpName0 && !/[()]/.test(wpName0) && /^\p{L}[\p{L} .'-]+$/u.test(wpName0) && wpName0.split(' ').length <= 4 ? wpName0 : null
      f.voice_actor_ja = resolveField([
        ...(a ? [{ ...a1src('voice', a.voice_actor_ja), value: a.voice_actor_ja?.value ? [a.voice_actor_ja.value] : null }] : []),
        { source: 'fandom_infobox', url: pageUrl, raw: own, value: own ? namesOf(own) : null },
        { source: 'wikidata_P725', url: p.qid ? wikidataUrl(p.qid) : null, raw: names.join(', ') || null, value: names.length ? names : null },
        { source: 'wikipedia_list_section', url: ev?.url ?? null, raw: wpName, value: wpName ? [wpName] : null },
        { source: 'wikipedia_infobox', url: article?.url ?? null, raw: infoboxVoice, value: infoboxVoice ? [infoboxVoice] : null },
      ], VOICE)
      if (Array.isArray(f.voice_actor_ja.value)) f.voice_actor_ja.value = f.voice_actor_ja.value[0]
      for (const s of f.voice_actor_ja.sources) if (Array.isArray(s.value)) s.value = s.value.join(' / ')
    }
    characters.push({ series: def.slug, slug: p.slug, name: p.name, in_site_data: p.inSite, rank: { position: p.position ?? null, score: Number((p.score ?? 0).toFixed(4)), wikidata_sitelinks: p.sitelinks, fandom_page_bytes: p.bytes }, ids: { fandom_title: p.fandomTitle, fandom_url: pageUrl, wikidata_qid: p.qid, wikipedia_title: wpTitle }, fields: f })
  }

  // 3. series level: the demographic (A1, then the magazine of the series)
  const magazine = site.series.magazine
  const demo = resolveField([
    { source: 'a1_facts', url: a1series?.demographic?.source_url ?? null, raw: a1series?.demographic?.evidence ?? null, value: a1series?.demographic?.value ?? null },
    { source: 'magazine_of_the_series', url: site.series.official_url ?? null, raw: magazine ?? null, value: demographicOf(magazine) },
  ], TEXT)
  const result = { slug: def.slug, title, class: def.cls, pool_target: def.pool, wiki: W, candidates, wikidata_qid: qid, demographic: demo, characters }
  mkdirSync(OUT, { recursive: true })
  writeFileSync(file, JSON.stringify(result))
  return result
}

// ---------------------------------------------------------------- merge and reports
export function merge() {
  const all = []
  for (const def of SERIES) {
    const file = join(OUT, `${def.slug}.json`)
    if (!existsSync(file)) throw new Error(`series not done: ${def.slug}`)
    all.push(JSON.parse(readFileSync(file, 'utf8')))
  }
  return all
}

// first_appearance is data only (owner, 2026-11-03): it is not a game column and is not counted in the thresholds
export const GAME_COLUMNS = ['gender', 'species', 'role_at_debut', 'voice_actor_ja']

export const BIG_SERIES = ['attack-on-titan', 'bleach', 'demon-slayer', 'detective-conan', 'hunter-x-hunter', 'jujutsu-kaisen', 'my-hero-academia', 'naruto']

// The 200 best known characters by the fame score; each of the 8 big series keeps at least 3 (owner, 2026-11-03): a big series below 3 gets its
// best ranked characters in, for the lowest ranked characters overall (outside the big series' first 3). The swaps are in top.swaps.
export function top200(all) {
  const rows = all.flatMap((s) => s.characters.map((c) => ({ ...c, series_title: s.title, series_slug: s.slug })))
  const medians = new Map(all.map((s) => { const b = s.characters.map((c) => c.rank.fandom_page_bytes).sort((x, y) => x - y); return [s.slug, b[Math.floor(b.length / 2)] || 1] }))
  const ps = percentileRanks(rows.map((r) => r.rank.wikidata_sitelinks))
  const pb = percentileRanks(rows.map((r) => r.rank.fandom_page_bytes / medians.get(r.series_slug)))
  rows.forEach((r, i) => { r.fame = ps[i] + pb[i] })
  rows.sort((a, b) => b.fame - a.fame || b.rank.wikidata_sitelinks - a.rank.wikidata_sitelinks)
  const top = rows.slice(0, 200)
  const swaps = []
  for (const slug of BIG_SERIES) {
    let have = top.filter((r) => r.series_slug === slug).length
    for (const cand of rows.slice(200).filter((r) => r.series_slug === slug)) {
      if (have >= 3) break
      // drop the lowest ranked character that is not one of the first 3 of a big series
      let k = top.length - 1
      while (k >= 0 && BIG_SERIES.includes(top[k].series_slug) && top.filter((r) => r.series_slug === top[k].series_slug).length <= 3) k--
      swaps.push({ in: cand, out: top[k] })
      top.splice(k, 1)
      top.push(cand)
      have++
    }
  }
  top.sort((a, b) => b.fame - a.fame || b.rank.wikidata_sitelinks - a.rank.wikidata_sitelinks)
  top.swaps = swaps
  return top
}

const tally = () => Object.fromEntries(GAME_COLUMNS.map((f) => [f, { agree: 0, single: 0, conflict: 0, none: 0 }]))

// Writes all-series.json, REPORT-all-series.md and TOP200.md. info = what the gap review did (null before it).
export function buildOutputs(all, info = null, extra = []) {
  const top = top200(all)
  const topKeys = new Set(top.map((r) => `${r.series_slug}/${r.slug}`))
  const counts = tally()
  const countsTop = tally()
  const lines = ['# Otakudle pool of the 50 launch series: cross-check report', '', `Game columns: ${GAME_COLUMNS.join(', ')} (role_at_debut uses the contract list main, supporting, antagonist, other; voice_actor_ja is the 5-error hint) and the series demographic. first_appearance stays in the data but is not a game column and is not counted (owner, 2026-11-03). Pool sizes: the owner's table (PLAN-LANCEMENT annex). Candidates: Wikidata fictional characters of the series with their sitelinks, joined with the page size on the series Fandom wiki; score = percentile of sitelinks + percentile of page size inside the series; the characters of docs/anime/data/series/<slug>.json come first (by rank), then the best ranked others (added). One Piece and Dragon Ball keep the pools of onepiece.mjs and dragonball.mjs. A1 values (scripts/anime/a1/data/a1-facts.json) count as one source, the others are added by this script.`, '', '## Per series', '', '| series | class | pool | target | candidates | added | ' + GAME_COLUMNS.map((f) => `${f} agree`).join(' | ') + ' | conflicts | demographic |', '|---|---|---:|---:|---:|---:|' + GAME_COLUMNS.map(() => '---:').join('|') + '|---:|---|']
  const conflicts = []
  const dissent = []
  const added = []
  const short = []
  for (const s of all) {
    const own = tally()
    for (const c of s.characters) for (const f of GAME_COLUMNS) {
      const st = c.fields[f].status
      own[f][st]++
      counts[f][st]++
      if (topKeys.has(`${s.slug}/${c.slug}`)) countsTop[f][st]++
      if (st === 'conflict') conflicts.push({ series: s.slug, c, f })
      if (c.fields[f].contested) dissent.push({ series: s.slug, c, f })
    }
    const n = s.characters.length
    const ad = s.characters.filter((c) => !c.in_site_data)
    ad.forEach((c) => added.push({ series: s.slug, c }))
    if (n < s.pool_target) short.push(`${s.slug} (${n} of ${s.pool_target})`)
    const nConf = GAME_COLUMNS.reduce((m, f) => m + own[f].conflict, 0)
    lines.push(`| ${s.slug} | ${s.class} | ${n} | ${s.pool_target} | ${s.candidates} | ${ad.length} | ${GAME_COLUMNS.map((f) => `${Math.round((100 * own[f].agree) / Math.max(1, n))}%`).join(' | ')} | ${nConf} | ${s.demographic.value ?? '-'} (${s.demographic.status}) |`)
  }
  const total = all.reduce((m, s) => m + s.characters.length, 0)
  lines.splice(4, 0, `Characters: ${total} in ${all.length} series. Series under their pool size: ${short.length ? short.join(', ') : 'none'}.${info ? ` Gap review: ${info}` : ''}`, '')
  lines.splice(6, 0, '## Rule (owner decisions, 2026-11-03)', '', '1. Quality: a single source that no other source contradicts is accepted for every column of every series.', '2. Contested values (two or more sources name different values) are settled by a fixed rule: the value stated by the most distinct sources wins; on a tie the most official source wins, in this order: official site or publisher, Wikipedia, A1 (the facts reviewed by the owner in lot A1), the series Fandom wiki, Wikidata, the site data. A Fandom character page, its infobox, its categories and its category pages count as ONE source; Wikipedia article, infobox and list count as one. "agree" = two or more distinct sources state the value, "single" = one source states it and none contradicts it (or the rule settled it), "none" = no source.', '3. Genuinely doubtful = a contested value where the sources tie on number, both sides resting only on trusted sources (Wikipedia, A1, Fandom), so only the order settled it: listed separately below with the values and URLs. A tie against Wikidata or the site data alone is settled by the order and is not doubtful.', '')
  const table = (title, c, n) => {
    lines.push('', `## ${title}`, '', '| column | agree | single | conflict | none | agree share | single share | accepted (agree + single) |', '|---|---:|---:|---:|---:|---:|---:|---:|')
    for (const f of GAME_COLUMNS) {
      const k = c[f]
      const w = k.agree + k.single + k.conflict
      lines.push(`| ${f} | ${k.agree} | ${k.single} | ${k.conflict} | ${k.none} | ${Math.round((100 * k.agree) / n)}% | ${w ? Math.round((100 * k.single) / w) : 0}% | ${Math.round((100 * (k.agree + k.single)) / n)}% |`)
    }
  }
  table(`TOP200 (200 characters)`, countsTop, 200)
  table(`Whole pool (${total} characters)`, counts, total)
  lines.push('', `## Conflicts left (${conflicts.length})`, '')
  for (const x of conflicts) {
    lines.push(`- ${x.c.name} (${x.series}/${x.c.slug}) / ${x.f}: kept ${JSON.stringify(x.c.fields[x.f].value)}${topKeys.has(`${x.series}/${x.c.slug}`) ? ' [TOP200]' : ''}`)
    for (const s of x.c.fields[x.f].sources.filter((q) => q.value !== null && q.value !== undefined)) lines.push(`  - ${s.source}: ${JSON.stringify(s.value)} <${s.url ?? 'no url'}>`)
  }
  const doubtful = dissent.filter((x) => x.c.fields[x.f].doubtful)
  const doubtTop = doubtful.filter((x) => topKeys.has(`${x.series}/${x.c.slug}`))
  lines.push('', `## Genuinely doubtful (${doubtful.length}; in the TOP200: ${doubtTop.length})`, '', 'Contested values where the sources tie on number, both sides resting on trusted sources only (Wikipedia, A1, Fandom), so only the order of trust settled it. Kept value first, then the other values with their pages.', '')
  for (const x of doubtful) {
    const f = x.c.fields[x.f]
    lines.push(`- ${x.c.name} (${x.series}/${x.c.slug}) / ${x.f}: kept ${JSON.stringify(f.value)} (${(f.sources_agreeing ?? []).join(', ')}; ${f.review.pages.join(' ')})${topKeys.has(`${x.series}/${x.c.slug}`) ? ' [TOP200]' : ''}`)
    for (const d of f.contested) lines.push(`  - other: ${JSON.stringify(d.value)} (${d.families.join(', ')}; ${d.pages.join(' ')})`)
  }
  lines.push('', `## Contested values settled by the rule (${dissent.length}; in the TOP200: ${dissent.filter((x) => topKeys.has(`${x.series}/${x.c.slug}`)).length})`, '')
  for (const x of dissent) {
    const f = x.c.fields[x.f]
    lines.push(`- ${x.c.name} (${x.series}/${x.c.slug}) / ${x.f}: kept ${JSON.stringify(f.value)} [${(f.sources_agreeing ?? []).join('+')}]; against ${f.contested.map((d) => `${JSON.stringify(d.value)} [${d.families.join('+')}]`).join(', ')}${topKeys.has(`${x.series}/${x.c.slug}`) ? ' [TOP200]' : ''}`)
  }
  lines.push('', `## Characters added to the site data (${added.length})`, '', '| series | name | slug | score |', '|---|---|---|---:|')
  for (const x of added) lines.push(`| ${x.series} | ${x.c.name} | ${x.c.slug} | ${x.c.rank.score.toFixed(3)} |`)
  lines.push('', ...extra)
  lines.push('', '## Sources unreachable', '')
  lines.push(...(failures.length ? failures.map((q) => `- ${q.url} (${q.error})`) : ['None.']), '')
  writeFileSync(join(HERE, 'data', 'REPORT-all-series.md'), noDash(lines.join('\n')))
  writeFileSync(join(HERE, 'data', 'all-series.json'), noDash(JSON.stringify({ header: { generated_on: new Date().toISOString().slice(0, 10), columns: FIELDS, game_columns: GAME_COLUMNS, characters: total, counts, counts_top200: countsTop, series_short_of_pool: short, review: info, failures }, series: all }, null, 1)) + '\n')
  const swapNote = top.swaps.length ? top.swaps.map((w) => `${w.in.name} (${w.in.series_title}) in for ${w.out.name} (${w.out.series_title})`).join('; ') : 'none needed: each of the 8 big series (Attack on Titan, Bleach, Demon Slayer, Detective Conan, Hunter x Hunter, Jujutsu Kaisen, My Hero Academia, Naruto) already has at least 3 characters'
  const t = ['# TOP200: the best known characters of the 50 launch series', '', `Rule (owner, 2026-11-03): each big series keeps at least 3 characters. Swaps: ${swapNote}.`, '', 'Candidates for the character of the day in the first 365 days. Fame score = percentile rank of the Wikidata sitelinks count (among the 752 pool characters) + percentile rank of the size of the Fandom page relative to the median page of its series (so a big wiki does not win over a small one). Range 0 to 2.', '', '| # | character | series | score | sitelinks |', '|---:|---|---|---:|---:|']
  top.forEach((r, i) => t.push(`| ${i + 1} | ${r.name} | ${r.series_title} | ${r.fame.toFixed(3)} | ${r.rank.wikidata_sitelinks} |`))
  writeFileSync(join(HERE, 'data', 'TOP200.md'), noDash(t.join('\n') + '\n'))
  console.error('final', total, 'characters', JSON.stringify(counts), 'TOP200', JSON.stringify(countsTop))
}

function finalise() {
  buildOutputs(merge(), null)
}

async function main() {
  const args = process.argv.slice(2)
  const arg = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null }
  if (args.includes('--final')) return finalise()
  const deadline = Date.now() + 1000 * (+arg('--deadline') || 480)
  const only = arg('--only')?.split(',')
  for (const def of SERIES) {
    if (only && !only.includes(def.slug)) continue
    if (existsSync(join(OUT, `${def.slug}.json`))) continue
    if (Date.now() > deadline) { console.error('deadline reached, rerun to continue'); return }
    try { const r = await series(def, deadline); console.error('done', def.slug, r.characters.length) } catch (e) {
      if (String(e.message) === 'DEADLINE') { console.error('deadline reached inside', def.slug, ', rerun to continue'); return }
      throw e
    }
  }
  console.error('all series done')
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main()
