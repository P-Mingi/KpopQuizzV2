import Link from 'next/link';

import { jsonLdScript } from '@/lib/verse/jsonld';

import { getQuizzesByGroup, getGroupQuizLinks } from '@/lib/db/queries/quizzes';
import { getRelatedQuizzes } from '@/lib/db/queries/related-quizzes';
import { hasTriviaPage } from '@/lib/db/queries/trivia';
import { getGroupNameAllGame, getGroupBlindtestInfo, getGroupWarRank, getGroupFanKnowledge, getGroupActiveComeback, getGroupMvPulse } from '@/lib/db/queries/group-hub';
import { RELATED_GROUPS, RELATED_GROUP_NAMES } from '@/lib/related-groups';
import { GroupFeed } from '@/components/home/group-feed';
import { GroupHubHero, GroupPlayRow, GroupMembersStrip, GroupFanKnowledgeSection, GroupMvPulseSection, GroupComebackBanner } from '@/components/group/group-hub-sections';
import { getGroupProfiles } from '@/lib/personality/data';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { formatCount } from '@/lib/utils';
import { safeFetch } from '@/lib/error-handling';
import { getGroupArticleLinks } from '@/lib/articles/group-links';
import { countOpenRunsForGroup } from '@/lib/db/queries/open-runs';
import { OpenRunsBlock } from '@/components/group/open-runs-block';

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

  // CTR sprint W1. The 7 override groups above are inside a live GSC measurement
  // window (docs/ctr-sprint-baseline.md, re-check 2026-08-24) so they are NOT
  // touched here. The other 30 groups with quizzes all fell to one generic title
  // ("<name> Quiz - Test Your Knowledge"): no number, no reason to click. The
  // default now leads with the LIVE quiz count, so it is true by construction and
  // updates itself as the catalog grows. Singular groups (8 of them today) get
  // their own phrasing so we never render "1 Free Fan-Made Tests".
  const n = group.quiz_count;
  const title = override?.title ?? (n >= 2
    ? `${group.name} Quiz: ${n} Free Fan-Made Tests`
    : `${group.name} Quiz: Free Fan-Made Trivia Test`);

  // Bing flagged ~119 pages with meta descriptions under the ~120 char floor.
  // W2 PART D (owner ruling): `seo_intro` NO LONGER touches the meta description.
  // It used to win over the formula whenever it was >= 110 chars, which meant
  // filling it in admin would silently drop the live quiz count that earns the
  // click, inside a ~150 char budget that cannot absorb an editorial paragraph.
  // seo_intro is now additive and VISIBLE only: it renders as the intro paragraph
  // at the top of the page (see `intro` below). The CTR formula always wins here.
  const description = override
    ? `Play ${group.quiz_count}+ free ${group.name} quizzes made by fans. ${override.hook}. Start now, no sign-up.`
    : n >= 2
    ? `Play ${n} free ${group.name} quizzes made by fans. Test your knowledge of ${group.name}'s members, songs, eras, and history, then prove you are a real ${group.fandom_name}.`
    : `Play the free ${group.name} quiz made by fans. Test your knowledge of ${group.name}'s members, songs, eras, and history, then prove you are a real ${group.fandom_name}.`;

  const ogImage = `https://kpopquiz.org/api/og/group/${group.slug}`;

  return {
    title,
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

  const [initialQuizzes, newestQuizzes, relatedQuizzes, triviaAvailable, allQuizLinks, personalityProfiles, nameAllGame, blindtest, warRank, fanKnowledge, comeback, mvPulse, openRuns] = await Promise.all([
    safeFetch(getQuizzesByGroup(group.id, 'popular', 0, 10), [], '[group-quiz] getQuizzesByGroup'),
    // SEO-3 U7: SSR the 5 newest quizzes for this group. Crawlable-freshness
    // signal for Google + a discovery surface so users find new uploads before
    // Google does. Sorted by created_at DESC (see getQuizzesByGroup 'newest').
    safeFetch(getQuizzesByGroup(group.id, 'newest', 0, 5), [], '[group-quiz] getNewestByGroup'),
    safeFetch(getRelatedQuizzes(relatedSlugs), [], '[group-quiz] getRelatedQuizzes'),
    safeFetch(hasTriviaPage(group.id, group.slug), false, '[group-quiz] hasTriviaPage'),
    safeFetch(getGroupQuizLinks(group.id), [], '[group-quiz] getGroupQuizLinks'),
    safeFetch(getGroupProfiles(group.id), [], '[group-quiz] getGroupProfiles'),
    safeFetch(getGroupNameAllGame(group.id), null, '[group-quiz] getGroupNameAllGame'),
    safeFetch(getGroupBlindtestInfo(group.id), { qualifies: false, songs: 0 }, '[group-quiz] getGroupBlindtestInfo'),
    safeFetch(getGroupWarRank(group.slug), null, '[group-quiz] getGroupWarRank'),
    safeFetch(getGroupFanKnowledge(group.id, group.slug), { masteredCount: 0, avgAccuracy: null, trackedPlays: 0, topFans: [] }, '[group-quiz] getGroupFanKnowledge'),
    safeFetch(getGroupActiveComeback(group.id), null, '[group-quiz] getGroupActiveComeback'),
    safeFetch(getGroupMvPulse(group.id), null, '[group-quiz] getGroupMvPulse'),
    // W2b C1: the real number of unbeaten runs waiting on this group. Fails soft to
    // 0, which renders nothing, so a DB blip never fabricates a count.
    safeFetch(countOpenRunsForGroup(group.slug), 0, '[group-quiz] countOpenRuns'),
  ]);

  // Only show a distinct "newest" strip when it actually differs from the
  // popular list a user already sees below (otherwise it's duplicate chrome).
  const popularSlugs = new Set(initialQuizzes.map((q) => q.slug));
  const newestDistinct = newestQuizzes.filter((q) => !popularSlugs.has(q.slug)).slice(0, 5);

  const intro = group.seo_intro || generateDefaultIntro(group);

  // G2 link mesh: a gen-level popular game page for this group's generation.
  const genLink =
    group.generation === '3rd Gen'
      ? { href: '/games/name-them-all/name-all-3rd-gen-groups', label: 'Name all 3rd gen K-pop groups' }
      : group.generation === '4th Gen'
      ? { href: '/games/name-them-all/name-all-4th-gen-groups', label: 'Name all 4th gen K-pop groups' }
      : null;

  // G2 additive JSON-LD: an ItemList of this group's real play surfaces.
  const playSurfaces: Array<{ name: string; url: string }> = [
    { name: `${group.name} quizzes`, url: `https://kpopquiz.org/${group.slug}-quiz` },
  ];
  if (blindtest.qualifies) playSurfaces.push({ name: `${group.name} blind test`, url: `https://kpopquiz.org/blindtest/group-${group.slug}` });
  if (nameAllGame) playSurfaces.push({ name: `Name all ${group.name} members`, url: `https://kpopquiz.org/games/name-all/${nameAllGame.slug}` });
  if (personalityProfiles.length > 0) playSurfaces.push({ name: `Which ${group.name} member are you`, url: `https://kpopquiz.org/which-${group.slug}-member-are-you` });

  return (
    <div className="py-6">
      <Breadcrumbs
        items={[
          { label: 'Home', href: '/' },
          { label: `${group.name} Quiz` },
        ]}
      />

      {/* G2 comeback banner (above hero, gated on an active comeback in its
          first 14 days). Nothing renders when there is no active comeback. */}
      {comeback && <GroupComebackBanner group={group} comeback={comeback} />}

      <h1 className="text-xl font-medium text-primary">
        {group.name} Quiz - Test How Well You Know {group.name}
      </h1>

      <p className="text-sm text-secondary mt-2 leading-relaxed">{intro}</p>

      {/* G2 hero (upgrade in place): logo, name, generation, member count,
          quiz/plays, fandom line (real fandoms only), war-map rank when charted. */}
      <GroupHubHero group={group} memberCount={nameAllGame?.count ?? null} warRank={warRank} />

      {/* W2b C1 - the time-shifted supply, made visible. Real count, live query,
          never rounded and never floored. Renders nothing at zero. */}
      <OpenRunsBlock groupName={group.name} groupSlug={group.slug} count={openRuns} />

      {/* G2 play row: every real play surface this group has, gated per surface.
          Absorbs the old personality card + blindtest entry. */}
      <GroupPlayRow
        group={group}
        topQuizSlug={initialQuizzes[0]?.slug ?? null}
        blindtest={blindtest}
        nameAll={nameAllGame}
        hasPersonality={personalityProfiles.length > 0}
      />

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

      {/* W2.10: crawlable cross-link into the group's Verse space. */}
      {nameAllGame && (
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
      )}

      {/* V closeout: internal-link mesh into the new game modes (crawlable). */}
      <nav className="group-games-mesh mt-4" aria-label="More K-pop games">
        <span className="group-games-mesh-label">More K-pop games</span>
        <Link href="/games/sort-it">Sort K-pop groups: boy or girl, 3rd gen or 4th gen</Link>
        <Link href="/games/match-up/song-to-group">Match K-pop songs to their groups</Link>
        <Link href="/games/name-them-all/name-all-kpop-groups">Name all K-pop groups before the timer</Link>
        {genLink && <Link href={genLink.href}>{genLink.label}</Link>}
      </nav>

      <GroupFeed groupId={group.id} initialQuizzes={initialQuizzes} />

      {/* G2 members strip: roster faces from the name-all roster (real photos). */}
      {nameAllGame && <GroupMembersStrip group={group} nameAll={nameAllGame} />}

      {/* G2 fan knowledge (sub-stats individually gated; whole section hides when
          all below threshold) + MV pulse (tracked groups with a 7-day delta). */}
      <GroupFanKnowledgeSection group={group} data={fanKnowledge} />
      {mvPulse && <GroupMvPulseSection group={group} data={mvPulse} />}

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
          Make your own {group.name} quiz
        </Link>
      </div>

      {/* SEO: internal article links pass equity from group pages to /articles/ */}
      {(() => {
        const articleLinks = getGroupArticleLinks(group.slug);
        if (articleLinks.length === 0) return null;
        return (
          <section className="mt-8">
            <h2 className="text-sm font-medium text-[var(--text-secondary)] mb-3">
              Read more about {group.name}
            </h2>
            <div className="flex flex-col gap-2">
              {articleLinks.map(link => (
                <Link
                  key={link.slug}
                  href={`/articles/${link.slug}`}
                  className="text-sm text-[var(--text-primary)] hover:underline"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </section>
        );
      })()}

      {/* SEO-3 U7 - "Newest {group} quizzes" strip (SSR). Freshness signal
          for Google + discovery for users. Only rendered when the newest
          differ from the popular ordering above. */}
      {newestDistinct.length > 0 && (
        <section className="mt-8" aria-label={`Newest ${group.name} quizzes`}>
          <h2 className="text-sm font-medium text-[var(--text-secondary)] mb-3">
            Newest {group.name} quizzes
          </h2>
          <ul className="flex flex-col gap-2">
            {newestDistinct.map((q) => (
              <li key={q.id}>
                <Link
                  href={`/q/${q.slug}`}
                  className="text-sm text-[var(--text-primary)] hover:underline"
                >
                  {q.title}
                  <span className="text-[11px] text-[var(--text-tertiary)] ml-2">
                    {new Date(q.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

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

      {/* QA class 4: q.title (user-authored quiz titles) escaped at the sink. */}
      {jsonLdScript({
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
      })}
      {/* G2 additive: a SEPARATE ItemList of this group's play surfaces, so the
          existing CollectionPage block above stays byte-identical. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'ItemList',
            name: `Ways to play ${group.name} on KpopQuiz`,
            itemListElement: playSurfaces.map((s, i) => ({
              '@type': 'ListItem',
              position: i + 1,
              url: s.url,
              name: s.name,
            })),
          }),
        }}
      />
      {/* BreadcrumbList JSON-LD is emitted by <Breadcrumbs> above (Home › Group Quiz). */}
    </div>
  );
}
