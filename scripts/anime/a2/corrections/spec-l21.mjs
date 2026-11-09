// Corrections of the data of the two per-series games (audit 06 of 2026-11-08, owner-validated 2026-11-09): spec of L21-l1-series-games-corrections.sql.
// One entry per value. `old` and `new` are DATA values (what scripts/anime/a2/data/one-piece.json and dragon-ball.json hold; the column functions of gen-sql.mjs turn them into the
// {"v", "l"} of the table). `old` is the guard of the SQL (a row that already moved is left alone) and the proof that the data is the one the audit read.
// `src`: where the new value is read. 'stored' = a source already stored in the field supports it (the Fandom box text captured at the snapshot); {own, raw} = the Fandom page of the
// character at the stored snapshot revision, with the box text that says it; {url, ref, raw} = a page read on READ (ref = its revision id).
export const READ = '2026-11-09';
const F = 'https://onepiece.fandom.com/wiki/';
const D = 'https://dragonball.fandom.com/wiki/';

// Pages read on READ (MediaWiki API, revision id of the text read).
export const PAGES = {
  bounty: { url: `${F}Bounty`, ref: '2135525', raw: 'Bounty: the World Government (Marines) issues the bounties; the Cross Guild, Doflamingo and Orochi issue their own rewards, which follow a symbol system (stars, crowns)' },
  kingPiccolo: { url: `${D}King_Piccolo`, ref: '2273193', raw: 'techniques: Explosive Demon Wave (his own); the Evil Containment Wave is used against him' },
  raditz: { url: `${D}Raditz`, ref: '2271907', raw: 'Voice actors, Japanese: Shigeru Chiba; Goku\'s only male biological relative not voiced by Masako Nozawa' },
  zamasu: { url: `${D}Zamasu`, ref: '2257308', raw: 'Voice actors, Japanese: Shin-ichiro Miki' },
  animal: { url: `${D}Animal`, ref: '2273579', raw: 'Animal: the animal-type Earthlings, the two most recurring are Puar and Oolong, others include Korin (a cat deity)' },
};
const read = (p, extra = {}) => ({ ...PAGES[p], read: READ, ...extra });

export const OP = 'otakudle-one-piece';
export const DB = 'otakudle-dragon-ball';
const nb = 'no bounty';
const bountyWhy = 'D-1 (owner: World Government bounties only): the amount is a Cross Guild rank reward, not a bounty';
const birdcage = 'D-1: the amount is Doflamingo\'s reward in his Birdcage game, not a World Government bounty';

// kind 'attr' = a column of attrs, 'hint' = a key of hints.
export const L21 = [
  // ---- One Piece: bounty (audit OP1 to OP9, OP16)
  { id: 'OP1', game: OP, slug: 'monkey-d-garp', kind: 'attr', col: 'bounty', old: 3000000000, new: nb, src: read('bounty'), why: bountyWhy },
  { id: 'OP2', game: OP, slug: 'borsalino', kind: 'attr', col: 'bounty', old: 3000000000, new: nb, src: read('bounty'), why: bountyWhy },
  { id: 'OP3', game: OP, slug: 'issho', kind: 'attr', col: 'bounty', old: 3000000000, new: nb, src: read('bounty'), why: bountyWhy },
  { id: 'OP4', game: OP, slug: 'aramaki', kind: 'attr', col: 'bounty', old: 3000000000, new: nb, src: read('bounty'), why: bountyWhy },
  { id: 'OP5', game: OP, slug: 'koby', kind: 'attr', col: 'bounty', old: 500000000, new: nb, src: read('bounty'), why: bountyWhy },
  { id: 'OP6', game: OP, slug: 'kin-emon', kind: 'attr', col: 'bounty', old: 100000000, new: nb, src: read('bounty'), why: birdcage },
  { id: 'OP7', game: OP, slug: 'rebecca', kind: 'attr', col: 'bounty', old: 100000000, new: nb, src: read('bounty'), why: birdcage },
  { id: 'OP8', game: OP, slug: 'viola', kind: 'attr', col: 'bounty', old: 100000000, new: nb, src: read('bounty'), why: birdcage },
  { id: 'OP9', game: OP, slug: 'kyros', kind: 'attr', col: 'bounty', old: 200000000, new: null, src: read('bounty'), why: 'the box says Unknown (as Thunder Soldier) and his poster showed no amount; 200,000,000 was Doflamingo\'s Birdcage reward. Not an answer any more (a column has no value)' },
  { id: 'OP16', game: OP, slug: 'jesus-burgess', kind: 'attr', col: 'bounty', old: 20000000, new: null, src: 'stored', why: 'the box says "At least 20,000,000", a lower bound and not a value (audit OP16, recommended: null). Not an answer any more (a column has no value)' },
  // ---- One Piece: sea of origin (OP11 to OP15, OP18; D-6, D-7: "Grand Line" covers the New World, "Calm Belt" is a sea)
  ...[['charlotte-linlin', 'OP11'], ['kin-emon', 'OP12'], ['kyros', 'OP13'], ['kozuki-hiyori', 'OP14'], ['kozuki-oden', 'OP15a'], ['carrot', 'OP15b'], ['charlotte-pudding', 'OP15c']]
    .map(([slug, id]) => ({ id, game: OP, slug, kind: 'attr', col: 'sea_of_origin', old: 'New World', new: 'Grand Line', src: 'stored', why: 'D-7: the Fandom box says "Grand Line" (with the place in parentheses); one vocabulary for the same sea' })),
  { id: 'OP18', game: OP, slug: 'boa-hancock', kind: 'attr', col: 'sea_of_origin', old: 'unknown', new: 'Calm Belt', src: { own: true, raw: 'Calm Belt (Amazon Lily)' }, why: 'D-6: the Calm Belt is a sea, so the box value counts (Hancock becomes an answer)' },
  // ---- One Piece: Devil Fruit hints (OP10, OP17)
  { id: 'OP10', game: OP, slug: 'kin-emon', kind: 'hint', col: 'devil_fruit_name', old: 'Garb-Garb Jutsu', new: 'Garb-Garb Fruit', src: 'stored', why: 'the box lists "Garb-Garb Fruit" (Fuku Fuku no Mi); "Jutsu" is a VIZ and Funimation rendering of a technique, not of the fruit' },
  { id: 'OP17', game: OP, slug: 'monkey-d-luffy', kind: 'hint', col: 'devil_fruit_name', old: 'Gum-Gum Fruit', new: 'Human-Human Fruit, Model: Nika', src: { own: true, raw: 'Gum-Gum Fruit; (Human-Human Fruit, Model: Nika)' }, why: 'D-3 (as of the reference point): the type is Zoan, so the name is the awakened fruit (the pair was inconsistent)' },
  // ---- Dragon Ball: race (DB1, DB3, DB4, DB10)
  { id: 'DB1', game: DB, slug: 'cell', kind: 'attr', col: 'race', old: 'Saiyan', new: 'Android', src: { own: true, raw: 'Bio-Android (contains Saiyan, Namekian, Frieza Clan, Earthling and several other life-forms\' cells)' }, why: 'the race is the first one named by the box; the cells he contains are not his race (category Androids)' },
  { id: 'DB3', game: DB, slug: 'emperor-pilaf', kind: 'attr', col: 'race', old: 'Human', new: 'Monster', src: { own: true, raw: 'Monster-Type Earthling' }, why: 'the box gives the Earthling type: Monster' },
  { id: 'DB4', game: DB, slug: 'dr-gero', kind: 'attr', col: 'race', old: 'Human', new: 'Android', src: { own: true, raw: 'Human-type Earthling (former); Mechanical Type Android' }, why: 'first met as Android 20 (the "former" line is skipped); category Androids' },
  { id: 'DB10a', game: DB, slug: 'oolong', kind: 'attr', col: 'race', old: 'Human', new: 'Animal', src: { own: true, raw: 'Animal-type Earthling (Pig)' }, why: 'DB10: one word for the three animal-type Earthlings' },
  { id: 'DB10b', game: DB, slug: 'puar', kind: 'attr', col: 'race', old: 'Human', new: 'Animal', src: { own: true, raw: 'Animal Type Earthling (Puar (species)' }, why: 'DB10: one word for the three animal-type Earthlings' },
  { id: 'DB10c', game: DB, slug: 'korin', kind: 'attr', col: 'race', old: 'Cat', new: 'Animal', src: read('animal'), why: 'DB10: one word for the three animal-type Earthlings (the Fandom page Animal names Korin among them)' },
  // ---- Dragon Ball: signature technique and Japanese voice actor hints (DB5, DB8, DB9)
  { id: 'DB5', game: DB, slug: 'king-piccolo', kind: 'hint', col: 'signature_technique', old: 'Evil Containment Wave', new: 'Explosive Demon Wave', src: read('kingPiccolo'), why: 'the Evil Containment Wave is used against him; the Explosive Demon Wave is his' },
  { id: 'DB8', game: DB, slug: 'raditz', kind: 'hint', col: 'voice_actor_ja', old: 'Masako Nozawa', new: 'Shigeru Chiba', src: read('raditz'), why: 'the Fandom list gave two names and the first was kept', shared: 'OT-H4' },
  { id: 'DB9', game: DB, slug: 'zamasu', kind: 'hint', col: 'voice_actor_ja', old: 'Masako Nozawa', new: 'Shin-ichiro Miki', src: read('zamasu'), why: 'Masako Nozawa voices Goku Black; Zamasu is Shin-ichiro Miki', shared: 'OT-H4b' },
  // ---- Dragon Ball: affiliation (DB6, DB7): only the groups of the manga and the TV anime. Each removed group is marked game-only or one-off in the Fandom box
  // (Dragon Ball Xenoverse, Heroes, The Breakers, baseball tournament, "after being revived") and is left out. A kept group stays backed by the stored box.
  ...[
    ['raditz', ['Frieza Force', 'Dragon Team'], ['Frieza Force'], 'Dragon Team: game-only for a villain'],
    ['nappa', ['Frieza Force', "King Vegeta's Warriors", 'Team Beerus', 'Dragon Team'], ['Frieza Force', "King Vegeta's Warriors"], 'Team Beerus, Dragon Team (after being revived): game-only'],
    ['bardock', ['Frieza Force', 'Saiyan Army', 'Dark Empire', 'Time Patrol', 'Team Beerus', 'Resistance faction'], ['Frieza Force', 'Saiyan Army'], 'Dark Empire, Time Patrol, Team Beerus, Resistance faction: game-only'],
    ['vegeta', ['Dragon Team', 'Vegeta Sky Pirates', 'Team Universe 7', 'Team Universe 6', 'Galactic Patrol'], ['Dragon Team', 'Team Universe 7', 'Galactic Patrol'], 'Vegeta Sky Pirates: game-only; Team Universe 6: baseball only'],
    ['goten', ['Dragon Team', 'MIR', 'Kikoukenjutsu Sword School', 'Team Universe 6'], ['Dragon Team', 'MIR', 'Kikoukenjutsu Sword School'], 'Team Universe 6: baseball only'],
    ['dabura', ['Organization of Babidi', 'Dark Empire', 'Team 6', 'Berserkers', 'Dragon Team'], ['Organization of Babidi', 'Team 6'], 'Dark Empire, Berserkers: game-only; Dragon Team: after being revived'],
    ['dende', ['Dragon Clan', 'Dragon Team', 'Dark Empire'], ['Dragon Clan', 'Dragon Team'], 'Dark Empire (brainwashed slave): game-only'],
    ['uub', ['Dragon Team', 'Frieza Force'], ['Dragon Team'], 'Frieza Force (Frieza\'s Elite): game-only'],
    ['dr-gero', ['Red Ribbon Army', 'Pilaf Gang', 'Dr. Gero Sky Pirates'], ['Red Ribbon Army', 'Pilaf Gang'], 'Dr. Gero Sky Pirates: game-only'],
    ['emperor-pilaf', ['Pilaf Gang', 'Mifan Army', 'Pilaf-Buggy Evil Alliance', 'Dragon Team', 'Capsule  Corporation'], ['Pilaf Gang', 'Mifan Army', 'Dragon Team', 'Capsule Corporation'], 'Pilaf-Buggy Evil Alliance: game-only; "Capsule  Corporation" had two spaces (DB6)'],
    ['king-kai', ['Dragon Team', 'Time Patrol', 'Dragon Ball: The Breakers'], ['Dragon Team'], 'Time Patrol, Dragon Ball: The Breakers: game-only'],
    ['baby', ['Tuffle Parasites', 'Kings of Destruction', 'Berserkers'], ['Tuffle Parasites'], 'Kings of Destruction, Berserkers: game-only'],
    ['syn-shenron', ['Shadow Dragon', "Mastermind's group"], ['Shadow Dragon'], "Mastermind's group: game-only"],
  ].map(([slug, old, nw, why]) => ({ id: `DB7-${slug}`, game: DB, slug, kind: 'attr', col: 'affiliation', old, new: nw, src: 'stored', why })),
];

// Decisions the audit leaves open or that the source contradicts: not applied, listed in the SQL as commented, guarded blocks (see gen.mjs).
export const ASK_L21 = [
  { id: 'D-4', text: 'Sanji Conqueror\'s Haki (chapter 1196): no allowed source yet (Fandom has not listed it). Add "conqueror" to haki when Fandom lists it.',
    sql: `-- update public.character_game_facts f set attrs = jsonb_set(f.attrs, '{haki,v}', '["observation","armament","conqueror"]'::jsonb) from public.characters c join public.groups g on g.id = c.group_id and g.site_id = 'anime' and g.slug = 'one-piece' where f.character_id = c.id and c.slug = 'sanji' and f.game_id = 'otakudle-one-piece' and f.attrs #> '{haki,v}' = '["observation","armament"]'::jsonb;` },
  { id: 'DB2', text: 'King Kai home planet: the audit says "King Kai\'s Planet" (the Fandom box Address) but the stored rule is the planet of birth and the Fandom page says he "was born on Kaishin" (Kaishin is a real planet, the home planet of the Glind, Fandom page Kaishin revision 2183353). Recommendation: keep Kaishin.',
    sql: `-- update public.character_game_facts f set attrs = jsonb_set(f.attrs, '{home_planet}', '{"v":"King Kai''s Planet"}'::jsonb) from public.characters c join public.groups g on g.id = c.group_id and g.site_id = 'anime' and g.slug = 'dragon-ball' where f.character_id = c.id and c.slug = 'king-kai' and f.game_id = 'otakudle-dragon-ball' and f.attrs -> 'home_planet' = '{"v":"Kaishin"}'::jsonb;` },
  { id: 'D-DB2', text: 'Debut saga when manga and anime differ (Tien Shinhan, Chiaotzu, Master Shen, Piccolo): the audit proposes "anime saga" but is not firm. Needs a rule from the owner before any value moves.',
    sql: '-- (no statement until the owner picks the rule)' },
  { id: 'D-DB4', text: 'Goku Black home_planet Earth with universe 10: body (Earth, U7) or mind (U10)? No recommendation in the audit.', sql: '-- (no statement until the owner decides)' },
  { id: 'OP19', text: 'Kouzuki Family spelling: it lives in attrs.affiliation of One Piece, which L17 (rule A) owns. Not touched here.', sql: '-- (L17 owns attrs.affiliation of One Piece)' },
];
