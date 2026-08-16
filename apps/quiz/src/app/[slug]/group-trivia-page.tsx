import { notFound } from 'next/navigation';
import Link from 'next/link';

import { GroupLogo } from '@/components/ui/group-logo';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { TriviaShareButton } from '@/components/trivia/trivia-share-button';
import { formatCount } from '@/lib/utils';
import { AnswerFirst } from '@/components/group/answer-first';
import { getGroupNameAllGame, getGroupBlindtestInfo } from '@/lib/db/queries/group-hub';
import { safeFetch } from '@/lib/error-handling';
import { getOverriddenFacts } from '@/lib/trivia/facts';

import type { Metadata } from 'next';
import type { Group } from '@/lib/db/types';
import type { TriviaCategory, TriviaFact } from '@/lib/trivia/types';

// Fact types, categorization, dedup, fetching + the override layer now live in
// src/lib/trivia/* (shared with hasTriviaPage and the corpus extraction script).

// ------------------------------------------------------------------
// Category config
// ------------------------------------------------------------------

const CATEGORY_CONFIG: { key: TriviaCategory; title: string }[] = [
  { key: 'history', title: 'Origin story' },
  { key: 'members', title: 'About the members' },
  { key: 'music', title: 'Music and discography' },
  { key: 'achievements', title: 'Records and achievements' },
  { key: 'fun', title: 'Fun facts' },
];

// Each category gets one badge-token color (shared B0 badge palette) so the
// section chips read as a consistent, recognizable set.
const CATEGORY_CHIP: Record<TriviaCategory, string> = {
  history: 'b-classic',
  members: 'b-image',
  music: 'b-intruder',
  achievements: 'b-clues',
  fun: 'b-tf',
};

const CATEGORY_ICONS: Record<TriviaCategory, React.ReactElement> = {
  history: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M2 3h9v11H2V3z" stroke="currentColor" strokeWidth="1.2" />
      <path d="M5 1v3M11 3h3v11h-3" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  ),
  members: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="6" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M1 14c0-3 2.5-5 5-5s5 2 5 5" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="11" cy="5" r="2" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  ),
  music: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M6 12V3l8-2v9" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="4" cy="12" r="2" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="12" cy="10" r="2" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  ),
  achievements: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M8 1l2 4h4l-3 3 1 4-4-2-4 2 1-4-3-3h4z" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  ),
  fun: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M8 1v2M3 3l1.5 1.5M13 3l-1.5 1.5M1 8h2M13 8h2M3 13l1.5-1.5M13 13l-1.5-1.5M8 13v2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  ),
};

// ------------------------------------------------------------------
// Fact card
// ------------------------------------------------------------------

function TriviaFactCard({ item }: { item: TriviaFact }) {
  return (
    <div className="trivia-fact-card">
      <p className="trivia-fact-text">{item.fact}</p>
      <Link href={`/q/${item.sourceQuizSlug}`} className="trivia-fact-link">
        <span>Test yourself on this</span>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
          <path d="M4 3l3 3-3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </Link>
    </div>
  );
}

// ------------------------------------------------------------------
// Metadata
// ------------------------------------------------------------------

// CTR sprint W1: factCount is the REAL number of facts this page renders (the
// caller already resolved it to run the TRIVIA_MIN_FACTS eligibility gate, and
// getOverriddenFacts is cache()'d, so this costs no extra query). Leading with
// it gives every trivia page a concrete, true reason to click instead of one
// generic title shared by all 37 of them. The gate guarantees >= 12, so the
// count is always plural.
export function generateGroupTriviaMetadata(group: Group, factCount: number): Metadata {
  const ogImage = `https://kpopquiz.org/api/og/group/${group.slug}`;

  return {
    title: `${group.name} Trivia: ${factCount} Facts Only Real Fans Know`,
    description: `How well do you really know ${group.name}? ${factCount} surprising facts about the members, the music, and the records they broke, then test yourself with fan-made quizzes.`,
    alternates: { canonical: `/${group.slug}-trivia` },
    openGraph: {
      title: `${group.name} Trivia | KpopQuiz`,
      description: `Fun facts about ${group.name} that even hardcore fans might not know.`,
      url: `https://kpopquiz.org/${group.slug}-trivia`,
      siteName: 'KpopQuiz',
      type: 'article',
      images: [{ url: ogImage, width: 1200, height: 630, alt: `${group.name} Trivia` }],
    },
    twitter: {
      card: 'summary_large_image',
      images: [ogImage],
    },
  };
}

// ------------------------------------------------------------------
// Page
// ------------------------------------------------------------------

export async function GroupTriviaPage({ group }: { group: Group }): Promise<React.ReactElement> {
  const [uniqueFacts, nameAllGame, blindtest] = await Promise.all([
    safeFetch(getOverriddenFacts(group.id, group.slug), [] as TriviaFact[], '[group-trivia] getOverriddenFacts'),
    // W8: the same two live counts the quiz page uses, so both pages answer identically.
    safeFetch(getGroupNameAllGame(group.id), null, '[group-trivia] getGroupNameAllGame'),
    safeFetch(getGroupBlindtestInfo(group.id), { qualifies: false, songs: 0 }, '[group-trivia] getGroupBlindtestInfo'),
  ]);

  if (uniqueFacts.length < 12) {
    notFound();
  }

  const categorySections = CATEGORY_CONFIG
    .map(config => ({
      ...config,
      icon: CATEGORY_ICONS[config.key],
      facts: uniqueFacts.filter(f => f.category === config.key),
    }))
    .filter(section => section.facts.length >= 2);

  const singleCategory = categorySections.length === 1;
  const canonicalUrl = `https://kpopquiz.org/${group.slug}-trivia`;
  const heroTitle = `${group.name} trivia and fun facts`;

  return (
    <div className="trivia-page">
      <Breadcrumbs
        items={[
          { label: 'Home', href: '/' },
          { label: `${group.name} Quiz`, href: `/${group.slug}-quiz` },
          { label: `${group.name} Trivia` },
        ]}
      />

      {/* Hero */}
      <header className="trivia-hero">
        {group.logo_url && (
          <div className="trivia-hero-logo">
            <GroupLogo
              groupName={group.name}
              logoUrl={group.logo_url}
              displayColor={group.display_color}
              textColor={group.text_color}
              size={56}
            />
          </div>
        )}
        <h1 className="trivia-title">{heroTitle}</h1>
        <p className="trivia-subline">
          {uniqueFacts.length} facts about {group.name} that even hardcore {group.fandom_name}s
          might not know - pulled from fan-made quizzes.
        </p>
        <div className="trivia-share">
          <TriviaShareButton url={canonicalUrl} title={heroTitle} />
        </div>
      </header>

      {/* W8 - answer-first + query fan-out, same module as the quiz page so the two
          pages cannot drift into different answers for the same group. */}
      <AnswerFirst
        group={group}
        facts={{ memberCount: nameAllGame?.count ?? null, songCount: blindtest.songs }}
        seoIntro={group.seo_intro}
      />

      {/* Quick stats */}
      <div className="trivia-stats">
        <div className="trivia-stat">
          <div className="trivia-stat-num">{formatCount(group.quiz_count)}</div>
          <div className="trivia-stat-label">quizzes</div>
        </div>
        <div className="trivia-stat">
          <div className="trivia-stat-num">{formatCount(group.total_plays)}</div>
          <div className="trivia-stat-label">plays</div>
        </div>
        <div className="trivia-stat">
          <div className="trivia-stat-num">{uniqueFacts.length}</div>
          <div className="trivia-stat-label">facts</div>
        </div>
      </div>

      {/* Fact sections */}
      {categorySections.map(section => (
        <section key={section.key} className="trivia-section">
          {!singleCategory && (
            <div className="trivia-section-head">
              <span className="trivia-section-icon">{section.icon}</span>
              <h2 className="trivia-section-title">{section.title}</h2>
              <span className={`trivia-chip ${CATEGORY_CHIP[section.key]}`}>
                {section.facts.length} {section.facts.length === 1 ? 'fact' : 'facts'}
              </span>
            </div>
          )}
          <ul className="trivia-grid">
            {section.facts.map((item, i) => (
              <li key={i} className="trivia-item" style={{ animationDelay: `${i * 40}ms` }}>
                <TriviaFactCard item={item} />
              </li>
            ))}
          </ul>
        </section>
      ))}

      {/* CTA */}
      <div className="trivia-cta">
        <p className="trivia-cta-title">Think you knew all of these?</p>
        <p className="trivia-cta-sub">
          Put your {group.name} knowledge to the test with fan-made quizzes.
        </p>
        <Link href={`/${group.slug}-quiz`} className="btn-primary w-full sm:w-auto">
          Play {group.name} quizzes
        </Link>
      </div>

      {/* W-NAV step 5: crawlable cross-link into the group's Verse space (mirrors
          the quiz hub). Additive <a>, SEO-positive; closes the trivia -> Verse gap. */}
      <Link href={`/verse/${group.slug}`} className="trivia-entry mt-4">
        <span className="trivia-entry-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 5a2 2 0 0 1 2-2h5v18H6a2 2 0 0 1-2-2z" /><path d="M20 5a2 2 0 0 0-2-2h-5v18h5a2 2 0 0 0 2-2z" />
          </svg>
        </span>
        <span className="trivia-entry-text">
          <span className="trivia-entry-title">Explore the {group.fandom_name} space on Verse</span>
          <span className="trivia-entry-sub">Members, discography, timeline and community for {group.name}</span>
        </span>
        <svg className="trivia-entry-arrow" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </Link>

      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Article',
            headline: `${group.name} Trivia - ${uniqueFacts.length} Fun Facts`,
            description: `Surprising facts about ${group.name} that even hardcore ${group.fandom_name}s might not know.`,
            url: `https://kpopquiz.org/${group.slug}-trivia`,
            publisher: {
              '@type': 'Organization',
              name: 'KpopQuiz',
              url: 'https://kpopquiz.org',
            },
            about: {
              '@type': 'MusicGroup',
              name: group.name,
            },
            datePublished: group.created_at,
            dateModified: new Date().toISOString(),
          }),
        }}
      />
    </div>
  );
}
