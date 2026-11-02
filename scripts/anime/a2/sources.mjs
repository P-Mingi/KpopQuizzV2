// sources.mjs (lot A2): the clients of the public sources. Read only, through http.mjs (cached, polite).
//   Wikidata  (www.wikidata.org API, query.wikidata.org SPARQL)
//   Wikipedia (en.wikipedia.org API: wikitext of pages)
//   Fandom    (onepiece.fandom.com and dragonball.fandom.com, MediaWiki API: wikitext, revisions, categories, page size)
import { getJson, tryJson } from './http.mjs'
import { findTemplates, paramsOf, categoriesOf, plain } from './wikitext.mjs'

const qs = (o) => Object.entries(o).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&')
const slugTitle = (t) => encodeURIComponent(String(t).replace(/ /g, '_')).replace(/%3A/gi, ':').replace(/%2F/gi, '/').replace(/%28/g, '(').replace(/%29/g, ')').replace(/%2C/g, ',').replace(/%27/g, "'")

// wiki = the sub-domain name of <wiki>.fandom.com
export const FANDOM = new Proxy({}, { get: (_, wiki) => `https://${String(wiki)}.fandom.com` })
export const fandomUrl = (wiki, title) => `${FANDOM[wiki]}/wiki/${slugTitle(title)}`
export const wikipediaUrl = (title) => `https://en.wikipedia.org/wiki/${slugTitle(title)}`
export const wikidataUrl = (qid) => `https://www.wikidata.org/wiki/${qid}`

// ---------------------------------------------------------------- Wikidata
export async function wdSparql(query) {
  const body = await getJson(`https://query.wikidata.org/sparql?${qs({ format: 'json', query })}`)
  return body.results.bindings
}

export async function wdEntities(ids) {
  const out = {}
  for (let i = 0; i < ids.length; i += 40) {
    const chunk = ids.slice(i, i + 40)
    const body = await tryJson(`https://www.wikidata.org/w/api.php?${qs({ action: 'wbgetentities', format: 'json', props: 'claims|labels|sitelinks', languages: 'en', sitefilter: 'enwiki', ids: chunk.join('|') })}`)
    if (body?.entities) Object.assign(out, body.entities)
  }
  return out
}

export function wdClaim(entity, pid) {
  return (entity?.claims?.[pid] ?? []).filter((c) => c.rank !== 'deprecated').map((c) => c.mainsnak?.datavalue?.value).filter((v) => v !== undefined)
}

// ---------------------------------------------------------------- Wikipedia
export async function wpPage(title) {
  const body = await tryJson(`https://en.wikipedia.org/w/api.php?${qs({ action: 'query', prop: 'revisions', rvprop: 'ids|content', rvslots: 'main', redirects: 1, titles: title, format: 'json', formatversion: 2 })}`)
  const p = body?.query?.pages?.[0]
  if (!p || p.missing || !p.revisions?.[0]) return null
  const redirected = (body.query.redirects ?? []).length > 0
  return { title: p.title, revid: String(p.revisions[0].revid), text: p.revisions[0].slots.main.content, url: wikipediaUrl(p.title), redirected }
}

// ---------------------------------------------------------------- Fandom
const fapi = (wiki, params) => `${FANDOM[wiki]}/api.php?${qs({ format: 'json', formatversion: 2, ...params })}`

// The wikitext of a page, now (ts null) or as it was at ts (ISO time): the revision just before ts. Redirects followed.
export async function fandomPage(wiki, title, ts = null) {
  const params = { action: 'query', prop: 'revisions', rvprop: 'ids|timestamp|content', rvslots: 'main', redirects: 1, titles: title }
  if (ts) Object.assign(params, { rvlimit: 1, rvdir: 'older', rvstart: ts })
  const body = await tryJson(fapi(wiki, params))
  const p = body?.query?.pages?.[0]
  if (!p || p.missing || !p.revisions?.[0]) return null
  const r = p.revisions[0]
  return { wiki, title: p.title, revid: String(r.revid), timestamp: r.timestamp, text: r.slots.main.content, url: fandomUrl(wiki, p.title), snapshot: ts }
}

export async function fandomFirstRevision(wiki, title) {
  const body = await tryJson(fapi(wiki, { action: 'query', prop: 'revisions', rvprop: 'timestamp', rvdir: 'newer', rvlimit: 1, titles: title }))
  return body?.query?.pages?.[0]?.revisions?.[0]?.timestamp ?? null
}

// Page size (bytes of wikitext) of up to 50 titles per request; also the canonical title after redirects.
export async function fandomLengths(wiki, titles) {
  const out = new Map()
  for (let i = 0; i < titles.length; i += 50) {
    const chunk = titles.slice(i, i + 50)
    const body = await tryJson(fapi(wiki, { action: 'query', prop: 'info', redirects: 1, titles: chunk.join('|') }))
    const q = body?.query
    if (!q) continue
    const norm = new Map((q.normalized ?? []).map((n) => [n.from, n.to]))
    const redir = new Map((q.redirects ?? []).map((n) => [n.from, n.to]))
    const byTitle = new Map((q.pages ?? []).filter((p) => !p.missing).map((p) => [p.title, p]))
    for (const t of chunk) {
      let c = norm.get(t) ?? t
      c = redir.get(c) ?? c
      const p = byTitle.get(c)
      if (p) out.set(t, { title: p.title, length: p.length })
    }
  }
  return out
}

// Pages (main namespace) of a category with their size, 500 per request.
export async function fandomCategory(wiki, category) {
  const out = []
  let cont = null
  for (let n = 0; n < 40; n++) {
    const params = { action: 'query', generator: 'categorymembers', gcmtitle: `Category:${category}`, gcmnamespace: 0, gcmlimit: 500, prop: 'info' }
    if (cont) params.gcmcontinue = cont
    const body = await tryJson(fapi(wiki, params))
    if (!body?.query?.pages) break
    for (const p of body.query.pages) out.push({ title: p.title, length: p.length })
    cont = body.continue?.gcmcontinue
    if (!cont) break
  }
  return out
}

// Redirect titles that point to each page (the aliases a link in another page may use), up to 50 pages per request.
export async function fandomAliases(wiki, titles) {
  const out = new Map()
  for (let i = 0; i < titles.length; i += 50) {
    const chunk = titles.slice(i, i + 50)
    const body = await tryJson(fapi(wiki, { action: 'query', prop: 'redirects', rdlimit: 500, rdnamespace: 0, titles: chunk.join('|') }))
    for (const p of body?.query?.pages ?? []) out.set(p.title, (p.redirects ?? []).map((r) => r.title))
  }
  return out
}

// The infobox parameters of a Fandom character page. A page without the infobox in its own text may take it from a
// transcluded "<name> Tabs Top" template (One Piece): that template is read at the same snapshot time.
export async function fandomInfobox(wiki, page, nameRe, ts) {
  let hit = findTemplates(page.text, nameRe)[0]
  let from = page
  if (!hit) {
    const tab = page.text.match(/\{\{\s*([^{}|]+? Tabs Top)\s*(?:\||\}\})/)
    if (tab) {
      const t = await fandomPage(wiki, `Template:${tab[1]}`, ts)
      if (t) {
        hit = findTemplates(t.text, nameRe)[0]
        from = t
      }
    }
  }
  return hit ? { params: paramsOf(hit), from } : null
}

export { categoriesOf }

// The first revision of a page that is at least minBytes long (the day a chapter page got its summary).
export async function fandomFirstRevisionOver(wiki, title, minBytes) {
  const body = await tryJson(fapi(wiki, { action: 'query', prop: 'revisions', rvprop: 'timestamp|size', rvdir: 'newer', rvlimit: 100, titles: title }))
  return (body?.query?.pages?.[0]?.revisions ?? []).find((r) => r.size >= minBytes)?.timestamp ?? null
}

// Every main-namespace page that is not a redirect, with its size: [{ title, length }]. 500 per request.
export async function fandomAllPages(wiki) {
  const out = []
  let cont = null
  for (let n = 0; n < 200; n++) {
    const params = { action: 'query', generator: 'allpages', gapnamespace: 0, gapfilterredir: 'nonredirects', gaplimit: 500, prop: 'info' }
    if (cont) params.gapcontinue = cont
    const body = await tryJson(fapi(wiki, params))
    if (!body?.query?.pages) break
    for (const p of body.query.pages) out.push({ title: p.title, length: p.length })
    cont = body.continue?.gapcontinue
    if (!cont) break
  }
  return out
}

// Wikidata items whose label matches a name: [{ id, label, description }]
export async function wdSearch(name) {
  const body = await tryJson(`https://www.wikidata.org/w/api.php?${qs({ action: 'wbsearchentities', search: name, language: 'en', type: 'item', limit: 8, format: 'json' })}`)
  return (body?.search ?? []).map((x) => ({ id: x.id, label: x.label ?? '', description: x.description ?? '' }))
}

// Number of sitelinks (all wikis) of each item: Map(qid -> count)
export async function wdSitelinkCounts(ids) {
  const out = new Map()
  for (let i = 0; i < ids.length; i += 50) {
    const chunk = ids.slice(i, i + 50)
    const body = await tryJson(`https://www.wikidata.org/w/api.php?${qs({ action: 'wbgetentities', props: 'sitelinks', ids: chunk.join('|'), format: 'json' })}`)
    for (const [id, e] of Object.entries(body?.entities ?? {})) out.set(id, Object.keys(e.sitelinks ?? {}).length)
  }
  return out
}

// The portable infobox of a Fandom page, from the rendered first section: Map(data-source key (lower case) -> text value).
export async function fandomInfoboxHtml(wiki, title) {
  let body = await tryJson(fapi(wiki, { action: 'parse', page: title, prop: 'text|categories', section: 0, redirects: 1 }))
  const html = body?.parse?.text
  if (!html) return null
  const items = new Map()
  const re = /data-source="([^"]+)"[^>]*>([\s\S]*?)(?=<div class="pi-item|<section class="pi-item|<\/aside>|<h2 class="pi-header)/g
  for (const m of html.matchAll(re)) {
    const val = m[2].match(/<div class="pi-data-value[^"]*"[^>]*>([\s\S]*)/)
    if (!val) continue
    const text = val[1]
      .replace(/<br\s*\/?>/gi, '; ').replace(/<\/li>/gi, '; ').replace(/<sup[\s\S]*?<\/sup>/gi, '').replace(/<[^>]+>/g, ' ')
      .replace(/&#91;|&#93;|&#160;|&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"')
      .replace(/\[\s*(?:\d+|note \d+|[a-z])\s*\]/gi, ' ').replace(/\s+/g, ' ').replace(/(?:;\s*)+$/, '').trim()
    if (text && !items.has(m[1].toLowerCase())) items.set(m[1].toLowerCase(), text)
  }
  return { title: body.parse.title, url: fandomUrl(wiki, body.parse.title), items, categories: (body.parse.categories ?? []).map((c) => String(c.category ?? c).replace(/_/g, ' ')) }
}

// Some wikis (Narutopedia) draw the infobox from a template page "Infobox:<title>": its parameters, Map(key (lower case) -> raw value).
export async function fandomInfoboxPage(wiki, title) {
  const p = await fandomPage(wiki, `Infobox:${title}`)
  if (!p) return null
  const t = findTemplates(p.text, /./)[0]
  if (!t) return null
  const items = new Map()
  for (const [k, v] of Object.entries(paramsOf(t))) {
    const text = plain(v).replace(/\s+/g, ' ').replace(/\n/g, '; ').trim()
    if (text) items.set(k.toLowerCase(), text)
  }
  return { title: p.title, url: p.url, items, categories: [] }
}
