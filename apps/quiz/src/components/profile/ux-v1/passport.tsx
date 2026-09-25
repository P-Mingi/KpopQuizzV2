import Link from 'next/link';

import { UxPage } from '@/components/ux-v1/page';
import { Icon } from '@/components/ux-v1/icon';
import { SectionHeader } from '@/components/ux-v1/section-header';
import { BadgeMedal, MedalTile, RarityKey } from '@/components/ux-v1/badge-medal';
import { BiasTag } from '@/components/ux-v1/person-name';
import { AVATAR_PRESETS, isValidNameAccent, isValidNameFont, NAME_FONTS } from '@/lib/passport-flair';
import { compact, earnedLine } from '@/lib/ux-v1/p10/passport-model';

import { PassportBand } from './passport-band';
import { PassportActions } from './passport-actions';
import { PassportTabs } from './passport-tabs';
import { MoreQuizzes } from './more-quizzes';
import { GroupAvatar, HistoryList, QuizRows } from './rows';

import type { BadgeTile, BandMode, HistoryRow, MasteryRow, StatCell } from '@/lib/ux-v1/p10/passport-model';
import type { QuizCardData } from '@/lib/db/types';

export interface UxPassportProps {
  /** personal = /me (the owner, server-known); public = /u/[username] (ISR, owner resolved on the client). */
  mode: 'personal' | 'public';
  username: string;
  displayName: string;
  bio: string | null;
  accent: string | null;
  font: string | null;
  bias: string | null;
  avatar: { url: string | null; bg: string; text: string; kind: string | null; ref: string | null };
  pinnedBadge: BadgeTile | null;
  level: string;
  meta: string;
  xp: { have: string; rest: string; pct: number };
  theme: { band: string; bar: string };
  band: { mode: BandMode; image: string | null; groupPhoto: string | null };
  stats: StatCell[];
  war: { fandom: string; rank: number } | null;
  pinned: BadgeTile[];
  badges: BadgeTile[];
  mastery: MasteryRow[];
  /** Owner only (privacy fail-closed: null on the public passport). */
  history: { rows: HistoryRow[]; quizzesPlayed: number; blindtestsPlayed: number } | null;
  quizzes: QuizCardData[];
  quizzesTotal: number;
  creatorId: string;
  /** "now" for the time-ago labels (one value per render). */
  now: number;
  /** Rendered at the end of the page (moderator tools on /u). */
  footer?: React.ReactNode;
}

function accentClass(accent: string | null): string {
  return accent && accent !== 'default' && isValidNameAccent(accent) ? `ux-acc-${accent}` : '';
}
function fontFamily(font: string | null): string | undefined {
  return font && font !== 'default' && isValidNameFont(font) ? NAME_FONTS[font]?.family : undefined;
}

/** 96px avatar (80 on phones): custom image, preset tile, photo, else initials. */
function PassportAvatar({ name, avatar }: { name: string; avatar: UxPassportProps['avatar'] }): React.ReactElement {
  const kind = avatar.kind ?? 'photo';
  const initials = name.trim().slice(0, 2).toUpperCase() || 'K';
  const img = kind === 'custom' && avatar.ref && /^https:\/\//.test(avatar.ref) ? avatar.ref : kind !== 'preset' && avatar.url && /^https?:\/\//.test(avatar.url) ? avatar.url : null;
  if (img) {
    // eslint-disable-next-line @next/next/no-img-element -- OAuth / user avatar hosts vary
    return <span className="p10-pav" aria-hidden="true"><img src={img} alt="" width={96} height={96} referrerPolicy="no-referrer" /></span>;
  }
  const preset = kind === 'preset' && avatar.ref ? AVATAR_PRESETS[avatar.ref] : undefined;
  return <span className="p10-pav" aria-hidden="true" style={preset ? { background: preset.bg, color: preset.fg } : { background: avatar.bg, color: avatar.text }}>{initials}</span>;
}

/**
 * The v11 passport (DESIGN-SPEC 16.7, 17.8; prototype view "you"). Server
 * component: every number comes from the page's real reads. Band, actions and
 * tabs are small client islands; every tab panel is in the served HTML.
 */
export function UxPassport(p: UxPassportProps): React.ReactElement {
  const personal = p.mode === 'personal';
  const acc = accentClass(p.accent);
  const ff = fontFamily(p.font);
  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'quizzes', label: 'Quizzes' },
    ...(p.history ? [{ id: 'history', label: 'History' }] : []),
    { id: 'badges', label: 'Badges' },
  ];
  const recent = p.history?.rows.slice(0, 3) ?? [];
  const nothing = p.pinned.length === 0 && p.mastery.length === 0 && recent.length === 0;

  const overview = (
    <>
      {p.war ? (
        <Link href="/leaderboard" className="p10-war">
          <Icon name="trophy" />
          <span className="p10-war-t">This week: <b>{p.war.fandom} is #{p.war.rank}</b> in the fandom war</span>
          <span className="ux-lnk p10-war-l">Leaderboard</span>
        </Link>
      ) : null}
      {p.pinned.length > 0 ? (
        <section className="p10-sec p10-sec-first" aria-labelledby="p10-pinned-h">
          <SectionHeader id="p10-pinned-h" title="Pinned badges" icon="medal" aside={<a className="ux-lnk" href="#p10-panel-badges" data-p10-tab="badges">All {p.badges.length} badges</a>} />
          <div className="ux-medals">
            {p.pinned.map((b) => <MedalTile key={b.id} id={b.id} name={b.name} description={b.description} earned rarity={b.rarity} />)}
          </div>
        </section>
      ) : null}
      {p.mastery.length > 0 || recent.length > 0 ? (
        <section className={['p10-two', p.pinned.length > 0 ? '' : 'p10-sec-first'].filter(Boolean).join(' ')}>
          {p.mastery.length > 0 ? (
            <div>
              <SectionHeader title="Groups mastered" />
              <div className="ux-rows">
                {p.mastery.map((m) => (
                  <Link key={m.slug} href={`/${m.slug}-quiz`} className="ux-row">
                    <GroupAvatar slug={m.slug} name={m.name} />
                    <span className="ux-row-grow">
                      <span className="ux-rt">{m.name}</span>
                      <span className="p10-mbar" aria-hidden="true"><i style={{ width: `${m.pct}%` }} /></span>
                    </span>
                    <span className="ux-row-end ux-num" aria-label={m.pct === 100 ? 'Mastered' : `${m.pct}% of the way to mastery`}>{m.pct === 100 ? 'Mastered' : `${m.pct}%`}</span>
                  </Link>
                ))}
              </div>
            </div>
          ) : <div />}
          {recent.length > 0 ? (
            <div>
              <SectionHeader title="Recent activity" aside={<a className="ux-lnk" href="#p10-panel-history" data-p10-tab="history">Full history</a>} />
              <HistoryList rows={recent} now={p.now} />
            </div>
          ) : null}
        </section>
      ) : null}
      {nothing ? (
        <div className="ux-empty p10-sec-first">
          <b>{personal ? 'Your passport starts here' : `${p.displayName} has no badges yet`}</b>
          {personal ? <>Play a quiz to fill in your first stamp.<br /><Link className="ux-btn ux-btn-primary" href="/quizzes">Browse quizzes</Link></> : null}
        </div>
      ) : null}
    </>
  );

  const quizzes = (
    <section className="p10-sec-first" aria-labelledby="p10-quizzes-h">
      <SectionHeader
        id="p10-quizzes-h"
        title={personal ? 'Your quizzes' : 'Quizzes'}
        sub={p.quizzesTotal > 0 ? `${compact(p.quizzesTotal)} published` : undefined}
        aside={personal ? <Link href="/create" className="ux-btn ux-btn-ghost ux-btn-sm"><Icon name="plus" />Create</Link> : undefined}
      />
      {p.quizzes.length > 0 ? (
        <div className="ux-rows">
          <QuizRows quizzes={p.quizzes} />
          {p.quizzesTotal > p.quizzes.length ? <MoreQuizzes creatorId={p.creatorId} offset={p.quizzes.length} total={p.quizzesTotal} /> : null}
        </div>
      ) : (
        <div className="ux-empty">
          <b>No quizzes yet</b>
          {personal ? <Link className="ux-btn ux-btn-primary" href="/create">Create your first quiz</Link> : null}
        </div>
      )}
    </section>
  );

  const history = p.history ? (
    <section className="p10-sec-first" aria-labelledby="p10-history-h">
      <SectionHeader
        id="p10-history-h"
        title="History"
        sub={`${compact(p.history.quizzesPlayed)} ${p.history.quizzesPlayed === 1 ? 'quiz' : 'quizzes'} and ${compact(p.history.blindtestsPlayed)} ${p.history.blindtestsPlayed === 1 ? 'blindtest' : 'blindtests'}`}
      />
      {p.history.rows.length > 0 ? <HistoryList rows={p.history.rows} now={p.now} /> : <div className="ux-empty"><b>Nothing played yet</b>Your quizzes and blindtests show up here.</div>}
    </section>
  ) : null;

  const badges = (
    <section className="p10-sec-first" aria-labelledby="p10-badges-h">
      <SectionHeader id="p10-badges-h" title="Badges" icon="medal" sub={earnedLine(p.badges)} />
      <RarityKey />
      <div className="ux-medals p10-allmed">
        {p.badges.map((b) => <MedalTile key={b.id} id={b.id} name={b.name} description={b.description} earned={b.earned} rarity={b.rarity} />)}
      </div>
    </section>
  );

  const panels: Record<string, React.ReactNode> = { overview, quizzes, badges };
  if (history) panels.history = history;

  return (
    <UxPage width="wide" className="p10-passport">
      <PassportBand username={p.username} owner={personal ? 'server' : 'check'} mode={p.band.mode} image={p.band.image} groupPhoto={p.band.groupPhoto} tint={p.theme.band} />
      <div className="p10-head">
        <PassportAvatar name={p.displayName} avatar={p.avatar} />
        <PassportActions username={p.username} displayName={p.displayName} owner={personal ? 'server' : 'check'} level={p.level} />
      </div>
      <div className="p10-id">
        <div className="p10-idrow">
          <h1 className={['p10-pname', 'ux-who', acc].filter(Boolean).join(' ')} style={ff ? { fontFamily: ff } : undefined}>{p.displayName}</h1>
          <BiasTag bias={p.bias} accent={p.accent} />
          {p.pinnedBadge ? (
            <span className="p10-pinb" title={p.pinnedBadge.name}>
              <BadgeMedal id={p.pinnedBadge.id} rarity={p.pinnedBadge.rarity} earned size={28} label={`Pinned badge: ${p.pinnedBadge.name}`} />
            </span>
          ) : null}
          <span className="p10-lvl">{p.level}</span>
        </div>
        <p className="p10-meta">{p.meta}</p>
        {p.bio && p.bio.trim() ? <p className="p10-bio">{p.bio.trim()}</p> : null}
      </div>
      <div className="p10-xpwrap">
        <div className="p10-xpw">
          <span className="p10-bar" role="progressbar" aria-label="Progress to the next level" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(p.xp.pct)}>
            <i style={{ width: `${p.xp.pct}%`, background: p.theme.bar }} />
          </span>
          <small className="ux-num"><b>{p.xp.have}</b>{p.xp.rest}</small>
        </div>
      </div>
      {/* scrolls sideways on phones: focusable region so keyboard users can scroll it (axe scrollable-region-focusable) */}
      <div className="p10-stats" role="region" aria-label="Stats" tabIndex={0}>
        {p.stats.map((s) => <div key={s.label}><b className="ux-num">{s.value}</b><span>{s.label}</span></div>)}
      </div>
      <PassportTabs items={tabs} panels={panels} />
      {p.footer ?? null}
    </UxPage>
  );
}
