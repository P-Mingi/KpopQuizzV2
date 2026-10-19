import Image from 'next/image';
import Link from 'next/link';

import { UxAvatar } from '@/components/ux-v1/avatar';
import { UxButton, UxLink } from '@/components/ux-v1/button';
import { Icon } from '@/components/ux-v1/icon';
import { UxPage } from '@/components/ux-v1/page';
import { UxRow } from '@/components/ux-v1/panel';
import { PersonName } from '@/components/ux-v1/person-name';
import { SectionHeader } from '@/components/ux-v1/section-header';
import { buildGroupFaqs, generateDefaultIntro } from '@/app/(site)/[slug]/group-quiz-page';
import { getGroupArticleLinks } from '@/lib/articles/group-links';
import { getLevelInfo } from '@/lib/constants';
import { formatContentMonth, getGroupContentDate } from '@/lib/db/queries/group-freshness';
import {
  getGroupActiveComeback,
  getGroupBlindtestInfo,
  getGroupFanKnowledge,
  getGroupMvPulse,
  getGroupNameAllGame,
  getGroupWarRank,
} from '@/lib/db/queries/group-hub';
import { getQuizzesByGroup } from '@/lib/db/queries/quizzes';
import { getRelatedQuizzes } from '@/lib/db/queries/related-quizzes';
import { hasTriviaPage } from '@/lib/db/queries/trivia';
import { getTitleForLevel } from '@/lib/level-titles';
import { RELATED_GROUPS } from '@/lib/related-groups';
import { buildAnswerChunks, buildAnswerFirst } from '@/lib/seo/answer-first';
import { groupPhotoUrl } from '@/lib/ux-v1/a0/group-photos';
import { QUIZ_TYPE_ICON } from '@/lib/ux-v1/a0/icons';
import { getGroupCommentsWithTeam, getGroupsIndex, getHubQuizzes, getPlayableSongs } from '@/lib/ux-v1/p3/data';
import { mergeHubFaqs } from '@/lib/ux-v1/p3/faq';
import { READ_FAILED, failClosed, failedReads, read } from '@/lib/ux-v1/p3/reads';
import { verseSpaceOpen } from '@/lib/ux-v1/p3/verse';
import {
  categoryTexts,
  commentLine,
  coarseAge,
  debutYearOf,
  hubCommunityDoor,
  hubEyebrow,
  hubFacts,
  isCategoryGroup,
  knowSubject,
  quizzesLabel,
  realFandomName,
} from '@/lib/ux-v1/p3/model';
import { isUxV12 } from '@/lib/ux-v12';
import { jsonLdScript } from '@/lib/verse/jsonld';

import { GroupAvatar } from './group-avatar';
import { HubGrowth } from './hub-growth';
import { HubNotifyLoader, HubQuizzesLoader } from './loader';
import { MemberTiles } from './member-tiles';

import type { Group } from '@/lib/db/types';

import type { HubSlots } from './hub-slots';

type GroupRow = Group & { inception_date?: string | null; record_label?: string | null };

/** The origin of the kpop site: what the JSON-LD of today's hub prints. A site that passes slots passes its own. */
const KPOP_ORIGIN = 'https://kpopquiz.org';

const PHOTO_SIZES = '(max-width: 760px) calc(100vw - 40px), (max-width: 1100px) 50vw, 520px';

/**
 * The v11 group hub, /<slug>-quiz (prototype #hub, DESIGN-SPEC 16.7 group hub +
 * 17.3, 15.1 where 16/17 point). Server component: the route stays ISR and
 * everything a crawler reads is in the HTML.
 *
 * SEO lock (brief + 16.10): metadata (shared generateGroupQuizMetadata), the H1
 * text, the intro, the answer-first block, the FAQ questions and answers, and the
 * BreadcrumbList / FAQPage / CollectionPage / ItemList JSON-LD are today's, built
 * by today's functions from today's reads. Every <a href> of today's hub is here
 * too (quizzes, trivia, blindtest, related groups and their top quizzes, articles,
 * top fans, the Verse space, create, the war link). Counts shown in the new UI
 * come from published quizzes (getHubQuizzes), never groups.quiz_count.
 *
 * `slots` (rule 18): the optional slots another site fills from its own page (the
 * anime series hub: its header facts, title card, spoiler shield, quizzes grouped by
 * arc, characters, openings, FAQ). Without it every line below is today's kpop hub:
 * the kpop-only reads are skipped only when slots are given, and each slot replaces
 * or adds exactly one node at a place that keeps the kpop tree (and its useId values)
 * as it was.
 */
export async function GroupHubV11({ group, slots }: { group: Group; slots?: HubSlots }): Promise<React.ReactElement> {
  const g = group as GroupRow;
  const relatedSlugs = RELATED_GROUPS[g.slug] ?? [];
  const origin = slots?.origin ?? KPOP_ORIGIN;

  // Every read fails closed (reads.ts): a read that failed or timed out never
  // reaches the ISR cache as an empty block, a hub without its quizzes, an FAQ
  // without its facts or a side column without today's links.
  const r = {
    // Today's reads (same functions, same args): they feed the locked SEO parts.
    initialQuizzes: read(getQuizzesByGroup(g.id, 'popular', 0, 10), '[group-hub v11] getQuizzesByGroup'),
    newestQuizzes: read(getQuizzesByGroup(g.id, 'newest', 0, 5), '[group-hub v11] getNewestByGroup'),
    relatedQuizzes: read(getRelatedQuizzes(relatedSlugs), '[group-hub v11] getRelatedQuizzes'),
    triviaAvailable: read(slots ? Promise.resolve(slots.triviaAvailable) : hasTriviaPage(g.id, g.slug), '[group-hub v11] hasTriviaPage'),
    nameAllGame: read(slots ? Promise.resolve(null) : getGroupNameAllGame(g.id), '[group-hub v11] getGroupNameAllGame'),
    blindtest: read(slots ? Promise.resolve({ qualifies: false, songs: 0 }) : getGroupBlindtestInfo(g.id), '[group-hub v11] getGroupBlindtestInfo'),
    warRank: read(slots ? Promise.resolve(null) : getGroupWarRank(g.slug), '[group-hub v11] getGroupWarRank'),
    fanKnowledge: read(getGroupFanKnowledge(g.id, g.slug), '[group-hub v11] getGroupFanKnowledge'),
    comeback: read(slots ? Promise.resolve(null) : getGroupActiveComeback(g.id), '[group-hub v11] getGroupActiveComeback'),
    mvPulse: read(slots ? Promise.resolve(null) : getGroupMvPulse(g.id), '[group-hub v11] getGroupMvPulse'),
    contentDate: read(getGroupContentDate(g.id), '[group-hub v11] getGroupContentDate'),
    // v11 reads (lib/ux-v1/p3/data.ts).
    quizzes: read(getHubQuizzes(g.id), '[group-hub v11] getHubQuizzes'),
    index: read(slots ? Promise.resolve([]) : getGroupsIndex(), '[group-hub v11] getGroupsIndex'),
    playable: read(slots ? Promise.resolve({} as Record<string, number>) : getPlayableSongs(), '[group-hub v11] getPlayableSongs'),
    comments: read(getGroupCommentsWithTeam(g.id), '[group-hub v11] getGroupComments'),
  };
  const got = Object.fromEntries(await Promise.all(Object.entries(r).map(async ([k, p]) => [k, await p] as const))) as { [K in keyof typeof r]: Awaited<(typeof r)[K]> };
  await failClosed(`/${g.slug}-quiz`, failedReads(got));
  // Reached with a failed read only in a degraded `next build` prerender, which
  // never happens for hubs (no build-time params); the fallbacks keep types sound.
  const ok = <T,>(v: T | typeof READ_FAILED, fallback: T): T => (v === READ_FAILED ? fallback : v);
  const initialQuizzes = ok(got.initialQuizzes, []);
  const newestQuizzes = ok(got.newestQuizzes, []);
  const relatedQuizzes = ok(got.relatedQuizzes, []);
  const triviaAvailable = ok(got.triviaAvailable, false);
  // General K-pop is a category, not a group (owner, 2026-10-06): no members, no
  // group texts. The six name-all games once filed under it now belong to their groups.
  const category = isCategoryGroup(g.slug);
  const nameAllGame = category ? null : ok(got.nameAllGame, null);
  const blindtest = ok(got.blindtest, { qualifies: false, songs: 0 });
  const warRank = ok(got.warRank, null);
  const fanKnowledge = ok(got.fanKnowledge, { masteredCount: 0, avgAccuracy: null, trackedPlays: 0, topFans: [] });
  const comeback = ok(got.comeback, null);
  const mvPulse = ok(got.mvPulse, null);
  const contentDate = ok(got.contentDate, null);
  const quizzes = ok(got.quizzes, []);
  const index = ok(got.index, []);
  const playable = ok(got.playable, {} as Record<string, number>);
  const comments = ok(got.comments, []);

  const memberCount = nameAllGame?.count ?? null;
  // The full published list (read fail-closed): its length is the real count.
  const published = quizzes.length;
  const cat = category ? categoryTexts(g.name, published) : null;
  const intro = slots ? slots.intro : cat ? cat.intro : g.seo_intro || generateDefaultIntro(g);
  const hasQuizzes = published > 0;
  const isEmptyGroup = !hasQuizzes;
  const topSlug = initialQuizzes[0]?.slug ?? quizzes[0]?.slug ?? null;
  const songs = playable[g.slug] ?? 0;
  const photo = groupPhotoUrl(g.slug);
  const fandom = realFandomName(g.fandom_name);

  // No label until it is sourced (see lib/seo/answer-first.ts; owner, 2026-10-14).
  const eyebrow = slots ? slots.eyebrow : hubEyebrow({ fandom: g.fandom_name, generation: g.generation ?? null, label: null, quizzes: published });
  const facts = hubFacts({ members: memberCount, debutYear: debutYearOf(g.inception_date), quizzes: published, songs });

  // Today's locked texts, from today's builders.
  // The category hub has its own lead and FAQ (the same array feeds the FAQPage JSON-LD).
  const groupFaqs = slots ? slots.faqs : cat ? cat.faqs : buildGroupFaqs(g, memberCount, blindtest.qualifies);
  const answerFacts = { memberCount, songCount: blindtest.songs };
  const chunks = cat || slots ? [] : buildAnswerChunks(g, answerFacts);
  const answerLead = cat ? cat.about : chunks.length > 0 ? buildAnswerFirst(g, answerFacts) : '';
  const faqItems = mergeHubFaqs(groupFaqs.length >= 2 ? groupFaqs : [], chunks);
  const updated = formatContentMonth(contentDate);
  // Articles are a kpop feature: a site that passes slots has none (the links are kpop articles).
  const articles = slots ? [] : getGroupArticleLinks(g.slug);

  // G2 play surfaces (ItemList JSON-LD), unchanged.
  const playSurfaces: Array<{ name: string; url: string }> = [
    { name: `${g.name} quizzes`, url: `${origin}/${g.slug}-quiz` },
  ];
  if (slots?.blindtest) playSurfaces.push({ name: `${g.name} blind test`, url: `${origin}${slots.blindtest.href}` });
  else if (blindtest.qualifies) playSurfaces.push({ name: `${g.name} blind test`, url: `${origin}/blindtest/group-${g.slug}` });

  // Fans also play: the related groups of today's hub, with their real counts and
  // today's top quiz of each (both links kept).
  const bySlug = new Map(index.map((x) => [x.slug, x]));
  const fans: Array<{ slug: string; name: string; photo: string | null; quizzes: number; top: (typeof relatedQuizzes)[number] | null; art?: React.ReactNode }> = relatedSlugs
    .map((slug) => {
      const x = bySlug.get(slug);
      if (!x) return null;
      const top = relatedQuizzes.find((q) => q.group_slug === slug) ?? null;
      return { ...x, top };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);
  // A site with its own related list (slots.related) shows it in the same rows, its title card in place of the avatar.
  for (const rel of slots?.related ?? []) fans.push({ slug: rel.slug, name: rel.name, photo: null, quizzes: rel.quizzes, top: null, art: rel.art });

  // SEO-3 U7 (today's hub): the 5 newest quizzes with their dates, a crawlable
  // freshness signal, shown only when they differ from the popular top 10.
  const popularSlugs = new Set(initialQuizzes.map((q) => q.slug));
  const newestDistinct = newestQuizzes.filter((q) => !popularSlugs.has(q.slug)).slice(0, 5);

  const fk = fanKnowledge;
  const showMastered = fk.masteredCount >= 3;
  const showAccuracy = fk.avgAccuracy != null;
  const showFans = fk.topFans.length >= 3;
  const masteredNoun = fandom ? `${fandom}s` : 'fans';
  const showBlindtest = slots ? Boolean(slots.blindtest) : songs > 0 || blindtest.qualifies;

  // C2-006 / C2-007: the group's Verse space is a working door only when it is
  // open (lib/ux-v1/p3/verse.ts). A parked space answers 404, so the hub neither
  // links it nor sends fans to the community editor, which only offers threads
  // for open spaces.
  const verseOpen = verseSpaceOpen(g.slug);
  const verseLink = Boolean(nameAllGame) && verseOpen;
  const communityDoor = hubCommunityDoor(verseOpen, topSlug);

  const aboutLinks = Boolean(triviaAvailable || verseLink || hasQuizzes);
  const hasMembers = Boolean(nameAllGame && nameAllGame.members.length > 0);
  const hasAbout = Boolean(answerLead || hasMembers || updated || aboutLinks);
  const art = slots?.heroArt ?? null;
  // Only a given grouping becomes a prop: without it the client island receives (and the RSC payload carries) today's props.
  const groupingProp = slots?.grouping ? { grouping: slots.grouping } : {};
  // The quizzes list with, above it, whatever the slots put there. Built here and mounted at the same place as before.
  const quizzesBlock = isUxV12() ? (
    // V12 (G8): the additions take the slot of the quizzes list, which passes
    // through untouched; the v11-only branch below is the tree as it was.
    <HubGrowth group={g} published={published} songs={songs}>
      {hasQuizzes ? <HubQuizzesLoader groupName={g.name} quizzes={quizzes} {...groupingProp} /> : null}
    </HubGrowth>
  ) : hasQuizzes ? <HubQuizzesLoader groupName={g.name} quizzes={quizzes} {...groupingProp} /> : null;
  const hasFk = showMastered || showAccuracy || showFans;
  // "From the community" is a group-with-quizzes block (the prototype's empty hub
  // hides the lower band; what stays there on an empty hub is today's SEO text and
  // links only).
  const hasSide = hasQuizzes || fans.length > 0 || Boolean(warRank) || newestDistinct.length > 0 || articles.length > 0 || hasFk || Boolean(mvPulse);
  const hasLow = hasAbout || faqItems.length > 0 || hasSide || Boolean(slots?.main);

  return (
    <UxPage width="wide" className="p3 p3-hub">
      {/* Today's BreadcrumbList (Home > Quizzes > <Group> Quiz), unchanged. */}
      {jsonLdScript({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: `${origin}/` },
          { '@type': 'ListItem', position: 2, name: 'Quizzes', item: `${origin}/quizzes` },
          { '@type': 'ListItem', position: 3, name: `${g.name} Quiz` },
        ],
      })}

      <nav className="ux-crumb p3-crumb" aria-label="Breadcrumb">
        {slots ? <Link href={slots.crumb.href}>{slots.crumb.label}</Link> : category ? <Link href="/quizzes">Quizzes</Link> : <Link href="/groups">Groups</Link>}
        <span className="p3-sep" aria-hidden="true">/</span>
        <span aria-current="page">{g.name}</span>
      </nav>

      {comeback ? (
        <Link href="#ghub-play" className="p3-comeback" aria-label={`${g.name} comeback: ${comeback.title}`}>
          <span className="p3-comeback-tag">Comeback</span>
          <span className="p3-comeback-t">{comeback.title}</span>
          <span className="p3-comeback-s">{comeback.artist} · new {comeback.kind}. Play {g.name} now</span>
        </Link>
      ) : null}

      <section className={photo || art ? 'p3-hero' : 'p3-hero is-solo'} aria-labelledby="p3-h1">
        <div className="p3-hero-main">
          <p className="p3-eyebrow">{eyebrow}</p>
          {/* The SEO H1, word for word: "<Group> Quiz - Test How Well You Know <Group>"
              ("... Know K-pop" for the General K-pop category). The first half is the
              display title, the rest its second line. */}
          <h1 id="p3-h1" className="p3-h1">
            <span className="p3-h1-main">{slots?.h1 ? slots.h1.main : <>{g.name} Quiz</>}</span>
            <span className="ux-sr"> - </span>
            <span className="p3-h1-tail">{slots?.h1 ? slots.h1.tail : <>Test How Well You Know {knowSubject(g.slug, g.name)}</>}</span>
          </h1>
          <p className="p3-lead">{intro}</p>
          <div className="p3-actions" id="ghub-play">
            {isEmptyGroup ? (
              <>
                <UxButton href={`/create?group=${g.slug}`} size="lg" icon="plus">Make the first quiz</UxButton>
                <HubNotifyLoader groupId={g.id} groupName={g.name} />
              </>
            ) : (
              <>
                {topSlug ? <UxButton href={`/q/${topSlug}`} size="lg" icon="play">{slots?.startLabel ?? 'Play the top quiz'}</UxButton> : null}
                {showBlindtest ? <UxButton href={slots?.blindtest?.href ?? `/blindtest/group-${g.slug}`} variant={topSlug ? 'ghost' : 'primary'} size="lg" icon="music">Blindtest</UxButton> : null}
              </>
            )}
          </div>
          {slots?.heroFacts ? slots.heroFacts : facts.length > 0 ? (
            <p className="p3-facts">
              {facts.map((f) => (
                <span key={`${f.pre ?? ''}${f.post ?? ''}`}>
                  {f.pre ? `${f.pre} ` : ''}<b className="ux-num">{f.value}</b>{f.post ? ` ${f.post}` : ''}
                </span>
              ))}
            </p>
          ) : null}
        </div>
        {photo ? (
          <div className="p3-photo">
            <Image src={photo} alt={g.name} fill sizes={PHOTO_SIZES} priority className="p3-photo-img" />
          </div>
        ) : art ? <div className="p3-photo">{art}</div> : null}
      </section>

      {/* Every quiz of the group is a real, server-rendered <a href> (12 cards, the
          rest in a native <details> "Show all N"): no link lives only in <noscript>. */}
      {slots?.beforeQuizzes ? <>{slots.beforeQuizzes}{quizzesBlock}</> : quizzesBlock}

      {hasLow ? (
        <div className={hasSide ? 'ux-sec p3-low' : 'ux-sec p3-low is-solo'}>
          <div className="p3-low-main">
            {slots?.main}
            {hasAbout ? (
              <section aria-labelledby="p3-about-h">
                <h2 id="p3-about-h" className="ux-h2">About {g.name}</h2>
                {answerLead ? (
                  <div className="p3-prose">
                    <p>{answerLead}</p>
                    {g.seo_intro && !category ? <p>{g.seo_intro}</p> : null}
                  </div>
                ) : null}
                {nameAllGame && nameAllGame.members.length > 0 ? (
                  <MemberTiles label={`${g.name} members`} groupName={g.name} tiles={nameAllGame.members} />
                ) : null}
                {updated && contentDate ? (
                  <p className="p3-updated">Updated <time dateTime={contentDate.slice(0, 10)}>{updated}</time></p>
                ) : null}
                {aboutLinks ? (
                  <div className="p3-links">
                    {triviaAvailable ? <UxLink href={`/${g.slug}-trivia`}><Icon name="book" />Learn before you play: {g.name} trivia</UxLink> : null}
                    {verseLink ? <UxLink href={`/verse/${g.slug}`}><Icon name="globe" />Explore the {g.fandom_name} space on Verse</UxLink> : null}
                    {hasQuizzes ? <UxLink href={`/create?group=${g.slug}`}><Icon name="plus" />Make your own {g.name} quiz</UxLink> : null}
                  </div>
                ) : null}
              </section>
            ) : null}

            {faqItems.length > 0 ? (
              <section className="p3-faq" aria-labelledby="group-faq">
                <h2 id="group-faq" className="ux-h2">{slots?.labels.faq ?? 'Questions fans ask'}</h2>
                <div className="p3-accs">
                  {faqItems.map((f, i) => (
                    <details key={f.q} className="p3-acc" open={i === 0}>
                      <summary><h3 className="p3-acc-q">{f.q}</h3><Icon name="chev" /></summary>
                      <div className="p3-acc-a">{f.a}</div>
                    </details>
                  ))}
                </div>
              </section>
            ) : null}
          </div>

          {hasSide ? <div className="p3-low-side">
            {hasQuizzes ? (
              <section aria-labelledby="p3-com-h">
                <SectionHeader id="p3-com-h" title={slots?.labels.community ?? 'From the community'} action={{ href: '/community', label: slots?.labels.communityAll ?? 'All posts' }} />
                {comments.length > 0 ? (
                  <div className="ux-rows">
                    {comments.map((c) => (
                      <UxRow
                        key={c.id}
                        href={`/q/${c.quizSlug}`}
                        lead={<UxAvatar name={c.author?.username ?? 'K'} src={c.author?.avatarUrl ?? null} size={40} team={c.author?.team} />}
                        title={`“${commentLine(c.text)}”`}
                        sub={(
                          <>
                            {c.author ? <PersonName name={c.author.username} accent={c.author.accent} font={c.author.font} showBias={false} isTeam={c.author.team} /> : 'Someone'}
                            {` on ${c.quizTitle} · ${coarseAge(c.createdAt)}`}
                          </>
                        )}
                      />
                    ))}
                  </div>
                ) : (
                  // The rows here are comments on this group's quizzes. An open space's
                  // door opens the thread editor; a parked space's door is the top quiz:
                  // its results screen takes a comment (hubCommunityDoor).
                  <p className="p3-note p3-com-empty">
                    No posts about {g.name} yet.{' '}
                    <UxLink href={communityDoor.href}>{communityDoor.label}</UxLink>
                  </p>
                )}
              </section>
            ) : null}

            {fans.length > 0 ? (
              <section className="p3-side-sec" aria-labelledby="p3-fans-h">
                <SectionHeader id="p3-fans-h" title={slots?.labels.related ?? 'Fans also play'} />
                <div className="ux-rows">
                  {fans.map((f) => (
                    <div key={f.slug} className="ux-row p3-fan">
                      <GroupAvatar name={f.name} photo={f.photo} size={40} {...(f.art ? { art: f.art } : {})} />
                      <span className="ux-row-grow">
                        <Link href={`/${f.slug}-quiz`} className="ux-rt p3-fan-name">{f.name}</Link>
                        <span className="ux-rs">
                          {quizzesLabel(f.quizzes)}
                          {f.top ? <> · <Link href={`/q/${f.top.slug}`} className="p3-fan-top">{f.top.title}</Link></> : null}
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {warRank ? (
              <p className="p3-note p3-war">
                {fandom ?? g.name} is <b>#{warRank.rank}</b> in this week&apos;s fandom war. <UxLink href="/leaderboard#fandom-war">See the war</UxLink>
              </p>
            ) : null}

            {newestDistinct.length > 0 ? (
              <section className="p3-side-sec" aria-labelledby="p3-new-h">
                <SectionHeader id="p3-new-h" title={`Newest ${g.name} quizzes`} />
                <div className="ux-rows">
                  {newestDistinct.map((q) => (
                    <UxRow
                      key={q.id}
                      href={`/q/${q.slug}`}
                      lead={<span className="p3-rowico is-type"><Icon name={QUIZ_TYPE_ICON[q.quiz_type] ?? 't-classic'} /></span>}
                      title={q.title}
                      end={(
                        <time dateTime={q.created_at.slice(0, 10)}>
                          {new Date(q.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </time>
                      )}
                    />
                  ))}
                </div>
              </section>
            ) : null}

            {articles.length > 0 ? (
              <section className="p3-side-sec" aria-labelledby="p3-read-h">
                <SectionHeader id="p3-read-h" title={`Read more about ${g.name}`} />
                <div className="ux-rows">
                  {articles.map((a) => (
                    <UxRow key={a.slug} href={`/articles/${a.slug}`} lead={<span className="p3-rowico"><Icon name="book" /></span>} title={a.label} />
                  ))}
                </div>
              </section>
            ) : null}

            {showMastered || showAccuracy || showFans ? (
              <section className="p3-side-sec" aria-labelledby="p3-fk-h">
                <SectionHeader id="p3-fk-h" title="Fan knowledge" />
                {showMastered || showAccuracy ? (
                  <p className="p3-note">
                    {showMastered ? <><b className="ux-num">{fk.masteredCount}</b> {masteredNoun} mastered {g.name}</> : null}
                    {showMastered && showAccuracy ? ' · ' : null}
                    {showAccuracy ? <><b className="ux-num">{Math.round((fk.avgAccuracy as number) * 100)}%</b> average accuracy</> : null}
                  </p>
                ) : null}
                {showFans ? (
                  <div className="ux-rows p3-fans-top" aria-label={`Top ${g.name} fans`}>
                    {fk.topFans.map((f) => {
                      const lv = getLevelInfo(f.person.xp).level;
                      return (
                        <UxRow
                          key={f.person.username}
                          href={`/u/${f.person.username}`}
                          lead={<UxAvatar name={f.person.displayName ?? f.person.username} src={f.person.avatarUrl} bg={f.person.avatarBg} fg={f.person.avatarText} size={40} />}
                          title={<PersonName name={f.person.displayName ?? f.person.username} accent={f.person.nameAccent} font={f.person.nameFont} bias={f.person.bias} />}
                          sub={`Lv ${lv} · ${getTitleForLevel(lv).en}`}
                          end={<span className="ux-num">{Math.round(f.accuracy * 100)}%</span>}
                        />
                      );
                    })}
                  </div>
                ) : null}
              </section>
            ) : null}

            {mvPulse ? (
              <p className="p3-note p3-mv">
                MV pulse: <b className="ux-num">+{mvPulse.viewsGained.toLocaleString('en-US')}</b> views this week across {mvPulse.mvCount} tracked MV{mvPulse.mvCount > 1 ? 's' : ''}. Tracked since {monthLabel(mvPulse.trackedSince)}.
              </p>
            ) : null}
          </div> : null}
        </div>
      ) : null}

      {/* Today's FAQPage (built from the same fact-gated array as the visible
          questions, so the markup and the page agree). */}
      {groupFaqs.length >= 2 ? jsonLdScript({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: groupFaqs.map((f) => ({
          '@type': 'Question',
          name: f.q,
          acceptedAnswer: { '@type': 'Answer', text: f.text },
        })),
      }) : null}

      {jsonLdScript({
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: `${g.name} Quizzes`,
        description: intro,
        url: `${origin}/${g.slug}-quiz`,
        ...(contentDate ? { dateModified: contentDate.slice(0, 10) } : {}),
        mainEntity: {
          '@type': 'ItemList',
          numberOfItems: g.quiz_count,
          itemListElement: initialQuizzes.slice(0, 10).map((q, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            url: `${origin}/q/${q.slug}`,
            name: q.title,
          })),
        },
      })}
      {jsonLdScript({
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: `Ways to play ${g.name} on ${slots?.brand ?? 'KpopQuiz'}`,
        itemListElement: playSurfaces.map((s, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          url: s.url,
          name: s.name,
        })),
      })}
    </UxPage>
  );
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function monthLabel(ymd: string): string {
  const [y, m] = ymd.split('-');
  return `${MONTHS[Number(m) - 1] ?? ''} ${y}`.trim();
}
