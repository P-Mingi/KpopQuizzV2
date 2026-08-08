'use client';

// V-FOUNDATION F1 Phase E - the curator MENU editor (locked prototype screen 03). Three
// columns (level 1 / 2 / 3), reorder + add + remove per node, a page attach per node, and
// VISIBLE cap counters that turn warn-colored AT the cap (min-gate: the limit is seen
// before it is hit). The 5x3x10 caps are also enforced server-side on save (nav.ts).
import { useCallback, useEffect, useRef, useState } from 'react';

import { TOP_MAX, CHILD_MAX } from '@/lib/verse/tree/nav';
import type { NavNode } from '@/lib/verse/tree/nav';

interface ENode { key: string; label: string; slug?: string | undefined; index?: string | undefined; children: ENode[] }
let SEQ = 0;
const k = (): string => `n${(SEQ += 1)}`;

function toE(nodes: NavNode[] | undefined): ENode[] {
  return (nodes ?? []).map((n) => ({
    key: k(), label: n.label,
    slug: n.ref?.kind === 'page' ? n.ref.slug : undefined,
    index: n.ref?.kind === 'index' ? n.ref.key : undefined,   // preserve an auto-index target (no editor picker yet, but never dropped)
    children: toE(n.children),
  }));
}
function toWire(nodes: ENode[]): NavNode[] {
  return nodes.map((n) => {
    const out: NavNode = { label: n.label };
    if (n.slug) out.ref = { kind: 'page', slug: n.slug };
    else if (n.index) out.ref = { kind: 'index', key: n.index };
    if (n.children.length) out.children = toWire(n.children);
    return out;
  });
}

export function NavEditor({ groupId, initialTree }: { groupId: number; spaceSlug?: string; initialTree: NavNode[] }): React.ReactElement {
  const [tree, setTree] = useState<ENode[]>(() => toE(initialTree));
  const [sel1, setSel1] = useState<string | null>(null);
  const [sel2, setSel2] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const l1 = tree;
  const n1 = l1.find((n) => n.key === sel1) ?? null;
  const l2 = n1?.children ?? [];
  const n2 = l2.find((n) => n.key === sel2) ?? null;
  const l3 = n2?.children ?? [];

  // Immutable edit at a level: apply `fn` to the children array at [p1?][p2?].
  const edit = useCallback((fn: (arr: ENode[]) => ENode[], p1?: string, p2?: string) => {
    setTree((prev) => {
      if (p1 == null) return fn(prev);
      return prev.map((a) => a.key !== p1 ? a : {
        ...a, children: p2 == null ? fn(a.children) : a.children.map((b) => b.key !== p2 ? b : { ...b, children: fn(b.children) }),
      });
    });
  }, []);

  const addAt = (arr: ENode[]) => [...arr, { key: k(), label: 'New entry', children: [] }];
  const renameIn = (key: string, label: string) => (arr: ENode[]) => arr.map((n) => n.key === key ? { ...n, label } : n);
  const attachIn = (key: string, slug: string | undefined) => (arr: ENode[]) => arr.map((n) => n.key === key ? { ...n, slug: slug || undefined } : n);
  const removeIn = (key: string) => (arr: ENode[]) => arr.filter((n) => n.key !== key);
  const moveIn = (key: string, dir: -1 | 1) => (arr: ENode[]) => {
    const i = arr.findIndex((n) => n.key === key); const j = i + dir;
    if (i < 0 || j < 0 || j >= arr.length) return arr;
    const next = [...arr]; [next[i], next[j]] = [next[j]!, next[i]!]; return next;
  };

  const save = useCallback(async () => {
    setBusy(true); setMsg(null);
    try {
      const r = await fetch('/api/verse/nav', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ group_id: groupId, tree: toWire(tree) }) });
      const d = await r.json().catch(() => ({}));
      setMsg(r.ok ? 'Menu saved. Readers see it now.' : (d.errors?.[0] ?? `Save failed (${r.status}).`));
    } catch { setMsg('Could not reach the server.'); }
    finally { setBusy(false); }
  }, [groupId, tree]);

  const Column = ({ title, nodes, cap, selected, onSelect, p1, p2 }: {
    title: string; nodes: ENode[]; cap: number; selected: string | null;
    onSelect: ((key: string) => void) | null; p1?: string; p2?: string;
  }): React.ReactElement => {
    const atCap = nodes.length >= cap;
    return (
      <div className="vnave-col">
        <div className="vnave-ch"><h4>{title}</h4><span className={`cnt${atCap ? ' max' : ''}`}>{nodes.length} / {cap}{atCap ? ' MAX' : ''}</span></div>
        {nodes.map((n, i) => (
          <NavRow key={n.key} node={n} selected={selected === n.key}
            onSelect={onSelect ? () => onSelect(n.key) : null}
            onRename={(v) => edit(renameIn(n.key, v), p1, p2)}
            onAttach={(v) => edit(attachIn(n.key, v), p1, p2)}
            onUp={i > 0 ? () => edit(moveIn(n.key, -1), p1, p2) : null}
            onDown={i < nodes.length - 1 ? () => edit(moveIn(n.key, 1), p1, p2) : null}
            onRemove={() => { edit(removeIn(n.key), p1, p2); if (selected === n.key && onSelect) onSelect(''); }}
            groupId={groupId} />
        ))}
        <button type="button" className="vnave-add" disabled={atCap} onClick={() => edit(addAt, p1, p2)}>
          + Add entry{atCap ? ` (max ${cap})` : ''}
        </button>
      </div>
    );
  };

  return (
    <div className="vnave">
      <div className="vnave-head">
        <h1>Menu editor</h1>
        <p>Up to {TOP_MAX} top entries, {3} levels, {CHILD_MAX} children per node. Pick a row to edit the next level.</p>
      </div>
      <div className="vnave-cols">
        <Column title="Level 1" nodes={l1} cap={TOP_MAX} selected={sel1} onSelect={(key) => { setSel1(key || null); setSel2(null); }} />
        {n1 ? <Column title={`Level 2 · ${n1.label}`} nodes={l2} cap={CHILD_MAX} selected={sel2} onSelect={(key) => setSel2(key || null)} p1={n1.key} /> : <div className="vnave-col vnave-empty">Pick a level-1 entry</div>}
        {n2 ? <Column title={`Level 3 · ${n2.label}`} nodes={l3} cap={CHILD_MAX} selected={null} onSelect={null} p1={n1!.key} p2={n2.key} /> : <div className="vnave-col vnave-empty">Pick a level-2 entry</div>}
      </div>
      <div className="vnave-foot">
        {msg ? <span role="status" className="vnave-msg">{msg}</span> : null}
        <button type="button" className="vnave-save" disabled={busy} onClick={save}>{busy ? 'Saving...' : 'Save menu'}</button>
      </div>
    </div>
  );
}

function NavRow({ node, selected, onSelect, onRename, onAttach, onUp, onDown, onRemove, groupId }: {
  node: ENode; selected: boolean; onSelect: (() => void) | null;
  onRename: (v: string) => void; onAttach: (v: string | undefined) => void;
  onUp: (() => void) | null; onDown: (() => void) | null; onRemove: () => void; groupId: number;
}): React.ReactElement {
  const [open, setOpen] = useState(false);
  const type = node.slug ? 'PAGE' : node.index ? 'INDEX' : node.children.length ? 'MENU' : 'EMPTY';
  return (
    <div className={`vnave-row${selected ? ' sel' : ''}`}>
      <div className="vnave-rowmain">
        <span className="vnave-grip" aria-hidden="true">⋮⋮</span>
        <button type="button" className="vnave-label" onClick={() => onSelect?.()} disabled={!onSelect} title={onSelect ? 'Edit this entry’s children' : undefined}>{node.label}</button>
        <span className={`vnave-type${type === 'EMPTY' ? ' warn' : ''}`}>{type === 'PAGE' ? 'PAGE' : type === 'INDEX' ? 'INDEX AUTO' : type === 'MENU' ? 'MENU' : 'NO TARGET'}</span>
        <button type="button" className="vnave-ic" onClick={() => setOpen((o) => !o)} aria-label="Edit">✎</button>
        <button type="button" className="vnave-ic" onClick={() => onUp?.()} disabled={!onUp} aria-label="Move up">↑</button>
        <button type="button" className="vnave-ic" onClick={() => onDown?.()} disabled={!onDown} aria-label="Move down">↓</button>
        <button type="button" className="vnave-ic" onClick={onRemove} aria-label="Remove">✕</button>
      </div>
      {open ? (
        <div className="vnave-edit">
          <input value={node.label} onChange={(e) => onRename(e.target.value)} placeholder="Label" aria-label="Menu label" />
          <PagePick groupId={groupId} value={node.slug} onPick={(slug) => onAttach(slug)} />
        </div>
      ) : null}
    </div>
  );
}

// Attach a page target by search (or clear it to make the node a pure sub-menu container).
function PagePick({ groupId, value, onPick }: { groupId: number; value?: string | undefined; onPick: (slug: string | undefined) => void }): React.ReactElement {
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<{ slug: string; title: string }[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (!q.trim()) { setHits([]); return; }
    timer.current = setTimeout(() => {
      fetch(`/api/verse/tree?group_id=${groupId}&kind=search&q=${encodeURIComponent(q)}`).then((r) => r.ok ? r.json() : { results: [] }).then((d) => setHits(d.results ?? [])).catch(() => setHits([]));
    }, 250);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [q, groupId]);
  return (
    <div className="vnave-pick">
      {value ? <div className="vnave-attached">Target: <strong>{value}</strong> <button type="button" onClick={() => onPick(undefined)}>clear</button></div> : null}
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Attach a page (search)..." aria-label="Attach a page" />
      {hits.length > 0 ? (
        <div className="vnave-hits">
          {hits.map((h) => <button key={h.slug} type="button" onClick={() => { onPick(h.slug); setQ(''); setHits([]); }}>{h.title} <span>{h.slug}</span></button>)}
        </div>
      ) : null}
    </div>
  );
}
