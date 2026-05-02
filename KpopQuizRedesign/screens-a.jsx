/* global React, Icon, fmtCount, TypePill, DifficultyPill, GroupLogo, GroupPill, Avatar */
const { useState: useS, useMemo: useM, useEffect: useE, useRef: useR } = React;

// ─── Section header ──────────────────────────────────────────────────────────
function SectionHead({ title, kicker, right }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
      <div>
        {kicker && <div className="kicker" style={{ marginBottom: 4 }}>{kicker}</div>}
        <h2 className="h-section" style={{ fontSize: 16 }}>{title}</h2>
      </div>
      {right}
    </div>
  );
}

// ─── Reused feed card (light variant) ────────────────────────────────────────
function MiniQuizRow({ quiz, onPlay }) {
  const g = window.GROUPS.find(x => x.slug === quiz.group);
  return (
    <button onClick={() => onPlay(quiz)} className="card" style={{
      padding: 12, textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12, width: '100%',
    }}>
      <div style={{ width: 44, height: 44, borderRadius: 10, background: g.color, overflow: 'hidden', flexShrink: 0 }}>
        <img src={g.logo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.9 }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.3, marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{quiz.title}</div>
        <div style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <TypePill type={quiz.type} /> · {fmtCount(quiz.plays)} plays
        </div>
      </div>
      <Icon.ArrowRight size={14} style={{ color: 'var(--text-tertiary)' }} />
    </button>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// GROUP PAGE
// ───────────────────────────────────────────────────────────────────────────
function GroupPage({ slug, onPlay, onBack }) {
  const g = window.GROUPS.find(x => x.slug === slug) || window.GROUPS[0];
  const groupQuizzes = window.QUIZZES.filter(q => q.group === slug);
  const fallback = groupQuizzes.length ? groupQuizzes : window.QUIZZES.slice(0,3);
  return (
    <div className="anim-fadeSlideUp">
      {/* Hero */}
      <div style={{
        margin: '0 -16px', padding: '24px 16px 28px',
        background: `linear-gradient(150deg, ${g.color}, color-mix(in srgb, ${g.color} 60%, var(--accent)))`,
        color: '#fff', position: 'relative', overflow: 'hidden',
      }}>
        <button onClick={onBack} style={{
          background: 'rgba(255,255,255,0.16)', border: 0, color: '#fff',
          padding: '6px 10px', borderRadius: 9999, fontSize: 12, fontWeight: 600,
          display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 16,
        }}>
          <Icon.ArrowLeft size={12} /> Back
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <GroupLogo slug={g.slug} size={72} ring />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', opacity: 0.8 }}>
              FANDOM · {g.fandom}
            </div>
            <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.025em', lineHeight: 1.05, marginTop: 4 }}>
              {g.name}
            </h1>
            <div style={{ fontSize: 12, opacity: 0.85, marginTop: 4 }}>
              {g.members.length} members · {fallback.length * 12 + 24} quizzes
            </div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 20 }}>
          <HeroStat label="Total plays" value={fmtCount(fallback.reduce((s,q)=>s+q.plays,0))} />
          <HeroStat label="Avg score" value="71%" />
          <HeroStat label="Top fan" value="@kwangya" />
        </div>
      </div>

      <div style={{ padding: '20px 0' }}>
        <SectionHead kicker="Members" title={`Meet ${g.name}`} />
        <div className="scrollbar-hide" style={{ display: 'flex', gap: 10, overflowX: 'auto', margin: '0 -16px', padding: '4px 16px 8px' }}>
          {g.members.map(m => (
            <div key={m} style={{ flexShrink: 0, width: 72, textAlign: 'center' }}>
              <div className="placeholder-stripes" style={{ width: 64, height: 64, borderRadius: '50%', margin: '0 auto 6px' }}>{m.charAt(0)}</div>
              <div style={{ fontSize: 11, fontWeight: 600 }}>{m}</div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 24 }}>
          <SectionHead title={`Quizzes about ${g.name}`} right={<a className="kicker" href="#all" style={{ color: 'var(--accent)' }}>See all →</a>} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {fallback.map(q => <MiniQuizRow key={q.id} quiz={q} onPlay={onPlay} />)}
          </div>
        </div>
      </div>
    </div>
  );
}

function HeroStat({ label, value }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.16)', borderRadius: 10, padding: '10px 12px',
      backdropFilter: 'blur(4px)',
    }}>
      <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: '-0.02em' }}>{value}</div>
      <div style={{ fontSize: 10, fontWeight: 600, opacity: 0.85, textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 2 }}>{label}</div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// SEARCH / BROWSE
// ───────────────────────────────────────────────────────────────────────────
function SearchPage({ onPlay, onBack }) {
  const [query, setQuery] = useS('');
  const [tab, setTab] = useS('top');
  const tabs = [
    { id: 'top', label: 'Top' },
    { id: 'easy', label: 'Easy' },
    { id: 'hard', label: 'Hard' },
    { id: 'most-liked', label: 'Most liked' },
    { id: 'new', label: 'New' },
  ];

  const filtered = useM(() => {
    let list = [...window.QUIZZES];
    if (query) list = list.filter(q => q.title.toLowerCase().includes(query.toLowerCase()) || q.group.includes(query.toLowerCase()));
    if (tab === 'easy') list = list.filter(q => q.difficulty === 'easy');
    if (tab === 'hard') list = list.filter(q => q.difficulty === 'hard');
    if (tab === 'most-liked') list = [...list].sort((a,b) => b.likes - a.likes);
    if (tab === 'new') list = [...list].reverse();
    return list;
  }, [query, tab]);

  return (
    <div className="anim-fadeSlideUp" style={{ paddingTop: 12 }}>
      <button onClick={onBack} className="btn btn-ghost" style={{ marginBottom: 12, padding: '6px 10px', fontSize: 12 }}>
        <Icon.ArrowLeft size={12} /> Back
      </button>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '12px 14px', background: 'var(--bg-surface)',
        border: '1px solid var(--border)', borderRadius: 12, marginBottom: 14,
      }}>
        <Icon.Search size={16} style={{ color: 'var(--text-tertiary)' }} />
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search quizzes, groups, members..." style={{
          flex: 1, border: 0, outline: 0, background: 'transparent', color: 'var(--text-primary)',
          fontSize: 14, fontFamily: 'inherit',
        }} />
        {query && <button onClick={() => setQuery('')} style={{ background: 0, border: 0, color: 'var(--text-tertiary)', cursor: 'pointer' }}><Icon.X size={14} /></button>}
      </div>

      <div className="scrollbar-hide" style={{ display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 16, paddingBottom: 4 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: '6px 14px', borderRadius: 9999,
            border: '1px solid ' + (tab === t.id ? 'var(--text-primary)' : 'var(--border)'),
            background: tab === t.id ? 'var(--text-primary)' : 'var(--bg-surface)',
            color: tab === t.id ? 'var(--bg-primary)' : 'var(--text-primary)',
            fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0,
          }}>{t.label}</button>
        ))}
      </div>

      {!query && tab === 'top' && (
        <div style={{ marginBottom: 20 }}>
          <SectionHead title="Popular groups" kicker="Browse" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
            {window.GROUPS.slice(0,8).map(g => (
              <button key={g.slug} className="card" style={{ padding: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <GroupLogo slug={g.slug} size={48} />
                <span style={{ fontSize: 10.5, fontWeight: 600, textAlign: 'center' }}>{g.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <SectionHead title={`${filtered.length} ${filtered.length === 1 ? 'quiz' : 'quizzes'}`} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.map(q => <MiniQuizRow key={q.id} quiz={q} onPlay={onPlay} />)}
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// PROFILE
// ───────────────────────────────────────────────────────────────────────────
function ProfilePage({ isPublic = false, onPlay, onBack, onSettings }) {
  const p = window.PROFILE;
  const xpPct = (p.xpInto / p.xpNext) * 100;

  return (
    <div className="anim-fadeSlideUp" style={{ paddingTop: 16 }}>
      {isPublic && (
        <button onClick={onBack} className="btn btn-ghost" style={{ marginBottom: 12, padding: '6px 10px', fontSize: 12 }}>
          <Icon.ArrowLeft size={12} /> Back
        </button>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
        <Avatar creator={{ name: p.username, bg: p.bg, text: p.text }} size={72} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="kicker" style={{ marginBottom: 2, color: 'var(--accent)' }}>Lv {p.level} · {p.levelTitle}</div>
          <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.1 }}>{p.displayName}</h1>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>@{p.username} · {p.joined}</div>
        </div>
        {!isPublic && (
          <button onClick={onSettings} className="btn btn-ghost" style={{ padding: 8 }} aria-label="Settings">
            <Icon.Settings size={16} />
          </button>
        )}
      </div>

      {/* XP / byeol bar */}
      <div className="card" style={{ padding: 16, marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon.Sparkle size={14} style={{ color: 'var(--accent)' }} />
            <span style={{ fontSize: 13, fontWeight: 700 }}>{p.byeol.toLocaleString()} byeol</span>
          </div>
          <span className="kicker">{p.xpInto} / {p.xpNext} XP</span>
        </div>
        <div style={{ height: 8, borderRadius: 9999, background: 'var(--bg-elevated)', overflow: 'hidden' }}>
          <div style={{ width: `${xpPct}%`, height: '100%', borderRadius: 9999, background: 'var(--accent)', transition: 'width 400ms ease' }}></div>
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 8 }}>
          Next: <strong style={{ color: 'var(--text-primary)' }}>Lv {p.level + 1} · Ultimate Stan</strong>
        </div>
      </div>

      {/* Stats grid */}
      <div className="card" style={{ padding: 16, marginBottom: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          <ProfileStat label="Played" value={p.stats.quizzesPlayed} />
          <ProfileStat label="Created" value={p.stats.quizzesCreated} />
          <ProfileStat label="Perfects" value={p.stats.perfectScores} accent />
          <ProfileStat label="Streak" value={`${p.stats.dayStreak}d`} />
          <ProfileStat label="Avg score" value={`${p.stats.avgScore}%`} />
          <ProfileStat label="Rank" value={`#${p.stats.rank}`} />
        </div>
      </div>

      {/* Top fandoms */}
      <div className="card" style={{ padding: 16, marginBottom: 14 }}>
        <SectionHead title="Top fandoms" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {p.fandoms.map(f => {
            const g = window.GROUPS.find(x => x.slug === f.group);
            const max = p.fandoms[0].plays;
            return (
              <div key={f.group} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <GroupLogo slug={f.group} size={28} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>{g.name}</div>
                  <div style={{ height: 6, background: 'var(--bg-elevated)', borderRadius: 9999, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${(f.plays/max)*100}%`, background: g.color, borderRadius: 9999 }}></div>
                  </div>
                </div>
                <span className="kicker tabular-nums">{f.plays}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Badges */}
      <div className="card" style={{ padding: 16, marginBottom: 14 }}>
        <SectionHead title="Badges" right={<span className="kicker">{p.badges.filter(b=>b.earned).length} of {p.badges.length}</span>} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {p.badges.map(b => (
            <div key={b.id} style={{
              padding: 10, borderRadius: 10,
              background: b.earned ? 'var(--bg-accent-subtle)' : 'var(--bg-elevated)',
              border: '1px solid ' + (b.earned ? 'var(--accent-light)' : 'var(--border)'),
              opacity: b.earned ? 1 : 0.6, textAlign: 'center',
            }}>
              <div style={{ fontSize: 22, marginBottom: 4 }}>{b.earned ? '🏆' : '🔒'}</div>
              <div style={{ fontSize: 11, fontWeight: 700, lineHeight: 1.2, color: b.earned ? 'var(--accent)' : 'var(--text-secondary)' }}>{b.name}</div>
              {!b.earned && b.prog !== undefined && (
                <div style={{ height: 3, background: 'var(--border)', borderRadius: 9999, marginTop: 6, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${b.prog*100}%`, background: 'var(--text-tertiary)' }}></div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Recent */}
      <div className="card" style={{ padding: 16 }}>
        <SectionHead title="Recently played" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {p.recentQuizzes.map(id => {
            const q = window.QUIZZES.find(x => x.id === id);
            return q ? <MiniQuizRow key={id} quiz={q} onPlay={onPlay} /> : null;
          })}
        </div>
      </div>
    </div>
  );
}

function ProfileStat({ label, value, accent }) {
  return (
    <div>
      <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em', color: accent ? 'var(--accent)' : 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-tertiary)', marginTop: 2 }}>{label}</div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// LEADERBOARD / HALL OF FAME
// ───────────────────────────────────────────────────────────────────────────
function LeaderboardPage({ onBack }) {
  const [scope, setScope] = useS('week');
  return (
    <div className="anim-fadeSlideUp" style={{ paddingTop: 12 }}>
      <button onClick={onBack} className="btn btn-ghost" style={{ marginBottom: 12, padding: '6px 10px', fontSize: 12 }}>
        <Icon.ArrowLeft size={12} /> Back
      </button>

      <div style={{ textAlign: 'center', marginBottom: 18 }}>
        <div className="kicker" style={{ marginBottom: 6 }}>Hall of Fame</div>
        <h1 className="h-display">Top fans this week</h1>
        <p className="muted" style={{ fontSize: 13, marginTop: 8 }}>Earn byeol by playing quizzes, maintaining streaks, and creating content.</p>
      </div>

      <div className="scrollbar-hide" style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 18 }}>
        {[{id:'day',label:'Today'},{id:'week',label:'This week'},{id:'month',label:'Month'},{id:'all',label:'All-time'}].map(t => (
          <button key={t.id} onClick={() => setScope(t.id)} style={{
            padding: '6px 14px', borderRadius: 9999,
            border: '1px solid ' + (scope === t.id ? 'var(--text-primary)' : 'var(--border)'),
            background: scope === t.id ? 'var(--text-primary)' : 'var(--bg-surface)',
            color: scope === t.id ? 'var(--bg-primary)' : 'var(--text-primary)',
            fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
          }}>{t.label}</button>
        ))}
      </div>

      {/* Podium */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: 12, marginBottom: 24 }}>
        {[window.LEADERBOARD[1], window.LEADERBOARD[0], window.LEADERBOARD[2]].map((u, i) => {
          const pos = [2,1,3][i];
          const heights = [88, 112, 76];
          const colors = ['#B0B0B0', 'var(--accent)', '#CD7F32'];
          return (
            <div key={u.name} style={{ flex: 1, textAlign: 'center', maxWidth: 110 }}>
              <Avatar creator={{ name: u.name, bg: u.bg, text: u.text }} size={pos===1?64:52} />
              <div style={{ fontSize: 12, fontWeight: 700, marginTop: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>@{u.name}</div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 6 }}>{u.byeol.toLocaleString()} byeol</div>
              <div style={{
                height: heights[i], borderRadius: '12px 12px 0 0',
                background: `linear-gradient(180deg, ${colors[i]}, color-mix(in srgb, ${colors[i]} 60%, var(--bg-primary)))`,
                display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: 8,
                color: '#fff', fontWeight: 800, fontSize: 22, letterSpacing: '-0.04em',
              }}>{pos}</div>
            </div>
          );
        })}
      </div>

      {/* Rest of list */}
      <div className="card" style={{ padding: 8 }}>
        {window.LEADERBOARD.slice(3).map((u, i) => (
          <div key={u.name} style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
            background: u.isMe ? 'var(--bg-accent-subtle)' : 'transparent',
            border: u.isMe ? '1px solid var(--accent-light)' : 'none',
            borderRadius: u.isMe ? 10 : 0,
            borderTop: !u.isMe && i > 0 ? '1px solid var(--border-subtle)' : 'none',
          }}>
            <span className="tabular-nums" style={{ width: 28, color: 'var(--text-tertiary)', fontSize: 13, fontWeight: 700 }}>#{u.rank}</span>
            <Avatar creator={{ name: u.name, bg: u.bg, text: u.text }} size={32} />
            <div style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>
              @{u.name} {u.isMe && <span className="kicker" style={{ color: 'var(--accent)', marginLeft: 4 }}>You</span>}
            </div>
            <div className="tabular-nums" style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)' }}>
              {u.byeol.toLocaleString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Add a Settings icon to the Icon namespace if missing
if (!window.Icon.Settings) {
  window.Icon.Settings = ({ size, ...p }) => (
    <svg viewBox="0 0 24 24" width={size||16} height={size||16} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z"/>
    </svg>
  );
}

Object.assign(window, { GroupPage, SearchPage, ProfilePage, LeaderboardPage, MiniQuizRow, SectionHead });
