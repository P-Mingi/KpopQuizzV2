import { UserAvatar } from '@/components/ui/user-avatar';
import { Mascot } from '@/components/ui/mascot';
import { CountUp } from '@/components/ui/count-up';
import { MASTERY } from '@/lib/passport';
import { badgeIconFor } from '@/lib/badges';
import { AVATAR_PRESETS, nameAccentColor, type AvatarKind } from '@/lib/passport-flair';

// K-pop Passport view (Workstream M, M1.29). Presentational only. ONE profile,
// two modes: 'public' (/u/[username], indexed) is a SHOWCASE and hides any module
// that would render as a wall of zeros; 'personal' (/me) keeps the same layout and
// adds the nudge line plus the full counter row. Dark-mode aware via tokens,
// mobile-first (430px reference), motion gated under prefers-reduced-motion.

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
  accent?: string;
  bias?: string | null;
  ultGroups?: Array<{ name: string; slug: string; color: string }>;
  nearMastery?: PassportNearGap[];
  untouched?: PassportUntouched;
  climbs?: PassportClimb[];
  milestones?: string[];
  avatarUrl: string | null;
  avatarBg: string;
  avatarText: string;
  // M1.26 flair: the name renders in the chosen accent and the pinned badge
  // shows its real coin art beside it.
  nameAccent?: string | null;
  pinnedBadgeId?: string | null;
  avatarKind?: AvatarKind | null;
  avatarRef?: string | null;
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
  playsReceived: number;
  followerCount: number;
  followingCount: number;
  followSlot?: React.ReactNode;
  streakCurrent: number;
  streakLongest: number;
  streakLastActive: string | null;
  groupsMastered: number;
  groupsTotal: number;
  eras: Array<{ era: string; mastered: number; total: number }>;
  topGroups: PassportTopGroup[];
  headerSlot?: React.ReactNode;
  badgesSlot?: React.ReactNode; // badge shelf, sits between collection and best groups
}

const card: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 16,
  boxShadow: 'var(--shadow-card)',
};

const sectionLabel: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
  color: 'var(--txt3)',
  margin: 0,
};

const statCell: React.CSSProperties = {
  ...card,
  borderRadius: 12,
  padding: '10px 6px',
  textAlign: 'center',
};

const STYLE = `
.pp-wrap{max-width:520px;margin:0 auto}
.pp-fill{transform-origin:left center}
@media (prefers-reduced-motion: no-preference){
  .pp-anim .pp-fill{animation:ppGrow .7s cubic-bezier(.2,.8,.2,1) both}
  @keyframes ppGrow{from{transform:scaleX(0)}to{transform:scaleX(1)}}
}
.pp-meta{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pp-strip{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:10px}
.pp-gens{display:grid;grid-template-columns:1fr 1fr;gap:9px 14px;margin-top:10px}
`;

function fmt(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(n);
}

function HeartIcon({ color }: { color: string }): React.ReactElement {
  return (
    <svg width="9" height="9" viewBox="0 0 24 24" fill={color} aria-hidden="true">
      <path d="M12 21s-8-4.9-8-10.4A4.6 4.6 0 0 1 12 7a4.6 4.6 0 0 1 8 3.6C20 16.1 12 21 12 21z" />
    </svg>
  );
}

function FlameIcon(): React.ReactElement {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={{ verticalAlign: '-1px' }}>
      <path d="M12 2c1.5 3.5-1 5-1 7a3 3 0 0 0 6 0c0-.7-.2-1.4-.5-2 2.2 1.6 3.5 4 3.5 6.5a8 8 0 1 1-16 0C4 9 8.5 6.5 12 2z" />
    </svg>
  );
}

/** Avatar slot: custom flatten, preset tile, or photo/initials fallback. */
function PassportAvatar(props: {
  username: string; avatarUrl: string | null; avatarBg: string; avatarText: string;
  avatarKind?: AvatarKind | null; avatarRef?: string | null;
}): React.ReactElement {
  const size = 46;
  const ring: React.CSSProperties = {
    width: size, height: size, borderRadius: '50%', flexShrink: 0,
    border: '1.5px solid var(--pp-accent, var(--brand))', overflow: 'hidden',
  };
  const kind = props.avatarKind ?? 'photo';

  if (kind === 'custom' && props.avatarRef) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={props.avatarRef} alt="" style={{ ...ring, objectFit: 'cover', background: 'var(--surface-alt)' }} />
    );
  }
  if (kind === 'preset' && props.avatarRef && AVATAR_PRESETS[props.avatarRef]) {
    const p = AVATAR_PRESETS[props.avatarRef]!;
    return (
      <div style={{ ...ring, background: p.bg, color: p.fg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 17 }}>
        {props.username.slice(0, 2).toUpperCase()}
      </div>
    );
  }
  return (
    <div style={ring}>
      <UserAvatar username={props.username} avatarUrl={props.avatarUrl} bgColor={props.avatarBg} textColor={props.avatarText} size={size} />
    </div>
  );
}

export function PassportView(props: PassportViewProps): React.ReactElement {
  const {
    mode, username, displayName, bio, bias, ultGroups, nearMastery, avatarUrl, avatarBg, avatarText,
    nameAccent, pinnedBadgeId, avatarKind, avatarRef, joinedLabel,
    level, levelTitleEn, xp, xpForNext, xpPct,
    quizzesPlayed, blindtestsPlayed, duelsVoted, battlesPlayed, battlesWon, quizzesCreated,
    playsReceived, followerCount, followSlot,
    streakCurrent, groupsMastered, groupsTotal, eras, topGroups, headerSlot, badgesSlot,
  } = props;

  const isPersonal = mode === 'personal';
  const accentName = nameAccentColor(nameAccent);
  // C3: the passport theme accent (avatar ring, XP bar, ult-chip border). Was a
  // dead prop before this. Default theme resolves to var(--brand) = no change.
  const themeAccent = props.accent ?? 'var(--brand)';
  const themed = themeAccent !== 'var(--brand)';
  const ults = (ultGroups ?? []).slice(0, 3);
  const pinnedIcon = badgeIconFor(pinnedBadgeId);
  const tracked = topGroups.filter((g) => g.plays > 0);

  // Public is a showcase: a module that would render as a wall of zeros hides.
  // Personal keeps them, because that page is the owner's own dashboard.
  const showCollection = isPersonal || groupsMastered > 0;
  const showBestGroups = tracked.length > 0;

  const metaBits = [
    `@${username}`,
    bias && bias.trim() ? `bias ${bias.trim()}` : null,
    `${fmt(followerCount)} ${followerCount === 1 ? 'follower' : 'followers'}`,
    `since ${joinedLabel}`,
  ].filter((x): x is string => Boolean(x));

  const nextGap = (nearMastery ?? [])[0];

  return (
    <div className="pp-wrap pp-anim" style={{ ['--pp-accent' as string]: themeAccent } as React.CSSProperties}>
      <style dangerouslySetInnerHTML={{ __html: STYLE }} />

      {/* HEADER CARD: identity, ults, and the XP bar as the card's bottom edge. */}
      <section style={{ ...card, padding: '16px 20px 0', overflow: 'hidden' }}>
        <div style={{ display: 'flex', gap: 11, alignItems: 'center', marginTop: 6 }}>
          <PassportAvatar
            username={username} avatarUrl={avatarUrl} avatarBg={avatarBg} avatarText={avatarText}
            avatarKind={avatarKind ?? null} avatarRef={avatarRef ?? null}
          />

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: 16.5, fontWeight: 500, color: accentName, lineHeight: 1.15, margin: 0 }}>{displayName}</h1>
              {pinnedIcon && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={pinnedIcon} alt="" width={17} height={17} style={{ width: 17, height: 17, objectFit: 'contain', flexShrink: 0 }} />
              )}
              <span style={{
                fontSize: 10.5, fontWeight: 500, padding: '2px 7px', borderRadius: 999,
                background: 'var(--brand-light)', color: 'var(--brand-dark)', whiteSpace: 'nowrap',
              }}>
                LV {level} {'·'} {levelTitleEn}
              </span>
            </div>
            <p className="pp-meta" style={{ fontSize: 12, color: 'var(--txt2)', margin: '3px 0 0' }}>
              {metaBits.join(` ${'·'} `)}
            </p>
          </div>

          <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            {!isPersonal && followSlot}
            {headerSlot}
          </div>
        </div>

        {/* Ult chips + XP microtext */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', margin: '10px 0 12px' }}>
          {ults.map((g) => (
            <a key={g.slug} href={`/${g.slug}-quiz`} style={{
              display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 500,
              padding: '3px 9px', borderRadius: 999,
              border: themed ? `1px solid color-mix(in srgb, ${themeAccent} 50%, var(--border))` : '1px solid var(--border)',
              color: 'var(--txt2)', textDecoration: 'none',
            }}>
              <HeartIcon color={g.color || 'var(--brand)'} />
              {g.name}
            </a>
          ))}
          <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--txt3)', whiteSpace: 'nowrap' }}>
            {fmt(xp)} / {xpForNext !== null ? fmt(xpForNext) : 'max'} xp
          </span>
        </div>

        {/* XP bar IS the card's bottom edge (full bleed past the padding). */}
        <div style={{ height: 3, background: 'var(--surface-alt)', margin: '0 -20px' }}>
          <div
            className="pp-fill"
            style={{
              height: '100%',
              background: 'var(--pp-accent, var(--brand))',
              width: xpPct > 0 ? `max(6px, ${Math.min(100, xpPct)}%)` : 0,
            }}
          />
        </div>
      </section>

      {/* STAT STRIP: the 4 public cells. */}
      <div className="pp-strip">
        <div style={statCell}>
          <p style={{ fontSize: 18, fontWeight: 500, margin: 0, color: 'var(--combo)', fontVariantNumeric: 'tabular-nums' }}>
            <FlameIcon /> {streakCurrent}
          </p>
          <p style={{ fontSize: 10.5, color: 'var(--txt3)', margin: '2px 0 0' }}>Day streak</p>
        </div>
        <div style={statCell}>
          <p style={{ fontSize: 18, fontWeight: 500, margin: 0, color: 'var(--brand-dark)', fontVariantNumeric: 'tabular-nums' }}>
            {groupsMastered}/{groupsTotal}
          </p>
          <p style={{ fontSize: 10.5, color: 'var(--txt3)', margin: '2px 0 0' }}>Mastered</p>
        </div>
        <div style={statCell}>
          <p style={{ fontSize: 18, fontWeight: 500, margin: 0, color: 'var(--txt1)', fontVariantNumeric: 'tabular-nums' }}>
            <CountUp value={quizzesCreated} compact />
          </p>
          <p style={{ fontSize: 10.5, color: 'var(--txt3)', margin: '2px 0 0' }}>Quizzes made</p>
        </div>
        <div style={statCell}>
          <p style={{ fontSize: 18, fontWeight: 500, margin: 0, color: 'var(--txt1)', fontVariantNumeric: 'tabular-nums' }}>
            <CountUp value={playsReceived} compact />
          </p>
          <p style={{ fontSize: 10.5, color: 'var(--txt3)', margin: '2px 0 0' }}>Plays received</p>
        </div>
      </div>

      {/* PERSONAL ONLY: the old counter block now lives here and nowhere else. */}
      {isPersonal && (
        <div className="pp-strip">
          {[
            { value: fmt(quizzesPlayed), label: 'Quizzes played' },
            { value: fmt(blindtestsPlayed), label: 'Blindtests' },
            { value: fmt(duelsVoted), label: 'Duels voted' },
            { value: fmt(battlesPlayed), label: `Battles (${fmt(battlesWon)} won)` },
          ].map((s) => (
            <div key={s.label} style={statCell}>
              <p style={{ fontSize: 18, fontWeight: 500, margin: 0, color: 'var(--txt1)', fontVariantNumeric: 'tabular-nums' }}>{s.value}</p>
              <p style={{ fontSize: 10.5, color: 'var(--txt3)', margin: '2px 0 0' }}>{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* COLLECTION */}
      {showCollection && (
        <section style={{ ...card, padding: 16, marginTop: 10 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
            <p
              style={sectionLabel}
              title={`A group is mastered at ${Math.round(MASTERY.minAccuracy * 100)}% accuracy over ${MASTERY.minPlays}+ questions.`}
            >
              Collection
            </p>
            <span style={{ fontSize: 12, color: 'var(--txt2)', fontVariantNumeric: 'tabular-nums' }}>
              {groupsMastered} / {groupsTotal} groups
            </span>
          </div>

          <div style={{ height: 7, borderRadius: 999, background: 'var(--surface-alt)', overflow: 'hidden', marginTop: 10 }}>
            <div
              className="pp-fill"
              style={{
                height: '100%', borderRadius: 999, background: 'var(--brand)',
                width: groupsTotal > 0 && groupsMastered > 0 ? `max(10px, ${(groupsMastered / groupsTotal) * 100}%)` : 0,
              }}
            />
          </div>

          <div className="pp-gens">
            {eras.map((e) => {
              const pct = e.total > 0 ? (e.mastered / e.total) * 100 : 0;
              return (
                <div key={e.era}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6, marginBottom: 4 }}>
                    <span style={{ fontSize: 11.5, color: 'var(--txt2)' }}>{e.era}</span>
                    <span style={{ fontSize: 11.5, color: 'var(--txt3)', fontVariantNumeric: 'tabular-nums' }}>{e.mastered}/{e.total}</span>
                  </div>
                  <div style={{ height: 4, borderRadius: 999, background: 'var(--surface-alt)', overflow: 'hidden' }}>
                    <div className="pp-fill" style={{ height: '100%', borderRadius: 999, background: 'var(--brand)', width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>

          {isPersonal && nextGap && (
            <p style={{ fontSize: 12, color: 'var(--brand-dark)', margin: '12px 0 0', display: 'flex', alignItems: 'center', gap: 6 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" style={{ flexShrink: 0 }}>
                <circle cx="12" cy="12" r="9" />
                <circle cx="12" cy="12" r="4" />
              </svg>
              {nextGap.kind === 'plays'
                ? `${nextGap.playsNeeded} more plays to master ${nextGap.name}`
                : `Raise ${nextGap.name} accuracy to master it`}
            </p>
          )}
        </section>
      )}

      {/* BADGES shelf sits between collection and best groups. */}
      {badgesSlot}

      {/* BEST GROUPS: hidden entirely when nothing is tracked. */}
      {showBestGroups && (
        <section style={{ ...card, padding: 16, marginTop: 10 }}>
          <p style={sectionLabel}>Best groups</p>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
            {tracked.slice(0, 3).map((g) => (
              <span key={g.name} style={{
                fontSize: 12, fontWeight: 500, padding: '4px 10px', borderRadius: 999,
                background: 'var(--brand-light)', color: 'var(--brand-dark)', whiteSpace: 'nowrap',
              }}>
                {g.name} {Math.round(g.accuracy * 100)}%
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Bio: user-authored identity, kept. */}
      {bio && bio.trim() && (
        <section style={{ ...card, padding: 16, marginTop: 10 }}>
          <p style={{ fontSize: 13, color: 'var(--txt2)', margin: 0, lineHeight: 1.55 }}>{bio.trim()}</p>
        </section>
      )}

      {/* The only place the mascot appears: an empty-state invite. */}
      {isPersonal && quizzesPlayed === 0 && quizzesCreated === 0 && (
        <section style={{ ...card, padding: 20, marginTop: 10, textAlign: 'center' }}>
          <Mascot variant="celebrate" size={56} />
          <p style={{ fontSize: 13.5, color: 'var(--txt1)', margin: '8px 0 0', fontWeight: 600 }}>Your passport starts here</p>
          <p style={{ fontSize: 12, color: 'var(--txt2)', margin: '4px 0 0' }}>Play a quiz to fill in your first stamp.</p>
        </section>
      )}
    </div>
  );
}
