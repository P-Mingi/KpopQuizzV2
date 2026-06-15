import Link from 'next/link';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'FAQ - Frequently Asked Questions',
  description:
    'Answers to common questions about KpopQuiz: is it free, do you need an account, how to create a K-pop quiz, which groups are covered, the mini-games, and more.',
  alternates: { canonical: '/faq' },
  openGraph: {
    title: 'KpopQuiz FAQ',
    description: 'Everything you need to know about playing and creating K-pop quizzes on KpopQuiz.',
    url: '/faq',
  },
};

// Single source of truth: drives both the visible accordion and the FAQPage
// JSON-LD. Keep answers plain (no em/en dashes per project rule).
const FAQS: { q: string; a: string }[] = [
  {
    q: 'What is KpopQuiz?',
    a: 'KpopQuiz is a free, fan-made platform where you can play and create K-pop quizzes about your favorite groups, play mini-games, and compete with other fans on the leaderboards.',
  },
  {
    q: 'Is KpopQuiz free?',
    a: 'Yes. Every quiz and mini-game is completely free to play and to create. There is nothing to pay for.',
  },
  {
    q: 'Do I need an account to play?',
    a: 'No. You can play any quiz or game without signing in. Creating a free account lets you save your scores, climb the leaderboard, and build your own quizzes.',
  },
  {
    q: 'How do I create my own K-pop quiz?',
    a: 'Tap "Create" in the top bar, choose a quiz type, add your questions and answers, then publish. You can share your quiz with other fans in a couple of minutes.',
  },
  {
    q: 'What types of quizzes are there?',
    a: 'There are five quiz types: Classic multiple choice, Image, Odd-one-out (Intruder), True or False, and Guess from Clues.',
  },
  {
    q: 'Which K-pop groups are covered?',
    a: 'BTS, BLACKPINK, Stray Kids, aespa, NewJeans, TWICE, SEVENTEEN, ENHYPEN, IVE, LE SSERAFIM and 30+ more, with new groups added by the community.',
  },
  {
    q: 'What are the mini-games?',
    a: 'There are two main modes. This or That lets you pick your bias in head-to-head matchups, and Name all members challenges you to type every member of a group before the timer runs out.',
  },
  {
    q: 'How does the leaderboard work?',
    a: 'You earn points by playing quizzes and scoring well. The leaderboard ranks fans both weekly and all-time, so there is always a fresh chance to reach the top.',
  },
  {
    q: 'Can I play on my phone?',
    a: 'Yes. KpopQuiz works in any mobile browser, with no app to install and no download needed.',
  },
  {
    q: 'Are the quizzes accurate?',
    a: 'Quizzes are made by fans who know their groups. The community reports mistakes, and the most-played quizzes rise to the top, so the best content is easy to find.',
  },
];

export default function FaqPage(): React.ReactElement {
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQS.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };

  return (
    <div className="py-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="text-center">
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[var(--accent-bg)] text-[var(--accent)] text-xs font-semibold">
          Help center
        </span>
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-[var(--text-primary)]">
          Frequently asked questions
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-[var(--text-secondary)]">
          Everything you need to know about playing and creating K-pop quizzes on KpopQuiz.
        </p>
      </div>

      {/* Accordion (server-rendered: answers are in the HTML for search engines) */}
      <div className="mt-7 flex flex-col gap-2.5">
        {FAQS.map((f, i) => (
          <details key={i} className="faq-item group rounded-xl border border-[var(--border)] bg-[var(--bg-surface)]">
            <summary className="faq-summary flex items-center justify-between gap-3 cursor-pointer list-none px-4 py-3.5">
              <span className="text-sm font-semibold text-[var(--text-primary)]">{f.q}</span>
              <svg
                className="faq-chevron shrink-0 text-[var(--text-tertiary)] transition-transform duration-200"
                width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </summary>
            <p className="px-4 pb-4 -mt-0.5 text-[13px] leading-relaxed text-[var(--text-secondary)]">
              {f.a}
            </p>
          </details>
        ))}
      </div>

      {/* Still need help */}
      <p className="mt-8 text-center text-[13px] text-[var(--text-tertiary)]">
        Still have a question?{' '}
        <Link href="/contact" className="font-medium text-[var(--accent)] hover:underline">
          Get in touch
        </Link>
      </p>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
    </div>
  );
}
