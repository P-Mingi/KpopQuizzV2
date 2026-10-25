// The K-pop Knowledge Report 2026: the figures the report prints, in one place, so the
// page (/data/knowledge-report-2026), its chart exports and its credit line read the same
// values (SEO Mission 3, part F.3).
//
// Every figure here is the report's own (docs/PLAY-W5-REPORT-DRAFT.md v4, shipped verbatim)
// and traces to the published dataset, docs/data/w5-dataset.md, served in full at
// /data/knowledge-report-2026/dataset: the score tables are its section L (May to August,
// quizzes above the 50-attempt floor), the attempt count and the perfect and zero scores
// its section R2 (the canonical window, 17,425 usable attempts). knowledge-report-2026.test.ts
// re-reads the dataset and fails if any of them drifts from it. Do not add a figure here
// that the dataset does not hold.

export const REPORT_TITLE = 'The K-pop Knowledge Report 2026';
export const REPORT_PATH = '/data/knowledge-report-2026';
export const REPORT_URL = `https://kpopquiz.org${REPORT_PATH}`;

/** The ready credit line for anyone quoting the report or its charts. */
export const REPORT_CREDIT = 'Source: kpopquiz.org K-pop Knowledge Report 2026';

/** The window, as the report prints it. */
export const REPORT_WINDOW = '1 May to 17 August 2026';

/** Section R2: usable attempts in the canonical window, perfect scores and zero scores. */
export const REPORT_SCORES = { attempts: 17425, perfect: 6257, zero: 109 } as const;

/** [score, attempts, quiz] as the report's tables print them. Section L1, rows 1 to 5. */
export const HARDEST: ReadonlyArray<readonly [string, string, string]> = [
  ['40.0%', '71', 'BLACKPINK world records and achievements'],
  ['41.5%', '86', 'Stray Kids: Guess the Song'],
  ['41.6%', '781', 'Ultimate BTS era quiz - only real ARMYs survive'],
  ['52.3%', '59', 'BTS concerts and tour moments'],
  ['54.2%', '400', 'BLACKPINK ultimate fan challenge'],
];

/** [score, attempts, quiz] as the report's "Easiest" table prints it. Section L2. */
export const EASIEST: ReadonlyArray<readonly [string, string, string]> = [
  ['99.4%', '53', 'Find the Non-BLACKPINK Member'],
  ['97.5%', '61', 'BTS members real names'],
  ['97.2%', '96', 'SEVENTEEN true or false'],
  ['96.8%', '101', 'How well do you know SKZ members?'],
  ['96.3%', '378', 'K-pop fandom names true or false'],
];
