import Link from 'next/link';

import { getQuizzesByGroup, getGroupQuizLinks } from '@/lib/db/queries/quizzes';
import { getRelatedQuizzes } from '@/lib/db/queries/related-quizzes';
import { hasTriviaPage } from '@/lib/db/queries/trivia';
import { RELATED_GROUPS, RELATED_GROUP_NAMES } from '@/lib/related-groups';
import { GroupFeed } from '@/components/home/group-feed';
import { PersonalityGroupCard } from '@/components/personality/personality-entry';
import { getGroupProfiles } from '@/lib/personality/data';
import { GroupLogo } from '@/components/ui/group-logo';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { formatCount } from '@/lib/utils';
import { safeFetch } from '@/lib/error-handling';

import type { Metadata } from 'next';
import type { Group } from '@/lib/db/types';

function generateDefaultIntro(group: Group): string {
  if (group.quiz_count === 0) {
    return `No ${group.name} quizzes yet - be the first to create one! Think you know ${group.name} well enough to challenge other ${group.fandom_name}s? Create a free quiz at kpopquiz.org.`;
  }
  return `Think you're a real ${group.fandom_name}? Play ${group.quiz_count}+ free ${group.name} quizzes created by fans who actually know ${group.name}. From easy trivia to impossible deep-cut challenges - prove you deserve your fan card. ${group.total_plays.toLocaleString('en-US')} plays and counting.`;
}

// CTR sprint: bespoke title + description hook for the highest-impression group
// pages (worst CTR-vs-position first). Titles use MEMBER counts, which are
// stable facts verified against each group's published name_all_members game, so
// the "name all N" promise stays true even as the catalog grows. The quiz count
// in the description is interpolated live from group.quiz_count (never stale).
// ILLIT has no name-all game, so its entry makes no member claim (light touch).
// All other ~80 groups fall through to the formula below. No em dashes (house rule).
const GROUP_SEO_OVERRIDES: Record<string, { title: string; hook: string }> = {
  seventeen: { title: 'SEVENTEEN Quiz: Can You Name All 13 Members? (2026)', hook: 'Name all 13 members, guess the era, and prove you are a real CARAT' },
  bts: { title: 'BTS Quiz: Only Real ARMY Can Name All 7 (2026)', hook: 'Name all 7 members, guess the song from the lyrics, and prove you are a real ARMY' },
  aespa: { title: 'aespa Quiz: Name All 4 Members and More (2026)', hook: 'Name all 4 members, guess the era, and prove you are a real MY' },
  blackpink: { title: 'BLACKPINK Quiz: Can Every BLINK Name All 4? (2026)', hook: 'Name all 4 members, guess the song, and prove you are a real BLINK' },
  twice: { title: 'TWICE Quiz: Can You Name All 9 Members? (2026)', hook: 'Name all 9 members, guess the era, and prove you are a real ONCE' },
  'stray-kids': { title: 'Stray Kids Quiz: Name All 8 Members and More (2026)', hook: 'Name all 8 members, guess the song, and prove you are a real STAY' },
  illit: { title: 'ILLIT Quiz: Free Fan-Made Tests for GLLIT (2026)', hook: "Test your knowledge of ILLIT's members, songs, and eras, then prove you are a real GLLIT" },
};

export function generateGroupQuizMetadata(group: Group): Metadata {
  const override = GROUP_SEO_OVERRIDES[group.slug];

  // Bing flagged ~119 pages with meta descriptions under the ~120 char floor.
  // CTR override wins for the targeted groups; otherwise use the curated
  // seo_intro when long enough, else a keyword-dense fallback that clears 120-160.
  const description = override
    ? `Play ${group.quiz_count}+ free ${group.name} quizzes made by fans. ${override.hook}. Start now, no sign-up.`
    : group.seo_intro && group.seo_intro.length >= 110
    ? group.seo_intro
    : `Play ${group.quiz_count}+ free ${group.name} quizzes made by fans. Test your knowledge of ${group.name}'s members, songs, eras, and history, then prove you are a real ${group.fandom_name}.`;

  const ogImage = `https://kpopquiz.org/api/og/group/${group.slug}`;

  return {
    title: override?.title ?? `${group.name} Quiz - Test Your Knowledge`,
    description,
    alternates: { canonical: `/${group.slug}-quiz` },
    openGraph: {
      title: `${group.name} Quiz | KpopQuiz`,
      description: `${group.quiz_count}+ free ${group.name} quizzes. Can you pass them all?`,
      url: `https://kpopquiz.org/${group.slug}-quiz`,
      images: [{ url: ogImage, width: 1200, height: 630, alt: `${group.name} Quiz` }],
    },
    twitter: {
      card: 'summary_large_image',
      images: [ogImage],
    },
  };
}

export async function GroupQuizPage({ group }: { group: Group }): Promise<React.ReactElement> {
  const relatedSlugs = RELATED_GROUPS[group.slug] ?? [];

  const [initialQuizzes, relatedQuizzes, triviaAvailable, allQuizLinks, personalityProfiles] = await Promise.all([
    safeFetch(getQuizzesByGroup(group.id, 'popular', 0, 10), [], '[group-quiz] getQuizzesByGroup'),
    safeFetch(getRelatedQuizzes(relatedSlugs), [], '[group-quiz] getRelatedQuizzes'),
    safeFetch(hasTriviaPage(group.id, group.slug), false, '[group-quiz] hasTriviaPage'),
    safeFetch(getGroupQuizLinks(group.id), [], '[group-quiz] getGroupQuizLinks'),
    safeFetch(getGroupProfiles(group.id), [], '[group-quiz] getGroupProfiles'),
  ]);
  const personalityFaces = personalityProfiles.map((p) => p.photo_url).filter((u): u is string => !!u).slice(0, 5);

  const intro = group.seo_intro || generateDefaultIntro(group);

  return (
    <div className="py-6">
      <Breadcrumbs
        items={[
          { label: 'Home', href: '/' },
          { label: `${group.name} Quiz` },
        ]}
      />

      <h1 className="text-xl font-medium text-primary">
        {group.name} Quiz - Test How Well You Know {group.name}
      </h1>

      <p className="text-sm text-secondary mt-2 leading-relaxed">{intro}</p>

      <div className="flex items-center gap-3 mt-4">
        <GroupLogo
          groupName={group.name}
          logoUrl={group.logo_url}
          displayColor={group.display_color}
          textColor={group.text_color}
          size={64}
        />
        <div>
          <p className="text-sm font-medium text-primary">{group.name}</p>
          <p className="text-xs text-secondary">
            {formatCount(group.quiz_count)} quizzes · {formatCount(group.total_plays)} total plays
          </p>
        </div>
      </div>

      {personalityProfiles.length > 0 && (
        <div className="mt-4">
          <PersonalityGroupCard
            group={{ id: group.id, name: group.name, slug: group.slug, display_color: group.display_color, text_color: group.text_color, logo_url: group.logo_url }}
            faces={personalityFaces}
          />
        </div>
      )}

      <Link href={`/blindtest/group-${group.slug}`} className="trivia-entry mt-4">
        <span className="trivia-entry-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M9 18V5l12-2v13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="6" cy="18" r="3" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="18" cy="16" r="3" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </span>
        <span className="trivia-entry-text">
          <span className="trivia-entry-title">Play the {group.name} blind test</span>
          <span className="trivia-entry-sub">Guess {group.name} songs from short audio clips</span>
        </span>
        <svg className="trivia-entry-arrow" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </Link>

      {triviaAvailable && (
        <Link href={`/${group.slug}-trivia`} className="trivia-entry mt-4">
          <span className="trivia-entry-icon">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <path d="M3 4A1.5 1.5 0 014.5 2.5H9V14H4.5A1.5 1.5 0 003 15.5V4z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
              <path d="M15 4A1.5 1.5 0 0013.5 2.5H9V14h4.5A1.5 1.5 0 0115 15.5V4z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
            </svg>
          </span>
          <span className="trivia-entry-text">
            <span className="trivia-entry-title">Learn before you play: {group.name} trivia</span>
            <span className="trivia-entry-sub">Fun facts even hardcore {group.fandom_name}s might not know</span>
          </span>
          <svg className="trivia-entry-arrow" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
      )}

      <GroupFeed groupId={group.id} initialQuizzes={initialQuizzes} />

      {/* SEO Fix 3 - crawlable links to EVERY quiz in this group (bots / no-JS).
          GroupFeed only SSRs the first 10; this exposes the rest. */}
      {allQuizLinks.length > 0 && (
        <noscript>
          <nav aria-label={`All ${group.name} quizzes`}>
            <ul>
              {allQuizLinks.map((q) => (
                <li key={q.slug}>
                  <a href={`/q/${q.slug}`}>{q.title}</a>
                </li>
              ))}
            </ul>
          </nav>
        </noscript>
      )}

      <div className="mt-6 text-center">
        <Link
          href={`/create?group=${group.slug}`}
          className="inline-block px-6 py-3 rounded-full bg-btn text-white text-sm font-medium"
        >
          Create a {group.name} quiz
        </Link>
      </div>

      {relatedQuizzes.length > 0 && (
        <section className="mt-12 pt-8 border-t border-[var(--border)]">
          <h2 className="text-base font-medium text-[var(--text-primary)] mb-4">
            Fans of {group.name} also play
          </h2>
          <div className="flex flex-col sm:flex-row gap-3">
            {relatedQuizzes.map(quiz => (
              <Link
                key={quiz.id}
                href={`/q/${quiz.slug}`}
                className="flex-1 border border-[var(--border)] rounded-lg p-3 hover:border-[var(--border)] transition-colors"
              >
                <div className="flex items-center gap-2 mb-2">
                  {quiz.group_logo_url && (
                    <img src={quiz.group_logo_url} alt={`${quiz.group_name} logo`} className="w-5 h-5 rounded object-contain" />
                  )}
                  <span className="text-xs font-medium" style={{ color: quiz.group_text_color }}>
                    {quiz.group_name}
                  </span>
                </div>
                <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                  {quiz.title}
                </p>
                <p className="text-[11px] text-[var(--text-tertiary)] mt-1">
                  {formatCount(quiz.play_count)} plays · {quiz.difficulty}
                </p>
              </Link>
            ))}
          </div>
          <div className="flex gap-2 mt-3">
            {relatedSlugs.map(slug => (
              <Link
                key={slug}
                href={`/${slug}-quiz`}
                className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                All {RELATED_GROUP_NAMES[slug]} quizzes &rarr;
              </Link>
            ))}
          </div>
        </section>
      )}

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name: `${group.name} Quizzes`,
            description: intro,
            url: `https://kpopquiz.org/${group.slug}-quiz`,
            mainEntity: {
              '@type': 'ItemList',
              numberOfItems: group.quiz_count,
              itemListElement: initialQuizzes.slice(0, 10).map((q, i) => ({
                '@type': 'ListItem',
                position: i + 1,
                url: `https://kpopquiz.org/q/${q.slug}`,
                name: q.title,
              })),
            },
          }),
        }}
      />
      {/* BreadcrumbList JSON-LD is emitted by <Breadcrumbs> above (Home › Group Quiz). */}
    </div>
  );
}
