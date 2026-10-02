import { HostTiles } from '@/components/ux-v1/answer-tiles';
import { UxAvatar } from '@/components/ux-v1/avatar';
import { UxButton } from '@/components/ux-v1/button';
import { Icon } from '@/components/ux-v1/icon';
import { LangSwitch } from '@/components/ux-v1/lang-switch';
import { PersonName } from '@/components/ux-v1/person-name';
import { PostAction, PostCard } from '@/components/ux-v1/post-card';
import { Distribution, ResultCard, Traits } from '@/components/ux-v1/result-card';
import { SectionHeader } from '@/components/ux-v1/section-header';
import { Steps3 } from '@/components/ux-v1/steps';
import { StoryPreview } from '@/components/ux-v1/story-preview';
import { TeamNote, TeamTag } from '@/components/ux-v1/team';
import { ThemeCard, ThemeRail } from '@/components/ux-v1/theme-card';
import { WaysTile, WaysTiles } from '@/components/ux-v1/ways-tile';
import { groupPhotoUrl } from '@/lib/ux-v1/a0/group-photos';

import { KitPhones, KitStoryFiles } from './kit-v12-demos';

import type { ThemeCover } from '@/components/ux-v1/theme-card';

// The v12 half of the kit (A1): every shared v12 piece in every state. Rendered by
// page.tsx only when isUxV12(). The copy and the numbers below are the pinned
// prototype's samples (docs/design/growth-v12/prototype.html), used as component
// states so the boxes can be measured against the reference; no page ships them.

const THEMES: { cover: ThemeCover; slug: string; name: string; sub: string; lead: string }[] = [
  { cover: 'hits26', slug: 'kpop-hits-2026', name: 'K-pop hits 2026', sub: 'Updated every week', lead: 'This year\'s biggest K-pop songs, added as they chart.' },
  { cover: 'gen5', slug: '5th-gen', name: '5th gen', sub: '300 songs', lead: 'The newest generation: Cortis, ILLIT, BABYMONSTER, KATSEYE, Hearts2Hearts and more.' },
  { cover: 'viral', slug: 'tiktok-viral', name: 'Viral on TikTok', sub: 'Curated', lead: 'The K-pop songs everyone danced to on TikTok.' },
  { cover: 'kpdh', slug: 'kpop-demon-hunters', name: 'KPop Demon Hunters', sub: 'Soundtrack songs', lead: 'The songs from the film, then the real K-pop they come from.' },
  { cover: 'hits25', slug: 'kpop-hits-2025', name: 'K-pop hits 2025', sub: '51 songs', lead: 'The songs that defined last year.' },
  { cover: 'gen4', slug: '4th-gen', name: '4th gen', sub: '1,097 songs', lead: 'Stray Kids, aespa, IVE, NewJeans, ITZY, ENHYPEN, TXT and more.' },
];

const STEPS = [
  { title: 'Listen', body: 'A ten-second clip plays, usually the chorus.' },
  { title: 'Pick', body: 'Four choices. Name the song, or the artist on some rounds.' },
  { title: 'Score', body: 'Right and fast wins more points. Share your score or challenge a friend.' },
];

const LANGS = [
  { code: 'en', label: 'English', href: '#kit-v12-lang' },
  { code: 'fr', label: 'Français', href: '#kit-v12-lang' },
  { code: 'es', label: 'Español', href: '#kit-v12-lang' },
  { code: 'id', label: 'Indonesia', href: '#kit-v12-lang' },
];

const OPTIONS = ['God\'s Menu', 'Thunderous', 'MANIAC', 'S-Class'];

const DIST = [
  { id: 'H', label: 'Han', pct: 17 }, { id: 'C', label: 'Bang Chan', pct: 16 }, { id: 'Y', label: 'Hyunjin', pct: 15 },
  { id: 'F', label: 'Felix', pct: 14 }, { id: 'L', label: 'Lee Know', pct: 11 }, { id: 'B', label: 'Changbin', pct: 9 },
  { id: 'S', label: 'Seungmin', pct: 9 }, { id: 'I', label: 'I.N', pct: 9 },
];

function V12Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }): React.ReactElement {
  return (
    <section className="ux-kit-sec" data-kit-section={id} data-kit-v12="" aria-labelledby={`kit-${id}`}>
      <h2 id={`kit-${id}`}>{title}</h2>
      {children}
    </section>
  );
}

export function KitV12(): React.ReactElement {
  const twice = groupPhotoUrl('twice');
  return (
    <>
      <V12Section id="v12-team" title="v12 Team badge: editorial accounts (feed card, post header, plain name)">
        <div className="ux-kit-col" data-kit="team-feed">
          <PostCard
            isTeam
            kind="thread"
            chipDetail="General K-pop"
            title="Which b-side deserves a comeback stage?"
            href="#kit-v12-team"
            author={{ name: 'Mina' }}
            meta="2 hours ago"
            excerpt="One b-side from any group that never got a music show stage. Say why in one line. The best answers go in Friday's recap."
            actions={<><PostAction icon="heart" pressed={false}>31</PostAction><PostAction icon="msg">57</PostAction><PostAction icon="share" end aria-label="Share" /></>}
          />
        </div>
        <span className="ux-kit-label">Post page header and profile: the line under the name</span>
        <div className="ux-kit-col" data-kit="team-post">
          <div className="ux-ph2">
            <UxAvatar name="Mina" size={36} team />
            <span><PersonName name="Mina" isTeam /><span className="ux-ph2-lv"> · 2 hours ago</span></span>
          </div>
          <TeamNote surface="post" />
        </div>
        <div className="ux-kit-col" data-kit="team-profile" style={{ marginTop: 24 }}>
          <div className="ux-ph2">
            <UxAvatar name="Sol" size={36} team />
            <span><PersonName name="Sol" isTeam /></span>
          </div>
          <TeamNote surface="profile" />
        </div>
        <span className="ux-kit-label" style={{ marginTop: 24 }}>Feed card with the line (PostCard teamNote), and names in a row: a team name never takes fan flair</span>
        <div className="ux-kit-col">
          <PostCard
            isTeam
            teamNote
            kind="blog"
            chipDetail="Charts and data"
            title="The hardest songs of the week"
            href="#kit-v12-team"
            author={{ name: 'Sol', accent: 'teal', font: 'mono', bias: 'Felix' }}
            meta="Yesterday"
          />
        </div>
        <div className="ux-kit-row">
          <span><PersonName name="Jae" isTeam accent="pink" bias="Han" /></span>
          <span><PersonName name="stay4life" accent="teal" bias="Felix" /></span>
          <span>Pill alone: <TeamTag /></span>
        </div>
      </V12Section>

      <V12Section id="v12-themes" title="v12 theme cards (themed playlists): six covers, dark cover, rail">
        <ThemeRail>
          {THEMES.map((t) => <ThemeCard key={t.slug} href={`/blindtest/${t.slug}`} cover={t.cover} name={t.name} sub={t.sub} lead={t.lead} />)}
        </ThemeRail>
        <span className="ux-kit-label" style={{ marginTop: 24 }}>Title track cover, no sub line, no lead</span>
        <ThemeRail>
          <ThemeCard href="/blindtest" cover="title" name="Title tracks" />
        </ThemeRail>
      </V12Section>

      <V12Section id="v12-ways" title="v12 ways-to-play tiles: four across, New pill, two across">
        <WaysTiles>
          <WaysTile href="#kit-v12-ways" icon="t-classic" title="Quizzes" foot="Most played first">28 fan-made Stray Kids quizzes.</WaysTile>
          <WaysTile href="/blindtest" icon="music" title="Blindtest" foot="Solo or live with friends">18 Stray Kids songs, ten-second clips.</WaysTile>
          <WaysTile href="#kit-v12-ways" icon="clock" title="Name them all" isNew foot="38% get them all">All 8 members in 60 seconds.</WaysTile>
          <WaysTile href="#kit-v12-ways" icon="users" title="Which member are you?" isNew foot="12,480 results">Eight questions about you.</WaysTile>
        </WaysTiles>
        <span className="ux-kit-label" style={{ marginTop: 24 }}>Two across, no foot line</span>
        <div className="ux-kit-res">
          <WaysTiles columns={2}>
            <WaysTile href="#kit-v12-ways" icon="clock" title="Name them all">All 8 members in 60 seconds.</WaysTile>
            <WaysTile href="/blindtest" icon="music" title="Stray Kids blindtest">18 songs, ten-second clips.</WaysTile>
          </WaysTiles>
        </div>
      </V12Section>

      <V12Section id="v12-steps" title="v12 three steps">
        <Steps3 steps={STEPS} />
      </V12Section>

      <V12Section id="v12-lang" title="v12 language switch (each pill is that language's own page)">
        <div className="ux-kit-row">
          <LangSwitch label="Page language" current="en" options={LANGS} />
        </div>
        <div className="ux-kit-row">
          <LangSwitch label="Langue de la page" current="fr" options={LANGS} />
          <span className="ux-urlchip">kpopquiz.org/fr/blind-test-kpop</span>
        </div>
      </V12Section>

      <V12Section id="v12-answers" title="v12 colour + shape answers: host tiles (round, reveal), phone buttons (open, locked)">
        <div className="ux-kit-screen" data-kit="host-round">
          <HostTiles options={OPTIONS} />
        </div>
        <div className="ux-kit-screen" data-kit="host-reveal">
          <HostTiles options={OPTIONS} reveal={{ correct: 0, counts: [6, 2, 1, 2] }} />
        </div>
        <div style={{ marginTop: 24 }}><KitPhones /></div>
      </V12Section>

      <V12Section id="v12-result" title="v12 result card, traits, distribution (member result: initial; group result: photo)">
        <div className="ux-kit-res" data-kit="result-member">
          <ResultCard
            eyebrow="You are"
            name="Changbin"
            role="Rapper and producer, 3RACHA"
            description="You go all in. Loud energy on the outside, a soft heart underneath, and you will outwork anyone once you care about something."
            traits={['Intense', 'Warm', 'Hard-working']}
            same={<><b>9%</b> of STAY got Changbin</>}
            actions={<><UxButton icon="share">Share my result</UxButton><UxButton variant="ghost" icon="redo">Retake</UxButton></>}
          />
          <div style={{ marginTop: 40 }}>
            <SectionHeader icon="grid" title="How everyone came out" sub="12,480 results" />
            <Distribution items={DIST} meId="B" label="How everyone came out" />
          </div>
        </div>
        <span className="ux-kit-label" style={{ marginTop: 32 }}>Group result with a photo from public/idols; no share line when the share does not exist yet</span>
        <div className="ux-kit-res" data-kit="result-group">
          <ResultCard
            eyebrow="Your group is"
            name="TWICE"
            role="JYP Entertainment · since 2015"
            description="Friendship, bright hooks and fans at the centre of everything. TWICE is on the soundtrack too."
            traits={['Bright', 'Catchy', 'Warm']}
            photo={twice ? { src: twice, alt: 'TWICE' } : undefined}
            actions={<UxButton variant="ghost" icon="redo">Retake</UxButton>}
          />
        </div>
        <span className="ux-kit-label" style={{ marginTop: 32 }}>Trait pills alone</span>
        <div className="ux-kit-res" style={{ border: '1px solid var(--ux-qotd-edge)', borderRadius: 20, padding: '2px 16px 20px' }}>
          <Traits items={['Sunny', 'Generous', 'Surprising']} />
        </div>
      </V12Section>

      <V12Section id="v12-story" title="v12 story image variants: 9:16 story, 1:1 square (preview in HTML, PNG drawn in the browser)">
        <div className="ux-kit-storyg">
          <div data-kit="story-9x16">
            <StoryPreview
              titleAs="p"
              tag="New quiz"
              kicker="KATSEYE quiz"
              title="Only real EYEKONS get 8/8"
              cta="Play at kpopquiz.org"
              qr={<Icon name="grid" label="QR code slot" style={{ color: '#1F1B17' }} />}
            />
          </div>
          <div data-kit="story-square">
            <StoryPreview titleAs="p" format="square" kicker="Which member are you" title="I got Changbin" cta="Play at kpopquiz.org" />
          </div>
        </div>
        <div style={{ marginTop: 16 }}><KitStoryFiles /></div>
      </V12Section>
    </>
  );
}
