// wikipedia.mjs (lot A2): English Wikipedia as a source. Two kinds of evidence for a character:
//   the infobox of its own article (when it has one), and its section in the character list pages ("List of One Piece
//   pirates"...: one heading per character). Only short facts are read from them (pronouns, a term, a name in a template).
import { normText } from './compare.mjs'
import { wpPage, wikipediaUrl } from './sources.mjs'
import { findTemplates, paramsOf, plain, sectionsOf, stripRefs, stripComments } from './wikitext.mjs'

// The sections of some list pages, indexed by every spelling of their heading.
export async function loadLists(titles) {
  const pages = []
  for (const t of titles) {
    const p = await wpPage(t)
    if (!p) continue
    const text = stripComments(p.text)
    const stack = []
    const sections = sectionsOf(text).map((s) => {
      while (stack.length && stack[stack.length - 1].level >= s.level) stack.pop()
      const path = stack.map((x) => plain(x.title)).join(' > ')
      stack.push({ level: s.level, title: s.title })
      const names = new Set()
      names.add(normText(plain(s.title)))
      for (const m of s.title.matchAll(/\{\{\s*(?:visible anchor|anchor|vanchor)\s*\|([^{}]*)\}\}/gi)) for (const n of m[1].split('|')) names.add(normText(n))
      names.add(normText(plain(s.title).replace(/\s*\(.*?\)\s*/g, ' ')))
      names.delete(null)
      return { ...s, path, names, page: p.title, url: `${wikipediaUrl(p.title)}#${encodeURIComponent(plain(s.title).replace(/ /g, '_'))}` }
    })
    pages.push({ title: p.title, url: p.url, sections })
  }
  return pages
}

// The section whose heading is one of the name variants (the longest body wins), cut at 4000 characters.
export function listEvidence(lists, nameVariants) {
  const want = new Set(nameVariants.map(normText).filter(Boolean))
  let best = null
  for (const l of lists) {
    for (const s of l.sections) {
      if (![...s.names].some((n) => want.has(n))) continue
      const body = plain(stripRefs(s.body)).slice(0, 4000)
      if (!best || body.length > best.text.length) best = { text: body, raw: s.body.slice(0, 4000), path: s.path, url: s.url, where: `${l.title}#${plain(s.title)}` }
    }
  }
  return best
}

// The own article of a character (title from the Wikidata sitelink): infobox parameters and the lead text.
export async function articleEvidence(title) {
  if (!title || /^(List of|Lists of)\b/.test(title)) return null
  const p = await wpPage(title)
  if (!p || p.redirected) return null
  const text = stripComments(p.text)
  const box = findTemplates(text, /^Infobox (character|animanga\/character|fictional character|anime character|manga character)/i)[0]
  const body = box ? text.slice(box.end) : text
  const lead = plain(stripRefs(body.split(/\n==[^=]/)[0])).slice(0, 3000)
  return { title: p.title, url: p.url, params: box ? paramsOf(box) : {}, text: lead, rawText: text }
}

// he/she counts in a text: a gender only when the evidence is clear.
export function pronounGender(text) {
  if (!text) return null
  const m = (text.match(/\b(he|him|his|himself)\b/gi) ?? []).length
  const f = (text.match(/\b(she|her|hers|herself)\b/gi) ?? []).length
  if (m + f < 3) return null
  if (m >= 3 * f) return 'male'
  if (f >= 3 * m) return 'female'
  return null
}
