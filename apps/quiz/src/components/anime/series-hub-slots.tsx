import { SpoilerShieldIsland } from '@/components/spoilers/spoiler-shield';
import { t, VOCAB_VARS } from '@/lib/anime/copy';
import { SERIES_TRIVIA_MIN, blindTestHref, groupQuizzesByArc, hubEyebrow, hubIntro, openingRows, quizLevels, safeUrl, seriesFaqs, shieldArcs, splitCharacters, storyMap, uniqueFacts, HUB_FACT_LIMIT } from '@/lib/anime/series-model';

import { CharacterTiles } from './character-tiles';
import { OpeningsTable } from './openings-table';
import { SeriesFactList } from './series-fact-list';
import { SeriesFacts } from './series-facts';
import { StoryMap } from './story-map';
import { TitleCard } from './title-card';

import type { HubSlots } from '@/components/group/ux-v1/hub-slots';
import type { GrowthWords } from '@/lib/ux-v1/p3/growth';
import type { TriviaVariant } from '@/app/(site)/[slug]/group-trivia-page';
import type { RelatedSeries, SeriesHub } from '@/lib/anime/series';
import type { Group } from '@/lib/db/types';

/** The site the slots are for: its origin and brand name (the page passes SITE.url and SITE.brand.name). */
export interface SlotSite { readonly origin: string; readonly brand: string }

/** The words of the growth blocks of the hub (ways to play, "be the first"), from the vocabulary of the anime site. */
const growthWords = (): GrowthWords => {
  const song = String(VOCAB_VARS.song);
  return { member: String(VOCAB_VARS.member), members: String(VOCAB_VARS.memberPlural), song, songs: `${song}s` };
};

const labels = (): HubSlots['labels'] => ({
  faq: t('hub.faq'),
  community: t('hub.community'),
  communityAll: t('hub.communityAll'),
  related: t('hub.related'),
});

/**
 * The anime blocks of a series hub as the slots of GroupHubV11 (rule 18: one hub component, the anime page fills its
 * slots). A1 header facts in the hero, A7 title card in its photo column, A5 shield and A2 story map above the quizzes,
 * A2 quizzes by arc through `grouping`, A3 characters, A4 openings and the facts first in the lower band, and the
 * series' own FAQ. The HTML is built for the spoiler-free view; the islands refine it from the reader's progress.
 */
export function buildSeriesSlots(hub: SeriesHub, related: readonly RelatedSeries[], site: SlotSite): HubSlots {
  const { group, series } = hub;
  const published = hub.quizzes.length;
  const facts = uniqueFacts(hub.trivia);
  const characters = splitCharacters(hub.characters, hub.oshiCounts);
  const href = blindTestHref(group.slug, hub.themes);
  return {
    origin: site.origin,
    brand: site.brand,
    crumb: { href: '/series', label: t('hub.crumbSeries') },
    eyebrow: hubEyebrow(published),
    intro: hubIntro(group.name, published, group.seo_intro),
    startLabel: t('hub.start'),
    heroArt: <TitleCard title={group.name} />,
    heroFacts: <SeriesFacts series={series} sources={hub.sources} name={group.name} />,
    blindtest: href ? { href } : null,
    triviaAvailable: facts.length >= SERIES_TRIVIA_MIN,
    beforeQuizzes: (
      <>
        <SpoilerShieldIsland seriesSlug={group.slug} groupId={group.id} arcs={shieldArcs(hub.arcs)} />
        <StoryMap nodes={storyMap(hub.arcs, hub.quizzes)} />
      </>
    ),
    grouping: {
      seriesSlug: group.slug,
      groupId: group.id,
      sections: groupQuizzesByArc(hub.quizzes, hub.arcs),
      levels: quizLevels(hub.quizzes, hub.arcs),
      labels: { heading: t('hub.quizzesByArc'), safe: t('spoiler.safeForYou'), covers: t('spoiler.covers', { arc: '{arc}' }) },
    },
    main: (
      <>
        <CharacterTiles seriesSlug={group.slug} groupId={group.id} name={group.name} open={characters.open} lockedCount={characters.lockedCount} />
        <OpeningsTable name={group.name} rows={openingRows(hub.themes)} blindTestHref={href} />
        <SeriesFactList name={group.name} facts={facts.slice(0, HUB_FACT_LIMIT)} total={facts.length} triviaHref={facts.length >= SERIES_TRIVIA_MIN ? `/${group.slug}-trivia` : null} />
      </>
    ),
    faqs: seriesFaqs(hub, site.brand),
    related: related.map((r) => ({ ...r, art: <TitleCard title={r.name} variant="mono" /> })),
    growthWords: growthWords(),
    labels: labels(),
  };
}

/** The slots of /anime-mix-quiz: the hub of the whole catalog, no series blocks (A1 to A4 are for a series). */
export function buildMixSlots(group: Group, site: SlotSite): HubSlots {
  return {
    origin: site.origin,
    brand: site.brand,
    crumb: { href: '/series', label: t('hub.crumbSeries') },
    eyebrow: hubEyebrow(group.quiz_count),
    h1: { main: t('mix.h1'), tail: t('mix.tail') },
    intro: t('mix.lede', { brand: site.brand }),
    startLabel: t('hub.start'),
    heroArt: <TitleCard title={group.name} />,
    blindtest: null,
    triviaAvailable: false,
    faqs: [],
    related: [],
    growthWords: growthWords(),
    labels: labels(),
  };
}

/** The differences of the trivia page for a series (GroupTriviaPage `variant`): its stored, sourced facts and its words. */
export function buildTriviaVariant(hub: SeriesHub, site: SlotSite): TriviaVariant {
  const name = hub.group.name;
  const facts = uniqueFacts(hub.trivia);
  return {
    facts: facts.map((f) => ({ fact: f.fact, category: f.category, sourceQuizTitle: '', sourceQuizSlug: '', sourceLabel: f.source, sourceUrl: safeUrl(f.source_url) })),
    origin: site.origin,
    brand: site.brand,
    h1: t('trivia.h1', { name }),
    subline: t('trivia.subline', { name, count: facts.length }),
    crumbQuiz: t('trivia.crumbQuiz', { name }),
    crumbTrivia: t('trivia.crumbTrivia', { name }),
    categoryTitles: {
      history: t('trivia.cat.history'),
      members: t('trivia.cat.members'),
      music: t('trivia.cat.music'),
      achievements: t('trivia.cat.achievements'),
      fun: t('trivia.cat.fun'),
    },
    ctaText: t('trivia.cta', { name }),
    ctaLink: t('trivia.play', { name }),
    sourcesTitle: t('trivia.sourcesTitle'),
    logo: <TitleCard title={name} />,
    aboutType: 'TVSeries',
  };
}
