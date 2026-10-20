#!/usr/bin/env node
// Run O1, lot f, lane E1a: the content checks C1 to C14 of the anime editorial toolchain.
//
//   node scripts/anime/editorial/check.mjs <file or folder>... [--json] [--data <dir>] [--inspiration <file>] [--facts-draft-ok]
//
// Reads series, facts, quiz draft and daily bank files (docs/anime/data/{series,facts,quizzes,daily}), loads the facts
// and series data of the same data folder (C2 to C5, C7), and the whole corpus (C9). Prints a text report, or the
// JSON report with --json. Exit 0 only when no check fails; 1 when a check fails; 2 on a usage or read error.
// --data <dir>        the data folder (default: the one the files sit in, else docs/anime/data)
// --inspiration <f>   JSON list of inspiration titles for C13 (default scripts/anime/editorial/data/inspiration-titles.json)
// --facts-draft-ok    a cited fact that is still draft is a warning, not a C3 failure (before the owner verifies facts)
//
// Checks (the numbering follows formats.md 3, 4 and 12 where it names a code):
//   C1  schema valid (quiz draft, daily bank row, series fixture shape, fact), 4 distinct options, one right answer
//   C2  cited facts sourced: allowed source kinds, Wikipedia revision id, 2 sources (one Wikidata or official) when load bearing
//   C3  cited facts exist, are verified, belong to the quiz's series and site; fact ids unique; entity refs resolve
//   C4  every answer backed by a cited fact; distractors of one type; the answer not in the question
//   C5  spoiler tags: a question is tagged at least as high as the facts it cites and the characters it names
//   C6  title is not "{series} quiz" (or test, trivia) and names no identity spoiler character
//   C7  copy guard: normalized word n-gram overlap with the stored source excerpts
//   C8  no lyrics; at most one short quoted line per quiz; none in a music question
//   C9  dedupe against the whole corpus (questions, titles, slugs, facts, characters)
//   C10 allowed sources only: https, Wikipedia, Wikidata, MusicBrainz, official sites; never MyAnimeList, Jikan, Fandom,
//       AnimeThemes, kprofiles, AniList, Sporcle; each question source is one of the quiz sources
//   C11 no en dash, no em dash (nor a double hyphen) in any text a visitor can read
//   C12 no emoji
//   C13 title similarity against the inspiration titles
//   C14 no image field, no image link, no artwork
//
// THRESHOLDS (lib/thresholds.mjs; a value at or beyond the line fails):
//   c4_answer_coverage 0.75       share of the right answer's content words found in the cited facts
//   c4_tf_shared_words 2          content words a true or false statement shares with the cited facts
//   c4_tf_true_coverage 0.6       share of a true statement's content words found in the cited facts
//   c4_option_word_ratio 4        longest option over shortest option, in words
//   c7_ngram 4                    words per n-gram of the copy guard
//   c7_containment 0.5            share of a text's n-grams found in one stored excerpt
//   c7_run_words 8                words copied in a row from one excerpt
//   c7_min_words 6                shorter texts are not compared
//   c8_quotes_per_quiz 1          quoted lines in one quiz
//   c8_quote_max_words 10         words in a quoted line
//   c9_question_jaccard 0.8       word overlap of two questions with the same answer
//   c13_title_dice 0.8            character trigram Dice score against an inspiration title
//   sample_fraction 0.25          share of questions in a review packet sample (packet.mjs)

import { runChecks } from './lib/run.mjs';
import { toJson, toText } from './lib/report.mjs';
import { isMain, parseArgs } from './lib/args.mjs';

const HELP = 'usage: node scripts/anime/editorial/check.mjs <file or folder>... [--json] [--data <dir>] [--inspiration <file>] [--facts-draft-ok]';

if (isMain(import.meta.url)) {
  let args;
  try { args = parseArgs(process.argv.slice(2)); } catch (e) { console.error(`${e.message}\n${HELP}`); process.exit(2); }
  if (args.flags['--help'] || args.paths.length === 0) { console.error(HELP); process.exit(args.flags['--help'] ? 0 : 2); }
  try {
    const report = runChecks(args.paths, {
      dataDir: args.flags['--data'], inspiration: args.flags['--inspiration'], allowDraftFacts: Boolean(args.flags['--facts-draft-ok']), now: args.flags['--now'],
    });
    process.stdout.write(`${args.flags['--json'] ? JSON.stringify(toJson(report), null, 2) : toText(report)}\n`);
    process.exitCode = report.ok ? 0 : 1;
  } catch (e) {
    console.error(`check: ${e instanceof Error ? e.message : String(e)}`);
    process.exitCode = 2;
  }
}
