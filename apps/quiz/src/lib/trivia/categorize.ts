import type { TriviaCategory } from './types';

/**
 * Heuristic auto-categorization of a trivia fact from its text plus its source
 * question. Dependency-free (type-only import) so the corpus script can reuse it
 * and produce the same `autoCategory` the page would.
 */
export function categorizeFact(fact: string, question: string): TriviaCategory {
  const text = (fact + ' ' + question).toLowerCase();

  if (/born|birthday|age|height|position|leader|maknae|vocalist|rapper|dancer|real name|stage name|mbti|blood type|hometown|family/.test(text)) {
    return 'members';
  }
  if (/album|song|track|single|release|chart|billboard|spotify|mv|music video|debut song|comeback|title track|b-side/.test(text)) {
    return 'music';
  }
  if (/record|award|first|million|billion|sold|guinness|mama|grammy|nominated|won|achievement|highest|most/.test(text)) {
    return 'achievements';
  }
  if (/debut|formed|agency|entertainment|trainee|pre-debut|military|hiatus|contract|disbanded|reunion/.test(text)) {
    return 'history';
  }
  return 'fun';
}
