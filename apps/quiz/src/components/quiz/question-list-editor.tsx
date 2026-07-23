'use client';

import { useState } from 'react';

import { ImageUploader } from '@/components/admin/image-uploader';
import { questionIssues } from '@/lib/quiz-validation';

// Q-B3: the shared question LIST editor. One component, two modes:
//   - CREATE (funnel step 2): seeded empty, quizType 'multiple_choice'.
//   - EDIT (owner/admin): seeded from the quiz, any of the 5 types.
// It replaces the funnel's one-at-a-time dot navigation and the quiz-editor's
// inline question map. All questions are visible; each row can be reordered
// (drag on desktop, up/down buttons everywhere), duplicated, deleted, and
// expanded to an inline editor. Inline validity badges come from the shared
// questionIssues() so what the creator sees matches what the API enforces.
//
// The per-type field shapes (options string[] vs intruder {label,image_url}[],
// correct index vs boolean, clues, image_url) are all handled here so unlocking
// the non-MC types later is a UI toggle, not a rewrite.

export interface IntruderOption {
  label: string;
  image_url: string | null;
}

export interface QuestionData {
  question: string;
  options: string[] | IntruderOption[];
  // number = option index (MC/image/clues/intruder), boolean = true/false,
  // null = not yet chosen (a fresh question in the create funnel).
  correct: number | boolean | null;
  fun_fact?: string;
  image_url?: string | null;
  clues?: string[];
}

export function blankQuestionFor(quizType: string): QuestionData {
  switch (quizType) {
    case 'true_false':
      return { question: '', options: [], correct: null, fun_fact: '' };
    case 'guess_from_clues':
      return { question: '', options: ['', '', '', ''], correct: null, clues: ['', '', ''], fun_fact: '' };
    case 'image':
      return { question: '', options: ['', '', '', ''], correct: null, image_url: null, fun_fact: '' };
    case 'intruder':
      return {
        question: '',
        options: [
          { label: '', image_url: null }, { label: '', image_url: null },
          { label: '', image_url: null }, { label: '', image_url: null },
        ],
        correct: null,
        fun_fact: '',
      };
    case 'multiple_choice':
    default:
      return { question: '', options: ['', '', '', ''], correct: null, fun_fact: '' };
  }
}

interface Props {
  questions: QuestionData[];
  quizType: string;
  onChange: (questions: QuestionData[]) => void;
  /** Auto-expand the row that was just appended (create flow). */
  autoExpandNew?: boolean;
}

export function QuestionListEditor({ questions, quizType, onChange, autoExpandNew = true }: Props): React.ReactElement {
  const [expanded, setExpanded] = useState<number | null>(questions.length === 1 ? 0 : null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const patch = (i: number, updated: QuestionData): void =>
    onChange(questions.map((q, idx) => (idx === i ? updated : q)));

  const move = (from: number, to: number): void => {
    if (to < 0 || to >= questions.length || from === to) return;
    const next = [...questions];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item!);
    onChange(next);
    // Keep the expanded row following its content as it moves.
    setExpanded((cur) => (cur === from ? to : cur));
  };

  const duplicate = (i: number): void => {
    const copy: QuestionData = JSON.parse(JSON.stringify(questions[i]));
    const next = [...questions.slice(0, i + 1), copy, ...questions.slice(i + 1)];
    onChange(next);
    setExpanded(i + 1);
  };

  const remove = (i: number): void => {
    if (questions.length <= 1) return;
    onChange(questions.filter((_, idx) => idx !== i));
    setExpanded((cur) => (cur === i ? null : cur !== null && cur > i ? cur - 1 : cur));
  };

  const add = (): void => {
    const next = [...questions, blankQuestionFor(quizType)];
    onChange(next);
    if (autoExpandNew) setExpanded(next.length - 1);
  };

  return (
    <div className="qle">
      <ul className="qle-list">
        {questions.map((q, i) => {
          const issues = questionIssues(q, quizType);
          const isOpen = expanded === i;
          const preview = q.question.trim() || 'Untitled question';
          return (
            <li
              key={i}
              className={`qle-item${dragIndex === i ? ' dragging' : ''}`}
              onDragOver={(e) => { e.preventDefault(); }}
              onDrop={(e) => { e.preventDefault(); if (dragIndex !== null) move(dragIndex, i); setDragIndex(null); }}
            >
              <div className="qle-head">
                <span
                  className="qle-handle"
                  draggable
                  onDragStart={() => setDragIndex(i)}
                  onDragEnd={() => setDragIndex(null)}
                  aria-hidden="true"
                  title="Drag to reorder"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="6" r="1.6" /><circle cx="15" cy="6" r="1.6" /><circle cx="9" cy="12" r="1.6" /><circle cx="15" cy="12" r="1.6" /><circle cx="9" cy="18" r="1.6" /><circle cx="15" cy="18" r="1.6" /></svg>
                </span>
                <button type="button" className="qle-toggle" onClick={() => setExpanded(isOpen ? null : i)} aria-expanded={isOpen}>
                  <span className="qle-num">{i + 1}</span>
                  <span className="qle-preview">{preview}</span>
                  {issues.length === 0 ? (
                    <span className="qle-badge ok" title="Ready">
                      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3 8.5l3.2 3.2L13 4.8" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </span>
                  ) : (
                    <span className="qle-badge invalid" title={issues.map((x) => x.label).join(', ')}>
                      {issues[0]!.label}{issues.length > 1 ? ` +${issues.length - 1}` : ''}
                    </span>
                  )}
                </button>
                <div className="qle-actions">
                  <button type="button" className="qle-act" onClick={() => move(i, i - 1)} disabled={i === 0} aria-label={`Move question ${i + 1} up`}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6" /></svg>
                  </button>
                  <button type="button" className="qle-act" onClick={() => move(i, i + 1)} disabled={i === questions.length - 1} aria-label={`Move question ${i + 1} down`}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                  </button>
                  <button type="button" className="qle-act" onClick={() => duplicate(i)} aria-label={`Duplicate question ${i + 1}`}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h10" /></svg>
                  </button>
                  <button type="button" className="qle-act danger" onClick={() => remove(i)} disabled={questions.length <= 1} aria-label={`Delete question ${i + 1}`}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /></svg>
                  </button>
                </div>
              </div>

              {isOpen && (
                <div className="qle-panel">
                  <QuestionEditor quizType={quizType} q={q} onPatch={(u) => patch(i, u)} index={i} />
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <button type="button" className="cf-addq qle-add" onClick={add}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
        Add question
      </button>
    </div>
  );
}

// --- per-type inline editor (reuses the funnel's cf-* answer styling for the
//     text types so create and edit look identical) ---
function QuestionEditor({ quizType, q, onPatch, index }: {
  quizType: string; q: QuestionData; onPatch: (u: QuestionData) => void; index: number;
}): React.ReactElement {
  const setOptions = (options: string[]): void => onPatch({ ...q, options });
  const stringOpts = Array.isArray(q.options) ? (q.options as unknown[]).every((o) => typeof o === 'string') : false;

  return (
    <>
      <input
        className="cf-qinput"
        value={q.question}
        onChange={(e) => onPatch({ ...q, question: e.target.value })}
        placeholder="Type your question..."
        aria-label="Question text"
        maxLength={500}
      />

      {quizType === 'image' && (
        <div className="qle-image-slot">
          <ImageUploader value={(q.image_url as string) || null} onChange={(url) => onPatch({ ...q, image_url: url })} label="Question image" />
        </div>
      )}

      {quizType === 'guess_from_clues' && (
        <div className="qle-clues">
          {[0, 1, 2].map((ci) => (
            <input
              key={ci}
              className="cf-answer-input qle-clue"
              value={q.clues?.[ci] ?? ''}
              onChange={(e) => {
                const clues = [...(q.clues ?? ['', '', ''])];
                clues[ci] = e.target.value;
                onPatch({ ...q, clues });
              }}
              placeholder={`Clue ${ci + 1}`}
              aria-label={`Clue ${ci + 1}`}
            />
          ))}
        </div>
      )}

      {quizType === 'true_false' ? (
        <div className="qle-tf">
          <button type="button" className={`qle-tf-btn${q.correct === true ? ' on true' : ''}`} onClick={() => onPatch({ ...q, correct: true })} aria-pressed={q.correct === true}>True</button>
          <button type="button" className={`qle-tf-btn${q.correct === false ? ' on false' : ''}`} onClick={() => onPatch({ ...q, correct: false })} aria-pressed={q.correct === false}>False</button>
        </div>
      ) : quizType === 'intruder' ? (
        <div className="qle-intruder">
          {(q.options as IntruderOption[]).map((opt, j) => (
            <div key={j} className={`qle-intruder-cell${q.correct === j ? ' on' : ''}`}>
              <ImageUploader
                value={opt.image_url || null}
                onChange={(url) => {
                  const opts = [...(q.options as IntruderOption[])];
                  opts[j] = { ...opts[j]!, image_url: url };
                  onPatch({ ...q, options: opts });
                }}
              />
              <input
                className="cf-answer-input"
                value={opt.label}
                onChange={(e) => {
                  const opts = [...(q.options as IntruderOption[])];
                  opts[j] = { ...opts[j]!, label: e.target.value };
                  onPatch({ ...q, options: opts });
                }}
                placeholder={`Label ${j + 1}`}
              />
              <button type="button" className={`qle-intruder-mark${q.correct === j ? ' on' : ''}`} onClick={() => onPatch({ ...q, correct: j })}>
                {q.correct === j ? 'Intruder' : 'Mark as intruder'}
              </button>
            </div>
          ))}
        </div>
      ) : (
        // multiple_choice / image / guess_from_clues share the 4-option radio grid
        <>
          <p className="cf-hint">Tap the circle to mark the correct answer</p>
          <div className="cf-answers">
            {(stringOpts ? (q.options as string[]) : ['', '', '', '']).map((a, ai) => (
              <div key={ai} className={`cf-answer${q.correct === ai ? ' correct' : ''}`}>
                <button type="button" className="cf-radio" aria-label={`Mark answer ${ai + 1} correct`} aria-pressed={q.correct === ai} onClick={() => onPatch({ ...q, correct: ai })}>
                  {q.correct === ai && (<svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3 8.5l3.2 3.2L13 4.8" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>)}
                </button>
                <input
                  className="cf-answer-input"
                  value={a}
                  onChange={(e) => {
                    const opts = [...(q.options as string[])];
                    opts[ai] = e.target.value;
                    setOptions(opts);
                  }}
                  placeholder={`Answer ${ai + 1}`}
                  aria-label={`Answer ${ai + 1}`}
                  maxLength={200}
                />
              </div>
            ))}
          </div>
        </>
      )}

      <div className="cf-funfact">
        <label className="cf-funfact-label" htmlFor={`qle-funfact-${index}`}>
          Fun fact <span className="cf-funfact-optional">(optional, shown after the answer)</span>
        </label>
        <textarea
          id={`qle-funfact-${index}`}
          className="cf-funfact-input"
          value={q.fun_fact ?? ''}
          onChange={(e) => onPatch({ ...q, fun_fact: e.target.value.slice(0, 280) })}
          placeholder="e.g. Jin's Epiphany is the intro track to Love Yourself: Answer."
          maxLength={280}
          rows={2}
        />
        <span className="cf-funfact-counter">{(q.fun_fact ?? '').length}/280</span>
      </div>
    </>
  );
}
