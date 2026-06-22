import Link from 'next/link';

import { BlindtestGame } from '@/components/blind-test/blindtest-game';
import { getBlindtestGroups } from '@/lib/db/queries/blindtest';
import { createServerClient } from '@/lib/supabase/server';
import { safeFetch } from '@/lib/error-handling';
import { formatCount } from '@/lib/utils';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'K-pop Blind Test - Guess the Song from a Clip | KpopQuiz',
  description:
    'Play the free K-pop blind test: listen to a 10-second clip and guess the song or artist. 300+ songs across 60+ groups from every generation. Pick All K-pop, a generation, or your favorite group.',
  alternates: {
    canonical: '/blindtest',
    languages: {
      en: '/blindtest',
      'pt-BR': '/pt/blindtest',
      'x-default': '/blindtest',
    },
  },
  openGraph: {
    title: 'K-pop Blind Test - Guess the Song from a Clip',
    description: 'Listen to a 10-second clip and guess the K-pop song. 300+ songs, 60+ groups, every generation.',
    url: '/blindtest',
    images: [{ url: '/api/og/page?title=K-pop+Blind+Test&subtitle=Guess+the+song+from+a+10-second+clip.+4000%2B+songs+across+87%2B+groups.&accent=%237c5cfc', width: 1200, height: 630, alt: 'K-pop Blind Test on KpopQuiz' }],
  },
};

export const revalidate = 3600;

async function getStats() {
  try {
    const supabase = await createServerClient();
    const [{ count: songCount }, { count: groupCount }] = await Promise.all([
      supabase.from('songs').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('groups').select('id', { count: 'exact', head: true }),
    ]);
    return { songs: songCount ?? 0, groups: groupCount ?? 0 };
  } catch {
    return { songs: 300, groups: 60 };
  }
}

function FaqItem({ q, a }: { q: string; a: string }): React.ReactElement {
  return (
    <details className="group bt-faq-item">
      <summary className="bt-faq-q">
        {q}
        <svg className="bt-faq-chevron" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </summary>
      <p className="bt-faq-a">{a}</p>
    </details>
  );
}

const FAQ_ITEMS = [
  {
    q: 'What is a K-pop blind test?',
    a: 'A blind test plays a short audio clip from a K-pop song and you have to guess which song or artist it is. You only hear the music, no visuals or lyrics on screen. It is the best way to test how well you really know K-pop.',
  },
  {
    q: 'How many songs are available?',
    a: 'The catalog has 300+ songs across 60+ groups spanning every generation of K-pop, from 1st gen legends to the latest 5th gen debuts. New songs are added regularly.',
  },
  {
    q: 'Can I play for just one group?',
    a: 'Yes. Any group with enough songs in the catalog gets its own playlist. Select "By group" on the setup screen and pick your favorite. BTS, BLACKPINK, Stray Kids, TWICE, aespa, NewJeans, and many more are available.',
  },
  {
    q: 'How does a round work?',
    a: 'Each game has 10 songs. For each song you hear a 10-second clip and see four answer choices. Pick the right song or artist before time runs out. Your score is how many you get right out of 10.',
  },
  {
    q: 'Is the blind test free?',
    a: 'Yes, completely free. No account required, no play limits. Just pick your playlist and start guessing.',
  },
  {
    q: 'What generations are covered?',
    a: 'All of them. Filter by 1st gen (H.O.T., S.E.S.), 2nd gen (SNSD, SHINee, BIGBANG), 3rd gen (BTS, EXO, BLACKPINK, TWICE), 4th gen (Stray Kids, aespa, IVE, NewJeans), or 5th gen (the newest debuts).',
  },
  {
    q: 'Can I play on mobile?',
    a: 'Yes. The blind test works on any device with a browser and audio. No app download needed. Just visit kpopquiz.org/blindtest and hit Start.',
  },
];

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQ_ITEMS.map(({ q, a }) => ({
    '@type': 'Question',
    name: q,
    acceptedAnswer: { '@type': 'Answer', text: a },
  })),
};

const webAppJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'K-pop Blind Test',
  url: 'https://kpopquiz.org/blindtest',
  applicationCategory: 'GameApplication',
  operatingSystem: 'Any',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  description: 'Free K-pop blind test with 300+ songs across 60+ groups. Listen to a 10-second clip and guess the song or artist. Pick All K-pop, a generation, or a specific group.',
};

export default async function BlindtestPage(): Promise<React.ReactElement> {
  const [groups, stats] = await Promise.all([
    safeFetch(getBlindtestGroups(), [], '[blindtest] getBlindtestGroups'),
    getStats(),
  ]);

  return (
    <div className="bt-hub">
      {/* Breadcrumbs for SEO (visually subtle) */}
      <div className="bt-hub-crumbs">
        <Breadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: 'Blind Test' },
          ]}
        />
      </div>

      {/* The game IS the page */}
      <BlindtestGame groups={groups} />

      {/* SEO content below the fold */}
      <div className="bt-hub-seo">
        {/* Stats strip */}
        <div className="bt-hub-stats">
          <div className="bt-hub-stat">
            <span className="bt-hub-stat-n">{formatCount(stats.songs)}+</span>
            <span className="bt-hub-stat-l">songs</span>
          </div>
          <div className="bt-hub-stat">
            <span className="bt-hub-stat-n">{stats.groups}+</span>
            <span className="bt-hub-stat-l">groups</span>
          </div>
          <div className="bt-hub-stat">
            <span className="bt-hub-stat-n">5</span>
            <span className="bt-hub-stat-l">generations</span>
          </div>
          <div className="bt-hub-stat">
            <span className="bt-hub-stat-n">10s</span>
            <span className="bt-hub-stat-l">per clip</span>
          </div>
        </div>

        {/* How it works */}
        <section className="bt-hub-section">
          <h2 className="bt-hub-h2">How it works</h2>
          <div className="bt-hub-steps">
            <div className="bt-hub-step">
              <div className="bt-hub-step-n">1</div>
              <p className="bt-hub-step-t">Pick a playlist</p>
              <p className="bt-hub-step-d">All K-pop, a generation, or a specific group</p>
            </div>
            <div className="bt-hub-step">
              <div className="bt-hub-step-n">2</div>
              <p className="bt-hub-step-t">Listen to the clip</p>
              <p className="bt-hub-step-d">10 seconds of the song plays automatically</p>
            </div>
            <div className="bt-hub-step">
              <div className="bt-hub-step-n">3</div>
              <p className="bt-hub-step-t">Guess from 4 choices</p>
              <p className="bt-hub-step-d">Song title or artist name before time runs out</p>
            </div>
          </div>
        </section>

        {/* Internal links */}
        <section className="bt-hub-section">
          <h2 className="bt-hub-h2">More K-pop games</h2>
          <div className="bt-hub-links">
            <Link href="/games/this-or-that" className="bt-hub-link">
              <span className="bt-hub-link-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 12l3 3 5-5"/></svg>
              </span>
              <span>
                <span className="bt-hub-link-t">This or That</span>
                <span className="bt-hub-link-d">Vote in head-to-head K-pop matchups</span>
              </span>
            </Link>
            <Link href="/quizzes" className="bt-hub-link">
              <span className="bt-hub-link-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/></svg>
              </span>
              <span>
                <span className="bt-hub-link-t">K-pop Quizzes</span>
                <span className="bt-hub-link-d">Fan-made quizzes for every group</span>
              </span>
            </Link>
            <Link href="/games/name-all" className="bt-hub-link">
              <span className="bt-hub-link-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
              </span>
              <span>
                <span className="bt-hub-link-t">Name All Members</span>
                <span className="bt-hub-link-d">Can you name every member of your favorite group?</span>
              </span>
            </Link>
          </div>
        </section>

        {/* FAQ */}
        <section className="bt-hub-section">
          <h2 className="bt-hub-h2">Frequently asked questions</h2>
          <div className="bt-hub-faq">
            {FAQ_ITEMS.map(({ q, a }) => (
              <FaqItem key={q} q={q} a={a} />
            ))}
          </div>
        </section>
      </div>

      {/* JSON-LD */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webAppJsonLd) }} />
    </div>
  );
}
