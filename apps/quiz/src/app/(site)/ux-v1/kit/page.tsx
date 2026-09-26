import { Suspense } from 'react';
import { notFound } from 'next/navigation';

import { UxButton, UxIconButton, UxLink } from '@/components/ux-v1/button';
import { BadgeMedal, MedalTile, RarityFrame, RarityKey } from '@/components/ux-v1/badge-medal';
import { UxAvatar } from '@/components/ux-v1/avatar';
import { Icon } from '@/components/ux-v1/icon';
import { UxPage } from '@/components/ux-v1/page';
import { Panel, PinnedRow, UxBox, UxRow, UxStatsRow } from '@/components/ux-v1/panel';
import { PersonName } from '@/components/ux-v1/person-name';
import { PostAction, PostCard, ReplyScores, ScoreChip } from '@/components/ux-v1/post-card';
import { LevelBars, UxQuizCard, UxQuizGrid } from '@/components/ux-v1/quiz-card';
import { SectionHeader } from '@/components/ux-v1/section-header';
import { TextCard, TextCardGrid } from '@/components/ux-v1/text-card';
import { getNewQuizzes, getTrendingQuizzes } from '@/lib/db/queries/quizzes';
import { UX_V1 } from '@/lib/ux-v1';
import { groupPhotoUrl } from '@/lib/ux-v1/a0/group-photos';
import { UX_ICONS } from '@/lib/ux-v1/a0/icons';
import { RARITY_ORDER } from '@/lib/badges';

import { KitAuthProbeLate } from './kit-auth-probe-late';
import { KitControls, KitFeedback, KitForms, KitPopovers, KitSheets } from './kit-demos';
import { KitLinkControls, KitLinkControlsView } from './kit-link-controls';

import type { Metadata } from 'next';
import type { QuizCardData } from '@/lib/db/types';
import type { UxIconName } from '@/lib/ux-v1/a0/icons';

// /ux-v1/kit: the v11.2 foundation gallery (worker prompt, Phase 1). Every shared
// component in every state, for C1 and the page agents. Flag-on only (404 flag
// off), noindex, not in the sitemap. Quiz cards use REAL quizzes (read only).

export const metadata: Metadata = {
  title: 'UX kit',
  robots: { index: false, follow: false },
};

export const revalidate = 3600;

async function realQuizzes(): Promise<QuizCardData[]> {
  try {
    const [trending, fresh] = await Promise.all([getTrendingQuizzes(0, 8), getNewQuizzes(0, 30)]);
    const seen = new Set<string>();
    return [...trending, ...fresh].filter((q) => (seen.has(q.id) ? false : (seen.add(q.id), true)));
  } catch {
    return []; // DB blip: the gallery still renders every non-data section
  }
}

const SWATCHES = ['page', 'surface', 'surface-2', 'raised', 'line', 'line-2', 'edge', 'pink-line', 'input', 'ink', 'muted', 'pink', 'pink-fill', 'pink-ink', 'pink-soft', 'pink-soft-ink', 'ok', 'no', 'warn', 'hl', 'bulb', 'qotd-edge', 'lav-soft', 'lav-ink'];

// The 17.8 badge set, as in the prototype (earned = component state for the gallery).
const BADGES: { id: string; name: string; desc: string; earned: boolean }[] = [
  { id: 'perfect_score', name: 'Perfect score', desc: 'Score 100% on any quiz', earned: true },
  { id: 'streak_7', name: 'Streak: 7 days', desc: 'Reach a 7 day play streak', earned: true },
  { id: 'creator_bronze', name: 'Creator: Bronze', desc: 'Bronze creator tier', earned: true },
  { id: 'golden_ear_5', name: 'Golden Ear I', desc: 'Play 5 blind tests', earned: true },
  { id: 'first_steps', name: 'First steps', desc: 'Play your first quiz', earned: true },
  { id: 'hard_mode', name: 'Hard mode', desc: 'Pass a Hard difficulty quiz', earned: true },
  { id: 'quiz_maker', name: 'Quiz maker', desc: 'Create your first quiz', earned: true },
  { id: 'marathoner_50', name: 'Marathoner II', desc: 'Play 50 quizzes', earned: true },
  { id: 'perfectionist_10', name: 'Perfectionist II', desc: 'Score 100% on 10 quizzes', earned: true },
  { id: 'debater_5', name: 'Debater I', desc: 'Cast 5 daily-debate votes', earned: true },
  { id: 'multi_stan', name: 'Multi-stan', desc: 'Play quizzes from 10+ groups', earned: true },
  { id: 'fandom_traveler_5', name: 'Fandom Traveler I', desc: 'Play quizzes from 5 fandoms', earned: true },
  { id: 'dedicated_fan', name: 'Dedicated fan', desc: 'Play 100 quizzes', earned: false },
  { id: 'quizmaker_5', name: 'Quizmaker II', desc: 'Create 5 quizzes', earned: false },
  { id: 'streak_30', name: 'Streak: 30 days', desc: 'Reach a 30 day play streak', earned: false },
  { id: 'creator_silver', name: 'Creator: Silver', desc: 'Silver creator tier', earned: false },
  { id: 'viral_hit', name: 'Viral hit', desc: 'One of your quizzes reaches 1k plays', earned: false },
  { id: 'community_star', name: 'Community star', desc: 'Receive 100 likes across your quizzes', earned: false },
  { id: 'group_master', name: 'Group master', desc: '80% accuracy over 30+ questions on one group', earned: false },
  { id: 'founding_fan', name: 'Founding fan', desc: 'Here before it was cool', earned: false },
];

function KitSection({ id, title, children }: { id: string; title: string; children: React.ReactNode }): React.ReactElement {
  return (
    <section className="ux-kit-sec" data-kit-section={id} aria-labelledby={`kit-${id}`}>
      <h2 id={`kit-${id}`}>{title}</h2>
      {children}
    </section>
  );
}

function ThemePane({ theme }: { theme: 'light' | 'dark' }): React.ReactElement {
  return (
    <div className={`ux-kit-pane ux-theme-${theme}`} data-kit-pane={theme}>
      <p className="ux-kit-label">{theme === 'light' ? 'Light' : 'Dark warm'}</p>
      <div className="ux-kit-swatches">
        {SWATCHES.map((s) => (
          <span key={s} className="ux-kit-sw"><i style={{ background: `var(--ux-${s})` }} /><code>--ux-{s}</code></span>
        ))}
      </div>
      <div className="ux-kit-row" style={{ marginTop: 16 }}>
        <UxButton icon="play">Play</UxButton>
        <UxButton variant="ghost" icon="plus">Create</UxButton>
        <UxLink href="/quizzes">See all</UxLink>
        <span className="ux-chip ux-chip-filter">True/false</span>
      </div>
      <div className="ux-kit-row" style={{ marginTop: 16 }}>
        <PersonName name="stay4life" accent="teal" bias="Felix" />
        <BadgeMedal id="perfect_score" earned size={32} />
        <BadgeMedal id="group_master" earned={false} size={32} />
      </div>
    </div>
  );
}

export default async function UxKitPage(): Promise<React.ReactElement> {
  if (!UX_V1) notFound();

  const all = await realQuizzes();
  // One card per group so a row never repeats a photo (16.8).
  const groups = new Set<string>();
  const quizzes = all.filter((q) => (groups.has(q.group_slug) ? false : (groups.add(q.group_slug), true)));
  const withCover = quizzes.filter((q) => q.cover_image_url);
  const withPhoto = quizzes.filter((q) => !q.cover_image_url && groupPhotoUrl(q.group_slug));
  const typographic = quizzes.filter((q) => !q.cover_image_url && !groupPhotoUrl(q.group_slug));
  // (named `picked`: Tailwind's content scanner read a negated call on a variable
  // named like a utility as an important utility class and added a CSS rule to
  // every flag-off page)
  const picked = [...withPhoto.slice(0, 2), ...withCover.slice(0, 1), ...typographic.slice(0, 1)];
  const gridFill = picked.length < 4 ? [...picked, ...quizzes.filter((q) => picked.indexOf(q) < 0).slice(0, 4 - picked.length)] : picked;

  return (
    <UxPage width="wide">
      <header className="ux-ph">
        <h1>UX v11.2 kit</h1>
        <p>Every shared v11 component in every state, light and dark. Flag on only, not indexed. Quiz cards show real quizzes; the other props are component states.</p>
      </header>

      <KitSection id="tokens" title="Tokens, both themes side by side">
        <div className="ux-kit-panes">
          <ThemePane theme="light" />
          <ThemePane theme="dark" />
        </div>
      </KitSection>

      <KitSection id="type" title="Type (Inter 400 / 500 / 600 / 700)">
        <p className="ux-kit-display">Free K-pop quizzes</p>
        <p className="ux-h1" style={{ marginTop: 12 }}>Page title 32 / 700</p>
        <p className="ux-h2" style={{ marginTop: 12 }}>Section title 20 / 600</p>
        <p style={{ fontSize: 16, fontWeight: 600, marginTop: 12 }}>Card title 16 / 600</p>
        <p style={{ marginTop: 8 }}>Body 16 / 1.6. Long text stays near 66 characters wide for readability.</p>
        <p className="ux-muted" style={{ fontSize: 13, marginTop: 8 }}>Meta 13, muted</p>
        <p className="ux-num" style={{ fontSize: 24, fontWeight: 700, marginTop: 8 }}>8,610</p>
      </KitSection>

      <KitSection id="buttons" title="Buttons, links, icon buttons">
        <div className="ux-kit-row">
          <UxButton size="lg" icon="play">Play the daily</UxButton>
          <UxButton icon="play">Play</UxButton>
          <UxButton size="sm">Play today&apos;s daily</UxButton>
          <UxButton disabled>Publishing...</UxButton>
        </div>
        <div className="ux-kit-row">
          <UxButton variant="ghost" size="lg" icon="redo">Play again</UxButton>
          <UxButton variant="ghost" icon="plus">Create a quiz</UxButton>
          <UxButton variant="ghost" size="sm">Follow</UxButton>
          <UxButton variant="quiet">Use the theme colour instead</UxButton>
          <UxButton variant="quiet" size="sm">Copy</UxButton>
        </div>
        <div className="ux-kit-row">
          <UxButton href="/quizzes" icon="play">Browse K-pop quizzes</UxButton>
          <UxLink href="/groups">All groups</UxLink>
          <UxLink href="/blindtest" icon="arrow">All blindtest modes</UxLink>
          <UxIconButton icon="share" label="Share" />
          <UxIconButton icon="x" label="Close" bordered />
          <kbd className="ux-kbd">/</kbd>
        </div>
        <div style={{ marginTop: 16, maxWidth: 360 }}><UxButton block>Block button</UxButton></div>
      </KitSection>

      <KitSection id="nav" title="Navigation (the live nav above is the real one), tab bar, popovers">
        <span className="ux-kit-label">Phone tab bar, Home active (static copy)</span>
        <div className="ux-kit-static" style={{ maxWidth: 420, border: '1px solid var(--ux-line)', borderRadius: 16, overflow: 'hidden' }}>
          <nav className="ux-tabbar" aria-label="Tab bar sample">
            <div className="ux-tabbar-in">
              {([['home', 'Home'], ['layers', 'Quizzes'], ['music', 'Blindtest'], ['users', 'Community'], ['user', 'You']] as [UxIconName, string][]).map(([i, l], n) => (
                <a key={l} className="ux-tab" href="#kit-nav" aria-current={n === 0 ? 'page' : undefined}><span className="ux-tpill"><Icon name={i} /></span>{l}</a>
              ))}
            </div>
          </nav>
        </div>
        <div style={{ marginTop: 24 }}><KitPopovers /></div>
      </KitSection>

      <KitSection id="section-headers" title="Section headers (pink line icon)">
        <SectionHeader icon="flame" title="Trending this week" action={{ href: '/quizzes', label: 'See all' }} />
        <SectionHeader icon="trophy" title="All time best" action={{ href: '/quizzes', label: 'Most played' }} />
        <SectionHeader icon="users" title="Groups" action={{ href: '/groups', label: 'All groups' }} />
      </KitSection>

      <KitSection id="controls" title="Tabs, segmented, dropdowns, chips">
        <KitControls />
        <Suspense fallback={<KitLinkControlsView sort="trending" type={null} />}>
          <KitLinkControls />
        </Suspense>
      </KitSection>

      <KitSection id="quiz-cards" title="Quiz cards v11.2 (real quizzes): cover, group photo, typographic cover">
        {gridFill.length ? (
          <>
            <UxQuizGrid>{gridFill.map((q, i) => <UxQuizCard key={q.id} quiz={q} priority={i < 2} />)}</UxQuizGrid>
            <span className="ux-kit-label" style={{ marginTop: 32 }}>Stacked rows (phone lists)</span>
            <UxQuizGrid stack>{gridFill.slice(0, 3).map((q) => <UxQuizCard key={q.id} quiz={q} />)}</UxQuizGrid>
          </>
        ) : <p className="ux-empty"><b>No quiz loaded</b>The read failed; the cards render when the DB answers.</p>}
        <div className="ux-kit-row" style={{ marginTop: 24 }}>
          <span className="ux-qlv"><LevelBars level={1} />Easy</span>
          <span className="ux-qlv"><LevelBars level={2} />Medium</span>
          <span className="ux-qlv"><LevelBars level={3} />Hard</span>
        </div>
      </KitSection>

      <KitSection id="text-cards" title="Text cards and rows">
        <TextCardGrid>
          {quizzes.slice(0, 3).map((q) => (
            <TextCard
              key={q.id}
              href={`/q/${q.slug}`}
              title={q.title}
              quizType={q.quiz_type}
              difficulty={q.difficulty}
              plays={q.play_count}
              averagePct={q.total_completions > 0 && q.question_count > 0 ? Math.round((q.total_score_sum / q.total_completions / q.question_count) * 100) : null}
            />
          ))}
        </TextCardGrid>
        <div className="ux-rows" style={{ marginTop: 24, maxWidth: 560 }}>
          {quizzes.slice(0, 3).map((q, i) => (
            <UxRow key={q.id} href={`/q/${q.slug}`} lead={<span className={`ux-rn${i < 3 ? ' is-top' : ''}`}>{i + 1}</span>} title={q.title} sub={`${q.group_name} · ${q.play_count.toLocaleString('en-US')} plays`} />
          ))}
        </div>
      </KitSection>

      <KitSection id="posts" title="Community post card, panels, boxes">
        <div style={{ maxWidth: 720 }}>
          <PostCard
            kind="challenge"
            chipDetail="BTS"
            title="Beat my 7/8 on the Ultimate BTS era quiz"
            href="#kit-posts"
            author={{ name: 'stay4life', accent: 'teal', bias: 'Felix' }}
            meta="Lv 9 · 20 min ago"
            excerpt={<><ScoreChip>7/8</ScoreChip>A STAY playing an ARMY quiz. Missed the Daesang year, 1:04 total. Your turn.</>}
            actions={<><PostAction icon="heart" pressed>64</PostAction><PostAction icon="msg">18</PostAction><PostAction icon="play">Take it</PostAction><PostAction icon="share" end aria-label="Share" /></>}
          >
            <ReplyScores items={[{ score: '8/8', name: 'hanjisung_fan' }, { score: '6/8', name: 'quokka_han' }, { score: '5/8', name: 'moa_bloom' }]} more={14} />
          </PostCard>
          <PostCard
            kind="thread"
            chipDetail="Stray Kids"
            title="Which album should a new STAY start with?"
            href="#kit-posts"
            author={{ name: 'kwangya_notes', accent: 'purple', font: 'mono', bias: 'Karina' }}
            meta="Lv 4 · 5 hours ago"
            excerpt="My cousin just got into them through a variety clip. I said NOEASY, my friend says Cle 1: MIROH. Settle it."
            actions={<><PostAction icon="heart" pressed={false}>27</PostAction><PostAction icon="msg">38</PostAction><PostAction icon="share" end aria-label="Share" /></>}
          />
        </div>
        <div className="ux-kit-grid2" style={{ marginTop: 16 }}>
          <Panel title="Happening now" icon="zap" aside="live" sub="Rows go here (P8).">
            <div className="ux-rows" style={{ marginTop: 8 }}>
              <UxRow lead={<UxAvatar name="blink_edits" />} title={<PersonName name="blink_edits" accent="pink" font="serif" bias="Lisa" />} sub="scored 7/8 on BLACKPINK true or false" />
            </div>
          </Panel>
          <UxBox><p className="ux-h2">About this quiz</p><p style={{ marginTop: 8 }} className="ux-muted">A bordered box: radius 20, padding 24/26.</p></UxBox>
        </div>
        <UxStatsRow items={[{ value: '8/8', label: 'You' }, { value: '61%', label: 'Average' }, { value: '1:04', label: 'Time' }]} />
        <div style={{ maxWidth: 720 }}>
          <PinnedRow rank="#95" lead={<UxAvatar name="Guest" size={40} />} end={<b className="ux-num">8,610</b>}>Your row (guest / neutral)</PinnedRow>
          <PinnedRow you rank="#12" lead={<UxAvatar name="kit_sample" size={40} />} end={<b className="ux-num">8,610</b>}><PersonName name="kit_sample" accent="pink" bias="Han" /></PinnedRow>
        </div>
        <div className="ux-empty"><b>No group matches</b>Try the All K-pop playlist.<br /><UxButton variant="ghost" size="sm">Clear filters</UxButton></div>
      </KitSection>

      <KitSection id="identity" title="Identity flair: PersonName + BiasTag">
        <div className="ux-kit-row">
          <PersonName name="default_fan" />
          <PersonName name="pink_fan" accent="pink" bias="Han" />
          <PersonName name="purple_fan" accent="purple" font="serif" bias="RM" />
          <PersonName name="blue_fan" accent="blue" font="mono" bias="Jin" />
          <PersonName name="teal_fan" accent="teal" bias="Felix" />
          <PersonName name="amber_fan" accent="amber" bias="j-hope" />
          <PersonName name="coral_fan" accent="coral" font="serif" bias="Yeonjun" />
          <PersonName name="no_bias" accent="pink" bias="" />
        </div>
        <div className="ux-personprev" style={{ marginTop: 16, maxWidth: 720 }}>
          <UxAvatar name="kit_sample" size={40} />
          <span><PersonName name="kit_sample" accent="pink" bias="Han" /><span className="ux-muted" style={{ display: 'block', fontSize: 14 }}>How you appear in Community</span></span>
        </div>
      </KitSection>

      <KitSection id="badges" title="Badge medallions: rarity frame + gradient, unique glyph, locked state">
        <RarityKey />
        <div className="ux-kit-row" style={{ marginTop: 16 }}>
          {RARITY_ORDER.map((r) => (
            <span key={r} className="ux-kit-row" style={{ gap: 6 }}>
              <BadgeMedal id={r === 'legendary' ? 'group_master' : r === 'epic' ? 'viral_hit' : r === 'rare' ? 'perfect_score' : r === 'uncommon' ? 'streak_7' : 'first_steps'} rarity={r} earned size={64} label={`${r} earned`} />
              <BadgeMedal id="founding_fan" rarity={r} earned={false} size={64} label={`${r} locked`} />
            </span>
          ))}
        </div>
        <div className="ux-kit-row" style={{ marginTop: 16 }}>
          {[64, 32, 28, 22].map((s) => <BadgeMedal key={s} id="perfect_score" earned size={s} label={`${s}px`} />)}
          <RarityFrame rarity="rare" />
        </div>
        <div className="ux-medals" style={{ marginTop: 24 }}>
          {BADGES.map((b) => <MedalTile key={b.id} id={b.id} name={b.name} description={b.desc} earned={b.earned} />)}
        </div>
      </KitSection>

      <KitSection id="forms" title="Fields, checkbox, switch">
        <KitForms />
      </KitSection>

      <KitSection id="sheets" title="Sheets: sign-in, share, header picture, confirm (+ search overlay)">
        <KitSheets />
      </KitSection>

      <KitSection id="feedback" title="Toast and live region">
        <KitFeedback />
      </KitSection>

      <KitSection id="viewer" title="Viewer state (useUxMe), hydrated late on purpose">
        <KitAuthProbeLate />
      </KitSection>

      <KitSection id="route-focus" title="Route focus (client navigation)">
        <p className="ux-help">A client navigation moves the focus to the new page H1, unless the page focuses one of its own controls when it opens.</p>
        <p><UxLink href="/ux-v1/kit/focus" data-kit="route-focus-link">Open a page that focuses its own field</UxLink></p>
      </KitSection>

      <KitSection id="icons" title="Icons (20px, 1.5 stroke)">
        <div className="ux-kit-icons">
          {(Object.keys(UX_ICONS) as UxIconName[]).filter((n) => n !== 'shield').map((n) => (
            <span key={n} title={n}><Icon name={n} /><small>{n}</small></span>
          ))}
        </div>
      </KitSection>
    </UxPage>
  );
}
