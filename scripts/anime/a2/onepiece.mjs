// onepiece.mjs (lot A2): the One Piece character pool (100 characters) of the daily games, collected and cross-checked by script.
//   node scripts/anime/a2/onepiece.mjs        writes data/one-piece.json and data/REPORT-one-piece.md
// Reads only public pages (see sources.mjs), caches every answer under ~/kpq-o1/a2-cache/. Text and images are never stored,
// only short factual values and the URL they come from.
//
// Reference point (bounty, haki, affiliation, Devil Fruit type): the end of the last arc finished in the anime. It is found
// from English Wikipedia ("One Piece season N" pages: a season whose last_aired is "present" is airing, the one before is the
// last finished) and the arcs of docs/anime/data/series/one-piece.json. Fandom pages are read as they were on the day the
// first chapter after that arc got its summary, so a value revealed later is not in the data.
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { failures } from './http.mjs'
import { BERRIES, CM, GENDER, INT, ORGS, OVERLAP, SET, TEXT, noDash, normFruit, normText, parseBerries, parseHeightCm, renderReport, resolveField } from './compare.mjs'
import { buildCandidates, scoreCandidates } from './pool.mjs'
import { fandomAliases, fandomFirstRevisionOver, fandomInfobox, fandomLengths, fandomPage, fandomUrl, wdClaim, wdEntities, wikidataUrl, wpPage } from './sources.mjs'
import { articleEvidence, listEvidence, loadLists, pronounGender } from './wikipedia.mjs'
import { categoriesOf, findTemplates, paramsOf, plain, stripComments, stripRefs, wikiLinks } from './wikitext.mjs'
import { dropQref, parseAffiliations, rawLines, slugify } from './fandomparse.mjs'
import { normOrg } from './compare.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..', '..', '..')
const WIKI = 'onepiece'
const SITE = JSON.parse(readFileSync(join(ROOT, 'docs/anime/data/series/one-piece.json'), 'utf8'))
const POOL_SIZE = 100
// ORCH ruling 2026-11-03: the name shown in the game and on OtakuQuiz for the added characters whose Fandom page title differs
const NAME_FIX = { 'Kouzuki Oden': 'Kozuki Oden', 'Kouzuki Hiyori': 'Kozuki Hiyori', 'Polo Marco': 'Marco', Krieg: 'Don Krieg' }
// berries as integers; 'no bounty' and 'unknown' are values of their own
const BOUNTY = { norm: (v) => (typeof v === 'string' && /^(no bounty|unknown)$/.test(v) ? v : parseBerries(v)), same: (a, b) => a === b }
// New World is the second half of the Grand Line: a box that says Grand Line and a place page that says New World agree.
export const SEA = { norm: normText, same: (a, b) => a === b || [a, b].sort().join('|') === 'grand line|new world' }

export const FIELDS = ['gender', 'affiliation', 'devil_fruit_type', 'devil_fruit_name', 'haki', 'bounty', 'height_cm', 'sea_of_origin', 'debut_arc', 'debut_chapter', 'debut_episode']
// "Grand Line" covers the New World and "Calm Belt" is a sea (audit 06 D-6, D-7): Fandom's own word is kept
const SEAS = ['East Blue', 'West Blue', 'North Blue', 'South Blue', 'Calm Belt', 'Grand Line', 'Red Line', 'Sky Island', 'unknown']
// the category names changed over the years (Kenbunshoku/Busoshoku/Haoshoku became Observation/Armament/Supreme King)
const HAKI_CATEGORY = [[/^(Observation|Kenbunshoku) Haki Users$/i, 'observation'], [/^(Armament|Busoshoku) Haki Users$/i, 'armament'], [/^(Supreme King|Haoshoku|Conqueror'?s?) Haki Users$/i, 'conqueror']]
const WP_LISTS = ['List of One Piece characters', 'List of One Piece pirates', 'List of One Piece marines', 'World Government (One Piece)', 'Four Emperors (One Piece)', 'Revolutionary Army (One Piece)']

// ---------------------------------------------------------------- small readers (pure, tested by hand on the cached pages)
export function seaFromText(text) {
  const t = String(text ?? '').toLowerCase()
  if (!t.trim()) return null
  const hit = SEAS.find((s) => t.includes(s.toLowerCase()) && s !== 'unknown')
  if (/new world/.test(t)) return 'Grand Line'
  if (/red line|mary geoise|marijoa|pangaea castle/.test(t)) return 'Red Line'
  if (/sky island|skypiea|\bsky\b|angel island/.test(t)) return 'Sky Island'
  if (hit) return hit
  if (/paradise|grand line/.test(t)) return 'Grand Line'
  if (/unknown/.test(t)) return 'unknown'
  return null
}

export function parseFirst(raw) {
  const t = plain(dropQref(raw))
  const chapter = t.match(/Chapter\s+(\d+)/i)
  const episode = t.match(/Episode\s+(\d+)/i)
  return { chapter: chapter ? +chapter[1] : null, episode: episode ? +episode[1] : null }
}

export function baseFruitTypes(text) {
  const out = []
  for (const m of String(text).matchAll(/\b(Paramecia|Zoan|Logia)\b/gi)) {
    const w = m[1][0].toUpperCase() + m[1].slice(1).toLowerCase()
    if (!out.includes(w)) out.push(w)
  }
  return out
}

// The type of a fruit (box value "A ---- B" or lines): the reading with the highest chapter revealed up to the cutoff, else the last.
export function fruitTypeOf(raw, cutoffChapter) {
  const parts = dropQref(raw === undefined ? '' : raw).length === 0 ? [] : String(raw).split(/\n?-{3,}\n?|<br\s*\/?\s*>/i).map((s) => s.trim()).filter(Boolean)
  let best = null
  for (const p of parts) {
    const types = baseFruitTypes(plain(dropQref(p)))
    if (types.length === 0) continue
    const chap = [...p.matchAll(/chap=(\d+)/g)].map((m) => +m[1])
    const c = chap.length ? Math.max(...chap) : 0
    if (c > cutoffChapter) continue
    if (!best || c >= best.c) best = { types, c }
  }
  return best ? best.types : []
}

// Last known bounty of a box: the newest line (the first) that holds an amount, struck out or not (a deceased or arrested pirate
// keeps the last bounty). Only World Government bounties count (audit 06 D-1): an amount in parentheses or with the star symbol ({{B|s}}) is a
// Cross Guild rank reward or another issuer's reward, not a bounty. "At least N" is only a bound, so it is unknown.
export function parseBountyBox(raw, cutoffChapter) {
  for (const line of String(raw ?? '').split(/<br\s*\/?\s*>|\n/i)) {
    const chap = line.match(/chap=(\d+)/)
    const clean = dropQref(line)
    if (/at least/i.test(clean)) continue
    const m = clean.match(/\{\{\s*B(?:\|([^{}]*))?\s*\}\}\s*(?:<s>)?\s*([\d,]{2,})/)
    if (!m) continue
    if (/(^|\|)\s*s\s*(\||$)/.test(m[1] ?? '') || /\(\s*(?:<s>)?\s*$/.test(clean.slice(0, m.index))) continue
    if (chap && +chap[1] > cutoffChapter) continue
    return { berries: parseBerries(m[2]), chapter: chap ? +chap[1] : null }
  }
  return null
}

// Height of the box: [{ cm, label }]; the value kept is the grown-up, latest one (post-timeskip, else unlabelled, else last).
export function parseHeights(raw) {
  const out = []
  for (const line of rawLines(raw)) {
    const cm = parseHeightCm(plain(line))
    if (cm === null) continue
    out.push({ cm, label: (plain(line).match(/\(([^()]*)\)\s*$/)?.[1] ?? '').toLowerCase() })
  }
  return out
}
export function pickHeight(list) {
  if (list.length === 0) return null
  const post = list.filter((h) => /post/.test(h.label))
  if (post.length) return post[post.length - 1].cm
  const aged = list.map((h) => ({ ...h, age: +(h.label.match(/\bage\s+(\d+)/)?.[1] ?? NaN) })).filter((h) => Number.isFinite(h.age))
  if (aged.length === list.length) return aged.reduce((a, b) => (b.age > a.age ? b : a)).cm
  const grown = list.filter((h) => !/child|debut|young|former|pre-?time|past|baby|infant|teen|kid|age \d/.test(h.label))
  const pool = grown.length ? grown : list
  return pool[pool.length - 1].cm
}

// ---------------------------------------------------------------- reference point
export async function referencePoint() {
  const seasons = []
  for (let n = 20; n < 40; n++) {
    const p = await wpPage(`One Piece season ${n}`)
    if (!p) break
    const box = findTemplates(p.text, /^Infobox television season$/i)[0]
    if (!box) break
    const pr = paramsOf(box)
    const date = (v) => { const m = String(v ?? '').match(/(\d{4})\|(\d{1,2})\|(\d{1,2})/); return m ? `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}` : null }
    seasons.push({ number: n, name: plain(pr.season_number ?? '').split('\n')[1] ?? '', episodes: +pr.num_episodes || null, first_aired: date(pr.first_aired), last_aired: /present/i.test(pr.last_aired ?? '') ? 'present' : date(pr.last_aired), url: p.url })
  }
  const airing = seasons.find((s) => s.last_aired === 'present')
  const finished = [...seasons].filter((s) => s.last_aired && s.last_aired !== 'present').pop()
  if (!finished) throw new Error('no finished season found on Wikipedia')
  const arcs = SITE.arcs
  const arc = arcs.find((a) => normText(a.name) === normText(finished.name))
  if (!arc) throw new Error(`season arc ${finished.name} not in the arcs of one-piece.json`)
  const airingArc = airing ? arcs.find((a) => normText(a.name) === normText(airing.name)) : null
  const fromAiring = airingArc ? airingArc.episode_from - finished.episodes : null
  const consistent = fromAiring === arc.episode_from && (!airingArc || airingArc.episode_from === arc.episode_to + 1)
  const cutoffChapter = arc.chapter_to
  const next = cutoffChapter + 1
  const stamp = await fandomFirstRevisionOver(WIKI, `Chapter ${next}`, 3000)
  if (!stamp) throw new Error(`cannot date chapter ${next}`)
  const snapshot = `${stamp.slice(0, 10)}T00:00:00Z`
  return {
    arc: arc.name, arc_ord: arc.ord, episodes: [arc.episode_from, arc.episode_to], chapters: [arc.chapter_from, arc.chapter_to],
    anime_season: finished.number, season_first_aired: finished.first_aired, season_last_aired: finished.last_aired, season_url: finished.url,
    airing_after: airing ? { season: airing.number, arc: airing.name, first_aired: airing.first_aired, url: airing.url } : null,
    episode_range_checked_against_wikipedia: consistent,
    cutoff_chapter: cutoffChapter, next_chapter: next, snapshot,
    snapshot_rule: `Fandom pages are read as they were at ${snapshot}: the day Chapter ${next} (the first after the arc) got its summary on the One Piece Fandom wiki`,
  }
}

// ---------------------------------------------------------------- Fandom character data at the snapshot
async function fandomCharacter(title, ref) {
  const page = await fandomPage(WIKI, title, ref.snapshot)
  if (!page) return null
  const box = await fandomInfobox(WIKI, page, /^Char Box$/i, ref.snapshot)
  if (!box) return null
  const first = parseFirst(box.params.first)
  return { page, box, first }
}

function eligible(first, ref) {
  if (first.chapter !== null) return first.chapter <= ref.cutoff_chapter
  if (first.episode !== null) return first.episode <= ref.episodes[1]
  return false
}

function arcOf(kind, n) {
  if (n === null) return null
  const a = SITE.arcs.find((x) => (kind === 'chapter' ? x.chapter_from !== undefined && n >= x.chapter_from && n <= x.chapter_to : n >= x.episode_from && n <= (x.episode_to ?? Infinity)))
  return a ? { ord: a.ord, name: a.name } : null
}

// Names of the link targets of the "Characters" part of a chapter or episode page.
const appearanceCache = new Map()
async function appearances(kind, n) {
  const key = `${kind}${n}`
  if (appearanceCache.has(key)) return appearanceCache.get(key)
  const page = await fandomPage(WIKI, `${kind === 'chapter' ? 'Chapter' : 'Episode'} ${n}`)
  let out = null
  if (page) {
    const m = page.text.match(/\n==+\s*Characters[^=\n]*==+\s*\n([\s\S]*?)(?=\n==[^=]|$)/i)
    if (m) out = { url: page.url, names: new Set(wikiLinks(m[1]).map((l) => normText(l.target))) }
  }
  appearanceCache.set(key, out)
  return out
}

// Edit distance, for the spelling variants of arc names (Whisky/Whiskey Peak).
function distance(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)])
  for (let j = 1; j <= b.length; j++) d[0][j] = j
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
  return d[a.length][b.length]
}
const GENERIC = new Set(['island', 'country', 'kingdom', 'land', 'arc', 'act', 'one', 'two', 'three', 'the', 'of', 'into', 'return', 'to'])
// The arcs of one-piece.json that a Fandom arc name ("Little Garden Arc", "Wano Country Arc") stands for.
export function arcsNamed(fandomName, arcs = SITE.arcs) {
  const f = normText(String(fandomName).replace(/\s+Arc$/i, ''))
  if (!f) return []
  const ft = f.split(' ').filter((w) => w.length > 3 && !GENERIC.has(w))
  return arcs.filter((a) => a.name.split(' / ').some((alt) => {
    const n = normText(alt)
    return n === f || distance(n, f) <= 2 || (ft.length > 0 && ft.every((w) => n.split(' ').some((x) => x === w || distance(x, w) <= 1)))
  }))
}

// The arc navbox ({{Little Garden Arc}}) in the navigation part of a Fandom chapter or episode page.
const navCache = new Map()
async function arcNavbox(kind, n) {
  if (n === null || n === undefined) return null
  const key = `${kind}${n}`
  if (navCache.has(key)) return navCache.get(key)
  const page = await fandomPage(WIKI, `${kind === 'chapter' ? 'Chapter' : 'Episode'} ${n}`)
  let out = null
  if (page) {
    const nav = page.text.slice(Math.max(0, page.text.search(/==\s*Site Navigation\s*==/i)))
    const m = nav.match(/\{\{\s*([^{}|]+? Arc)\s*\}\}/)
    if (m) out = { name: m[1].trim(), url: page.url }
  }
  navCache.set(key, out)
  return out
}

// Users listed by a Haki gallery template at the snapshot.
async function hakiGallery(kind, ref) {
  const page = await fandomPage(WIKI, `Template:${kind} Users Gallery`, ref.snapshot)
  if (!page) return null
  const names = new Set()
  for (const line of page.text.split('\n')) {
    const m = line.match(/^\|\s*([^=|{}\n][^|{}\n]*?)\s*(?:\{\{.*)?$/)
    if (m) names.add(normText(m[1]))
  }
  return { url: page.url, names }
}

export async function placeSea(title, ref, depth = 0, seen = new Set()) {
  if (!title || depth > 3 || seen.has(title)) return null
  seen.add(title)
  const page = await fandomPage(WIKI, title, ref.snapshot)
  if (!page) return null
  const cats = categoriesOf(page.text)
  for (const c of cats) {
    const s = /locations?$|islands?$/i.test(c) ? seaFromText(c.replace(/ Locations?$/i, '')) : null
    if (s && s !== 'unknown') return { sea: s, url: page.url }
  }
  const box = findTemplates(page.text, /Box$/i).find((b) => 'region' in paramsOf(b))
  const region = box ? paramsOf(box).region : null
  const s = seaFromText(plain(dropQref(region ?? '')))
  if (s && s !== 'unknown') return { sea: s, url: page.url }
  const next = wikiLinks(dropQref(region ?? ''))[0]?.target ?? cats.map((c) => c.match(/^(.*) Locations$/)?.[1]).find(Boolean)
  const up = await placeSea(next, ref, depth + 1, seen)
  return up ? { sea: up.sea, url: up.url, via: page.url } : null
}

// ---------------------------------------------------------------- main
async function main() {
  const ref = await referencePoint()
  console.error('reference point', JSON.stringify(ref))

  // 1. candidates and fame rank
  const cands = scoreCandidates(await buildCandidates({ wiki: WIKI, prefix: 'onepiece', categories: ['Male Characters', 'Female Characters'], descRe: /one piece/i, extra: SITE.characters.map((c) => c.name) }))
  const byTitle = new Map(cands.map((c) => [c.title, c]))

  // 2. the characters already in the site data, resolved to Fandom pages
  const siteNames = SITE.characters.map((c) => c.name)
  const resolved = await fandomLengths(WIKI, siteNames)
  const siteBy = new Map()
  for (const c of SITE.characters) {
    const k = resolved.get(c.name)
    const cand = k ? byTitle.get(k.title) : null
    if (!cand) throw new Error(`site character ${c.name} (${c.slug}) not found among the Fandom candidates (resolved: ${k?.title})`)
    siteBy.set(cand.title, c)
  }

  // 3. pick the pool: the site characters, then the best ranked others whose page and debut are inside the reference point
  const chosen = []
  const infoByTitle = new Map()
  const need = POOL_SIZE - SITE.characters.length
  let others = 0
  let sites = 0
  for (const cand of cands) {
    const isSite = siteBy.has(cand.title)
    if (!isSite && others >= need) continue
    const fc = await fandomCharacter(cand.title, ref)
    if (!fc) { if (isSite) console.error(`WARNING site character ${cand.title} has no character box at the snapshot`); continue }
    if (!isSite && !eligible(fc.first, ref)) continue
    if (isSite && !eligible(fc.first, ref)) console.error(`WARNING site character ${cand.title} debut is after the reference point`)
    infoByTitle.set(cand.title, fc)
    chosen.push(cand)
    if (isSite) sites++
    else others++
    if (others >= need && sites >= SITE.characters.length) break
  }
  console.error('pool', chosen.length)

  // 4. sources shared by all characters
  const entities = await wdEntities(chosen.map((c) => c.qid).filter(Boolean))
  const lists = await loadLists(WP_LISTS)
  const aliasMap = await fandomAliases(WIKI, chosen.map((c) => c.title))
  const bountyPage = await fandomPage(WIKI, 'Bounty/List', ref.snapshot)
  const bountyRows = new Map()
  if (bountyPage) {
    for (const row of bountyPage.text.split(/\n\|-\s*\n/)) {
      const name = row.match(/^\|\s*'*\s*\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/)?.[1]
      const amount = row.match(/\{\{\s*B\s*\}\}\s*'*\s*([\d,]+)/)?.[1]
      if (name && amount && !bountyRows.has(normText(name))) bountyRows.set(normText(name), parseBerries(amount))
    }
  }
  const galleries = {}
  for (const [key, kind] of [['observation', 'Observation Haki'], ['armament', 'Armament Haki'], ['conqueror', 'Supreme King Haki']]) galleries[key] = await hakiGallery(kind, ref)

  // 5. the characters
  const characters = []
  for (const cand of chosen) {
    const fc = infoByTitle.get(cand.title)
    const site = siteBy.get(cand.title) ?? null
    const p = fc.box.params
    const pageUrl = fc.page.url
    const aliases = new Set([normText(cand.title), normText(fc.page.title), ...(aliasMap.get(cand.title) ?? []).map(normText)])
    aliases.delete(null)
    const ent = cand.qid ? entities[cand.qid] : null
    const wdUrl = cand.qid ? wikidataUrl(cand.qid) : null
    const wpTitle = ent?.sitelinks?.enwiki?.title ?? null
    const article = await articleEvidence(wpTitle)
    const variants = [cand.title, cand.label, ent?.labels?.en?.value, wpTitle, ...(aliasMap.get(cand.title) ?? [])].filter(Boolean)
    const ev = listEvidence(lists, variants)
    const wpText = article?.text && article.text.length > 300 ? article.text : null
    const wpEv = wpText ? { text: wpText, url: article.url } : ev ? { text: ev.text, url: ev.url } : null
    const f = {}

    // gender
    {
      const cats = categoriesOf(fc.page.text)
      const fcat = cats.includes('Male Characters') ? 'male' : cats.includes('Female Characters') ? 'female' : null
      const wd = wdClaim(ent, 'P21')[0]?.id
      const wdg = wd === 'Q6581097' ? 'male' : wd === 'Q6581072' ? 'female' : null
      const infoGender = article?.params?.gender ? plain(article.params.gender) : null
      f.gender = resolveField([
        { source: 'fandom_category', url: pageUrl, raw: cats.filter((c) => /^(Male|Female) Characters$/.test(c)).join(', ') || null, value: fcat },
        { source: 'wikidata_P21', url: wdUrl, raw: wd ?? null, value: wdg },
        { source: 'wikipedia', url: wpEv?.url ?? null, raw: infoGender ?? (wpEv ? 'pronouns of the text' : null), value: infoGender ? infoGender : pronounGender(wpEv?.text) },
      ], GENDER)
    }

    // affiliation (at the reference point: the entries of the box without a former/disbanded mark)
    {
      const entries = parseAffiliations(p.affiliation ?? '')
      const current = entries.filter((e) => e.current).map((e) => e.name)
      // a category of the page names a group of the box when it is the group or starts with it ("Cross Guild Officers")
      const cats = categoriesOf(fc.page.text)
      const catHit = (n) => cats.some((c) => { const a = normOrg(c); const b = normOrg(n); return a !== null && b !== null && (a === b || a.startsWith(`${b} `)) })
      const catNames = entries.filter((e) => e.current && catHit(e.name)).map((e) => e.name)
      const wpAff = article?.params ? Object.entries(article.params).find(([k, v]) => /^(data\d+)$/.test(k) && /affiliation/i.test(article.params['lbl' + k.slice(4)] ?? ''))?.[1] : null
      const wpAffNames = wpAff ? wikiLinks(wpAff).map((l) => l.label).concat(plain(wpAff).split('\n').map((l) => l.replace(/\s*\(.*$/, ''))).filter(Boolean) : null
      f.affiliation = resolveField([
        { source: 'fandom_infobox', url: pageUrl, raw: plain(dropQref(p.affiliation ?? '')).replace(/\n/g, '; ') || null, value: current.length ? current : null },
        { source: 'fandom_categories', url: pageUrl, raw: catNames.length ? `categories confirm: ${catNames.join(', ')}` : 'no category names a current group', value: catNames.length ? catNames : null },
        { source: 'wikipedia', url: article?.url ?? null, raw: wpAff ? plain(wpAff).replace(/\n/g, '; ') : null, value: wpAffNames },
      ], ORGS)
    }

    // Devil Fruit: type and English name
    {
      const dfLinks = wikiLinks(dropQref(p.dfname ?? '')).map((l) => l.target)
      const fruitPages = []
      for (const t of [...new Set(dfLinks)]) {
        const fp = await fandomPage(WIKI, t, ref.snapshot)
        const b = fp ? findTemplates(fp.text, /^Devil Fruit Box$/i)[0] : null
        if (b) fruitPages.push({ page: fp, params: paramsOf(b) })
      }
      const cats = categoriesOf(fc.page.text)
      const catTypes = [...new Set(cats.flatMap((c) => (/Devil Fruit Users$/i.test(c) ? baseFruitTypes(c) : [])))]
      const hasFruit = dfLinks.length > 0 || String(p.dftype ?? '').trim() !== ''
      const ownTypes = [...new Set(fruitTypeOf(p.dftype, ref.cutoff_chapter))]
      const fruitTypes = [...new Set(fruitPages.flatMap((fp) => fruitTypeOf(fp.params.type, ref.cutoff_chapter)))]
      // names: every line of the box is a translation of a fruit (Viz first), the final value is one name per fruit
      const altNames = (text) => plain(text).split('\n').flatMap((l) => l.split(/\)\s*,\s*|\s+or\s+|\//)).map((l) => l.replace(/\s*\(.*$/, '').trim()).filter((l) => l && !l.startsWith('('))
      const nFruits = Math.max(1, fruitPages.length)
      const ownNames = altNames(dropQref(p.dfename ?? ''))
      const fruitNames = fruitPages.flatMap((fp) => altNames(dropQref(String(fp.params.ename ?? '').split(/\n?-{3,}/)[0])))
      // Wikipedia: the type words and the fruit names written in the infobox of the article, or in the section of the list
      const wpType = article?.params ? Object.entries(article.params).filter(([k]) => /^(data\d+|devil_?fruit)/i.test(k)).map(([, v]) => v).join(' ') : ''
      const wpBlob = (wpType || ev?.raw || '')
      const wpTypes = wpBlob ? [...new Set([...wpBlob.matchAll(/\b(Paramecia|Zoan|Logia)\b/gi)].map((m) => m[1][0].toUpperCase() + m[1].slice(1).toLowerCase()))] : []
      const wpNamesRaw = [...(wpType || ev?.raw || '').matchAll(/\{\{nihongo\|([^|{}]*?Fruit[^|{}]*?)\|/gi)].flatMap((m) => m[1].split(/\s+or\s+|\//)).map((x) => x.trim()).filter(Boolean)
      const wpNames = wpNamesRaw.length ? wpNamesRaw : null
      const fruitUrl = fruitPages[0]?.page.url ?? null
      f.devil_fruit_type = resolveField([
        { source: 'fandom_infobox', url: pageUrl, raw: plain(dropQref(p.dftype ?? '')).replace(/\n/g, '; ') || null, value: hasFruit ? (ownTypes.length ? ownTypes : null) : [] },
        { source: 'fandom_categories', url: pageUrl, raw: cats.filter((c) => /Devil Fruit Users$/i.test(c)).join(', ') || null, value: catTypes },
        { source: 'fandom_fruit_page', url: fruitUrl, raw: fruitPages.map((fp) => fp.page.title).join(', ') || null, value: fruitPages.length ? fruitTypes : null },
        { source: 'wikipedia', url: (wpType ? article?.url : ev?.url) ?? null, raw: wpTypes.join(', ') || null, value: wpTypes.length ? wpTypes : null },
      ], OVERLAP())
      f.devil_fruit_name = resolveField([
        { source: 'fandom_infobox', url: pageUrl, raw: plain(dropQref(p.dfename ?? '')).replace(/\n/g, '; ') || null, value: hasFruit ? (ownNames.length ? ownNames : null) : [] },
        { source: 'fandom_categories', url: pageUrl, raw: catTypes.length ? null : 'no Devil Fruit Users category', value: catTypes.length ? null : [] },
        { source: 'fandom_fruit_page', url: fruitUrl, raw: fruitPages.map((fp) => fp.page.title).join(', ') || null, value: fruitPages.length ? fruitNames : null },
        { source: 'wikipedia', url: (wpType ? article?.url : ev?.url) ?? null, raw: wpNames?.join(', ') || null, value: wpNames },
      ], OVERLAP(normFruit))
      // the value kept for the name is one name per fruit (the first line of the box), not the list of translations
      if (f.devil_fruit_name.status !== 'none' && Array.isArray(f.devil_fruit_name.value) && f.devil_fruit_name.value.length > 0) {
        const first = (ownNames.length ? ownNames : fruitNames).slice(0, nFruits)
        if (first.length) f.devil_fruit_name.value = first
      }
      for (const k of ['devil_fruit_type', 'devil_fruit_name']) {
        const scal = (v) => (Array.isArray(v) ? (v.length === 0 ? 'none' : v.length === 1 ? v[0] : v) : v)
        f[k].value = scal(f[k].value)
        for (const s of f[k].sources) s.value = scal(s.value)
      }
    }

    // haki (only the types known at the reference point, since both sources are read at the snapshot)
    {
      const cats = categoriesOf(fc.page.text)
      const fromCats = HAKI_CATEGORY.filter(([re]) => cats.some((c) => re.test(c))).map(([, k]) => k)
      const have = Object.values(galleries).every(Boolean)
      const fromGallery = have ? Object.entries(galleries).filter(([, g]) => [...aliases].some((a) => g.names.has(a))).map(([k]) => k) : null
      f.haki = resolveField([
        { source: 'fandom_categories', url: pageUrl, raw: cats.filter((c) => /Haki Users$/.test(c)).join(', ') || null, value: fromCats },
        { source: 'fandom_haki_galleries', url: Object.values(galleries).find(Boolean)?.url ?? null, raw: fromGallery ? fromGallery.join(', ') || null : null, value: fromGallery },
      ], SET())
    }

    // bounty (last known at the reference point, in berries). "no bounty" is a value (the page says so), "unknown" too
    // (the box says Unknown); a box that says nothing is missing data (none).
    {
      const box = parseBountyBox(p.bounty, ref.cutoff_chapter)
      const listed = [...aliases].map((a) => bountyRows.get(a)).find((v) => v !== undefined) ?? null
      const boxText = plain(dropQref(p.bounty ?? '')).split('\n')[0] ?? ''
      const pageText = plain(stripRefs(stripComments(fc.page.text)))
      const saysNone = /\b(has no (known |official )?bounty|have a bounty|had no (known |official )?bounty|never (had|has had) a bounty|no bounty (was|has|is))\b/i.test(pageText) && !box
      const boxValue = box?.berries ?? (/unknown/i.test(boxText) ? 'unknown' : saysNone ? 'no bounty' : null)
      f.bounty = resolveField([
        { source: 'fandom_infobox', url: pageUrl, raw: boxText || (saysNone ? 'page text: no bounty' : null), value: boxValue },
        { source: 'fandom_bounty_list', url: bountyPage?.url ?? null, raw: listed !== null ? String(listed) : null, value: listed },
      ], BOUNTY)
    }

    // height
    {
      const heights = parseHeights(p.height)
      const hv = pickHeight(heights)
      const wdH = wdClaim(ent, 'P2048')[0]
      const unit = wdH?.unit?.split('/').pop()
      const wdCm = wdH ? Math.round(parseFloat(wdH.amount) * ({ Q174728: 1, Q11573: 100, Q218593: 2.54, Q3710: 30.48 }[unit] ?? NaN)) : null
      f.height_cm = resolveField([
        { source: 'fandom_infobox', url: pageUrl, raw: plain(dropQref(p.height ?? '')).replace(/\n/g, '; ') || null, value: hv },
        { source: 'wikidata_P2048', url: wdUrl, raw: wdH ? `${wdH.amount} ${unit}` : null, value: Number.isFinite(wdCm) ? wdCm : null },
      ], CM)
    }

    // sea of origin: the sea written in the Fandom origin box, the sea reached from the place page the box links to,
    // and the seas of the location categories of the page ("Foosha Village Characters")
    {
      const originText = plain(dropQref(p.origin ?? ''))
      const direct = seaFromText(originText)
      const place = wikiLinks(dropQref(p.origin ?? '')).map((l) => l.target).find((t) => !seaFromText(t))
      const viaPlace = place ? await placeSea(place, ref) : null
      const locCats = categoriesOf(fc.page.text).map((c) => c.match(/^(.+) (?:Characters|Residents)$/)?.[1]).filter((c) => c && !/^(Male|Female|Canon|Non-Canon|Minor|Major)$/i.test(c)).slice(0, 10)
      const catSeas = []
      for (const lc of locCats) {
        const named = seaFromText(lc)
        if (named && named !== 'unknown') { if (!catSeas.some((x) => x.sea === named)) catSeas.push({ sea: named, url: pageUrl }); continue }
        const r = await placeSea(lc, ref)
        if (r && !catSeas.some((x) => x.sea === r.sea)) catSeas.push(r)
      }
      // a location category is where the character lives or lived, not where they were born: it can only confirm
      const asked = direct ?? viaPlace?.sea ?? null
      const catValue = asked && catSeas.some((x) => x.sea === asked) ? asked : null
      f.sea_of_origin = resolveField([
        { source: 'fandom_infobox', url: pageUrl, raw: originText.replace(/\n/g, '; ') || null, value: direct },
        { source: 'fandom_place_page', url: viaPlace?.url ?? (place ? fandomUrl(WIKI, place) : null), raw: place ?? null, value: viaPlace?.sea ?? null },
        { source: 'fandom_location_categories', url: pageUrl, raw: catSeas.length ? catSeas.map((x) => x.sea).join(', ') : null, value: catValue },
      ], SEA)
      if (f.sea_of_origin.status === 'none') f.sea_of_origin.value = 'unknown'
    }

    // debut: chapter, episode (infobox, then the chapter or episode page lists the character) and the arc derived from both
    const chapterSeen = fc.first.chapter !== null ? await appearances('chapter', fc.first.chapter) : null
    const episodeSeen = fc.first.episode !== null ? await appearances('episode', fc.first.episode) : null
    const listed = (seen) => (seen ? [...aliases].some((a) => seen.names.has(a)) : false)
    f.debut_chapter = resolveField([
      { source: 'fandom_infobox', url: pageUrl, raw: plain(dropQref(p.first ?? '')), value: fc.first.chapter },
      { source: 'fandom_chapter_page', url: chapterSeen?.url ?? null, raw: chapterSeen ? (listed(chapterSeen) ? 'listed' : 'not listed') : null, value: listed(chapterSeen) ? fc.first.chapter : null },
    ], INT)
    f.debut_episode = resolveField([
      { source: 'fandom_infobox', url: pageUrl, raw: plain(dropQref(p.first ?? '')), value: fc.first.episode },
      { source: 'fandom_episode_page', url: episodeSeen?.url ?? null, raw: episodeSeen ? (listed(episodeSeen) ? 'listed' : 'not listed') : null, value: listed(episodeSeen) ? fc.first.episode : null },
    ], INT)
    {
      // 1. the arc of the debut chapter by the chapter ranges of the arcs of one-piece.json (the debut episode when anime only);
      // 2. the arc navbox of the Fandom page of that chapter (or episode), mapped to the same arcs by name;
      // 3. the debut_arc_ord the site data already holds for the character.
      const byCh = arcOf('chapter', fc.first.chapter)
      const byEp = arcOf('episode', fc.first.episode)
      const mine = byCh ?? byEp
      const navbox = await arcNavbox(byCh ? 'chapter' : 'episode', byCh ? fc.first.chapter : fc.first.episode)
      const named = navbox ? arcsNamed(navbox.name) : []
      const viaNav = named.length ? (named.find((x) => mine && x.ord === mine.ord) ?? named[0]) : null
      const siteArc = site ? SITE.arcs.find((x) => x.ord === site.debut_arc_ord) : null
      const ordOf = { norm: (v) => (v ? v.ord : null), same: (a, b) => a === b }
      f.debut_arc = resolveField([
        byCh ? { source: 'arc_of_debut_chapter', url: pageUrl, raw: `chapter ${fc.first.chapter}`, value: byCh } : { source: 'arc_of_debut_episode', url: pageUrl, raw: fc.first.episode !== null ? `episode ${fc.first.episode}` : null, value: byEp },
        { source: 'fandom_arc_navbox_of_debut_page', url: navbox?.url ?? null, raw: navbox ? `{{${navbox.name}}}` : null, value: viaNav ? { ord: viaNav.ord, name: viaNav.name } : null },
        { source: 'site_data_debut_arc_ord', url: site ? 'docs/anime/data/series/one-piece.json' : null, raw: site ? `debut_arc_ord ${site.debut_arc_ord}` : null, value: siteArc ? { ord: siteArc.ord, name: siteArc.name } : null },
      ], ordOf)
    }

    characters.push({
      slug: site?.slug ?? slugify(NAME_FIX[cand.title] ?? cand.title),
      name: site?.name ?? NAME_FIX[cand.title] ?? cand.title,
      in_site_data: Boolean(site),
      rank: { position: cand.position, score: Number(cand.score.toFixed(4)), wikidata_sitelinks: cand.sitelinks, fandom_page_bytes: cand.length, fandom_subpage_bytes: cand.subpages },
      ids: { fandom_title: fc.page.title, fandom_url: pageUrl, fandom_revision: fc.page.revid, fandom_revision_time: fc.page.timestamp, wikidata_qid: cand.qid, wikipedia_title: article?.title ?? wpTitle },
      fields: f,
    })
  }

  // slugs of the added characters must be unique and not collide with the site data
  const seen = new Set()
  for (const c of characters) { if (seen.has(c.slug)) throw new Error(`duplicate slug ${c.slug}`); seen.add(c.slug) }
  characters.sort((a, b) => a.rank.position - b.rank.position)

  const header = {
    game: 'one-piece daily game pool',
    generated_on: new Date().toISOString().slice(0, 10),
    reference_point: ref,
    ranking: {
      method: 'score = percentile rank of the Wikidata sitelinks count + percentile rank of the One Piece Fandom page size (page plus its subpages, in bytes), among the pages of the Fandom categories Male Characters and Female Characters; the Wikidata item is the one whose P6262 (Fandom article id) names the page',
      candidates: cands.length,
      pool: characters.length,
      rule: 'the characters already in docs/anime/data/series/one-piece.json are always kept; the others come by rank, skipping a page that has no character box or whose debut is after the reference point',
    },
    columns: FIELDS,
    value_notes: {
      bounty: 'berries, integer; null = no bounty known at the reference point',
      haki: 'list of observation, armament, conqueror known at the reference point; [] = none',
      devil_fruit_type: 'Paramecia, Zoan, Logia or none (a list when a character has several fruits)',
      devil_fruit_name: 'English name of the fruit (a list when several); none when no fruit',
      affiliation: 'list, current entries of the Fandom box at the reference point, main one first',
      height_cm: 'grown-up height, post-timeskip when given',
      debut_arc: '{ord, name} in the arcs of one-piece.json; the arc of the debut chapter, else of the debut episode',
    },
    failures: failures.map((x) => ({ ...x })),
  }

  const added = characters.filter((c) => !c.in_site_data)
  const report = renderReport({
    title: 'One Piece daily game pool: cross-check report',
    headerLines: [
      `Reference point: the last arc finished in the anime is **${ref.arc}** (arc ${ref.arc_ord} of one-piece.json): anime season ${ref.anime_season} (Wikipedia: ${ref.season_url}), episodes ${ref.episodes[0]} to ${ref.episodes[1]}, aired ${ref.season_first_aired} to ${ref.season_last_aired}, manga chapters ${ref.chapters[0]} to ${ref.chapters[1]}.`,
      ref.airing_after ? `The next arc, ${ref.airing_after.arc} (season ${ref.airing_after.season}, since ${ref.airing_after.first_aired}), is still airing, so it is excluded.` : '',
      `Bounty, haki, affiliation and Devil Fruit type are read from Fandom pages as they were at ${ref.snapshot}: ${ref.snapshot_rule}. A value revealed after that is not in the data, and a character introduced after it is not in the pool.`,
      `Ranking: ${header.ranking.method}. ${header.ranking.rule}.`,
      `Generated on ${header.generated_on}. Data: scripts/anime/a2/data/one-piece.json.`,
    ].filter(Boolean),
    fields: FIELDS,
    characters,
    added,
    failures: header.failures,
    notes: (header.notes = [
      'gender: Fandom category (Male/Female Characters) at the snapshot, Wikidata P21, Wikipedia (infobox gender, else the pronouns of the character section).',
      'affiliation: Fandom box at the snapshot (entries marked former/disbanded left out), then the Fandom categories of the page, then the Wikipedia infobox. Two sources agree when the main group of one is in the other.',
      'devil_fruit_type and devil_fruit_name: Fandom box, Fandom categories (type only), the page of the fruit itself (Devil Fruit Box), and Wikipedia (the type words and the English name in a nihongo template of the article infobox or of the character section; positive evidence only). none is a value; lists agree when they share a name.',
      'haki: Fandom categories of the page, and the Fandom gallery templates "Observation Haki Users Gallery", "Armament Haki Users Gallery", "Supreme King Haki Users Gallery" (read at the snapshot).',
      'bounty: Fandom box (newest entry up to the reference chapter, struck out or not) and the Fandom page Bounty/List at the snapshot. "no bounty" is a value when the page text says so, "unknown" when the box says Unknown; a box that says nothing is missing data (none).',
      'height_cm: Fandom box and Wikidata P2048 (rare). Most heights have a single source: no second public list exists.',
      'sea_of_origin: the sea written in the Fandom origin box; the sea reached from the place page it links to (categories "X Locations", box region, up to 3 levels); the seas of the page location categories ("X Characters"). No source at all gives unknown with status none. The Calm Belt is unknown (not one of the seas listed).',
      'debut_chapter and debut_episode: Fandom box, then the Characters list of the Fandom page Chapter N / Episode N (the character must be listed there). A character not found in the list gets no second value (single), never a conflict.',
      'debut_arc: the arc of the debut chapter (the debut episode when the debut is anime only) by the chapter and episode ranges of the arcs in one-piece.json; second value: the arc navbox of the Fandom page of that chapter or episode, mapped to the arcs by name; third: the debut_arc_ord already in one-piece.json (the 32 site characters).',
    ]),
  })
  writeFileSync(join(HERE, 'data', 'one-piece.json'), noDash(JSON.stringify({ header, characters }, null, 1)) + '\n')
  writeFileSync(join(HERE, 'data', 'REPORT-one-piece.md'), noDash(report))
  console.error('written', characters.length, 'characters')
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main()
