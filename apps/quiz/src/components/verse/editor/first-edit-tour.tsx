'use client';

import { useEffect, useState } from 'react';

// V-EDITOR-MAX - the FIRST-EDIT TOUR: three inline steps on the very first
// editor open, then never again (localStorage flag). Dismissable at every step,
// fully keyboard accessible (real buttons, Escape closes), and it never blocks
// the editor: it is a strip above the toolbar, not a modal.

const KEY = 'verse-first-edit-tour-done';

const STEPS = [
  { title: 'Write in blocks', body: 'Headings, paragraphs, lists. The H2/H3 buttons split long text into sections readers can skim; the fold does the rest.' },
  { title: 'Facts want sources', body: 'When you state a fact, link where it comes from (the link button, or paste a URL). Fan writing needs no source; claims do.' },
  { title: 'Drafts keep themselves', body: 'Everything autosaves as a draft while you type. Leave and come back; publishing is a separate, deliberate step.' },
] as const;

export function FirstEditTour(): React.ReactElement | null {
  const [step, setStep] = useState<number | null>(null);

  useEffect(() => {
    try { if (!localStorage.getItem(KEY)) setStep(0); } catch { /* private mode: skip the tour */ }
  }, []);

  useEffect(() => {
    if (step === null) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key !== 'Escape') return;
      // An open mention popup owns this Escape (B3 ruling); the tour only
      // takes it when nothing closer is listening.
      if (document.querySelector('.verse-mention-pop')) return;
      done();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  function done(): void {
    try { localStorage.setItem(KEY, '1'); } catch { /* ignore */ }
    setStep(null);
    // The strip unmounts with focus possibly on its buttons; hand focus to the
    // editor so keyboard users are not dropped to <body>.
    requestAnimationFrame(() => {
      (document.querySelector('.ProseMirror') as HTMLElement | null)?.focus();
    });
  }

  if (step === null) return null;
  const s = STEPS[step]!;
  const last = step === STEPS.length - 1;

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b px-3 py-2" role="region" aria-live="polite" aria-label={`Editor tip ${step + 1} of ${STEPS.length}`}
      style={{ borderColor: 'var(--verse-line)', background: 'var(--verse-soft)' }}>
      <span className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-tertiary">Tip {step + 1}/{STEPS.length}</span>
      <span className="text-xs font-bold" style={{ color: 'var(--verse-ink)' }}>{s.title}</span>
      <span className="min-w-0 flex-1 text-xs text-secondary">{s.body}</span>
      <span className="flex items-center gap-1.5">
        {!last ? (
          <button type="button" onClick={() => setStep(step + 1)} className="v-tap rounded-full px-3 py-1 text-[11px] font-bold" style={{ background: 'var(--verse-cta, #7c5cfc)', color: 'var(--verse-cta-text, #fff)' }}>
            Next
          </button>
        ) : (
          <button type="button" onClick={done} className="v-tap rounded-full px-3 py-1 text-[11px] font-bold" style={{ background: 'var(--verse-cta, #7c5cfc)', color: 'var(--verse-cta-text, #fff)' }}>
            Got it
          </button>
        )}
        <button type="button" onClick={done} className="v-tap rounded-full px-2 py-1 text-[11px] font-semibold text-tertiary" aria-label="Dismiss the tour">
          Skip
        </button>
      </span>
    </div>
  );
}
