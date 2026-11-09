// Corrections of the Otakudle facts (audit 06 of 2026-11-08, section 2.3, validated by the owner on 2026-11-09): spec of L22-l1-otakudle-facts-corrections.sql.
// The items live in spec-l22.json (166 values of character_facts, each with the page it was read on: URL, revision id, the day, the words that support it); `old` is the data value that
// L13 wrote (the guard of the SQL) and `new` the corrected one. An item with `srcOnly` keeps the value and only adds the source row (OT-D4). `toNull` empties a value that is not a voice actor.
// `guard` is the value the database holds when it differs from the data (L18 spelled "homunculu" as "homunculus"). Items are in the shape of the engine (series, slug, col, old, new, src, why).
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SPEC = JSON.parse(readFileSync(path.join(HERE, 'spec-l22.json'), 'utf8'));

export const READ = SPEC.read;
export const L22 = SPEC.items.map((i) => ({ ...i, src: i.toNull ? 'stored' : i.src }));
export const FEATURED_ON = SPEC.featuredOn;
export const FEATURED_OFF = SPEC.featuredOff;
export const NEW_CHARS = SPEC.newChars;
export const HISOKA = SPEC.hisoka;

// Left to the owner (no recommendation in the audit, or the source says otherwise): written as commented, guarded blocks in the file, never applied.
export const ASK_L22 = [
  { id: 'OT-D7a', text: 'Obito (role antagonist: his debut, chapter 239, is the heroic Kakashi Gaiden flashback), Uryu (role main, introduced as Ichigo\'s rival), Garp (role antagonist) and Sukuna (species human; JJK says cursed-spirit): the audit leaves it to the owner, case by case. Nothing is written.', sql: '-- (no statement until the owner decides each case)' },
  { id: 'OT-e1', text: 'Secre Swallowtail species: "human" today, "bird (Nero), as first met" only if the rule is applied strictly; the audit gives no recommendation.', sql: '-- update public.character_facts f set species = \'bird\' from public.characters c join public.groups g on g.id = c.group_id and g.site_id = \'anime\' and g.slug = \'black-clover\' where f.character_id = c.id and c.slug = \'secre-swallowtail\' and f.species = \'human\';' },
  { id: 'OT-D5b', text: 'Dio Brando: Takehito Koyasu is written (first TV series, 2012). Akito, Kyoko, Momiji, Hiro (Fruits Basket) look like drama CD casting in the stored values; the cast list read is ambiguous, so nothing is written for them.', sql: '-- (no statement)' },
  { id: 'OT-H11b', text: 'Hunter x Hunter: Meruem, Pariston, Alluka, Komugi, Neferpitou (Chimera Ant arc and later) have no 1999 cast; their 2011 voice actor stays. Chrollo (Yoshikazu Nagano), Feitan (Akari Hibino), Illumi, Machi, Phinks, Uvogin, Zeno already hold their 1999 actor, which the cast list confirms; Biscuit keeps the Greed Island OVA actor.', sql: '-- (no statement)' },
  { id: 'OT-gender', text: 'Rimuru Tempest has no gender (as first met, a slime) and the column accepts only female or male: he is featured but cannot be an answer until the owner allows "neutral" in character_facts.gender (a constraint change, not made here).', sql: '-- (no statement)' },
];
