// Banned-term matching (pure). lib/verse/moderation.ts checkText feeds it the
// verse_banned_terms rows; every write surface of threads, blogs, debates, challenges
// and their replies goes through checkText.
//
// Whole words only, so a term inside a normal word never matches ("class", "therapist",
// "Scunthorpe", "reputation", "시발점"). Before comparing, both the text and the terms are
// normalised the same way:
//   - lower case, accents removed (é -> e, ñ -> n), Hangul kept as syllables;
//   - in Latin words, leetspeak digits and symbols read as letters (f4ck, sh1t, @ss, $) and
//     masking stars dropped (f*ck -> fck);
//   - runs of three or more single letters joined ("f u c k", "f.u.c.k", "씨 발");
//   - letters repeated three times or more collapsed (fuuuuck -> fuck), and a second
//     comparison with every repeat collapsed (asshole / ashole);
//   - a Latin word also matches as term + common suffix (s, ed, d, ing, er, ers, and the
//     Indonesian -nya, -mu, -ku, -lah, -in);
//   - a Hangul word matches when it is the term, or the term followed by a particle or an
//     insult suffix (아, 야, 들, 이, 은, 는, 을, 를, 가, 놈, 년, 같은, ...), never a longer
//     ordinary word (시발점, 씹다), plus an explicit exception list.
// Multi-word terms ("hijo de puta", "kill yourself") match consecutive words.

export interface BannedTerm { term: string; action: 'block' | 'flag' }
export interface BannedHit { term: string; action: 'block' | 'flag' }

const HANGUL = /[ᄀ-ᇿ㄰-㆏가-힯]/;
const LATIN_SUFFIXES = ['s', 'ed', 'd', 'ing', 'er', 'ers', 'nya', 'mu', 'ku', 'lah', 'in'];
const HANGUL_SUFFIXES = ['아', '야', '들', '이', '은', '는', '을', '를', '가', '도', '놈', '년', '범', '같은', '같이', '같네', '새끼', '들아', '이야', '이네', '네'];
/** Ordinary Korean words that start with a banned term. */
const HANGUL_EXCEPTIONS = new Set(['시발점', '시발역', '시발택시', '시발차', '시발로', '시발점에']);
const LEET: Record<string, string> = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '8': 'b', '@': 'a', $: 's', '!': 'i', '|': 'l' };

function stripAccents(s: string): string {
  // NFD splits accents off Latin letters; NFC puts Hangul syllables back together.
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').normalize('NFC');
}

/** One word as written -> the form compared. */
function normWord(raw: string): string {
  if (HANGUL.test(raw)) return raw.replace(/[^ᄀ-ᇿ㄰-㆏가-힯]/g, ''); // 시1발 -> 시발
  const hasLetter = /\p{L}/u.test(raw);
  // '!', '|' and '*' read as letters only inside a word ("sh!t"), not as its punctuation ("wow!").
  const core = raw.replace(/^[!|*]+|[!|*]+$/g, '');
  let w = hasLetter ? [...core].map((c) => LEET[c] ?? c).join('') : core;
  w = w.replace(/\*/g, '').replace(/[^\p{L}\p{N}]/gu, '');
  return w.replace(/(.)\1{2,}/gu, '$1');
}

/** Text -> normalised words (the masking and leet symbols stay inside words). */
export function words(text: string): string[] {
  return stripAccents(text.toLowerCase()).split(/[^\p{L}\p{N}@$!|*]+/u).map(normWord).filter(Boolean);
}

const isSingle = (w: string): 'latin' | 'hangul' | null => ([...w].length !== 1 ? null : HANGUL.test(w) ? 'hangul' : /\p{L}/u.test(w) ? 'latin' : null);

/** The same words with spaced-out letters joined: three or more single Latin letters
 *  ("f u c k"), or two or more single Hangul syllables ("씨 발"). */
export function joinedWords(ws: readonly string[]): string[] {
  const out: string[] = [];
  let run: string[] = [];
  let kind: 'latin' | 'hangul' | null = null;
  const flush = (): void => {
    if (run.length >= (kind === 'hangul' ? 2 : 3)) out.push(run.join(''));
    else out.push(...run);
    run = [];
    kind = null;
  };
  for (const w of ws) {
    const k = isSingle(w);
    if (k && (kind === null || kind === k)) { run.push(w); kind = k; continue; }
    flush();
    if (k) { run.push(w); kind = k; } else out.push(w);
  }
  flush();
  return out;
}

const collapse = (w: string): string => w.replace(/(.)\1+/gu, '$1');

function wordMatches(word: string, term: string): boolean {
  if (HANGUL.test(term)) {
    if (HANGUL_EXCEPTIONS.has(word)) return false;
    if (word === term) return true;
    return word.startsWith(term) && HANGUL_SUFFIXES.includes(word.slice(term.length));
  }
  if (word === term || collapse(word) === collapse(term)) return true;
  return LATIN_SUFFIXES.some((s) => word === term + s || collapse(word) === collapse(term + s));
}

/** The strongest hit (block beats flag), or null. */
export function findBannedTerm(text: string, terms: readonly BannedTerm[]): BannedHit | null {
  const base = words(text);
  if (!base.length) return null;
  const joined = joinedWords(base);
  const hays = joined.length === base.length ? [base] : [base, joined];
  let flag: BannedHit | null = null;
  for (const t of terms) {
    const needle = words(t.term);
    if (!needle.length) continue;
    let hit = false;
    for (const hay of hays) {
      for (let i = 0; i + needle.length <= hay.length && !hit; i++) {
        hit = needle.every((n, j) => wordMatches(hay[i + j]!, n));
      }
    }
    if (!hit) continue;
    if (t.action === 'block') return { term: t.term, action: 'block' };
    flag = { term: t.term, action: 'flag' };
  }
  return flag;
}
