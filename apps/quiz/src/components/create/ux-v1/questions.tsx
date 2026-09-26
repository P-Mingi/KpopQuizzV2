'use client';

import { useEffect, useRef, useState } from 'react';

import { Icon } from '@/components/ux-v1/icon';
import { Sheet } from '@/components/ux-v1/sheet';
import { useUxToast } from '@/components/ux-v1/toast';
import { ACCEPTED_IMAGE_TYPES, compressImageToDataUrl, validateImageFile } from '@/lib/create-draft';
import { MIN_QUESTIONS, questionHasContent } from '@/lib/ux-v1/p5/funnel';
import { addItem, duplicateItem, initialExpanded, moveItem, patchAt, removeItem } from '@/lib/ux-v1/p5/questions';
import { PASTE_TYPES, parsePasted, pasteHelp, rowStatus } from '@/lib/ux-v1/p5/view';

import type { IntruderOption, QuestionData } from '@/lib/quiz-question';
import type { CreateFunnel } from '@/lib/ux-v1/p5/use-create-funnel';

// Step 2 (prototype #cp-2): the question list, one row open at a time, the inline
// editor per quiz type, "Add a question" and "Paste several at once". The list
// model and its operations are the EXISTS question-list-editor.tsx's
// (lib/ux-v1/p5/questions.ts, parity-tested); the row words come from the shared
// questionIssues(); images are held as data URLs until publish exactly like the
// EXISTS DeferredImageInput (same type / 5 MB checks, same compression).

export function P5Questions({ f }: { f: CreateFunnel }): React.ReactElement {
  const { questions, quiz_type: quizType } = f.data;
  const [expanded, setExpanded] = useState<number | null>(() => initialExpanded(questions));
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [pasteOpen, setPasteOpen] = useState(false);
  // Where focus goes after the next render (a new or moved row); read by the effect below.
  const focusRow = useRef<{ i: number; field: 'question' | 'toggle' } | null>(null);
  const setFocusRow = (t: { i: number; field: 'question' | 'toggle' }): void => { focusRow.current = t; };
  const addRef = useRef<HTMLButtonElement>(null);
  const toast = useUxToast();

  useEffect(() => {
    const t = focusRow.current;
    if (!t) return;
    focusRow.current = null;
    document.getElementById(t.field === 'question' ? `p5-q-${t.i}` : `p5-qt-${t.i}`)?.focus();
  });

  const apply = (e: { questions: QuestionData[]; expanded: number | null } | null): void => {
    if (!e) return;
    f.setQuestions(e.questions);
    setExpanded(e.expanded);
  };

  const onPaste = (text: string): number => {
    const r = parsePasted(text, quizType);
    if (r.questions.length === 0) return 0;
    // One untouched blank question is replaced by the pasted ones.
    const base = questions.length === 1 && !questionHasContent(questions[0]!) ? [] : questions;
    f.setQuestions([...base, ...r.questions]);
    setExpanded(null);
    toast(`${r.questions.length} question${r.questions.length === 1 ? '' : 's'} added${r.skipped ? `, ${r.skipped} skipped` : ''}`);
    return r.questions.length;
  };

  return (
    <div className="p5-pane" data-step="2">
      <div className="ux-field p5-qfield">
        <div className="ux-flabel" id="p5-ql-l">Questions <small>{questions.length} added · {MIN_QUESTIONS} needed to publish</small></div>
        <ol className="p5-qlist" aria-labelledby="p5-ql-l">
          {questions.map((q, i) => (
            <P5QuestionRow
              key={i}
              q={q}
              i={i}
              total={questions.length}
              quizType={quizType}
              open={expanded === i}
              dragging={dragIndex === i}
              onToggle={() => setExpanded(expanded === i ? null : i)}
              onPatch={(u) => f.setQuestions(patchAt(questions, i, u))}
              onDuplicate={() => { apply(duplicateItem(questions, i)); setFocusRow({ i: i + 1, field: 'question' }); }}
              onRemove={() => {
                const e = removeItem(questions, expanded, i);
                apply(e);
                if (e) window.requestAnimationFrame(() => (document.getElementById(`p5-qt-${Math.min(i, e.questions.length - 1)}`) ?? addRef.current)?.focus());
              }}
              onMove={(to) => { const e = moveItem(questions, expanded, i, to); apply(e); if (e) setFocusRow({ i: to, field: 'toggle' }); }}
              onDragStart={() => setDragIndex(i)}
              onDragEnd={() => setDragIndex(null)}
              onDrop={() => { if (dragIndex !== null) apply(moveItem(questions, expanded, dragIndex, i)); setDragIndex(null); }}
            />
          ))}
        </ol>
        <div className="p5-qadd">
          <button
            ref={addRef}
            type="button"
            className="ux-btn ux-btn-ghost"
            onClick={() => { const e = addItem(questions, quizType, expanded); apply(e); setFocusRow({ i: e.questions.length - 1, field: 'question' }); }}
          >
            <Icon name="plus" />Add a question
          </button>
          {PASTE_TYPES.includes(quizType) ? (
            <button type="button" className="ux-btn ux-btn-quiet" onClick={() => setPasteOpen(true)}>
              <Icon name="copy" />Paste several at once
            </button>
          ) : null}
        </div>
      </div>
      <PasteSheet open={pasteOpen} onClose={() => setPasteOpen(false)} quizType={quizType} onAdd={onPaste} />
    </div>
  );
}

interface RowProps {
  q: QuestionData;
  i: number;
  total: number;
  quizType: string;
  open: boolean;
  dragging: boolean;
  onToggle: () => void;
  onPatch: (u: QuestionData) => void;
  onDuplicate: () => void;
  onRemove: () => void;
  onMove: (to: number) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDrop: () => void;
}

function P5QuestionRow({ q, i, total, quizType, open, dragging, onToggle, onPatch, onDuplicate, onRemove, onMove, onDragStart, onDragEnd, onDrop }: RowProps): React.ReactElement {
  const st = rowStatus(q, quizType);
  const text = q.question.trim() || 'Untitled question';
  const n = i + 1;
  return (
    <li
      className={['p5-qitem', open ? 'is-open' : '', dragging ? 'is-drag' : ''].filter(Boolean).join(' ')}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => { e.preventDefault(); onDrop(); }}
    >
      <div className="p5-qhead">
        <span className="p5-drag" draggable onDragStart={onDragStart} onDragEnd={onDragEnd} aria-hidden="true" title="Drag to reorder">
          <Icon name="drag" />
        </span>
        <button type="button" id={`p5-qt-${i}`} className="p5-qtoggle" aria-expanded={open} aria-controls={`p5-qb-${i}`} onClick={onToggle}>
          <span className="p5-qn ux-num">{n}</span>
          <span className={`p5-qq${st.ok ? '' : ' is-w'}`}>{text}</span>
          <span className={`p5-qst${st.ok ? ' is-ok' : ' is-w'}`}>
            <Icon name={st.ok ? 'check' : 'alert'} size="sm" />{st.label}
          </span>
        </button>
        <span className="p5-acts">
          <button type="button" className="ux-ib" onClick={onDuplicate} aria-label={`Duplicate question ${n}`}><Icon name="copy" size="sm" /></button>
          <button type="button" className="ux-ib" onClick={onRemove} disabled={total <= 1} aria-label={`Delete question ${n}`}><Icon name="trash" size="sm" /></button>
        </span>
      </div>
      {open ? (
        <div className="p5-qbody" id={`p5-qb-${i}`}>
          <QuestionEditor q={q} i={i} quizType={quizType} onPatch={onPatch} />
          <div className="p5-qfoot">
            {quizType === 'image' ? <ImagePick value={(q.image_url as string) || null} onChange={(url) => onPatch({ ...q, image_url: url })} label="Add an image" /> : <span />}
            <span className="p5-qmove">
              <button type="button" className="ux-btn ux-btn-quiet ux-btn-sm" onClick={() => onMove(i - 1)} disabled={i === 0} aria-label={`Move question ${n} up`}>
                <Icon name="chev" className="p5-up" />Up
              </button>
              <button type="button" className="ux-btn ux-btn-quiet ux-btn-sm" onClick={() => onMove(i + 1)} disabled={i === total - 1} aria-label={`Move question ${n} down`}>
                <Icon name="chev" />Down
              </button>
            </span>
          </div>
        </div>
      ) : null}
    </li>
  );
}

function QuestionEditor({ q, i, quizType, onPatch }: { q: QuestionData; i: number; quizType: string; onPatch: (u: QuestionData) => void }): React.ReactElement {
  const stringOpts = Array.isArray(q.options) ? (q.options as unknown[]).every((o) => typeof o === 'string') : false;
  return (
    <>
      <div className="ux-field p5-qf">
        <label htmlFor={`p5-q-${i}`}>Question</label>
        {/* A one-line field that wraps long questions (the prototype's box); like the
            EXISTS <input>, it holds no line breaks. */}
        <textarea
          id={`p5-q-${i}`}
          className="ux-inp p5-qtext"
          rows={1}
          value={q.question}
          onChange={(e) => onPatch({ ...q, question: e.target.value.replace(/\r?\n/g, ' ') })}
          onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
          placeholder="Type your question..."
          maxLength={500}
          autoComplete="off"
        />
      </div>

      {quizType === 'guess_from_clues' ? (
        <div className="ux-field p5-qf">
          <div className="ux-flabel">Clues <small>Revealed one by one</small></div>
          {[0, 1, 2].map((ci) => (
            <input
              key={ci}
              className="ux-inp p5-clue"
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
      ) : null}

      {quizType === 'true_false' ? (
        <div className="ux-field p5-qf">
          <div className="ux-flabel" id={`p5-tf-${i}`}>Answer <small>Tap the circle to mark the correct one</small></div>
          <div role="group" aria-labelledby={`p5-tf-${i}`}>
            {([true, false] as const).map((v) => (
              <div key={String(v)} className={`p5-arow${q.correct === v ? ' is-on' : ''}`}>
                <button type="button" className="p5-ard" aria-pressed={q.correct === v} aria-label={`${v ? 'True' : 'False'} is correct`} onClick={() => onPatch({ ...q, correct: v })}>
                  <Icon name="check" />
                </button>
                <span className="ux-inp p5-tf">{v ? 'True' : 'False'}</span>
              </div>
            ))}
          </div>
        </div>
      ) : quizType === 'intruder' ? (
        <div className="ux-field p5-qf">
          <div className="ux-flabel">Pictures <small>Tap the circle to mark the intruder</small></div>
          <div className="p5-intr">
            {(q.options as IntruderOption[]).map((opt, j) => (
              <div key={j} className={`p5-intr-c${q.correct === j ? ' is-on' : ''}`}>
                <ImagePick
                  value={opt.image_url || null}
                  onChange={(url) => {
                    const opts = [...(q.options as IntruderOption[])];
                    opts[j] = { ...opts[j]!, image_url: url };
                    onPatch({ ...q, options: opts });
                  }}
                  label={`Picture ${j + 1}`}
                  tile
                />
                <div className="p5-arow">
                  <button type="button" className="p5-ard" aria-pressed={q.correct === j} aria-label={`Picture ${j + 1} is the intruder`} onClick={() => onPatch({ ...q, correct: j })}>
                    <Icon name="check" />
                  </button>
                  <input
                    className="ux-inp"
                    value={opt.label}
                    onChange={(e) => {
                      const opts = [...(q.options as IntruderOption[])];
                      opts[j] = { ...opts[j]!, label: e.target.value };
                      onPatch({ ...q, options: opts });
                    }}
                    placeholder={`Label ${j + 1}`}
                    aria-label={`Label ${j + 1}`}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="ux-field p5-qf">
          <div className="ux-flabel" id={`p5-al-${i}`}>Answers <small>Tap the circle to mark the correct one</small></div>
          <div role="group" aria-labelledby={`p5-al-${i}`}>
            {(stringOpts ? (q.options as string[]) : ['', '', '', '']).map((a, ai) => (
              <div key={ai} className={`p5-arow${q.correct === ai ? ' is-on' : ''}`}>
                <button type="button" className="p5-ard" aria-label={`Mark answer ${ai + 1} as correct`} aria-pressed={q.correct === ai} onClick={() => onPatch({ ...q, correct: ai })}>
                  <Icon name="check" />
                </button>
                <input
                  className="ux-inp"
                  value={a}
                  onChange={(e) => {
                    const opts = [...(q.options as string[])];
                    opts[ai] = e.target.value;
                    onPatch({ ...q, options: opts });
                  }}
                  placeholder={`Answer ${ai + 1}`}
                  aria-label={`Answer ${ai + 1}`}
                  maxLength={200}
                  autoComplete="off"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="ux-field p5-qf">
        <label htmlFor={`p5-ff-${i}`}>Fun fact <small>Optional, shown after the answer</small></label>
        <textarea
          id={`p5-ff-${i}`}
          className="ux-inp p5-fact"
          value={q.fun_fact ?? ''}
          onChange={(e) => onPatch({ ...q, fun_fact: e.target.value.slice(0, 280) })}
          placeholder="e.g. Jin's Epiphany is the intro track to Love Yourself: Answer."
          maxLength={280}
          rows={1}
        />
      </div>
    </>
  );
}

/** The EXISTS DeferredImageInput, re-skinned: client type + 5 MB check, compressed
 *  to a data URL held in the draft, uploaded through /api/quiz/upload-image at publish. */
function ImagePick({ value, onChange, label, tile }: { value: string | null; onChange: (url: string | null) => void; label: string; tile?: boolean }): React.ReactElement {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const onFile = async (file: File | undefined): Promise<void> => {
    if (!file) return;
    const verr = validateImageFile(file);
    if (verr) { setErr(verr); return; }
    setErr(null);
    setBusy(true);
    try {
      onChange(await compressImageToDataUrl(file));
    } catch {
      setErr('That image could not be processed. Try a different one.');
    } finally {
      setBusy(false);
    }
  };
  const input = <input type="file" className="ux-sr" accept={ACCEPTED_IMAGE_TYPES.join(',')} onChange={(e) => { void onFile(e.target.files?.[0]); e.target.value = ''; }} />;
  return (
    <div className={tile ? 'p5-img is-tile' : 'p5-img'}>
      {value ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={value} alt={label} className="p5-img-th" />
      ) : tile ? <span className="p5-img-th is-empty" aria-hidden="true"><Icon name="img" /></span> : null}
      <span className="p5-img-a">
        <label className="ux-lnk p5-img-l">
          {input}
          <Icon name="img" />{busy ? 'Preparing...' : value ? (tile ? 'Change' : 'Change the image') : label}
        </label>
        {value ? <button type="button" className="ux-lnk p5-img-l" onClick={() => onChange(null)}>Remove</button> : null}
      </span>
      {err ? <p className="ux-err" role="alert">{err}</p> : null}
    </div>
  );
}

function PasteSheet({ open, onClose, quizType, onAdd }: { open: boolean; onClose: () => void; quizType: string; onAdd: (text: string) => number }): React.ReactElement | null {
  const [text, setText] = useState('');
  const found = text.trim() ? parsePasted(text, quizType) : null;
  const n = found?.questions.length ?? 0;
  const close = (): void => { setText(''); onClose(); };
  return (
    <Sheet open={open} onClose={close} title="Paste several questions" width={520}>
      <label className="ux-sr" htmlFor="p5-paste">Your questions</label>
      <textarea id="p5-paste" className="ux-inp p5-paste" value={text} onChange={(e) => setText(e.target.value)} aria-describedby="p5-paste-h" rows={8} />
      <p className="ux-help" id="p5-paste-h">{pasteHelp(quizType)}</p>
      <p className="ux-help" role="status">{found ? `${n} question${n === 1 ? '' : 's'} found${found.skipped ? `, ${found.skipped} block${found.skipped === 1 ? '' : 's'} skipped` : ''}` : ''}</p>
      <div className="ux-sh-foot">
        <button type="button" className="ux-btn ux-btn-ghost" onClick={close}>Cancel</button>
        <button type="button" className="ux-btn ux-btn-primary" disabled={n === 0} onClick={() => { if (onAdd(text) > 0) close(); }}>
          {n > 0 ? `Add ${n} question${n === 1 ? '' : 's'}` : 'Add questions'}
        </button>
      </div>
    </Sheet>
  );
}
