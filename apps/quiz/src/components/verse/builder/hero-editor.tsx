'use client';

// V-BUILDER-3 step 5 (co-design 8 / L-062). The HERO / IDENTITY editor: the space
// masthead's banner, profile picture, display name, tagline and vitals chips. Unlike a
// block editor these are PAGE-LEVEL overrides stored in the presentation META
// (presentation.hero), saved through the same draft rail (engine.setMeta). Each field
// OVERRIDES a data-driven default with a per-field revert (Data -> Edited badge); an
// empty override falls back to the entity value (member count, fandom name, logo,
// derived vitals) - the real-data law. Images ingest-copy through the step-3 rail
// (L-047) and render through the fail-closed asset gate on the canvas.
import { useCallback, useEffect, useRef, useState } from 'react';

import { ImageField, BoundBadge } from './content-tab';

import type { HeroIdentity } from '@/lib/verse/presentation/types';

// The floating RIGHT drawer (desktop) / bottom sheet (phone) that hosts the hero editor,
// mirroring the block StylePanel chrome so the builder reads as one system. Focus trap +
// Esc close, matching the style panel.
export function HeroPanel({ groupId, hero, placeholders, onChange, onClose, sheet }: {
  groupId: number; hero: HeroIdentity; placeholders: HeroPlaceholders;
  onChange: (hero: HeroIdentity | undefined) => void; onClose: () => void; sheet?: boolean | undefined;
}): React.ReactElement {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const restoreRef = useRef<HTMLElement | null>(null);
  const close = useCallback(() => onClose(), [onClose]);
  useEffect(() => {
    const panel = panelRef.current;
    restoreRef.current = document.activeElement as HTMLElement | null;
    const focusables = () => Array.from(panel?.querySelectorAll<HTMLElement>('button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])') ?? []).filter((e) => !e.hasAttribute('disabled'));
    focusables()[0]?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); close(); return; }
      if (e.key !== 'Tab') return;
      const f = focusables(); if (!f.length) return;
      const first = f[0]!, last = f[f.length - 1]!;
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    panel?.addEventListener('keydown', onKey);
    return () => { panel?.removeEventListener('keydown', onKey); if (restoreRef.current && document.contains(restoreRef.current)) restoreRef.current.focus(); };
  }, [close]);

  return (
    <div role="dialog" aria-modal="true" aria-label="Edit header & identity" ref={panelRef}
      className={sheet ? 'vb-style-sheet' : undefined}
      style={{
        position: 'absolute', zIndex: 65, display: 'flex', flexDirection: 'column', pointerEvents: 'auto',
        background: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1px solid var(--border)',
        boxShadow: '0 18px 60px color-mix(in srgb, black 28%, transparent)',
        ...(sheet
          ? { left: 0, right: 0, bottom: 0, top: 'auto', maxHeight: '76vh', borderRadius: '16px 16px 0 0' }
          : { top: 12, right: 12, bottom: 12, width: 320, maxWidth: 'calc(100% - 24px)', borderRadius: 14 }),
      }}>
      {sheet ? <style dangerouslySetInnerHTML={{ __html: '.vb-style-sheet button{min-height:44px!important;min-width:44px!important}.vb-style-sheet input,.vb-style-sheet textarea{min-height:44px!important}' }} /> : null}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 12px 10px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <span style={{ fontWeight: 800, fontSize: 14, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Header &amp; identity</span>
        <div style={{ flex: 1 }} />
        <button type="button" onClick={close} aria-label="Close panel" title="Close"
          style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, borderRadius: 7, border: '1px solid transparent', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>×</button>
      </div>
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 12 }}>
        <HeroEditor groupId={groupId} hero={hero} placeholders={placeholders} onChange={onChange} sheet={sheet} />
      </div>
    </div>
  );
}

export interface HeroPlaceholders {
  fandomName: string;        // the derived masthead name (displayName default)
  derivedVitals: string[];   // the derived vitals chips (Est. YYYY, gen, N members, ...)
  memberCount: number;       // ACTIVE member count (governance L-068), shown as a data hint
}

const CHIP_CAP = 6;

export function HeroEditor({ groupId, hero, placeholders, onChange, sheet }: {
  groupId: number; hero: HeroIdentity; placeholders: HeroPlaceholders;
  onChange: (hero: HeroIdentity | undefined) => void; sheet?: boolean | undefined;
}): React.ReactElement {
  // Prune empties + drop the whole key when nothing is overridden (absent === default,
  // so the published parity holds: an untouched hero writes no meta at all).
  const emit = (next: HeroIdentity): void => {
    const clean: HeroIdentity = {};
    if (next.banner) clean.banner = next.banner;
    if (next.avatar) clean.avatar = next.avatar;
    if (next.displayName && next.displayName.trim()) clean.displayName = next.displayName.trim();
    if (next.tagline && next.tagline.trim()) clean.tagline = next.tagline.trim();
    const chips = (next.chips ?? []).filter((c) => c.value && c.value.trim())
      .map((c) => (c.label && c.label.trim() ? { label: c.label.trim(), value: c.value.trim() } : { value: c.value.trim() }));
    if (chips.length) clean.chips = chips;
    onChange(Object.keys(clean).length ? clean : undefined);
  };
  // A patch may CLEAR a field (undefined) or set null; emit prunes either way.
  type HeroPatch = { [K in keyof HeroIdentity]?: HeroIdentity[K] | undefined };
  const patch = (p: HeroPatch): void => emit({ ...hero, ...p } as HeroIdentity);

  const chips = hero.chips ?? [];
  const atCap = chips.length >= CHIP_CAP;
  const setChip = (i: number, key: 'label' | 'value', v: string): void => {
    const next = chips.map((c, j) => (j === i ? { ...c, [key]: v } : c));
    patch({ chips: next });
  };
  const addChip = (): void => patch({ chips: [...chips, { value: '' }] });
  const removeChip = (i: number): void => patch({ chips: chips.filter((_, j) => j !== i) });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <p style={{ margin: 0, fontSize: 12, color: 'var(--text-tertiary)', lineHeight: 1.5 }}>
        The space masthead. Every field overrides a data value; clear it to fall back to the data.
        The page heading and hero structure never change.
      </p>

      <Field label="Banner image">
        <ImageField groupId={groupId} value={hero.banner ?? ''} onChange={(v) => patch({ banner: typeof v === 'string' ? v : undefined })} sheet={sheet} />
        <Hint>Wide header image. We copy it into our storage (never a hotlink). Center-cropped.</Hint>
      </Field>

      <Field label="Profile picture">
        <ImageField groupId={groupId} value={hero.avatar ?? ''} onChange={(v) => patch({ avatar: typeof v === 'string' ? v : undefined })} sheet={sheet} />
        <Hint>Overrides the group logo in the masthead.</Hint>
      </Field>

      <Field label="Display name" badge={<BoundBadge overridden={!!hero.displayName} onReset={() => patch({ displayName: undefined })} />}>
        <DebInput value={hero.displayName ?? ''} placeholder={placeholders.fandomName} onCommit={(v) => patch({ displayName: v })} sheet={sheet} ariaLabel="Masthead display name" />
        <Hint>The visible name on the masthead. The page heading (for search) stays the fandom name.</Hint>
      </Field>

      <Field label="Tagline">
        <DebInput value={hero.tagline ?? ''} placeholder="A short line under the name" onCommit={(v) => patch({ tagline: v })} sheet={sheet} ariaLabel="Masthead tagline" />
      </Field>

      <Field label="Vitals chips" badge={<BoundBadge overridden={chips.length > 0} onReset={() => patch({ chips: [] })} />}>
        {chips.length === 0 ? (
          <Hint>Following the data: {placeholders.derivedVitals.join('  ·  ') || `${placeholders.memberCount} members`}. Add a chip to override.</Hint>
        ) : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {chips.map((c, i) => (
              <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <DebInput value={c.label ?? ''} placeholder="Label (optional)" onCommit={(v) => setChip(i, 'label', v)} sheet={sheet} ariaLabel={`Chip ${i + 1} label`} flex={0.8} />
                <DebInput value={c.value ?? ''} placeholder="Value" onCommit={(v) => setChip(i, 'value', v)} sheet={sheet} ariaLabel={`Chip ${i + 1} value`} flex={1} />
                <button type="button" onClick={() => removeChip(i)} aria-label={`Remove chip ${i + 1}`} title="Remove" style={iconBtn(sheet)}>
                  <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" /></svg>
                </button>
              </li>
            ))}
          </ul>
        )}
        <button type="button" onClick={addChip} disabled={atCap} title={atCap ? `Max ${CHIP_CAP} chips` : 'Add a chip'}
          style={{ marginTop: 6, minHeight: sheet ? 44 : 34, borderRadius: 8, border: '1px dashed var(--border)', background: 'transparent', color: atCap ? 'var(--text-tertiary)' : 'var(--vb-accent)', fontSize: 12, fontWeight: 700, cursor: atCap ? 'not-allowed' : 'pointer' }}>
          + Add chip{atCap ? ` (max ${CHIP_CAP})` : ''}
        </button>
      </Field>

      <p role="status" style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-tertiary)' }}>Auto-saved to the draft</p>
    </div>
  );
}

// Debounced text input: local while typing, commits after a pause + on blur. Follows an
// external reset via the value prop.
function DebInput({ value, placeholder, onCommit, sheet, ariaLabel, flex }: {
  value: string; placeholder: string; onCommit: (v: string) => void; sheet?: boolean | undefined; ariaLabel: string; flex?: number;
}): React.ReactElement {
  const [local, setLocal] = useState(value);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => { setLocal(value); }, [value]);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const schedule = (v: string): void => { setLocal(v); if (timer.current) clearTimeout(timer.current); timer.current = setTimeout(() => onCommit(v), 450); };
  const flush = (): void => { if (timer.current) { clearTimeout(timer.current); timer.current = null; } onCommit(local); };
  return (
    <input value={local} placeholder={placeholder} onChange={(e) => schedule(e.target.value)} onBlur={flush} aria-label={ariaLabel}
      style={{ flex: flex ?? undefined, width: flex ? undefined : '100%', boxSizing: 'border-box', padding: sheet ? '11px 10px' : '7px 9px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: 13, minHeight: sheet ? 44 : undefined }} />
  );
}

function Field({ label, badge, children }: { label: string; badge?: React.ReactNode; children: React.ReactNode }): React.ReactElement {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)' }}>{label}</span>{badge}
      </span>
      {children}
    </div>
  );
}
function Hint({ children }: { children: React.ReactNode }): React.ReactElement {
  return <p style={{ margin: 0, fontSize: 11, color: 'var(--text-tertiary)', lineHeight: 1.5 }}>{children}</p>;
}
function iconBtn(sheet: boolean | undefined): React.CSSProperties {
  return { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: sheet ? 44 : 30, height: sheet ? 44 : 30, flexShrink: 0, borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', padding: 0 };
}
