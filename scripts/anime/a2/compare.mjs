// compare.mjs (lot A2, shared by onepiece.mjs and dragonball.mjs): normalise the value every source gives for a field,
// compare them, and give the field a status.
//   agree     two or more sources, all with the same normalised value
//   single    exactly one source gives a value
//   conflict  two or more sources give values that differ after normalisation
//   none      no source gives a value (the field stays empty; "no bounty" is a none, "no Devil Fruit" is a value)
// A source that has nothing to say gives null: it is recorded (with its URL) but it never makes a conflict.
// A conflict keeps the value of the largest group of agreeing sources (the first source in the listed order on a tie);
// the human reads the conflicts of the report, nothing else.

export const STATUSES = ['agree', 'single', 'conflict', 'none']

// ---------------------------------------------------------------- normalisers
export function normText(s) {
  if (s === null || s === undefined) return null
  const t = String(s)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
  return t === '' ? null : t
}

// Names of Devil Fruits: "Cat-Cat Fruit Leopard Model" and "Cat-Cat Fruit, Model: Leopard" are one name.
export function normFruit(s) {
  const t = normText(s)
  if (t === null) return null
  return t.split(' ').filter((w) => !['model', 'ancient', 'mythical', 'zoan', 'azure', 'awakened', 'the'].includes(w)).sort().join(' ') || null
}

// Organisation names: the aliases of the sources for one crew or group become one string.
export function normOrg(s) {
  let t = normText(s)
  if (t === null) return null
  t = t.replace(/^the /, '').replace(/ (members?|crew members?)$/, '')
  t = t.replace(/\bcrew\b/g, 'pirates')
  t = t.replace(/\bred hair pirates\b/, 'red haired pirates')
  t = t.replace(/\bmarine\b/, 'marines').replace(/\bmarines marines\b/, 'marines')
  t = t.replace(/^revolutionaries$/, 'revolutionary army').replace(/^revolutionary$/, 'revolutionary army')
  t = t.replace(/^world government .*$/, 'world government')
  return t.trim() || null
}

export function normGender(s) {
  const t = normText(s)
  if (t === null) return null
  if (/^(male|man|boy|m|he)$/.test(t)) return 'male'
  if (/^(female|woman|girl|f|she)$/.test(t)) return 'female'
  return t
}

// Height in centimetres: "174 cm", "1.74 m", "5'9\"", "5 ft 9 in", "174cm (5'9")". The first measure of the string wins.
export function parseHeightCm(s) {
  if (s === null || s === undefined) return null
  const t = String(s).replace(/,/g, '')
  let m = t.match(/(\d+(?:\.\d+)?)\s*cm\b/i)
  if (m) return Math.round(parseFloat(m[1]))
  m = t.match(/(\d+(?:\.\d+)?)\s*m\b(?!m)/i)
  if (m && parseFloat(m[1]) < 10) return Math.round(parseFloat(m[1]) * 100)
  m = t.match(/(\d+)\s*(?:'|ft\.?|feet|foot)\s*(?:(\d+(?:\.\d+)?)\s*(?:"|''|in\.?|inch(?:es)?)?)?/i)
  if (m) return Math.round((parseInt(m[1], 10) * 12 + (m[2] ? parseFloat(m[2]) : 0)) * 2.54)
  if (typeof s === 'number' && Number.isFinite(s)) return Math.round(s)
  return null
}

// Berries as an integer: "\u0e3f3,000,000,000", "3 billion", "1.5 billion berries", "300 million", "81,000,000".
export function parseBerries(s) {
  if (s === null || s === undefined) return null
  if (typeof s === 'number') return Number.isFinite(s) ? Math.round(s) : null
  const t = String(s).replace(/,/g, '').replace(/\u0e3f/g, '')
  const m = t.match(/(\d+(?:\.\d+)?)\s*(billion|million|thousand|b|m|k)?\b/i)
  if (!m) return null
  const mult = { billion: 1e9, b: 1e9, million: 1e6, m: 1e6, thousand: 1e3, k: 1e3 }[(m[2] ?? '').toLowerCase()] ?? 1
  return Math.round(parseFloat(m[1]) * mult)
}

// ---------------------------------------------------------------- comparison presets
// A preset is { norm(value) -> key | null, same(keyA, keyB) -> bool }. norm gives null for "no value".
const eq = (a, b) => a === b
export const TEXT = { norm: normText, same: eq }
export const ENUM = (map = {}) => ({ norm: (v) => { const t = normText(v); return t === null ? null : (map[t] ?? t) }, same: eq })
export const GENDER = { norm: normGender, same: eq }
export const INT = { norm: (v) => (v === null || v === undefined || v === '' || !Number.isFinite(Number(v)) ? null : Math.round(Number(v))), same: eq }
export const CM = { norm: (v) => (typeof v === 'number' ? Math.round(v) : parseHeightCm(v)), same: (a, b) => Math.abs(a - b) <= 1 }
export const BERRIES = { norm: parseBerries, same: eq }

const keysOf = (arr, f) => [...new Set((arr ?? []).map(f).filter((x) => x !== null && x !== ''))].sort()
// A list of tags (haki types, techniques): the two lists must be the same set.
export const SET = (f = normText) => ({ norm: (v) => (Array.isArray(v) ? keysOf(v, f) : null), same: (a, b) => a.length === b.length && a.every((x, i) => x === b[i]) })
// A list of names: two sources agree when the lists share at least one name (or are both empty). A category or a list page
// names every group or type a character had at any time, a box names the current ones, so only an overlap can be required.
export const OVERLAP = (f = normText) => ({
  norm: (v) => {
    if (!Array.isArray(v)) return null
    const out = []
    for (const x of v) { const k = f(x); if (k !== null && !out.includes(k)) out.push(k) }
    return out
  },
  same: (a, b) => (a.length === 0 && b.length === 0) || a.some((x) => b.includes(x)),
})
export const ORGS = OVERLAP(normOrg)

// ---------------------------------------------------------------- status
// sources: [{ source, url, raw, value }] in the order of trust (first = primary). Returns the field record.
export function resolveField(sources, preset, extra = {}) {
  const items = sources.map((s) => ({ ...s, key: s.value === undefined ? null : preset.norm(s.value) }))
  const withValue = items.filter((s) => s.key !== null)
  const record = (s) => ({ source: s.source, url: s.url ?? null, ...(s.raw !== undefined ? { raw: s.raw } : {}), value: s.value ?? null })
  const out = { value: null, status: 'none', sources: items.map(record), ...extra }
  if (withValue.length === 0) return out
  if (withValue.length === 1) return { ...out, value: withValue[0].value, status: 'single' }
  // Groups of sources that agree with each other (a source joins the first group whose first member it matches).
  const groups = []
  for (const s of withValue) {
    const g = groups.find((grp) => preset.same(grp[0].key, s.key))
    if (g) g.push(s)
    else groups.push([s])
  }
  if (groups.length === 1) return { ...out, value: groups[0][0].value, status: 'agree' }
  const best = groups.reduce((a, b) => (b.length > a.length ? b : a))
  return { ...out, value: best[0].value, status: 'conflict', majority: best.length > 1 ? best.map((s) => s.source) : null }
}

// ---------------------------------------------------------------- report
export function countStatuses(characters, fields) {
  const counts = {}
  for (const f of fields) {
    counts[f] = { agree: 0, single: 0, conflict: 0, none: 0 }
    for (const c of characters) counts[f][c.fields[f]?.status ?? 'none']++
  }
  return counts
}

const show = (v) => (v === null || v === undefined ? '(none)' : typeof v === 'object' ? JSON.stringify(v) : String(v))

export function conflictsOf(characters, fields) {
  const out = []
  for (const c of characters) {
    for (const f of fields) {
      const r = c.fields[f]
      if (r?.status === 'conflict') out.push({ slug: c.slug, name: c.name, field: f, value: r.value, sources: r.sources.filter((s) => s.value !== null && s.value !== undefined), majority: r.majority ?? null })
    }
  }
  return out
}

export function renderReport({ title, headerLines, fields, characters, added, failures, notes = [] }) {
  const counts = countStatuses(characters, fields)
  const conflicts = conflictsOf(characters, fields)
  const L = []
  L.push(`# ${title}`, '')
  for (const h of headerLines) L.push(h)
  L.push('', `Characters: ${characters.length} (in site data: ${characters.filter((c) => c.in_site_data).length}, added: ${characters.filter((c) => !c.in_site_data).length}).`, '')
  L.push('## Counts per field', '', '| field | agree | single | conflict | none | single share |', '|---|---:|---:|---:|---:|---:|')
  for (const f of fields) {
    const k = counts[f]
    const withValue = k.agree + k.single + k.conflict
    L.push(`| ${f} | ${k.agree} | ${k.single} | ${k.conflict} | ${k.none} | ${withValue ? Math.round((100 * k.single) / withValue) : 0}% |`)
  }
  L.push('', '## Source coverage (characters with a value, per field and source)', '', '| field | source | values |', '|---|---|---:|')
  for (const f of fields) {
    const per = new Map()
    for (const ch of characters) for (const s of ch.fields[f]?.sources ?? []) per.set(s.source, (per.get(s.source) ?? 0) + (s.value !== null && s.value !== undefined ? 1 : 0))
    for (const [name, n] of per) L.push(`| ${f} | ${name} | ${n} |`)
  }
  L.push('')
  if (notes.length) { L.push('## Notes on the sources', ''); for (const n of notes) L.push(`- ${n}`); L.push('') }
  L.push(`## Conflicts (${conflicts.length})`, '', 'Value kept = the largest group of agreeing sources (first source on a tie). Each line: character, field, kept value, then every source value with its URL.', '')
  for (const c of conflicts) {
    L.push(`- ${c.name} (${c.slug}) / ${c.field}: kept ${show(c.value)}${c.majority ? ` (majority: ${c.majority.join(', ')})` : ''}`)
    for (const s of c.sources) L.push(`  - ${s.source}: ${show(s.value)}${s.raw !== undefined && String(s.raw) !== String(s.value) ? ` (raw: ${show(s.raw).slice(0, 120)})` : ''} <${s.url ?? 'no url'}>`)
  }
  L.push('', '## Characters added (not in the site data)', '', '| rank | name | slug | score |', '|---:|---|---|---:|')
  for (const c of added) L.push(`| ${c.rank.position} | ${c.name} | ${c.slug} | ${c.rank.score.toFixed(3)} |`)
  L.push('', '## Sources unreachable', '')
  if (failures.length === 0) L.push('None.')
  else for (const f of failures) L.push(`- ${f.url} (${f.error})`)
  L.push('')
  return L.join('\n')
}

// Output files never hold an en dash or an em dash (house rule): source texts that carry one get a plain hyphen.
const DASHES = new RegExp('[' + String.fromCharCode(0x2013, 0x2014) + ']', 'g')
export const noDash = (s) => String(s).replace(DASHES, '-')
