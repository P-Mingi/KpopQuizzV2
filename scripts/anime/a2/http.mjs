// http.mjs (lot A2): polite cached GET for the public sources of the two daily games (read only).
// Hosts: English Wikipedia, Wikidata, the One Piece and Dragon Ball Fandom wikis (MediaWiki API only).
// One request every GAP_MS (about 2.5 per second), a User-Agent that names the project, no secret, no personal data.
// Every response is cached on disk under ~/kpq-o1/a2-cache/ (never in the repository), so a rerun costs nothing.
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

export const USER_AGENT = 'KpopQuizDataLot/2.0 (A2 daily-game facts; read only; +https://kpopquiz.org/contact)'
const ALLOWED = new Set(['en.wikipedia.org', 'www.wikidata.org', 'query.wikidata.org'])
// every Fandom wiki of the series (<name>.fandom.com), MediaWiki API only
const allowedHost = (host) => ALLOWED.has(host) || /^[a-z0-9-]+\.fandom\.com$/.test(host)
const GAP_MS = 400
let last = 0

// Every URL that could not be fetched after the retries: the reports list them ("source unreachable").
export const failures = []

export function cacheDir() {
  const dir = process.env.A2_CACHE || join(homedir(), 'kpq-o1', 'a2-cache')
  mkdirSync(dir, { recursive: true })
  return dir
}

export async function getJson(url) {
  const host = new URL(url).host
  if (!allowedHost(host)) throw new Error(`host not allowed for lot A2: ${host}`)
  const file = join(cacheDir(), `${createHash('sha1').update(url).digest('hex')}.json`)
  if (existsSync(file)) return JSON.parse(readFileSync(file, 'utf8')).body
  let lastError = 'unknown'
  for (let attempt = 0; attempt < 5; attempt++) {
    const wait = last + GAP_MS - Date.now()
    if (wait > 0) await new Promise((r) => setTimeout(r, wait))
    last = Date.now()
    try {
      const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' } })
      if (res.status === 429 || res.status >= 500) {
        lastError = `HTTP ${res.status}`
        await new Promise((r) => setTimeout(r, 5000 * (attempt + 1)))
        continue
      }
      if (!res.ok) {
        lastError = `HTTP ${res.status}`
        break
      }
      const body = await res.json()
      writeFileSync(file, JSON.stringify({ url, fetched_at: new Date().toISOString(), body }))
      return body
    } catch (e) {
      lastError = String(e?.message ?? e)
      await new Promise((r) => setTimeout(r, 3000 * (attempt + 1)))
    }
  }
  failures.push({ url, error: lastError })
  throw new Error(`gave up on ${url}: ${lastError}`)
}

// Same, but a failure gives null (and is recorded in `failures`): the pipeline goes on without that source.
export async function tryJson(url) {
  try {
    return await getJson(url)
  } catch {
    return null
  }
}
