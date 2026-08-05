'use client';

// V-BUILDER-2 step 6 - the PHONE LAYER (locked co-design 4, L-023). On a narrow screen
// the builder's drawers become bottom SHEETS and a tapped block raises an ACTION SHEET.
// A shared BottomSheet gives the backdrop (tap outside = the sheet's onClose), a grabber
// that toggles a half/full detent, and 44px targets. NO drag on phone (co-design 4).
import { useEffect, useRef, useState } from 'react';

export function BottomSheet({ label, onClose, initialDetent = 'half', children }: {
  label: string; onClose: () => void; initialDetent?: 'half' | 'full'; children: React.ReactNode;
}): React.ReactElement {
  const [detent, setDetent] = useState<'half' | 'full'>(initialDetent);
  const height = detent === 'full' ? '92vh' : '58vh';
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const restoreRef = useRef<HTMLElement | null>(null);
  // A11Y: focus the sheet on open (announces the dialog + label), trap Tab inside it so
  // focus cannot fall into the canvas iframe behind, Esc closes, focus restored on close.
  useEffect(() => {
    const sheet = sheetRef.current;
    restoreRef.current = document.activeElement as HTMLElement | null;
    sheet?.focus();
    const focusables = () => Array.from(sheet?.querySelectorAll<HTMLElement>('button, [href], input, [tabindex]:not([tabindex="-1"])') ?? []).filter((e) => !e.hasAttribute('disabled'));
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); return; }
      if (e.key !== 'Tab') return;
      const f = focusables(); if (!f.length) return;
      const first = f[0]!, last = f[f.length - 1]!;
      if (e.shiftKey && (document.activeElement === first || document.activeElement === sheet)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    sheet?.addEventListener('keydown', onKey);
    return () => { sheet?.removeEventListener('keydown', onKey); if (restoreRef.current && document.contains(restoreRef.current)) restoreRef.current.focus(); };
  }, [onClose]);
  return (
    <>
      {/* backdrop: tap outside the sheet dismisses (co-design 4: tap outside deselects) */}
      <button type="button" aria-label="Close" onClick={onClose}
        style={{ position: 'fixed', inset: 0, zIndex: 66, border: 'none', background: 'color-mix(in srgb, black 34%, transparent)', cursor: 'default' }} />
      <div ref={sheetRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label={label}
        style={{
          position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 67, height, maxHeight: '92vh',
          display: 'flex', flexDirection: 'column', background: 'var(--bg-surface)', color: 'var(--text-primary)',
          borderTopLeftRadius: 18, borderTopRightRadius: 18, borderTop: '1px solid var(--border)',
          boxShadow: '0 -14px 50px color-mix(in srgb, black 30%, transparent)',
        }}>
        {/* grabber toggles the detent */}
        <button type="button" onClick={() => setDetent((d) => (d === 'half' ? 'full' : 'half'))}
          aria-label={detent === 'half' ? 'Expand sheet' : 'Collapse sheet'} title={detent === 'half' ? 'Expand' : 'Collapse'}
          style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 44, padding: '8px 0', border: 'none', background: 'transparent', cursor: 'pointer' }}>
          <span style={{ width: 40, height: 4, borderRadius: 999, background: 'var(--text-tertiary)' }} />
        </button>
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>{children}</div>
      </div>
    </>
  );
}

export interface SheetAction { key: string; label: string; icon: React.ReactNode; onClick: () => void; disabled?: boolean; danger?: boolean; hint?: string }

export function ActionSheet({ blockName, position, actions, onClose }: {
  blockName: string; position: { n: number; m: number }; actions: SheetAction[]; onClose: () => void;
}): React.ReactElement {
  return (
    <BottomSheet label={`${blockName} actions`} onClose={onClose} initialDetent="half">
      <div style={{ padding: '0 12px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, padding: '2px 4px 12px' }}>
          <strong style={{ fontSize: 16, fontWeight: 800 }}>{blockName}</strong>
          <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>position {position.n} of {position.m}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {actions.map((a) => (
            <button key={a.key} type="button" onClick={a.onClick} disabled={a.disabled}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, minHeight: 52, padding: '0 12px', borderRadius: 10, border: 'none',
                background: 'transparent', textAlign: 'left', cursor: a.disabled ? 'not-allowed' : 'pointer', opacity: a.disabled ? 0.4 : 1,
                color: a.danger ? 'color-mix(in srgb, red 72%, var(--text-primary))' : 'var(--text-primary)',
                fontSize: 15, fontWeight: 600,
              }}>
              <span style={{ display: 'inline-flex', width: 22, justifyContent: 'center', color: a.danger ? 'inherit' : 'var(--vb-accent)' }}>{a.icon}</span>
              <span style={{ flex: 1 }}>{a.label}</span>
              {a.hint ? <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{a.hint}</span> : null}
            </button>
          ))}
        </div>
      </div>
    </BottomSheet>
  );
}
