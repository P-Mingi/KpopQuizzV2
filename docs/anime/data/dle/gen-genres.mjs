#!/usr/bin/env node
// Lane magazine, round 2 (run O1, owner 2026-11-08): the Genres column of Otakudle.
//
//   node docs/anime/data/dle/gen-genres.mjs [--check]
//
// Writes docs/anime/data/dle/otakudle-genres.json and otakudle-genres-map.md from the table RAW below (the Genre line of the infobox of the original work of each
// of the 50 series, English Wikipedia, read through the API on 2026-11-08 with the revision id) and the closed list and mapping MAP below. Same input, same bytes.
// gen-l18.mjs reads the JSON. No genre is ever added that the infobox does not give; a raw genre with no word in the list is dropped and said so in the note.
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));

/** The closed list: key stored in the database, English word, French word. 15 words (Visual novel dropped on 2026-11-09: no series uses it once Steins;Gate takes the genres of its anime). */
export const LIST = [
  ['action', 'Action', 'Action'],
  ['adventure', 'Adventure', 'Aventure'],
  ['fantasy', 'Fantasy', 'Fantasy'],
  ['dark-fantasy', 'Dark fantasy', 'Dark fantasy'],
  ['supernatural', 'Supernatural', 'Surnaturel'],
  ['martial-arts', 'Martial arts', 'Arts martiaux'],
  ['science-fiction', 'Science fiction', 'Science-fiction'],
  ['comedy', 'Comedy', 'Comédie'],
  ['mystery-thriller', 'Mystery and thriller', 'Mystère et thriller'],
  ['romance', 'Romance', 'Romance'],
  ['drama', 'Drama', 'Drame'],
  ['slice-of-life', 'Slice of life', 'Tranche de vie'],
  ['sports', 'Sports', 'Sport'],
  ['post-apocalyptic', 'Post-apocalyptic', 'Post-apocalyptique'],
  ['historical', 'Historical', 'Historique'],
];
const KEYS = LIST.map((l) => l[0]);

/** Raw genre (the target of the link in the infobox) to its closed words: the first is the primary word, the others only fill a set that has fewer than 3. [] = no word, dropped. */
export const MAP = {
  'Action fiction': ['action'], 'Action (genre)': ['action'], 'Action comedy': ['action', 'comedy'], 'Military fiction': ['action'],
  'Adventure fiction': ['adventure'],
  Fantasy: ['fantasy'], 'Fantasy comedy': ['fantasy', 'comedy'], Isekai: ['fantasy'], 'Magical girl': ['fantasy'],
  'Dark fantasy': ['dark-fantasy'],
  'Supernatural fiction': ['supernatural'], 'Supernatural thriller': ['supernatural', 'mystery-thriller'],
  'Martial arts film': ['martial-arts'], 'Martial arts (genre)': ['martial-arts'], 'Martial arts fiction': ['martial-arts'],
  'Science fiction': ['science-fiction'], 'Science fiction comedy': ['science-fiction', 'comedy'], 'Science fantasy': ['fantasy', 'science-fiction'],
  Steampunk: ['science-fiction'], 'Mecha anime and manga': ['science-fiction'], 'Space Western': ['science-fiction'], 'Alternate history': ['science-fiction'],
  Comedy: ['comedy'], 'Comedy horror': ['comedy'],
  'Mystery fiction': ['mystery-thriller'], 'Thriller (genre)': ['mystery-thriller'], 'Psychological thriller': ['mystery-thriller'], 'Neo-noir': ['mystery-thriller'], 'Spy film': ['mystery-thriller'],
  'Romance novel': ['romance'], 'Romance comics': ['romance'], 'Romantic comedy': ['romance', 'comedy'],
  Drama: ['drama'], 'Drama (film and television)': ['drama'], 'Psychological drama': ['drama'], 'Psychological fiction': ['drama'], 'Coming-of-age story': ['drama'], 'Comedy drama': ['comedy', 'drama'],
  'Slice of life': ['slice-of-life'], 'Sports manga': ['sports'],
  'Post-apocalyptic': ['post-apocalyptic'], 'Apocalyptic and post-apocalyptic fiction': ['post-apocalyptic'],
  'Historical fiction': ['historical'], 'Samurai cinema': ['historical'],
  'Musical fiction': [], 'Superhero fiction': [], 'Superhero comics': [], 'Lovecraftian horror': [], Metafiction: [], 'Yankī': [], 'Epic (genre)': [],
};

/** series, resolved page title, revision id read, genre items of the infobox in order ("link|text" as in [[link|text]]). */
const RAW = [
  ["apothecary-diaries", "The Apothecary Diaries", 1382807323, ["Drama (film and television)|Drama", "Mystery fiction|Mystery", "Romance novel|Romance"]],
  ["attack-on-titan", "Attack on Titan", 1384443094, ["Action fiction|Action", "Dark fantasy", "Post-apocalyptic"]],
  ["black-clover", "Black Clover", 1381706424, ["Adventure fiction|Adventure", "Fantasy"]],
  ["bleach", "Bleach (manga)", 1383591576, ["Adventure fiction|Adventure", "Martial arts film|Martial arts", "Supernatural fiction|Supernatural"]],
  ["blue-lock", "Blue Lock", 1383987350, ["Sports manga|Sports", "Thriller (genre)|Thriller"]],
  ["bocchi-the-rock", "Bocchi the Rock!", 1383576549, ["Comedy", "Musical fiction|Music", "Slice of life"]],
  ["chainsaw-man", "Chainsaw Man", 1382617994, ["Action fiction|Action", "Comedy horror", "Dark fantasy"]],
  ["code-geass", "Code Geass", 1383895796, ["Alternate history", "Mecha anime and manga|Mecha", "Military fiction"]],
  ["cowboy-bebop", "Cowboy Bebop", 1382858966, ["Neo-noir", "Space Western"]],
  ["dandadan", "Dandadan", 1383634740, ["Action fiction|Action", "Romantic comedy", "Supernatural thriller"]],
  ["death-note", "Death Note", 1381769893, ["Mystery fiction|Mystery", "Psychological thriller", "Supernatural thriller"]],
  ["demon-slayer", "Demon Slayer: Kimetsu no Yaiba", 1384221301, ["Adventure fiction|Adventure", "Dark fantasy", "Martial arts film|Martial arts"]],
  ["detective-conan", "Case Closed", 1383303247, ["Mystery fiction|Mystery", "Thriller (genre)|Thriller"]],
  ["dr-stone", "Dr. Stone", 1383456221, ["Adventure fiction|Adventure", "Post-apocalyptic", "Science fiction"]],
  ["dragon-ball", "Dragon Ball (manga)", 1384184378, ["Adventure fiction|Adventure", "Fantasy comedy", "Martial arts (genre)|Martial arts"]],
  ["evangelion", "Neon Genesis Evangelion", 1383469280, ["Apocalyptic and post-apocalyptic fiction|Apocalyptic", "Mecha anime and manga|Mecha", "Psychological drama"]],
  ["fairy-tail", "Fairy Tail", 1381103857, ["Adventure fiction|Adventure", "Fantasy"]],
  ["frieren", "Frieren", 1381436923, ["Adventure fiction|Adventure", "Drama (film and television)|Drama", "Fantasy"]],
  ["fruits-basket", "Fruits Basket", 1379854325, ["Romantic comedy", "Slice of life", "Supernatural fiction|Supernatural"]],
  ["fullmetal-alchemist", "Fullmetal Alchemist", 1383145379, ["Adventure fiction|Adventure", "Dark fantasy", "Steampunk"]],
  ["gintama", "Gintama", 1383136036, ["Adventure fiction|Adventure", "Samurai cinema|Samurai", "Science fiction comedy"]],
  ["haikyu", "Haikyu!!", 1381740115, ["Comedy", "Coming-of-age story|Coming-of-age", "Sports manga|Sports"]],
  ["hunter-x-hunter", "Hunter × Hunter", 1381097044, ["Adventure fiction|Adventure", "Fantasy", "Martial arts fiction|Martial arts"]],
  ["inuyasha", "Inuyasha", 1383636250, ["Adventure fiction|Adventure", "Fantasy", "Romance comics|Romance"]],
  ["jojo", "JoJo's Bizarre Adventure", 1382026619, ["Adventure fiction|Adventure", "Supernatural fiction|Supernatural"]],
  ["jujutsu-kaisen", "Jujutsu Kaisen", 1383558677, ["Adventure fiction|Adventure", "Dark fantasy", "Supernatural fiction|Supernatural"]],
  ["kagurabachi", "Kagurabachi", 1383522845, ["Action fiction|Action", "Dark fantasy"]],
  ["kaguya-sama-love-is-war", "Kaguya-sama: Love Is War", 1383885228, ["Psychological fiction|Psychological", "Romantic comedy", "Slice of life"]],
  ["kaiju-no-8", "Kaiju No. 8", 1383652211, ["Adventure fiction|Adventure", "Science fantasy"]],
  ["mob-psycho-100", "Mob Psycho 100", 1380373905, ["Action fiction|Action", "Comedy", "Supernatural fiction|Supernatural"]],
  ["my-hero-academia", "My Hero Academia", 1382270421, ["Adventure fiction|Adventure", "Science fantasy", "Superhero fiction|Superhero"]],
  ["naruto", "Naruto", 1384339309, ["Adventure fiction|Adventure", "Fantasy comedy", "Martial arts film|Martial arts"]],
  ["omniscient-readers-viewpoint", "Omniscient Reader's Viewpoint", 1384228095, ["Action fiction|Action", "Fantasy", "Metafiction"]],
  ["one-piece", "One Piece", 1383040207, ["Adventure fiction|Adventure", "Comedy drama", "Science fantasy"]],
  ["one-punch-man", "One-Punch Man", 1384356976, ["Action (genre)|Action", "Comedy", "Superhero comics|Superhero"]],
  ["oshi-no-ko", "Oshi no Ko", 1383885658, ["Drama", "Mystery fiction|Mystery", "Supernatural fiction|Supernatural"]],
  ["re-zero", "Re:Zero", 1383900035, ["Adventure fiction|Adventure", "Dark fantasy", "Isekai"]],
  ["sailor-moon", "Sailor Moon", 1383278869, ["Magical girl"]],
  ["sakamoto-days", "Sakamoto Days", 1383740686, ["Action comedy"]],
  ["slam-dunk", "Slam Dunk (manga)", 1379466912, ["Comedy", "Coming-of-age story|Coming-of-age", "Sports manga|Sports"]],
  ["solo-leveling", "Solo Leveling", 1383622083, ["Action fiction|Action", "Fantasy", "Lovecraftian horror|Cosmic horror"]],
  ["spy-x-family", "Spy × Family", 1384473131, ["Action fiction|Action", "Spy film|Spy", "Comedy", "Slice of life"]],
  ["steins-gate", "Steins;Gate (TV series)", 1381908034, ["Psychological thriller", "Science fiction"]],
  ["sword-art-online", "Sword Art Online", 1383891138, ["Adventure fiction|Adventure", "Science fiction"]],
  ["that-time-i-got-reincarnated-as-a-slime", "That Time I Got Reincarnated as a Slime", 1381575839, ["Isekai"]],
  ["tokyo-ghoul", "Tokyo Ghoul", 1383194295, ["Dark fantasy", "Supernatural thriller"]],
  ["tokyo-revengers", "Tokyo Revengers", 1383843905, ["Action fiction|Action", "Science fiction", "Thriller (genre)|Thriller", "Yankī"]],
  ["tower-of-god", "Tower of God", 1378030268, ["Action fiction|Action", "Dark fantasy"]],
  ["vinland-saga", "Vinland Saga (manga)", 1383626696, ["Adventure fiction|Adventure", "Epic (genre)|Epic", "Historical fiction|Historical"]],
  ["violet-evergarden", "Violet Evergarden", 1381043521, ["Coming-of-age story|Coming-of-age", "Steampunk"]],
];

/** The infobox that was read, when it is not the Header of Infobox animanga. */
const INFOBOX = {
  evangelion: 'Infobox anime video', 'omniscient-readers-viewpoint': 'Infobox manhwa', 'tower-of-god': 'Infobox manhwa',
  'solo-leveling': 'Infobox book series (the web novel)', 'steins-gate': 'Infobox anime video (the 2011 TV series)',
};
const NOTES = {
  'solo-leveling': 'The original work is the web novel; the Infobox manhwa of the webtoon has an empty genre line.',
  'steins-gate': 'Owner decision 2026-11-09: the Genre line of the infobox of the anime (the 2011 TV series), not of the visual novel (whose only genre, "Visual novel", is a format).',
  'spy-x-family': 'The infobox item is "Spy/Comedy" (two links in one item); the fourth word, Slice of life, is cut by the rule of 3.',
  'sailor-moon': 'One genre in the infobox.',
  'that-time-i-got-reincarnated-as-a-slime': 'One genre in the infobox.',
  'sakamoto-days': 'One genre in the infobox (Action comedy, which gives two words).',
};
/** Featured targets of the series (the 185 possible answers: 178 + the 7 characters of the four series whose year L18 fills); measured on the PGlite chain by genres.test.ts. */
export const TARGETS = { "apothecary-diaries": 1, "attack-on-titan": 6, "black-clover": 1, "bleach": 9, "bocchi-the-rock": 1, "chainsaw-man": 3, "code-geass": 4, "cowboy-bebop": 1, "dandadan": 1, "death-note": 3, "demon-slayer": 3, "detective-conan": 10, "dr-stone": 1, "dragon-ball": 25, "evangelion": 3, "fairy-tail": 3, "frieren": 1, "fruits-basket": 1, "fullmetal-alchemist": 4, "gintama": 2, "haikyu": 1, "hunter-x-hunter": 5, "inuyasha": 5, "jojo": 3, "jujutsu-kaisen": 6, "kaguya-sama-love-is-war": 2, "mob-psycho-100": 1, "my-hero-academia": 6, "naruto": 15, "one-piece": 34, "one-punch-man": 1, "oshi-no-ko": 5, "re-zero": 1, "sailor-moon": 4, "sakamoto-days": 1, "slam-dunk": 2, "spy-x-family": 3, "steins-gate": 1, "sword-art-online": 4, "tokyo-ghoul": 1, "tokyo-revengers": 1 };

const linkOf = (g) => g.split('|')[0];
const textOf = (g) => (g.includes('|') ? g.split('|')[1] : g);
export function pick(items) {
  const primary = [];
  const extra = [];
  for (const g of items) {
    const w = MAP[linkOf(g)];
    if (w === undefined) throw new Error(`no mapping for ${g}`);
    if (!w.length) continue;
    if (!primary.includes(w[0])) primary.push(w[0]);
    for (const x of w.slice(1)) if (!extra.includes(x)) extra.push(x);
  }
  const out = primary.slice(0, 3);
  for (const x of extra) if (out.length < 3 && !out.includes(x)) out.push(x);
  return out.sort((a, b) => KEYS.indexOf(a) - KEYS.indexOf(b));
}

export function build() {
  return RAW.map(([series, title, revid, items]) => {
    for (const w of items.flatMap((g) => MAP[linkOf(g)])) if (!KEYS.includes(w)) throw new Error(`${w} is not in the list`);
    const genres = pick(items);
    const dropped = items.filter((g) => !MAP[linkOf(g)].length).map(textOf);
    const cut = items.filter((g) => MAP[linkOf(g)].length && !MAP[linkOf(g)].some((w) => genres.includes(w))).map(textOf);
    const notes = [NOTES[series], dropped.length ? `No word in the list, dropped: ${dropped.join(', ')}.` : '', cut.length ? `Cut by the rule of 3: ${cut.join(', ')}.` : ''].filter(Boolean);
    return {
      series, wikipedia_title: title, revid: String(revid), infobox: INFOBOX[series] ?? 'Infobox animanga/Header',
      raw_genres: items.map((g) => ({ link: linkOf(g), text: textOf(g) })), genres, note: notes.join(' '), targets: TARGETS[series] ?? 0,
    };
  });
}

const EN = Object.fromEntries(LIST.map((l) => [l[0], l[1]]));
const setKey = (g) => g.join(' + ');

export function markdown(data) {
  const sets = new Map();
  for (const d of data) {
    const k = setKey(d.genres.map((x) => EN[x]));
    const e = sets.get(k) ?? { series: [], targets: 0 };
    e.series.push(d.series);
    e.targets += d.targets;
    sets.set(k, e);
  }
  const rows = [...sets.entries()].sort((a, b) => b[1].series.length - a[1].series.length || b[1].targets - a[1].targets || a[0].localeCompare(b[0]));
  const word = new Map();
  for (const d of data) for (const g of d.genres) word.set(g, (word.get(g) ?? 0) + 1);
  const rawRows = Object.entries(MAP).map(([r, w]) => `| ${r} | ${w.length ? w.map((x) => EN[x]).join(', ') : 'no word (dropped)'} |`);
  const L = [];
  L.push('# Otakudle Genres: the closed list and the mapping', '');
  L.push('Generated by `docs/anime/data/dle/gen-genres.mjs` from the infobox genre lines of the English Wikipedia (read through the API on 2026-11-08, the revision id of each page is in `otakudle-genres.json`). Do not edit by hand.', '');
  L.push('## The closed list (15 words)', '', '| Key | English | French | Series |', '|---|---|---|---|');
  for (const [k, en, fr] of LIST) L.push(`| ${k} | ${en} | ${fr} | ${word.get(k) ?? 0} |`);
  L.push('', '## The rule', '');
  L.push('1. Source: the `genre` line of the infobox of the original work (the Header of `Infobox animanga` for a manga, light novel or original anime; the infobox of the web novel for Solo Leveling; the manhwa infobox for Tower of God and Omniscient Reader; for Steins;Gate the infobox of the 2011 anime, owner decision 2026-11-09). The revision id read is stored with each series.');
  L.push('2. Each raw genre (the target of its link) has an ordered list of closed words in the table below, or none. The first word is its primary word.');
  L.push('3. The primary words, in the order of the infobox, without repeats, are kept up to 3.');
  L.push('4. If that leaves fewer than 3, the second words of the compound genres (Fantasy comedy gives Fantasy, then Comedy) are added in the order of the infobox until there are 3 or none left.');
  L.push('5. A raw genre with no word is dropped. Nothing is added that the infobox does not give; a series keeps as many words as its infobox yields (1 to 3).');
  L.push('6. The words are stored sorted in the order of the list. Compared as a set: Right = same set, Close = one word in common, Wrong = none.', '');
  L.push('Mapping choices validated by the owner on 2026-11-09: Isekai and Magical girl to Fantasy, Steampunk to Science fiction, Military fiction to Action. Nothing else changed in the mapping.', '');
  L.push('## Raw genre to closed word', '', '| Raw genre (link target) | Closed word(s), primary first |', '|---|---|', ...rawRows, '');
  L.push('## The 50 series', '', '| Series | Wikipedia page | Revision | Raw genres | Genres |', '|---|---|---|---|---|');
  for (const d of data) L.push(`| ${d.series} | ${d.wikipedia_title} | ${d.revid} | ${d.raw_genres.map((r) => r.text).join(', ')} | ${d.genres.map((x) => EN[x]).join(', ')} |`);
  const max = Math.max(...rows.map((r) => r[1].series.length));
  L.push('', '## Distribution: series and targets per exact set', '', `${rows.length} distinct sets for 50 series; the largest set is shared by ${max} series (the objective is at most 5). ${data.reduce((s, d) => s + d.targets, 0)} possible targets (featured characters).`, '');
  L.push('| Exact set | Series | Possible targets (of 185) | Which |', '|---|---|---|---|');
  for (const [k, e] of rows) L.push(`| ${k} | ${e.series.length} | ${e.targets} | ${e.series.join(', ')} |`);
  L.push('');
  return L.join('\n');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const data = build();
  const json = JSON.stringify(data, null, 2) + '\n';
  const md = markdown(data);
  const pj = path.join(HERE, 'otakudle-genres.json');
  const pm = path.join(HERE, 'otakudle-genres-map.md');
  if (process.argv.includes('--check')) {
    const same = readFileSync(pj, 'utf8') === json && readFileSync(pm, 'utf8') === md;
    console.log(same ? 'same' : 'DIFFERENT');
    process.exit(same ? 0 : 1);
  }
  writeFileSync(pj, json);
  writeFileSync(pm, md);
  console.log(`written: ${data.length} series, ${new Set(data.map((d) => setKey(d.genres))).size} sets`);

}
