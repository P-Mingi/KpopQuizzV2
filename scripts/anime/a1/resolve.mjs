// resolve.mjs (lot A1): checks every value of facts.mjs against the cached source, adds the revision or the QID it comes from, and writes
// data/a1-facts.json, the only input of gen-sql.mjs and gen-review.mjs. A value whose evidence is not found stops the run.
//   A1_CACHE=<scratch folder> node scripts/anime/a1/resolve.mjs <pool.tsv>
// pool.tsv: series|slug|name|role, the published, spoiler-free characters of L04 replayed on a local database:
//   select g.slug, c.slug, c.name, c.role from characters c join groups g on g.id = c.group_id where c.status = 'published' and c.spoiler_level = 0 and not c.identity_spoiler and g.slug in (the 12 series)
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { wdEntities, wikitext, wikiUrl } from './http.mjs'
import { CHARACTERS, SERIES } from './facts.mjs'
import { QIDS } from './qids.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const SERIES_QIDS = JSON.parse(readFileSync(join(HERE, 'data/series-qids.json'), 'utf8'))
const pool = readFileSync(process.argv[2], 'utf8').trim().split('\n').map((l) => { const [series, slug, name, role] = l.split('|'); return { series, slug, name, role } })
const P31 = { human: ['fictional human'], elf: ['elf in a work of fiction'], dwarf: ['dwarf in a work of fiction'], demon: ['fictional demon'], pig: ['anthropomorphic pig'], creature: ['fictional creature'], shinigami: ['Soul Reaper'], quincy: ['Quincy'], fiend: ['blood fiend'] }

const fails = []
const pageCache = new Map()
const strip = (t) => t.replace(/<ref[^>]*\/>/g, '').replace(/<ref[\s\S]*?<\/ref>/g, '').replace(/<!--[\s\S]*?-->/g, '').replace(/\{\{(?:gnr|sfn|efn|Graphic novel reference|Ref label)[^{}]*\}\}/gi, '')
const clean = (t) => t.replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, '$1').replace(/'{2,}/g, '').replace(/\s+/g, ' ')
const fold = (s) => s.toLowerCase()
function sections(text) {
  const out = []; const path = []
  let cur = null
  for (const l of text.split('\n')) {
    const h = l.match(/^(={2,6})\s*(.+?)\s*\1\s*$/)
    if (h) { path[h[1].length] = h[2]; path.length = h[1].length + 1 }
    if (h || /^;/.test(l)) { cur = { head: l, path: path.filter(Boolean).join(' > '), body: '' }; out.push(cur) } else if (cur) cur.body += `${l}\n`
  }
  return out
}
async function page(title) {
  if (!pageCache.has(title)) {
    const p = await wikitext(title)
    if (!p) throw new Error(`no page ${title}`)
    const raw = strip(p.text)
    pageCache.set(title, { title: p.title, revid: p.revid, url: wikiUrl(p.title), raw, text: clean(raw), sections: sections(raw) })
  }
  return pageCache.get(title)
}
const FETCHED = new Date().toISOString().slice(0, 19) + 'Z'
function wikipediaSource(p) { return { source: 'wikipedia', source_ref: p.revid, source_url: p.url, fetched_at: FETCHED } }
const wikidataSource = (qid) => ({ source: 'wikidata', source_ref: qid, source_url: `https://www.wikidata.org/wiki/${qid}`, fetched_at: FETCHED })

async function checkWp(where, src) {
  const p = await page(src.page)
  if (src.kind === 'sec') {
    const hit = p.sections.find((s) => fold(s.path).includes(fold(src.section)) && fold(s.head + s.path).includes(fold(src.head)))
    if (!hit) { fails.push(`${where}: no entry "${src.head}" under "${src.section}" of ${src.page}`); return null }
    return { ...wikipediaSource(p), evidence: `section: ${hit.path.replace(/<[^>]*>/g, '').slice(0, 80)}` }
  }
  if (!fold(p.text).includes(fold(clean(src.ev)))) { fails.push(`${where}: evidence not found in ${src.page}: ${src.ev}`); return null }
  return { ...wikipediaSource(p), evidence: src.ev.slice(0, 80) }
}

const allQ = Object.values(QIDS).flatMap((m) => Object.values(m))
const ents = await wdEntities([...new Set([...allQ, ...Object.values(SERIES_QIDS)])])
const labelIds = new Set()
for (const e of Object.values(ents)) for (const p of ['P21', 'P31', 'P725']) for (const st of e.claims?.[p] ?? []) { const id = st.mainsnak?.datavalue?.value?.id; if (id) labelIds.add(id); for (const q of st.qualifiers?.P407 ?? []) if (q.datavalue?.value?.id) labelIds.add(q.datavalue.value.id) }
const labels = await wdEntities([...labelIds])
const L = (q) => labels[q]?.labels?.en?.value ?? q
const claims = (e, p) => (e.claims?.[p] ?? []).filter((c) => c.rank !== 'deprecated').map((c) => ({ label: L(c.mainsnak?.datavalue?.value?.id), lang: (c.qualifiers?.P407 ?? []).map((x) => L(x.datavalue?.value?.id)) }))

const bySeries = new Map(pool.map((c) => [`${c.series}/${c.slug}`, c]))
const characters = []
const seen = new Set()
for (const [series, rows] of Object.entries(CHARACTERS)) {
  for (const r of rows) {
    const key = `${series}/${r.slug}`
    const c = bySeries.get(key)
    if (!c) { fails.push(`${key}: not a pool character of L04`); continue }
    seen.add(key)
    const qid = QIDS[series]?.[r.slug] ?? null
    const e = qid ? ents[qid] : null
    const out = { series, slug: r.slug, name: c.name, l04_role: c.role, qid, values: {} }
    const put = async (field, value, src) => {
      if (value === null || value === undefined) { if (src) fails.push(`${key}.${field}: a source without a value`); return }
      if (!src) { fails.push(`${key}.${field}: a value without a source`); return }
      let s = null
      if (src.kind === 'wd') {
        if (!e) { fails.push(`${key}.${field}: wd without a QID`); return }
        if (field === 'gender' && !claims(e, 'P21').some((x) => x.label === value)) fails.push(`${key}.gender: Wikidata does not say ${value}`)
        if (field === 'species' && !claims(e, 'P31').some((x) => (P31[value] ?? []).includes(x.label))) fails.push(`${key}.species: Wikidata P31 does not say ${value}`)
        if (field === 'voice_actor_ja' && !claims(e, 'P725').some((x) => x.label === value && x.lang.includes('Japanese'))) fails.push(`${key}.voice: Wikidata has no Japanese ${value}`)
        s = { ...wikidataSource(qid), evidence: field === 'gender' ? 'P21' : field === 'species' ? 'P31' : 'P725 (Japanese)' }
      } else {
        s = await checkWp(`${key}.${field}`, src)
        if (src.kind === 'l04') { if (value !== c.role) fails.push(`${key}.role: l04 given but L04 says ${c.role}`); if (s) s.evidence = `L04 role, ${s.evidence}` }
      }
      if (s) out.values[field] = { value, ...s, inferred: field === 'species' && src.kind === 'wp' && value === 'human' && !/human/i.test(src.ev) }
    }
    await put('gender', r.g, r.gs)
    await put('species', r.s, r.ss)
    await put('role_at_debut', r.r, r.rs)
    await put('first_appearance', r.f, r.fs)
    await put('voice_actor_ja', r.v, r.vs)
    characters.push(out)
  }
}
for (const c of pool) if (!seen.has(`${c.series}/${c.slug}`)) fails.push(`${c.series}/${c.slug}: a pool character without a row`)

const series = []
for (const [slug, [value, src]] of Object.entries(SERIES)) {
  if (src.kind === 'p31') {
    const qid = SERIES_QIDS[slug]
    if (!claims(ents[qid], 'P31').some((x) => x.label === src.label)) fails.push(`series ${slug}: Wikidata P31 does not say ${src.label}`)
    series.push({ slug, qid, demographic: { value, ...wikidataSource(qid), evidence: `P31: ${src.label}` } })
  } else {
    const s = await checkWp(`series ${slug}`, src)
    if (s) series.push({ slug, qid: SERIES_QIDS[slug], demographic: { value, ...s } })
  }
}
if (Object.keys(SERIES).length !== 50) fails.push(`series: ${Object.keys(SERIES).length}, not 50`)
if (fails.length) { console.error(fails.join('\n')); console.error(`\n${fails.length} failures`); process.exit(1) }
const file = join(HERE, 'data/a1-facts.json')
// fetched_at stays the same run to run: the first day the values were read.
if (existsSync(file)) {
  const old = JSON.parse(readFileSync(file, 'utf8')).read_at
  const fix = (o) => { if (o && o.fetched_at) o.fetched_at = old; return o }
  for (const c of characters) for (const v of Object.values(c.values)) fix(v)
  for (const s of series) fix(s.demographic)
}
const read_at = characters[0].values.gender.fetched_at
writeFileSync(file, `${JSON.stringify({ lot: 'A1', read_at, characters, series }, null, 1)}\n`)
console.log(`ok: ${characters.length} characters, ${series.length} series, ${characters.filter((c) => ['gender', 'species', 'role_at_debut'].every((f) => c.values[f])).length} with the 3 facts`)
