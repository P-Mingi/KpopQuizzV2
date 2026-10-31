// http.mjs (lot A1): polite cached GET for Wikipedia and Wikidata. No secret, no personal name or e-mail in any request.
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

export const USER_AGENT = 'KpopQuizDataLot/1.0 (+https://kpopquiz.org/contact)'
const ALLOWED = new Set(['en.wikipedia.org', 'www.wikidata.org', 'query.wikidata.org'])
const GAP_MS = 400
let last = 0

export function cacheDir() {
  const dir = process.env.A1_CACHE
  if (!dir) throw new Error('set A1_CACHE to a scratch folder (caches never go in the repository)')
  mkdirSync(dir, { recursive: true })
  return dir
}

export async function getJson(url) {
  const host = new URL(url).host
  if (!ALLOWED.has(host)) throw new Error(`host not allowed for lot A1: ${host}`)
  const file = join(cacheDir(), `${createHash('sha1').update(url).digest('hex')}.json`)
  if (existsSync(file)) return JSON.parse(readFileSync(file, 'utf8')).body
  for (let attempt = 0; attempt < 5; attempt++) {
    const wait = last + GAP_MS - Date.now()
    if (wait > 0) await new Promise((r) => setTimeout(r, wait))
    last = Date.now()
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' } })
    if (res.status === 429 || res.status >= 500) {
      await new Promise((r) => setTimeout(r, 5000 * (attempt + 1)))
      continue
    }
    if (!res.ok) throw new Error(`${res.status} on ${url}`)
    const body = await res.json()
    writeFileSync(file, JSON.stringify({ url, fetched_at: new Date().toISOString(), body }))
    return body
  }
  throw new Error(`gave up on ${url}`)
}

const WP = 'https://en.wikipedia.org/w/api.php?format=json&formatversion=2&'
const WD = 'https://www.wikidata.org/w/api.php?format=json&'

// The wikitext of a page and the revision it comes from (source_ref of the entity_sources rows).
export async function wikitext(title) {
  const body = await getJson(`${WP}action=query&prop=revisions%7Cpageprops&rvprop=ids%7Ccontent&rvslots=main&redirects=1&titles=${encodeURIComponent(title)}`)
  const page = body.query?.pages?.[0]
  if (!page || page.missing) return null
  const rev = page.revisions?.[0]
  return {
    title: page.title,
    redirected: (body.query.redirects ?? []).map((r) => ({ from: r.from, to: r.to, fragment: r.tofragment ?? null })),
    revid: String(rev.revid),
    qid: page.pageprops?.wikibase_item ?? null,
    text: rev.slots.main.content,
  }
}

export function wikiUrl(title) {
  return `https://en.wikipedia.org/wiki/${encodeURI(title.replace(/ /g, '_')).replace(/\?/g, '%3F')}`
}

export async function wdEntities(ids) {
  const out = {}
  for (let i = 0; i < ids.length; i += 40) {
    const chunk = ids.slice(i, i + 40)
    const body = await getJson(`${WD}action=wbgetentities&props=claims%7Clabels%7Cdescriptions%7Csitelinks&languages=en&sitefilter=enwiki&ids=${chunk.join('%7C')}`)
    Object.assign(out, body.entities)
  }
  return out
}

export async function wdSearch(name) {
  const body = await getJson(`${WD}action=wbsearchentities&language=en&type=item&limit=10&search=${encodeURIComponent(name)}`)
  return body.search ?? []
}
