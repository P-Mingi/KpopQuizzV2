'use client';

// V-BUILDER-3 step 2 - THE CONTENT TAB (locked co-design 7, L-057). A GENERIC field
// renderer driven entirely by a block's editorSchema - never hand-built per block. Every
// field kind maps to a control; a field whose binding is entity/derived shows a BOUND-DATA
// badge (Data -> follows the source; Edited -> a curator override, with a one-tap revert).
// Edits ride the existing draft rail via the engine's setProps (optimistic + validated +
// reconcile); a hostile value renders the validator's human sentence UNDER its field, leaves
// the other fields editable, and is never saved. English labels (the app is lang="en";
// the owner ruled the locked French copy is anglicized to match the builder).
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { validateField } from '@/lib/verse/composition/editor-schema';

import type { EditorSchema, EditorField } from '@/lib/verse/composition/editor-schema';

const COMMIT_DEBOUNCE_MS = 450;

// stable client-only row keys so React + reorder never lose a row's identity.
let ROW_SEQ = 0;
const nextRowKey = (): string => `r${(ROW_SEQ += 1)}`;

export function ContentTab({ schema, blockId, initialProps, onCommit, sheet }: {
  schema: EditorSchema; blockId: string; initialProps: Record<string, unknown>;
  onCommit: (props: Record<string, unknown>) => void; sheet?: boolean | undefined;
}): React.ReactElement {
  const [draft, setDraft] = useState<Record<string, unknown>>(initialProps);
  // reseed on retarget (a different block selected) - keyed on blockId, not props identity.
  useEffect(() => { setDraft(initialProps); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [blockId]);

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const commit = useCallback((next: Record<string, unknown>) => {
    // only VALID, defined field values are saved: a hostile value is dropped here (its
    // sentence renders inline) so the draft is never corrupted.
    const out: Record<string, unknown> = {};
    for (const f of schema.fields) {
      const { value } = validateField(f, next[f.key]);
      if (value !== undefined) out[f.key] = value;
    }
    onCommit(out);
  }, [schema, onCommit]);
  const schedule = useCallback((next: Record<string, unknown>) => {
    setDraft(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => commit(next), COMMIT_DEBOUNCE_MS);
  }, [commit]);
  // flush a pending edit immediately (blur / unmount) so nothing is lost on close.
  const flush = useCallback(() => { if (timer.current) { clearTimeout(timer.current); timer.current = null; commit(draft); } }, [commit, draft]);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const setField = useCallback((key: string, value: unknown) => schedule({ ...draft, [key]: value }), [draft, schedule]);
  const resetField = useCallback((key: string) => { const { [key]: _drop, ...rest } = draft; schedule(rest); }, [draft, schedule]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {schema.summary ? <p style={{ margin: 0, fontSize: 12, color: 'var(--text-tertiary)', lineHeight: 1.5 }}>{schema.summary}</p> : null}
      {schema.fields.map((f) => (
        <FieldEditor key={f.key} field={f} value={draft[f.key]}
          overridden={Object.prototype.hasOwnProperty.call(draft, f.key) && draft[f.key] !== undefined}
          onChange={(v) => setField(f.key, v)} onReset={() => resetField(f.key)} onBlur={flush} sheet={sheet} />
      ))}
      <p role="status" style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-tertiary)' }}>Auto-saved · draft only</p>
    </div>
  );
}

// ---------------------------------------------------------------- one field
function FieldEditor({ field, value, overridden, onChange, onReset, onBlur, sheet }: {
  field: EditorField; value: unknown; overridden: boolean;
  onChange: (v: unknown) => void; onReset: () => void; onBlur: () => void; sheet?: boolean | undefined;
}): React.ReactElement {
  const id = `vbc-${field.key}`;
  const bound = field.binding === 'entity' || field.binding === 'derived';
  const { error } = useMemo(() => validateField(field, value), [field, value]);
  const str = typeof value === 'string' || typeof value === 'number' ? String(value) : '';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <label htmlFor={id} style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)' }}>{field.label}</label>
        {bound ? <BoundBadge overridden={overridden} onReset={onReset} /> : null}
        <div style={{ flex: 1 }} />
        {field.maxLength && (field.kind === 'text' || field.kind === 'url' || field.kind === 'link') ? (
          <span style={{ fontSize: 11, color: str.length > field.maxLength ? 'var(--vb-danger)' : 'var(--text-tertiary)', fontVariantNumeric: 'tabular-nums' }}>{str.length}/{field.maxLength}</span>
        ) : null}
      </div>
      <FieldControl id={id} field={field} value={value} str={str} onChange={onChange} onBlur={onBlur} sheet={sheet} invalid={!!error && field.kind !== 'list'} />
      {field.help && !error ? <p style={{ margin: 0, fontSize: 11, color: 'var(--text-tertiary)' }}>{field.help}</p> : null}
      {/* list rows surface their OWN per-row errors inline; only leaf fields show a field error here. */}
      {error && field.kind !== 'list' ? <p role="alert" style={{ margin: 0, fontSize: 11, fontWeight: 600, color: 'var(--vb-danger)' }}>{error}</p> : null}
    </div>
  );
}

function BoundBadge({ overridden, onReset }: { overridden: boolean; onReset: () => void }): React.ReactElement {
  if (!overridden) {
    return <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.02em', padding: '1px 6px', borderRadius: 5, background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-tertiary)' }}>Data</span>;
  }
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.02em', padding: '1px 6px', borderRadius: 5, background: 'var(--vb-accent)', color: 'var(--vb-accent-text)' }}>Edited</span>
      <button type="button" onClick={onReset} aria-label="Revert to data" title="Revert to data"
        style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, padding: 0, border: '1px solid var(--border)', borderRadius: 6, background: 'transparent', color: 'var(--vb-accent)', cursor: 'pointer' }}>
        <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v6h6" /><path d="M3 9a9 9 0 1 0 3-6.7L3 9" /></svg>
      </button>
    </span>
  );
}

// ---------------------------------------------------------------- controls by kind
function FieldControl({ id, field, value, str, onChange, onBlur, sheet, invalid }: {
  id: string; field: EditorField; value: unknown; str: string;
  onChange: (v: unknown) => void; onBlur: () => void; sheet?: boolean | undefined; invalid: boolean;
}): React.ReactElement {
  const base: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box', padding: sheet ? '11px 10px' : '7px 9px', borderRadius: 8,
    border: `1px solid ${invalid ? 'var(--vb-danger)' : 'var(--border)'}`, background: 'var(--bg-primary)',
    color: 'var(--text-primary)', fontSize: 13, minHeight: sheet ? 44 : undefined,
  };

  switch (field.kind) {
    case 'enum':
      return (
        <div role="group" aria-labelledby={id} style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 4 }}>
          {(field.options ?? []).map((opt) => {
            const on = str === opt;
            return (
              <button key={opt} type="button" onClick={() => { onChange(opt); onBlur(); }} aria-pressed={on}
                style={{ minHeight: sheet ? 44 : 30, minWidth: sheet ? 44 : undefined, padding: '0 12px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700,
                  border: `1px solid ${on ? 'var(--vb-accent)' : 'var(--border)'}`, background: on ? 'var(--vb-accent)' : 'transparent', color: on ? 'var(--vb-accent-text)' : 'var(--text-secondary)' }}>
                {opt}
              </button>
            );
          })}
        </div>
      );
    case 'number':
      return <input id={id} type="number" value={str} min={field.min} max={field.max} onChange={(e) => onChange(e.target.value)} onBlur={onBlur} style={base} />;
    case 'date':
      return <input id={id} type="date" value={str.slice(0, 10)} onChange={(e) => onChange(e.target.value)} onBlur={onBlur} style={base} />;
    case 'image':
      // step-2 scope: no image rail yet. Render the honest disabled placeholder (no dead affordance elsewhere).
      return (
        <div style={{ ...base, display: 'flex', alignItems: 'center', gap: 8, opacity: 0.6, cursor: 'not-allowed' }}>
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-5-5L5 21" /></svg>
          <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Image rail arrives at step 3</span>
        </div>
      );
    case 'richtext':
      return <textarea id={id} value={str} onChange={(e) => onChange(e.target.value)} onBlur={onBlur} rows={4} style={{ ...base, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }} />;
    case 'list':
      return <ListEditor id={id} field={field} rows={Array.isArray(value) ? (value as Record<string, unknown>[]) : []} onChange={onChange} onBlur={onBlur} sheet={sheet} />;
    case 'text':
      if ((field.maxLength ?? 0) > 100) {
        return <textarea id={id} value={str} maxLength={field.clampNote ? undefined : field.maxLength} onChange={(e) => onChange(e.target.value)} onBlur={onBlur} rows={3} style={{ ...base, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }} />;
      }
      return <input id={id} type="text" value={str} onChange={(e) => onChange(e.target.value)} onBlur={onBlur} style={base} />;
    default: // url, link, entityRef
      return <input id={id} type="text" inputMode={field.kind === 'url' ? 'url' : undefined} value={str} placeholder={field.kind === 'url' ? 'https://…' : undefined} onChange={(e) => onChange(e.target.value)} onBlur={onBlur} style={base} />;
  }
}

// ---------------------------------------------------------------- list of rows
function ListEditor({ id, field, rows, onChange, onBlur, sheet }: {
  id: string; field: EditorField; rows: Record<string, unknown>[];
  onChange: (rows: Record<string, unknown>[]) => void; onBlur: () => void; sheet?: boolean | undefined;
}): React.ReactElement {
  // client-only keys ride alongside the data so reorder never remounts the wrong row.
  const keysRef = useRef<string[]>([]);
  if (keysRef.current.length !== rows.length) keysRef.current = rows.map((_, i) => keysRef.current[i] ?? nextRowKey());
  const item = field.item ?? [];
  const atCap = !!field.maxItems && rows.length >= field.maxItems;

  const write = (next: Record<string, unknown>[], nextKeys: string[]) => { keysRef.current = nextKeys; onChange(next); };
  const setRow = (i: number, key: string, v: unknown) => { const next = rows.map((r, j) => (j === i ? { ...r, [key]: v } : r)); onChange(next); };
  const addRow = () => write([...rows, {}], [...keysRef.current, nextRowKey()]);
  const removeRow = (i: number) => write(rows.filter((_, j) => j !== i), keysRef.current.filter((_, j) => j !== i));
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir; if (j < 0 || j >= rows.length) return;
    const nr = [...rows], nk = [...keysRef.current];
    [nr[i], nr[j]] = [nr[j]!, nr[i]!]; [nk[i], nk[j]] = [nk[j]!, nk[i]!];
    write(nr, nk); onBlur();
  };

  return (
    <div role="group" aria-labelledby={id} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {rows.map((row, i) => (
        <div key={keysRef.current[i]} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: '8px 8px 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)' }}>{i + 1}</span>
            <div style={{ flex: 1 }} />
            <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Move row ${i + 1} up`} title="Move up" style={rowBtn(sheet, i === 0)}><Chev up /></button>
            <button type="button" onClick={() => move(i, 1)} disabled={i === rows.length - 1} aria-label={`Move row ${i + 1} down`} title="Move down" style={rowBtn(sheet, i === rows.length - 1)}><Chev up={false} /></button>
            <button type="button" onClick={() => removeRow(i)} aria-label={`Remove row ${i + 1}`} title="Remove" style={rowBtn(sheet, false)}>
              <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" /></svg>
            </button>
          </div>
          {item.map((f) => (
            <FieldEditor key={f.key} field={f} value={row[f.key]} overridden={false}
              onChange={(v) => setRow(i, f.key, v)} onReset={() => {}} onBlur={onBlur} sheet={sheet} />
          ))}
        </div>
      ))}
      <button type="button" onClick={addRow} disabled={atCap} title={atCap ? `Max ${field.maxItems} rows` : 'Add a row'}
        style={{ minHeight: sheet ? 44 : 34, borderRadius: 8, border: '1px dashed var(--border)', background: 'transparent', color: atCap ? 'var(--text-tertiary)' : 'var(--vb-accent)', fontSize: 12, fontWeight: 700, cursor: atCap ? 'not-allowed' : 'pointer' }}>
        + Add{atCap ? ` (max ${field.maxItems})` : ''}
      </button>
    </div>
  );
}

function rowBtn(sheet: boolean | undefined, disabled: boolean): React.CSSProperties {
  return { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: sheet ? 44 : 26, height: sheet ? 44 : 26, borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.4 : 1, padding: 0 };
}
function Chev({ up }: { up: boolean }): React.ReactElement {
  return <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={up ? undefined : { transform: 'rotate(180deg)' }}><path d="M18 15l-6-6-6 6" /></svg>;
}
