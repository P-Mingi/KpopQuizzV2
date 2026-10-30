// Daily games (step 1): the comparison of a typed name with the names of the pool (v1 section 7.6). Pure, no I/O.
// No accent, no case, no punctuation: "J-Hope" = "jhope", "Rosé" = "rose". Hangul is compared letter by letter (jamo), so a
// syllable still being typed already matches: "ㅈ" and "지" find "지수".

const HANGUL_FIRST = 0xac00;
const HANGUL_LAST = 0xd7a3;
// The 19 leading consonants of a syllable, as compatibility jamo (what a keyboard types alone).
const LEADS = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ';
const VOWELS = 'ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ';
const TAILS = ['', 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ', 'ㄺ', 'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];

/** Hangul syllables spelled as their jamo (지수 -> ㅈㅣㅅㅜ); every other character unchanged. */
export function spellHangul(s: string): string {
  let out = '';
  for (const ch of s) {
    const c = ch.codePointAt(0)!;
    if (c < HANGUL_FIRST || c > HANGUL_LAST) {
      out += ch;
      continue;
    }
    const i = c - HANGUL_FIRST;
    out += LEADS[Math.floor(i / 588)]! + VOWELS[Math.floor((i % 588) / 28)]! + TAILS[i % 28]!;
  }
  return out;
}

/** The search key of a name: NFKD, no mark, lower case, letters and digits only (Latin, hangul as jamo, kana, kanji). */
export function normalizeName(s: string): string {
  return spellHangul(s.normalize('NFKC'))
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, '');
}

/** The keys of each word of a name, for "starts a word" matches ("Kim Jisoo" -> kim, jisoo). */
export function wordKeys(s: string): string[] {
  return s.split(/[\s\-_.·/()]+/u).map(normalizeName).filter((w) => w.length > 0);
}
