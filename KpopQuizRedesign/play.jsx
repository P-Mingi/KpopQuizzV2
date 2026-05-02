/* global React, Icon, fmtCount, TypePill, DifficultyPill, GroupLogo, Avatar */
const { useState: useStateP, useEffect: useEffectP, useRef: useRefP, useCallback: useCallbackP } = React;

// ─── Quiz intro screen (shown before play starts) ────────────────────────────
function QuizIntro({ quiz, onStart, onBack }) {
  const g = window.GROUPS.find(x => x.slug === quiz.group);
  return (
    <div className="anim-fadeSlideUp" style={{ paddingTop: 16 }}>
      <button onClick={onBack} className="btn btn-ghost" style={{ marginBottom: 16, padding: '6px 10px', fontSize: 12 }}>
        <Icon.ArrowLeft size={12} /> Back
      </button>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{
          height: 160,
          background: `linear-gradient(135deg, ${g.color}, color-mix(in srgb, ${g.color} 50%, #000))`,
          position: 'relative',
        }}>
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.18), transparent 50%)',
          }}></div>
          <div style={{ position: 'absolute', bottom: -40, left: '50%', transform: 'translateX(-50%)' }}>
            <GroupLogo slug={quiz.group} size={88} ring />
          </div>
        </div>

        <div style={{ padding: '52px 24px 24px', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 12 }}>
            <TypePill type={quiz.type} />
            <DifficultyPill difficulty={quiz.difficulty} />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.2, marginBottom: 12 }}>
            {quiz.title}
          </h1>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-secondary)', marginBottom: 20 }}>
            <Avatar creator={quiz.creator} size={20} />
            <span>by {quiz.creator.name}</span>
          </div>

          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8,
            padding: 16, background: 'var(--bg-elevated)', borderRadius: 12, marginBottom: 20,
          }}>
            <Stat label="Questions" value={quiz.questions.length} />
            <Stat label="Plays" value={fmtCount(quiz.plays)} />
            <Stat label="Pass rate" value={`${quiz.passRate}%`} accent />
          </div>

          <button className="btn btn-primary" onClick={onStart} style={{ width: '100%', padding: '14px 16px', fontSize: 14 }}>
            <Icon.Play size={14} /> Start quiz
          </button>
          <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 10 }}>
            No timer pressure · You can pause anytime
          </p>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }) {
  return (
    <div>
      <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em', color: accent ? 'var(--accent)' : 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-tertiary)', marginTop: 2 }}>{label}</div>
    </div>
  );
}

// ─── Progress dots ────────────────────────────────────────────────────────────
function ProgressDots({ total, current, results }) {
  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
      {Array.from({ length: total }).map((_, i) => {
        const r = results[i];
        let bg = 'var(--border)';
        if (r === true)  bg = 'var(--correct)';
        if (r === false) bg = 'var(--wrong)';
        if (i === current && r === undefined) bg = 'var(--accent)';
        const isCurrent = i === current && r === undefined;
        return <div key={i} style={{
          width: isCurrent ? 18 : 6, height: 6, borderRadius: 3,
          background: bg, transition: 'all 220ms ease',
        }}></div>;
      })}
    </div>
  );
}

// ─── The active quiz player ──────────────────────────────────────────────────
function QuizPlayer({ quiz, onComplete, onExit, cardVariant='stacked' }) {
  const [idx, setIdx] = useStateP(0);
  const [selected, setSelected] = useStateP(null);
  const [revealed, setRevealed] = useStateP(false);
  const [results, setResults] = useStateP([]); // array of booleans
  const [combo, setCombo] = useStateP(0);
  const [shakeKey, setShakeKey] = useStateP(0);
  const startTimeRef = useRefP(Date.now());
  const questionStartRef = useRefP(Date.now());

  const q = quiz.questions[idx];
  const isLast = idx === quiz.questions.length - 1;

  const handleSelect = (i) => {
    if (revealed) return;
    setSelected(i);
    const correct = i === q.correct;
    setRevealed(true);
    const newResults = [...results, correct];
    setResults(newResults);
    if (correct) setCombo(c => c + 1);
    else { setCombo(0); setShakeKey(k => k + 1); }
  };

  const handleNext = () => {
    if (isLast) {
      const totalTime = Math.round((Date.now() - startTimeRef.current) / 1000);
      onComplete({
        results,
        score: results.filter(Boolean).length,
        total: quiz.questions.length,
        time: totalTime,
        maxCombo: results.reduce((max, r, i) => {
          let curr = 0;
          for (let j = i; j < results.length && results[j]; j++) curr++;
          return Math.max(max, curr);
        }, 0),
      });
      return;
    }
    setIdx(i => i + 1);
    setSelected(null);
    setRevealed(false);
    questionStartRef.current = Date.now();
  };

  return (
    <div style={{ paddingTop: 12, minHeight: 'calc(100vh - 80px)' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18,
      }}>
        <button onClick={onExit} className="btn btn-ghost" style={{ padding: 8 }} aria-label="Exit">
          <Icon.X size={14} />
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
            <GroupLogo slug={quiz.group} size={16} />
            <span>Question {idx + 1} of {quiz.questions.length}</span>
          </div>
          <ProgressDots total={quiz.questions.length} current={idx} results={results} />
        </div>
        {combo >= 2 && (
          <div className="anim-pop" key={`combo-${combo}`} style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '4px 10px', borderRadius: 9999,
            background: 'var(--bg-accent-subtle)', color: 'var(--accent)',
            fontSize: 12, fontWeight: 700, fontVariantNumeric: 'tabular-nums',
            border: '1px solid var(--accent-light)',
          }}>
            <Icon.Bolt size={11} /> {combo}× combo
          </div>
        )}
      </div>

      {/* Question card */}
      <QuestionCard
        key={idx + '-' + shakeKey}
        question={q}
        selected={selected}
        revealed={revealed}
        cardVariant={cardVariant}
        onSelect={handleSelect}
        shakeKey={shakeKey}
      />

      {/* Feedback / next */}
      {revealed && (
        <div className="anim-fadeSlideUp" style={{ marginTop: 16 }}>
          <FeedbackBox correct={selected === q.correct} fact={q.fact} />
          <button className="btn btn-primary" onClick={handleNext} style={{ width: '100%', padding: '14px 16px', marginTop: 12 }}>
            {isLast ? 'See results' : 'Next question'} <Icon.ArrowRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

function QuestionCard({ question, selected, revealed, onSelect, cardVariant, shakeKey }) {
  const isShaking = revealed && selected !== question.correct;
  return (
    <div className={`card anim-fadeSlideUp ${isShaking ? 'anim-shake' : ''}`} style={{ padding: 'var(--pad-section, 24px)' }} key={shakeKey}>
      <h2 style={{
        fontSize: cardVariant === 'compact' ? 18 : 22,
        fontWeight: 700, letterSpacing: '-0.015em',
        lineHeight: 1.3, marginBottom: 20,
        textWrap: 'pretty',
      }}>
        {question.q}
      </h2>

      <div style={{
        display: 'grid',
        gridTemplateColumns: cardVariant === 'grid' ? '1fr 1fr' : '1fr',
        gap: cardVariant === 'compact' ? 6 : 8,
      }}>
        {question.options.map((opt, i) => (
          <AnswerButton
            key={i}
            label={opt}
            letter={String.fromCharCode(65 + i)}
            selected={selected === i}
            isCorrect={i === question.correct}
            revealed={revealed}
            disabled={revealed}
            onClick={() => onSelect(i)}
            variant={cardVariant}
          />
        ))}
      </div>
    </div>
  );
}

function AnswerButton({ label, letter, selected, isCorrect, revealed, disabled, onClick, variant }) {
  let bg = 'var(--bg-surface)';
  let border = 'var(--border)';
  let color = 'var(--text-primary)';
  let icon = null;

  if (revealed) {
    if (isCorrect) {
      bg = 'var(--correct-bg)';
      border = 'var(--correct-border)';
      color = 'var(--correct-text)';
      icon = <Icon.Check size={14} />;
    } else if (selected) {
      bg = 'var(--wrong-bg)';
      border = 'var(--wrong-border)';
      color = 'var(--wrong-text)';
      icon = <Icon.X size={14} />;
    } else {
      color = 'var(--text-tertiary)';
    }
  } else if (selected) {
    border = 'var(--text-primary)';
  }

  const compact = variant === 'compact';

  return (
    <button onClick={onClick} disabled={disabled} style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: compact ? '12px 14px' : '14px 16px',
      borderRadius: 12,
      background: bg,
      border: '1.5px solid ' + border,
      color, textAlign: 'left',
      fontSize: compact ? 13 : 14, fontWeight: 600,
      transition: 'all 150ms ease',
      width: '100%',
    }} onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.borderColor = 'var(--text-primary)'; }}
       onMouseLeave={(e) => { if (!disabled && !selected) e.currentTarget.style.borderColor = 'var(--border)'; }}>
      <span style={{
        width: 26, height: 26, borderRadius: 7,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        background: revealed && (isCorrect || selected)
          ? (isCorrect ? 'var(--correct)' : 'var(--wrong)')
          : 'var(--bg-elevated)',
        color: revealed && (isCorrect || selected) ? '#fff' : 'var(--text-secondary)',
        fontSize: 12, fontWeight: 700, flexShrink: 0,
        transition: 'all 150ms ease',
      }}>
        {revealed && (isCorrect || selected) ? icon : letter}
      </span>
      <span style={{ flex: 1 }}>{label}</span>
    </button>
  );
}

function FeedbackBox({ correct, fact }) {
  return (
    <div style={{
      padding: 16, borderRadius: 12,
      background: correct ? 'var(--correct-bg)' : 'var(--wrong-bg)',
      border: '1px solid ' + (correct ? 'var(--correct-border)' : 'var(--wrong-border)'),
      color: correct ? 'var(--correct-text)' : 'var(--wrong-text)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontSize: 13, fontWeight: 700 }}>
        {correct ? <Icon.Check size={14} /> : <Icon.X size={14} />}
        {correct ? 'Correct!' : 'Not quite.'}
      </div>
      <p style={{ fontSize: 13, lineHeight: 1.5, opacity: 0.92 }}>{fact}</p>
    </div>
  );
}

// ─── Results screen ──────────────────────────────────────────────────────────
function QuizResults({ quiz, result, onPlayAgain, onBackHome, onShare }) {
  const pct = Math.round((result.score / result.total) * 100);
  const g = window.GROUPS.find(x => x.slug === quiz.group);

  let label = 'Casual fan';
  let labelColor = 'var(--text-secondary)';
  if (pct === 100) { label = 'Ultimate stan'; labelColor = 'var(--accent)'; }
  else if (pct >= 80) { label = 'Hardcore fan'; labelColor = 'var(--correct)'; }
  else if (pct >= 60) { label = 'Solid stan'; labelColor = 'var(--type-classic)'; }
  else if (pct >= 40) { label = 'Getting there'; labelColor = 'var(--type-clue)'; }

  const beats = quiz.passRate + Math.round(Math.random() * 8);

  return (
    <div className="anim-fadeSlideUp" style={{ paddingTop: 16 }}>
      <div style={{
        textAlign: 'center', padding: '32px 16px 24px',
        background: `linear-gradient(180deg, color-mix(in srgb, ${g.color} 18%, var(--bg-primary)), var(--bg-primary))`,
        borderRadius: 18, marginBottom: 16,
      }}>
        <div className="anim-pop" style={{
          width: 96, height: 96, borderRadius: '50%',
          background: 'var(--bg-surface)',
          border: '4px solid ' + (pct >= 80 ? 'var(--correct)' : pct >= 50 ? 'var(--accent)' : 'var(--type-clue)'),
          margin: '0 auto 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: 'var(--shadow-lift)',
          flexDirection: 'column',
        }}>
          <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
            {result.score}<span style={{ color: 'var(--text-tertiary)', fontSize: 18 }}>/{result.total}</span>
          </div>
        </div>
        <div className="kicker" style={{ marginBottom: 6, color: labelColor }}>{label}</div>
        <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.025em', lineHeight: 1.1, marginBottom: 8 }}>
          {pct === 100 ? `Perfect, ${g.fandom}!` : pct >= 60 ? 'Nicely done.' : 'Better luck next time.'}
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 360, margin: '0 auto' }}>
          You scored higher than <strong style={{ color: 'var(--text-primary)' }}>{beats}%</strong> of fans on this quiz.
        </p>
      </div>

      {/* Stats grid */}
      <div className="card" style={{ padding: 'var(--pad-card, 16px)', marginBottom: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          <Stat label="Score" value={`${pct}%`} accent />
          <Stat label="Time" value={`${Math.floor(result.time/60)}:${String(result.time%60).padStart(2,'0')}`} />
          <Stat label="Best combo" value={`${result.maxCombo}×`} />
        </div>
      </div>

      {/* Question review */}
      <div className="card" style={{ padding: 'var(--pad-card, 16px)', marginBottom: 16 }}>
        <h2 className="h-section" style={{ marginBottom: 10 }}>Question review</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {quiz.questions.map((q, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'flex-start', gap: 10,
              padding: '8px 10px', borderRadius: 8,
              background: result.results[i] ? 'var(--correct-bg)' : 'var(--wrong-bg)',
              border: '1px solid ' + (result.results[i] ? 'var(--correct-border)' : 'var(--wrong-border)'),
            }}>
              <span style={{
                width: 22, height: 22, borderRadius: '50%',
                background: result.results[i] ? 'var(--correct)' : 'var(--wrong)',
                color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                {result.results[i] ? <Icon.Check size={11} /> : <Icon.X size={11} />}
              </span>
              <div style={{ flex: 1, fontSize: 12.5, lineHeight: 1.4, color: result.results[i] ? 'var(--correct-text)' : 'var(--wrong-text)' }}>
                <div style={{ fontWeight: 600 }}>{q.q}</div>
                {!result.results[i] && (
                  <div style={{ fontSize: 11.5, marginTop: 3, opacity: 0.85 }}>
                    Answer: <strong>{q.options[q.correct]}</strong>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button className="btn btn-primary" onClick={onPlayAgain} style={{ padding: '14px 16px' }}>
          <Icon.Play /> Play another quiz
        </button>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <button className="btn btn-ghost" onClick={onShare} style={{ padding: '12px' }}>
            Share result
          </button>
          <button className="btn btn-ghost" onClick={onBackHome} style={{ padding: '12px' }}>
            <Icon.Home size={14} /> Home
          </button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { QuizIntro, QuizPlayer, QuizResults });
