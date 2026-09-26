// The /quizzes FAQ, one source for both renders (flag off = the live page, flag on =
// UX v11, P2), so the visible answers and the FAQPage JSON-LD text stay identical by
// construction. `text` feeds the JSON-LD, `a` is the visible answer; each render
// passes its own link element (the live page keeps its inline-styled links).
//
// SEO lock (v11 brief P2): do not edit the wording here without the owner.

export interface QuizzesFaq {
  q: string;
  text: string;
  a: React.ReactNode;
}

export type FaqLink = (href: string, label: string) => React.ReactNode;

export function quizzesFaqs(link: FaqLink): QuizzesFaq[] {
  return [
    { q: 'Are the K-pop quizzes free?', text: 'Yes. Every K-pop quiz on KpopQuiz is free to play with no account needed. Sign in only to save scores, climb the leaderboard, or create your own.',
      a: <>Yes. Every K-pop quiz on KpopQuiz is free to play with no account needed. Sign in only to save scores, climb the leaderboard, or {link('/create', 'create your own')}.</> },
    { q: 'How many K-pop quizzes are there?', text: 'There are 380+ free K-pop quizzes across 30+ groups, from BTS and BLACKPINK to Stray Kids, aespa and NewJeans, with new fan-made quizzes added regularly.',
      a: <>There are 380+ free K-pop quizzes across 30+ groups, from BTS and BLACKPINK to Stray Kids, aespa and NewJeans, with new fan-made quizzes added regularly.</> },
    { q: 'Which K-pop groups can I take a quiz on?', text: 'Popular hubs include the BTS quiz, BLACKPINK quiz and Stray Kids quiz, plus 30+ more groups. Browse by group above or open a group hub.',
      a: <>Popular hubs include the {link('/bts-quiz', 'BTS quiz')}, {link('/blackpink-quiz', 'BLACKPINK quiz')} and {link('/stray-kids-quiz', 'Stray Kids quiz')}, plus 30+ more groups. Browse by group above.</> },
    { q: 'Can I make my own K-pop quiz?', text: 'Yes. Anyone can create a K-pop quiz for free in a few minutes and share it with other fans.',
      a: <>Yes. Anyone can {link('/create', 'create a K-pop quiz')} for free in a few minutes and share it with other fans.</> },
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
