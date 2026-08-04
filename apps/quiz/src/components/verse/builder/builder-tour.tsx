'use client';

// V-BUILDER-2 step 6 - the FIRST-BUILD TOUR: three dismissible steps on the very first
// builder open, then never again (localStorage flag). Same pattern as the first-edit
// tour: real buttons, Escape closes, never blocks the canvas (a small bottom card).
import { useEffect, useState } from 'react';

const KEY = 'verse-first-build-tour-done';

const STEPS = [
  { title: 'The library', body: 'The + Add block button and the "+ add block" seams open the library. Pick a block or a whole pattern; it lands right where you marked.' },
  { title: 'The canvas is the page', body: 'Select a block to move it, duplicate it, delete it, or restyle it. What you see here is exactly what publishes.' },
  { title: 'Publish when ready', body: 'Everything autosaves as a draft while you work. Publish is a separate, deliberate step that replaces the live page.' },
] as const;

export function BuilderTour(): React.ReactElement | null {
  const [step, setStep] = useState<number | null>(null);

  useEffect(() => {
    try { if (!localStorage.getItem(KEY)) setStep(0); } catch { /* private mode: skip */ }
  }, []);

  useEffect(() => {
    if (step === null) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); done(); } };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  function done(): void {
    try { localStorage.setItem(KEY, '1'); } catch { /* ignore */ }
    setStep(null);
  }

  if (step === null) return null;
  const s = STEPS[step]!;
  const last = step === STEPS.length - 1;

  return (
    <div role="region" aria-live="polite" aria-label={`Builder tip ${step + 1} of ${STEPS.length}`}
      style={{
        position: 'fixed', left: '50%', bottom: 18, transform: 'translateX(-50%)', zIndex: 75, width: 'min(94vw, 460px)',
        display: 'flex', flexDirection: 'column', gap: 8, padding: '13px 15px', borderRadius: 12,
        background: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1px solid var(--vb-accent)',
        boxShadow: '0 14px 44px color-mix(in srgb, black 26%, transparent)',
      }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--vb-accent)' }}>Tip {step + 1}/{STEPS.length}</span>
        <strong style={{ fontSize: 13, fontWeight: 800 }}>{s.title}</strong>
      </div>
      <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.45, color: 'var(--text-secondary)' }}>{s.body}</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
        <div style={{ flex: 1 }} />
        <button type="button" onClick={done} style={{ minHeight: 44, padding: '0 10px', border: 'none', background: 'transparent', color: 'var(--text-tertiary)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Skip</button>
        <button type="button" onClick={() => (last ? done() : setStep(step + 1))} style={{ minHeight: 44, padding: '0 18px', borderRadius: 999, border: 'none', background: 'var(--vb-accent)', color: 'var(--vb-accent-text)', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>
          {last ? 'Got it' : 'Next'}
        </button>
      </div>
    </div>
  );
}
