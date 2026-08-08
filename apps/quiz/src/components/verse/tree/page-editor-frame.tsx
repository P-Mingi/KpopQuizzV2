'use client';

// V-FOUNDATION F2 Phase 4 - THE FRAME around the writing surface (locked prototype). Living
// TOC + scrollspy, the honest substance meter (the REAL C5 rule from blocks.substanceOf), the
// autosave chip + revision timeline (restore = a NEW revision, C3), reader preview, focus
// mode, Cmd+Enter publish, an editable title with an immutable slug (C2), and the EDITABLE
// FACT RAIL (amendment A2: Data/Edited grammar, per-field revert, computed fields locked,
// photo via the moderated rail). The frame owns the single save (blocks + fact overrides).
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { PageEditor } from './page-editor';
import { substanceOf } from '@/lib/verse/tree/blocks';
import { runsPlain } from '@/lib/verse/tree/runs';
import type { FactSection, FactOverrides } from '@/lib/verse/tree/factrail';

interface EB { id: string; type: string; level?: 2 | 3; content?: { text: string }[]; items?: { text: string }[][]; rows?: string[][]; icon?: string; cite?: string; path?: string; to_slug?: string; label?: string }
interface Rev { rev: number; created_at: string; title: string }

export function PageEditorFrame({ groupId, spaceSlug, pageId, pageSlug, title: title0, status: status0, initialBlocks, initialFactOverrides, factSections, revCount }: {
  groupId: number; spaceSlug: string; pageId: number; pageSlug: string; title: string; status: string;
  initialBlocks: EB[]; initialFactOverrides: FactOverrides; factSections: FactSection[] | null; revCount: number; entityKind: string | null;
}): React.ReactElement {
  const [blocks, setBlocks] = useState<EB[]>(initialBlocks);
  const [ov, setOv] = useState<FactOverrides>(initialFactOverrides ?? {});
  const [title, setTitle] = useState(title0);
  const [status, setStatus] = useState(status0);
  const [saveState, setSaveState] = useState<'saved' | 'saving'>('saved');
  const [rev, setRev] = useState(revCount);
  const [showHist, setShowHist] = useState(false);
  const [revs, setRevs] = useState<Rev[]>([]);
  const [focus, setFocus] = useState(false);
  const [preview, setPreview] = useState(false);
  const [activeToc, setActiveToc] = useState<string | null>(null);
  const saveT = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doSave = useCallback(async (bs: EB[], o: FactOverrides) => {
    setSaveState('saving');
    try {
      const r = await fetch('/api/verse/tree', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ group_id: groupId, action: 'save', page_id: pageId, blocks: { version: 1, blocks: bs, factOverrides: o } }) });
      if (r.ok) setRev((n) => n + 1);
    } finally { setSaveState('saved'); }
  }, [groupId, pageId]);

  const onBlocks = useCallback((bs: EB[]) => { setBlocks(bs); if (saveT.current) clearTimeout(saveT.current); saveT.current = setTimeout(() => void doSave(bs, ov), 500); }, [doSave, ov]);
  const setOverride = useCallback((key: string, val: string | null) => {
    setOv((cur) => {
      const fields = { ...(cur.fields ?? {}) };
      if (val && val.trim()) fields[key] = val.trim(); else delete fields[key];
      const next: FactOverrides = {};
      if (Object.keys(fields).length) next.fields = fields;
      if (cur.photo) next.photo = cur.photo;
      void doSave(blocks, next);
      return next;
    });
  }, [blocks, doSave]);
  const setPhoto = useCallback((path: string | null) => {
    setOv((cur) => {
      const next: FactOverrides = {};
      if (cur.fields && Object.keys(cur.fields).length) next.fields = cur.fields;
      if (path) next.photo = path;
      void doSave(blocks, next);
      return next;
    });
  }, [blocks, doSave]);

  // ---- TOC + substance from the live blocks ----
  const toc = useMemo(() => blocks.filter((b) => b.type === 'heading').map((b) => ({ id: b.id, text: runsPlain(b.content) || '(untitled)', l3: b.level === 3 })), [blocks]);
  const sub = useMemo(() => substanceOf({ version: 1, blocks: blocks as never }), [blocks]);

  useEffect(() => {
    const hs = toc.map((t) => document.querySelector(`[data-eb="${t.id}"]`)).filter(Boolean) as HTMLElement[];
    if (!hs.length) return;
    const obs = new IntersectionObserver((es) => { es.forEach((e) => { if (e.isIntersecting) setActiveToc(e.target.getAttribute('data-eb')); }); }, { rootMargin: '-15% 0px -75% 0px' });
    hs.forEach((h) => obs.observe(h));
    return () => obs.disconnect();
  }, [toc]);

  // ---- publish (Cmd+Enter) ----
  const publish = useCallback(async () => {
    if (saveT.current) clearTimeout(saveT.current); await doSave(blocks, ov);
    const r = await fetch('/api/verse/tree', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ group_id: groupId, action: 'publish', page_id: pageId }) });
    if (r.ok) setStatus('published');
  }, [groupId, pageId, blocks, ov, doSave]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); void publish(); } };
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey);
  }, [publish]);

  const openHistory = useCallback(async () => {
    setShowHist(true);
    const r = await fetch(`/api/verse/tree?group_id=${groupId}&kind=revisions&page_id=${pageId}`);
    const d = await r.json().catch(() => ({}));
    setRevs((d.revisions ?? []).map((x: { rev: number; created_at: string; title: string }) => ({ rev: x.rev, created_at: x.created_at, title: x.title })));
  }, [groupId, pageId]);
  const restore = useCallback(async (r: number) => {
    await fetch('/api/verse/tree', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ group_id: groupId, action: 'revert', page_id: pageId, rev: r }) });
    location.reload();  // reload the editor from the freshly-created revision
  }, [groupId, pageId]);

  const commitTitle = useCallback(async (t: string) => {
    const v = t.trim(); if (!v || v === title0) return;
    await fetch('/api/verse/tree', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ group_id: groupId, action: 'rename', page_id: pageId, title: v }) });
  }, [groupId, pageId, title0]);

  const words = sub.total;

  return (
    <div className={`pfrm${focus ? ' focus' : ''}${preview ? ' preview' : ''}`}>
      {/* top bar */}
      <div className="pfrm-bar">
        <span className="pfrm-crumb">{spaceSlug} / {title}</span>
        <span className="pfrm-lock">{'\u{1F512}'} Verse locked · admin only</span>
        <span className={`pfrm-status ${status}`}><span className="dot" /> {status}</span>
        <span className="pfrm-save" aria-live="polite">{saveState === 'saving' ? 'saving...' : `saved · rev ${rev}`}</span>
        <div className="grow" />
        <span className="pfrm-wc">{words} words · {Math.max(1, Math.round(words / 200))} min</span>
        <button className="ib" title="Revision history" onClick={openHistory}>{'↻'}</button>
        <button className={`ib${focus ? ' on' : ''}`} title="Focus mode" onClick={() => setFocus((f) => !f)}>{'◎'}</button>
        <button className={`ib${preview ? ' on' : ''}`} title="Reader preview" onClick={() => setPreview((p) => !p)}>{'\u{1F441}'}</button>
        <button className="pfrm-pub" onClick={() => void publish()}>Publish <span className="k">{'⌘⏎'}</span></button>
      </div>

      {preview ? <div className="pfrm-prevbar">{'\u{1F441}'} READER PREVIEW · exactly what a visitor sees · <button onClick={() => setPreview(false)}>back to editing</button></div> : null}

      <div className="pfrm-grid">
        {/* living TOC */}
        <aside className="pfrm-toc">
          <div className="h">Outline</div>
          {toc.length === 0 ? <div className="empty">Type an H2 heading...</div> : (
            <ol>{toc.map((t) => <li key={t.id} className={t.l3 ? 'l3' : undefined}><a className={activeToc === t.id ? 'on' : undefined} onClick={() => document.querySelector(`[data-eb="${t.id}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>{t.text}</a></li>)}</ol>
          )}
          <div className="livenote"><i /> builds as you type</div>
        </aside>

        {/* the editor (or the reader preview) */}
        <main className="pfrm-main">
          <input className="pfrm-title" value={title} onChange={(e) => setTitle(e.target.value)} onBlur={() => void commitTitle(title)} spellCheck={false} />
          <div className="pfrm-slug"><span>{'\u{1F512}'}</span> /verse/{spaceSlug}/{pageSlug} <span className="hint">· the URL never changes when you rename</span></div>
          {preview ? <PreviewDoc blocks={blocks} spaceSlug={spaceSlug} />
            : <PageEditor groupId={groupId} initialBlocks={initialBlocks as never} onBlocksChange={onBlocks as never} />}
        </main>

        {/* fact rail (A2 editable) + substance meter */}
        <aside className="pfrm-rail">
          {factSections ? <EditableFactRail groupId={groupId} sections={factSections} ov={ov} onField={setOverride} onPhoto={setPhoto} /> : null}
          <div className="pfrm-meter">
            <div className="h">Substance <span className="v">{sub.score}%</span></div>
            <div className="bar"><i style={{ width: `${sub.score}%` }} /></div>
            <p className={sub.met ? 'ok' : 'ko'}>{sub.met ? 'Indexable at publish. Real substance (C5).' : 'Below the bar, the page stays noindex (C5). Honest, never an indexed shell.'}</p>
            <ul className="checks">
              <li className={sub.intro ? 'done' : ''}>{'✓'} A real intro (15+ words)</li>
              <li className={sub.section ? 'done' : ''}>{'✓'} At least one H2 section</li>
              <li className={sub.enough ? 'done' : ''}>{'✓'} 60+ words total</li>
            </ul>
          </div>
        </aside>
      </div>

      {/* history panel */}
      {showHist ? (
        <>
          <div className="pfrm-scrim" onClick={() => setShowHist(false)} />
          <aside className="pfrm-hist">
            <h3>Revision history</h3>
            <div className="sub">Every save is a revision. Restore creates a NEW revision, never a destruction.</div>
            <div className="list">
              {revs.map((r, i) => (
                <div key={r.rev} className={`rev${i === 0 ? ' cur' : ''}`}>
                  <div className="dot" />
                  <div className="info"><b>Revision {r.rev}</b><span>{new Date(r.created_at).toLocaleString()}</span></div>
                  {i === 0 ? null : <button onClick={() => void restore(r.rev)}>Restore</button>}
                </div>
              ))}
            </div>
          </aside>
        </>
      ) : null}
    </div>
  );
}

// A2 - the editable fact rail. Data (entity value) -> Edited (curator override) with a
// one-tap revert; computed rows are LOCKED; the photo goes through the moderated rail.
function EditableFactRail({ groupId, sections, ov, onField, onPhoto }: {
  groupId: number; sections: FactSection[]; ov: FactOverrides; onField: (k: string, v: string | null) => void; onPhoto: (p: string | null) => void;
}): React.ReactElement {
  const [editing, setEditing] = useState<string | null>(null);
  return (
    <div className="pfrm-infobox">
      <FactPhoto groupId={groupId} path={ov.photo} onPhoto={onPhoto} />
      {sections.map((s) => (
        <section key={s.heading}>
          <h4>{s.heading}</h4>
          <dl>
            {s.rows.map((r) => {
              const val = r.editable && ov.fields?.[r.key] ? ov.fields[r.key]! : r.dd;
              const edited = r.editable && !!ov.fields?.[r.key];
              return (
                <div key={r.key} className="frow">
                  <dt>{r.dt}</dt>
                  <dd>
                    {editing === r.key && r.editable ? (
                      <input autoFocus defaultValue={val} onBlur={(e) => { onField(r.key, e.target.value || null); setEditing(null); }} onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') setEditing(null); }} />
                    ) : (
                      <>
                        <span onClick={() => r.editable && setEditing(r.key)} className={r.editable ? 'ed' : undefined}>{val}</span>
                        {r.auto ? <span className="lock" title="Computed from data, always current">auto</span>
                          : edited ? <span className="badge">Edited <button onClick={() => onField(r.key, null)} title="Revert to data">{'↺'}</button></span>
                          : r.editable ? <span className="data">Data</span> : null}
                      </>
                    )}
                  </dd>
                </div>
              );
            })}
          </dl>
        </section>
      ))}
      <p className="railnote">Facts come from the linked entity. Edit a field to override it; computed fields (auto) stay locked to the data.</p>
    </div>
  );
}

function FactPhoto({ groupId, path, onPhoto }: { groupId: number; path?: string | undefined; onPhoto: (p: string | null) => void }): React.ReactElement {
  const ref = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const upload = async (f: File): Promise<void> => { setBusy(true); try { const fd = new FormData(); fd.set('file', f); fd.set('group_id', String(groupId)); const r = await fetch('/api/verse/space-image', { method: 'POST', body: fd }); const d = await r.json().catch(() => ({})); if (r.ok && d.path) onPhoto(d.path); } finally { setBusy(false); } };
  return (
    <div className="pfrm-pic" style={path ? { backgroundImage: `url(${process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''}/storage/v1/object/public/verse-space-assets/${path})` } : undefined}>
      <input ref={ref} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); }} />
      <button onClick={() => ref.current?.click()} disabled={busy}>{busy ? '...' : path ? 'Replace photo' : 'Add photo (rail)'}</button>
    </div>
  );
}

// read-only client render of the run blocks - the reader preview (approximate document canvas).
function PreviewDoc({ blocks, spaceSlug }: { blocks: EB[]; spaceSlug: string }): React.ReactElement {
  return (
    <div className="vdoc-main" style={{ maxWidth: 'var(--v-measure, 66ch)' }}>
      {blocks.map((b, i) => {
        const txt = runsPlain(b.content);
        if (b.type === 'heading') return b.level === 3 ? <h3 key={b.id}>{txt}</h3> : <h2 key={b.id}>{txt}</h2>;
        if (b.type === 'paragraph' || b.type === 'text') return txt ? <p key={b.id} className={i === 0 ? 'lead' : undefined}>{txt}</p> : null;
        if (b.type === 'quote') return <blockquote key={b.id}>{txt}{b.cite ? <cite>{b.cite}</cite> : null}</blockquote>;
        if (b.type === 'callout') return <div key={b.id} className="vdoc-callout"><span className="ic">{b.icon ?? '\u{1F4A1}'}</span><div>{txt}</div></div>;
        if (b.type === 'list') return <ul key={b.id} className="vdoc-list">{(b.items ?? []).map((it, j) => <li key={j}>{runsPlain(it)}</li>)}</ul>;
        if (b.type === 'divider') return <hr key={b.id} className="vdoc-hr" />;
        if (b.type === 'table') { const rows = b.rows ?? []; const [head, ...body] = rows; return <table key={b.id} className="vdoc-table">{head ? <thead><tr>{head.map((c, j) => <th key={j}>{c}</th>)}</tr></thead> : null}<tbody>{body.map((row, j) => <tr key={j}>{row.map((c, k) => <td key={k}>{c}</td>)}</tr>)}</tbody></table>; }
        if (b.type === 'link' && b.to_slug) return <p key={b.id}><a href={`/verse/${spaceSlug}/${b.to_slug}`}>{b.label ?? b.to_slug}</a></p>;
        return null;
      })}
    </div>
  );
}
