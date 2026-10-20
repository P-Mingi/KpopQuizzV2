// Run O1, lane E1a: the thresholds of the content checks, in one place. check.mjs repeats them in its header
// (a test keeps the two in step). Every number below is a fail line: a value at or beyond it fails the check.
export const THRESHOLDS = {
  // C4: a multiple choice, clue or intruder answer is backed when this share of its content words is found in
  // the cited facts (value, text, entity name).
  c4_answer_coverage: 0.75,
  // C4: a true or false statement must share this many content words with the cited facts; a true statement must
  // also have this share of its content words covered by them.
  c4_tf_shared_words: 2,
  c4_tf_true_coverage: 0.6,
  // C4: distractors are entities of the same type: the longest option has at most this many times the words of the
  // shortest, and all options have the same shape (number, year, proper name or phrase).
  c4_option_word_ratio: 4,
  // C7 copy guard: word n-grams of this size; a text fails when this share of its n-grams is found in one stored
  // source excerpt, or when it repeats this many words of an excerpt in a row. Texts shorter than c7_min_words
  // are not compared (names and short titles collide by nature).
  c7_ngram: 4,
  c7_containment: 0.5,
  c7_run_words: 8,
  c7_min_words: 6,
  // C8: at most this many quoted lines per quiz, each of at most this many words, none in a music question.
  c8_quotes_per_quiz: 1,
  c8_quote_max_words: 10,
  // C9 dedupe: two questions with the same correct answer and at least this word overlap (Jaccard) are duplicates;
  // the same normalized question text is a duplicate whatever the answer.
  c9_question_jaccard: 0.8,
  // C13: a title whose character trigram Dice score against an inspiration title reaches this value fails.
  c13_title_dice: 0.8,
  // Review packet: share of the questions drawn for the reviewer.
  sample_fraction: 0.25,
};

export const BANNED_HOSTS = ['myanimelist.net', 'jikan.moe', 'fandom.com', 'animethemes.moe', 'kprofiles.com', 'anilist.co', 'sporcle.com'];
export const SOURCE_HOSTS = { wikipedia: ['wikipedia.org'], wikidata: ['wikidata.org'], musicbrainz: ['musicbrainz.org'] };

export const CODES = {
  C1: 'schema valid, 4 distinct options, one right answer',
  C2: 'cited facts sourced (two sources for a load bearing fact, Wikipedia revision)',
  C3: 'cited facts exist, are verified and belong to the series',
  C4: 'every answer backed by a cited fact, distractors of the same type',
  C5: 'spoiler tags follow the cited facts',
  C6: 'title is not "{series} quiz" and names no identity spoiler',
  C7: 'copy guard against the stored source text',
  C8: 'no lyrics, at most one short quoted line',
  C9: 'no duplicate in the corpus',
  C10: 'allowed sources only',
  C11: 'no en or em dash',
  C12: 'no emoji',
  C13: 'title not close to an inspiration title',
  C14: 'no image field, no artwork',
};
