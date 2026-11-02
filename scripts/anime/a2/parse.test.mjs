// parse.test.mjs (lot A2): the pure readers of onepiece.mjs, dragonball.mjs and fandomparse.mjs on small strings. No network.
import test from 'node:test'
import assert from 'node:assert/strict'
import { arcsNamed, baseFruitTypes, parseBountyBox, parseFirst, pickHeight, parseHeights, seaFromText, fruitTypeOf } from './onepiece.mjs'
import { firstRange, pickHeightDb, raceFromInfobox, seriesFromAppears } from './dragonball.mjs'
import { parseAffiliations, splitEntries } from './fandomparse.mjs'

test('seaFromText: seas, New World before Grand Line, Calm Belt unknown', () => {
  assert.equal(seaFromText('East Blue (Foosha Village)'), 'East Blue')
  assert.equal(seaFromText('Grand Line (Mokomo Dukedom, New World)'), 'New World')
  assert.equal(seaFromText('Paradise Residents'), 'Grand Line')
  assert.equal(seaFromText('Calm Belt (Amazon Lily)'), 'unknown')
  assert.equal(seaFromText(''), null)
})

test('parseFirst: chapter and episode of a debut box', () => {
  assert.deepEqual(parseFirst('[[Chapter 8]];{{Qref|chap=8|x}} [[Episode 2]]'), { chapter: 8, episode: 2 })
  assert.deepEqual(parseFirst('[[Episode 54]]'), { chapter: null, episode: 54 })
})

test('parseBountyBox: newest amount, struck or in parentheses, nested Qref, at least', () => {
  assert.equal(parseBountyBox('{{B}}3,000,000,000{{Qref|chap=1053|x}}<br>{{B}}<s>1,500,000,000</s>', 1125).berries, 3_000_000_000)
  assert.equal(parseBountyBox('<s>{{B}}550,000,000</s>{{Qref|a=1|y {{B|s}}100,000,000.}}', 1125).berries, 550_000_000)
  assert.equal(parseBountyBox('({{B|s}}3,000,000,000){{Qref|chap=1087}}', 1125).berries, 3_000_000_000)
  assert.equal(parseBountyBox('{{B}}Unknown', 1125), null)
  assert.equal(parseBountyBox('{{B}}5,000{{Qref|chap=1200|x}}', 1125), null)
})

test('pickHeight: post-timeskip, then the oldest age, then the last grown-up one', () => {
  assert.equal(pickHeight(parseHeights('91 cm (3\') (debut, child)<br>172 cm (5\'8") (pre-timeskip)<br>174 cm (5\'9") (post-timeskip)')), 174)
  assert.equal(pickHeight(parseHeights('185 cm (6\'1") (age 20); 103 cm (3\'5") (age 10)'.replace('; ', '<br>'))), 185)
  assert.equal(pickHeight([]), null)
})

test('fruit types: base word, latest reveal up to the cutoff', () => {
  assert.deepEqual(baseFruitTypes('Mythical Zoan'), ['Zoan'])
  assert.deepEqual(fruitTypeOf('[[Paramecia]]{{Qref|chap=1}}\n----[[Zoan|Mythical Zoan]]{{Qref|chap=1044}}', 1125), ['Zoan'])
  assert.deepEqual(fruitTypeOf('[[Paramecia]]{{Qref|chap=1}}\n----[[Zoan|Mythical Zoan]]{{Qref|chap=1200}}', 1125), ['Paramecia'])
})

test('affiliations: split outside parentheses, former and temporary are past, the longer name wins', () => {
  assert.deepEqual(splitEntries('Marines (Headquarters; SWORD) (formerly 153rd Branch); Alvida Pirates (defected)'), ['Marines (Headquarters; SWORD) (formerly 153rd Branch)', 'Alvida Pirates (defected)'])
  const a = parseAffiliations('[[Kuja]] ([[Kuja Pirates]])<br>[[Seven Warlords of the Sea]] (former)<br>[[Baratie]] (temporary)')
  assert.deepEqual(a.map((x) => [x.name, x.current]), [['Kuja Pirates', true], ['Seven Warlords of the Sea', false], ['Baratie', false]])
})

test('arcsNamed: Fandom arc names reach the arcs of the site data, spelling variants too', () => {
  const arcs = [{ ord: 9, name: 'Whiskey Peak' }, { ord: 10, name: 'Little Garden' }, { ord: 42, name: 'Land of Wano, Act One' }, { ord: 43, name: 'Land of Wano, Act Two' }, { ord: 31, name: 'Marineford / Paramount War' }]
  assert.deepEqual(arcsNamed('Whisky Peak Arc', arcs).map((a) => a.ord), [9])
  assert.deepEqual(arcsNamed('Little Garden Arc', arcs).map((a) => a.ord), [10])
  assert.deepEqual(arcsNamed('Wano Country Arc', arcs).map((a) => a.ord), [42, 43])
  assert.deepEqual(arcsNamed('Marineford Arc', arcs).map((a) => a.ord), [31])
})

test('dragon ball readers: race priority on the first line, height, series, ranges', () => {
  assert.equal(raceFromInfobox("[[Demon Clan|Demonic]] [[Namekian]]"), 'Namekian')
  assert.equal(raceFromInfobox('[[Saiyan]]<br>[[Ginyu\'s race]] {{Small|(temporarily)}}'), 'Saiyan')
  assert.equal(raceFromInfobox("[[Frieza Clan]] (mutant)"), 'Frieza Race')
  assert.equal(pickHeightDb('175 cm (5\'9") "adult"<br>110 cm "child"'), 175)
  assert.equal(seriesFromAppears('{{DB Series|DBZ|DBS|SDBH}}'), 'Z')
  assert.deepEqual(firstRange("'''Uncut''' 36-67<br>'''Edited''' 27-53"), [36, 67])
})

test('all-series readers: gender, species, first appearance, voice names, role, demographic', async () => {
  const m = await import('./allseries.mjs')
  assert.equal(m.genderOf('Female'), 'female')
  assert.equal(m.genderOf('Male (Identifies as a man)'), 'male')
  assert.equal(m.genderOf('unknown'), null)
  assert.equal(m.speciesOf('Human (Fullbringer - Quincy hybrid)'), 'human')
  assert.equal(m.speciesOf('Human-type Earthling'), 'human')
  assert.equal(m.speciesOf('Soul (Shinigami)'), 'shinigami')
  assert.equal(m.speciesOf('Demons'), 'demon')
  assert.equal(m.speciesOf('!!'), null)
  assert.equal(m.speciesFromCategories(['Demon Slayers', 'Humans']), 'human')
  assert.equal(m.firstLabel(m.firstAppearanceOf('Volume 1, chapter 1', 'Episode 4')), 'Chapter 1 / Episode 4')
  assert.equal(m.firstLabel(m.firstAppearanceOf(null, 'Episode 12')), 'Episode 12')
  assert.deepEqual(m.namesOf('Daisuke Gōri (Adult); Chika Sakamoto (Child); Pilot OVA'), ['Daisuke Gōri', 'Chika Sakamoto'])
  assert.equal(m.roleFromText('Main characters > Antagonists'), 'antagonist')
  assert.equal(m.roleFromText('Protagonists'), 'main')
  assert.equal(m.demographicOf('Weekly Shōnen Jump'), 'shonen')
  assert.equal(m.demographicOf('Young Jump'), 'seinen')
  assert.equal(m.demographicOf('Nakayoshi'), 'shojo')
  assert.equal(m.SERIES.length, 50)
  assert.equal(m.SERIES.reduce((n, s) => n + s.pool, 0), 752)
})
