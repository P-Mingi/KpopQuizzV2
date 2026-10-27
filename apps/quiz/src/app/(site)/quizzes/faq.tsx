// The /quizzes FAQ, one source for both renders (flag off = the live page, flag on =
// UX v11, P2), so the visible answers and the FAQPage JSON-LD text stay identical by
// construction. `text` feeds the JSON-LD, `a` is the visible answer; each render
// passes its own link element (the live page keeps its inline-styled links).
//
// SEO lock (v11 brief P2): do not edit the wording here without the owner. The counts are
// live (owner, 2026-10-14, SEO Mission 1: lib/stats/site-stats.ts); the answers said "380+
// quizzes across 30+ groups" for 455 quizzes across 47 groups. Without the counts they say
// no number.

import { GENRE, IS_KPOP } from '@/lib/site/genre';
import { SITE } from '@/lib/site/registry';

export interface QuizzesFaq {
  q: string;
  text: string;
  a: React.ReactNode;
}

export type FaqLink = (href: string, label: string) => React.ReactNode;

export interface QuizzesFaqCounts {
  /** Published quizzes, already rounded by atLeast ("450+"). */
  quizzes: string;
  /** Groups with at least one published quiz, already rounded ("47"). */
  groups: string;
}

export function quizzesFaqs(link: FaqLink, counts: QuizzesFaqCounts | null = null): QuizzesFaq[] {
  // Run O1: anime says its own genre and series; the kpop words below are those of the base commit (SEO lock above).
  if (!IS_KPOP) return siteQuizzesFaqs(link, counts);
  const howMany = counts
    ? `There are ${counts.quizzes} free K-pop quizzes across ${counts.groups} groups, from BTS and BLACKPINK to Stray Kids, aespa and NewJeans, with new fan-made quizzes added regularly.`
    : 'There are free K-pop quizzes about dozens of groups, from BTS and BLACKPINK to Stray Kids, aespa and NewJeans, with new fan-made quizzes added regularly.';
  const more = counts ? `plus ${counts.groups} groups in all` : 'plus many more groups';
  return [
    { q: 'Are the K-pop quizzes free?', text: 'Yes. Every K-pop quiz on KpopQuiz is free to play with no account needed. Sign in only to save scores, climb the leaderboard, or create your own.',
      a: <>Yes. Every K-pop quiz on KpopQuiz is free to play with no account needed. Sign in only to save scores, climb the leaderboard, or {link('/create', 'create your own')}.</> },
    { q: 'How many K-pop quizzes are there?', text: howMany,
      a: <>{howMany}</> },
    { q: 'Which K-pop groups can I take a quiz on?', text: `Popular hubs include the BTS quiz, BLACKPINK quiz and Stray Kids quiz, ${more}. Browse by group above or open a group hub.`,
      a: <>Popular hubs include the {link('/bts-quiz', 'BTS quiz')}, {link('/blackpink-quiz', 'BLACKPINK quiz')} and {link('/stray-kids-quiz', 'Stray Kids quiz')}, {more}. Browse by group above.</> },
    { q: 'Can I make my own K-pop quiz?', text: 'Yes. Anyone can create a K-pop quiz for free in a few minutes and share it with other fans.',
      a: <>Yes. Anyone can {link('/create', 'create a K-pop quiz')} for free in a few minutes and share it with other fans.</> },
  ];
}

/** The same four questions for another site: its genre word, its brand, its topics (series), no named kpop group. */
function siteQuizzesFaqs(link: FaqLink, counts: QuizzesFaqCounts | null): QuizzesFaq[] {
  const topics = SITE.vocabulary.topicPlural;
  const howMany = counts
    ? `There are ${counts.quizzes} free ${GENRE} quizzes across ${counts.groups} ${topics}, with new fan-made quizzes added regularly.`
    : `There are free ${GENRE} quizzes about dozens of ${topics}, with new fan-made quizzes added regularly.`;
  return [
    { q: `Are the ${GENRE} quizzes free?`, text: `Yes. Every ${GENRE} quiz on ${SITE.brand.name} is free to play with no account needed. Sign in only to save scores, climb the leaderboard, or create your own.`,
      a: <>Yes. Every {GENRE} quiz on {SITE.brand.name} is free to play with no account needed. Sign in only to save scores, climb the leaderboard, or {link('/create', 'create your own')}.</> },
    { q: `How many ${GENRE} quizzes are there?`, text: howMany,
      a: <>{howMany}</> },
    { q: `Which ${GENRE} ${topics} can I take a quiz on?`, text: `Browse by ${SITE.vocabulary.topic} above or open a ${SITE.vocabulary.topic} hub.`,
      a: <>Browse by {SITE.vocabulary.topic} above or {link('/series', `see every ${SITE.vocabulary.topic}`)}.</> },
    { q: 'Can I make my own quiz?', text: 'Yes. Anyone can create a quiz for free in a few minutes and share it with other fans.',
      a: <>Yes. Anyone can {link('/create', 'create a quiz')} for free in a few minutes and share it with other fans.</> },
  ];
}

/** The FAQPage JSON-LD object (same keys, same order as the live page's). */
export function quizzesFaqJsonLd(faqs: QuizzesFaq[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.text },
    })),
  };
}
