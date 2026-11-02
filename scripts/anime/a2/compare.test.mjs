// compare.test.mjs (lot A2): the normalisers and the status logic of compare.mjs. No network.
import test from 'node:test'
import assert from 'node:assert/strict'
import { BERRIES, CM, GENDER, INT, ORGS, OVERLAP, SET, TEXT, countStatuses, normFruit, normOrg, normText, parseBerries, parseHeightCm, resolveField, renderReport } from './compare.mjs'

const src = (source, value) => ({ source, url: `https://example.org/${source}`, value })

test('normText: case, accents, punctuation', () => {
  assert.equal(normText('  Gum-Gum  Fruit '), 'gum gum fruit')
  assert.equal(normText('Pokémon & Co.'), 'pokemon and co')
  assert.equal(normText(''), null)
  assert.equal(normText(null), null)
})

test('normOrg: aliases of one crew become one string', () => {
  assert.equal(normOrg('Straw Hat Crew'), normOrg('The Straw Hat Pirates'))
  assert.equal(normOrg('Red Hair Pirates'), normOrg('Red-Haired Pirates'))
  assert.equal(normOrg('Marine'), 'marines')
  assert.equal(normOrg('Straw Hat Pirates Members'), 'straw hat pirates')
  assert.notEqual(normOrg('Whitebeard Pirates'), normOrg('Blackbeard Pirates'))
})

test('parseHeightCm: cm, m, feet and inches', () => {
  assert.equal(parseHeightCm('174 cm (5\'9")'), 174)
  assert.equal(parseHeightCm('1.74 m'), 174)
  assert.equal(parseHeightCm('5\'9"'), 175)
  assert.equal(parseHeightCm('5 ft 9 in'), 175)
  assert.equal(parseHeightCm('2,000 cm'), 2000)
  assert.equal(parseHeightCm('unknown'), null)
  assert.equal(parseHeightCm(null), null)
})

test('parseBerries: digits, words, symbol', () => {
  assert.equal(parseBerries('\u0e3f3,000,000,000'), 3_000_000_000)
  assert.equal(parseBerries('3 billion'), 3_000_000_000)
  assert.equal(parseBerries('1.5 billion berries'), 1_500_000_000)
  assert.equal(parseBerries('300 million'), 300_000_000)
  assert.equal(parseBerries('50'), 50)
  assert.equal(parseBerries('no bounty'), null)
})

test('status: two equal sources agree, whatever the spelling', () => {
  const r = resolveField([src('fandom', 'Male'), src('wikidata', 'male')], GENDER)
  assert.equal(r.status, 'agree')
  assert.equal(r.value, 'Male')
  assert.equal(r.sources.length, 2)
})

test('status: one source with a value is single, nulls are recorded but silent', () => {
  const r = resolveField([src('fandom', 'Zoan'), src('wikidata', null), src('wikipedia', undefined)], TEXT)
  assert.equal(r.status, 'single')
  assert.equal(r.value, 'Zoan')
  assert.equal(r.sources.length, 3)
})

test('status: no value at all is none', () => {
  const r = resolveField([src('a', null), src('b', '')], TEXT)
  assert.equal(r.status, 'none')
  assert.equal(r.value, null)
})

test('status: different values are a conflict, the majority group is kept', () => {
  const r = resolveField([src('fandom', 'Paramecia'), src('wikidata', 'Zoan'), src('wikipedia', 'zoan')], TEXT)
  assert.equal(r.status, 'conflict')
  assert.equal(r.value, 'Zoan')
  assert.deepEqual(r.majority, ['wikidata', 'wikipedia'])
})

test('status: a tie keeps the first source', () => {
  const r = resolveField([src('fandom', 'Logia'), src('wikidata', 'Zoan')], TEXT)
  assert.equal(r.status, 'conflict')
  assert.equal(r.value, 'Logia')
  assert.equal(r.majority, null)
})

test('cm and berries: units are normalised before the comparison', () => {
  assert.equal(resolveField([src('fandom', '174 cm (5\'9")'), src('wikidata', 1.74)], { norm: (v) => (typeof v === 'number' && v < 10 ? Math.round(v * 100) : CM.norm(v)), same: CM.same }).status, 'agree')
  assert.equal(resolveField([src('a', '174 cm'), src('b', '175 cm')], CM).status, 'agree')
  assert.equal(resolveField([src('a', '174 cm'), src('b', '178 cm')], CM).status, 'conflict')
  assert.equal(resolveField([src('a', '\u0e3f3,000,000,000'), src('b', '3 billion')], BERRIES).status, 'agree')
  assert.equal(resolveField([src('a', '3,000,000,000'), src('b', '1,500,000,000')], BERRIES).status, 'conflict')
})

test('sets: same members in any order agree, a missing member is a conflict', () => {
  const haki = SET()
  assert.equal(resolveField([src('a', ['Observation', 'Armament']), src('b', ['armament', 'observation'])], haki).status, 'agree')
  assert.equal(resolveField([src('a', ['observation']), src('b', ['observation', 'armament'])], haki).status, 'conflict')
  // an empty list is a value (no haki), null is "no data"
  assert.equal(resolveField([src('a', []), src('b', [])], haki).status, 'agree')
  assert.equal(resolveField([src('a', []), src('b', null)], haki).status, 'single')
})

test('normFruit: model words and order do not matter', () => {
  assert.equal(normFruit('Cat-Cat Fruit Leopard Model'), normFruit('Cat-Cat Fruit, Model: Leopard'))
  assert.equal(normFruit('Elephant-Elephant Fruit, Ancient Zoan Model: Mammoth'), normFruit('Elephant-Elephant Fruit: Model Mammoth'))
  assert.notEqual(normFruit('Flame-Flame Fruit'), normFruit('Gum-Gum Fruit'))
})

test('overlap: lists agree when they share a name, both empty agree, empty against full conflicts', () => {
  const o = OVERLAP()
  assert.equal(resolveField([src('a', ['Paramecia']), src('b', ['Zoan', 'Paramecia'])], o).status, 'agree')
  assert.equal(resolveField([src('a', []), src('b', [])], o).status, 'agree')
  assert.equal(resolveField([src('a', []), src('b', ['Zoan'])], o).status, 'conflict')
})

test('orgs: one shared group is enough', () => {
  assert.equal(resolveField([src('infobox', ['Straw Hat Pirates', 'Four Emperors']), src('categories', ['Straw Hat Pirates'])], ORGS).status, 'agree')
  assert.equal(resolveField([src('infobox', ['Whitebeard Pirates', 'Clan of D.']), src('categories', ['Spade Pirates', 'Clan of D.'])], ORGS).status, 'agree')
  assert.equal(resolveField([src('infobox', ['Marines']), src('categories', ['Revolutionary Army'])], ORGS).status, 'conflict')
})

test('int: strings and numbers meet', () => {
  assert.equal(resolveField([src('a', '7'), src('b', 7)], INT).status, 'agree')
  assert.equal(resolveField([src('a', 7), src('b', 8)], INT).status, 'conflict')
})

test('countStatuses and renderReport: counts, conflicts, added list, no dash characters', () => {
  const chars = [
    { slug: 'a', name: 'A', in_site_data: true, rank: { position: 1, score: 1.5 }, fields: { gender: resolveField([src('x', 'male'), src('y', 'male')], GENDER) } },
    { slug: 'b', name: 'B', in_site_data: false, rank: { position: 2, score: 1.2 }, fields: { gender: resolveField([src('x', 'male'), src('y', 'female')], GENDER) } },
  ]
  assert.deepEqual(countStatuses(chars, ['gender']).gender, { agree: 1, single: 0, conflict: 1, none: 0 })
  const md = renderReport({ title: 'T', headerLines: ['h'], fields: ['gender'], characters: chars, added: [chars[1]], failures: [{ url: 'https://u', error: 'HTTP 500' }] })
  assert.match(md, /Conflicts \(1\)/)
  assert.match(md, /B \(b\) \/ gender/)
  assert.match(md, /\| 2 \| B \| b \| 1\.200 \|/)
  assert.match(md, /https:\/\/u/)
  assert.ok(!new RegExp('[' + String.fromCharCode(0x2013, 0x2014) + ']').test(md))
})
