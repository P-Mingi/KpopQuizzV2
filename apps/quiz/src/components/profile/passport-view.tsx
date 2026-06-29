import { UserAvatar } from '@/components/ui/user-avatar';
import { Mascot } from '@/components/ui/mascot';
import { MASTERY } from '@/lib/passport';

// K-pop Passport view (Workstream M, M1.1). Presentational only: the /me page
// (and later the harmonized /u/[username]) resolve the data and pass it in. ONE
// profile, not two. Framing is STRICTLY PERSONAL: you vs your past self. No
// percentile, no rank, no #N, no social. Dark-mode aware via CSS tokens.

export interface PassportTopGroup {
  name: string;
  logo: string | null;
  color: string;
  plays: number;
  accuracy: number; // 0..1
}

export interface PassportViewProps {
  username: string;
  displayName: string;
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
  groupsMastered: number;
  groupsTotal: number;
  eras: Array<{ era: string; mastered: number; total: number }>;
  topGroups: PassportTopGroup[];
}

const card: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 16,
  boxShadow: 'var(--shadow-card)',
  padding: 16,
};

const eyebrow: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.12em',
  color: 'var(--txt3)',
  margin: '0 0 12px',
};

function fmt(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(n);
}

export function PassportView(props: PassportViewProps): React.ReactElement {
  const {
    username, displayName, avatarUrl, avatarBg, avatarText, joinedLabel,
    level, levelTitleEn, levelTitleKr, xp, xpForNext, xpPct, nextTitleEn,
    quizzesPlayed, blindtestsPlayed, duelsVoted, battlesPlayed, battlesWon, quizzesCreated,
    streakCurrent, streakLongest, groupsMastered, groupsTotal, eras, topGroups,
  } = props;

  const counters: Array<{ label: string; value: string; sub?: string }> = [
    { label: 'Quizzes played', value: fmt(quizzesPlayed) },
    { label: 'Blindtests', value: fmt(blindtestsPlayed) },
    { label: 'Duels voted', value: fmt(duelsVoted) },
    { label: 'Battles', value: fmt(battlesPlayed), sub: `${fmt(battlesWon)} won` },
    { label: 'Quizzes made', value: fmt(quizzesCreated) },
    { label: 'XP earned', value: fmt(xp) },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 16, paddingBottom: 40 }}>
      {/* Identity header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <UserAvatar username={username} avatarUrl={avatarUrl} bgColor={avatarBg} textColor={avatarText} size={72} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '0.12em', color: 'var(--brand)', marginBottom: 2,
          }}>
            Lv {level} {'·'} {levelTitleEn}
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.1, margin: 0, color: 'var(--txt1)' }}>
            {displayName}
          </h1>
          <div style={{ fontSize: 12, color: 'var(--txt2)', marginTop: 2 }}>
            @{username} {'·'} Joined {joinedLabel}
          </div>
        </div>
      </div>

      {/* Fan Level card (reuses the canonical fan-level-card styling) */}
      <div className="fan-level-card">
        <div className="fan-level-card-top">
          <span className="fan-level-card-level">Level {level}</span>
          <span className="fan-level-card-level">{xp} / {xpForNext ?? '---'} XP</span>
        </div>
        <p className="fan-level-card-title">{levelTitleEn}<span className="fan-level-card-kr">{levelTitleKr}</span></p>
        <div className="fan-level-card-bar" aria-hidden="true">
          <div className="fan-level-card-fill" style={{ width: `${xpPct}%` }} />
        </div>
        {nextTitleEn && (
          <p className="fan-level-card-next">Next: <strong>{nextTitleEn}</strong> at Level {level + 1}</p>
        )}
      </div>

      {/* Core counters */}
      <div style={card}>
        <p style={eyebrow}>Your passport</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
          {counters.map((c) => (
            <div key={c.label}>
              <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--txt1)', fontVariantNumeric: 'tabular-nums', lineHeight: 1.1 }}>
                {c.value}
              </div>
              {c.sub && (
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--brand)', marginTop: 1 }}>{c.sub}</div>
              )}
              <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--txt3)', marginTop: 3 }}>
                {c.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Streak readout (canonical daily streak) */}
      <div style={{ ...card, display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{
          width: 52, height: 52, borderRadius: 14, flexShrink: 0,
          background: 'var(--brand-light)', color: 'var(--streak)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} aria-hidden="true">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2c1 3-1 4-2 6s0 4 0 4-2-1-2-3c-2 2-3 4-3 6a7 7 0 0014 0c0-4-3-6-4-9-1-2-1-3 0-4-2 0-4 2-3 5 0 0-1-2 0-4-1 1-2 2-2 3 0-2 1-3 2-4z" />
          </svg>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--txt1)', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
            {streakCurrent} {streakCurrent === 1 ? 'day' : 'days'}
          </div>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--txt3)', marginTop: 3 }}>
            Daily streak {'·'} best {streakLongest}
          </div>
        </div>
        <div style={{ fontSize: 11, color: 'var(--txt2)', maxWidth: 130, textAlign: 'right', lineHeight: 1.4 }}>
          {streakCurrent > 0 ? 'Keep it alive: play the daily.' : 'Play the daily to start one.'}
        </div>
      </div>

      {/* Collection: groups mastered + per-era bars */}
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 4 }}>
          <p style={{ ...eyebrow, margin: 0 }}>Collection</p>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--txt3)', fontVariantNumeric: 'tabular-nums' }}>
            {groupsMastered} / {groupsTotal} mastered
          </span>
        </div>
        <p style={{ fontSize: 11, color: 'var(--txt2)', margin: '0 0 14px', lineHeight: 1.5 }}>
          Master a group by reaching {Math.round(MASTERY.minAccuracy * 100)}% accuracy over {MASTERY.minPlays}+ questions.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {eras.map((e) => {
            const pct = e.total > 0 ? (e.mastered / e.total) * 100 : 0;
            return (
              <div key={e.era} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ width: 56, flexShrink: 0, fontSize: 12, fontWeight: 700, color: 'var(--txt2)' }}>{e.era}</span>
                <div style={{ flex: 1, height: 8, background: 'var(--surface-alt)', borderRadius: 9999, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: 'var(--brand)', borderRadius: 9999 }} />
                </div>
                <span style={{ width: 40, flexShrink: 0, textAlign: 'right', fontSize: 11, fontWeight: 700, color: 'var(--txt3)', fontVariantNumeric: 'tabular-nums' }}>
                  {e.mastered}/{e.total}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Per-group accuracy (top groups by plays) */}
      <div style={card}>
        <p style={eyebrow}>Your accuracy by group</p>
        {topGroups.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0' }}>
            <Mascot variant="think" size={56} />
            <p style={{ fontSize: 12, color: 'var(--txt2)', margin: 0, lineHeight: 1.5 }}>
              Play a few quizzes or blindtests and your strongest groups show up here.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {topGroups.map((g) => {
              const pct = Math.round(g.accuracy * 100);
              return (
                <div key={g.name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {g.logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={g.logo} alt={g.name} style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--border)', flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: g.color || 'var(--surface-alt)', border: '1px solid var(--border)', flexShrink: 0 }} />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--txt1)' }}>{g.name}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--txt2)', fontVariantNumeric: 'tabular-nums' }}>{pct}%</span>
                    </div>
                    <div style={{ height: 6, background: 'var(--surface-alt)', borderRadius: 9999, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: g.color || 'var(--brand)', borderRadius: 9999 }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
