// SEO Mission 3, part B: the count check of the nightly production crawl. Pure, unit tested
// (prod-crawl-counts.test.ts). Rulebook section 4: every public count comes from the site
// stats function (lib/stats/site-stats.ts) and is rounded only by its helpers, atLeast()
// ("450+") or exact() ("458"). This finds the counts a page states about the whole site and
// grades each one against a fresh read of that same function.
//
// WHICH NUMBERS ARE SITE-WIDE CLAIMS. A page also prints per-entity counts ("29 BTS
// quizzes", "2.5k plays" on a quiz card) and facts about the world ("200+ songs" in a BTS
// discography teaser) that are not the site totals and must not be graded against them. A
// number attached to a count noun is read as a claim about a site total when it is close to
// that total:
//   - a floor ("450+", "over 450", "mais de 4.200"), the form atLeast() writes, within
//     FLOOR_BAND (50%) of a stat. Hand-typed totals were floors and drifted far ("380+" for
//     455 quizzes, "42k+" for 73,277 plays), hence the wide band;
//   - an exact or K-rounded number within CLAIM_BAND (10%) of a stat ("93 groups" when the
//     directory holds 95, "73.9K plays" for 73,965).
// A claim passes only as a correct atLeast() or exact() rendering; a K rounding never does.
// Counts of people ("10,000+ players") always fail: the stats function has none.
// LAG. Pages read the stats through a 6 hour cache and ISR, so a correct page can trail a
// fresh read. Each stat gets an allowance: the rows added in the lag window (measured by the
// crawler, e.g. plays created in the last 48 hours). A value is consistent when it is a
// correct rendering of some count between (current - allowance) and current.

import { floorShown, type PublicStats } from '@/lib/stats/site-stats';

export type StatKey = 'quizzes' | 'groupsWithQuizzes' | 'groupsListed' | 'songs' | 'songGroups' | 'plays';
export type Allowance = Partial<Record<StatKey, number>>;

/** How close an exact or K-rounded number must be to a stat to be read as a claim about it. */
export const CLAIM_BAND = 0.1;
/** How close a floor ("450+") must be to a stat to be read as a claim about it. */
export const FLOOR_BAND = 0.5;

export interface CountClaim {
  raw: string;
  value: number;
  /** "450+", "over 450", "mais de 450": a floor, as atLeast() writes it. */
  floor: boolean;
  /** "73.9K", "42k+": a K rounding, which no shared helper produces. */
  kForm: boolean;
  noun: 'quizzes' | 'groups' | 'songs' | 'plays' | 'people';
}

const NOUN_KEYS: Record<CountClaim['noun'], StatKey[]> = {
  quizzes: ['quizzes'],
  groups: ['groupsWithQuizzes', 'groupsListed', 'songGroups'],
  songs: ['songs'],
  plays: ['plays'],
  people: [],
};

const fold = (s: string): string => s.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

function nounOf(word: string, next: string): CountClaim['noun'] | null {
  const w = fold(word);
  if (/^(quiz|quizz|quizzes|quizes)$/.test(w)) {
    const n = fold(next);
    if (/^(plays|partidas|jogadas|parties|attempts)$/.test(n)) return null; // "quiz plays": the next word is the noun
    return /^(played|jogados|completed|taken|finished|joues|jugados)$/.test(n) ? 'plays' : 'quizzes';
  }
  if (/^(groups|grupos|groupes)$/.test(w)) return 'groups';
  if (/^(songs|musicas|tracks|chansons|canciones)$/.test(w)) return 'songs';
  if (/^(plays|partidas|jogadas|parties)$/.test(w)) return 'plays';
  // Site-activity words only: "fans" and "members" also describe real groups ("7 members").
  if (/^(players|users|jogadores|joueurs|jugadores)$/.test(w)) return 'people';
  return null;
}

/** Parse "73,000", "73.000", "4,200", "458", "73.9K", "42k" into a number. */
export function parseCount(token: string): { value: number; kForm: boolean } | null {
  const t = token.trim();
  const k = /^(\d+(?:[.,]\d+)?)[kK]$/.exec(t);
  if (k) return { value: Math.round(parseFloat(k[1]!.replace(',', '.')) * 1000), kForm: true };
  if (/^\d{1,3}(?:[.,]\d{3})+$/.test(t)) return { value: parseInt(t.replace(/[.,]/g, ''), 10), kForm: false };
  if (/^\d+$/.test(t)) return { value: parseInt(t, 10), kForm: false };
  return null;
}

// A count: optional floor words, the number (thousands separators or a K) and an optional
// "+". The words after it are read by lookahead (never consumed, so a count inside them is
// still found): up to two modifiers ("free K-pop", "blind test"), the noun, and the word
// after the noun (to tell "450+ Quizzes published" from "73,000+ Quizzes played").
const CLAIM_RE = new RegExp(
  String.raw`(?<![\p{L}\p{N}.,])(?:(over|more than|mais de|mas de|m\u00e1s de|plus de)\s+)?` +
  String.raw`(\d{1,3}(?:[.,]\d{3})+(?![.,]?\d)|\d+(?:[.,]\d+)?[kK](?![\p{L}\p{N}-])|\d+(?![.,]?\d))(\+)?` +
  String.raw`(?=((?:\s+[\p{L}\p{N}][\p{L}\p{N}'\u2019&-]*){0,4}))`,
  'giu',
);

/** Every count stated in a text, with its noun. */
export function extractCountClaims(text: string): CountClaim[] {
  const out: CountClaim[] = [];
  for (const m of text.matchAll(CLAIM_RE)) {
    const parsed = parseCount(m[2]!);
    if (!parsed) continue;
    const words = (m[4] ?? '').trim().split(/\s+/).filter(Boolean);
    for (let i = 0; i <= 2 && i < words.length; i++) {
      const noun = nounOf(words[i]!, words[i + 1] ?? '');
      if (!noun) continue;
      const tail = words.slice(0, i + 1 + (noun === 'plays' && /^quiz/i.test(words[i]!) ? 1 : 0)).join(' ');
      out.push({
        raw: `${m[1] ? `${m[1]} ` : ''}${m[2]}${m[3] ?? ''} ${tail}`,
        value: parsed.value,
        floor: Boolean(m[1]) || Boolean(m[3]),
        kForm: parsed.kForm,
        noun,
      });
      break;
    }
  }
  return out;
}

export type ClaimVerdict =
  | { ok: true; stat: StatKey }
  | { ok: false; ignored: true }
  | { ok: false; ignored: false; reason: string };

const statValue = (stats: PublicStats, key: StatKey): number => stats[key];

/** True when `value` is a correct rendering of some count in [lo, hi] in the claim's form. */
function renders(claim: CountClaim, lo: number, hi: number): boolean {
  if (claim.kForm) return false;
  if (claim.floor) return claim.value === floorShown(claim.value) && floorShown(lo) <= claim.value && claim.value <= floorShown(hi);
  return lo <= claim.value && claim.value <= hi;
}

/** Grade one claim against the stats (with the lag allowance per stat). */
export function judgeClaim(claim: CountClaim, stats: PublicStats, allowance: Allowance = {}): ClaimVerdict {
  const keys = NOUN_KEYS[claim.noun];
  if (claim.noun === 'people') {
    return claim.floor || claim.kForm
      ? { ok: false, ignored: false, reason: `"${claim.raw}": the stats function has no count of people, so no page may state one` }
      : { ok: false, ignored: true };
  }
  for (const key of keys) {
    const hi = statValue(stats, key);
    const lo = Math.max(0, hi - (allowance[key] ?? 0));
    if (renders(claim, lo, hi)) return { ok: true, stat: key };
  }
  const band = claim.floor ? FLOOR_BAND : CLAIM_BAND;
  const near = keys.filter((key) => Math.abs(claim.value - statValue(stats, key)) <= band * statValue(stats, key));
  if (near.length === 0) return { ok: false, ignored: true };
  const expected = near
    .map((key) => `${key} = ${statValue(stats, key).toLocaleString('en-US')} (atLeast "${floorShown(statValue(stats, key)) < 100 ? floorShown(statValue(stats, key)) : `${floorShown(statValue(stats, key)).toLocaleString('en-US')}+`}")`)
    .join(' or ');
  const why = claim.kForm ? 'a K rounding no shared helper produces' : claim.floor ? 'a floor that is not atLeast() of the current count' : 'an exact count that is not the current count';
  return { ok: false, ignored: false, reason: `"${claim.raw}" is ${why}; the stats function says ${expected}` };
}

// ---- numbers of a JSON-LD description must be on the page -------------------------------

const NUMBER_TOKEN_RE = /(?<![\p{L}\p{N}.,])(\d{1,3}(?:[.,]\d{3})+(?![.,]?\d)|\d+(?:[.,]\d+)?[kK](?![\p{L}\p{N}-])|\d+(?![.,]?\d))/gu;

/** The numbers of a text, 10 and up (single digits are list positions, not data). */
export function numberTokens(text: string): number[] {
  const out: number[] = [];
  for (const m of text.matchAll(NUMBER_TOKEN_RE)) {
    const p = parseCount(m[1]!);
    if (p && p.value >= 10) out.push(p.value);
  }
  return out;
}

/** Numbers stated in `source` (a JSON-LD description) that the visible text never shows. */
export function numbersMissingFrom(source: string, visible: string): number[] {
  const shown = new Set(numberTokens(visible));
  return [...new Set(numberTokens(source))].filter((n) => !shown.has(n));
}
