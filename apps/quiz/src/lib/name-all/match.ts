// Name them all (V12 G6, SYSTEM.md 5.1): the matcher. Pure and table-driven: it
// knows nothing about groups, it only compares a typed string with the accepted
// spellings of each member (lib/name-all/spellings.ts + the database roster).
//
// Rules, in this order:
//   1. Exact: the typed name equals an accepted spelling once both are normalised
//      (case, spaces, dots, hyphens, apostrophes and accents are ignored; Hangul is
//      kept as typed).
//   2. One-letter typo: one letter changed, missing or added, only against
//      spellings of 5 letters or more, and only when it points at ONE member. A typo
//      that could be two different members is not accepted.
// An exact match always wins over a typo, so "Yujin" is never read as "Yunjin".

export interface NameAllMember {
  /** Display name, the database `idols.name` ("Bang Chan"). Also the member's key. */
  name: string;
  /** Every accepted spelling besides the display name (any script, any case). */
  spellings: string[];
}

export interface NameMatch {
  member: NameAllMember;
  kind: 'exact' | 'typo';
}

/** Spellings shorter than this are matched exactly only. */
export const TYPO_MIN_LENGTH = 5;

/** Lowercase, no accents, letters and digits only. Hangul syllables stay composed. */
export function normalizeName(raw: string): string {
  return String(raw)
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .normalize('NFC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, '');
}

/** Length in letters (code points), so a Hangul syllable counts as one. */
export function letterCount(normalized: string): number {
  return Array.from(normalized).length;
}

/** True when a and b differ by at most one changed, missing or added letter. */
export function withinOneLetter(a: string, b: string): boolean {
  if (a === b) return true;
  const x = Array.from(a);
  const y = Array.from(b);
  if (Math.abs(x.length - y.length) > 1) return false;
  const [short, long] = x.length <= y.length ? [x, y] : [y, x];
  let i = 0;
  while (i < short.length && short[i] === long[i]) i += 1;
  if (short.length === long.length) {
    // one changed letter: the rest must be equal
    for (let k = i + 1; k < long.length; k += 1) if (short[k] !== long[k]) return false;
    return true;
  }
  // one missing letter in the short one: skip it in the long one
  for (let k = i; k < short.length; k += 1) if (short[k] !== long[k + 1]) return false;
  return true;
}

/** The normalised accepted spellings of a member, display name included, no duplicate. */
export function acceptedSpellings(member: NameAllMember): string[] {
  const out = new Set<string>();
  for (const s of [member.name, ...member.spellings]) {
    const n = normalizeName(s);
    if (n) out.add(n);
  }
  return [...out];
}

/**
 * The member a typed name stands for, or null. `members` is one group's roster.
 * A member already found is still returned (the caller says "already in").
 */
export function matchName(input: string, members: readonly NameAllMember[]): NameMatch | null {
  const typed = normalizeName(input);
  if (!typed) return null;
  const table = members.map((member) => ({ member, spellings: acceptedSpellings(member) }));
  for (const row of table) if (row.spellings.includes(typed)) return { member: row.member, kind: 'exact' };
  const near = table.filter((row) => row.spellings.some((s) => letterCount(s) >= TYPO_MIN_LENGTH && withinOneLetter(typed, s)));
  if (near.length === 1 && near[0]) return { member: near[0].member, kind: 'typo' };
  return null;
}
