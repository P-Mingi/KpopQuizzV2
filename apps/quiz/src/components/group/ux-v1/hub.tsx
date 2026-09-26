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
import { safeFetch } from '@/lib/error-handling';
import { formatContentMonth, getGroupContentDate } from '@/lib/db/queries/group-freshness';
import {
  getGroupActiveComeback,
  getGroupBlindtestInfo,
  getGroupFanKnowledge,
  getGroupMvPulse,
  getGroupNameAllGame,
  getGroupWarRank,
} from '@/lib/db/queries/group-hub';
import { getGroupQuizLinks, getQuizzesByGroup } from '@/lib/db/queries/quizzes';
import { getRelatedQuizzes } from '@/lib/db/queries/related-quizzes';
import { hasTriviaPage } from '@/lib/db/queries/trivia';
import { getTitleForLevel } from '@/lib/level-titles';
import { RELATED_GROUPS } from '@/lib/related-groups';
import { buildAnswerChunks, buildAnswerFirst } from '@/lib/seo/answer-first';
import { groupPhotoUrl } from '@/lib/ux-v1/a0/group-photos';
import { QUIZ_TYPE_ICON } from '@/lib/ux-v1/a0/icons';
import { getGroupComments, getGroupsIndex, getHubQuizzes, getPlayableSongs } from '@/lib/ux-v1/p3/data';
import { mergeHubFaqs } from '@/lib/ux-v1/p3/faq';
import {
  commentLine,
  coarseAge,
  debutYearOf,
  hubEyebrow,
  hubFacts,
  quizzesLabel,
  realFandomName,
} from '@/lib/ux-v1/p3/model';
import { jsonLdScript } from '@/lib/verse/jsonld';

import { GroupAvatar } from './group-avatar';
import { HubNotifyLoader, HubQuizzesLoader } from './loader';

import type { Group, QuizCardData } from '@/lib/db/types';
import type { HubQuiz } from '@/lib/ux-v1/p3/model';

type GroupRow = Group & { inception_date?: string | null; record_label?: string | null };

/** Today's card row as a hub quiz (fallback list when the full read failed). */
function toHubQuiz(q: QuizCardData): HubQuiz {
  return {
    slug: q.slug,
    title: q.title,
    quiz_type: q.quiz_type,
    difficulty: q.difficulty,
    play_count: q.play_count,
    like_count: q.like_count,
    total_score_sum: q.total_score_sum,
    total_completions: q.total_completions,
    question_count: q.question_count,
    created_at: q.created_at,
  };
}

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
 */
export async function GroupHubV11({ group }: { group: Group }): Promise<React.ReactElement> {
  const g = group as GroupRow;
  const relatedSlugs = RELATED_GROUPS[g.slug] ?? [];

  const [
    initialQuizzes, newestQuizzes, allQuizLinks, relatedQuizzes, triviaAvailable, nameAllGame, blindtest,
    warRank, fanKnowledge, comeback, mvPulse, contentDate, quizzes, index, playable, comments,
  ] = await Promise.all([
    // Today's reads (same functions, same args): they feed the locked SEO parts.
    safeFetch(getQuizzesByGroup(g.id, 'popular', 0, 10), [], '[group-hub v11] getQuizzesByGroup'),
    safeFetch(getQuizzesByGroup(g.id, 'newest', 0, 5), [], '[group-hub v11] getNewestByGroup'),
    safeFetch(getGroupQuizLinks(g.id), [], '[group-hub v11] getGroupQuizLinks'),
    safeFetch(getRelatedQuizzes(relatedSlugs), [], '[group-hub v11] getRelatedQuizzes'),
    safeFetch(hasTriviaPage(g.id, g.slug), false, '[group-hub v11] hasTriviaPage'),
    safeFetch(getGroupNameAllGame(g.id), null, '[group-hub v11] getGroupNameAllGame'),
    safeFetch(getGroupBlindtestInfo(g.id), { qualifies: false, songs: 0 }, '[group-hub v11] getGroupBlindtestInfo'),
    safeFetch(getGroupWarRank(g.slug), null, '[group-hub v11] getGroupWarRank'),
    safeFetch(getGroupFanKnowledge(g.id, g.slug), { masteredCount: 0, avgAccuracy: null, trackedPlays: 0, topFans: [] }, '[group-hub v11] getGroupFanKnowledge'),
    safeFetch(getGroupActiveComeback(g.id), null, '[group-hub v11] getGroupActiveComeback'),
    safeFetch(getGroupMvPulse(g.id), null, '[group-hub v11] getGroupMvPulse'),
    safeFetch(getGroupContentDate(g.id), null, '[group-hub v11] getGroupContentDate'),
    // v11 reads (lib/ux-v1/p3/data.ts).
    // null = the read failed (never mistaken for "no quiz yet").
    safeFetch<HubQuiz[] | null>(getHubQuizzes(g.id), null, '[group-hub v11] getHubQuizzes'),
    safeFetch(getGroupsIndex(), [], '[group-hub v11] getGroupsIndex'),
    safeFetch(getPlayableSongs(), {} as Record<string, number>, '[group-hub v11] getPlayableSongs'),
    safeFetch(getGroupComments(g.id), [], '[group-hub v11] getGroupComments'),
  ]);

  const intro = g.seo_intro || generateDefaultIntro(g);
  const memberCount = nameAllGame?.count ?? null;
  // Fail closed: when the full list read failed but today's reads did not, the
  // hub still lists what it has (never the empty state for a group with quizzes).
  // getGroupQuizLinks is every published quiz of the group, so its length is the
  // same real count as the full list.
  const list: HubQuiz[] = quizzes && quizzes.length > 0 ? quizzes : initialQuizzes.map(toHubQuiz);
  const published = Math.max(quizzes?.length ?? 0, allQuizLinks.length, list.length);
  const hasQuizzes = published > 0;
  // The empty state when the full read answered "no published quiz"; when that read
  // failed, only when the (over-counting) column also says 0: a DB blip must never
  // turn a group with quizzes into "Make the first quiz".
  const isEmptyGroup = !hasQuizzes && (quizzes !== null || g.quiz_count === 0);
  const topSlug = initialQuizzes[0]?.slug ?? list[0]?.slug ?? null;
  const songs = playable[g.slug] ?? 0;
  const photo = groupPhotoUrl(g.slug);
  const fandom = realFandomName(g.fandom_name);

  const eyebrow = hubEyebrow({ fandom: g.fandom_name, generation: g.generation ?? null, label: g.record_label ?? null, quizzes: published });
  const facts = hubFacts({ members: memberCount, debutYear: debutYearOf(g.inception_date), quizzes: published, songs });

  // Today's locked texts, from today's builders.
  const groupFaqs = buildGroupFaqs(g, memberCount, blindtest.qualifies);
  const answerFacts = { memberCount, songCount: blindtest.songs };
  const chunks = buildAnswerChunks(g, answerFacts);
  const answerLead = chunks.length > 0 ? buildAnswerFirst(g, answerFacts) : '';
  const faqItems = mergeHubFaqs(groupFaqs.length >= 2 ? groupFaqs : [], chunks);
  const updated = formatContentMonth(contentDate);
  const articles = getGroupArticleLinks(g.slug);

  // G2 play surfaces (ItemList JSON-LD), unchanged.
  const playSurfaces: Array<{ name: string; url: string }> = [
    { name: `${g.name} quizzes`, url: `https://kpopquiz.org/${g.slug}-quiz` },
  ];
  if (blindtest.qualifies) playSurfaces.push({ name: `${g.name} blind test`, url: `https://kpopquiz.org/blindtest/group-${g.slug}` });

  // Fans also play: the related groups of today's hub, with their real counts and
  // today's top quiz of each (both links kept).
  const bySlug = new Map(index.map((x) => [x.slug, x]));
  const fans = relatedSlugs
    .map((slug) => {
      const x = bySlug.get(slug);
      if (!x) return null;
      const top = relatedQuizzes.find((q) => q.group_slug === slug) ?? null;
      return { ...x, top };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  // SEO-3 U7 (today's hub): the 5 newest quizzes with their dates, a crawlable
  // freshness signal, shown only when they differ from the popular top 10.
  const popularSlugs = new Set(initialQuizzes.map((q) => q.slug));
  const newestDistinct = newestQuizzes.filter((q) => !popularSlugs.has(q.slug)).slice(0, 5);

  const fk = fanKnowledge;
  const showMastered = fk.masteredCount >= 3;
  const showAccuracy = fk.avgAccuracy != null;
  const showFans = fk.topFans.length >= 3;
  const masteredNoun = fandom ? `${fandom}s` : 'fans';
  const showBlindtest = songs > 0 || blindtest.qualifies;

  const aboutLinks = Boolean(triviaAvailable || nameAllGame || hasQuizzes);
  const hasMembers = Boolean(nameAllGame && nameAllGame.members.length > 0);
  const hasAbout = Boolean(answerLead || hasMembers || updated || aboutLinks);
  const hasFk = showMastered || showAccuracy || showFans;
  // "From the community" is a group-with-quizzes block (the prototype's empty hub
  // hides the lower band; what stays there on an empty hub is today's SEO text and
  // links only).
  const hasSide = hasQuizzes || fans.length > 0 || Boolean(warRank) || newestDistinct.length > 0 || articles.length > 0 || hasFk || Boolean(mvPulse);
  const hasLow = hasAbout || faqItems.length > 0 || hasSide;

  return (
    <UxPage width="wide" className="p3 p3-hub">
      {/* Today's BreadcrumbList (Home > Quizzes > <Group> Quiz), unchanged. */}
      {jsonLdScript({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://kpopquiz.org/' },
          { '@type': 'ListItem', position: 2, name: 'Quizzes', item: 'https://kpopquiz.org/quizzes' },
          { '@type': 'ListItem', position: 3, name: `${g.name} Quiz` },
        ],
      })}

      <nav className="ux-crumb p3-crumb" aria-label="Breadcrumb">
        <Link href="/groups">Groups</Link>
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

      <section className={photo ? 'p3-hero' : 'p3-hero is-solo'} aria-labelledby="p3-h1">
        <div className="p3-hero-main">
          <p className="p3-eyebrow">{eyebrow}</p>
          {/* The SEO H1, word for word: "<Group> Quiz - Test How Well You Know <Group>".
              The first half is the display title, the rest its second line. */}
          <h1 id="p3-h1" className="p3-h1">
            <span className="p3-h1-main">{g.name} Quiz</span>
            <span className="ux-sr"> - </span>
            <span className="p3-h1-tail">Test How Well You Know {g.name}</span>
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
                {topSlug ? <UxButton href={`/q/${topSlug}`} size="lg" icon="play">Play the top quiz</UxButton> : null}
                {showBlindtest ? <UxButton href={`/blindtest/group-${g.slug}`} variant={topSlug ? 'ghost' : 'primary'} size="lg" icon="music">Blindtest</UxButton> : null}
              </>
            )}
          </div>
          {facts.length > 0 ? (
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
        ) : null}
      </section>

      {list.length > 0 ? (
        <HubQuizzesLoader groupName={g.name} groupSlug={g.slug} quizzes={list} total={published} />
      ) : !isEmptyGroup ? (
        <p className="ux-sec ux-empty">The {g.name} quizzes could not be loaded right now.</p>
      ) : null}

      {/* SEO Fix 3 (today's markup): a crawlable link to EVERY quiz of the group. */}
      {allQuizLinks.length > 0 && (
        <noscript>
          <nav aria-label={`All ${g.name} quizzes`}>
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

      {hasLow ? (
        <div className={hasSide ? 'ux-sec p3-low' : 'ux-sec p3-low is-solo'}>
          <div className="p3-low-main">
            {hasAbout ? (
              <section aria-labelledby="p3-about-h">
                <h2 id="p3-about-h" className="ux-h2">About {g.name}</h2>
                {answerLead ? (
                  <div className="p3-prose">
                    <p>{answerLead}</p>
                    {g.seo_intro ? <p>{g.seo_intro}</p> : null}
                  </div>
                ) : null}
                {nameAllGame && nameAllGame.members.length > 0 ? (
                  <ul className="p3-members" aria-label={`${g.name} members`}>
                    {nameAllGame.members.map((m) => (
                      <li key={m.name}>
                        {m.photoUrl && m.photoUrl.startsWith('/') ? (
                          <Image className="p3-member-face" src={m.photoUrl} alt={`${m.name} of ${g.name}`} width={56} height={56} sizes="56px" />
                        ) : m.photoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element -- a non-local roster photo keeps today's plain img
                          <img className="p3-member-face" src={m.photoUrl} alt={`${m.name} of ${g.name}`} width={56} height={56} loading="lazy" />
                        ) : (
                          <span className="p3-member-face is-ini" aria-hidden="true">{m.name.slice(0, 2).toUpperCase()}</span>
                        )}
                        <span>{m.name}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
                {updated && contentDate ? (
                  <p className="p3-updated">Updated <time dateTime={contentDate.slice(0, 10)}>{updated}</time></p>
                ) : null}
                {aboutLinks ? (
                  <div className="p3-links">
                    {triviaAvailable ? <UxLink href={`/${g.slug}-trivia`}><Icon name="book" />Learn before you play: {g.name} trivia</UxLink> : null}
                    {nameAllGame ? <UxLink href={`/verse/${g.slug}`}><Icon name="globe" />Explore the {g.fandom_name} space on Verse</UxLink> : null}
                    {hasQuizzes ? <UxLink href={`/create?group=${g.slug}`}><Icon name="plus" />Make your own {g.name} quiz</UxLink> : null}
                  </div>
                ) : null}
              </section>
            ) : null}

            {faqItems.length > 0 ? (
              <section className="p3-faq" aria-labelledby="group-faq">
                <h2 id="group-faq" className="ux-h2">Questions fans ask</h2>
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
                <SectionHeader id="p3-com-h" title="From the community" action={{ href: '/community', label: 'All posts' }} />
                {comments.length > 0 ? (
                  <div className="ux-rows">
                    {comments.map((c) => (
                      <UxRow
                        key={c.id}
                        href={`/q/${c.quizSlug}`}
                        lead={<UxAvatar name={c.author?.username ?? 'K'} src={c.author?.avatarUrl ?? null} size={40} />}
                        title={`“${commentLine(c.text)}”`}
                        sub={(
                          <>
                            {c.author ? <PersonName name={c.author.username} accent={c.author.accent} font={c.author.font} showBias={false} /> : 'Someone'}
                            {` on ${c.quizTitle} · ${coarseAge(c.createdAt)}`}
                          </>
                        )}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="p3-note p3-com-empty">No posts about {g.name} yet. <UxLink href="/community">Start the first thread</UxLink></p>
                )}
              </section>
            ) : null}

            {fans.length > 0 ? (
              <section className="p3-side-sec" aria-labelledby="p3-fans-h">
                <SectionHeader id="p3-fans-h" title="Fans also play" />
                <div className="ux-rows">
                  {fans.map((f) => (
                    <div key={f.slug} className="ux-row p3-fan">
                      <GroupAvatar name={f.name} photo={f.photo} size={40} />
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
        url: `https://kpopquiz.org/${g.slug}-quiz`,
        ...(contentDate ? { dateModified: contentDate.slice(0, 10) } : {}),
        mainEntity: {
          '@type': 'ItemList',
          numberOfItems: g.quiz_count,
          itemListElement: initialQuizzes.slice(0, 10).map((q, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            url: `https://kpopquiz.org/q/${q.slug}`,
            name: q.title,
          })),
        },
      })}
      {jsonLdScript({
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: `Ways to play ${g.name} on KpopQuiz`,
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
