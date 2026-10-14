/**
 * Quality floor for a user-written quiz `fun_fact` before it can become a public
 * trivia fact (the /<group>-trivia pages, the quiz "Did you know?" card and the
 * sitemap trivia gate, all via buildOverriddenFacts).
 *
 * SEO (owner, 2026-10-13): an audit found junk on the trivia pages (emoji walls,
 * "idk"/"lol" chatter, notes to the player like "you are right" or "correct me
 * if wrong", answer restatements like "The intruder is X", and Turkish lines on
 * English pages). Google crawled these pages and left them out of the index.
 * This filter only REMOVES facts, it never rewrites one (real data only), and it
 * runs BEFORE the TRIVIA_MIN_FACTS count so the page gate and the sitemap gate
 * count usable facts only. Rules are deliberately conservative: a short but real
 * fact ("SEVENTEEN has 13 members.") or an English sentence quoting a Korean
 * title must survive. Every rule was checked against the published corpus.
 *
 * Dependency-free on purpose (like fact-key.ts) so a tsx script can import it.
 */

/** Minimum length (emoji and URLs removed, whitespace collapsed). */
export const FACT_MIN_CHARS = 25;
/** Minimum number of words that carry a letter or a digit. */
export const FACT_MIN_WORDS = 4;

const URL_RE = /(?:https?:\/\/|www\.)\S+/giu;
const PICTO_RE = /\p{Extended_Pictographic}/gu;
// Emoji plus the invisible joiners/selectors that glue emoji sequences together.
const EMOJI_RE = /[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}\u{FE0F}\u{200D}\u{20E3}]/gu;
const LETTER_RE = /\p{L}/gu;
const LATIN_RE = /\p{Script=Latin}/gu;
const VISIBLE_RE = /[^\s\p{M}\u{FE0F}\u{200D}]/gu;
// The same letter 5+ times in a row: "falseeeeee", "uhhhhhh", "KIKIIIIII".
const STUTTER_RE = /(\p{L})\1{4,}/iu;

/**
 * Patterns that mark a note to the player, chat filler or an answer restatement,
 * never an encyclopedic fact. Each one is narrow and was matched against the
 * corpus so it does not hit real facts (e.g. "LoL World Championship" is kept,
 * which is why "lol" is matched lowercase or all-caps only).
 */
const JUNK_PATTERNS: readonly RegExp[] = [
  // Placeholders and chat filler. A bare "idk", "n/a", "test" or "..." already
  // fails the length floor; these catch the same filler inside a longer line.
  /^no (?:fun )?facts?\b/iu,
  /\b(?:idk|lmao|lmfao|tbh|ngl|pls|plz|ofc|oml|hehe+|haha+)\b/iu,
  /\b(?:lol|LOL)\b/u,
  // A standalone text emoticon (":)", ":(", ";P"). "<3" is NOT matched: it is
  // part of a real album title (TWICE "Formula of Love: O+T=<3").
  /(?:^|\s)[:;]-?[()[\]DPp](?=\s|$)/u,
  // Talking to the player about the quiz itself.
  /\byou(?:'re|’re| are| were)? (?:so |very |totally |absolutely )?(?:right|correct|wrong)\b/iu,
  /\bcorrect me\b/iu,
  /\b(?:thanks?|thank you) for playing\b/iu,
  /\bcongrats\b/iu,
  /\b(?:did|if) you (?:get|got|guess(?:ed)?) (?:it|this|that)(?: one)? right\b/iu,
  /\b(?:this|next|last|previous|the) question\b/iu,
  /\bmore questions\b/iu,
  /\bfinished the quiz\b/iu,
  /\bthe options\b/iu,
  /^sorry\b/iu,
  /\bmy (?:\w+ )?(?:fav|faves?|bias|ult)\b/iu,
  /\bmy personal favou?rite\b/iu,
  // Restating the answer instead of adding a fact.
  /\b(?:correct|right|valid|real) answers?\b/iu,
  /^(?:the )?answers?\s*(?::|-|is\b)/iu,
  /\bthe answer is\b/iu,
  /^(?:the )?intruder (?:is|was)\b/iu,
  /^this (?:is|was) from\b/iu,
  // A quiz answer pasted as a fragment ("Song mentioned: ITZY - Gold"; owner, 2026-10-14).
  /^songs? mentioned\s*:/iu,
];

// Common function words, used only to tell an English line from a line in another
// Latin-script language (non-Latin scripts are handled by the script ratio).
const ENGLISH_WORDS: ReadonlySet<string> = new Set([
  'the', 'a', 'an', 'is', 'was', 'are', 'were', 'be', 'been', 'of', 'in', 'on', 'at',
  'to', 'by', 'for', 'from', 'with', 'and', 'or', 'but', 'as', 'it', 'its', 'this',
  'that', 'these', 'those', 'his', 'her', 'their', 'they', 'he', 'she', 'we', 'you',
  'has', 'have', 'had', 'not', 'also', 'which', 'who', 'after', 'before', 'during',
  'when', 'into', 'about', 'than', 'only', 'first', 'one', 'all', 'most', 'more',
]);
const FOREIGN_WORDS: ReadonlySet<string> = new Set([
  // Turkish
  'bir', 've', 'bu', 'ama', 'amma', 'neyse', 'gibi', 'için', 'çok', 'değil', 'ile', 'diye', 'olan',
  // Spanish / Portuguese
  'el', 'los', 'las', 'que', 'es', 'del', 'una', 'por', 'para', 'con', 'pero', 'muy', 'não', 'uma', 'com', 'foi', 'são',
  // Indonesian / Malay
  'yang', 'dan', 'ini', 'itu', 'dengan', 'adalah', 'tidak', 'untuk', 'dari',
  // French
  'les', 'est', 'une', 'avec', 'pour', 'sont', 'dans',
  // German
  'und', 'ist', 'nicht', 'eine', 'mit', 'auch',
]);
// Letters that only Turkish (and close neighbours) use: dotless i, dotted capital I, g-breve, s-cedilla.
const TURKISH_LETTER_RE = /[ıİğĞşŞ]/u;

function count(text: string, re: RegExp): number {
  return text.match(re)?.length ?? 0;
}

/** True when the line reads as another Latin-script language rather than English. */
function looksForeign(words: string[]): boolean {
  let english = 0;
  let foreign = 0;
  for (const w of words) {
    if (TURKISH_LETTER_RE.test(w)) {
      foreign += 1;
      continue;
    }
    const lower = w.toLowerCase();
    if (ENGLISH_WORDS.has(lower)) english += 1;
    else if (FOREIGN_WORDS.has(lower)) foreign += 1;
  }
  return foreign >= 2 && foreign > english;
}

/**
 * Whether a raw `fun_fact` is good enough to publish as trivia. Pure and
 * deterministic. Never mutates or rewrites the text: callers keep the original.
 */
export function isUsableFact(raw: string | null | undefined): boolean {
  if (typeof raw !== 'string') return false;
  const text = raw.trim();
  if (text.length === 0) return false;

  // 1. Length and word floor, measured without emoji or URLs so neither can pad it.
  const core = text.replace(URL_RE, ' ').replace(EMOJI_RE, ' ').replace(/\s+/gu, ' ').trim();
  if (core.length < FACT_MIN_CHARS) return false;
  const words = core
    .split(' ')
    .map((w) => w.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ''))
    .filter((w) => /[\p{L}\p{N}]/u.test(w));
  if (words.length < FACT_MIN_WORDS) return false;

  // 2. Emoji walls and punctuation runs: letters must be at least half of the
  //    visible characters, and two or more emoji make it chat, not a fact.
  const letters = count(text, LETTER_RE);
  if (letters < count(text, VISIBLE_RE) * 0.5) return false;
  if (count(text, PICTO_RE) >= 2) return false;
  if (STUTTER_RE.test(text)) return false;

  // 3. Placeholders, chat filler, notes to the player, answer restatements, and
  //    lines that are mostly one repeated word ("test test test test"). The
  //    repetition cap is a third, not a half: a real lyric comparison like
  //    "Been been there, never been been there" repeats words and must survive.
  if (JUNK_PATTERNS.some((re) => re.test(core))) return false;
  if (new Set(words.map((w) => w.toLowerCase())).size < words.length / 3) return false;

  // 4. Language: these pages are English. Mostly non-Latin letters (Hangul, Kana,
  //    CJK and others) means a non-English line; a Korean title inside an English
  //    sentence stays well under the 30% cap.
  if (letters > 0 && letters - count(text, LATIN_RE) > letters * 0.3) return false;
  if (looksForeign(words)) return false;

  return true;
}
