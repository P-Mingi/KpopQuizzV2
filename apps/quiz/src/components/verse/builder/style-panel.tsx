'use client';

// V-BUILDER-3 step 2 - THE BLOCK PANEL (locked co-design 7, L-057). ONE floating RIGHT
// drawer over the selected block with TWO tabs: Content | Style. Content (default on open)
// renders the block's editorSchema as generic field editors (content-tab.tsx); Style is the
// Phase-2 per-block style controls. The header (icon + name + duplicate + close) and the
// bottom Delete are SHARED across tabs. It RETARGETS on selection and closes on Esc / X /
// deselect. Every change rides the step-3 engine (optimistic + validated save + revert).
// Blocks without an editorSchema show Style only (no empty Content tab). Kept named
// StylePanel (its mount point) to avoid churn.
import { useEffect, useRef, useState } from 'react';

import { TINT_KEYS, ACCENT_KEYS, tintCss, accentVarFor } from '@/lib/verse/composition/block-style';
import { CatIcon } from './library-drawer';
import { ContentTab } from './content-tab';
import { MembersEditor } from './members-editor';

import type { BlockSpec, BlockStyleOption } from '@/lib/verse/composition/registry';
import type { BlockStyle } from '@/lib/verse/composition/types';
import type { StylePatch } from './use-builder-composition';

const ACCENT_LABEL: Record<string, string> = { world: 'World default', violet: 'Violet', blue: 'Blue', green: 'Green', amber: 'Amber', rose: 'Rose' };
const TINT_LABEL: Record<string, string> = { none: 'None', veil: 'Veil', soft: 'Soft', bold: 'Bold' };

export function StylePanel({ spec, style, canDelete, sheet, groupId, blockId, initialProps, onChange, onCommitProps, onClose, onDuplicate, onDelete }: {
  spec: BlockSpec; style: BlockStyle; canDelete: boolean; sheet?: boolean;
  groupId: number; blockId: string; initialProps: Record<string, unknown>;
  onChange: (patch: StylePatch) => void; onCommitProps: (props: Record<string, unknown>) => void;
  onClose: () => void; onDuplicate: () => void; onDelete: () => void;
}): React.ReactElement {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const restoreRef = useRef<HTMLElement | null>(null);
  const schema = spec.editorSchema;
  const has = (opt: BlockStyleOption) => spec.styleOptions.includes(opt);
  const surface = has('frame') || has('background') || has('radius') || has('divider');
  // Content is the default tab on open; re-default on retarget (a new block selected).
  const [tab, setTab] = useState<'content' | 'style'>(schema ? 'content' : 'style');
  useEffect(() => { setTab(spec.editorSchema ? 'content' : 'style'); }, [spec.type, spec.editorSchema]);

  // focus trap + Esc, mirroring the library drawer: focus the first control on open,
  // keep Tab inside, restore focus on close. (Without focusing in, the trap is inert.)
  useEffect(() => {
    const panel = panelRef.current;
    restoreRef.current = document.activeElement as HTMLElement | null;
    const focusables = () => Array.from(panel?.querySelectorAll<HTMLElement>('button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])') ?? []).filter((e) => !e.hasAttribute('disabled'));
    focusables()[0]?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); return; }
      if (e.key !== 'Tab') return;
      const f = focusables(); if (!f.length) return;
      const first = f[0]!, last = f[f.length - 1]!;
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    panel?.addEventListener('keydown', onKey);
    return () => { panel?.removeEventListener('keydown', onKey); if (restoreRef.current && document.contains(restoreRef.current)) restoreRef.current.focus(); };
  }, [onClose]);

  return (
    <div role="dialog" aria-modal="true" aria-label={`Edit ${spec.name}`} ref={panelRef}
      className={sheet ? 'vb-style-sheet' : undefined}
      style={{
        position: 'absolute', zIndex: 65, display: 'flex', flexDirection: 'column', pointerEvents: 'auto',
        background: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1px solid var(--border)',
        boxShadow: '0 18px 60px color-mix(in srgb, black 28%, transparent)',
        ...(sheet
          ? { left: 0, right: 0, bottom: 0, top: 'auto', maxHeight: '76vh', borderRadius: '16px 16px 0 0' }
          : { top: 12, right: 12, bottom: 12, width: 320, maxWidth: 'calc(100% - 24px)', borderRadius: 14 }),
      }}>
      {/* A11Y: on the phone sheet, bump every control to the 44px touch-target floor (the
          compact desktop panel keeps its mouse-sized controls). */}
      {sheet ? <style dangerouslySetInnerHTML={{ __html: '.vb-style-sheet button{min-height:44px!important;min-width:44px!important}.vb-style-sheet input,.vb-style-sheet textarea{min-height:44px!important}' }} /> : null}
      {/* header: mirror the canvas tag name + the duplicate handle (shared across tabs) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 12px 10px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 800, fontSize: 14, minWidth: 0 }}>
          <span style={{ color: 'var(--vb-accent)' }}><CatIcon name={spec.icon} /></span>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{spec.name}</span>
        </span>
        <div style={{ flex: 1 }} />
        <button type="button" onClick={onDuplicate} aria-label="Duplicate block" title="Duplicate" style={hIcon()}><DupeIcon /></button>
        <button type="button" onClick={onClose} aria-label="Close panel" title="Close" style={hIcon()}>×</button>
      </div>

      {/* tabs (only when the block has content to edit) */}
      {schema ? (
        <div role="tablist" aria-label="Editor" style={{ display: 'flex', gap: 2, padding: '8px 12px 0', flexShrink: 0 }}>
          {(['content', 'style'] as const).map((t) => (
            <button key={t} role="tab" aria-selected={tab === t} type="button" onClick={() => setTab(t)}
              style={{ padding: '7px 12px', border: 'none', background: 'transparent', borderBottom: `2px solid ${tab === t ? 'var(--vb-accent)' : 'transparent'}`, color: tab === t ? 'var(--text-primary)' : 'var(--text-tertiary)', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>
              {t === 'content' ? 'Content' : 'Style'}
            </button>
          ))}
        </div>
      ) : null}

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {schema && tab === 'content' ? (
          schema.block === 'members' ? (
            // The flagship: a bespoke roster editor (governance L-068) instead of the generic
            // field list - live roster, entity picker, detach. Order + overrides ride the same
            // draft rail (the `rows` prop); an empty `rows` renders byte-identically (parity).
            <MembersEditor groupId={groupId} rows={Array.isArray(initialProps.rows) ? (initialProps.rows as Record<string, unknown>[]) : []} onChange={(rows) => onCommitProps({ rows })} sheet={sheet} />
          ) : (
            <ContentTab schema={schema} groupId={groupId} blockId={blockId} initialProps={initialProps} onCommit={onCommitProps} sheet={sheet} />
          )
        ) : (
          <>
            {has('density') ? (
              <Group title="Layout">
                <Segmented label="Density" value={style.density ?? 'normal'} options={[['roomy', 'Cozy'], ['normal', 'Standard'], ['compact', 'Compact']]} onPick={(v) => onChange({ density: v })} />
              </Group>
            ) : null}

            {surface ? (
              <Group title="Surface">
                {has('frame') ? <Segmented label="Frame" value={style.frame ?? 'none'} options={[['none', 'None'], ['rounded', 'Card'], ['outline', 'Outline']]} onPick={(v) => onChange({ frame: v })} /> : null}
                {has('background') ? <SwatchRow label="Background" value={style.background ?? 'none'} keys={TINT_KEYS as unknown as string[]} labelFor={(k) => TINT_LABEL[k] ?? k} colorFor={(k) => (k === 'none' ? 'transparent' : tintCss(k))} onPick={(v) => onChange({ background: v })} /> : null}
                {has('radius') ? <Segmented label="Corners" value={style.radius ?? 'soft'} options={[['sharp', 'Sharp'], ['soft', 'Soft'], ['round', 'Round']]} onPick={(v) => onChange({ radius: v })} /> : null}
                {has('divider') ? <Segmented label="Divider" value={style.divider ?? 'none'} options={[['none', 'None'], ['hairline', 'Hairline'], ['space', 'Space']]} onPick={(v) => onChange({ divider: v })} /> : null}
              </Group>
            ) : null}

            {has('accent') ? (
              <Group title="Color">
                <SwatchRow label="Accent" value={style.accent ?? 'world'} keys={ACCENT_KEYS as unknown as string[]} labelFor={(k) => ACCENT_LABEL[k] ?? k}
                  colorFor={(k) => accentVarFor(k) ?? 'var(--verse-accent)'} worldFirst onPick={(v) => onChange({ accent: v })} />
              </Group>
            ) : null}

            {has('text') ? (
              <Group title="Text">
                <Segmented label="Scale" value={style.text?.size ?? 'M'} options={[['S', 'S'], ['M', 'M'], ['L', 'L']]} onPick={(v) => onChange({ textScale: v })} />
              </Group>
            ) : null}
          </>
        )}
      </div>

      {/* shared Delete footer (both tabs) */}
      {canDelete ? (
        <div style={{ padding: '10px 12px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
          <button type="button" onClick={onDelete} style={{ width: '100%', padding: '9px', borderRadius: 9, border: '1px solid var(--border)', background: 'transparent', color: 'var(--vb-danger)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            Delete block
          </button>
        </div>
      ) : null}
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }): React.ReactElement {
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <h3 style={{ margin: 0, fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-tertiary)' }}>{title}</h3>
      {children}
    </section>
  );
}

function Segmented({ label, value, options, onPick }: { label: string; value: string; options: [string, string][]; onPick: (v: string) => void }): React.ReactElement {
  return (
    <div>
      <div style={rowLabel}>{label}</div>
      <div role="group" aria-label={label} style={{ display: 'inline-flex', width: '100%', border: '1px solid var(--border)', borderRadius: 9, overflow: 'hidden' }}>
        {options.map(([v, lbl], i) => {
          const on = v === value;
          return (
            <button key={v} type="button" aria-pressed={on} onClick={() => onPick(v)}
              style={{ flex: 1, padding: '7px 4px', border: 'none', borderLeft: i ? '1px solid var(--border)' : 'none', background: on ? 'var(--vb-accent)' : 'transparent', color: on ? 'var(--vb-accent-text)' : 'var(--text-secondary)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>{lbl}</button>
          );
        })}
      </div>
    </div>
  );
}

function SwatchRow({ label, value, keys, labelFor, colorFor, worldFirst, onPick }: {
  label: string; value: string; keys: string[]; labelFor: (k: string) => string; colorFor: (k: string) => string; worldFirst?: boolean; onPick: (v: string) => void;
}): React.ReactElement {
  return (
    <div>
      <div style={rowLabel}>{label}</div>
      <div role="group" aria-label={label} style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {keys.map((k) => {
          const on = k === value;
          const isWorld = worldFirst && k === 'world';
          return (
            <button key={k} type="button" aria-pressed={on} aria-label={labelFor(k)} title={labelFor(k)} onClick={() => onPick(k)}
              style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: isWorld ? 'auto' : 26, height: 26, padding: isWorld ? '0 8px' : 0, gap: 4,
                borderRadius: 7, cursor: 'pointer', fontSize: 11, fontWeight: 700,
                border: `2px solid ${on ? 'var(--vb-accent)' : 'var(--border)'}`,
                background: isWorld ? 'transparent' : (k === 'none' ? 'var(--bg-primary)' : colorFor(k)),
                color: 'var(--text-secondary)',
              }}>
              {isWorld ? 'World' : k === 'none' ? '∅' : ''}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const rowLabel: React.CSSProperties = { fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 5, fontWeight: 600 };
function hIcon(): React.CSSProperties { return { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 15, lineHeight: 1 }; }
const SS = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
function DupeIcon(): React.ReactElement { return (<svg width={13} height={13} viewBox="0 0 24 24" {...SS}><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h10" /></svg>); }
