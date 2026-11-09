// dragonball.mjs (lot A2): the Dragon Ball character pool (70 characters) of the daily games, collected and cross-checked by script.
//   node scripts/anime/a2/dragonball.mjs      writes data/dragon-ball.json and data/REPORT-dragon-ball.md
// Same method as onepiece.mjs: public pages only (Wikidata, English Wikipedia, the Dragon Ball Fandom wiki), cached under
// ~/kpq-o1/a2-cache/, only short factual values and their source URLs are kept.
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { failures } from './http.mjs'
import { CM, GENDER, INT, ORGS, OVERLAP, TEXT, noDash, normText, parseHeightCm, renderReport, resolveField } from './compare.mjs'
import { buildCandidates, scoreCandidates } from './pool.mjs'
import { fandomCategory, fandomLengths, fandomPage, fandomUrl, wdClaim, wdEntities, wikidataUrl } from './sources.mjs'
import { articleEvidence, listEvidence, loadLists, pronounGender } from './wikipedia.mjs'
import { categoriesOf, findTemplates, paramsOf, plain, sectionsOf, stripComments, stripRefs, wikiLinks } from './wikitext.mjs'
import { parseAffiliations, rawLines, slugify } from './fandomparse.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..', '..', '..')
const WIKI = 'dragonball'
const SITE = JSON.parse(readFileSync(join(ROOT, 'docs/anime/data/series/dragon-ball.json'), 'utf8'))
const POOL_SIZE = 70

export const FIELDS = ['gender', 'race', 'affiliation', 'home_planet', 'universe', 'debut_series', 'debut_saga', 'height_cm', 'alignment_at_debut', 'signature_technique']
const WP_LISTS = ['List of Dragon Ball characters']

// ---------------------------------------------------------------- series and sagas
// Order of the series as the owner lists them (DB, Z, GT, Super); Daima, which the site data holds, comes after.
export const SERIES = [
  { code: 'DB', order: 1, fandom: 'Dragon Ball' },
  { code: 'Z', order: 2, fandom: 'Dragon Ball Z' },
  { code: 'GT', order: 3, fandom: 'Dragon Ball GT' },
  { code: 'Super', order: 4, fandom: 'Dragon Ball Super' },
  { code: 'Daima', order: 5, fandom: 'Dragon Ball Daima' },
]
const seriesByFandomName = (s) => {
  const t = normText(s)
  if (!t) return null
  if (/\bkai\b/.test(t)) return null
  const abbr = { db: 'DB', dbz: 'Z', dbgt: 'GT', dbs: 'Super', dbd: 'Daima' }[t]
  if (abbr) return SERIES.find((x) => x.code === abbr)
  return SERIES.find((x) => normText(x.fandom) === t) ?? SERIES.find((x) => t === normText(x.fandom).replace(/^dragon ball /, '')) ?? null
}
const siteSeries = (name) => (/^Dragon Ball Z:/.test(name) ? 'Z' : /^Dragon Ball Super:/.test(name) ? 'Super' : /^Dragon Ball Daima/.test(name) ? 'Daima' : /^Dragon Ball:/.test(name) ? 'DB' : null)

// The Fandom pages of the sagas of Dragon Ball GT, which the site data does not hold.
const GT_SAGAS = ['Black Star Dragon Ball Saga', 'Baby Saga', 'Super 17 Saga', 'Shadow Dragon Saga']

export function firstRange(text) {
  const m = String(text ?? '').replace(/'''[^']*'''/g, '').match(/(\d+(?:\.\d+)?)\s*[-\u2013]\s*(\d+)/)
  return m ? [Math.ceil(+m[1]), +m[2]] : null
}

async function buildSagas() {
  const sagas = []
  for (const a of SITE.arcs) {
    const series = siteSeries(a.name)
    sagas.push({ name: a.name, series, site_ord: a.ord, from: a.episode_from, to: a.episode_to ?? Infinity, url: a.source_url ?? 'https://dragonball.fandom.com' })
  }
  for (const t of GT_SAGAS) {
    const p = await fandomPage(WIKI, t)
    const box = p ? findTemplates(p.text, /^Arc infobox$/i)[0] : null
    const r = box ? firstRange(plain(paramsOf(box)['anime episodes'] ?? '')) : null
    if (r) sagas.push({ name: `Dragon Ball GT: ${t}`, series: 'GT', site_ord: null, from: r[0], to: r[1], url: p.url })
  }
  const rank = (s) => SERIES.find((x) => x.code === s.series).order * 1e6 + (s.site_ord ?? 0) * 1000 + s.from
  sagas.sort((a, b) => rank(a) - rank(b))
  sagas.forEach((s, i) => { s.order = i + 1 })
  return sagas
}

// ---------------------------------------------------------------- races
const RACE_PRIORITY = ['Saiyan', 'Namekian', 'Frieza Race', 'Majin', 'Android', 'Angel', 'God', 'Monster', 'Animal', 'Human', 'Demon', 'Dragon']
const RACE_ALIAS = new Map(Object.entries({
  saiyan: 'Saiyan', saiyans: 'Saiyan', 'half saiyan': 'Saiyan', 'saiyan human hybrid': 'Saiyan', 'saiyan army': 'Saiyan',
  human: 'Human', humans: 'Human', earthling: 'Human', earthlings: 'Human',
  namekian: 'Namekian', namekians: 'Namekian', nameks: 'Namekian', namek: 'Namekian',
  'frieza clan': 'Frieza Race', 'frieza race': 'Frieza Race', 'frieza s race': 'Frieza Race', 'frieza s clan': 'Frieza Race', 'ginyu s race': null, icejin: 'Frieza Race',
  android: 'Android', androids: 'Android', 'bio android': 'Android', 'artificial human': 'Android', cyborg: 'Android', cyborgs: 'Android',
  majin: 'Majin', majins: 'Majin', 'majin buu': 'Majin',
  angel: 'Angel', angels: 'Angel',
  glind: 'God', "beerus s race": 'God', 'beerus race': 'God', god: 'God', gods: 'God', deity: 'God', deities: 'God', kai: 'God', 'supreme kai': 'God', 'god of destruction': 'God', shinjin: 'God', 'supreme kais': 'God', kaioshin: 'God',
  demon: 'Demon', demons: 'Demon', 'demon clan': 'Demon', 'demon realm': 'Demon',
  dragon: 'Dragon', dragons: 'Dragon',
  monster: 'Monster', monsters: 'Monster', animal: 'Animal', animals: 'Animal',
}))
export function raceOf(labels) {
  const found = []
  for (const l of labels) {
    const k = normText(l)
    if (k !== null && RACE_ALIAS.get(k)) found.push(RACE_ALIAS.get(k))
  }
  for (const r of RACE_PRIORITY) if (found.includes(r)) return r
  return null
}
const titleCase = (s) => s.split(' ').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ')
export function raceFromInfobox(raw) {
  // only the first line of the box: the next lines list the other races a character was (Cell has cells of several)
  const text = stripRefs(stripComments(raw ?? '')).split(/<br\s*\/?\s*>|\n/i)[0] ?? ''
  // what is in parentheses is not the race of the character (Cell: "Bio-Android (contains Saiyan, Namekian ... cells)", Dr. Gero: "(former)"): audit 06
  const outer = text.replace(/\([^)]*\)/g, ' ')
  const labels = [...wikiLinks(outer).flatMap((l) => [l.target, l.label])]
  const word = plain(outer).split('\n')[0]?.trim()
  const known = raceOf([...labels, ...(word ? [word, ...word.split(/[\s/,-]+/)] : [])])
  if (known) return known
  const first = (wikiLinks(text)[0]?.label ?? word ?? '').replace(/['\u2019]s\b/g, "'s").trim()
  return first || null
}

// ---------------------------------------------------------------- infobox readers
const isChar = (t) => t === 'x'
export const unquote = (s) => plain(stripRefs(s ?? '')).replace(/^["'\u201c]+|["'\u201d]+$/g, '').trim()

export function pickHeightDb(raw) {
  const lines = rawLines(stripRefs(raw ?? '')).map((l) => plain(l))
  const list = lines.map((l) => ({ cm: parseHeightCm(l), label: l.toLowerCase() })).filter((h) => h.cm !== null)
  if (!list.length) return null
  const adult = list.filter((h) => /adult/.test(h.label))
  if (adult.length) return adult[0].cm
  const plainOnes = list.filter((h) => !/child|kid|young|teen|baby|infant|age \d|base form|\bbase\b/.test(h.label))
  return (plainOnes.length ? plainOnes : list)[0].cm
}

export function seriesFromAppears(raw) {
  const m = String(raw ?? '').match(/\{\{\s*DB Series\s*\|([^}]*)\}\}/i)
  if (!m) return null
  const codes = m[1].split('|').map((x) => x.trim())
  const map = { DB: 'DB', DBZ: 'Z', DBGT: 'GT', DBS: 'Super', DBD: 'Daima' }
  const first = codes.find((c) => map[c])
  return first ? map[first] : null
}

// ---------------------------------------------------------------- planets
const planetKey = (s) => {
  const t = normText(String(s ?? '').replace(/\(.*?\)/g, ' '))
  return t === null ? null : t.replace(/^planet /, '').replace(/ planet$/, '') || null
}
export const normPlanet = planetKey

// ---------------------------------------------------------------- main
async function main() {
  const sagas = await buildSagas()
  const sagaOfEpisode = (series, n) => (series && n !== null ? sagas.find((s) => s.series === series && n >= s.from && n <= s.to) ?? null : null)
  const sagaRecord = (s) => (s ? { name: s.name, order: s.order, site_arc_ord: s.site_ord } : null)
  const seriesRecord = (code) => { const s = SERIES.find((x) => x.code === code); return s ? { code: s.code, order: s.order } : null }

  // fine saga page -> saga of the site data/GT (the first anime episode range of its box, in the series the page names)
  const fineCache = new Map()
  async function sagaOfFine(name) {
    const key = normText(name)
    if (!key) return null
    if (fineCache.has(key)) return fineCache.get(key)
    let out = null
    const page = await fandomPage(WIKI, /saga$/i.test(name) ? name : `${name} Saga`)
    if (page) {
      // series: the category "<series> sagas" of the page; place: the middle episode of its anime range
      const series = categoriesOf(page.text).map((c) => c.match(/^(.*) sagas$/i)?.[1]).filter(Boolean).map(seriesByFandomName).find(Boolean)
      const box = findTemplates(page.text, /^Arc infobox$/i)[0]
      const r = box ? firstRange(plain(paramsOf(box)['anime episodes'] ?? '')) : null
      if (series && r) {
        const saga = sagaOfEpisode(series.code, Math.round((r[0] + r[1]) / 2))
        if (saga) out = { saga, url: page.url }
      }
    }
    fineCache.set(key, out)
    return out
  }

  // 1. candidates and fame rank
  const cands = scoreCandidates(await buildCandidates({
    wiki: WIKI, prefix: 'dragonball', categories: ['DB Characters', 'DBZ Characters', 'DBGT Characters', 'DBS Characters', 'DBD Characters'],
    descRe: /dragon ball|dragonball/i, skip: (t) => /^List of|\(/.test(t), extra: SITE.characters.map((c) => c.name),
  }))
  const byTitle = new Map(cands.map((c) => [c.title, c]))

  // 2. characters already in the site data
  const resolved = await fandomLengths(WIKI, SITE.characters.map((c) => c.name))
  const siteBy = new Map()
  for (const c of SITE.characters) {
    const k = resolved.get(c.name)
    const cand = k ? byTitle.get(k.title) : null
    if (!cand) throw new Error(`site character ${c.name} (${c.slug}) not found among the Fandom candidates (resolved: ${k?.title})`)
    siteBy.set(cand.title, c)
  }

  // 3. the debut of a candidate (episode page, chapter page)
  const pageCache = new Map()
  const getPage = async (t) => { if (!t) return null; if (!pageCache.has(t)) pageCache.set(t, await fandomPage(WIKI, t)); return pageCache.get(t) }
  async function debutOf(params) {
    const mangaTitle = wikiLinks(params['manga debut'] ?? '')[0]?.target ?? null
    const animeTitle = wikiLinks(params['anime debut'] ?? '')[0]?.target ?? null
    const out = { manga: null, anime: null }
    if (animeTitle) {
      const p = await getPage(animeTitle)
      const b = p ? findTemplates(p.text, /^EpisodeInfobox$/i)[0] : null
      if (b) {
        const pr = paramsOf(b)
        const series = seriesByFandomName(plain(pr.series ?? ''))
        const n = +plain(pr.number ?? '').match(/\d+/)?.[0] || null
        const fine = plain(pr.saga ?? '')
        out.anime = { title: p.title, url: p.url, series: series?.code ?? null, number: n, fine_saga: fine, saga: sagaOfEpisode(series?.code, n) }
      }
    }
    if (mangaTitle) {
      const p = await getPage(mangaTitle)
      const b = p ? findTemplates(p.text, /^Chapter Infobox$/i)[0] : null
      if (b) {
        const pr = paramsOf(b)
        const fine = plain(pr.saga ?? '')
        const viaFine = fine ? await sagaOfFine(fine) : null
        out.manga = { title: p.title, url: p.url, chapter: +plain(pr.chapter ?? '').match(/\d+/)?.[0] || null, fine_saga: fine, saga: viaFine?.saga ?? null, saga_url: viaFine?.url ?? null }
      }
    }
    return out
  }

  // 4. the pool
  const chosen = []
  const info = new Map()
  const need = POOL_SIZE - SITE.characters.length
  let others = 0
  let sites = 0
  for (const cand of cands) {
    const isSite = siteBy.has(cand.title)
    if (!isSite && others >= need) continue
    let page = await fandomPage(WIKI, cand.title)
    let box = page ? findTemplates(page.text, /^Character Infobox$/i)[0] : null
    if (!box && page && isSite) {
      // an index page of the forms of one character (Majin Buu): the form that appears first is the character
      let best = null
      for (const l of wikiLinks(page.text).slice(0, 12)) {
        const p2 = await fandomPage(WIKI, l.target)
        const b2 = p2 ? findTemplates(p2.text, /^Character Infobox$/i)[0] : null
        if (!b2) continue
        const sg = await debutOf(paramsOf(b2))
        const s0 = sg.anime?.saga ?? sg.manga?.saga
        if (s0 && (!best || s0.order < best.order)) best = { order: s0.order, page: p2, box: b2 }
      }
      if (best) { page = best.page; box = best.box }
    }
    if (!box) { if (isSite) console.error(`WARNING site character ${cand.title} has no character infobox`); continue }
    const params = paramsOf(box)
    const debut = await debutOf(params)
    const has = debut.anime?.saga || debut.manga?.saga
    if (!has) { if (isSite) console.error(`WARNING site character ${cand.title} has no series debut`); continue }
    info.set(cand.title, { page, params, debut })
    chosen.push(cand)
    if (isSite) sites++
    else others++
    if (others >= need && sites >= SITE.characters.length) break
  }
  console.error('pool', chosen.length)

  // 5. shared sources
  const entities = await wdEntities(chosen.map((c) => c.qid).filter(Boolean))
  const lists = await loadLists(WP_LISTS)
  // attacks only: the energy attack categories of the wiki, without the transformations, video game and unofficially named ones
  const techniqueTitles = new Map()
  for (const cat of ['Energy waves', 'Energy Sphere attacks', 'Energy barrage techniques', 'Energy Blade Techniques', 'Explosive techniques', 'Combined techniques', 'Team attacks']) {
    for (const t of await fandomCategory(WIKI, cat)) techniqueTitles.set(normText(t.title), t.title)
  }
  for (const cat of ['Transformations', 'Video game techniques', 'Techniques with unofficial names', 'Fusion', 'Supportive techniques', 'Defensive techniques', 'Time Attacks']) for (const t of await fandomCategory(WIKI, cat)) techniqueTitles.delete(normText(t.title))
  const planetTitles = new Set((await fandomCategory(WIKI, 'Planets')).map((t) => planetKey(t.title)))
  planetTitles.add('earth')
  const raceHome = new Map()
  async function homeworldOf(race) {
    if (!race) return null
    if (raceHome.has(race)) return raceHome.get(race)
    const title = { 'Frieza Race': 'Frieza Clan', Namekian: 'Namekian', Saiyan: 'Saiyan', Human: 'Human', Android: 'Android', Majin: 'Majin', Angel: 'Angel', God: 'God', Demon: 'Demon', Dragon: 'Dragon' }[race] ?? race
    const p = await fandomPage(WIKI, title)
    const b = p ? findTemplates(p.text, /^Race Infobox2?$/i)[0] : null
    const hw = b ? paramsOf(b).homeworld ?? null : null
    const lines = hw ? hw.split(/<br\s*\/?\s*>|\n/i) : []
    const inLine = (l) => wikiLinks(stripRefs(l)).map((x) => x.target).filter((t) => !/^(List of|Universe|Age) /.test(t))
    // the planets of the main universe (7) first
    const planets = [...lines.filter((l) => /Universe 7/.test(l)).flatMap(inLine), ...lines.filter((l) => !/Universe (?!7)\d/.test(l)).flatMap(inLine)]
    const out = hw ? { url: p.url, planets: [...new Set(planets)], raw: plain(stripRefs(hw)).replace(/\n/g, '; ') } : null
    raceHome.set(race, out)
    return out
  }
  const universePages = []
  for (let n = 1; n <= 12; n++) {
    const p = await fandomPage(WIKI, `Universe ${n}`)
    if (!p) continue
    const body = sectionsOf(p.text).filter((s) => /resident|deit|mortal|guardian|angel|inhabitant|fighter|team/i.test(s.title)).map((s) => s.body).join('\n')
    universePages.push({ n, url: p.url, links: new Set(wikiLinks(stripRefs(body)).map((l) => normText(l.target))) })
  }

  // planet pages: who they list as inhabitants (infobox Inhabitants, and the sections about inhabitants)
  const planetPages = []
  for (const t of await fandomCategory(WIKI, 'Planets')) {
    if (/^List of /.test(t.title)) continue
    const pp = await fandomPage(WIKI, t.title)
    if (!pp) continue
    const box = findTemplates(pp.text, /^Planet Infobox$/i)[0]
    const secs = sectionsOf(stripComments(pp.text)).filter((s) => /inhabitant|resident|notable|native|people/i.test(s.title)).map((s) => s.body).join('\n')
    const links = [...wikiLinks(stripRefs(`${box ? (paramsOf(box).inhabitants ?? '') : ''}\n${secs}`))].map((l) => normText(l.target))
    planetPages.push({ title: pp.title, url: pp.url, residents: new Set(links) })
  }

  // 6. the characters
  const characters = []
  for (const cand of chosen) {
    const { page, params: p, debut } = info.get(cand.title)
    const site = siteBy.get(cand.title) ?? null
    const pageUrl = page.url
    const ent = cand.qid ? entities[cand.qid] : null
    const wdUrl = cand.qid ? wikidataUrl(cand.qid) : null
    const wpTitle = ent?.sitelinks?.enwiki?.title ?? null
    const article = await articleEvidence(wpTitle)
    const variants = [cand.title, cand.label, ent?.labels?.en?.value, wpTitle].filter(Boolean)
    const ev = listEvidence(lists, variants)
    const wpUrl = article ? article.url : ev?.url ?? null
    const wpText = article?.text && article.text.length > 300 ? article.text : ev?.text ?? null
    const aliases = new Set(variants.map(normText).filter(Boolean))
    const cats = categoriesOf(page.text)
    const f = {}

    // gender
    {
      const own = plain(p.gender ?? '').split('\n')[0] || null
      const fcat = cats.includes('Males') ? 'male' : cats.includes('Females') ? 'female' : null
      const wd = wdClaim(ent, 'P21')[0]?.id
      const wdg = wd === 'Q6581097' ? 'male' : wd === 'Q6581072' ? 'female' : null
      const wpgRaw = article?.params?.gender ? plain(article.params.gender) : null
      const wpg = wpgRaw ? (wpgRaw.match(/identifies (?:as )?(male|female)/i)?.[1] ?? wpgRaw) : pronounGender(wpText)
      f.gender = resolveField([
        { source: 'fandom_infobox', url: pageUrl, raw: own, value: own },
        { source: 'fandom_category', url: pageUrl, raw: cats.filter((c) => /^(Males|Females)$/.test(c)).join(', ') || null, value: fcat },
        { source: 'wikidata_P21', url: wdUrl, raw: wd ?? null, value: wdg },
        { source: 'wikipedia', url: wpUrl, raw: article?.params?.gender ? 'infobox gender' : wpText ? 'pronouns of the text' : null, value: wpg },
      ], GENDER)
    }

    // race
    {
      const own = raceFromInfobox(p.race)
      const fromCats = raceOf(cats)
      // only a known race counts from Wikipedia ("Superhuman" or "Triclops" are not races)
      const wpSpecies = article?.params?.species ? raceOf([...wikiLinks(article.params.species).flatMap((l) => [l.target, l.label]), ...plain(article.params.species).split(/[\s,/]+/)]) : null
      const wdTypes = wdClaim(ent, 'P31').map((x) => x.id)
      f.race = resolveField([
        { source: 'fandom_infobox', url: pageUrl, raw: plain(stripRefs(p.race ?? '')).replace(/\n/g, '; ') || null, value: own },
        { source: 'fandom_categories', url: pageUrl, raw: cats.filter((c) => raceOf([c])).join(', ') || null, value: fromCats },
        { source: 'wikipedia', url: article?.url ?? null, raw: article?.params?.species ? plain(article.params.species) : null, value: wpSpecies },
      ], TEXT)
      f.race._wd = wdTypes
    }
    delete f.race._wd

    // affiliation (current entries of the allegiance box)
    {
      const entries = parseAffiliations(p.allegiance ?? '')
      const current = entries.filter((e) => e.current && !/^(\d|Age\b)/.test(e.name)).map((e) => e.name)
      const catHit = (n) => cats.some((c) => { const a = normText(c); const b = normText(n); return a !== null && b !== null && (a === b || a.startsWith(`${b} `) || b.startsWith(`${a} `)) })
      const confirmed = current.filter(catHit)
      f.affiliation = resolveField([
        { source: 'fandom_infobox', url: pageUrl, raw: plain(stripRefs(p.allegiance ?? '')).replace(/\n/g, '; ') || null, value: current.length ? current : null },
        { source: 'fandom_categories', url: pageUrl, raw: confirmed.length ? `categories confirm: ${confirmed.join(', ')}` : 'no category names a current group', value: confirmed.length ? confirmed : null },
      ], ORGS)
    }

    // home planet (planet of birth): the planet linked after "born/native ..." in the Fandom page text, and the planet pages whose
    // inhabitants list the character. The homeworld of the race page is only a consistency check, not a source.
    {
      const lead = stripComments(stripRefs(page.text))
      const body = lead.slice(Math.max(0, lead.indexOf('}}', lead.indexOf('Character Infobox'))), 9000)
      const born = [...body.matchAll(/\b(?:born|birthplace|native of|hails? from|originat\w+ from|hatched|home ?world)\b[^.\n]{0,80}?\[\[([^\]|#]+)/gi)].map((m) => m[1].trim())
      const asPlanet = born.find((t) => !/^List of /.test(t) && (planetTitles.has(planetKey(t)) || /^Planet /.test(t))) ?? null
      const listed = planetPages.filter((pp) => [...aliases].some((a) => pp.residents.has(a))).map((pp) => pp.title)
      const wpm = wpText ? wpText.match(/\b(?:born|native|from|hails from)\b[^.\n]{0,50}?\bplanet\s+([A-Z][a-z]+(?: [A-Z][a-z]+)?)/) : null
      const hw = await homeworldOf(f.race.value)
      const expected = hw?.planets ?? []
      f.home_planet = resolveField([
        { source: 'fandom_character_page', url: pageUrl, raw: asPlanet, value: asPlanet ? [asPlanet] : null },
        { source: 'fandom_planet_pages', url: planetPages[0]?.url ?? null, raw: listed.length ? `listed as inhabitant of: ${listed.join(', ')}` : null, value: listed.length ? listed : null },
        { source: 'wikipedia', url: wpUrl, raw: wpm ? wpm[0] : null, value: wpm ? [wpm[1]] : null },
      ], OVERLAP(planetKey))
      const cand = Array.isArray(f.home_planet.value) ? f.home_planet.value : []
      f.home_planet.value = cand.find((x) => expected.some((e) => planetKey(e) === planetKey(x))) ?? cand[0] ?? null
      for (const s of f.home_planet.sources) if (Array.isArray(s.value)) s.value = s.value.join(' / ')
      f.home_planet.race_check = !f.home_planet.value || !expected.length ? 'n/a' : expected.some((e) => planetKey(e) === planetKey(f.home_planet.value)) ? 'ok' : `differs from the homeworld of the race (${expected.join(' / ')})`
    }

    // universe: the Fandom "Universe N Characters" categories are the evidence. A character with categories but none of another
    // universe is of the main one, 7 (the category list is the source). Second: "Team Universe N" in the allegiance box; third: the
    // resident lists of the Fandom pages Universe 1 to 12.
    {
      const uCats = cats.map((c) => c.match(/^Universe (\d+) Characters$/i)?.[1]).filter(Boolean).map(Number)
      const other = uCats.filter((n) => n !== 7)
      const inPages = universePages.filter((u) => [...aliases].some((a) => u.links.has(a))).map((u) => u.n)
      const team = [...String(p.allegiance ?? '').matchAll(/Universe (\d+)/g)].map((m) => +m[1])
      f.universe = resolveField([
        { source: 'fandom_categories', url: pageUrl, raw: other.length ? other.map((n) => `Universe ${n} Characters`).join(', ') : uCats.length ? 'Universe 7 Characters' : 'no category of another universe', value: other.length ? other[0] : cats.length ? 7 : null },
        { source: 'fandom_allegiance_team_universe', url: pageUrl, raw: team.length ? team.map((n) => `Team Universe ${n}`).join(', ') : null, value: team.length ? team[0] : null },
        { source: 'fandom_universe_pages', url: universePages[0]?.url ?? null, raw: inPages.length ? inPages.map((n) => `Universe ${n}`).join(', ') : null, value: inPages.length === 1 ? inPages[0] : inPages.includes(other[0] ?? team[0] ?? 7) ? (other[0] ?? team[0] ?? 7) : null },
      ], INT)
    }

    // debut: series and saga
    {
      const a = debut.anime
      const m = debut.manga
      const sa = a?.saga ?? null
      const sm = m?.saga ?? null
      const sagaKey = { norm: (v) => (v ? v.order : null), same: (x, y) => x === y }
      const appears = seriesFromAppears(p['appears in'])
      f.debut_saga = resolveField([
        { source: 'fandom_manga_debut_chapter', url: m?.url ?? null, raw: m ? `chapter ${m.chapter ?? '?'}, ${m.fine_saga}` : null, value: sagaRecord(sm) },
        { source: 'fandom_anime_debut_episode', url: a?.url ?? null, raw: a ? `${a.series ?? '?'} episode ${a.number ?? '?'}, ${a.fine_saga}` : null, value: sagaRecord(sa) },
        { source: 'site_data_debut_arc_ord', url: site ? 'docs/anime/data/series/dragon-ball.json' : null, raw: site ? `debut_arc_ord ${site.debut_arc_ord}` : null, value: site ? sagaRecord(sagas.find((s) => s.site_ord === site.debut_arc_ord)) : null },
      ], sagaKey)
      // the first appearance in any medium: when manga and anime differ, the earlier saga is the debut
      if (f.debut_saga.status === 'conflict') {
        const vals = f.debut_saga.sources.map((s) => s.value).filter(Boolean)
        f.debut_saga.value = vals.reduce((x, y) => (y.order < x.order ? y : x))
        f.debut_saga.note = 'sources differ: the earliest saga is kept as the debut'
      }
      const codeOf = (s) => (s ? sagas.find((x) => x.order === s.order)?.series ?? null : null)
      const best = f.debut_saga.value
      const seriesCode = codeOf(best)
      f.debut_series = resolveField([
        { source: 'series_of_manga_debut_saga', url: m?.url ?? null, raw: sm ? sm.name : null, value: sm ? codeOf(sagaRecord(sm)) : null },
        { source: 'series_of_anime_debut_episode', url: a?.url ?? null, raw: a ? `${a.series ?? '?'} episode ${a.number ?? '?'}` : null, value: a?.series ?? null },
        { source: 'fandom_infobox_appears_in', url: pageUrl, raw: p['appears in'] ? plain(String(p['appears in']).replace(/\{\{DB Series\|([^}]*)\}\}/i, '$1')).slice(0, 80) : null, value: appears },
      ], TEXT)
      if (f.debut_series.status === 'conflict' && seriesCode) f.debut_series.value = seriesCode
      f.debut_series.value = seriesRecord(f.debut_series.value)
      for (const s of f.debut_series.sources) s.value = s.value
    }

    // height
    {
      const wdH = wdClaim(ent, 'P2048')[0]
      const unit = wdH?.unit?.split('/').pop()
      const wdCm = wdH ? Math.round(parseFloat(wdH.amount) * ({ Q174728: 1, Q11573: 100, Q218593: 2.54, Q3710: 30.48 }[unit] ?? NaN)) : null
      f.height_cm = resolveField([
        { source: 'fandom_infobox', url: pageUrl, raw: plain(stripRefs(p.height ?? '')).replace(/\n/g, '; ') || null, value: pickHeightDb(p.height) },
        { source: 'wikidata_P2048', url: wdUrl, raw: wdH ? `${wdH.amount} ${unit}` : null, value: Number.isFinite(wdCm) ? wdCm : null },
      ], CM)
      // the books the Fandom box cites for the height (an official height comes from a guidebook)
      const refs = [...String(p.height ?? '').matchAll(/<ref\b[^>]*>([\s\S]*?)<\/ref>/gi)].map((m) => m[1])
      const books = [...new Set(refs.flatMap((r) => wikiLinks(r).map((l) => l.label)).filter((t) => /guide|daizenshuu|encyclopedia|profile|book|exciting|visual|data|daizenshu|ultimate|complete|dragon ball/i.test(t)))]
      if (f.height_cm.value !== null) f.height_cm.cited = books
    }

    // alignment at the debut
    {
      const sagaPage = debut.anime?.fine_saga || debut.manga?.fine_saga
      const sp = sagaPage ? await getPage(/saga$/i.test(sagaPage) ? sagaPage : `${sagaPage} Saga`) : null
      let satag = null
      let sraw = null
      if (sp) {
        const lead = plain(stripRefs(sp.text.slice(sp.text.indexOf('}}', sp.text.indexOf('Arc infobox')) + 2))).split('\n').slice(0, 6).join(' ')
        const raw = stripRefs(sp.text.slice(sp.text.indexOf('}}', sp.text.indexOf('Arc infobox')) + 2)).split('\n').slice(0, 8).join(' ')
        const sentences = raw.split(/(?<=[.!?])\s+(?=[A-Z'{\[])/)
        const evil = new Set()
        const good = new Set()
        for (const s of sentences) {
          const targets = wikiLinks(s).map((l) => normText(l.target))
          if (/antagonist|villain|enem(?:y|ies)|threat/i.test(s)) targets.forEach((t) => evil.add(t))
          else if (/protagonist|\bhero(?:es)?\b|\ballies\b|\bally\b|\bfriends\b/i.test(s)) targets.forEach((t) => good.add(t))
        }
        const isIn = (set) => [...aliases].some((a) => set.has(a))
        if (isIn(evil)) { satag = 'evil'; sraw = 'named as an antagonist in the lead of the saga' }
        else if (isIn(good)) { satag = 'good'; sraw = 'named as an ally in the lead of the saga' }
        void lead
      }
      const evilCat = cats.includes('Villains') || cats.includes('Antagonists')
      const goodCat = (cats.includes('Heroes') || cats.includes('Former Heroes')) && !cats.includes('Villains') && !cats.includes('Former Villains')
      const antagWp = Boolean(ev?.path && /Antagonists/i.test(ev.path))
      f.alignment_at_debut = resolveField([
        { source: 'fandom_debut_saga_page', url: sp?.url ?? null, raw: sraw, value: satag },
        { source: 'fandom_categories', url: pageUrl, raw: cats.filter((c) => /Villains|Heroes/.test(c)).join(', ') || null, value: evilCat ? 'evil' : goodCat ? 'good' : null },
        { source: 'wikipedia_antagonist_section', url: ev?.url ?? null, raw: antagWp ? 'listed under Antagonists' : null, value: antagWp ? 'evil' : null },
      ], TEXT)
    }

    // signature technique. Rule: the first technique listed in the abilities section of the Fandom page that the Wikipedia entry also
    // names (else the first listed). Compared with the technique the Wikipedia text names most and the technique the Fandom page links most.
    {
      const linksIn = (text) => wikiLinks(stripRefs(text)).map((l) => normText(l.target)).filter((t) => techniqueTitles.has(t))
      // the abilities of the main characters sit on subpages (Goku/Abilities...): read them with the page
      let body = stripComments(page.text)
      for (const st of cand.subTitles ?? []) {
        const sp2 = await getPage(st)
        if (sp2 && !/gallery|trivia|relationships/i.test(st)) body += '\n' + stripComments(sp2.text)
      }
      const sec = sectionsOf(body).find((s) => /technique|abilit|power/i.test(s.title))
      const inSection = sec ? [...new Set(linksIn(sec.body))] : []
      // no technique listed in an abilities section: the techniques linked anywhere in the page, in order of appearance
      const listedOrder = [...new Set([...inSection, ...linksIn(body)])]
      const counts = new Map()
      for (const t of linksIn(body)) counts.set(t, (counts.get(t) ?? 0) + 1)
      const topFandom = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
      const wpCounts = new Map()
      if (wpText) {
        const raw = (article?.rawText ?? ev?.raw ?? '').toLowerCase()
        for (const [k, title] of techniqueTitles) {
          if (k.length < 5) continue
          const n = raw.split(title.toLowerCase()).length - 1
          if (n > 0) wpCounts.set(k, n)
        }
      }
      const topWp = [...wpCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
      // rule: among the techniques listed in the abilities section, those the Wikipedia entry also names are preferred;
      // the one the Fandom page links most wins, the first listed on a tie
      // named by both: in the Fandom text (link or not) and in the Wikipedia text
      const bodyLower = plain(body).toLowerCase()
      const named = [...wpCounts.keys()].filter((k) => bodyLower.includes(techniqueTitles.get(k).toLowerCase()))
      const pool = named.length ? named : (inSection.length ? inSection : listedOrder)
      const score = (k) => (wpCounts.get(k) ?? 0) * 1000 + (counts.get(k) ?? 0)
      const rule = pool.length ? pool.reduce((best, k) => (score(k) > score(best) ? k : best), pool[0]) : null
      const name = (k) => (k ? techniqueTitles.get(k) : null)
      f.signature_technique = resolveField([
        { source: 'rule_fandom_listed_technique_most_named_by_wikipedia', url: pageUrl, raw: rule ? (wpCounts.has(rule) ? 'listed in the Fandom abilities section, named by Wikipedia, most linked' : 'listed in the Fandom abilities section, most linked (Wikipedia does not name it)') : null, value: name(rule) },
        { source: 'wikipedia_text', url: wpUrl, raw: topWp ? `most named: ${name(topWp)} (${wpCounts.get(topWp)} mentions)` : null, value: name(topWp) },
      ], TEXT)
      void topFandom
    }

    characters.push({
      slug: site?.slug ?? slugify(cand.title),
      name: site?.name ?? cand.title,
      in_site_data: Boolean(site),
      rank: { position: cand.position, score: Number(cand.score.toFixed(4)), wikidata_sitelinks: cand.sitelinks, fandom_page_bytes: cand.length, fandom_subpage_bytes: cand.subpages },
      ids: { fandom_title: page.title, fandom_url: pageUrl, fandom_revision: page.revid, fandom_revision_time: page.timestamp, wikidata_qid: cand.qid, wikipedia_title: article?.title ?? wpTitle },
      fields: f,
    })
  }

  const seen = new Set()
  for (const c of characters) { if (seen.has(c.slug)) throw new Error(`duplicate slug ${c.slug}`); seen.add(c.slug) }
  characters.sort((a, b) => a.rank.position - b.rank.position)

  const withHeight = characters.filter((c) => c.fields.height_cm.value !== null)
  const official = withHeight.filter((c) => (c.fields.height_cm.cited ?? []).length > 0)
  const books = [...new Set(official.flatMap((c) => c.fields.height_cm.cited))].sort()
  const unknownAlignment = characters.filter((c) => c.fields.alignment_at_debut.status === 'none').length
  const raceChecks = characters.reduce((m, c) => { const k = c.fields.home_planet.race_check.startsWith('differs') ? 'differs' : c.fields.home_planet.race_check; m[k] = (m[k] ?? 0) + 1; return m }, {})
  const header = {
    game: 'dragon-ball daily game pool',
    generated_on: new Date().toISOString().slice(0, 10),
    ranking: {
      method: 'score = percentile rank of the Wikidata sitelinks count + percentile rank of the Dragon Ball Fandom page size (page plus its subpages, in bytes), among the pages of the Fandom categories DB, DBZ, DBGT, DBS and DBD Characters; the Wikidata item is the one whose P6262 (Fandom article id) names the page, else the one a Wikidata name search finds (same label, description naming Dragon Ball)',
      candidates: cands.length,
      pool: characters.length,
      rule: 'the characters already in docs/anime/data/series/dragon-ball.json are always kept; the others come by rank, skipping a page with no character infobox, a form or alternate version (title in parentheses), a list page, and a character whose debut is a film or game only (no manga chapter or TV episode, so no saga)',
    },
    series_order: SERIES.map((s) => ({ code: s.code, order: s.order })),
    sagas: sagas.map((s) => ({ order: s.order, name: s.name, series: s.series, site_arc_ord: s.site_ord, episodes: [s.from, Number.isFinite(s.to) ? s.to : null] })),
    columns: FIELDS,
    value_notes: {
      race: 'Saiyan, Human, Namekian, Frieza Race, Android, Majin, God, Angel, Demon, Dragon or the Fandom word',
      universe: 'integer; 7 with assumed=true when no source places the character',
      debut_series: '{code, order} DB 1, Z 2, GT 3, Super 4 (Daima 5, in the site data)',
      debut_saga: '{name, order across all series (GT sagas inserted between Z and Super), site_arc_ord in dragon-ball.json or null}',
      home_planet: 'planet of birth (Fandom page text), checked against the homeworld of the race page',
      alignment_at_debut: 'good, evil or neutral as the character is presented at the first appearance (owner rule 2026-11-03)',
      signature_technique: 'English name of the technique; a frequency heuristic, the least reliable field',
    },
    height: { characters_with_height: withHeight.length, without_height: characters.length - withHeight.length, with_guidebook_citation: official.length, books_cited: books },
    alignment_unknown: unknownAlignment,
    home_planet_race_check: raceChecks,
    failures: failures.map((x) => ({ ...x })),
  }

  const added = characters.filter((c) => !c.in_site_data)
  const report = renderReport({
    title: 'Dragon Ball daily game pool: cross-check report',
    headerLines: [
      `Series order: DB 1, Z 2, GT 3, Super 4 (Daima 5 for the site data). Saga order across all series: ${sagas.length} sagas (the ${SITE.arcs.length} of dragon-ball.json plus the ${sagas.length - SITE.arcs.length} of Dragon Ball GT, which the site data lacks).`,
      `Ranking: ${header.ranking.method}. ${header.ranking.rule}.`,
      `Generated on ${header.generated_on}. Data: scripts/anime/a2/data/dragon-ball.json.`,
    ],
    fields: FIELDS,
    characters,
    added,
    failures: header.failures,
    notes: (header.notes = [
      'gender: Fandom infobox, Fandom category (Males/Females), Wikidata P21, Wikipedia (infobox gender, else the pronouns of the text).',
      'race: Fandom infobox race (the first known race in the order Saiyan, Namekian, Frieza Race, Majin, Android, Angel, God, Human, Demon, Dragon), Fandom categories, Wikipedia infobox species.',
      'affiliation: Fandom allegiance box (entries marked former left out), confirmed by the categories of the page. Two sources agree when they share a group.',
      `home_planet: the planet linked after "born/native ..." in the Fandom page text, the Fandom planet pages whose inhabitants list the character, and a "born ... planet X" phrase in Wikipedia. The homeworld of the race page (Saiyan to Planet Vegeta, Namekian to Namek) is a consistency check only, kept as race_check on the field: ${JSON.stringify(raceChecks)}.`,
      'universe: the Fandom categories "Universe N Characters" (a character with categories but none of another universe is of Universe 7, the category list being the evidence), "Team Universe N" in the allegiance box, and the resident lists of the Fandom pages Universe 1 to 12.',
      'debut_saga and debut_series: the debut chapter page and the debut episode page of the Fandom infobox each name a saga (mapped to the sagas of the site data by the first episode of the saga page, or by the episode number and series), and for the site characters the debut_arc_ord already in dragon-ball.json. When manga and anime differ the earlier saga is kept (the conflict stays listed).',
      `height_cm: Fandom infobox (adult height when given) and Wikidata P2048 (rare); no other public list. ${withHeight.length} of ${characters.length} characters have a height, ${official.length} of them with a guidebook cited in the Fandom box (${books.join('; ') || 'none'}); ${characters.length - withHeight.length} have none.`,
      `alignment_at_debut: the lead of the debut saga page (antagonist or ally sentences), the Villains / Antagonists / Heroes categories of the character page (a character with both Villains and Heroes marks is left out), and the Antagonists section of the Wikipedia list. ${unknownAlignment} characters stay unknown.`,
      'signature_technique: rule = among the techniques listed in the abilities section of the Fandom page (else linked anywhere in it), those the Wikipedia entry also names are preferred (a technique named in the Fandom text and in the Wikipedia text), the one Wikipedia names most wins, then the one the Fandom page links most; the second value is the technique the Wikipedia text names most overall (a conflict when it differs). The least reliable field.',
    ]),
  })
  writeFileSync(join(HERE, 'data', 'dragon-ball.json'), noDash(JSON.stringify({ header, characters }, null, 1)) + '\n')
  writeFileSync(join(HERE, 'data', 'REPORT-dragon-ball.md'), noDash(report))
  console.error('written', characters.length, 'characters')
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main()
void isChar
void slugify
