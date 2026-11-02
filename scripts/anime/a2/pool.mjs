// pool.mjs (lot A2): the candidates of a game and their fame rank. Same method for both games.
//
// Fame signal (reproducible, from public numbers only):
//   sitelinks  the number of Wikipedia/Wikimedia language editions that have a page on the character (Wikidata "wikibase:sitelinks");
//              the Wikidata item is the one that carries the Fandom article id (P6262) of the character
//   length     the size in bytes of the character's page on the series' Fandom wiki (MediaWiki "page length", prop=info), plus the
//              size of its subpages ("Name/History", "Name/Personality"...): the pages of the main characters are split in tabs
//   score      percentile rank of sitelinks + percentile rank of length among all candidates (0 to 2, ties at the middle of their run)
// Candidates: the members of the Fandom character categories (the page has to be a character page) joined with the Wikidata
// items by Fandom page title (redirects followed); a character whose item carries no Fandom id is found by a Wikidata name
// search (same label, description naming the franchise).
import { failures } from './http.mjs'
import { normText } from './compare.mjs'
import { fandomAllPages, fandomCategory, fandomLengths, wdSearch, wdSitelinkCounts, wdSparql } from './sources.mjs'

const titleOf = (id, prefix) => decodeURIComponent(id.slice(prefix.length + 1)).replace(/_/g, ' ')

export function percentileRanks(values) {
  const sorted = [...values].sort((a, b) => a - b)
  const first = new Map()
  const count = new Map()
  sorted.forEach((v, i) => { if (!first.has(v)) first.set(v, i); count.set(v, (count.get(v) ?? 0) + 1) })
  return values.map((v) => (first.get(v) + (count.get(v) - 1) / 2) / Math.max(1, sorted.length - 1))
}

export async function buildCandidates({ wiki, prefix, categories, descRe, searchTop = 400, skip = () => false, extra = [] }) {
  // 1. Fandom character pages with their size.
  const byTitle = new Map()
  for (const cat of categories) {
    const members = await fandomCategory(wiki, cat)
    for (const p of members) if (!byTitle.has(p.title)) byTitle.set(p.title, { title: p.title, length: p.length, qid: null, label: null, sitelinks: 0, categories: new Set() })
    for (const p of members) byTitle.get(p.title).categories.add(cat)
  }
  // 1a. Pages the caller needs in the pool whatever the categories say (the characters already in the site data).
  const ex = await fandomLengths(wiki, extra)
  for (const k of ex.values()) if (!byTitle.has(k.title)) byTitle.set(k.title, { title: k.title, length: k.length, qid: null, label: null, sitelinks: 0, categories: new Set(['(added by name)']) })
  // 1b. Size of the subpages ("Root/Tab") added to the page of the root.
  const sub = new Map()
  const subTitles = new Map()
  for (const p of await fandomAllPages(wiki)) {
    const i = p.title.indexOf('/')
    if (i > 0) {
      sub.set(p.title.slice(0, i), (sub.get(p.title.slice(0, i)) ?? 0) + p.length)
      subTitles.set(p.title.slice(0, i), [...(subTitles.get(p.title.slice(0, i)) ?? []), p.title])
    }
  }
  for (const c of byTitle.values()) { c.subpages = sub.get(c.title) ?? 0; c.subTitles = subTitles.get(c.title) ?? []; c.total = c.length + c.subpages }
  // 2. Wikidata items that carry a Fandom article id of this wiki, with their sitelink count.
  const rows = await wdSparql(`SELECT ?c ?cLabel ?sl ?fd WHERE { ?c wdt:P6262 ?fd FILTER(STRSTARTS(?fd, "${prefix}:")) . ?c wikibase:sitelinks ?sl . SERVICE wikibase:label { bd:serviceParam wikibase:language "en". } }`)
  const items = new Map()
  for (const r of rows) {
    const qid = r.c.value.split('/').pop()
    const title = titleOf(r.fd.value, prefix)
    const cur = items.get(title)
    if (!cur || +r.sl.value > cur.sitelinks) items.set(title, { qid, label: r.cLabel.value, sitelinks: +r.sl.value, title })
  }
  // 3. Titles of the items that are not already a category member: canonical title through redirects.
  const loose = [...items.keys()].filter((t) => !byTitle.has(t))
  const canon = await fandomLengths(wiki, loose)
  const join = (title, item) => {
    const c = byTitle.get(title)
    if (c && item.sitelinks >= c.sitelinks) Object.assign(c, { qid: item.qid, label: item.label, sitelinks: item.sitelinks })
  }
  for (const [title, item] of items) {
    if (byTitle.has(title)) join(title, item)
    else {
      const k = canon.get(title)
      if (k && byTitle.has(k.title)) join(k.title, item)
    }
  }
  // 4. Characters whose Wikidata item has no Fandom article id: look the item up by name (label match + a description that
  //    names the franchise), for the searchTop biggest pages. The sitelinks of the item are then counted.
  const list = [...byTitle.values()].filter((c) => !skip(c.title))
  const unmatched = list.filter((c) => !c.qid).sort((a, b) => b.total - a.total).slice(0, searchTop)
  for (const c of unmatched) {
    const base = c.title.replace(/\s*\(.*?\)\s*/g, ' ').trim()
    for (const q of [base, `${base} ${descRe.source.split('|')[0].replace(/\\/g, '')}`]) {
      const hit = (await wdSearch(q)).find((h) => descRe.test(h.description) && normText(h.label) === normText(base))
      if (hit) { c.qid = hit.id; c.label = hit.label; break }
    }
  }
  const counts = await wdSitelinkCounts(unmatched.filter((c) => c.qid).map((c) => c.qid))
  for (const c of unmatched) if (c.qid) c.sitelinks = counts.get(c.qid) ?? 0
  return list.map((c) => ({ ...c, categories: [...c.categories] }))
}

export function scoreCandidates(cands) {
  const ps = percentileRanks(cands.map((c) => c.sitelinks))
  const pl = percentileRanks(cands.map((c) => c.total))
  cands.forEach((c, i) => { c.score = ps[i] + pl[i] })
  cands.sort((a, b) => b.score - a.score || b.sitelinks - a.sitelinks || b.total - a.total || a.title.localeCompare(b.title))
  cands.forEach((c, i) => { c.position = i + 1 })
  return cands
}

export const unreachable = () => failures.map((f) => ({ ...f }))
