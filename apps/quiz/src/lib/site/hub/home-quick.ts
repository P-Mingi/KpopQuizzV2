// Run O1, lot H2c: the data of "60 seconds": one playable question (no spoiler, no XP) and the sourced facts of the day, a K-pop one
// and an anime one, each with the way to the trivia page of its own site. A part with no data is left out; with none, the block
// is null and disappears.
// Home v3 review: a fact shows only with its subject (the group or series) and a link to its source (https), else it is left out.

import { getDidYouKnow, getSixtySeconds } from './data';
import { firstSentence, httpsUrl, pathOf } from './home-map';
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

/**
 * A fact of the day as the home shows it, or null when it cannot be shown honestly: it must name its subject (the group or series) and
 * link its source (an https URL, SEO rule 5.5). A fact cached before the subject joined the shape has none, and is left out for that hour.
 */
export function toHomeFact(f: HubFact): HomeFact | null {
  const subject = (f.subject ?? '').trim();
  const sourceUrl = httpsUrl(f.sourceUrl);
  if (!subject || !sourceUrl) return null;
  return { site: f.site, subject, text: f.fact, source: f.source, sourceUrl, path: pathOf(f.moreHref, f.site) };
}

async function readQuick(): Promise<HomeQuick | null> {
  const [question, dyk] = await Promise.all([getSixtySeconds(), getDidYouKnow()]);
  const facts = [dyk?.kpop, dyk?.anime].filter((f): f is HubFact => !!f).map(toHomeFact).filter((f): f is HomeFact => f !== null);
  if (!question && facts.length === 0) return null;
  return { question: question ? toHomeQuestion(question) : null, facts };
}

export async function loadHomeQuick(): Promise<HomeQuick | null> {
  return safeBlock('quick', readQuick, null);
}
