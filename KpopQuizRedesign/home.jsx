/* global React, Icon, fmtCount, TypePill, DifficultyPill, GroupLogo, GroupPill, Avatar */
const { useState: useStateH, useMemo: useMemoH } = React;

// ─── Top nav (desktop ≥768px) ──────────────────────────────────────────────
function TopNav({ active='home', onNav = () => {}, onSearch, onCreate }) {
  const items = [
    { id: 'home',        label: 'Home',  icon: Icon.Home },
    { id: 'games',       label: 'Games', icon: Icon.Trophy },
    { id: 'cards',       label: 'Cards', icon: Icon.Sparkle },
    { id: 'leaderboard', label: 'Ranks', icon: Icon.Star },
  ];
  const profile = window.PROFILE || {};
  return (
    <header className="top-nav" style={{
      position: 'sticky', top: 0, zIndex: 30,
      background: 'color-mix(in srgb, var(--bg-primary) 92%, transparent)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid var(--border)',
    }}>
      <div className="top-nav-inner" style={{
        display: 'flex', alignItems: 'center', gap: 16,
        padding: '12px 20px', maxWidth: 1240, margin: '0 auto',
      }}>
        {/* Logo */}
        <a href="#home" onClick={(e) => { e.preventDefault(); onNav('home'); }} style={{
          display: 'flex', alignItems: 'center', gap: 8,
          fontWeight: 800, fontSize: 18, letterSpacing: '-0.02em',
          color: 'var(--text-primary)', textDecoration: 'none',
        }}>
          <span style={{
            width: 28, height: 28, borderRadius: 8,
            background: 'var(--accent)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--accent-fg)',
          }}>
            <Icon.Sparkle size={16} />
          </span>
          <span className="top-nav-brand">KpopQuiz</span>
        </a>

        {/* Tabs (desktop only) */}
        <nav className="top-nav-tabs" style={{
          display: 'flex', alignItems: 'center', gap: 4,
          marginLeft: 12,
        }}>
          {items.map((t) => {
            const Ic = t.icon;
            const isActive = active === t.id;
            return (
              <button key={t.id} onClick={() => onNav(t.id)} style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '8px 12px', borderRadius: 9999,
                background: isActive ? 'color-mix(in srgb, var(--accent) 10%, transparent)' : 'transparent',
                color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                border: 'none', cursor: 'pointer',
                fontFamily: 'inherit', fontSize: 14, fontWeight: 600,
                transition: 'all 160ms ease',
              }}>
                <Ic size={14} {...(isActive ? { filled: true } : {})} />
                {t.label}
              </button>
            );
          })}
        </nav>

        <div style={{ flex: 1 }}></div>

        {/* Search */}
        <button className="btn btn-ghost top-nav-search" onClick={onSearch} aria-label="Search" style={{
          padding: '8px 12px', display: 'inline-flex', alignItems: 'center', gap: 6,
          color: 'var(--text-secondary)',
        }}>
          <Icon.Search size={14} /><span className="top-nav-search-label">Search</span>
        </button>

        {/* Create */}
        <button className="btn btn-primary" onClick={onCreate} style={{
          padding: '8px 14px', display: 'inline-flex', alignItems: 'center', gap: 6,
        }}>
          <Icon.Plus size={14} /><span className="top-nav-create-label">Create</span>
        </button>

        {/* Profile chip with byeol */}
        <button onClick={() => onNav('profile')} className="top-nav-profile" style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '4px 10px 4px 4px', borderRadius: 9999,
          background: 'var(--bg-surface)', border: '1px solid var(--border)',
          cursor: 'pointer', fontFamily: 'inherit',
        }}>
          <span style={{
            width: 28, height: 28, borderRadius: '50%',
            background: profile.bg || '#FFE4E9', color: profile.text || '#9D2A48',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, fontSize: 12, flexShrink: 0,
          }}>{(profile.displayName || 'M').charAt(0)}</span>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            fontSize: 12, fontWeight: 700, color: 'var(--text-primary)',
          }}>
            <Icon.Star size={11} filled style={{ color: '#F2C037' }} />
            <span className="tabular-nums">{(profile.byeol || 0).toLocaleString()}</span>
          </span>
        </button>
      </div>
    </header>
  );
}

// ─── Hero ────────────────────────────────────────────────────────────────────
function Hero() {
  return (
    <section style={{ padding: '28px 0 20px', textAlign: 'center' }}>
      <div className="kicker" style={{ marginBottom: 10 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)' }}></span>
          1,284 fans playing now
        </span>
      </div>
      <h1 className="h-display">
        K-pop quizzes <span style={{ fontStyle: 'italic', fontWeight: 500, color: 'var(--accent)' }}>made by fans</span>,<br/>
        played by thousands.
      </h1>
      <p className="muted" style={{ marginTop: 12, fontSize: 14, maxWidth: 480, marginLeft: 'auto', marginRight: 'auto' }}>
        Trivia about BTS, BLACKPINK, Stray Kids, aespa, NewJeans and 30+ groups. Test how well you really know them.
      </p>
    </section>
  );
}

// ─── Quiz of the Day ─────────────────────────────────────────────────────────
function QuizOfTheDay({ quiz, onPlay }) {
  const g = window.GROUPS.find(x => x.slug === quiz.group);
  return (
    <section style={{ marginBottom: 28 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
        <h2 className="h-section" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon.Sparkle size={14} style={{ color: 'var(--accent)' }} /> Quiz of the day
        </h2>
        <span className="kicker">Resets in 14h 22m</span>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden', position: 'relative' }}>
        <div style={{
          height: 120,
          background: `linear-gradient(135deg, ${g.color}, color-mix(in srgb, ${g.color} 60%, var(--accent)))`,
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: 'radial-gradient(circle at 20% 30%, rgba(255,255,255,0.18), transparent 40%), radial-gradient(circle at 80% 70%, rgba(255,255,255,0.10), transparent 40%)',
          }}></div>
          <div style={{ position: 'absolute', top: 14, left: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ background: 'rgba(0,0,0,0.32)', color: '#fff', fontSize: 10, fontWeight: 700, padding: '4px 8px', borderRadius: 9999, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Today's pick
            </span>
          </div>
          <div style={{ position: 'absolute', bottom: -28, right: -10, opacity: 0.85 }}>
            <GroupLogo slug={quiz.group} size={140} ring />
          </div>
        </div>
        <div style={{ padding: 'var(--pad-card, 16px)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <TypePill type={quiz.type} />
            <DifficultyPill difficulty={quiz.difficulty} />
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.25, marginBottom: 6, letterSpacing: '-0.01em' }}>
            {quiz.title}
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12, color: 'var(--text-secondary)', marginBottom: 14 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Avatar creator={quiz.creator} size={20} /> {quiz.creator.name}
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Icon.Users size={12} /> {fmtCount(quiz.plays)} plays
            </span>
          </div>
          <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => onPlay(quiz)}>
            <Icon.Play /> Play today's quiz
          </button>
        </div>
      </div>
    </section>
  );
}

// ─── Trending strip ──────────────────────────────────────────────────────────
function TrendingStrip({ quizzes, onPlay }) {
  return (
    <section style={{ marginBottom: 28 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
        <h2 className="h-section" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon.Bolt size={14} style={{ color: 'var(--accent)' }} /> Trending this week
        </h2>
        <a href="#trending" className="kicker" style={{ color: 'var(--accent)' }}>See all →</a>
      </div>
      <div className="scrollbar-hide" style={{
        display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4,
        margin: '0 -16px', padding: '0 16px 4px',
      }}>
        {quizzes.map((q, i) => <TrendingCard key={q.id} quiz={q} rank={i+1} onPlay={onPlay} />)}
      </div>
    </section>
  );
}

function TrendingCard({ quiz, rank, onPlay }) {
  const g = window.GROUPS.find(x => x.slug === quiz.group);
  return (
    <button onClick={() => onPlay(quiz)} className="card" style={{
      width: 200, flexShrink: 0,
      padding: 0, overflow: 'hidden', textAlign: 'left',
      transition: 'transform 200ms ease, box-shadow 200ms ease',
    }} onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
       onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
      <div style={{
        height: 96,
        background: `linear-gradient(160deg, ${g.color}, color-mix(in srgb, ${g.color} 50%, #000))`,
        position: 'relative', display: 'flex', alignItems: 'flex-end', padding: 10,
      }}>
        <div style={{
          position: 'absolute', top: 8, left: 8,
          fontSize: 32, fontWeight: 800, color: 'rgba(255,255,255,0.85)',
          letterSpacing: '-0.04em', lineHeight: 1, fontVariantNumeric: 'tabular-nums',
        }}>#{rank}</div>
        <div style={{ position: 'absolute', bottom: -18, right: -6 }}>
          <GroupLogo slug={quiz.group} size={70} ring />
        </div>
        <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          {g.name}
        </div>
      </div>
      <div style={{ padding: 'var(--pad-card, 16px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
          <TypePill type={quiz.type} />
        </div>
        <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.3, marginBottom: 8,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          minHeight: 34,
        }}>
          {quiz.title}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
            <Icon.Users size={11} /> {fmtCount(quiz.plays)}
          </span>
          <span>·</span>
          <DifficultyPill difficulty={quiz.difficulty} />
        </div>
      </div>
    </button>
  );
}

// ─── Group rail ──────────────────────────────────────────────────────────────
function GroupRail({ onPick }) {
  return (
    <section style={{ marginBottom: 28 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
        <h2 className="h-section">Browse by group</h2>
        <a href="#groups" className="kicker" style={{ color: 'var(--accent)' }}>All 30+ →</a>
      </div>
      <div className="scrollbar-hide" style={{
        display: 'flex', gap: 14, overflowX: 'auto',
        margin: '0 -16px', padding: '4px 16px 8px',
      }}>
        {window.GROUPS.map(g => (
          <button key={g.slug} onClick={() => onPick(g.slug)} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
            background: 'transparent', border: 'none', flexShrink: 0, width: 64,
          }}>
            <GroupLogo slug={g.slug} size={56} />
            <span style={{ fontSize: 11, fontWeight: 600, textAlign: 'center', lineHeight: 1.2 }}>{g.name}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

// ─── Feed (filterable) ───────────────────────────────────────────────────────
function QuizFeed({ quizzes, onPlay, density }) {
  const [filter, setFilter] = useStateH('all');
  const filtered = useMemoH(() => {
    if (filter === 'all') return quizzes;
    return quizzes.filter(q => q.type === filter);
  }, [filter, quizzes]);

  const filters = [
    { id: 'all', label: 'All' },
    ...Object.entries(window.QUIZ_TYPES).map(([id, v]) => ({ id, label: id === 'classic' ? 'All' : v.label, type: id })),
  ];

  return (
    <section style={{ marginBottom: 28 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
        <h2 className="h-section">All quizzes</h2>
        <span className="kicker">{filtered.length} of {quizzes.length}</span>
      </div>
      <div className="scrollbar-hide" style={{ display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 12, paddingBottom: 4 }}>
        {filters.map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)} style={{
            padding: '6px 12px', borderRadius: 9999,
            border: '1px solid ' + (filter === f.id ? 'var(--text-primary)' : 'var(--border)'),
            background: filter === f.id ? 'var(--text-primary)' : 'var(--bg-surface)',
            color: filter === f.id ? 'var(--bg-primary)' : 'var(--text-primary)',
            fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0,
            display: 'inline-flex', alignItems: 'center', gap: 6,
          }}>
            {f.type && <span className={`dot type-dot-${f.type}`} style={{ width: 6, height: 6, borderRadius: '50%' }}></span>}
            {f.label}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gap-feed, 12px)' }}>
        {filtered.map(q => <FeedCard key={q.id} quiz={q} onPlay={onPlay} variant={density} />)}
      </div>
    </section>
  );
}

function FeedCard({ quiz, onPlay, variant='cozy' }) {
  const g = window.GROUPS.find(x => x.slug === quiz.group);
  return (
    <button onClick={() => onPlay(quiz)} className="card" style={{
      padding: 'var(--pad-card, 16px)',
      textAlign: 'left',
      display: 'flex', alignItems: 'center', gap: 14,
      transition: 'border-color 150ms ease, transform 150ms ease',
    }} onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
       onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; }}>
      <div style={{
        width: 56, height: 56, borderRadius: 12,
        background: `linear-gradient(135deg, ${g.color}, color-mix(in srgb, ${g.color} 50%, #000))`,
        flexShrink: 0, position: 'relative', overflow: 'hidden',
      }}>
        <img src={g.logo} alt={g.name} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.9 }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <TypePill type={quiz.type} />
          <DifficultyPill difficulty={quiz.difficulty} />
        </div>
        <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.3, marginBottom: 4,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>
          {quiz.title}
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <Avatar creator={quiz.creator} size={16} /> {quiz.creator.name}
          </span>
          <span>·</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
            <Icon.Users size={11} /> {fmtCount(quiz.plays)}
          </span>
          <span>·</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
            <Icon.Heart size={11} /> {fmtCount(quiz.likes)}
          </span>
        </div>
      </div>
      <div style={{
        flexShrink: 0,
        width: 36, height: 36, borderRadius: '50%',
        background: 'var(--bg-elevated)', color: 'var(--text-primary)',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon.ArrowRight size={14} />
      </div>
    </button>
  );
}

// ─── Mobile tab bar (mobile <768px) ─────────────────────────────────────────
function MobileTabBar({ active='home', onNav = () => {} }) {
  const tabs = [
    { id: 'home',        label: 'Home',  icon: Icon.Home },
    { id: 'games',       label: 'Games', icon: Icon.Trophy },
    { id: 'cards',       label: 'Cards', icon: Icon.Sparkle },
    { id: 'leaderboard', label: 'Ranks', icon: Icon.Star },
    { id: 'profile',     label: 'You',   icon: Icon.User },
  ];
  return (
    <nav className="mobile-tab-bar" style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      background: 'color-mix(in srgb, var(--bg-primary) 95%, transparent)',
      backdropFilter: 'blur(12px)',
      borderTop: '1px solid var(--border)',
      padding: '8px 0 calc(8px + env(safe-area-inset-bottom))',
      zIndex: 25,
    }}>
      <div className="app-shell" style={{ display: 'flex', justifyContent: 'space-around', padding: 0 }}>
        {tabs.map(t => {
          const Ic = t.icon;
          const isActive = active === t.id;
          return (
            <button key={t.id} onClick={() => onNav(t.id)} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
              background: 'transparent', border: 'none',
              color: isActive ? 'var(--accent)' : 'var(--text-tertiary)',
              fontSize: 10, fontWeight: 600, padding: '4px 8px',
              cursor: 'pointer', fontFamily: 'inherit',
            }}>
              <Ic size={20} {...(isActive ? { filled: true } : {})} />
              {t.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

Object.assign(window, { TopNav, Hero, QuizOfTheDay, TrendingStrip, GroupRail, QuizFeed, MobileTabBar });
