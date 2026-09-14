import Link from 'next/link';

import { HubLastPlayed } from './hub-last-played';
import { GamesFilter } from './games-filter';
import { GamesCountdown } from './games-countdown';
import { StreakChip, StreakPill } from './games-streak';

import { HUB_CARD_TAGS } from '@/lib/games/hub-filters';

import type { BandAnswer } from '@/lib/games/hub-data';
import type { RankingIndexItem } from '@/lib/db/queries/duels';

export type { BandAnswer };

// GAMES HUB REDESIGN (docs/design/games, artboard Main.dc.html @1440 / Mobile @390).
// A faithful port of the owner-validated artboard: header, one dark daily blind-test
// band, filter chips, eight real-face game cards, live-ranking strip. The card
// preview zones are illustrative gameplay mock-ups (aria-hidden) exactly as the
// artboard draws them - they are NOT the viewer's live stats. Every value the hub
// states AS real (mode counts, live votes, streak, countdown, the ranking strip) is
// real or absent, never the artboard SAMPLE literals (fans 3,204 / votes 12,880 /
// "best 5 of 7" / Elo / streak "1 day" are gone or sourced). No new server read per
// request: counts + votes come from the cached getGamesData; streak + countdown are
// pure client; the filter is client-only CSS over server-rendered (crawlable) cards.

export interface GamesHubCounts {
  personality: number;
  songs: number;
  categories: number;
  nameAll: number;
  nameThemAll: number;
  sortIt: number;
  matchUp: number;
}

interface GamesHubProps {
  counts?: Partial<GamesHubCounts> | null;
  liveRanking: RankingIndexItem | null;
  bandAnswers?: BandAnswer[];
}

// A real idol face (README photo mapping). Plain <img> like the tier-list maker; the
// idol's name is always the alt text (a11y + SEO) and optionally an on-face caption,
// mirroring the artboard's .face / .face .nm.
function Face(
  { src, name, size = 58, radius = 12, label, style }:
  { src: string; name: string; size?: number; radius?: number; label?: string; style?: React.CSSProperties },
): React.ReactElement {
  return (
    <span className="gh-face" style={{ width: size, height: size, borderRadius: radius, ...style }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={name} referrerPolicy="no-referrer" />
      {label ? <span className="gh-face-nm">{label}</span> : null}
    </span>
  );
}

const IDOL = {
  rm: { src: '/idols/RM BTS.jpg', name: 'RM' },
  jin: { src: '/idols/Jin BTS.jpg', name: 'Jin' },
  suga: { src: '/idols/Suga BTS.jpg', name: 'Suga' },
  jimin: { src: '/idols/Jimin BTS.jpg', name: 'Jimin' },
  v: { src: '/idols/V BTS.jpg', name: 'V' },
  jk: { src: '/idols/Jungkook BTS.jpg', name: 'Jungkook' },
  jennie: { src: '/idols/Jennie BLACKPINK.jpg', name: 'Jennie' },
  lisa: { src: '/idols/Lisa BLACKPINK.jpg', name: 'Lisa' },
  karina: { src: '/idols/Karina AESPA.jpg', name: 'Karina' },
  hanni: { src: '/idols/Hanni NEWJEANS.jpg', name: 'Hanni' },
  wonyoung: { src: '/idols/Wonyoung IVE.jpg', name: 'Wonyoung' },
} as const;

function PlayIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>;
}
function ClockIcon({ stroke = 'currentColor' }: { stroke?: string }) {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>;
}
function PersonIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="3.2" /><path d="M5 20a7 7 0 0 1 14 0" /></svg>;
}
function TrophyIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 4h10v4a5 5 0 0 1-10 0zM7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3M9 20h6M12 15v5" /></svg>;
}
function ShareIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="2.5" /><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="19" r="2.5" /><path d="M8.2 10.8l7.6-4.6M8.2 13.2l7.6 4.6" /></svg>;
}
function SwordsIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 5l5-1-1 5-8 8-4 4-2-2 4-4 6-6zM5 4l4 4M14.5 14.5L19 19l-2 2-4.5-4.5" /></svg>;
}

// Deterministic-looking illustrative waveform, matching the artboard's 35 bars with
// the middle run (indices 9-17) tinted rose. Decorative; animates via CSS on play.
const WAVE_HEIGHTS = [10, 18, 26, 34, 22, 14, 30, 40, 28, 16, 12, 24, 36, 30, 18, 10, 22, 32, 38, 26, 14, 20, 30, 34, 20, 12, 26, 36, 24, 16, 10, 18, 28, 20];

export function GamesHub({ counts, liveRanking, bandAnswers = [] }: GamesHubProps): React.ReactElement {
  const c = {
    categories: counts?.categories ?? 0,
    nameThemAll: counts?.nameThemAll ?? 0,
    sortIt: counts?.sortIt ?? 0,
    matchUp: counts?.matchUp ?? 0,
  };
  const votes = liveRanking ? liveRanking.total_votes.toLocaleString('en-US') : null;

  return (
    <div className="gh">
      {/* Header */}
      <header className="gh-head">
        <div className="gh-head-copy">
          <p className="gh-kicker">Games</p>
          <h1 className="gh-h1">Prove it.</h1>
          <p className="gh-sub">Name every member. Beat the clock. Out-vote the fandom.<span className="gh-sub-more"> Seven ways to show how well you really know K-pop, every one of them starts in one tap.</span></p>
        </div>
        <div className="gh-head-chips">
          <StreakChip />
        </div>
      </header>

      {/* Daily blind-test band - the single dark element */}
      <section className="gh-band" aria-label="Today's blind test">
        <div className="gh-band-main">
          <p className="gh-band-kick"><ClockIcon stroke="#FFD1E2" /> Today&apos;s blind test · resets in <GamesCountdown /></p>
          <h2 className="gh-band-h2">Name the song <br className="gh-band-br" />from a 10‑second clip.</h2>
          <p className="gh-band-sub">Same ten songs for everyone today. Beat your friends&apos; score, keep the streak alive.</p>
          <div className="gh-wave" aria-hidden="true">
            {WAVE_HEIGHTS.map((h, i) => (
              <i key={i} className={i >= 9 && i <= 17 ? 'hot' : ''} style={{ height: `${h}px`, animationDelay: `${(i % 7) * 0.09}s` }} />
            ))}
          </div>
          <div className="gh-band-actions">
            <Link href="/blindtest" className="gh-band-play"><PlayIcon /> Play today&apos;s</Link>
            <StreakPill />
          </div>
        </div>
        <div className="gh-band-answers" aria-hidden="true">
          {bandAnswers.slice(0, 4).map((a, i) => (
            <div className="gh-answer" key={i}>
              <span className="gh-answer-k">{['A', 'B', 'C', 'D'][i]}</span>
              <span className="gh-answer-t">{a.title}</span>
              <span className="gh-answer-ar">{a.artist}</span>
            </div>
          ))}
        </div>
      </section>

      {/* All games: heading + filter chips share one row (see GamesFilter). */}
      <GamesFilter
        heading={(
          <div className="gh-all-head">
            <p className="gh-kicker gh-kicker-mute">All games</p>
            <p className="gh-all-h2">See the game before you play it.</p>
          </div>
        )}
      >
        {/* 1. Name Them All */}
        <article className="gh-card" data-tag={HUB_CARD_TAGS['name-them-all']} data-testid="card-name-them-all">
          <div className="gh-prev">
            <span className="gh-tag">Name them all</span>
            <span className="gh-timer">0:42</span>
            <div className="gh-nta" aria-hidden="true">
              <div className="gh-nta-row">
                <Face src={IDOL.rm.src} name={IDOL.rm.name} size={58} label="RM" />
                <Face src={IDOL.jin.src} name={IDOL.jin.name} size={58} label="Jin" />
                <Face src={IDOL.suga.src} name={IDOL.suga.name} size={58} label="Suga" />
                {[0, 1, 2, 3].map((i) => <span className="gh-slot" key={i} style={{ width: 58, height: 58 }}>?</span>)}
              </div>
              <div className="gh-nta-input">j-h<span className="gh-caret" /></div>
            </div>
          </div>
          <div className="gh-body">
            <h3 className="gh-ttl">Name Them All</h3>
            <p className="gh-hook">Type every BTS member before the clock runs out. Miss one and the timer shows you who.</p>
            <div className="gh-foot">
              <span className="gh-stat"><TrophyIcon /> Beat the clock</span>
              <span className="gh-cta"><span className="gh-chip">{c.nameThemAll} groups</span><Link href="/games/name-them-all" className="gh-play" data-lp="name-them-all" data-lp-base="/games/name-them-all/"><PlayIcon /> Play</Link></span>
            </div>
          </div>
        </article>

        {/* 2. Sort It */}
        <article className="gh-card" data-tag={HUB_CARD_TAGS['sort-it']} data-testid="card-sort-it">
          <div className="gh-prev">
            <span className="gh-tag">Sort it</span>
            <span className="gh-timer">0:09</span>
            <div className="gh-sort" aria-hidden="true">
              <Face src={IDOL.jennie.src} name={IDOL.jennie.name} size={96} radius={16} label="Jennie" />
              <div className="gh-sort-q"><span>Who debuted first?</span><span className="gh-sort-ar">→</span></div>
              <Face src={IDOL.karina.src} name={IDOL.karina.name} size={96} radius={16} label="Karina" />
            </div>
          </div>
          <div className="gh-body">
            <h3 className="gh-ttl">Sort It</h3>
            <p className="gh-hook">Two idols, one question, one tap. Who debuted first? Who is older? Your time is the score.</p>
            <div className="gh-foot">
              <span className="gh-stat"><ClockIcon /> Timer counts up</span>
              <span className="gh-cta"><span className="gh-chip">{c.sortIt} modes</span><Link href="/games/sort-it" className="gh-play" data-lp="sort-it" data-lp-base="/games/sort-it/"><PlayIcon /> Play</Link></span>
            </div>
          </div>
        </article>

        {/* 3. Match-Up */}
        <article className="gh-card" data-tag={HUB_CARD_TAGS['match-up']} data-testid="card-match-up">
          <div className="gh-prev">
            <span className="gh-tag">Match-up</span>
            <span className="gh-timer">1:15</span>
            <div className="gh-match" aria-hidden="true">
              <Face src={IDOL.jimin.src} name={IDOL.jimin.name} size={44} radius={10} style={{ outline: '3px solid var(--brand)', outlineOffset: '-3px' }} />
              <span className="gh-mtile" /><span className="gh-mtile" />
              <Face src={IDOL.jennie.src} name={IDOL.jennie.name} size={44} radius={10} />
              <span className="gh-mtile" />
              <Face src={IDOL.v.src} name={IDOL.v.name} size={44} radius={10} style={{ outline: '3px solid var(--brand)', outlineOffset: '-3px' }} />
              <span className="gh-mtile" /><span className="gh-mtile" /><span className="gh-mtile" /><span className="gh-mtile" />
              <Face src={IDOL.karina.src} name={IDOL.karina.name} size={44} radius={10} />
              <span className="gh-mtile" />
            </div>
          </div>
          <div className="gh-body">
            <h3 className="gh-ttl">Match-Up</h3>
            <p className="gh-hook">Flip the tiles, pair the faces, clear the board fast. Memory, but make it K‑pop.</p>
            <div className="gh-foot">
              <span className="gh-stat"><ClockIcon /> +3 s per wrong pair</span>
              <span className="gh-cta"><span className="gh-chip">{c.matchUp} boards</span><Link href="/games/match-up" className="gh-play" data-lp="match-up" data-lp-base="/games/match-up/"><PlayIcon /> Play</Link></span>
            </div>
          </div>
        </article>

        {/* 4. This or That */}
        <article className="gh-card" data-tag={HUB_CARD_TAGS['this-or-that']} data-testid="card-this-or-that">
          <div className="gh-prev">
            <span className="gh-tag">This or that</span>
            <div className="gh-tot" aria-hidden="true">
              <div className="gh-tot-row">
                <div className="gh-tot-side">
                  <Face src={IDOL.jk.src} name={IDOL.jk.name} size={44} />
                  <div><div className="gh-tot-song">Seven</div><div className="gh-tot-by">Jung Kook</div></div>
                </div>
                <div className="gh-tot-vs">VS</div>
                <div className="gh-tot-side right">
                  <div><div className="gh-tot-song">Slow Dancing</div><div className="gh-tot-by">V</div></div>
                  <Face src={IDOL.v.src} name={IDOL.v.name} size={44} />
                </div>
              </div>
              <div className="gh-tot-meter">
                <div className="gh-vbar"><i style={{ width: '61%', background: 'var(--brand)' }} /><i style={{ width: '39%', background: 'var(--photocard-violet)' }} /></div>
                <div className="gh-tot-nums">
                  <span style={{ color: 'var(--brand)' }}>61%</span>
                  {/* The 61/39 split is an illustrative demo (aria-hidden preview); it is
                      NOT a real tally, so it carries no vote number, only a "live" label.
                      The real vote total is stated honestly in the foot stat below. */}
                  <span className="gh-tot-live">live</span>
                  <span style={{ color: 'var(--photocard-violet)' }}>39%</span>
                </div>
              </div>
            </div>
          </div>
          <div className="gh-body">
            <h3 className="gh-ttl">This or That</h3>
            <p className="gh-hook">Vote between two songs and watch the fandom ranking move live. Your pick counts today.</p>
            <div className="gh-foot">
              <span className="gh-stat"><PersonIcon /> {votes ? `${votes} votes` : 'Live fandom ranking'}</span>
              <span className="gh-cta"><span className="gh-chip">{c.categories} rankings</span><Link href="/games/this-or-that/all" className="gh-play"><PlayIcon /> Vote</Link></span>
            </div>
          </div>
        </article>

        {/* 5. Which member are you */}
        <article className="gh-card" data-tag={HUB_CARD_TAGS['which-member']} data-testid="card-which-member">
          <div className="gh-prev">
            <span className="gh-tag">Which member are you</span>
            <div className="gh-mem" aria-hidden="true">
              <div className="gh-mem-fan">
                <Face src={IDOL.rm.src} name={IDOL.rm.name} size={52} style={{ transform: 'rotate(-10deg)' }} />
                <Face src={IDOL.jin.src} name={IDOL.jin.name} size={52} style={{ transform: 'rotate(-4deg)', marginLeft: -10 }} />
                <Face src={IDOL.suga.src} name={IDOL.suga.name} size={52} style={{ transform: 'rotate(4deg)', marginLeft: -10 }} />
                <Face src={IDOL.jimin.src} name={IDOL.jimin.name} size={52} style={{ transform: 'rotate(10deg)', marginLeft: -10 }} />
              </div>
              <div className="gh-mem-card">
                <span className="gh-kicker gh-mem-kick">Your match</span>
                <span className="gh-mem-pct">82% Jimin</span>
                <span className="gh-mem-note">10 questions, 1 result</span>
              </div>
            </div>
          </div>
          <div className="gh-body">
            <h3 className="gh-ttl">Which member are you</h3>
            <p className="gh-hook">Ten questions about how you love K-pop. One member. A card you will screenshot.</p>
            <div className="gh-foot">
              <span className="gh-stat"><ShareIcon /> Made for sharing</span>
              <span className="gh-cta"><span className="gh-chip">All groups</span><Link href="/personality" className="gh-play"><PlayIcon /> Play</Link></span>
            </div>
          </div>
        </article>

        {/* 6. Duel 1v1 */}
        <article className="gh-card" data-tag={HUB_CARD_TAGS['duel']} data-testid="card-duel">
          <div className="gh-prev">
            <span className="gh-tag">Duel 1v1</span>
            <div className="gh-duel" aria-hidden="true">
              <div className="gh-duel-row">
                <div className="gh-duel-side">
                  <span className="gh-duel-you">YOU</span>
                  <div><div className="gh-duel-elo">1,240</div><div className="gh-duel-lbl">Elo</div></div>
                </div>
                <div className="gh-duel-swords"><SwordsIcon /></div>
                <div className="gh-duel-side right">
                  <div><div className="gh-duel-elo">1,198</div><div className="gh-duel-lbl">army_lee</div></div>
                  <Face src={IDOL.hanni.src} name={IDOL.hanni.name} size={44} radius={22} />
                </div>
              </div>
              <div className="gh-duel-meter">
                <div className="gh-vbar"><i style={{ width: '52%', background: 'var(--brand)' }} /><i style={{ width: '48%', background: 'var(--surface-alt)' }} /></div>
                <div className="gh-duel-note">Best of 7, same questions, live</div>
              </div>
            </div>
          </div>
          <div className="gh-body">
            <h3 className="gh-ttl">Duel 1v1</h3>
            <p className="gh-hook">Same seven questions, a real fan on the other side, an Elo that climbs. Bring it.</p>
            <div className="gh-foot">
              <span className="gh-stat"><TrophyIcon /> Elo, best of 7</span>
              <span className="gh-cta"><span className="gh-chip">Ranked</span><Link href="/battle" className="gh-play"><PlayIcon /> Find a duel</Link></span>
            </div>
          </div>
        </article>

        {/* 7. Tier Lists (New) */}
        <article className="gh-card" data-tag={HUB_CARD_TAGS['tier-lists']} data-testid="card-tier-lists">
          <div className="gh-prev">
            <span className="gh-tag">Tier lists</span>
            <div className="gh-tl" aria-hidden="true">
              <div className="gh-tl-row"><span className="gh-tl-lab" style={{ background: 'var(--tier-s, #E8457A)' }}>S</span><span className="gh-tl-faces">{[IDOL.rm, IDOL.jin, IDOL.v].map((f) => <Face key={f.name} src={f.src} name={f.name} size={34} radius={8} />)}</span></div>
              <div className="gh-tl-row"><span className="gh-tl-lab" style={{ background: 'var(--tier-a, #F5894D)' }}>A</span><span className="gh-tl-faces">{[IDOL.jimin, IDOL.jk].map((f) => <Face key={f.name} src={f.src} name={f.name} size={34} radius={8} />)}</span></div>
              <div className="gh-tl-row"><span className="gh-tl-lab" style={{ background: 'var(--tier-b, #EBB33E)' }}>B</span><span className="gh-tl-faces"><Face src={IDOL.suga.src} name={IDOL.suga.name} size={34} radius={8} /></span></div>
            </div>
          </div>
          <div className="gh-body">
            <h3 className="gh-ttl">Tier Lists <span className="gh-chip gh-chip-new">New</span></h3>
            <p className="gh-hook">Drag your bias to the top. Rank members, title tracks, whole eras, then share the card.</p>
            <div className="gh-foot">
              <span className="gh-stat"><TrophyIcon /> Just launched</span>
              <span className="gh-cta"><span className="gh-chip">Any group</span><Link href="/tier-list" className="gh-play"><PlayIcon /> Start ranking</Link></span>
            </div>
          </div>
        </article>

        {/* 8. K-pop Idle (dimmed, coming soon) */}
        <article className="gh-card gh-card-dim" data-tag={HUB_CARD_TAGS['kpop-idle']} data-testid="card-kpop-idle">
          <div className="gh-prev">
            <span className="gh-tag">K-pop idle</span>
            <div className="gh-idle" aria-hidden="true">
              <span className="gh-idle-q">?</span>
              <span className="gh-idle-lines"><span /><span /><span /></span>
            </div>
          </div>
          <div className="gh-body">
            <h3 className="gh-ttl">K-pop Idle</h3>
            <p className="gh-hook">Guess the idol in eight tries, one clue at a time. A new idol every day.</p>
            <div className="gh-foot">
              <span className="gh-stat"><ClockIcon /> Daily, soon</span>
              <span className="gh-cta"><span className="gh-soon">Coming soon</span></span>
            </div>
          </div>
        </article>
      </GamesFilter>

      {/* Live ranking strip */}
      {liveRanking && (
        <section className="gh-strip" aria-label="Today's live ranking">
          {/* Desktop: dot is a standalone leading item. Mobile: the artboard moves it
              inline before the title and wraps the actions to a second row (CSS). */}
          <span className="gh-dot" aria-hidden="true" />
          <div className="gh-strip-body">
            <div className="gh-strip-q"><span className="gh-dot-inline" aria-hidden="true" />{liveRanking.prompt}</div>
            <div className="gh-strip-meta">
              {liveRanking.top_entity ? `#1 ${liveRanking.top_entity.name} · ` : ''}{votes} votes · changes daily
            </div>
          </div>
          <span className="gh-chip gh-chip-live">Live</span>
          <Link href={`/rankings/${liveRanking.group_slug}/${liveRanking.question_type}`} className="gh-play gh-play-sm"><PlayIcon /> Vote</Link>
          <Link href="/rankings" className="gh-strip-all">All rankings</Link>
        </section>
      )}

      <HubLastPlayed />
    </div>
  );
}
