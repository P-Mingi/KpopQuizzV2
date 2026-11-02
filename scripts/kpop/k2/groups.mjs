// Lot K2: the target groups, in the owner's order (priority list of 2026-11-02, then the plays list). plays = production plays read by the caller.
// titles: English Wikipedia titles to try, in order (redirects are followed). nct-127 is not here on purpose: its members already
// sit under NCT (K1), a second row for the same person would put a duplicate in the game.
export const GROUPS = [
  { slug: 'loona', plays: 200, priority: 1, titles: ['Loona'] },
  { slug: 'got7', plays: 137, priority: 2, titles: ['Got7'] },
  { slug: 'monsta-x', plays: 214, priority: 3, titles: ['Monsta X'] },
  { slug: 'girls-generation', plays: 564, priority: 4, titles: ["Girls' Generation"] },
  { slug: 'zerobaseone', plays: 32, priority: 5, titles: ['Zerobaseone'] },
  { slug: 'mamamoo', plays: 31, priority: 6, titles: ['Mamamoo'] },
  { slug: 'bigbang', plays: 239, priority: 7, titles: ['Bigbang (South Korean band)', 'Big Bang (South Korean band)', 'BigBang'] },
  { slug: 'katseye', plays: 802, priority: 8, titles: ['Katseye'] },
  { slug: 'illit', plays: 3477, priority: 9, titles: ['Illit'] },
  { slug: 'treasure', plays: 23, priority: 10, titles: ['Treasure (band)'] },
  { slug: 'dreamcatcher', plays: 14, priority: 11, titles: ['Dreamcatcher (group)', 'Dreamcatcher (South Korean band)'] },
  { slug: 'tws', plays: 48, priority: 12, titles: ['TWS (band)', 'Tws (band)'] },
  { slug: 'p1harmony', plays: 12, priority: 13, titles: ['P1Harmony'] },
  { slug: 'cortis', plays: 3402, priority: 14, titles: ['Cortis (band)', 'Cortis'] },
  { slug: 'hearts2hearts', plays: 128, priority: 15, titles: ['Hearts2Hearts'] },
  { slug: 'kickflip', plays: 124, priority: 16, titles: ['KickFlip'] },
  { slug: 'tuide', plays: 124, priority: 17, titles: ['Tuide'] },
  { slug: 'lngshot', plays: 91, priority: 18, titles: ['Lngshot'] },
  { slug: 'artms', plays: 77, priority: 19, titles: ['Artms'] },
  { slug: 'loossemble', plays: 52, priority: 20, titles: ['Loossemble'] },
  { slug: 'team', plays: 48, priority: 21, titles: ['&Team'] },
  { slug: 'kiiikiii', plays: 21, priority: 22, titles: ['Kiiikiii'] },
  { slug: 'xikers', plays: 19, priority: 23, titles: ['Xikers'] },
  { slug: 'akmu', plays: 17, priority: 24, titles: ['AKMU', 'Akdong Musician'] },
  { slug: 'astro', plays: 13, priority: 25, titles: ['Astro (South Korean band)', 'Astro (band)'] },
];
// 021b "yes without reservation" (POUR-LE-PROPRIETAIRE.md section 2, empty "Douteux" column or "Pas douteuse"): id, QID, name, group's Wikipedia title.
export const YES_021B = [
  [82, 'Q26451151', 'Ten', 'NCT (group)'], [89, 'Q60644128', 'Qian Kun', 'NCT (group)'],
  [133, 'Q109108660', 'Kim Chae-hyun', 'Kep1er'],
  [143, 'Q123554436', 'Pharita', 'Babymonster'], [144, 'Q123554438', 'Asa', 'Babymonster'], [145, 'Q123554439', 'Rami', 'Babymonster'],
  [146, 'Q123554440', 'Rora', 'Babymonster'], [148, 'Q123560890', 'Ahyeon', 'Babymonster'],
  [151, 'Q123310101', 'Anton Lee', 'Riize'], [152, 'Q123528880', 'Song Eun-seok', 'Riize'], [153, 'Q123528897', 'Park Won-bin', 'Riize'],
  [163, 'Q117178583', 'Keena', 'Fifty Fifty (group)'],
];
