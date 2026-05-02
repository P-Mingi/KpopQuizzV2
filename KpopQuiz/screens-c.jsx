/* global React, Icon, fmtCount, GroupLogo, GroupPill, Avatar, SectionHead, TypePill */
const { useState: useSc, useMemo: useMc, useEffect: useEc } = React;

// ───────────────────────────────────────────────────────────────────────────
// ONBOARDING (3-step)
// ───────────────────────────────────────────────────────────────────────────
function OnboardingPage({ onDone }) {
  const [step, setStep] = useSc(0);
  const [picks, setPicks] = useSc([]);
  const [username, setUsername] = useSc('');

  const togglePick = (slug) => {
    setPicks(p => p.includes(slug) ? p.filter(x => x !== slug) : [...p, slug]);
  };

  const steps = [
    { kicker: 'Welcome',      title: 'Quizzes by fans, for fans', sub: 'Test how well you really know K-pop.' },
    { kicker: 'Your stans',   title: 'Pick the groups you love', sub: 'We\'ll personalize your home feed. Pick at least 3.' },
    { kicker: 'Almost there', title: 'Choose a username',         sub: 'You can change it later in settings.' },
  ];
  const s = steps[step];

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'var(--bg-primary)', zIndex: 90,
      display: 'flex', flexDirection: 'column', overflow: 'auto',
    }}>
      <div style={{ padding: '20px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
        {steps.map((_, i) => (
          <div key={i} style={{
            flex: 1, height: 4, borderRadius: 9999,
            background: i <= step ? 'var(--accent)' : 'var(--border)',
            transition: 'background 200ms',
          }}></div>
        ))}
      </div>

      <div style={{ flex: 1, padding: '24px 16px', display: 'flex', flexDirection: 'column', maxWidth: 520, margin: '0 auto', width: '100%' }}>
        <div className="kicker" style={{ color: 'var(--accent)', marginBottom: 6 }}>{s.kicker}</div>
        <h1 className="h-display" style={{ marginBottom: 8 }}>{s.title}</h1>
        <p className="muted" style={{ fontSize: 14, marginBottom: 28 }}>{s.sub}</p>

        {step === 0 && (
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: 20, padding: '20px 0',
          }}>
            <div style={{
              width: 220, height: 220, borderRadius: '50%',
              background: 'radial-gradient(circle, var(--accent), color-mix(in srgb, var(--accent) 50%, var(--bg-primary)))',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 100,
              boxShadow: '0 30px 80px -20px rgba(212,83,126,0.5)',
              animation: 'mascot-idle-kf 2.5s ease-in-out infinite',
            }}>🎤</div>
            <div className="card" style={{ padding: 16, width: '100%', textAlign: 'center' }}>
              <div className="kicker" style={{ marginBottom: 6 }}>Inside</div>
              <div style={{ fontSize: 14, lineHeight: 1.5, color: 'var(--text-secondary)' }}>
                30+ groups · 5 quiz formats · daily challenges · cards to collect · a leaderboard for the fastest fans.
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {window.GROUPS.map(g => {
              const sel = picks.includes(g.slug);
              return (
                <button key={g.slug} onClick={() => togglePick(g.slug)} className="card" style={{
                  padding: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                  cursor: 'pointer', position: 'relative',
                  borderColor: sel ? 'var(--accent)' : 'var(--border)',
                  background: sel ? 'var(--bg-accent-subtle)' : 'var(--bg-surface)',
                }}>
                  {sel && <div style={{ position: 'absolute', top: 6, right: 6, width: 18, height: 18, borderRadius: '50%', background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon.Check size={11} /></div>}
                  <GroupLogo slug={g.slug} size={48} />
                  <span style={{ fontSize: 11, fontWeight: 700 }}>{g.name}</span>
                </button>
              );
            })}
          </div>
        )}

        {step === 2 && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{
              background: 'var(--bg-surface)', border: '2px solid ' + (username ? 'var(--accent)' : 'var(--border)'), borderRadius: 14,
              padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-tertiary)' }}>@</span>
              <input value={username} onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9._]/g, ''))} placeholder="your_username" style={{
                flex: 1, border: 0, outline: 0, background: 'transparent', fontSize: 16,
                fontFamily: 'inherit', color: 'var(--text-primary)',
              }} maxLength={20} />
              {username.length >= 3 && <Icon.Check size={16} style={{ color: 'var(--correct)' }} />}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              <strong>3–20 characters.</strong> Letters, numbers, dots and underscores only. Your handle is public.
            </div>

            <div className="card" style={{ padding: 14, marginTop: 'auto' }}>
              <div className="kicker" style={{ marginBottom: 8 }}>Preview</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Avatar creator={{ name: username || 'newfan', bg: '#FFE4E9', text: '#9D2A48' }} size={40} />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{username || 'newfan'}</div>
                  <div className="kicker" style={{ color: 'var(--accent)' }}>Lv 1 · Trainee</div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
          {step > 0 && (
            <button onClick={() => setStep(s => s - 1)} className="btn btn-ghost">
              <Icon.ArrowLeft size={12} /> Back
            </button>
          )}
          <button
            onClick={() => step === 2 ? onDone() : setStep(s => s + 1)}
            className="btn btn-primary"
            disabled={(step === 1 && picks.length < 3) || (step === 2 && username.length < 3)}
            style={{ flex: 1, opacity: ((step === 1 && picks.length < 3) || (step === 2 && username.length < 3)) ? 0.4 : 1 }}
          >
            {step === 2 ? 'Start playing' : `Continue ${step === 1 ? `(${picks.length}/3)` : ''}`}
            {step !== 2 && <Icon.ArrowRight size={12} />}
          </button>
        </div>
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// LOGIN
// ───────────────────────────────────────────────────────────────────────────
function LoginPage({ onLogin, onBack }) {
  const [mode, setMode] = useSc('login');
  const [email, setEmail] = useSc('');

  return (
    <div style={{ paddingTop: 12, maxWidth: 420, margin: '0 auto' }}>
      <button onClick={onBack} className="btn btn-ghost" style={{ marginBottom: 16, padding: '6px 10px', fontSize: 12 }}>
        <Icon.ArrowLeft size={12} /> Back
      </button>

      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div style={{
          width: 64, height: 64, borderRadius: 16, background: 'var(--accent)', color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28,
          margin: '0 auto 16px', fontWeight: 800, letterSpacing: '-0.04em',
        }}>K</div>
        <h1 className="h-display" style={{ fontSize: 26 }}>{mode === 'login' ? 'Welcome back' : 'Join KpopQuiz'}</h1>
        <p className="muted" style={{ fontSize: 13, marginTop: 6 }}>
          {mode === 'login' ? 'Pick up your streak where you left off.' : 'Made by fans, free forever.'}
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button className="btn btn-ghost" style={{ padding: 14, fontSize: 14, fontWeight: 600, justifyContent: 'flex-start' }}>
          <span style={{
            width: 22, height: 22, borderRadius: '50%', background: '#fff', color: '#4285F4',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800,
          }}>G</span>
          Continue with Google
        </button>
        <button className="btn btn-ghost" style={{ padding: 14, fontSize: 14, fontWeight: 600, justifyContent: 'flex-start' }}>
          <span style={{
            width: 22, height: 22, borderRadius: '50%', background: '#FF4500', color: '#fff',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800,
          }}>R</span>
          Continue with Reddit
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '20px 0' }}>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }}></div>
        <span className="kicker">or</span>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }}></div>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); if (email) onLogin(); }}>
        <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>Email</label>
        <input value={email} onChange={e => setEmail(e.target.value)} placeholder="you@email.com" type="email" style={{
          width: '100%', padding: '12px 14px', border: '1px solid var(--border)', borderRadius: 12,
          background: 'var(--bg-surface)', fontSize: 14, fontFamily: 'inherit', color: 'var(--text-primary)',
          marginBottom: 14,
        }} />
        <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
          {mode === 'login' ? 'Send magic link' : 'Create account'}
        </button>
      </form>

      <div style={{ textAlign: 'center', marginTop: 18, fontSize: 12, color: 'var(--text-secondary)' }}>
        {mode === 'login' ? "New here? " : "Already a fan? "}
        <button onClick={() => setMode(m => m === 'login' ? 'signup' : 'login')} style={{
          background: 0, border: 0, color: 'var(--accent)', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, padding: 0,
        }}>{mode === 'login' ? 'Sign up' : 'Log in'}</button>
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// SETTINGS
// ───────────────────────────────────────────────────────────────────────────
function SettingsPage({ onBack }) {
  const [sounds, setSounds] = useSc(true);
  const [haptics, setHaptics] = useSc(true);
  const [animations, setAnimations] = useSc(true);
  const [emails, setEmails] = useSc(false);
  const [push, setPush] = useSc(true);
  const [adultMode, setAdultMode] = useSc(false);

  return (
    <div className="anim-fadeSlideUp" style={{ paddingTop: 12 }}>
      <button onClick={onBack} className="btn btn-ghost" style={{ marginBottom: 12, padding: '6px 10px', fontSize: 12 }}>
        <Icon.ArrowLeft size={12} /> Back
      </button>
      <h1 className="h-display" style={{ marginBottom: 22 }}>Settings</h1>

      <SettingsSection title="Account">
        <SettingsRow label="Username" value="@minji.daily" hint="Change in profile" />
        <SettingsRow label="Email"    value="m••••@gmail.com" />
        <SettingsRow label="Plan"     value="Free" badge="Upgrade" />
      </SettingsSection>

      <SettingsSection title="Gameplay">
        <SettingsToggle label="Sound effects"      sub="Tap, correct, wrong, share" value={sounds} onChange={setSounds} />
        <SettingsToggle label="Haptic feedback"    sub="Vibrations on mobile"        value={haptics} onChange={setHaptics} />
        <SettingsToggle label="Reduced motion"     sub="Tone down animations"        value={!animations} onChange={v => setAnimations(!v)} />
        <SettingsRow label="Default difficulty" value="Mixed" hint="Tap to change" />
      </SettingsSection>

      <SettingsSection title="Notifications">
        <SettingsToggle label="Push notifications"  sub="Daily quiz, friend activity" value={push} onChange={setPush} />
        <SettingsToggle label="Email digest"        sub="Weekly recap"                value={emails} onChange={setEmails} />
      </SettingsSection>

      <SettingsSection title="Content">
        <SettingsToggle label="Mature content"      sub="Show 18+ fan-made quizzes"   value={adultMode} onChange={setAdultMode} />
        <SettingsRow label="Language" value="English" />
        <SettingsRow label="Region"   value="Worldwide" />
      </SettingsSection>

      <SettingsSection title="About">
        <SettingsRow label="Help & support"  hint=">" />
        <SettingsRow label="Privacy"         hint=">" />
        <SettingsRow label="Terms"           hint=">" />
        <SettingsRow label="Version"         value="2.4.1" />
      </SettingsSection>

      <button className="btn btn-ghost" style={{ width: '100%', color: 'var(--wrong)', marginTop: 8 }}>
        Log out
      </button>
      <button className="btn btn-ghost" style={{ width: '100%', color: 'var(--text-tertiary)', marginTop: 8, fontSize: 12 }}>
        Delete account
      </button>
    </div>
  );
}

function SettingsSection({ title, children }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <div className="kicker" style={{ marginBottom: 10, padding: '0 4px' }}>{title}</div>
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>{children}</div>
    </div>
  );
}
function SettingsRow({ label, value, hint, badge }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px',
      borderBottom: '1px solid var(--border-subtle)',
    }}>
      <div style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{label}</div>
      {value && <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{value}</div>}
      {badge && <span style={{ padding: '2px 8px', borderRadius: 9999, background: 'var(--accent)', color: '#fff', fontSize: 10, fontWeight: 700 }}>{badge}</span>}
      {hint && <span className="kicker" style={{ color: 'var(--text-tertiary)' }}>{hint}</span>}
    </div>
  );
}
function SettingsToggle({ label, sub, value, onChange }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px',
      borderBottom: '1px solid var(--border-subtle)',
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>{sub}</div>}
      </div>
      <button onClick={() => onChange(!value)} style={{
        width: 42, height: 24, borderRadius: 9999, padding: 2,
        background: value ? 'var(--accent)' : 'var(--border)', border: 0, cursor: 'pointer',
        position: 'relative', transition: 'background 200ms',
      }}>
        <div style={{
          width: 20, height: 20, borderRadius: '50%', background: '#fff',
          transform: `translateX(${value ? 18 : 0}px)`, transition: 'transform 200ms',
          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        }}></div>
      </button>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// QUIZ CREATION (3-step)
// ───────────────────────────────────────────────────────────────────────────
function CreateQuizPage({ onBack, onPublish }) {
  const [step, setStep] = useSc(0);
  const [meta, setMeta] = useSc({ title: '', group: '', type: 'classic', difficulty: 'medium' });
  const [questions, setQuestions] = useSc([
    { q: '', options: ['', '', '', ''], correct: 0, fact: '' },
  ]);

  const addQuestion = () => setQuestions(qs => [...qs, { q: '', options: ['','','',''], correct: 0, fact: '' }]);
  const removeQuestion = (i) => setQuestions(qs => qs.filter((_, idx) => idx !== i));

  const filledQuestions = questions.filter(q => q.q.trim() && q.options.every(o => o.trim())).length;

  return (
    <div className="anim-fadeSlideUp" style={{ paddingTop: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <button onClick={onBack} className="btn btn-ghost" style={{ padding: '6px 10px', fontSize: 12 }}>
          <Icon.X size={12} /> Discard
        </button>
        <div className="kicker">Step {step+1} of 3</div>
        <div style={{ width: 70 }}></div>
      </div>

      {/* Progress */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 22 }}>
        {[0,1,2].map(i => (
          <div key={i} style={{
            flex: 1, height: 4, borderRadius: 9999,
            background: i <= step ? 'var(--accent)' : 'var(--border)',
          }}></div>
        ))}
      </div>

      {step === 0 && (
        <div>
          <div className="kicker" style={{ color: 'var(--accent)', marginBottom: 6 }}>Step 1 · Setup</div>
          <h1 className="h-display" style={{ marginBottom: 8 }}>Tell us about your quiz</h1>
          <p className="muted" style={{ fontSize: 13, marginBottom: 24 }}>This is what fans see in the feed.</p>

          <Field label="Title">
            <input value={meta.title} onChange={e => setMeta(m => ({ ...m, title: e.target.value }))} placeholder="e.g. BLACKPINK lyric trivia" maxLength={80} style={inputStyle} />
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4 }}>{meta.title.length}/80</div>
          </Field>

          <Field label="Group">
            <div className="scrollbar-hide" style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
              {window.GROUPS.map(g => (
                <button key={g.slug} onClick={() => setMeta(m => ({ ...m, group: g.slug }))} style={{
                  flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px',
                  borderRadius: 9999,
                  border: '1px solid ' + (meta.group === g.slug ? 'var(--accent)' : 'var(--border)'),
                  background: meta.group === g.slug ? 'var(--bg-accent-subtle)' : 'var(--bg-surface)',
                  color: 'var(--text-primary)', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: g.color }}></span>
                  {g.name}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Format">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
              {Object.entries(window.QUIZ_TYPES).map(([k, v]) => (
                <button key={k} onClick={() => setMeta(m => ({ ...m, type: k }))} className="card" style={{
                  padding: 12, textAlign: 'left', cursor: 'pointer',
                  borderColor: meta.type === k ? `var(--type-${v.tint})` : 'var(--border)',
                  background: meta.type === k ? `var(--type-${v.tint}-bg)` : 'var(--bg-surface)',
                }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: meta.type === k ? `var(--type-${v.tint}-text)` : 'var(--text-primary)' }}>{v.label}</div>
                  <div className="kicker" style={{ marginTop: 2, color: 'var(--text-tertiary)' }}>
                    {{
                      classic: '4 options · pick one',
                      image: 'Show a photo · 4 options',
                      intruder: 'Find the impostor',
                      tf: 'True or false statements',
                      clue: 'Reveal clues until you guess',
                    }[k]}
                  </div>
                </button>
              ))}
            </div>
          </Field>

          <Field label="Difficulty">
            <div style={{ display: 'flex', gap: 6 }}>
              {Object.keys(window.DIFFICULTIES).map(d => (
                <button key={d} onClick={() => setMeta(m => ({ ...m, difficulty: d }))} style={{
                  flex: 1, padding: '8px 12px', borderRadius: 9999,
                  border: '1px solid ' + (meta.difficulty === d ? 'var(--text-primary)' : 'var(--border)'),
                  background: meta.difficulty === d ? 'var(--text-primary)' : 'var(--bg-surface)',
                  color: meta.difficulty === d ? 'var(--bg-primary)' : 'var(--text-primary)',
                  fontSize: 12, fontWeight: 700, textTransform: 'capitalize', cursor: 'pointer',
                }}>{d}</button>
              ))}
            </div>
          </Field>
        </div>
      )}

      {step === 1 && (
        <div>
          <div className="kicker" style={{ color: 'var(--accent)', marginBottom: 6 }}>Step 2 · Questions</div>
          <h1 className="h-display" style={{ marginBottom: 8 }}>Add 5+ questions</h1>
          <p className="muted" style={{ fontSize: 13, marginBottom: 22 }}>Mark the correct answer with the dot.</p>

          {questions.map((q, i) => (
            <div key={i} className="card" style={{ padding: 14, marginBottom: 12, position: 'relative' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div className="kicker">Question {i+1}</div>
                {questions.length > 1 && (
                  <button onClick={() => removeQuestion(i)} style={{ background: 0, border: 0, color: 'var(--text-tertiary)', cursor: 'pointer', padding: 4 }}>
                    <Icon.X size={14} />
                  </button>
                )}
              </div>
              <input value={q.q} onChange={e => {
                const next = [...questions]; next[i].q = e.target.value; setQuestions(next);
              }} placeholder="What do you want to ask?" style={{ ...inputStyle, marginBottom: 10 }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {q.options.map((opt, oi) => (
                  <div key={oi} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button onClick={() => {
                      const next = [...questions]; next[i].correct = oi; setQuestions(next);
                    }} style={{
                      width: 22, height: 22, borderRadius: '50%',
                      border: '2px solid ' + (q.correct === oi ? 'var(--correct)' : 'var(--border)'),
                      background: q.correct === oi ? 'var(--correct)' : 'transparent',
                      cursor: 'pointer', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff',
                    }}>{q.correct === oi && <Icon.Check size={12} />}</button>
                    <input value={opt} onChange={e => {
                      const next = [...questions]; next[i].options[oi] = e.target.value; setQuestions(next);
                    }} placeholder={`Option ${oi+1}${oi===0?' (correct)':''}`} style={{
                      flex: 1, padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 8,
                      background: 'var(--bg-elevated)', fontSize: 13, fontFamily: 'inherit', color: 'var(--text-primary)',
                    }} />
                  </div>
                ))}
              </div>
              <input value={q.fact} onChange={e => {
                const next = [...questions]; next[i].fact = e.target.value; setQuestions(next);
              }} placeholder="Optional: fun fact shown on reveal" style={{
                ...inputStyle, marginTop: 10, fontSize: 12, padding: '10px 12px',
              }} />
            </div>
          ))}
          <button onClick={addQuestion} className="btn btn-ghost" style={{ width: '100%', borderStyle: 'dashed' }}>
            + Add another question
          </button>
        </div>
      )}

      {step === 2 && (
        <div>
          <div className="kicker" style={{ color: 'var(--accent)', marginBottom: 6 }}>Step 3 · Review</div>
          <h1 className="h-display" style={{ marginBottom: 8 }}>Looking good?</h1>
          <p className="muted" style={{ fontSize: 13, marginBottom: 22 }}>You can come back and edit anytime from your profile.</p>

          {/* Quiz card preview */}
          <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 20 }}>
            <div style={{
              padding: '24px 16px 18px',
              background: meta.group ? `linear-gradient(135deg, ${window.GROUPS.find(x=>x.slug===meta.group)?.color || '#888'}, color-mix(in srgb, ${window.GROUPS.find(x=>x.slug===meta.group)?.color || '#888'} 60%, var(--accent)))` : 'var(--bg-elevated)',
              color: '#fff',
            }}>
              <div className="kicker" style={{ opacity: 0.85 }}>
                {meta.group ? window.GROUPS.find(x=>x.slug===meta.group).name : 'No group'} · {window.QUIZ_TYPES[meta.type].label}
              </div>
              <h3 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', marginTop: 6 }}>
                {meta.title || 'Untitled quiz'}
              </h3>
            </div>
            <div style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ padding: '3px 8px', borderRadius: 9999, background: `var(--${meta.difficulty}-bg)`, color: `var(--${meta.difficulty}-text)`, fontSize: 11, fontWeight: 700, textTransform: 'capitalize' }}>{meta.difficulty}</span>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{filledQuestions} questions</span>
            </div>
          </div>

          <Checklist
            items={[
              { ok: !!meta.title.trim(), label: 'Title set' },
              { ok: !!meta.group, label: 'Group selected' },
              { ok: filledQuestions >= 5, label: `5+ questions filled out (${filledQuestions} so far)` },
              { ok: questions.every(q => !q.options.some(o => !o)), label: 'All options filled' },
            ]}
          />
        </div>
      )}

      {/* Footer nav */}
      <div style={{
        position: 'sticky', bottom: 0, marginTop: 24,
        background: 'linear-gradient(180deg, transparent, var(--bg-primary) 30%)',
        padding: '16px 0',
        display: 'flex', gap: 8,
      }}>
        {step > 0 && <button onClick={() => setStep(s => s-1)} className="btn btn-ghost">Back</button>}
        <button
          onClick={() => step === 2 ? onPublish() : setStep(s => s+1)}
          className="btn btn-primary"
          disabled={
            (step === 0 && (!meta.title.trim() || !meta.group)) ||
            (step === 1 && filledQuestions < 1)
          }
          style={{
            flex: 1,
            opacity: ((step === 0 && (!meta.title.trim() || !meta.group)) || (step === 1 && filledQuestions < 1)) ? 0.4 : 1,
          }}
        >
          {step === 2 ? 'Publish quiz' : 'Continue'}
          {step !== 2 && <Icon.ArrowRight size={12} />}
        </button>
      </div>
    </div>
  );
}

const inputStyle = {
  width: '100%', padding: '12px 14px', border: '1px solid var(--border)', borderRadius: 12,
  background: 'var(--bg-surface)', fontSize: 14, fontFamily: 'inherit', color: 'var(--text-primary)',
  outline: 'none',
};

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <label className="kicker" style={{ display: 'block', marginBottom: 8 }}>{label}</label>
      {children}
    </div>
  );
}

function Checklist({ items }) {
  return (
    <div className="card" style={{ padding: 0 }}>
      {items.map((it, i) => (
        <div key={i} style={{
          padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10,
          borderBottom: i < items.length - 1 ? '1px solid var(--border-subtle)' : 0,
          fontSize: 13,
        }}>
          <div style={{
            width: 22, height: 22, borderRadius: '50%',
            background: it.ok ? 'var(--correct-bg)' : 'var(--bg-elevated)',
            color: it.ok ? 'var(--correct)' : 'var(--text-tertiary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>{it.ok ? <Icon.Check size={12} /> : '·'}</div>
          <span style={{ fontWeight: 600, color: it.ok ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{it.label}</span>
        </div>
      ))}
    </div>
  );
}

Object.assign(window, { OnboardingPage, LoginPage, SettingsPage, CreateQuizPage });
