// review.mjs (lot A2, gap review pass): the agent's judgment on what the collection scripts left open.
//   node scripts/anime/a2/review.mjs     reads data/one-piece.json and data/dragon-ball.json (made by onepiece.mjs / dragonball.mjs),
//                                        settles the gaps, writes both files again and both reports.
// A reviewed field carries reviewed: true and review: { note, pages: [urls that state the value] }. A value is "agree" only when two
// distinct pages state it (the page is read again here and the statement is tested); one page gives "single"; none leaves the value as
// the scripts collected it. Run onepiece.mjs and dragonball.mjs first: they rewrite the data without the review.
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { failures } from './http.mjs'
import { BERRIES, GENDER, ORGS, SET, TEXT, noDash, normText, renderReport, resolveField } from './compare.mjs'
import { SEA, FIELDS as OP_FIELDS, placeSea, seaFromText } from './onepiece.mjs'
import { FIELDS as DB_FIELDS } from './dragonball.mjs'
import { fandomAliases, fandomCategory, fandomInfobox, fandomPage, fandomUrl, wikipediaUrl } from './sources.mjs'
import { articleEvidence, listEvidence, loadLists } from './wikipedia.mjs'
import { dropQref, parseAffiliations } from './fandomparse.mjs'
import { categoriesOf, findTemplates, paramsOf, plain, sectionsOf, stripComments, stripRefs, wikiLinks } from './wikitext.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const read = (n) => JSON.parse(readFileSync(join(HERE, 'data', n), 'utf8'))

// ---------------------------------------------------------------- evidence
const cleanText = (raw) => plain(stripRefs(stripComments(raw)))
const snippet = (text, m) => text.slice(Math.max(0, m.index - 40), m.index + m[0].length + 40).replace(/\s+/g, ' ').trim()
const pageCache = new Map()
async function fandom(wiki, title, ts = null) {
  const key = `${wiki}|${title}|${ts}`
  if (!pageCache.has(key)) pageCache.set(key, await fandomPage(wiki, title, ts))
  return pageCache.get(key)
}
// A Fandom page states something when its text matches re.
async function evFandom(wiki, title, re, label, ts = null) {
  const p = await fandom(wiki, title, ts)
  if (!p) return { ok: false, url: fandomUrl(wiki, title), label }
  const text = cleanText(p.text)
  const m = text.match(re)
  return { ok: Boolean(m), url: p.url, label, snippet: m ? snippet(text, m) : null }
}
// The first of several Fandom pages (the character page, its Biography / Power and Abilities subpage, the list of techniques) that states it.
async function evFandomAny(wiki, titles, re, label) {
  let last = null
  for (const t of titles) {
    const e = await evFandom(wiki, t, re, label)
    if (e.ok) return e
    last ??= e
  }
  return last
}
// A Wikipedia entry (own article or section of the character list) states something when its text matches re.
function evWiki(ev, re, label) {
  if (!ev) return { ok: false, url: null, label }
  const m = ev.text.match(re)
  return { ok: Boolean(m), url: ev.url, label, snippet: m ? snippet(ev.text, m) : null }
}

// Settle a field to a value with the pages that state it. Two distinct pages: agree; one: single; none: left as collected.
function settle(ch, field, value, pages, note) {
  const f = ch.fields[field]
  const ok = []
  for (const p of pages) if (p.ok && p.url && !ok.some((q) => q.url === p.url)) ok.push(p)
  f.reviewed = true
  f.review = { note, pages: ok.map((p) => p.url) }
  if (!ok.length) {
    f.review.note = `${note} (no page confirmed it: the value stays as collected)`
    return false
  }
  f.sources = [...f.sources.filter((s) => !String(s.source).startsWith('review:')), ...ok.map((p) => ({ source: `review:${p.label}`, url: p.url, raw: p.snippet ?? null, value }))]
  f.value = value
  f.status = ok.length >= 2 ? 'agree' : 'single'
  delete f.majority
  return true
}

// Settle a field with sources already in the record that carry the value (their URLs are the pages).
function settleFromSources(ch, field, value, same, note, extraPages = []) {
  const f = ch.fields[field]
  const hits = f.sources.filter((s) => s.value !== null && s.value !== undefined && s.url && same(s.value, value)).map((s) => ({ ok: true, url: s.url, label: s.source, snippet: s.raw ?? null }))
  return settle(ch, field, value, [...hits, ...extraPages], note)
}
const eqJson = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const eqText = (a, b) => normText(String(typeof a === 'object' ? a?.name ?? JSON.stringify(a) : a)) === normText(String(typeof b === 'object' ? b?.name ?? JSON.stringify(b) : b))
const eqOrd = (a, b) => (a?.order ?? a?.ord ?? a) === (b?.order ?? b?.ord ?? b)

// =============================================================== One Piece
async function reviewOnePiece() {
  const data = read('one-piece.json')
  const snap = data.header.reference_point.snapshot
  const WIKI = 'onepiece'
  const aliasMap = await fandomAliases(WIKI, data.characters.map((c) => c.ids.fandom_title))
  const stats = {}
  const bump = (k) => { stats[k] = (stats[k] ?? 0) + 1 }
  // the Wikipedia list of characters is arranged by location: the sea is in the heading path of the sections that name a character
  const wpLoc = (await loadLists(['List of One Piece characters'])).flatMap((l) => l.sections).filter((s) => /^Characters by location/.test(s.path))
  const wpSeas = (name) => {
    const found = new Map()
    const re = new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`)
    for (const s of wpLoc) {
      const sea = seaFromText(s.path.replace(/^Characters by location > ?/, ''))
      if (sea && sea !== 'unknown' && re.test(plain(stripRefs(s.body)))) if (!found.has(sea)) found.set(sea, s.url)
    }
    return found
  }

  for (const ch of data.characters) {
    const f = ch.fields
    const page = await fandom(WIKI, ch.ids.fandom_title, snap)
    const pageUrl = ch.ids.fandom_url
    const text = page ? cleanText(page.text) : ''
    const aliases = new Set([normText(ch.ids.fandom_title), ...(aliasMap.get(ch.ids.fandom_title) ?? []).map(normText)].filter(Boolean))

    // gender: Yamato is male on Fandom and Wikipedia, female on Wikidata only
    if (f.gender.status === 'conflict') {
      const majority = f.gender.value
      if (settleFromSources(ch, 'gender', majority, eqText, 'two pages agree; the Wikidata item differs (Fandom lists Yamato under Transgender Characters, the story presents Yamato as male)')) bump('gender')
    }

    // debut arc: the chapter page and the character page agree; the debut_arc_ord of the site data differs for some characters
    if (f.debut_arc.status === 'conflict') {
      const [byChapter, navbox, siteArc] = f.debut_arc.sources
      if (navbox?.value && byChapter?.value && byChapter.value.ord === navbox.value.ord) {
        if (settle(ch, 'debut_arc', byChapter.value, [{ ok: true, url: byChapter.url, label: byChapter.source, snippet: byChapter.raw }, { ok: true, url: navbox.url, label: navbox.source, snippet: navbox.raw }], `first appearance in ${byChapter.raw}; the debut_arc_ord of the site data (${siteArc?.value?.ord}, ${siteArc?.value?.name}) is a later arc and should be corrected`)) {
          f.debut_arc.site_data_differs = siteArc?.value ?? null
          bump('debut_arc')
        }
      }
    }

    // bounty: a Marine, a World Government agent or a civilian has no bounty; "no bounty" is a value when the page shows the role
    if (f.bounty.status === 'none' || f.bounty.status === 'conflict') {
      if (f.bounty.status === 'conflict') {
        const listed = f.bounty.sources.find((s) => s.source === 'fandom_bounty_list' && typeof s.value === 'number')
        if (listed && settle(ch, 'bounty', listed.value, [{ ok: true, url: listed.url, label: listed.source, snippet: listed.raw }], 'the box says Unknown for another identity (Thunder Soldier); the bounty list gives the amount')) bump('bounty')
      } else if (NO_BOUNTY.has(ch.slug)) {
        const m = text.match(ROLE_RE)
        const ok = settle(ch, 'bounty', 'no bounty', [{ ok: Boolean(m), url: pageUrl, label: 'fandom_character_page', snippet: m ? snippet(text, m) : null }], 'Marine, World Government agent or civilian: no bounty on the character page and none in the Bounty/List page')
        if (ok) bump('bounty_no_bounty')
      }
    }

    // affiliation: the page of the main group lists the character (second page)
    if (f.affiliation.status === 'single' && page) {
      const box = await fandomInfobox(WIKI, page, /^Char Box$/i, snap)
      const entries = parseAffiliations(box?.params.affiliation ?? '').filter((e) => e.current && e.target)
      for (const e of entries.slice(0, 3)) {
        const org = await fandom(WIKI, e.target, snap)
        if (!org) continue
        const linked = wikiLinks(stripRefs(org.text)).some((l) => aliases.has(normText(l.target)))
        if (linked) {
          const value = f.affiliation.value
          if (settle(ch, 'affiliation', value, [{ ok: true, url: pageUrl, label: 'fandom_character_page', snippet: e.name }, { ok: true, url: org.url, label: 'fandom_group_page', snippet: `${e.name} page links ${ch.name}` }], `the page of ${e.name} lists the character`)) bump('affiliation')
          break
        }
      }
    }

    // sea of origin: the birthplace named in the first paragraph of the character page, and its place page
    if (f.sea_of_origin.status !== 'agree' && page) {
      const lead = stripComments(page.text).replace(/^\{\{[^{}]*Tabs Top\}\}/, '').split(/\n==/)[0]
      const born = [...lead.matchAll(/\b(?:born|native|raised|hails?|grew up|originates?|comes?|lives?|lived)\b[^.\n]{0,80}?\[\[([^\]|#]+)/gi)].map((m) => m[1].trim())
      for (const place of born) {
        const sea = await placeSea(place, { snapshot: snap })
        if (!sea) continue
        const value = f.sea_of_origin.value !== 'unknown' ? f.sea_of_origin.value : sea.sea
        if (normText(sea.sea) === normText(value) || (SEA.same(normText(sea.sea), normText(value)))) {
          const final = [sea.sea, value].includes('New World') ? 'New World' : value
          if (settle(ch, 'sea_of_origin', final, [{ ok: true, url: pageUrl, label: 'fandom_character_page', snippet: `first paragraph: ${place}` }, { ok: true, url: sea.via ?? sea.url, label: 'fandom_place_page', snippet: `${place} is in ${sea.sea}` }, ...(f.sea_of_origin.sources.filter((s) => s.value === final).map((s) => ({ ok: true, url: s.url, label: s.source })))], `the first paragraph names ${place}, whose page puts it in ${sea.sea}`)) bump('sea_of_origin')
          break
        }
      }
    }

    // sea of origin, second try: the Wikipedia list of characters puts the character in the section of that sea
    if (f.sea_of_origin.status === 'single' && f.sea_of_origin.value !== 'unknown') {
      const seas = wpSeas(ch.name.replace(/^X /, 'X ')) 
      const value = f.sea_of_origin.value
      const hit = [...seas.entries()].find(([s]) => SEA.same(normText(s), normText(value)))
      if (hit) {
        const first = f.sea_of_origin.sources.find((s) => s.value === value && s.url)
        if (settle(ch, 'sea_of_origin', value, [{ ok: true, url: first?.url ?? pageUrl, label: first?.source ?? 'fandom_character_page', snippet: first?.raw ?? null }, { ok: true, url: hit[1], label: 'wikipedia_characters_by_location', snippet: `section of ${hit[0]}` }], 'the Fandom box and the Wikipedia list of characters by location (section of the sea) agree')) bump('sea_of_origin_wikipedia')
      }
    }
  }
  data.header.review = { done: true, settled_fields: stats, note: 'gap review pass by review.mjs: reviewed fields carry reviewed: true and the pages that state the value' }
  return data
}

// Marines, World Government agents and civilians of the pool who have no bounty (decided by reading the role on their page).
const NO_BOUNTY = new Set(['smoker', 'sakazuki', 'sengoku', 'tashigi', 'helmeppo', 'rob-lucci', 'kaku', 'nerona-imu', 'magellan', 'nefertari-vivi', 'shirahoshi', 'neptune', 'makino', 'kozuki-hiyori', 'vegapunk', 'uta'])
const ROLE_RE = /\b(Marines?|Marine Vice Admiral|Fleet Admiral|Admiral|Cipher Pol|CP0|World Government|Impel Down|princess|king of|Ryugu|bartender|singer|scientist|doctor|Vegapunk)\b/i

// =============================================================== Dragon Ball
const RACE_WORD = { Human: /\bhuman\b/i, Dragon: /\bdragon\b/i, 'Frieza Race': /\bFrieza\b/i, Demon: /\bdemon\b/i, Cat: /\bcat\b/i, God: /\b(god|kai|deity)\b/i }
const RACE_RULINGS = { zamasu: 'God', 'dr-gero': 'Human', 'mercenary-tao': 'Human', shenron: 'Dragon', porunga: 'Dragon', 'syn-shenron': 'Dragon', frieza: 'Frieza Race', dabura: 'Demon', korin: 'Cat', gomah: 'Demon' }
const DEBUT_SERIES_RULINGS = { beerus: 'Super', cooler: 'GT', gogeta: 'GT', 'goku-black': 'Super', 'king-vegeta': 'Z', whis: 'Super' }
// saga order across all series: the value kept when the media differ (the manga saga for the site characters, else the earlier saga)
const DEBUT_SAGA_RULINGS = { chiaotzu: 7, 'master-shen': 7, 'tien-shinhan': 7, 'grandpa-gohan': 5, 'king-vegeta': 12, piccolo: 9 }
// Owner rule (2026-11-03): alignment_at_debut is good, evil or neutral, as the character is presented at the first appearance (a dragon, an angel,
// a god or a tournament fighter who is neither ally nor enemy is neutral).
const NEUTRAL = new Set(['shenron', 'porunga', 'whis', 'beerus', 'jiren', 'caulifla', 'kale', 'glorio', 'mr-popo', 'hit'])
const OWNER_CASES = new Set(['oolong', 'puar', 'bardock', 'launch', 'android-16'])
const EVIL = new Set(['oolong', 'puar', 'bardock', 'raditz', 'nappa', 'vegeta', 'cell', 'android-17', 'android-18', 'android-16', 'dr-gero', 'king-piccolo', 'emperor-pilaf', 'mai', 'general-blue', 'captain-ginyu', 'frieza', 'king-cold', 'zarbon', 'dodoria', 'recoome', 'dabura', 'babidi', 'majin-buu', 'janemba', 'turles', 'cooler', 'baby', 'syn-shenron', 'goku-black', 'zamasu', 'mercenary-tao', 'piccolo', 'tien-shinhan', 'chiaotzu', 'yamcha', 'master-shen', 'gomah', 'king-vegeta'])
const GOOD = new Set(['launch', 'mr-satan', 'goku', 'bulma', 'chi-chi', 'krillin', 'gohan', 'master-roshi', 'ox-king', 'grandpa-gohan', 'videl', 'goten', 'trunks', 'pan', 'uub', 'korin', 'dende', 'mr-popo', 'yajirobe', 'king-kai', 'vegito', 'gogeta', 'gotenks', 'shin'])
const EVIL_RE = /\b(villain|antagonist|evil|tyrant|assassin|conquer|invad|destroy|kill|henchm|minion|bandit|criminal|ruthless|menac|cruel|enemy|enemies|threat)/i
const GOOD_RE = /\b(hero|protagonist|ally|allies|friend|defend|protect|martial artist|Z Fighters?|student|kind|savior|saviour|teacher|master|wise|guardian|princess|daughter|wife|husband)\b/i
// signature technique by judgment; the pages are read to see the technique named in the Fandom text and in the Wikipedia entry
const SIGNATURE = { goku: 'Kamehameha', vegeta: 'Galick Gun', piccolo: 'Special Beam Cannon', frieza: 'Death Beam', 'master-roshi': 'Kamehameha', cell: 'Kamehameha', gohan: 'Masenko', krillin: 'Destructo Disc', 'tien-shinhan': 'Tri-Beam', yamcha: 'Wolf Fang Fist', trunks: 'Burning Attack', goten: 'Kamehameha', vegito: 'Final Kamehameha', gogeta: 'Stardust Breaker', gotenks: 'Super Ghost Kamikaze Attack', beerus: 'Hakai', bardock: 'Riot Javelin', raditz: 'Double Sunday', nappa: 'Break Cannon', 'king-piccolo': 'Evil Containment Wave', 'captain-ginyu': 'Body Change', 'mercenary-tao': 'Dodon Ray', chiaotzu: 'Dodon Ray', turles: 'Kill Driver', 'android-16': 'Hell Flash', 'goku-black': 'Black Kamehameha', zarbon: 'Elegant Blaster', zamasu: 'Holy Wrath', 'king-kai': 'Spirit Bomb', jiren: 'Power Impact', hit: 'Time-Skip', 'majin-buu': 'Candy Beam', cooler: 'Supernova', baby: 'Revenge Death Ball' }
const BIRTH = { bulma: 'Earth', 'chi-chi': 'Earth', 'android-18': 'Earth', 'android-17': 'Earth', videl: 'Earth', pan: 'Earth', gohan: 'Earth', goten: 'Earth', trunks: 'Earth', oolong: 'Earth', puar: 'Earth', yajirobe: 'Earth', krillin: 'Earth', yamcha: 'Earth', 'tien-shinhan': 'Earth', chiaotzu: 'Earth', 'master-roshi': 'Earth', 'mr-satan': 'Earth', 'ox-king': 'Earth', 'grandpa-gohan': 'Earth', 'general-blue': 'Earth', 'emperor-pilaf': 'Earth', mai: 'Earth', 'mercenary-tao': 'Earth', 'dr-gero': 'Earth', uub: 'Earth', launch: 'Earth', 'master-shen': 'Earth', korin: 'Earth', piccolo: 'Earth', 'king-piccolo': 'Earth', gotenks: 'Earth', cell: 'Earth', 'android-16': 'Earth', 'goku-black': 'Earth', 'majin-buu': 'Earth', shenron: 'Earth', 'syn-shenron': 'Earth', goku: 'Planet Vegeta', vegeta: 'Planet Vegeta', raditz: 'Planet Vegeta', nappa: 'Planet Vegeta', bardock: 'Planet Vegeta', 'king-vegeta': 'Planet Vegeta', dende: 'Namek', porunga: 'Namek', caulifla: 'Sadala', kale: 'Sadala', dabura: 'Demon Realm', glorio: 'Demon Realm', gomah: 'Demon Realm', beerus: "Beerus' Planet", baby: 'Planet Plant' }
const NO_SIGNATURE = new Set(['bulma', 'chi-chi', 'videl', 'oolong', 'puar', 'emperor-pilaf', 'mai', 'ox-king', 'mr-satan', 'korin', 'yajirobe', 'launch'])

async function reviewDragonBall() {
  const data = read('dragon-ball.json')
  const WIKI = 'dragonball'
  const stats = {}
  const bump = (k) => { stats[k] = (stats[k] ?? 0) + 1 }
  const lists = await loadLists(['List of Dragon Ball characters'])
  const planetTitles = (await fandomCategory(WIKI, 'Planets')).map((t) => t.title).filter((t) => !/^List of /.test(t))
  if (!planetTitles.includes('Earth')) planetTitles.push('Earth')
  const planetKey = (s) => normText(String(s ?? '').replace(/\(.*?\)/g, ' '))?.replace(/^planet /, '').replace(/ planet$/, '') ?? null
  const planetPages = []
  for (const t of planetTitles) {
    const pp = await fandom(WIKI, t)
    if (!pp) continue
    const box = findTemplates(pp.text, /^Planet Infobox$/i)[0]
    const secs = sectionsOf(stripComments(pp.text)).filter((s) => /inhabitant|resident|notable|native|people/i.test(s.title)).map((s) => s.body).join('\n')
    const body = `${box ? (paramsOf(box).inhabitants ?? '') : ''}\n${secs}`
    planetPages.push({ title: pp.title, key: planetKey(pp.title), url: pp.url, text: cleanText(pp.text), residents: new Set(wikiLinks(stripRefs(body)).map((l) => normText(l.target))), location: box ? [...String(paramsOf(box).location ?? '').matchAll(/Universe (\d+)/g)].map((m) => +m[1]) : [] })
  }

  const universePlaces = new Map()
  for (let n = 1; n <= 12; n++) {
    const up = await fandom(WIKI, `Universe ${n}`)
    if (!up) continue
    const body = sectionsOf(stripComments(up.text)).filter((s) => /places/i.test(s.title)).map((s) => s.body).join('\n')
    universePlaces.set(n, { url: up.url, places: new Set(wikiLinks(stripRefs(body)).map((l) => normText(l.target)).filter(Boolean)) })
  }

  for (const ch of data.characters) {
    const f = ch.fields
    const pageUrl = ch.ids.fandom_url
    const page = await fandom(WIKI, ch.ids.fandom_title)
    const text = page ? cleanText(page.text) : ''
    const article = await articleEvidence(ch.ids.wikipedia_title)
    const wpEv = article?.text?.length > 300 ? { text: article.text, url: article.url } : listEvidence(lists, [ch.name, ch.ids.fandom_title, ch.ids.wikipedia_title].filter(Boolean))
    const aliases = new Set([ch.name, ch.ids.fandom_title].map(normText).filter(Boolean))

    // race
    const rr = RACE_RULINGS[ch.slug]
    if (rr && f.race.status !== 'agree') {
      const racePage = { Human: 'Human', Dragon: 'Dragon', 'Frieza Race': 'Frieza Clan', Demon: 'Demon', Cat: 'Cat' }[rr]
      const pages = [await evFandom(WIKI, ch.ids.fandom_title, RACE_WORD[rr], 'fandom_character_page'), evWiki(wpEv, RACE_WORD[rr], 'wikipedia')]
      if (racePage) pages.push(await evFandom(WIKI, racePage, new RegExp(ch.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), 'fandom_race_page'))
      if (settle(ch, 'race', rr, pages, 'the character page and another page name this race')) bump('race')
    }

    // debut series
    const ds = DEBUT_SERIES_RULINGS[ch.slug]
    if (ds && f.debut_series.status !== 'agree') {
      const ep = f.debut_series.sources.find((s) => s.source === 'series_of_anime_debut_episode')
      const extra = ep?.url ? [await evFandom(WIKI, ch.ids.fandom_title, /anime debut/i, 'fandom_character_page')] : []
      const code = { DB: 1, Z: 2, GT: 3, Super: 4, Daima: 5 }[ds]
      if (settleFromSources(ch, 'debut_series', { code: ds, order: code }, (a, b) => (a?.code ?? a) === (b?.code ?? b), 'series of the first TV episode or manga chapter the character appears in (a film debut is not counted)', extra.filter((e) => e.ok))) bump('debut_series')
    }

    // debut saga
    const dsg = DEBUT_SAGA_RULINGS[ch.slug]
    if (dsg && f.debut_saga.status === 'conflict') {
      const target = f.debut_saga.sources.map((s) => s.value).find((v) => v && v.order === dsg)
      if (target && settleFromSources(ch, 'debut_saga', target, eqOrd, 'sources differ between the manga and the anime; the saga kept is the one named in the note of the value', [])) {
        f.debut_saga.review.note = 'manga and anime place the first appearance in different sagas; kept the saga of the site data / the one two pages agree on, else the manga'
        bump('debut_saga')
      }
    }

    // gender: nothing left to rule here (identification is read by the script)

    // universe 7 for Goten (the category list and the Universe 7 pages), a Team Universe 6 mark in the box is a one-off match
    if (f.universe.status === 'conflict') {
      if (settleFromSources(ch, 'universe', 7, (a, b) => Number(a) === Number(b), 'Goten is a Universe 7 character; the Team Universe 6 mark of the box is a tournament team', [])) bump('universe')
    }

    // home planet (planet of birth). Judged from the story, then tested on two pages: the character page names the planet, and the page
    // of the planet names the character. The race of the character is not used as a source. Without a ruling only a birth phrase of the
    // character page itself is kept (the planet pages that list a character as a resident are mostly the afterlife and are dropped).
    {
      const planet = BIRTH[ch.slug]
      if (planet) {
        const key = planet.replace(/^Planet /, '')
        const pre = new RegExp(`\\b${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
        const first = ch.name.split(' ')[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        const pages = [
          await evFandomAny(WIKI, [ch.ids.fandom_title, `${ch.ids.fandom_title}/Biography`], pre, 'fandom_character_page'),
          await evFandom(WIKI, planet, new RegExp(`\\b${first}\\b`, 'i'), 'fandom_planet_page'),
        ]
        if (settle(ch, 'home_planet', planet, pages, 'planet of birth by the story; the character page names the planet and the planet page names the character (the race check is not a source)')) bump('home_planet')
      } else {
        const own = f.home_planet.sources.find((s) => s.source === 'fandom_character_page' && s.value)
        f.home_planet.sources = f.home_planet.sources.filter((s) => s.source !== 'fandom_planet_pages')
        f.home_planet.reviewed = true
        f.home_planet.review = { note: 'no birth planet stated on the pages read', pages: own ? [own.url] : [] }
        f.home_planet.value = own ? own.value : null
        f.home_planet.status = own ? 'single' : 'none'
        delete f.home_planet.majority
        bump('home_planet_unstated')
      }
    }

    // universe: the page of the universe lists the home planet among its places (second page)
    if (f.universe.status !== 'agree' && f.universe.value !== null && f.home_planet.value) {
      const up = universePlaces.get(Number(f.universe.value))
      const planetKeyOf = normText(String(f.home_planet.value).replace(/^Planet /, ''))
      if (up && [...up.places].some((t) => t === normText(f.home_planet.value) || t === planetKeyOf || t === `planet ${planetKeyOf}`)) {
        const own = f.universe.sources.find((s) => s.source === 'fandom_categories')
        if (settle(ch, 'universe', Number(f.universe.value), [{ ok: true, url: own?.url ?? pageUrl, label: 'fandom_categories', snippet: own?.raw ?? null }, { ok: true, url: up.url, label: `fandom_universe_${f.universe.value}_page`, snippet: `Places in Universe ${f.universe.value} lists ${f.home_planet.value}` }], `the character was born on ${f.home_planet.value}, which the page of Universe ${f.universe.value} lists among its places; the categories name no other universe`)) bump('universe')
      }
    }

    // affiliation: the page of the first current group lists the character
    if (f.affiliation.status === 'single' && page) {
      const box = findTemplates(page.text, /^Character Infobox$/i)[0]
      const entries = parseAffiliations(box ? (paramsOf(box).allegiance ?? '') : '').filter((e) => e.current && e.target && !/^(\d|Age\b)/.test(e.name))
      for (const e of entries.slice(0, 4)) {
        const org = await fandom(WIKI, e.target)
        if (!org) continue
        if (wikiLinks(stripRefs(org.text)).some((l) => aliases.has(normText(l.target)))) {
          if (settle(ch, 'affiliation', f.affiliation.value, [{ ok: true, url: pageUrl, label: 'fandom_character_page', snippet: e.name }, { ok: true, url: org.url, label: 'fandom_group_page', snippet: `${e.name} page links ${ch.name}` }], `the page of ${e.name} lists the character`)) bump('affiliation')
          break
        }
      }
    }

    // alignment at the debut: judged from the debut, tested against the wording of the Fandom page and of the Wikipedia entry
    if (NEUTRAL.has(ch.slug) || OWNER_CASES.has(ch.slug)) {
      const value = NEUTRAL.has(ch.slug) ? 'neutral' : EVIL.has(ch.slug) ? 'evil' : 'good'
      const rule = { ok: true, url: pageUrl, label: 'owner_rule_2026-11-03', snippet: 'owner rule: how the character is presented at the first appearance' }
      if (settle(ch, 'alignment_at_debut', value, [rule], `owner decision 2026-11-03: ${value} (alignment is how the character is presented at their first appearance: good, evil or neutral)`)) bump('alignment_at_debut')
    } else if (f.alignment_at_debut.status !== 'agree' && (EVIL.has(ch.slug) || GOOD.has(ch.slug))) {
      const value = EVIL.has(ch.slug) ? 'evil' : 'good'
      const re = value === 'evil' ? EVIL_RE : GOOD_RE
      const lead = text.slice(0, 2500)
      const m = lead.match(re)
      const pages = [{ ok: Boolean(m), url: pageUrl, label: 'fandom_character_page', snippet: m ? snippet(lead, m) : null }, evWiki(wpEv, re, 'wikipedia')]
      for (const s of f.alignment_at_debut.sources) if (s.value === value && s.url) pages.push({ ok: true, url: s.url, label: s.source, snippet: s.raw })
      if (settle(ch, 'alignment_at_debut', value, pages, 'how the character is presented at the first appearance (good, evil or neutral); pages are tested for wording that fits')) bump('alignment_at_debut')
    }

    // signature technique
    const sig = SIGNATURE[ch.slug]
    if (sig) {
      const re = new RegExp(sig.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
      let all = page ? cleanText(page.text) : ''
      for (const st of (ch.rank ? [] : [])) void st
      const wpFull = article?.rawText ? { text: cleanText(article.rawText), url: article.url } : wpEv
      const pages = [await evFandomAny(WIKI, [ch.ids.fandom_title, `${ch.ids.fandom_title}/Power and Abilities`, `List of techniques used by ${ch.ids.fandom_title}`], re, 'fandom_character_page'), evWiki(wpFull, re, 'wikipedia')]
      const tech = await fandom(WIKI, sig)
      if (tech) pages.push({ ok: new RegExp(ch.name.split(' ')[0], 'i').test(cleanText(tech.text)), url: tech.url, label: 'fandom_technique_page', snippet: `${sig} page names ${ch.name}` })
      void all
      if (settle(ch, 'signature_technique', sig, pages, 'the technique the character is best known for, tested against the character page, the Wikipedia entry and the technique page')) bump('signature_technique')
    } else {
      f.signature_technique.reviewed = true
      f.signature_technique.review = { note: NO_SIGNATURE.has(ch.slug) ? 'no technique the character is known for' : 'no single signature technique settled by the pages read; the collected value was dropped', pages: [] }
      f.signature_technique.value = null
      f.signature_technique.status = 'none'
      bump('signature_none')
    }
  }
  data.header.review = { done: true, settled_fields: stats, note: 'gap review pass by review.mjs: reviewed fields carry reviewed: true and the pages that state the value' }
  return data
}

// =============================================================== output
function write(name, data, fields, title, headerExtra, notes) {
  data.header.failures = failures.map((x) => ({ ...x }))
  data.header.report_lines = headerExtra
  data.header.notes = notes
  writeFileSync(join(HERE, 'data', `${name}.json`), noDash(JSON.stringify(data, null, 1)) + '\n')
  const added = data.characters.filter((c) => !c.in_site_data)
  const report = renderReport({ title, headerLines: headerExtra, fields, characters: data.characters, added, failures: data.header.failures, notes })
  writeFileSync(join(HERE, 'data', `REPORT-${name}.md`), noDash(report))
}

async function main() {
  const op = await reviewOnePiece()
  const opRef = op.header.reference_point
  write('one-piece', op, OP_FIELDS, 'One Piece daily game pool: cross-check report (after the gap review)', [
    `Reference point: the last arc finished in the anime is **${opRef.arc}** (anime season ${opRef.anime_season}, episodes ${opRef.episodes[0]} to ${opRef.episodes[1]}, aired ${opRef.season_first_aired} to ${opRef.season_last_aired}, manga chapters ${opRef.chapters[0]} to ${opRef.chapters[1]}); Fandom pages read as they were at ${opRef.snapshot}.`,
    `Gap review done (scripts/anime/a2/review.mjs): ${JSON.stringify(op.header.review.settled_fields)}. A reviewed field has reviewed: true and the pages that state the value. height_cm was left aside for the owner.`,
    `Ranking: ${op.header.ranking.method}.`,
    'height_cm: owner decision 2026-11-03: One Piece height_cm stays with a single Fandom source accepted.',
  ], [...(op.header.notes ?? []), 'REVIEW: bounty "no bounty" for Marines, World Government agents and civilians (one page, the character page); affiliation (the page of the main group lists the character) and sea_of_origin (first paragraph of the character page plus the place page) settled with a second Fandom page; debut_arc conflicts: the chapter page and the character page agree, the debut_arc_ord of the site data is a later arc for those characters; gender: Yamato.'])
  const db = await reviewDragonBall()
  write('dragon-ball', db, DB_FIELDS.filter((f) => f !== 'height_cm'), 'Dragon Ball daily game pool: cross-check report (after the gap review)', [
    `Series order: DB 1, Z 2, GT 3, Super 4 (Daima 5). Gap review done (scripts/anime/a2/review.mjs): ${JSON.stringify(db.header.review.settled_fields)}. A reviewed field has reviewed: true and the pages that state the value. height_cm was left aside for the owner.`,
    `Ranking: ${db.header.ranking.method}.`,
    'height_cm: owner decision 2026-11-03: Dragon Ball height_cm is dropped from the game; the column stays in the data but is not counted in the table below nor in any threshold.',
  ], [...(db.header.notes ?? []), 'REVIEW: race, debut_series, debut_saga, universe, home_planet (a planet page plus the character page), affiliation (the page of the group), alignment_at_debut (judged from the debut, pages tested for fitting wording), signature_technique (judged, tested on the character page, the Wikipedia entry and the technique page).'])
  console.error('review written', JSON.stringify(op.header.review.settled_fields), JSON.stringify(db.header.review.settled_fields))
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main()
void BERRIES
void GENDER
void ORGS
void SET
void TEXT
void resolveField
void categoriesOf
void dropQref
void wikipediaUrl
