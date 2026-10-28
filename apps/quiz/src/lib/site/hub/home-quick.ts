// Run O1, lot H2c: the data of "60 seconds": one playable question (no spoiler, no XP) and the sourced facts of the day, a K-pop one
// and an anime one, each with the way to the trivia page of its own site. A part with no data is left out; with none, the block
// is null and disappears.

import { getDidYouKnow, getSixtySeconds } from './data';
import { firstSentence, pathOf } from './home-map';
import { safeBlock } from './home-safe';

import type { HubFact, HubSixtySeconds } from './data';
import type { HomeFact, HomeQuestion, HomeQuick } from './home-types';

export function toHomeQuestion(q: HubSixtySeconds): HomeQuestion {
  const explain = (q.explanation ?? '').trim();
  return {
    site: q.site,
    source: q.quizTitle,
    path: pathOf(q.quizHref, q.site),
    text: q.question,
    options: q.options,
    correct: q.correct,
    explain,
    explainShort: firstSentence(explain),
  };
}

export function toHomeFact(f: HubFact): HomeFact {
  return { site: f.site, text: f.fact, source: f.source, path: pathOf(f.moreHref, f.site) };
}

async function readQuick(): Promise<HomeQuick | null> {
  const [question, dyk] = await Promise.all([getSixtySeconds(), getDidYouKnow()]);
  const facts = [dyk?.kpop, dyk?.anime].filter((f): f is HubFact => !!f).map(toHomeFact);
  if (!question && facts.length === 0) return null;
  return { question: question ? toHomeQuestion(question) : null, facts };
}

export async function loadHomeQuick(): Promise<HomeQuick | null> {
  return safeBlock('quick', readQuick, null);
}
