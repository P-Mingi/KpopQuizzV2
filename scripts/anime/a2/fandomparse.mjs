// fandomparse.mjs (lot A2): readers of Fandom infobox values shared by both games.
import { plain, stripTemplates, wikiLinks } from './wikitext.mjs'

export const slugify = (name) => String(name).normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

export const dropQref = (s) => stripTemplates(s, /^Qref$/i)
export const rawLines = (s) => dropQref(s).split(/<br\s*\/?\s*>|\n/i).map((l) => l.trim()).filter(Boolean)

// Split on ";", ",", "<br>" and new lines, but not inside parentheses or links.
export function splitEntries(raw) {
  const text = dropQref(raw).replace(/<br\s*\/?\s*>/gi, ';')
  const out = []
  let depth = 0
  let cur = ''
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (ch === '(' || text.startsWith('[[', i)) depth++
    if ((ch === ')' || text.startsWith(']]', i)) && depth > 0) depth--
    if ((ch === ';' || ch === ',' || ch === '\n') && depth === 0) { if (cur.trim()) out.push(cur.trim()); cur = '' } else cur += ch
  }
  if (cur.trim()) out.push(cur.trim())
  return out
}

// Entries of an affiliation box: [{ name, current }]. A qualifier (former, disbanded, temporary...) makes an entry past.
export function parseAffiliations(raw) {
  const out = []
  for (const entry of splitEntries(raw)) {
    const links = wikiLinks(entry)
    let label = links[0]?.label ?? plain(entry).replace(/\s*\(.*$/, '').trim()
    if (!label) continue
    // "Kuja (Kuja Pirates)": the longer name of the same group wins
    const longer = links.slice(1).find((l) => l.label.toLowerCase().startsWith(label.toLowerCase()) && l.label.length > label.length)
    if (longer) label = longer.label
    const qual = [...plain(entry).matchAll(/\(([^)]*)\)/g)].map((m) => m[1]).join(' ')
    out.push({ name: label, target: (longer ?? links[0])?.target ?? null, current: !/\b(former|disbanded|dissolved|defected|destroyed|dismantled|deserted|expelled|temporary|temporarily|ex-)/i.test(qual) })
  }
  return out
}
