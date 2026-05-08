'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BATTLE_PALETTE as C, BATTLE_GROUPS } from '@/lib/battle/battle-constants';
import type { BattleDifficulty } from '@/lib/db/types';

const PROMPTS = [
  'What song is this?',
  'Which idol is this?',
  'What album is this?',
  'What era is this?',
  'What MV is this from?',
  'What group is this?',
  'What year is this from?',
];

const DIFFICULTIES: { label: BattleDifficulty; color: string }[] = [
  { label: 'Easy', color: C.green },
  { label: 'Medium', color: C.amber },
  { label: 'Hard', color: C.red },
  { label: 'Insane', color: C.purple },
];

export default function NewQuestionPage(): React.ReactElement {
  const router = useRouter();
  const [prompt, setPrompt] = useState(PROMPTS[0] ?? '');
  const [customPrompt, setCustomPrompt] = useState(false);
  const [textContent, setTextContent] = useState('');
  const [answer, setAnswer] = useState('');
  const [variants, setVariants] = useState<string[]>([]);
  const [variantInput, setVariantInput] = useState('');
  const [group, setGroup] = useState('');
  const [difficulty, setDifficulty] = useState<BattleDifficulty | ''>('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const hasContent = textContent.length > 5;
  const isValid = prompt && hasContent && answer.length > 0 && group && difficulty;

  const handleSubmit = async (asDraft: boolean) => {
    setSubmitting(true);
    const res = await fetch('/api/battle/questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        text_content: textContent || null,
        image_url: null,
        answer,
        variants,
        group_name: group,
        difficulty,
        status: asDraft ? 'draft' : 'pending',
      }),
    });

    if (res.ok) {
      if (asDraft) {
        router.push('/battle/questions');
      } else {
        setSubmitted(true);
      }
    }
    setSubmitting(false);
  };

  const addVariant = () => {
    const v = variantInput.trim();
    if (v && !variants.includes(v)) {
      setVariants(prev => [...prev, v]);
      setVariantInput('');
    }
  };

  // Submitted confirmation
  if (submitted) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ maxWidth: 460, textAlign: 'center', padding: '0 24px' }}>
          <div style={{
            width: 92, height: 92, borderRadius: '50%', margin: '0 auto 20px',
            background: `linear-gradient(145deg, ${C.green}, #1e8449)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 12px 40px rgba(39,174,96,0.3)`,
            animation: 'popIn 0.5s cubic-bezier(0.34,1.56,0.64,1)',
          }}>
            <span style={{ fontSize: 40, color: '#fff' }}>{'\u2713'}</span>
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: C.textDark, margin: '0 0 6px' }}>
            Submitted for review!
          </h1>
          <p style={{ fontSize: 13, color: C.textMuted, lineHeight: 1.6 }}>
            Your question is now in the admin review queue. You&apos;ll be notified when it&apos;s approved.
          </p>

          {/* Timeline */}
          <div style={{
            margin: '20px 0', padding: '14px 16px', borderRadius: 12,
            background: '#fff', border: `1px solid ${C.cardBorder}`, textAlign: 'left',
          }}>
            <p style={{ fontSize: 9, fontWeight: 700, color: C.textLight, textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 10px' }}>
              What happens next
            </p>
            {[
              { state: 'done', icon: '\u2713', label: 'Submitted', desc: 'Just now' },
              { state: 'current', icon: '\u{1F440}', label: 'Admin reviews', desc: 'Usually within 48 hours' },
              { state: 'future', icon: '\u{1F389}', label: 'Approved? Goes live!', desc: 'Question appears in battle rooms' },
            ].map((step, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: i < 2 ? 9 : 0 }}>
                <div style={{
                  width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, fontWeight: 800,
                  background: step.state === 'done' ? 'rgba(39,174,96,0.15)' : step.state === 'current' ? 'rgba(232,160,96,0.15)' : 'rgba(180,178,169,0.1)',
                  color: step.state === 'done' ? C.green : step.state === 'current' ? C.amber : C.textLight,
                  border: step.state === 'current' ? `1.5px dashed ${C.amber}` : 'none',
                }}>
                  {step.icon}
                </div>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 600, color: step.state === 'future' ? C.textMuted : C.textDark, margin: 0 }}>{step.label}</p>
                  <p style={{ fontSize: 9, color: C.textLight, margin: '1px 0 0' }}>{step.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => { setSubmitted(false); setAnswer(''); setTextContent(''); }} style={{
              flex: 1, padding: '11px 0', borderRadius: 10,
              background: '#fff', border: `1px solid ${C.cardBorder}`,
              color: C.textMuted, fontSize: 12, fontWeight: 600, cursor: 'pointer',
            }}>
              + Create another
            </button>
            <Link href="/battle/questions" style={{
              flex: 1, padding: '11px 0', borderRadius: 10,
              background: C.pink, color: '#fff', border: 'none',
              fontSize: 12, fontWeight: 700, textDecoration: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              View my questions {'\u2192'}
            </Link>
          </div>

          <style>{`
            @keyframes popIn {
              0% { transform: scale(0.5); opacity: 0; }
              70% { transform: scale(1.1); }
              100% { transform: scale(1); opacity: 1; }
            }
          `}</style>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg }}>
      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '32px 24px' }}>

        {/* Breadcrumb */}
        <p style={{ fontSize: 11, color: C.textMuted, margin: '0 0 4px' }}>
          <Link href="/battle" style={{ color: C.textMuted, textDecoration: 'none' }}>Battle</Link>
          {' / '}
          <Link href="/battle/questions" style={{ color: C.textMuted, textDecoration: 'none' }}>My questions</Link>
          {' / New question'}
        </p>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: C.textDark, margin: '0 0 4px' }}>
          New question
        </h1>
        <p style={{ fontSize: 12, color: C.textMuted, margin: '0 0 24px' }}>
          Add text, an image, or both. The system handles format detection and fuzzy matching.
        </p>

        <div className="battle-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 24, alignItems: 'flex-start' }}>

          {/* Left: Form */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Section 1: The Question */}
            <div style={{ padding: '16px 18px', borderRadius: 14, background: '#fff', border: `1px solid ${C.cardBorder}` }}>
              <h2 style={{ fontSize: 13, fontWeight: 700, color: C.textDark, margin: '0 0 12px' }}>
                {'\u2753'} The Question
              </h2>

              {/* Prompt selection */}
              <label style={{ fontSize: 11, fontWeight: 600, color: C.textDark, display: 'block', marginBottom: 6 }}>
                What are you asking players?
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 12 }}>
                {PROMPTS.map(p => (
                  <button key={p} onClick={() => { setPrompt(p); setCustomPrompt(false); }} style={{
                    padding: '5px 11px', borderRadius: 999, fontSize: 11,
                    fontWeight: prompt === p && !customPrompt ? 600 : 500,
                    border: `1px solid ${prompt === p && !customPrompt ? C.pink : C.cardBorder}`,
                    background: prompt === p && !customPrompt ? C.pink : '#fff',
                    color: prompt === p && !customPrompt ? '#fff' : C.textMuted,
                    cursor: 'pointer',
                  }}>
                    {p}
                  </button>
                ))}
                <button onClick={() => setCustomPrompt(true)} style={{
                  padding: '5px 11px', borderRadius: 999, fontSize: 11,
                  fontWeight: customPrompt ? 600 : 500,
                  border: `1px ${customPrompt ? 'solid' : 'dashed'} ${customPrompt ? C.pinkBorder : C.cardBorder}`,
                  background: customPrompt ? C.pinkLight : '#fff',
                  color: customPrompt ? C.pink : C.textMuted,
                  cursor: 'pointer',
                }}>
                  + Custom
                </button>
              </div>

              {customPrompt && (
                <input
                  type="text" value={prompt} onChange={e => setPrompt(e.target.value)}
                  placeholder="e.g. 'Who's the leader of this group?'"
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: 10,
                    background: C.bg, border: `1.5px solid ${C.pinkBorder}`,
                    fontSize: 12, color: C.textDark, outline: 'none', boxSizing: 'border-box',
                    marginBottom: 12,
                  }}
                />
              )}

              {/* Text content */}
              <label style={{ fontSize: 9, fontWeight: 700, color: C.textLight, textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 4 }}>
                {'\u{1F4AC}'} Text content
              </label>
              <textarea
                rows={3} value={textContent} onChange={e => setTextContent(e.target.value)}
                placeholder="Lyric, quote, hint..."
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: 10,
                  background: C.bg, border: `1.5px solid ${C.cardBorder}`,
                  fontSize: 13, fontFamily: 'inherit', color: C.textDark,
                  outline: 'none', resize: 'vertical', boxSizing: 'border-box', lineHeight: 1.5,
                }}
              />
            </div>

            {/* Section 2: The Answer */}
            <div style={{ padding: '16px 18px', borderRadius: 14, background: '#fff', border: `1px solid ${C.cardBorder}` }}>
              <h2 style={{ fontSize: 13, fontWeight: 700, color: C.textDark, margin: '0 0 12px' }}>
                {'\u2705'} The Answer
              </h2>

              <label style={{ fontSize: 11, fontWeight: 600, color: C.textDark, display: 'block', marginBottom: 4 }}>
                Correct answer
              </label>
              <input
                type="text" value={answer} onChange={e => setAnswer(e.target.value)}
                placeholder="The exact answer players need to type"
                style={{
                  width: '100%', padding: '12px 14px', borderRadius: 10,
                  background: C.bg, border: `1.5px solid ${C.cardBorder}`,
                  fontSize: 14, fontWeight: 600, color: C.textDark,
                  outline: 'none', boxSizing: 'border-box', marginBottom: 12,
                }}
              />

              <label style={{ fontSize: 11, fontWeight: 600, color: C.textDark, display: 'block', marginBottom: 4 }}>
                Accepted variants (optional)
              </label>
              <p style={{ fontSize: 9, color: C.textMuted, margin: '0 0 6px' }}>
                Fuzzy matching auto-handles capitalization, spaces, hyphens.
              </p>

              {variants.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
                  {variants.map(v => (
                    <span key={v} style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      padding: '4px 8px 4px 10px', borderRadius: 999,
                      background: C.pinkLight, border: `1px solid ${C.pinkBorder}`,
                      fontSize: 11, color: C.pink, fontFamily: 'monospace',
                    }}>
                      {v}
                      <button onClick={() => setVariants(prev => prev.filter(x => x !== v))} style={{
                        border: 'none', background: 'transparent', color: C.pink,
                        fontSize: 12, cursor: 'pointer', padding: 0, lineHeight: 1,
                      }}>
                        {'\u00D7'}
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  type="text" value={variantInput} onChange={e => setVariantInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addVariant(); } }}
                  placeholder="e.g. pinkvenom"
                  style={{
                    flex: 1, padding: '8px 12px', borderRadius: 8,
                    background: C.bg, border: `1px solid ${C.cardBorder}`,
                    fontSize: 11, color: C.textDark, outline: 'none',
                  }}
                />
                <button onClick={addVariant} style={{
                  padding: '8px 14px', borderRadius: 8,
                  background: '#fff', border: `1px solid ${C.cardBorder}`,
                  color: C.textMuted, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                }}>
                  + Add
                </button>
              </div>
            </div>

            {/* Section 3: Categorization */}
            <div style={{ padding: '16px 18px', borderRadius: 14, background: '#fff', border: `1px solid ${C.cardBorder}` }}>
              <h2 style={{ fontSize: 13, fontWeight: 700, color: C.textDark, margin: '0 0 12px' }}>
                {'\u{1F3B5}'} Categorization
              </h2>

              <label style={{ fontSize: 11, fontWeight: 600, color: C.textDark, display: 'block', marginBottom: 6 }}>
                Group
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 14 }}>
                {BATTLE_GROUPS.map(g => (
                  <button key={g} onClick={() => setGroup(g)} style={{
                    padding: '5px 11px', borderRadius: 6, fontSize: 10,
                    fontWeight: group === g ? 600 : 500,
                    border: `1px solid ${group === g ? C.pink : C.cardBorder}`,
                    background: group === g ? C.pink : '#fff',
                    color: group === g ? '#fff' : C.textMuted,
                    cursor: 'pointer',
                  }}>
                    {g}
                  </button>
                ))}
              </div>

              <label style={{ fontSize: 11, fontWeight: 600, color: C.textDark, display: 'block', marginBottom: 6 }}>
                Difficulty
              </label>
              <div style={{ display: 'flex', gap: 4 }}>
                {DIFFICULTIES.map(d => (
                  <button key={d.label} onClick={() => setDifficulty(d.label)} style={{
                    flex: 1, padding: '8px 0', borderRadius: 8, fontSize: 11,
                    fontWeight: difficulty === d.label ? 600 : 500,
                    border: `1px solid ${difficulty === d.label ? d.color : C.cardBorder}`,
                    background: difficulty === d.label ? d.color : '#fff',
                    color: difficulty === d.label ? '#fff' : C.textMuted,
                    cursor: 'pointer',
                  }}>
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Submit area */}
            <div style={{
              padding: '12px 16px', borderRadius: 12,
              background: C.pinkLight, border: `1px solid ${C.pinkBorder}`,
            }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => handleSubmit(true)}
                  disabled={submitting}
                  style={{
                    flex: 1, padding: '11px 0', borderRadius: 10,
                    background: '#fff', border: `1px solid ${C.cardBorder}`,
                    color: C.textMuted, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  Save as draft
                </button>
                <button
                  onClick={() => handleSubmit(false)}
                  disabled={!isValid || submitting}
                  style={{
                    flex: 2, padding: '11px 0', borderRadius: 10, border: 'none',
                    background: isValid && !submitting ? C.pink : C.borderLight,
                    color: isValid && !submitting ? '#fff' : C.textLight,
                    fontSize: 12, fontWeight: 700,
                    cursor: isValid && !submitting ? 'pointer' : 'default',
                    boxShadow: isValid ? '0 4px 14px rgba(212,83,126,0.3)' : 'none',
                  }}
                >
                  {submitting ? 'Submitting...' : 'Submit for review \u2192'}
                </button>
              </div>
            </div>
          </div>

          {/* Right: Live preview + validation */}
          <div style={{ position: 'sticky', top: 20 }}>
            <p style={{ fontSize: 9, fontWeight: 700, color: C.textLight, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
              Live preview - what players will see
            </p>
            <div style={{
              padding: '20px 18px', borderRadius: 16,
              background: 'linear-gradient(160deg, #1a0a1e 0%, #2a1035 60%, #3a1848 100%)',
              boxShadow: '0 12px 32px rgba(0,0,0,0.15)',
            }}>
              {difficulty && group && (
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
                  <span style={{
                    fontSize: 8, fontWeight: 700, padding: '3px 9px', borderRadius: 6,
                    background: 'rgba(212,83,126,0.2)', color: '#fff',
                    textTransform: 'uppercase', letterSpacing: 1,
                  }}>
                    {difficulty} &middot; {group}
                  </span>
                </div>
              )}

              {textContent ? (
                <div style={{
                  padding: '14px', borderRadius: 12,
                  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                  textAlign: 'center', marginBottom: 10,
                }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#fff', lineHeight: 1.5, fontStyle: 'italic', margin: 0, whiteSpace: 'pre-line' }}>
                    &ldquo;{textContent}&rdquo;
                  </p>
                </div>
              ) : (
                <div style={{ padding: '30px 14px', textAlign: 'center' }}>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontStyle: 'italic', margin: 0 }}>
                    Add text to see your preview
                  </p>
                </div>
              )}

              {prompt && (
                <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', textAlign: 'center', margin: '10px 0 8px', fontWeight: 600 }}>
                  {prompt}
                </p>
              )}

              {/* Mock timer */}
              <div style={{
                marginTop: 10, padding: '8px 12px', borderRadius: 8,
                background: 'rgba(255,255,255,0.05)',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <span style={{ fontSize: 9, opacity: 0.5 }}>{'\u23F1'}</span>
                <div style={{ flex: 1, height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.1)' }}>
                  <div style={{ width: '70%', height: '100%', borderRadius: 2, background: C.green }} />
                </div>
                <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.7)', fontFamily: 'monospace' }}>10.5s</span>
              </div>
            </div>

            {/* Validation checklist */}
            <div style={{
              marginTop: 12, padding: '12px 14px', borderRadius: 12,
              background: '#fff', border: `1px solid ${C.cardBorder}`,
            }}>
              <p style={{ fontSize: 9, fontWeight: 700, color: C.textLight, textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 8px' }}>
                Ready to submit?
              </p>
              {[
                { ok: !!prompt, label: 'Question prompt picked' },
                { ok: hasContent, label: 'Has text content' },
                { ok: answer.length > 0, label: 'Has a correct answer' },
                { ok: !!group, label: 'Group selected' },
                { ok: !!difficulty, label: 'Difficulty set' },
              ].map((check, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <div style={{
                    width: 14, height: 14, borderRadius: '50%', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 8, fontWeight: 800,
                    background: check.ok ? 'rgba(39,174,96,0.15)' : 'rgba(180,178,169,0.1)',
                    color: check.ok ? C.green : C.textLight,
                  }}>
                    {check.ok ? '\u2713' : '\u25CB'}
                  </div>
                  <span style={{ fontSize: 10, color: check.ok ? C.textDark : C.textMuted }}>
                    {check.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
