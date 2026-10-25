// Run O1 twin (rule 18) of apps/quiz/src/app/(site)/about/page.tsx, rows 24: copied by scripts/o1/twins-codemod.mjs; kpop modules imported, not copied.
import Link from 'next/link';

import { DEFAULT_OG_IMAGE } from '@/lib/seo/og';
import { FOUNDER } from '@/lib/seo/org';
import { MAILBOX } from '@/lib/site/registry';
import { atLeast, getPublicStatsOrNull } from '@/lib/stats/site-stats';
import type { PublicStats } from '@/lib/stats/site-stats';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About OtakuQuiz',
  description:
    'OtakuQuiz is a free fan-made site to play and create anime quizzes about every series, with blind tests and leaderboards.',
  alternates: {
    canonical: '/about',
    languages: {
      en: '/about',
      'x-default': '/about',
    },
  },
  openGraph: {
    title: 'About OtakuQuiz',
    description: 'A free, fan-made home for anime quizzes, mini-games, and leaderboards.',
    url: '/about',
    images: [DEFAULT_OG_IMAGE],
  },
};

// The mailbox of the network (the registry), as the contact, terms and privacy pages print it.
const CONTACT_EMAIL = MAILBOX;

// Owner, 2026-10-14: live counts (lib/stats/site-stats.ts), the same as every other page.
// This said "42k+" plays for 73,425, "500+" quizzes for 456, and "3k+ fans every week",
// which nothing measures (removed).
function statsOf(s: PublicStats | null): Array<{ num: string; label: string }> {
  if (!s) return [];
  return [
    { num: atLeast(s.plays), label: 'Quizzes played' },
    { num: atLeast(s.quizzes), label: 'Quizzes published' },
    { num: atLeast(s.groupsWithQuizzes), label: 'Series with quizzes' },
  ];
}

const FEATURES = [
  {
    title: 'Five quiz types',
    desc: 'Classic multiple choice, Image, Odd-one-out, True or False, and Guess from Clues.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        <path d="m9 10 2 2 4-4" />
      </svg>
    ),
  },
  {
    title: 'Mini-games',
    desc: 'This or That head-to-head matchups, and Name all characters against the clock.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <line x1="6" y1="11" x2="10" y2="11" /><line x1="8" y1="9" x2="8" y2="13" />
        <line x1="15" y1="12" x2="15.01" y2="12" /><line x1="18" y1="10" x2="18.01" y2="10" />
        <rect x="2" y="6" width="20" height="12" rx="2" />
      </svg>
    ),
  },
  {
    title: 'Leaderboards',
    desc: 'Score well to climb the weekly and all-time rankings against other fans.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
        <path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
        <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" /><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
      </svg>
    ),
  },
  {
    title: 'Made by fans',
    desc: 'Every quiz is created by the community. Make your own in a couple of minutes.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
];

export default async function AboutPage(): Promise<React.ReactElement> {
  const STATS = statsOf(await getPublicStatsOrNull());
  return (
    <div className="py-8 max-w-2xl mx-auto">
      {/* Hero */}
      <div className="text-center">
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[var(--accent-bg)] text-[var(--accent)] anime-c1-pill text-xs font-semibold">
          Made by fans, for fans
        </span>
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-[var(--text-primary)]">
          About <span className="text-[var(--accent)] anime-c1-link">OtakuQuiz</span>
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-[var(--text-secondary)]">
          
          OtakuQuiz is a free community platform where anime fans play and create quizzes about
          their favorite series, settle debates with mini-games, and compete on the leaderboards.
        </p>
      </div>

      {/* Stats */}
      <div className="mt-7 grid grid-cols-3 gap-2.5">
        {STATS.map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-4 text-center"
          >
            <p className="text-xl font-extrabold text-[var(--accent)] anime-c1-link">{s.num}</p>
            <p className="mt-1 text-[11px] text-[var(--text-tertiary)] anime-c1-quiet">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Owner, 2026-10-14 (SEO Mission 1, trust): who runs the site, how the quizzes are
          made, where facts come from, and how to reach us. The owner chose to appear by his
          first name and role only. */}
      <section className="mt-9 space-y-6 text-[15px] leading-relaxed text-[var(--text-secondary)]" aria-label="About the site">
        <div>
          <h2 className="mb-2 text-lg font-bold text-[var(--text-primary)]">Who runs OtakuQuiz?</h2>
          <p>
            
            OtakuQuiz (otakuquiz.org) is run by {FOUNDER.name}, its founder. It is an independent fan site: it is not affiliated
            with any artist, label or agency.
          </p>
        </div>
        <div>
          <h2 className="mb-2 text-lg font-bold text-[var(--text-primary)]">How are the quizzes made?</h2>
          <p>
            Fans write the quizzes. Anyone with an account can create one, and their name is shown on it. A few accounts
            are labelled <b>Team</b>: they publish quizzes and articles for the site, through an editorial review. Play
            counts, scores and averages come from real recorded plays, never from estimates.
          </p>
          <p className="mt-2">
            Players can report a quiz. A quiz is hidden from the site when 5 different signed-in accounts report it, until
            it is reviewed.
          </p>
        </div>
        <div>
          <h2 className="mb-2 text-lg font-bold text-[var(--text-primary)]">Where do the facts come from?</h2>
          <p>
            Facts on our pages come from official sources, Wikidata, MusicBrainz and Wikipedia, and every correction is
            logged with its date. Read the{' '}
            <Link href="/editorial-policy" className="font-medium text-[var(--accent)] anime-c1-link hover:underline">editorial policy</Link>
            {' '}for the details.
          </p>
        </div>
        <div>
          <h2 className="mb-2 text-lg font-bold text-[var(--text-primary)]">How can I contact you?</h2>
          <p>
            Write to{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-[var(--accent)] anime-c1-link hover:underline">{CONTACT_EMAIL}</a>
            {' '}for questions, corrections or press requests.
          </p>
        </div>
      </section>

      {/* Features */}
      <h2 className="mt-9 mb-3 text-sm font-bold uppercase tracking-wide text-[var(--text-tertiary)] anime-c1-quiet">
        What you can do
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {FEATURES.map((f) => (
          <div
            key={f.title}
            className="flex gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-4"
          >
            <span className="shrink-0 grid place-items-center w-9 h-9 rounded-lg bg-[var(--accent-bg)] text-[var(--accent)] anime-c1-link">
              {f.icon}
            </span>
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">{f.title}</p>
              <p className="mt-0.5 text-[12px] leading-relaxed text-[var(--text-secondary)]">{f.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/quizzes" className="btn-primary">Browse quizzes</Link>
        <Link href="/create" className="btn-outline anime-c1-link">Create a quiz</Link>
      </div>

      {/* Cross-link to the FAQ (the /stats page is a kpop page: not on this site) */}
      <p className="mt-8 text-center text-[13px] text-[var(--text-tertiary)] anime-c1-quiet">
        Got a question?{' '}
        <Link href="/faq" className="font-medium text-[var(--accent)] anime-c1-link hover:underline">
          Read the FAQ
        </Link>
        .
      </p>
    </div>
  );
}
