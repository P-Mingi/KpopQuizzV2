// Audit 04 section 4 (P1-6): the verified facts each show's draft is built from (src/data/events/results/{show}.json, the SourcedFact shape:
// a question, its answer, three real distractors, one source of the file, the day it was read). A show without a file gets no draft.

import mama from '@/data/events/results/mama-2026.json';
import mma from '@/data/events/results/mma-2026.json';

import type { AwardResults } from './award-prep';

const FILES: Record<string, AwardResults> = {
  'mma-2026': mma as AwardResults,
  'mama-2026': mama as AwardResults,
};

export const awardResultsFor = (showId: string): AwardResults | null => FILES[showId] ?? null;
