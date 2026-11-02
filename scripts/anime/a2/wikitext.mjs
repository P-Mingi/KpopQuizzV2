// wikitext.mjs (lot A2): the small amount of wikitext reading the lot needs. No dependency.
// Templates are read with a brace counter (nested templates and piped links stay in one piece).

export function stripComments(s) {
  return String(s ?? '').replace(/<!--[\s\S]*?-->/g, '')
}

export function stripRefs(s) {
  return String(s ?? '')
    .replace(/<ref\b[^>]*\/>/gi, '')
    .replace(/<ref\b[^>]*>[\s\S]*?<\/ref>/gi, '')
}

// Parse the template that starts at text[i] ("{{"). Returns { name, args: [{ key|null, value }], end } (end is after "}}").
export function parseTemplateAt(text, i) {
  if (!text.startsWith('{{', i)) return null
  let depth = 0
  let link = 0
  let j = i
  let argStart = i + 2
  const parts = []
  for (; j < text.length; j++) {
    if (text.startsWith('{{', j)) { depth++; j++; continue }
    if (text.startsWith('}}', j)) {
      depth--
      if (depth === 0) { parts.push(text.slice(argStart, j)); j += 2; break }
      j++
      continue
    }
    if (depth === 1 && text.startsWith('[[', j)) { link++; j++; continue }
    if (depth === 1 && text.startsWith(']]', j)) { link = Math.max(0, link - 1); j++; continue }
    if (depth === 1 && link === 0 && text[j] === '|') { parts.push(text.slice(argStart, j)); argStart = j + 1 }
  }
  if (depth !== 0) return null
  const name = parts[0].trim()
  const args = parts.slice(1).map((p) => {
    const m = p.match(/^\s*([A-Za-z0-9_ .\-]{1,40}?)\s*=([\s\S]*)$/)
    return m ? { key: m[1].trim().toLowerCase(), value: m[2].trim() } : { key: null, value: p.trim() }
  })
  return { name, args, start: i, end: j }
}

// The text without the templates whose name matches re (nested braces inside them are handled).
export function stripTemplates(text, re) {
  let t = String(text ?? '')
  let from = 0
  for (;;) {
    const i = t.indexOf('{{', from)
    if (i < 0) break
    const tpl = parseTemplateAt(t, i)
    if (tpl && re.test(tpl.name)) { t = t.slice(0, i) + t.slice(tpl.end); from = i } else from = i + 2
  }
  return t
}

// Every template (nested ones too, except inside a match) whose name matches re.
export function findTemplates(text, re) {
  const out = []
  for (let i = 0; i < text.length; i++) {
    if (text.startsWith('{{', i)) {
      const t = parseTemplateAt(text, i)
      if (!t) continue
      if (re.test(t.name)) {
        out.push(t)
        i = t.end - 1
      } else i += 1
    }
  }
  return out
}

export function paramsOf(tpl) {
  const p = {}
  for (const a of tpl.args) if (a.key && !(a.key in p)) p[a.key] = a.value
  return p
}

// Readable text of a wikitext value: no refs, no comments, links by label, a few known templates opened, br as new line.
export function plain(s) {
  let t = stripTemplates(stripRefs(stripComments(s)), /^Qref$/i)
  for (let k = 0; k < 6; k++) {
    const before = t
    t = t.replace(/\{\{\s*(?:Former)\s*\}\}/gi, '(former)')
    t = t.replace(/\{\{\s*B\s*\}\}/g, '\u0e3f')
    t = t.replace(/\{\{\s*(?:small|nowrap)\s*\|([^{}]*)\}\}/gi, '$1')
    t = t.replace(/\{\{\s*(?:nihongo|ruby)\s*\|([^|{}]*)(?:\|[^{}]*)?\}\}/gi, '$1')
    t = t.replace(/\{\{\s*(?:Status)\s*\|[^{}]*\}\}/gi, '')
    t = t.replace(/\{\{\s*W\s*\|([^|{}]*)(?:\|([^{}]*))?\}\}/gi, (m, a, b) => b || a)
    if (t === before) break
  }
  t = t.replace(/\{\{[^{}]*\}\}/g, '')
  t = t.replace(/\[\[(?:File|Image|Category):[^\]]*\]\]/gi, '')
  t = t.replace(/\[\[([^\]|]*)\|([^\]]*)\]\]/g, '$2').replace(/\[\[([^\]]*)\]\]/g, '$1')
  t = t.replace(/\[https?:\/\/\S+\s+([^\]]*)\]/g, '$1').replace(/\[https?:\/\/\S+\]/g, '')
  t = t.replace(/<br\s*\/?\s*>/gi, '\n').replace(/<\/?(?:small|s|u|b|i|sup|sub|span|div|center|nowiki)\b[^>]*>/gi, '')
  t = t.replace(/<[^>]+>/g, '')
  t = t.replace(/'{2,5}/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
  return t.split('\n').map((l) => l.replace(/\s+/g, ' ').trim()).filter(Boolean).join('\n')
}

// [[target|label]] links of a wikitext value (file and category links left out).
export function wikiLinks(s) {
  const out = []
  for (const m of stripRefs(stripComments(s)).matchAll(/\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|([^\]]*))?\]\]/g)) {
    const target = m[1].trim()
    if (/^(file|image|category|template):/i.test(target)) continue
    out.push({ target, label: (m[2] ?? target).trim() })
  }
  return out
}

export function categoriesOf(text) {
  return [...stripComments(text).matchAll(/\[\[Category:([^\]|]+)(?:\|[^\]]*)?\]\]/gi)].map((m) => m[1].trim())
}

// Headings of a page with their text span: [{ level, title, start, end }] (end: next heading of the same or higher level).
export function sectionsOf(text) {
  const heads = [...text.matchAll(/^(={2,6})\s*(.+?)\s*\1\s*$/gm)].map((m) => ({ level: m[1].length, title: m[2], start: m.index, bodyStart: m.index + m[0].length }))
  return heads.map((h, i) => {
    let end = text.length
    for (let k = i + 1; k < heads.length; k++) if (heads[k].level <= h.level) { end = heads[k].start; break }
    return { level: h.level, title: h.title, start: h.start, body: text.slice(h.bodyStart, end) }
  })
}
