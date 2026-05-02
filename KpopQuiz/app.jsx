/* global React, ReactDOM, TopNav, Hero, QuizOfTheDay, TrendingStrip, GroupRail, QuizFeed, MobileTabBar,
   QuizIntro, QuizPlayer, QuizResults,
   GroupPage, SearchPage, ProfilePage, LeaderboardPage,
   CardsPage, CardDetail, PackOpeningPage, GamesHubPage, ThisOrThatGame, NameAllMembersGame,
   OnboardingPage, LoginPage, SettingsPage, CreateQuizPage, Icon,
   TweaksPanel, useTweaks, TweakSection, TweakRadio, TweakSelect, TweakSlider, TweakToggle */
const { useState: useStateApp, useEffect: useEffectApp } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "paper",
  "font": "Pretendard",
  "accent": "magenta",
  "density": "cozy",
  "cardVariant": "stacked",
  "motion": "on"
}/*EDITMODE-END*/;

const FONT_STACKS = {
  "Pretendard": "Pretendard", "Inter": "Inter", "Geist": "Geist",
  "DM Sans": "DM Sans", "Space Grotesk": "Space Grotesk",
};

const ACCENTS = {
  magenta: { paper: { a: '#D4537E', h: '#993556', bg: '#FAF2F5', l: '#ED93B1', halo: 'rgba(212,83,126,.10)' },
             stage: { a: '#FF6B97', h: '#FF8FB1', bg: '#2A1A22', l: '#FFB4CC', halo: 'rgba(255,107,151,.18)' } },
  violet:  { paper: { a: '#7F57D8', h: '#5C3DA8', bg: '#F2EEFB', l: '#B8A3EE', halo: 'rgba(127,87,216,.10)' },
             stage: { a: '#A88FFF', h: '#C0AEFF', bg: '#23192F', l: '#D4C5FF', halo: 'rgba(168,143,255,.18)' } },
  citrus:  { paper: { a: '#D9722B', h: '#A55416', bg: '#FBF1E6', l: '#F0B383', halo: 'rgba(217,114,43,.10)' },
             stage: { a: '#FFA161', h: '#FFB984', bg: '#2C1F14', l: '#FFD3B0', halo: 'rgba(255,161,97,.18)' } },
  ocean:   { paper: { a: '#2C6DAB', h: '#1B4D7E', bg: '#E9F1F9', l: '#85B0D8', halo: 'rgba(44,109,171,.10)' },
             stage: { a: '#7BC0FF', h: '#A0D2FF', bg: '#162533', l: '#BCDFFF', halo: 'rgba(123,192,255,.18)' } },
};

function applyTweaks(t) {
  const r = document.documentElement;
  r.dataset.theme = t.theme;
  r.dataset.density = t.density;
  r.dataset.motion = t.motion === 'on' ? 'on' : 'off';
  r.style.setProperty('--app-font', `"${t.font}"`);
  const accent = ACCENTS[t.accent]?.[t.theme];
  if (accent) {
    r.style.setProperty('--accent', accent.a);
    r.style.setProperty('--accent-hover', accent.h);
    r.style.setProperty('--accent-bg', accent.bg);
    r.style.setProperty('--accent-light', accent.l);
    r.style.setProperty('--bg-accent-subtle', accent.bg);
    r.style.setProperty('--halo', accent.halo);
    r.style.setProperty('--accent-fg', t.theme === 'stage' ? '#131210' : '#FFFFFF');
  }
}

// ─── Screen Index Drawer ────────────────────────────────────────────────────
const SCREEN_INDEX = [
  { group: 'Discover', items: [
    { id: 'home',        label: 'Home feed' },
    { id: 'search',      label: 'Search & browse' },
    { id: 'group',       label: 'Group page' },
    { id: 'leaderboard', label: 'Hall of fame' },
  ]},
  { group: 'Play', items: [
    { id: 'intro',   label: 'Quiz intro' },
    { id: 'play',    label: 'Active gameplay' },
    { id: 'results', label: 'Results screen' },
    { id: 'games',   label: 'Games hub' },
    { id: 'tot',     label: 'This or That' },
    { id: 'naa',     label: 'Name all members' },
  ]},
  { group: 'You', items: [
    { id: 'profile',     label: 'Your profile' },
    { id: 'public',      label: 'Public profile' },
    { id: 'cards',       label: 'Card collection' },
    { id: 'cardDetail',  label: 'Card detail' },
    { id: 'packOpen',    label: 'Pack opening' },
    { id: 'settings',    label: 'Settings' },
  ]},
  { group: 'Create & Account', items: [
    { id: 'login',  label: 'Log in / sign up' },
  ]},
];

function ScreenDrawer({ open, onClose, current, onJump }) {
  if (!open) return null;
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200,
      animation: 'fadeIn 200ms ease',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        position: 'absolute', left: 0, top: 0, bottom: 0,
        width: 'min(320px, 85vw)',
        background: 'var(--bg-primary)',
        borderRight: '1px solid var(--border)',
        padding: '20px 16px', overflow: 'auto',
        animation: 'fadeSlideUp 250ms ease',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>K</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800 }}>KpopQuiz</div>
            <div className="kicker">Prototype tour</div>
          </div>
        </div>
        <p className="muted" style={{ fontSize: 11, marginTop: 12, marginBottom: 14, lineHeight: 1.5 }}>
          Every player-facing screen at hi-fi. Use Tweaks (bottom-right) to toggle theme, accent and density.
        </p>

        {SCREEN_INDEX.map(grp => (
          <div key={grp.group} style={{ marginBottom: 16 }}>
            <div className="kicker" style={{ marginBottom: 6, paddingLeft: 4 }}>{grp.group}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {grp.items.map(it => (
                <button key={it.id} onClick={() => { onJump(it.id); onClose(); }} style={{
                  textAlign: 'left', padding: '8px 10px', borderRadius: 8,
                  background: current === it.id ? 'var(--bg-accent-subtle)' : 'transparent',
                  border: 0, color: current === it.id ? 'var(--accent)' : 'var(--text-primary)',
                  fontSize: 13, fontWeight: current === it.id ? 700 : 500,
                  cursor: 'pointer', fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <span>{it.label}</span>
                  {current === it.id && <Icon.Check size={12} />}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── App ────────────────────────────────────────────────────────────────────
function App() {
  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [screen, setScreen] = useStateApp({ name: 'home' });
  const [drawerOpen, setDrawerOpen] = useStateApp(false);

  useEffectApp(() => { applyTweaks(tweaks); }, [tweaks]);

  // Keyboard ESC closes drawer
  useEffectApp(() => {
    const onKey = (e) => { if (e.key === 'Escape') setDrawerOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const goPlay = (quiz) => { setScreen({ name: 'intro', quiz: window.PLAYABLE }); window.scrollTo(0,0); };
  const startGame  = () => { setScreen(s => ({ name: 'play', quiz: s.quiz })); window.scrollTo(0,0); };
  const finishGame = (result) => { setScreen(s => ({ name: 'results', quiz: s.quiz, result })); window.scrollTo(0,0); };
  const goHome     = () => { setScreen({ name: 'home' }); window.scrollTo(0,0); };
  const exitFromPlay = () => { if (confirm('Exit this quiz? Your progress will be lost.')) goHome(); };

  const jumpToScreen = (id) => {
    window.scrollTo(0, 0);
    switch (id) {
      case 'home':       return setScreen({ name: 'home' });
      case 'search':     return setScreen({ name: 'search' });
      case 'group':      return setScreen({ name: 'group', slug: 'blackpink' });
      case 'leaderboard':return setScreen({ name: 'leaderboard' });
      case 'intro':      return setScreen({ name: 'intro', quiz: window.PLAYABLE });
      case 'play':       return setScreen({ name: 'play', quiz: window.PLAYABLE });
      case 'results':    return setScreen({ name: 'results', quiz: window.PLAYABLE, result: { score: 6, total: 8, time: 92, perfect: false, byeolEarned: 60 } });
      case 'games':      return setScreen({ name: 'games' });
      case 'tot':        return setScreen({ name: 'tot' });
      case 'naa':        return setScreen({ name: 'naa' });
      case 'profile':    return setScreen({ name: 'profile' });
      case 'public':     return setScreen({ name: 'public' });
      case 'cards':      return setScreen({ name: 'cards' });
      case 'cardDetail': return setScreen({ name: 'cardDetail', card: window.CARDS[0] });
      case 'packOpen':   return setScreen({ name: 'packOpen' });
      case 'settings':   return setScreen({ name: 'settings' });
      case 'login':      return setScreen({ name: 'login' });
      default: return setScreen({ name: 'home' });
    }
  };

  // Floating tour button — visible on every screen
  const TourBtn = (
    <button onClick={() => setDrawerOpen(true)} aria-label="Open screen index" style={{
      position: 'fixed', top: 16, left: 16, zIndex: 60,
      width: 38, height: 38, borderRadius: '50%',
      background: 'var(--bg-surface)', border: '1px solid var(--border)',
      color: 'var(--text-primary)', boxShadow: '0 4px 14px rgba(0,0,0,0.08)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
    }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
        <line x1="3" y1="6" x2="21" y2="6"/>
        <line x1="3" y1="12" x2="21" y2="12"/>
        <line x1="3" y1="18" x2="21" y2="18"/>
      </svg>
    </button>
  );

  // Unified nav handler — top nav on desktop, mobile tab bar on mobile
  const navHandler = (id) => {
    if (id === 'home')        setScreen({ name: 'home' });
    else if (id === 'games')  setScreen({ name: 'games' });
    else if (id === 'cards')  setScreen({ name: 'cards' });
    else if (id === 'leaderboard') setScreen({ name: 'leaderboard' });
    else if (id === 'profile') setScreen({ name: 'profile' });
    else if (id === 'search') setScreen({ name: 'search' });
  };
  const navOf = (active) => (
    <>
      <TopNav active={active} onNav={navHandler}
        onSearch={() => setScreen({ name: 'search' })}
        onCreate={() => alert('Create flow (not wired)')} />
      <MobileTabBar active={active} onNav={navHandler} />
    </>
  );

  return (
    <>
      {TourBtn}
      <ScreenDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} current={screen.name} onJump={jumpToScreen} />

      {screen.name === 'home' && (
        <>
          {navOf('home')}
          <main className="app-shell">
            <Hero />
            <QuizOfTheDay quiz={window.QOTD} onPlay={goPlay} />
            <TrendingStrip quizzes={window.TRENDING} onPlay={goPlay} />
            <GroupRail onPick={(slug) => setScreen({ name: 'group', slug })} />
            <QuizFeed quizzes={window.QUIZZES} onPlay={goPlay} density={tweaks.density} />
          </main>
        </>
      )}

      {screen.name === 'intro' && (
        <main className="app-shell">
          <QuizIntro quiz={screen.quiz} onStart={startGame} onBack={goHome} />
        </main>
      )}

      {screen.name === 'play' && (
        <main className="app-shell">
          <QuizPlayer quiz={screen.quiz} onComplete={finishGame} onExit={exitFromPlay} cardVariant={tweaks.cardVariant} />
        </main>
      )}

      {screen.name === 'results' && (
        <main className="app-shell">
          <QuizResults quiz={screen.quiz} result={screen.result}
            onPlayAgain={goHome} onBackHome={goHome}
            onShare={() => alert('Shared (not actually wired)')} />
        </main>
      )}

      {screen.name === 'group' && (
        <main className="app-shell">
          <GroupPage slug={screen.slug} onPlay={goPlay} onBack={goHome} />
        </main>
      )}

      {screen.name === 'search' && (
        <>
          {navOf('search')}
          <main className="app-shell"><SearchPage onPlay={goPlay} onBack={goHome} /></main>
        </>
      )}

      {screen.name === 'profile' && (
        <>
          {navOf('profile')}
          <main className="app-shell">
            <ProfilePage onPlay={goPlay} onBack={goHome} onSettings={() => setScreen({ name: 'settings' })} />
          </main>
        </>
      )}

      {screen.name === 'public' && (
        <main className="app-shell">
          <ProfilePage isPublic onPlay={goPlay} onBack={goHome} />
        </main>
      )}

      {screen.name === 'leaderboard' && (
        <>
          {navOf('leaderboard')}
          <main className="app-shell"><LeaderboardPage onBack={goHome} /></main>
        </>
      )}

      {screen.name === 'cards' && (
        <>
          {navOf('cards')}
          <main className="app-shell">
            <CardsPage onBack={goHome}
              onOpenCard={(c) => setScreen({ name: 'cardDetail', card: c })}
              onOpenPack={() => setScreen({ name: 'packOpen' })} />
          </main>
        </>
      )}

      {screen.name === 'cardDetail' && (
        <main className="app-shell">
          <CardDetail card={screen.card} onBack={() => setScreen({ name: 'cards' })} />
        </main>
      )}

      {screen.name === 'packOpen' && (
        <PackOpeningPage onBack={() => setScreen({ name: 'cards' })} />
      )}

      {screen.name === 'games' && (
        <>
          {navOf('games')}
          <main className="app-shell">
            <GamesHubPage onPlay={goPlay} onBack={goHome}
              onLaunch={(id) => {
                if (id === 'tot') setScreen({ name: 'tot' });
                if (id === 'naa') setScreen({ name: 'naa' });
              }} />
          </main>
        </>
      )}

      {screen.name === 'tot' && (
        <main className="app-shell"><ThisOrThatGame onBack={() => setScreen({ name: 'games' })} /></main>
      )}

      {screen.name === 'naa' && (
        <main className="app-shell"><NameAllMembersGame onBack={() => setScreen({ name: 'games' })} /></main>
      )}

      {screen.name === 'login' && (
        <main className="app-shell"><LoginPage onLogin={goHome} onBack={goHome} /></main>
      )}

      {screen.name === 'settings' && (
        <main className="app-shell"><SettingsPage onBack={() => setScreen({ name: 'profile' })} /></main>
      )}

      <TweaksPanel title="Tweaks">
        <TweakSection title="Direction">
          <TweakRadio label="Theme" value={tweaks.theme} onChange={(v) => setTweak('theme', v)}
            options={[{ value: 'paper', label: 'Paper' }, { value: 'stage', label: 'Stage' }]} />
          <TweakSelect label="Accent color" value={tweaks.accent} onChange={(v) => setTweak('accent', v)}
            options={[
              { value: 'magenta', label: 'Magenta (default)' },
              { value: 'violet',  label: 'Violet' },
              { value: 'citrus',  label: 'Citrus' },
              { value: 'ocean',   label: 'Ocean' },
            ]} />
        </TweakSection>
        <TweakSection title="Typography">
          <TweakSelect label="Font" value={tweaks.font} onChange={(v) => setTweak('font', v)}
            options={Object.keys(FONT_STACKS).map(k => ({ value: k, label: k }))} />
        </TweakSection>
        <TweakSection title="Layout">
          <TweakRadio label="Density" value={tweaks.density} onChange={(v) => setTweak('density', v)}
            options={[
              { value: 'snug', label: 'Snug' }, { value: 'cozy', label: 'Cozy' }, { value: 'airy', label: 'Airy' },
            ]} />
          <TweakRadio label="Question card" value={tweaks.cardVariant} onChange={(v) => setTweak('cardVariant', v)}
            options={[
              { value: 'stacked', label: 'Stacked' },
              { value: 'compact', label: 'Compact' },
              { value: 'grid',    label: '2×2 grid' },
            ]} />
        </TweakSection>
        <TweakSection title="Motion">
          <TweakRadio label="Animations" value={tweaks.motion} onChange={(v) => setTweak('motion', v)}
            options={[{ value: 'on', label: 'On' }, { value: 'off', label: 'Reduced' }]} />
        </TweakSection>
        <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 8, lineHeight: 1.5 }}>
          Use the menu (top-left) to jump between screens. Theme & density apply everywhere.
        </div>
      </TweaksPanel>
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
