import { UserAvatar } from '@/components/ui/user-avatar';
import { Mascot } from '@/components/ui/mascot';
import { MASTERY } from '@/lib/passport';
import { streakState } from '@/lib/streak';

// K-pop Passport view (Workstream M, M1.1 finalize). Presentational only. ONE
// profile, two modes: 'personal' (/me, /profile, the owner) shows everything and
// second-person nudges; 'public' (/u/[username], indexed) shows the public subset
// and neutral copy, reserving the split for future private fields. Strictly
// personal framing: no percentile, no rank, no #N, no social. Dark-mode aware via
// CSS tokens; mobile-first; micro-interactions gated under prefers-reduced-motion.

export interface PassportTopGroup {
  name: string;
  logo: string | null;
  color: string;
  plays: number;
  accuracy: number; // 0..1
}

export type PassportMode = 'personal' | 'public';

export interface PassportNearGap {
  name: string;
  color: string;
  kind: 'plays' | 'accuracy';
  playsNeeded: number;
  accuracyNow: number; // 0..1
}

export interface PassportUntouched {
  count: number;
  suggestions: Array<{ name: string; slug: string; color: string }>;
}

export interface PassportClimb {
  name: string;
  color: string;
  fromPct: number;
  toPct: number;
}

export interface PassportViewProps {
  mode: PassportMode;
  username: string;
  displayName: string;
  bio?: string | null;
  accent?: string;                 // themed accent (passportAccent); defaults to brand
  bias?: string | null;            // identity: free-text bias
  ultGroups?: Array<{ name: string; slug: string; color: string }>; // pinned ults
  nearMastery?: PassportNearGap[];   // personal only
  untouched?: PassportUntouched;     // personal only
  climbs?: PassportClimb[];          // personal only (needs >= 2 snapshots)
  milestones?: string[];             // personal only (achievement progression)
  avatarUrl: string | null;
  avatarBg: string;
  avatarText: string;
  joinedLabel: string;
  level: number;
  levelTitleEn: string;
  levelTitleKr: string;
  xp: number;
  xpForNext: number | null;
  xpPct: number;
  nextTitleEn: string | null;
  quizzesPlayed: number;
  blindtestsPlayed: number;
  duelsVoted: number;
  battlesPlayed: number;
  battlesWon: number;
  quizzesCreated: number;
  streakCurrent: number;
  streakLongest: number;
  streakLastActive: string | null;
  groupsMastered: number;
  groupsTotal: number;
  eras: Array<{ era: string; mastered: number; total: number }>;
  topGroups: PassportTopGroup[];
  headerSlot?: React.ReactNode; // owner controls island (client), public-safe
}

const card: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 16,
  boxShadow: 'var(--shadow-card)',
  padding: 18,
};

const eyebrow: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.12em',
  color: 'var(--txt3)',
  margin: 0,
};

const STYLE = `
.passport-fill{transform-origin:left center}
.passport-card{transition:none}
@media (prefers-reduced-motion: no-preference){
  .passport-anim .passport-fill{animation:passportGrow .7s cubic-bezier(.2,.8,.2,1) both}
  @keyframes passportGrow{from{transform:scaleX(0)}to{transform:scaleX(1)}}
  .passport-card{transition:transform .18s ease, box-shadow .18s ease}
}
@media (hover:hover) and (prefers-reduced-motion: no-preference){
  .passport-card:hover{transform:translateY(-1px);box-shadow:var(--shadow-lift)}
}
`;

function fmt(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(n);
}

export function PassportView(props: PassportViewProps): React.ReactElement {
  const {
    mode, username, displayName, bio, accent: accentProp, bias, ultGroups, nearMastery, untouched, climbs, milestones, avatarUrl, avatarBg, avatarText, joinedLabel,
    level, levelTitleEn, levelTitleKr, xp, xpForNext, xpPct, nextTitleEn,
    quizzesPlayed, blindtestsPlayed, duelsVoted, battlesPlayed, battlesWon, quizzesCreated,
    streakCurrent, streakLongest, streakLastActive, groupsMastered, groupsTotal, eras, topGroups, headerSlot,
  } = props;
  const accent = accentProp ?? 'var(--brand)';
  const ults = (ultGroups ?? []).slice(0, 3);
  const isPersonal = mode === 'personal';
  const near = isPersonal ? (nearMastery ?? []).slice(0, 3) : [];
  const showUntouched = isPersonal && untouched && untouched.count > 0;
  const climbList = isPersonal ? (climbs ?? []).slice(0, 2) : [];
  const milestoneList = isPersonal ? (milestones ?? []).slice(0, 4) : [];
  const showProgress = isPersonal && (climbList.length > 0 || milestoneList.length > 0);
  const accPct = Math.round(MASTERY.minAccuracy * 100);
  const sState = streakState(streakCurrent, streakLastActive);
  const streakNudge = sState === 'played_today' ? 'Played today. See you tomorrow.'
    : sState === 'at_risk' ? 'Play today to keep it alive.'
    : 'Play the daily to start one.';

  const counters: Array<{ label: string; value: string; sub?: string }> = [
    { label: 'Quizzes played', value: fmt(quizzesPlayed) },
    { label: 'Blindtests', value: fmt(blindtestsPlayed) },
    { label: 'Duels voted', value: fmt(duelsVoted) },
    { label: 'Battles', value: fmt(battlesPlayed), sub: `${fmt(battlesWon)} won` },
    { label: 'Quizzes made', value: fmt(quizzesCreated) },
    { label: 'XP earned', value: fmt(xp) },
  ];

  return (
    <div className="passport-anim" style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 16, paddingBottom: 40 }}>
      <style dangerouslySetInnerHTML={{ __html: STYLE }} />

      {/* Identity header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <UserAvatar username={username} avatarUrl={avatarUrl} bgColor={avatarBg} textColor={avatarText} size={72} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: accent, marginBottom: 2 }}>
            Lv {level} {'·'} {levelTitleEn}
          </div>
          <h1 style={{ fontSize: 25, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.08, margin: 0, color: 'var(--txt1)' }}>
            {displayName}
          </h1>
          <div style={{ fontSize: 12, color: 'var(--txt2)', marginTop: 3 }}>
            @{username} {'·'} Joined {joinedLabel}{bias && bias.trim() ? ` · bias ${bias.trim()}` : ''}
          </div>
        </div>
        {headerSlot}
      </div>

      {/* Ult groups (pinned identity) */}
      {ults.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--txt3)' }}>Ults</span>
          {ults.map((g) => (
            <a key={g.slug} href={`/${g.slug}-quiz`} style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              padding: '6px 12px', borderRadius: 9999,
              background: 'var(--surface)', border: `1px solid ${accent}`,
              fontSize: 12, fontWeight: 700, color: 'var(--txt1)', textDecoration: 'none',
            }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: g.color || accent }} aria-hidden="true" />
              {g.name}
            </a>
          ))}
        </div>
      )}

      {/* Bio (user-authored identity, public) */}
      {bio && bio.trim() && (
        <p style={{ fontSize: 13, color: 'var(--txt2)', margin: 0, maxWidth: 520, lineHeight: 1.5 }}>{bio.trim()}</p>
      )}

      {/* Fan Level card (canonical fan-level-card styling, kept) */}
      <div className="fan-level-card passport-card">
        <div className="fan-level-card-top">
          <span className="fan-level-card-level">Level {level}</span>
          <span className="fan-level-card-level">{xp} / {xpForNext ?? '---'} XP</span>
        </div>
        <p className="fan-level-card-title">{levelTitleEn}<span className="fan-level-card-kr">{levelTitleKr}</span></p>
        <div className="fan-level-card-bar" aria-hidden="true">
          <div className="fan-level-card-fill passport-fill" style={{ width: `${xpPct}%` }} />
        </div>
        {nextTitleEn && (
          <p className="fan-level-card-next">Next: <strong>{nextTitleEn}</strong> at Level {level + 1}</p>
        )}
      </div>

      {/* Collection (focal): mastered headline + per-era bars */}
      <div className="passport-card" style={card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={eyebrow}>Collection</p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 8 }}>
              <span style={{ fontSize: 38, fontWeight: 800, letterSpacing: '-0.03em', color: accent, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{groupsMastered}</span>
              <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--txt3)' }}>/ {groupsTotal} groups mastered</span>
            </div>
            <p style={{ fontSize: 11.5, color: 'var(--txt2)', margin: '8px 0 0', lineHeight: 1.5 }}>
              {isPersonal ? 'Master a group' : 'A group is mastered'} at {Math.round(MASTERY.minAccuracy * 100)}% accuracy over {MASTERY.minPlays}+ questions.
            </p>
          </div>
          <Mascot variant={groupsMastered > 0 ? 'celebrate' : 'default'} size={64} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
          {eras.map((e) => {
            const pct = e.total > 0 ? (e.mastered / e.total) * 100 : 0;
            return (
              <div key={e.era} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ width: 56, flexShrink: 0, fontSize: 12, fontWeight: 700, color: 'var(--txt2)' }}>{e.era}</span>
                <div style={{ flex: 1, height: 9, background: 'var(--surface-alt)', borderRadius: 9999, overflow: 'hidden' }}>
                  <div className="passport-fill" style={{ height: '100%', width: `${pct}%`, background: accent, borderRadius: 9999 }} />
                </div>
                <span style={{ width: 42, flexShrink: 0, textAlign: 'right', fontSize: 11, fontWeight: 700, color: pct > 0 ? 'var(--txt2)' : 'var(--txt3)', fontVariantNumeric: 'tabular-nums' }}>
                  {e.mastered}/{e.total}
                </span>
              </div>
            );
          })}
        </div>

        {/* Near-mastery nudges (personal only): the next win, one step away */}
        {near.length > 0 && (
          <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
            <p style={{ ...eyebrow, marginBottom: 10 }}>Closest to mastery</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {near.map((g) => {
                const accNow = Math.round(g.accuracyNow * 100);
                return (
                  <div key={g.name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: g.color || accent }} aria-hidden="true" />
                    <span style={{ fontSize: 12.5, color: 'var(--txt1)', lineHeight: 1.4 }}>
                      {g.kind === 'plays' ? (
                        <>
                          <strong style={{ fontWeight: 700 }}>{g.playsNeeded} more {g.playsNeeded === 1 ? 'play' : 'plays'}</strong> to master {g.name}
                        </>
                      ) : (
                        <>
                          Raise <strong style={{ fontWeight: 700 }}>{g.name}</strong> accuracy to {accPct}% <span style={{ color: 'var(--txt3)' }}>(now {accNow}%)</span>
                        </>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Untouched groups (personal only): inviting start, not guilt */}
        {showUntouched && (
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
            <p style={{ fontSize: 12, color: 'var(--txt2)', margin: '0 0 10px', lineHeight: 1.5 }}>
              <strong style={{ color: 'var(--txt1)', fontWeight: 700 }}>{untouched!.count}</strong> {untouched!.count === 1 ? 'group' : 'groups'} still to discover. Pick one to start.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {untouched!.suggestions.map((s) => (
                <a
                  key={s.slug}
                  href={`/${s.slug}-quiz`}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 7,
                    padding: '7px 12px', borderRadius: 9999,
                    background: 'var(--surface-alt)', border: '1px solid var(--border)',
                    fontSize: 12, fontWeight: 600, color: 'var(--txt1)', textDecoration: 'none',
                  }}
                >
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.color || accent }} aria-hidden="true" />
                  {s.name}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Streak (focal): canonical daily streak */}
      <div className="passport-card" style={{ ...card, display: 'flex', alignItems: 'center', gap: 18 }}>
        <div style={{ width: 60, height: 60, borderRadius: 16, flexShrink: 0, background: 'var(--brand-light)', color: 'var(--streak)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} aria-hidden="true">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2c1 3-1 4-2 6s0 4 0 4-2-1-2-3c-2 2-3 4-3 6a7 7 0 0014 0c0-4-3-6-4-9-1-2-1-3 0-4-2 0-4 2-3 5 0 0-1-2 0-4-1 1-2 2-2 3 0-2 1-3 2-4z" />
          </svg>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: 32, fontWeight: 800, color: 'var(--txt1)', letterSpacing: '-0.03em', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{streakCurrent}</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--txt2)' }}>{streakCurrent === 1 ? 'day' : 'days'}</span>
          </div>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--txt3)', marginTop: 5 }}>
            Daily streak {'·'} best {streakLongest}
          </div>
        </div>
        {isPersonal && (
          <div style={{ fontSize: 11.5, color: sState === 'at_risk' ? accent : 'var(--txt2)', fontWeight: sState === 'at_risk' ? 700 : 400, maxWidth: 132, textAlign: 'right', lineHeight: 1.4 }}>
            {streakNudge}
          </div>
        )}
      </div>

      {/* Your progress (personal only): self vs past. Achievement milestones show
          now; accuracy climbs appear only once real snapshots exist. */}
      {showProgress && (
        <div className="passport-card" style={card}>
          <p style={{ ...eyebrow, marginBottom: 12 }}>Your progress</p>

          {climbList.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: milestoneList.length > 0 ? 14 : 0 }}>
              {climbList.map((c) => (
                <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ width: 26, height: 26, borderRadius: 8, flexShrink: 0, background: 'var(--brand-light)', color: accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }} aria-hidden="true">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17 17 7" /><path d="M9 7h8v8" /></svg>
                  </span>
                  <span style={{ fontSize: 12.5, color: 'var(--txt1)', lineHeight: 1.4 }}>
                    <strong style={{ fontWeight: 700 }}>{c.name}</strong> accuracy climbed {c.fromPct} to {c.toPct}%
                  </span>
                </div>
              ))}
            </div>
          )}

          {milestoneList.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {milestoneList.map((m) => (
                <span key={m} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '6px 11px', borderRadius: 9999,
                  background: 'var(--surface-alt)', border: '1px solid var(--border)',
                  fontSize: 11.5, fontWeight: 600, color: 'var(--txt1)',
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: accent }} aria-hidden="true" />
                  {m}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Per-group accuracy */}
      <div className="passport-card" style={card}>
        <p style={eyebrow}>{isPersonal ? 'Your accuracy by group' : 'Accuracy by group'}</p>
        {topGroups.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0 2px' }}>
            <Mascot variant="think" size={56} />
            <p style={{ fontSize: 12, color: 'var(--txt2)', margin: 0, lineHeight: 1.5 }}>
              {isPersonal
                ? 'Play a few quizzes or blindtests and your strongest groups show up here.'
                : 'No tracked groups yet.'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 13, marginTop: 12 }}>
            {topGroups.map((g) => {
              const pct = Math.round(g.accuracy * 100);
              return (
                <div key={g.name} style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                  {g.logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={g.logo} alt="" style={{ width: 30, height: 30, borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--border)', flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: g.color || 'var(--surface-alt)', border: '1px solid var(--border)', flexShrink: 0 }} />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                      <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--txt1)' }}>{g.name}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--txt2)', fontVariantNumeric: 'tabular-nums' }}>{pct}%</span>
                    </div>
                    <div style={{ height: 7, background: 'var(--surface-alt)', borderRadius: 9999, overflow: 'hidden' }}>
                      <div className="passport-fill" style={{ height: '100%', width: `${pct}%`, background: g.color || accent, borderRadius: 9999 }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Core counters (last, compact) */}
      <div className="passport-card" style={card}>
        <p style={{ ...eyebrow, marginBottom: 14 }}>{isPersonal ? 'Your passport' : 'Passport'}</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
          {counters.map((c) => (
            <div key={c.label}>
              <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--txt1)', fontVariantNumeric: 'tabular-nums', lineHeight: 1.1 }}>
                {c.value}
              </div>
              {c.sub && <div style={{ fontSize: 10, fontWeight: 700, color: accent, marginTop: 1 }}>{c.sub}</div>}
              <div style={{ fontSize: 9.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--txt3)', marginTop: 3 }}>
                {c.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
