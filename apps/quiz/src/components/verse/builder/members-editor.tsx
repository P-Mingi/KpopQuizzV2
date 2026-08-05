'use client';

// V-BUILDER-3 step 4 (the flagship, co-design 8 / governance L-068). The members block's
// Content editor: the live roster as reorderable rows with an IN-PANEL ACCORDION (no modal)
// per row - photo (image rail), display name (Data/Edited + revert), linked page (editable).
// "Add member" is the ENTITY PICKER (search first, always): re-attach THIS group's detached
// idol OR create a new one (origin='curator', needs_review, inactive until an admin approves).
// "Retirer du widget" DETACHES (row + page survive). create / attach / detach are IMMEDIATE
// governed DB ops (each behind a confirm); ORDER + overrides persist in the draft jsonb (the
// `rows` prop) like every other block edit. Only ACTIVE members are on the roster (inactive
// members 404 and never render - the SEO governance rule).
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { ImageField, BoundBadge } from './content-tab';

interface Member { id: number; name: string; nameHangul: string | null; photoUrl: string | null; slug: string }
interface Override { photo?: string; name?: string; link?: string }
type Row = Record<string, unknown>;

const ROSTER_CAP = 40;

export function MembersEditor({ groupId, rows, onChange, sheet }: {
  groupId: number; rows: Row[]; onChange: (rows: Row[]) => void; sheet?: boolean | undefined;
}): React.ReactElement {
  const [roster, setRoster] = useState<Member[]>([]);
  const [detached, setDetached] = useState<Member[]>([]);
  const [pending, setPending] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<number | null>(null);
  const [picker, setPicker] = useState(false);
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/verse/space-members?group_id=${groupId}`);
      const b = await r.json().catch(() => ({}));
      if (!r.ok) { setMsg(b.error ?? 'Could not load the roster.'); return; }
      setRoster(b.roster ?? []); setDetached(b.detached ?? []); setPending(b.pending ?? []);
    } catch { setMsg('Could not reach the server.'); }
    finally { setLoading(false); }
  }, [groupId]);
  useEffect(() => { void load(); }, [load]);

  // Overrides + order derive from the `rows` prop merged with the live roster. The link stays
  // entity-keyed unless the curator sets one; order = rows first, then any roster not yet listed.
  const ovOf = useMemo(() => {
    const m = new Map<number, Override>();
    for (const r of rows) {
      const id = Number(r?.member); if (!id) continue;
      const o: Override = {}; const p = strOr(r.photo), n = strOr(r.name), l = strOr(r.link);
      if (p) o.photo = p; if (n) o.name = n; if (l) o.link = l;
      m.set(id, o);
    }
    return m;
  }, [rows]);
  const ordered = useMemo(() => {
    const byId = new Map(roster.map((x) => [x.id, x] as const));
    const out: Member[] = []; const seen = new Set<number>();
    for (const r of rows) { const x = byId.get(Number(r?.member)); if (x && !seen.has(x.id)) { out.push(x); seen.add(x.id); } }
    for (const x of roster) { if (!seen.has(x.id)) out.push(x); }
    return out;
  }, [roster, rows]);

  // Persist the FULL ordered roster (each row = member id + only its set overrides) so order is
  // explicit after any edit. Empty roster / no edits => the caller never writes (parity holds).
  const persist = useCallback((orderIds: number[], overrides: Map<number, Override>) => {
    const next: Row[] = orderIds.map((id) => {
      const ov = overrides.get(id) ?? {}; const row: Row = { member: id };
      if (ov.photo) row.photo = ov.photo; if (ov.name) row.name = ov.name; if (ov.link) row.link = ov.link;
      return row;
    });
    onChange(next);
  }, [onChange]);

  const orderIds = () => ordered.map((m) => m.id);

  const reorder = (i: number, dir: -1 | 1) => {
    const ids = orderIds(); const j = i + dir; if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j]!, ids[i]!]; persist(ids, ovOf);
  };
  const setOverride = (id: number, key: keyof Override, val: string | undefined) => {
    const next = new Map(ovOf); const cur = { ...(next.get(id) ?? {}) };
    if (val && val.trim()) cur[key] = val; else delete cur[key];
    next.set(id, cur); persist(orderIds(), next);
  };

  const detach = async (m: Member) => {
    if (!confirm(`Detach ${m.name} from this space's roster?\n\nThe member page and its data stay live and can be re-attached later. This is not a delete.`)) return;
    setBusy(true); setMsg(null);
    try {
      const r = await fetch('/api/verse/space-members', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ group_id: groupId, action: 'detach', idol_id: m.id }) });
      const b = await r.json().catch(() => ({}));
      if (!r.ok) { setMsg(b.error ?? 'Detach failed.'); return; }
      persist(orderIds().filter((x) => x !== m.id), ovOf); // drop from the ordered rows
      setOpenId(null); await load();
    } finally { setBusy(false); }
  };

  const attach = async (m: Member) => {
    if (!confirm(`Re-attach ${m.name} to this space's roster? It becomes visible again immediately.`)) return;
    setBusy(true); setMsg(null);
    try {
      const r = await fetch('/api/verse/space-members', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ group_id: groupId, action: 'attach', idol_id: m.id }) });
      const b = await r.json().catch(() => ({}));
      if (!r.ok) { setMsg(b.error ?? 'Re-attach failed.'); return; }
      persist([...orderIds(), m.id], ovOf); // append the re-attached member
      setPicker(false); setQ(''); await load();
    } finally { setBusy(false); }
  };

  const createMember = async (name: string) => {
    const nm = name.trim(); if (!nm) return;
    if (!confirm(`Create "${nm}" as a new member?\n\nA member page is created and sent for review. It stays hidden (not public) until a moderator approves it. Only add real people, with sourced facts or honest emptiness.`)) return;
    setBusy(true); setMsg(null);
    try {
      const r = await fetch('/api/verse/space-members', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ group_id: groupId, action: 'create', name: nm }) });
      const b = await r.json().catch(() => ({}));
      if (!r.ok) { setMsg(b.error ?? 'Create failed.'); return; }
      setPicker(false); setQ(''); await load(); // appears under "Awaiting review" until approved
    } finally { setBusy(false); }
  };

  const atCap = ordered.length >= ROSTER_CAP;
  const detachedHits = detached.filter((d) => !q.trim() || d.name.toLowerCase().includes(q.trim().toLowerCase()));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <p style={{ margin: 0, fontSize: 12, color: 'var(--text-tertiary)', lineHeight: 1.5 }}>
        The live roster. Drag order with the arrows; open a row to set a photo, a display name, or a custom link. Adding or detaching a member changes the space immediately.
      </p>

      {loading ? <p style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Loading the roster…</p> : (
        <>
          {ordered.length === 0 ? (
            <p style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>No active members yet. Add the first below.</p>
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {ordered.map((m, i) => {
                const ov = ovOf.get(m.id) ?? {};
                const displayName = ov.name?.trim() || m.name;
                const open = openId === m.id;
                return (
                  <li key={m.id} style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 6 }}>
                      <span style={{ display: 'inline-flex', flexDirection: 'column' }}>
                        <button type="button" onClick={() => reorder(i, -1)} disabled={i === 0 || busy} aria-label={`Move ${displayName} up`} title="Move up" style={gripBtn(sheet, i === 0)}><Chev up /></button>
                        <button type="button" onClick={() => reorder(i, 1)} disabled={i === ordered.length - 1 || busy} aria-label={`Move ${displayName} down`} title="Move down" style={gripBtn(sheet, i === ordered.length - 1)}><Chev up={false} /></button>
                      </span>
                      <Avatar name={displayName} photoUrl={m.photoUrl} overridePath={ov.photo} />
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName}</span>
                          <BoundBadge overridden={!!(ov.photo || ov.name || ov.link)} onReset={() => { const n = new Map(ovOf); n.delete(m.id); persist(orderIds(), n); }} />
                        </span>
                        {m.nameHangul ? <span style={{ display: 'block', fontSize: 11, color: 'var(--text-tertiary)' }}>{m.nameHangul}</span> : null}
                      </span>
                      <button type="button" onClick={() => setOpenId(open ? null : m.id)} aria-expanded={open} aria-label={`${open ? 'Close' : 'Edit'} ${displayName}`} style={gripBtn(sheet, false)}>
                        <Chev up={open} />
                      </button>
                    </div>
                    {open ? (
                      <div style={{ borderTop: '1px solid var(--border)', padding: 10, display: 'flex', flexDirection: 'column', gap: 12, background: 'var(--bg-primary)' }}>
                        <Field label="Photo">
                          <ImageField groupId={groupId} value={ov.photo ?? ''} onChange={(v) => setOverride(m.id, 'photo', typeof v === 'string' ? v : undefined)} sheet={sheet} />
                        </Field>
                        <Field label="Display name" badge={<BoundBadge overridden={!!ov.name} onReset={() => setOverride(m.id, 'name', undefined)} />}>
                          <OverrideInput value={ov.name ?? ''} placeholder={m.name} onCommit={(v) => setOverride(m.id, 'name', v)} style={inputStyle(sheet)} ariaLabel={`Display name for ${m.name}`} />
                        </Field>
                        <Field label="Linked page" badge={<BoundBadge overridden={!!ov.link} onReset={() => setOverride(m.id, 'link', undefined)} />}>
                          <OverrideInput value={ov.link ?? ''} placeholder="This member's page (default)" onCommit={(v) => setOverride(m.id, 'link', v)} style={inputStyle(sheet)} ariaLabel={`Link for ${m.name}`} />
                        </Field>
                        <button type="button" onClick={() => void detach(m)} disabled={busy} style={{ alignSelf: 'flex-start', minHeight: sheet ? 44 : 32, padding: '0 12px', borderRadius: 8, border: '1px solid color-mix(in srgb, red 40%, var(--border))', background: 'transparent', color: 'var(--vb-danger)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                          Retirer du widget (detach)
                        </button>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}

          {/* Add member: the entity picker (search first, always). */}
          {picker ? (
            <div style={{ border: '1px solid var(--vb-accent)', borderRadius: 10, padding: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search a member to re-attach, or type a new name" style={inputStyle(sheet)} aria-label="Search or name a member" />
              {detachedHits.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)' }}>Detached members (re-attach)</span>
                  {detachedHits.map((d) => (
                    <button key={d.id} type="button" onClick={() => void attach(d)} disabled={busy} style={pickBtn(sheet)}>
                      <Avatar name={d.name} photoUrl={d.photoUrl} /> <span>{d.name}</span><span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-tertiary)' }}>re-attach</span>
                    </button>
                  ))}
                </div>
              ) : null}
              {q.trim() ? (
                <button type="button" onClick={() => void createMember(q)} disabled={busy || atCap} style={{ ...pickBtn(sheet), borderStyle: 'dashed', color: 'var(--vb-accent)', fontWeight: 700 }}>
                  + Create &ldquo;{q.trim()}&rdquo; as a new member (sent for review)
                </button>
              ) : <p style={{ margin: 0, fontSize: 11, color: 'var(--text-tertiary)' }}>Search runs first, always. New members are reviewed before they go public.</p>}
              <button type="button" onClick={() => { setPicker(false); setQ(''); }} style={{ alignSelf: 'flex-start', fontSize: 12, color: 'var(--text-tertiary)', background: 'none', border: 'none', cursor: 'pointer' }}>Cancel</button>
            </div>
          ) : (
            <button type="button" onClick={() => setPicker(true)} disabled={busy || atCap} title={atCap ? `Max ${ROSTER_CAP} members` : 'Add a member'}
              style={{ minHeight: sheet ? 44 : 36, borderRadius: 8, border: '1px dashed var(--border)', background: 'transparent', color: atCap ? 'var(--text-tertiary)' : 'var(--vb-accent)', fontSize: 12, fontWeight: 700, cursor: atCap ? 'not-allowed' : 'pointer' }}>
              + Add member{atCap ? ` (max ${ROSTER_CAP})` : ''}
            </button>
          )}

          {/* Curator-created members awaiting an admin's approval (hidden until then). */}
          {pending.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)' }}>Awaiting review ({pending.length})</span>
              {pending.map((p) => (
                <span key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-tertiary)', padding: '4px 2px' }}>
                  <Avatar name={p.name} photoUrl={p.photoUrl} /> {p.name}
                  <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.03em', padding: '1px 6px', borderRadius: 5, border: '1px solid var(--border)' }}>hidden · pending</span>
                </span>
              ))}
            </div>
          ) : null}
        </>
      )}

      {msg ? <p role="alert" style={{ margin: 0, fontSize: 11, fontWeight: 600, color: 'var(--vb-danger)' }}>{msg}</p> : null}
      <p role="status" style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-tertiary)' }}>Order &amp; overrides auto-saved to the draft · add/detach are immediate</p>
    </div>
  );
}

function strOr(v: unknown): string | undefined { return typeof v === 'string' && v.trim() ? v : undefined; }

// Debounced text override: local while typing (no per-keystroke server write), commits after a
// pause and on blur. Follows external changes (e.g. a revert) via the value prop.
function OverrideInput({ value, placeholder, onCommit, style, ariaLabel }: {
  value: string; placeholder: string; onCommit: (v: string) => void; style: React.CSSProperties; ariaLabel: string;
}): React.ReactElement {
  const [local, setLocal] = useState(value);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => { setLocal(value); }, [value]);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const schedule = (v: string) => { setLocal(v); if (timer.current) clearTimeout(timer.current); timer.current = setTimeout(() => onCommit(v), 450); };
  const flush = () => { if (timer.current) { clearTimeout(timer.current); timer.current = null; } onCommit(local); };
  return <input value={local} placeholder={placeholder} onChange={(e) => schedule(e.target.value)} onBlur={flush} style={style} aria-label={ariaLabel} />;
}

function Field({ label, badge, children }: { label: string; badge?: React.ReactNode; children: React.ReactNode }): React.ReactElement {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)' }}>{label}</span>{badge}
      </span>
      {children}
    </div>
  );
}

function Avatar({ name, photoUrl, overridePath }: { name: string; photoUrl: string | null; overridePath?: string | undefined }): React.ReactElement {
  // The entity photo shows immediately; an override path is confirmed by the rail preview inside
  // the accordion, so here we fall back to initials rather than guessing the storage URL.
  const src = !overridePath && photoUrl ? photoUrl : null;
  return src
    ? <img src={src} alt="" width={28} height={28} style={{ width: 28, height: 28, borderRadius: 6, objectFit: 'cover', border: '1px solid var(--border)', flexShrink: 0 }} />
    : <span style={{ display: 'inline-flex', width: 28, height: 28, alignItems: 'center', justifyContent: 'center', borderRadius: 6, background: 'var(--verse-soft, var(--bg-primary))', border: '1px solid var(--border)', fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', flexShrink: 0 }}>{name.slice(0, 2)}</span>;
}

function Chev({ up }: { up: boolean }): React.ReactElement {
  return <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={up ? undefined : { transform: 'rotate(180deg)' }}><path d="M18 15l-6-6-6 6" /></svg>;
}

function gripBtn(sheet: boolean | undefined, disabled: boolean): React.CSSProperties {
  return { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: sheet ? 40 : 24, height: sheet ? 24 : 20, borderRadius: 5, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.4 : 1, padding: 0 };
}
function inputStyle(sheet: boolean | undefined): React.CSSProperties {
  return { width: '100%', boxSizing: 'border-box', padding: sheet ? '11px 10px' : '7px 9px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: 13, minHeight: sheet ? 44 : undefined };
}
function pickBtn(sheet: boolean | undefined): React.CSSProperties {
  return { display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left', minHeight: sheet ? 44 : 34, padding: '4px 8px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-primary)', fontSize: 12, cursor: 'pointer' };
}
