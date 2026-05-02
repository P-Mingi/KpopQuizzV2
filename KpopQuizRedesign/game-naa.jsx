/* global React, Icon, GroupLogo */
const { useState: useSn, useEffect: useEn, useRef: useRn, useMemo: useMn } = React;

// ─────────────────────────────────────────────────────────────────────────
// NAME ALL MEMBERS — intro · mode select · blind · photo · done
// ─────────────────────────────────────────────────────────────────────────
//
// Every member is its own card. In Blind mode the card starts as a "?"
// silhouette with a `???` placeholder; typing the right name into the
// shared bottom input reveals that idol's photo with a flip-in animation.
// In Photo mode the photo is shown up front and each card has its own
// input — typing the right name plays a green-flash success animation
// and locks the name on the photo.
//
// Players get 3 hint tokens per game; each spends one to reveal the
// first letter of an unsolved member.
// ─────────────────────────────────────────────────────────────────────────

function NameAllMembersGame({ onBack }) {
  const groups = window.GROUPS.filter((g) => g.members.length >= 4);
  const [groupIdx, setGroupIdx] = useSn(0);
  const g = groups[groupIdx];

  // 'intro' | 'blind' | 'photo' | 'done'
  const [stage, setStage] = useSn('intro');
  const [mode, setMode] = useSn('blind');
  const [found, setFound] = useSn([]);
  const [hintsUsed, setHintsUsed] = useSn([]); // member names whose first letter is revealed
  const [hintsLeft, setHintsLeft] = useSn(3);
  const [time, setTime] = useSn(90);
  const [justGot, setJustGot] = useSn(null); // member name that was just answered (for celebrate)

  const reset = (newMode) => {
    setMode(newMode);
    setFound([]);
    setHintsUsed([]);
    setHintsLeft(3);
    setTime(150); // 2:30 like the reference
    setJustGot(null);
    setStage(newMode);
  };

  // Timer (blind + photo)
  useEn(() => {
    if (stage !== 'blind' && stage !== 'photo') return;
    const t = setInterval(() => {
      setTime((prev) => { if (prev <= 1) { setStage('done'); return 0; } return prev - 1; });
    }, 1000);
    return () => clearInterval(t);
  }, [stage]);

  useEn(() => {
    if ((stage === 'blind' || stage === 'photo') && found.length === g.members.length) {
      setTimeout(() => setStage('done'), 600);
    }
  }, [found.length, stage]);

  const tryName = (raw) => {
    const norm = raw.trim().toLowerCase().replace(/[^a-z]/g, '');
    if (!norm) return false;
    const matched = g.members.find((m) => m.toLowerCase().replace(/[^a-z]/g, '') === norm);
    if (matched && !found.includes(matched)) {
      setFound((p) => [...p, matched]);
      setJustGot(matched);
      setTimeout(() => setJustGot((cur) => (cur === matched ? null : cur)), 900);
      return true;
    }
    return false;
  };

  const useHint = () => {
    if (hintsLeft <= 0) return;
    const remaining = g.members.filter((m) => !found.includes(m) && !hintsUsed.includes(m));
    if (!remaining.length) return;
    const target = remaining[0];
    setHintsUsed((p) => [...p, target]);
    setHintsLeft((n) => n - 1);
  };

  const fmtTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  // ── Done screen ────────────────────────────────────────────────────────
  if (stage === 'done') {
    const perfect = found.length === g.members.length;
    return (
      <div className="anim-fadeSlideUp" style={{ paddingTop: 24, textAlign: 'center', maxWidth: 540, margin: '0 auto' }}>
        <div className="kicker" style={{ color: perfect ? 'var(--correct)' : 'var(--accent)' }}>
          {perfect ? 'PERFECT' : "Time's up"}
        </div>
        <h1 className="h-display" style={{ marginTop: 8, fontSize: 44 }}>
          {found.length} <span style={{ color: 'var(--text-tertiary)' }}>/ {g.members.length}</span>
        </h1>
        <p className="muted" style={{ fontSize: 14, marginTop: 8 }}>
          You named {found.length} of {g.members.length} {g.name} members.
        </p>
        <div className="card" style={{ padding: 14, marginTop: 18, textAlign: 'left' }}>
          <div className="kicker" style={{ marginBottom: 8 }}>The full lineup</div>
          {g.members.map((m) => (
            <div key={m} style={{
              padding: '6px 0', borderBottom: '1px solid var(--border-subtle)',
              display: 'flex', alignItems: 'center', gap: 8, fontSize: 13,
              color: found.includes(m) ? 'var(--correct)' : 'var(--text-secondary)',
              fontWeight: found.includes(m) ? 600 : 400,
            }}>
              {found.includes(m) ? <Icon.Check size={14} /> : <Icon.X size={14} />}
              {m}
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
          <button onClick={() => reset(mode)} className="btn btn-secondary" style={{ flex: 1 }}>Play again</button>
          <button onClick={() => {
            if (groupIdx + 1 < groups.length) { setGroupIdx((i) => i + 1); reset(mode); }
            else onBack();
          }} className="btn btn-primary" style={{ flex: 1 }}>
            {groupIdx + 1 < groups.length ? 'Next group →' : 'Done'}
          </button>
        </div>
      </div>
    );
  }

  // ── Intro / mode-select screen (clean, centered, matches reference) ───
  if (stage === 'intro') {
    return (
      <div className="anim-fadeSlideUp" style={{ paddingTop: 24, maxWidth: 720, margin: '0 auto', textAlign: 'center' }}>
        <button onClick={onBack} className="btn btn-ghost" style={{
          padding: '6px 10px', fontSize: 13, color: 'var(--text-tertiary)',
          background: 'transparent', border: 'none', cursor: 'pointer',
        }}>
          ← Back to Games
        </button>

        {/* Logo medallion */}
        <div style={{ marginTop: 18, marginBottom: 18, display: 'flex', justifyContent: 'center' }}>
          <GroupLogo slug={g.slug} size={96} ring />
        </div>

        <h1 style={{
          fontSize: 32, fontWeight: 800, letterSpacing: '-0.02em',
          margin: 0, color: 'var(--text-primary)',
        }}>
          Name all <span style={{ textTransform: 'uppercase' }}>{g.name}</span> members
        </h1>
        <div style={{ marginTop: 8, color: 'var(--text-secondary)', fontSize: 16, fontWeight: 500 }}>
          {g.tag || 'General K-pop'}
        </div>
        <div style={{ marginTop: 4, color: 'var(--text-tertiary)', fontSize: 13 }}>
          {g.members.length} members &nbsp;/&nbsp; 2:30
        </div>

        {/* Group switcher (subtle) */}
        <div style={{ margin: '20px auto 6px', maxWidth: 600 }}>
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none', justifyContent: 'center', flexWrap: 'wrap' }}>
            {groups.slice(0, 8).map((gg, i) => (
              <button key={gg.slug} onClick={() => setGroupIdx(i)} style={{
                flexShrink: 0,
                padding: '4px 10px', borderRadius: 9999,
                border: i === groupIdx ? `1.5px solid ${gg.color}` : '1px solid var(--border)',
                background: i === groupIdx ? `${gg.color}15` : 'transparent',
                color: i === groupIdx ? gg.color : 'var(--text-tertiary)',
                fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
              }}>{gg.name}</button>
            ))}
          </div>
        </div>

        <div className="kicker" style={{ marginTop: 28, marginBottom: 14, color: 'var(--text-tertiary)' }}>
          Choose your mode
        </div>

        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14,
          maxWidth: 560, margin: '0 auto 28px',
        }}>
          <ModeCard
            active={mode === 'blind'}
            onClick={() => setMode('blind')}
            title="Blind mode"
            sub="No clues, pure memory. For hardcore fans."
          />
          <ModeCard
            active={mode === 'photo'}
            onClick={() => setMode('photo')}
            title="Photo mode"
            sub="See photos, type names. For everyone."
          />
        </div>

        <button onClick={() => reset(mode)} style={{
          padding: '14px 38px', borderRadius: 9999,
          background: 'var(--text-primary)', color: 'var(--bg-primary)',
          border: 'none', fontSize: 15, fontWeight: 700,
          cursor: 'pointer', letterSpacing: '-0.01em',
          fontFamily: 'inherit',
        }}>Start game</button>

        <div style={{ marginTop: 18, fontSize: 11, color: 'var(--text-tertiary)' }}>
          Earn ★ +{g.members.length * 10} byeol &nbsp;·&nbsp; 3 hints available
        </div>
      </div>
    );
  }

  // ── Active game ────────────────────────────────────────────────────────
  const accent = 'var(--accent)';

  // Top header (Quit · Time · Found/Total) + thin progress bar
  const Header = (
    <div style={{
      maxWidth: 980, margin: '0 auto', padding: '0 4px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0' }}>
        <button onClick={() => setStage('intro')} style={{
          background: 'transparent', border: 'none', cursor: 'pointer',
          fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)',
          fontFamily: 'inherit', padding: '4px 0',
        }}>Quit</button>

        <div className="tabular-nums" style={{
          fontSize: 18, fontWeight: 800, letterSpacing: '-0.01em',
          color: time < 15 ? 'var(--wrong)' : 'var(--text-primary)',
        }}>{fmtTime(time)}</div>

        <div className="tabular-nums" style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-secondary)' }}>
          {found.length}/{g.members.length}
        </div>
      </div>

      <div style={{ height: 2, background: 'var(--border-subtle)', borderRadius: 9999, overflow: 'hidden', marginBottom: 24 }}>
        <div style={{
          width: `${found.length / g.members.length * 100}%`,
          height: '100%',
          background: 'var(--text-primary)',
          transition: 'width 320ms cubic-bezier(.2,.7,.2,1)',
        }}></div>
      </div>
    </div>
  );

  if (stage === 'blind') {
    return (
      <BlindMode g={g} found={found} hintsUsed={hintsUsed} hintsLeft={hintsLeft}
        useHint={useHint} tryName={tryName} accent={accent} header={Header}
        time={time} fmtTime={fmtTime} justGot={justGot}
        onSurrender={() => setStage('done')} />
    );
  }

  return (
    <PhotoMode g={g} found={found} tryName={tryName} accent={accent} header={Header} justGot={justGot} />
  );
}

// ─── Mode card (clean, text-only — matches reference) ────────────────────
function ModeCard({ active, onClick, title, sub }) {
  return (
    <button onClick={onClick} style={{
      padding: '20px 18px', borderRadius: 16,
      border: active ? `2px solid var(--accent)` : '1.5px solid var(--border)',
      background: active ? 'color-mix(in srgb, var(--accent) 6%, var(--bg-surface))' : 'var(--bg-surface)',
      cursor: 'pointer', textAlign: 'left',
      transition: 'border-color 160ms ease, background 160ms ease',
      fontFamily: 'inherit',
      minHeight: 110,
    }}>
      <div style={{
        fontSize: 18, fontWeight: 700, letterSpacing: '-0.01em',
        color: 'var(--text-primary)', marginBottom: 6,
      }}>{title}</div>
      <div style={{ fontSize: 13, color: 'var(--text-tertiary)', lineHeight: 1.45 }}>{sub}</div>
    </button>
  );
}

// ─── Blind mode gameplay ────────────────────────────────────────────────
function BlindMode({ g, found, hintsUsed, hintsLeft, useHint, tryName, accent, header, justGot, onSurrender }) {
  const [input, setInput] = useSn('');
  const [shake, setShake] = useSn(false);
  const inputRef = useRn(null);
  useEn(() => { if (inputRef.current) inputRef.current.focus(); }, []);

  const submit = (e) => {
    e.preventDefault();
    if (!tryName(input)) {
      setShake(true);
      setTimeout(() => setShake(false), 320);
    }
    setInput('');
  };

  return (
    <div style={{ paddingTop: 4, paddingBottom: 40, maxWidth: 980, margin: '0 auto' }}>
      {header}

      {/* Card grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
        gap: 12, padding: '0 4px',
      }}>
        {g.members.map((m) => {
          const got = found.includes(m);
          const hinted = hintsUsed.includes(m);
          const celebrate = justGot === m;
          return (
            <BlindCard key={m} member={m} group={g}
              got={got} hinted={hinted} celebrate={celebrate} />
          );
        })}
      </div>

      {/* Sticky input strip */}
      <div style={{
        position: 'sticky', bottom: 0, marginTop: 28,
        background: 'linear-gradient(to top, var(--bg-canvas) 60%, transparent)',
        paddingTop: 20, paddingBottom: 16,
      }}>
        <form onSubmit={submit} style={{
          background: 'var(--bg-surface)',
          border: `2px solid var(--accent)`,
          borderRadius: 14, padding: '14px 18px',
          display: 'flex', alignItems: 'center', gap: 12,
          animation: shake ? 'shakeInput 320ms ease-out' : '',
          maxWidth: 720, margin: '0 auto',
        }}>
          <input ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} placeholder="Type a member name..." style={{
            flex: 1, border: 0, outline: 0, background: 'transparent',
            fontSize: 16, fontFamily: 'inherit', color: 'var(--text-primary)',
            fontWeight: 500,
          }} />
        </form>

        <div style={{
          maxWidth: 720, margin: '12px auto 0',
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10,
        }}>
          <button onClick={useHint} disabled={hintsLeft <= 0} style={{
            padding: '12px', borderRadius: 12,
            border: '1px solid var(--border)',
            background: 'var(--bg-surface)',
            fontSize: 14, fontWeight: 600,
            color: hintsLeft > 0 ? 'var(--text-primary)' : 'var(--text-tertiary)',
            cursor: hintsLeft > 0 ? 'pointer' : 'not-allowed',
            fontFamily: 'inherit',
            opacity: hintsLeft > 0 ? 1 : 0.5,
          }}>Hint ({hintsLeft} left)</button>
          <button onClick={onSurrender} style={{
            padding: '12px', borderRadius: 12,
            border: '1px solid var(--border)',
            background: 'var(--bg-surface)',
            fontSize: 14, fontWeight: 600,
            color: 'var(--accent)',
            cursor: 'pointer', fontFamily: 'inherit',
          }}>Give up</button>
        </div>

        <div style={{
          marginTop: 12, textAlign: 'center',
          fontSize: 12, color: 'var(--text-tertiary)',
          display: 'flex', justifyContent: 'center', gap: 16, flexWrap: 'wrap',
        }}>
          <span>Found: <strong style={{ color: 'var(--text-primary)' }}>{found.length}</strong></span>
          <span>Left: <strong style={{ color: 'var(--text-primary)' }}>{g.members.length - found.length}</strong></span>
        </div>
      </div>
    </div>
  );
}

// One card per member in Blind mode. Flips between blank "?" → photo+name.
function BlindCard({ member, group, got, hinted, celebrate }) {
  const initial = member.charAt(0).toUpperCase();
  return (
    <div style={{
      position: 'relative',
      aspectRatio: '3 / 4',
      borderRadius: 14,
      overflow: 'hidden',
      border: got ? '1.5px solid var(--correct-border)' : '1.5px solid var(--border-subtle)',
      background: got ? 'var(--bg-surface)' : 'var(--bg-elevated)',
      transition: 'transform 200ms ease, box-shadow 200ms ease, border-color 200ms ease',
      transform: celebrate ? 'scale(1.04)' : 'scale(1)',
      boxShadow: celebrate ? `0 12px 28px -10px ${group.color}80` : 'none',
    }}>
      {/* Blank state */}
      {!got && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          gap: 8, padding: 12,
        }}>
          <div style={{
            fontSize: 30, fontWeight: 800,
            color: hinted ? 'var(--accent)' : 'var(--text-tertiary)',
            opacity: hinted ? 1 : 0.45,
            letterSpacing: hinted ? '0.06em' : 0,
            transition: 'all 220ms ease',
          }}>{hinted ? `${initial}_` : '?'}</div>
          <div style={{
            fontSize: 12, fontWeight: 600,
            color: 'var(--text-tertiary)', opacity: 0.55,
            letterSpacing: '0.04em',
          }}>???</div>
        </div>
      )}

      {/* Revealed state */}
      {got && (
        <>
          <img
            src={group.logo}
            alt=""
            style={{
              position: 'absolute', inset: 0,
              width: '100%', height: '100%', objectFit: 'cover',
              animation: 'fadeIn 360ms ease-out',
            }}
          />
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.62) 100%)',
          }}></div>
          <div style={{
            position: 'absolute', left: 10, right: 10, bottom: 10,
            color: '#fff', fontSize: 14, fontWeight: 800, letterSpacing: '-0.01em',
            textShadow: '0 1px 4px rgba(0,0,0,0.6)',
            animation: 'fadeSlideUp 320ms ease-out',
          }}>{member}</div>
          <div style={{
            position: 'absolute', top: 8, right: 8,
            width: 22, height: 22, borderRadius: '50%',
            background: 'var(--correct)', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            animation: 'popIn 360ms ease-out both',
          }}><Icon.Check size={11} /></div>
        </>
      )}
    </div>
  );
}

// ─── Photo mode gameplay ────────────────────────────────────────────────
function PhotoMode({ g, found, tryName, accent, header, justGot }) {
  const [activeIdx, setActiveIdx] = useSn(0);
  const [inputs, setInputs] = useSn(() => g.members.map(() => ''));
  const [wrongIdx, setWrongIdx] = useSn(-1);
  const refs = useRn([]);

  useEn(() => { if (refs.current[activeIdx]) refs.current[activeIdx].focus(); }, [activeIdx]);

  const handleSubmit = (i, e) => {
    e?.preventDefault();
    const ok = tryName(inputs[i]);
    if (ok) {
      const next = inputs.map((v, ix) => ix === i ? '' : v);
      setInputs(next);
      const nextIdx = g.members.findIndex((m, k) => k > i && !found.includes(m) && m !== g.members[i]);
      if (nextIdx >= 0) setActiveIdx(nextIdx);
    } else {
      setWrongIdx(i);
      setTimeout(() => setWrongIdx(-1), 350);
    }
  };

  return (
    <div style={{ paddingTop: 4, paddingBottom: 40, maxWidth: 980, margin: '0 auto' }}>
      {header}

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))',
        gap: 14, padding: '0 4px',
      }}>
        {g.members.map((m, i) => {
          const got = found.includes(m);
          const isActive = i === activeIdx && !got;
          const isWrong = i === wrongIdx;
          const celebrate = justGot === m;
          return (
            <div key={m} onClick={() => !got && setActiveIdx(i)} style={{
              borderRadius: 16, overflow: 'hidden',
              border: got
                ? '1.5px solid var(--correct-border)'
                : isActive ? `2px solid var(--accent)` : '1.5px solid var(--border-subtle)',
              background: 'var(--bg-surface)',
              cursor: got ? 'default' : 'pointer',
              transition: 'all 200ms ease',
              transform: celebrate ? 'scale(1.03)' : 'scale(1)',
              boxShadow: celebrate
                ? '0 14px 32px -10px color-mix(in srgb, var(--correct) 60%, transparent)'
                : isActive ? '0 8px 24px -10px color-mix(in srgb, var(--accent) 50%, transparent)' : 'none',
              animation: isWrong ? 'shakeInput 320ms ease-out' : '',
            }}>
              {/* Photo */}
              <div style={{
                position: 'relative', aspectRatio: '3 / 4', overflow: 'hidden',
                background: g.color,
              }}>
                <img src={g.logo} alt="" style={{
                  position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover',
                }} />
                {/* Light gradient + label */}
                <div style={{
                  position: 'absolute', inset: 0,
                  background: got
                    ? 'linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.7) 100%)'
                    : 'linear-gradient(180deg, transparent 60%, rgba(0,0,0,0.5) 100%)',
                }}></div>
                {got ? (
                  <>
                    <div style={{
                      position: 'absolute', left: 10, right: 10, bottom: 10,
                      color: '#fff', fontSize: 14, fontWeight: 800, letterSpacing: '-0.01em',
                      textShadow: '0 1px 4px rgba(0,0,0,0.6)',
                      animation: 'fadeSlideUp 320ms ease-out',
                    }}>{m}</div>
                    <div style={{
                      position: 'absolute', top: 8, right: 8,
                      width: 22, height: 22, borderRadius: '50%',
                      background: 'var(--correct)', color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                      animation: 'popIn 360ms ease-out both',
                    }}><Icon.Check size={11} /></div>
                    {/* Soft green flash overlay */}
                    {celebrate && (
                      <div style={{
                        position: 'absolute', inset: 0,
                        background: 'color-mix(in srgb, var(--correct) 35%, transparent)',
                        animation: 'flashFade 700ms ease-out forwards',
                        pointerEvents: 'none',
                      }}></div>
                    )}
                  </>
                ) : (
                  <div style={{
                    position: 'absolute', left: 10, bottom: 10,
                    color: '#fff', fontSize: 12, fontWeight: 700, letterSpacing: '-0.01em',
                    textShadow: '0 1px 3px rgba(0,0,0,0.5)',
                    opacity: 0.95,
                  }}>Who is this?</div>
                )}
              </div>

              {/* Input zone (hidden when solved) */}
              {!got && (
                <form onSubmit={(e) => handleSubmit(i, e)} style={{
                  padding: '8px 12px',
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: isActive ? 'color-mix(in srgb, var(--accent) 5%, var(--bg-surface))' : 'var(--bg-surface)',
                  borderTop: '1px solid var(--border-subtle)',
                }}>
                  <input
                    ref={(el) => { refs.current[i] = el; }}
                    value={inputs[i]}
                    onChange={(e) => {
                      const next = [...inputs]; next[i] = e.target.value; setInputs(next);
                    }}
                    onFocus={() => setActiveIdx(i)}
                    placeholder="..."
                    style={{
                      flex: 1, minWidth: 0, border: 0, outline: 0, background: 'transparent',
                      fontSize: 13, fontFamily: 'inherit', color: 'var(--text-primary)',
                      fontWeight: 600,
                    }}
                  />
                </form>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Expose to global scope
Object.assign(window, { NameAllMembersGame });
