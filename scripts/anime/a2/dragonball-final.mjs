// dragonball-final.mjs (lot A2): last step of the Dragon Ball data, after dragonball.mjs, review.mjs and allseries.mjs.
//   - voice_actor_ja (Japanese voice actor, the 5-error hint) of the 70 characters, taken from the all-series collection, goes into dragon-ball.json
//   - REPORT-dragon-ball.md is written again with that column, without height_cm in the counts (owner decision 2026-11-03), and with the table of
//     every alignment_at_debut value that is unknown or single-source (page URL and the supporting sentence, 15 words at most).
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { noDash, renderReport } from './compare.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
// the reviewed result of review-all.mjs (data/all-series.json), else the plain collection
const reviewed = join(HERE, 'data', 'all-series.json')
const cache = join(homedir(), 'kpq-o1', 'a2-cache', 'allseries', 'dragon-ball.json')
if (!existsSync(reviewed) && !existsSync(cache)) throw new Error('run allseries.mjs first')
const all = existsSync(reviewed) ? JSON.parse(readFileSync(reviewed, 'utf8')).series.find((s) => s.slug === 'dragon-ball') : JSON.parse(readFileSync(cache, 'utf8'))
const data = JSON.parse(readFileSync(join(HERE, 'data', 'dragon-ball.json'), 'utf8'))
const byslug = new Map(all.characters.map((c) => [c.slug, c]))
for (const ch of data.characters) {
  const v = byslug.get(ch.slug)
  if (!v) throw new Error(`no voice data for ${ch.slug}`)
  ch.fields.voice_actor_ja = v.fields.voice_actor_ja
}
if (!data.header.columns.includes('voice_actor_ja')) data.header.columns.push('voice_actor_ja')
data.header.counted_columns = data.header.columns.filter((f) => f !== 'height_cm')
data.header.value_notes.voice_actor_ja = 'Japanese voice actor (romanised), the 5-error hint; Fandom infobox, Wikidata P725 (Japanese actors) and the Wikipedia list'
data.header.value_notes.height_cm = 'dropped from the game (owner decision 2026-11-03); kept in the data, not counted'

const words = (s, n = 15) => String(s ?? '').replace(/\s+/g, ' ').trim().split(' ').slice(0, n).join(' ')
const rows = []
for (const ch of data.characters) {
  const f = ch.fields.alignment_at_debut
  if (f.status !== 'none' && f.status !== 'single') continue
  const src = f.sources.find((s) => s.value !== null && s.value !== undefined && s.url && String(s.source).startsWith('review:')) ?? f.sources.find((s) => s.value !== null && s.value !== undefined && s.url)
  rows.push(f.status === 'none'
    ? `| ${ch.name} | unknown | none | ${ch.ids.fandom_url} | no page states it |`
    : `| ${ch.name} | ${f.value} | single | ${src?.url ?? ch.ids.fandom_url} | ${words(src?.raw) || '(wording test passed on the page)'} |`)
}
const table = ['', `## alignment_at_debut: unknown or single-source values (${rows.length})`, '', 'Review list: the value, the page and the sentence that supports it (15 words at most). "unknown" has no page that states it.', '', '| character | value | status | page | supporting sentence |', '|---|---|---|---|---|', ...rows, ''].join('\n')

const header = data.header
let report = renderReport({ title: 'Dragon Ball daily game pool: cross-check report (after the gap review)', headerLines: [...(header.report_lines ?? []), 'voice_actor_ja: Japanese voice actor of the 70 characters (the 5-error hint), added from the all-series collection (Fandom infobox, Wikidata P725, Wikipedia list).'], fields: header.counted_columns, characters: data.characters, added: data.characters.filter((c) => !c.in_site_data), failures: header.failures ?? [], notes: header.notes ?? [] })
report += table
writeFileSync(join(HERE, 'data', 'REPORT-dragon-ball.md'), noDash(report))
writeFileSync(join(HERE, 'data', 'dragon-ball.json'), noDash(JSON.stringify(data, null, 1)) + '\n')
const m = { agree: 0, single: 0, conflict: 0, none: 0 }
for (const c of data.characters) m[c.fields.voice_actor_ja.status]++
console.error('dragon-ball voice_actor_ja', m, 'alignment rows', rows.length)
