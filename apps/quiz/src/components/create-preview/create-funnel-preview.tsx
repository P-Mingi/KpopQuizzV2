'use client';

import { useState } from 'react';

// ============================================================
// Step H PROTOTYPE - 4-screen creation funnel, mock data only.
// NOT wired to any API/DB/auth. Lives at /create-preview for sign-off.
// B0 tokens, Syne display + DM Sans, mobile-first.
// ============================================================

interface MockQuestion {
  q: string;
  answers: [string, string, string, string];
  correct: number | null;
}

const GROUPS = [
  { slug: 'itzy', name: 'ITZY' }, { slug: 'bts', name: 'BTS' }, { slug: 'blackpink', name: 'BLACKPINK' },
  { slug: 'twice', name: 'TWICE' }, { slug: 'stray-kids', name: 'Stray Kids' }, { slug: 'aespa', name: 'aespa' },
  { slug: 'newjeans', name: 'NewJeans' }, { slug: 'seventeen', name: 'SEVENTEEN' }, { slug: 'ive', name: 'IVE' },
  { slug: 'le-sserafim', name: 'LE SSERAFIM' },
];

const TITLE_PLACEHOLDER = 'e.g. Only real ITZY stans can pass this';

function blankQuestion(): MockQuestion {
  return { q: '', answers: ['', '', '', ''], correct: null };
}

const GoogleIcon = (
  <svg width="18" height="18" viewBox="0 0 16 16" aria-hidden="true"><path d="M15.5 8.2c0-.6-.1-1-.2-1.5H8v2.8h4.2c-.2.9-.7 1.7-1.4 2.2v1.8h2.3c1.4-1.2 2.2-3.1 2.2-5.3z" fill="#4285F4" /><path d="M8 16c2.2 0 4-.7 5.3-2l-2.3-1.8c-.7.5-1.6.8-2.9.8-2.2 0-4.1-1.5-4.8-3.5H.8v1.9C2.2 14.1 4.9 16 8 16z" fill="#34A853" /><path d="M3.2 9.5c-.2-.5-.3-1-.3-1.5s.1-1 .3-1.5V4.6H.8C.3 5.6 0 6.8 0 8s.3 2.4.8 3.4l2.4-1.9z" fill="#FBBC05" /><path d="M8 3.2c1.3 0 2.4.4 3.3 1.3l2.4-2.4C12 .8 10.2 0 8 0 4.9 0 2.2 1.9.8 4.6l2.4 1.9C4 4.6 5.8 3.2 8 3.2z" fill="#EA4335" /></svg>
);
const DiscordIcon = (
  <svg width="18" height="18" viewBox="0 0 16 16" fill="#fff" aria-hidden="true"><path d="M13.554 2.893A12.634 12.634 0 0 0 10.436 1.8a8.268 8.268 0 0 0-.404.817 11.828 11.828 0 0 0-3.502 0A8.923 8.923 0 0 0 6.149 1.8a12.67 12.67 0 0 0-3.12 1.095C.767 5.685.214 8.487.49 11.25A12.697 12.697 0 0 0 4.35 13.2a9.437 9.437 0 0 0 .834-1.35 8.202 8.202 0 0 1-1.313-.629c.11-.08.218-.163.322-.25a9.07 9.07 0 0 0 7.698 0c.105.09.213.173.323.25a8.23 8.23 0 0 1-1.316.63 9.394 9.394 0 0 0 .834 1.348 12.65 12.65 0 0 0 3.863-1.95c.334-3.212-.57-5.986-2.04-8.456ZM5.53 9.665c-.733 0-1.336-.667-1.336-1.487 0-.82.588-1.49 1.336-1.49.749 0 1.348.67 1.336 1.49 0 .82-.588 1.487-1.336 1.487Zm4.94 0c-.733 0-1.336-.667-1.336-1.487 0-.82.588-1.49 1.336-1.49.749 0 1.344.67 1.336 1.49-.003.82-.588 1.487-1.336 1.487Z" /></svg>
);

export function CreateFunnelPreview(): React.ReactElement {
  const [step, setStep] = useState(1);
  const [title, setTitle] = useState('');
  const [group, setGroup] = useState<string>('itzy');
  const [cover, setCover] = useState(false);
  const [questions, setQuestions] = useState<MockQuestion[]>([
    { q: 'Which member is the main rapper?', answers: ['Yeji', 'Lia', 'Ryujin', 'Chaeryeong'], correct: 2 },
  ]);
  const [qIndex, setQIndex] = useState(0);
  const [copied, setCopied] = useState(false);

  const displayTitle = title.trim() || TITLE_PLACEHOLDER.replace('e.g. ', '');
  const groupName = GROUPS.find((g) => g.slug === group)?.name ?? 'K-pop';

  const setQuestion = (patch: Partial<MockQuestion>) => {
    setQuestions((prev) => prev.map((q, i) => (i === qIndex ? { ...q, ...patch } : q)));
  };
  const setAnswer = (ai: number, val: string) => {
    setQuestions((prev) => prev.map((q, i) => {
      if (i !== qIndex) return q;
      const answers = [...q.answers] as [string, string, string, string];
      answers[ai] = val;
      return { ...q, answers };
    }));
  };
  const addAnother = () => {
    setQuestions((prev) => [...prev, blankQuestion()]);
    setQIndex(questions.length);
  };

  const cur = questions[qIndex];

  return (
    <div className="cf-screen">
      {/* Prototype banner */}
      <p className="cf-proto-flag">Prototype preview - mock data, nothing is saved</p>

      {/* Progress (screens 1-3) */}
      {step <= 3 && (
        <div className="cf-top">
          <span className="cf-eyebrow">
            {step === 1 ? 'Create a quiz · details' : step === 2 ? 'Create a quiz · questions' : 'Create a quiz · publish'}
          </span>
          <div className="cf-progress" role="img" aria-label={`Step ${step} of 4`}>
            {[1, 2, 3, 4].map((d) => (
              <span key={d} className={`cf-dot${d === step ? ' active' : d < step ? ' done' : ''}`} />
            ))}
          </div>
        </div>
      )}

      {/* ===================== SCREEN 1 - SETUP ===================== */}
      {step === 1 && (
        <div className="cf-body">
          <h1 className="cf-head">What&apos;s your quiz about?</h1>
          <p className="cf-sub">No account needed to start. You can change everything later.</p>

          <div className="cf-field">
            <label className="cf-label" htmlFor="cf-title">Quiz title</label>
            <input
              id="cf-title"
              className="cf-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={TITLE_PLACEHOLDER}
            />
          </div>

          <div className="cf-field">
            <span className="cf-label">Group</span>
            <div className="cf-chips">
              {GROUPS.map((g) => (
                <button
                  key={g.slug}
                  type="button"
                  className={`cf-chip${group === g.slug ? ' on' : ''}`}
                  aria-pressed={group === g.slug}
                  onClick={() => setGroup(g.slug)}
                >
                  {g.name}
                </button>
              ))}
            </div>
          </div>

          <div className="cf-field">
            <span className="cf-label">
              Cover image <span className="cf-rec">Recommended</span>
            </span>
            <button
              type="button"
              className={`cf-cover${cover ? ' filled' : ''}`}
              onClick={() => setCover((c) => !c)}
              aria-label={cover ? 'Change cover image' : 'Add a cover image'}
            >
              {cover ? (
                <span className="cf-cover-change">Change</span>
              ) : (
                <span className="cf-cover-empty">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="8.5" cy="8.5" r="1.6" /><path d="m21 15-5-5L5 21" /></svg>
                  <span>Tap to add a cover</span>
                </span>
              )}
            </button>
            <p className="cf-cover-help">Shows on your quiz card and becomes your share card background. Quizzes with a cover get way more plays.</p>
            {!cover && <button type="button" className="cf-skip" onClick={() => setStep(2)}>Skip for now</button>}
          </div>

          <button type="button" className="cf-cta" onClick={() => setStep(2)}>Start adding questions &rarr;</button>
        </div>
      )}

      {/* ===================== SCREEN 2 - QUESTIONS ===================== */}
      {step === 2 && cur && (
        <div className="cf-body">
          <div className="cf-q-head">
            <span className="cf-q-count">Question {qIndex + 1} of {questions.length}</span>
            <div className="cf-minidots">
              {questions.map((q, i) => (
                <button
                  key={i}
                  type="button"
                  className={`cf-minidot${i === qIndex ? ' active' : q.correct !== null ? ' done' : ''}`}
                  aria-label={`Go to question ${i + 1}`}
                  onClick={() => setQIndex(i)}
                />
              ))}
            </div>
          </div>

          <div className="cf-qcard" key={qIndex}>
            <input
              className="cf-qinput"
              value={cur.q}
              onChange={(e) => setQuestion({ q: e.target.value })}
              placeholder="Type your question..."
              aria-label="Question text"
            />
            <p className="cf-hint">Tap the circle to mark the correct answer</p>
            <div className="cf-answers">
              {cur.answers.map((a, ai) => (
                <div key={ai} className={`cf-answer${cur.correct === ai ? ' correct' : ''}`}>
                  <button
                    type="button"
                    className="cf-radio"
                    aria-label={`Mark answer ${ai + 1} correct`}
                    aria-pressed={cur.correct === ai}
                    onClick={() => setQuestion({ correct: ai })}
                  >
                    {cur.correct === ai && (
                      <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3 8.5l3.2 3.2L13 4.8" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    )}
                  </button>
                  <input
                    className="cf-answer-input"
                    value={a}
                    onChange={(e) => setAnswer(ai, e.target.value)}
                    placeholder={`Answer ${ai + 1}`}
                    aria-label={`Answer ${ai + 1}`}
                  />
                </div>
              ))}
            </div>
          </div>

          <button type="button" className="cf-addq" onClick={addAnother}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
            Add another question
          </button>

          <button type="button" className="cf-cta" onClick={() => setStep(3)}>Done &rarr;</button>
          <button type="button" className="cf-ghost" onClick={() => setStep(1)}>&larr; Back to details</button>
        </div>
      )}

      {/* ===================== SCREEN 3 - PUBLISH + AUTH ===================== */}
      {step === 3 && (
        <div className="cf-body">
          <h1 className="cf-head">Ready to publish?</h1>
          <p className="cf-sub">Publish it and track how many fans play, like, and beat your score.</p>

          {/* Live preview - mirrors the browse quiz card */}
          <div className="cf-preview-wrap">
            <span className="cf-preview-tag">Live preview</span>
            <div className="quiz-card cf-preview-card">
              <div className="quiz-cover">
                {cover ? (
                  <span className="cf-cover-mock" aria-hidden="true" />
                ) : (
                  <span className="cf-logo-mock" aria-hidden="true">{groupName.charAt(0)}</span>
                )}
              </div>
              <div className="quiz-body">
                <div className="badge-row">
                  <span className="badge b-classic">Classic</span>
                  <span className="badge b-easy">Easy</span>
                </div>
                <p className="quiz-title">{displayTitle}</p>
                <div className="quiz-meta">
                  <span className="quiz-plays">{questions.length} questions</span>
                  <span className="quiz-author">by you</span>
                </div>
              </div>
            </div>
          </div>

          <p className="cf-reassure">Your quiz is saved. Sign in once to publish it and keep it linked to you - takes 5 seconds.</p>

          <button type="button" className="auth-btn auth-google" onClick={() => setStep(4)}>
            <span className="auth-icon">{GoogleIcon}</span>Continue with Google
          </button>
          <button type="button" className="auth-btn auth-discord" onClick={() => setStep(4)}>
            <span className="auth-icon">{DiscordIcon}</span>Continue with Discord
          </button>
          <div className="auth-divider"><span>or with email</span></div>
          <input className="auth-inp" type="email" placeholder="you@example.com" aria-label="Email" />
          <button type="button" className="email-btn" onClick={() => setStep(4)}>Sign in with email</button>

          <button type="button" className="cf-ghost" onClick={() => setStep(2)}>&larr; Keep editing</button>
        </div>
      )}

      {/* ===================== SCREEN 4 - SHARE = REWARD ===================== */}
      {step === 4 && (
        <div className="cf-body cf-celebrate">
          <div className="cf-burst" aria-hidden="true">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="cf-logo-pop" src="/logo-512.png" alt="" width={108} height={108} />
          </div>
          <h1 className="cf-head cf-center">Your quiz is live!</h1>
          <p className="cf-sub cf-center">Now the fun part. See who can actually beat it.</p>

          <div className="cf-share-btns">
            <button type="button" className="cf-share-btn cf-reddit">
              <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M10 0C4.478 0 0 4.478 0 10s4.478 10 10 10 10-4.478 10-10S15.522 0 10 0zm5.49 10.354a1.55 1.55 0 0 1 .01.175c0 2.677-3.117 4.847-6.962 4.847-3.845 0-6.962-2.17-6.962-4.847 0-.06.003-.12.01-.175a1.178 1.178 0 0 1-.315-.806 1.19 1.19 0 0 1 2.024-.843c.98-.629 2.315-1.032 3.797-1.078l.748-3.295a.24.24 0 0 1 .285-.18l2.321.487a.83.83 0 1 1-.083.475l-2.07-.435-.664 2.923c1.457.06 2.768.462 3.736 1.082a1.19 1.19 0 1 1 1.124 1.298zm-9.028 0a.595.595 0 1 0 1.19 0 .595.595 0 0 0-1.19 0zm5.283 1.658c-.493.493-1.55.668-1.757.668-.208 0-1.27-.178-1.758-.668a.196.196 0 0 0-.277.277c.62.62 1.799.84 2.035.84.237 0 1.41-.22 2.034-.84a.196.196 0 0 0-.277-.277z" /></svg>
              Reddit
            </button>
            <button type="button" className="cf-share-btn cf-discord">
              <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M13.554 2.893A12.634 12.634 0 0 0 10.436 1.8a8.268 8.268 0 0 0-.404.817 11.828 11.828 0 0 0-3.502 0A8.923 8.923 0 0 0 6.149 1.8a12.67 12.67 0 0 0-3.12 1.095C.767 5.685.214 8.487.49 11.25A12.697 12.697 0 0 0 4.35 13.2a9.437 9.437 0 0 0 .834-1.35 8.202 8.202 0 0 1-1.313-.629c.11-.08.218-.163.322-.25a9.07 9.07 0 0 0 7.698 0c.105.09.213.173.323.25a8.23 8.23 0 0 1-1.316.63 9.394 9.394 0 0 0 .834 1.348 12.65 12.65 0 0 0 3.863-1.95c.334-3.212-.57-5.986-2.04-8.456ZM5.53 9.665c-.733 0-1.336-.667-1.336-1.487 0-.82.588-1.49 1.336-1.49.749 0 1.348.67 1.336 1.49 0 .82-.588 1.487-1.336 1.487Zm4.94 0c-.733 0-1.336-.667-1.336-1.487 0-.82.588-1.49 1.336-1.49.749 0 1.344.67 1.336 1.49-.003.82-.588 1.487-1.336 1.487Z" /></svg>
              Discord
            </button>
            <button type="button" className="cf-share-btn cf-x">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
              X
            </button>
          </div>

          <button type="button" className="cf-copylink" onClick={() => { setCopied(true); window.setTimeout(() => setCopied(false), 1600); }}>
            <span className="cf-copylink-url">kpopquiz.org/q/itzy-stans-challenge</span>
            <span className="cf-copylink-btn">{copied ? 'Copied!' : 'Copy link'}</span>
          </button>

          <button type="button" className="cf-ghost cf-center-btn" onClick={() => { setStep(1); setQIndex(0); }}>Create another quiz</button>
        </div>
      )}
    </div>
  );
}
