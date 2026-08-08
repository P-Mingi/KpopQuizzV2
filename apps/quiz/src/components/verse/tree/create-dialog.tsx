'use client';

// V-FOUNDATION F1 Phase D - CREATE FROM ANYWHERE (locked prototype screen 04). Search
// FIRST, always (the entity-picker principle, zero silent duplicates): typing a title
// surfaces existing pages before offering "Create <name>". The chosen type mechanically
// pre-seeds the section template (server-side); the parent is chosen here; the definitive
// FLAT slug is shown before creating (the URL is a promise that never moves, C2).
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import { pageSlug } from '@/lib/verse/tree/slug';

const TYPES: { key: string; label: string; note?: string }[] = [
  { key: 'article', label: 'Free article' },
  { key: 'member', label: 'Member' },
  { key: 'release', label: 'Release' },
  { key: 'track', label: 'Track' },
  { key: 'era', label: 'Era' },
  { key: 'gallery', label: 'Gallery', note: 'collection' },
];

interface Hit { id: number; slug: string; title: string; type: string }

export function CreateDialog({ groupId, spaceSlug, initialTitle = '', initialSlug = '', initialParentId = null }: {
  groupId: number; spaceSlug: string; initialTitle?: string; initialSlug?: string; initialParentId?: number | null;
}): React.ReactElement {
  const router = useRouter();
  const [title, setTitle] = useState(initialTitle);
  const [type, setType] = useState('article');
  const [hits, setHits] = useState<Hit[]>([]);
  const [parent, setParent] = useState<{ id: number; title: string } | null>(null);
  const [parentQ, setParentQ] = useState('');
  const [parentHits, setParentHits] = useState<Hit[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const slug = initialSlug && !title ? initialSlug : pageSlug(title || 'untitled');

  const search = useCallback((q: string, set: (h: Hit[]) => void) => {
    if (!q.trim()) { set([]); return; }
    fetch(`/api/verse/tree?group_id=${groupId}&kind=search&q=${encodeURIComponent(q)}`)
      .then((r) => r.ok ? r.json() : { results: [] }).then((d) => set(d.results ?? [])).catch(() => set([]));
  }, [groupId]);

  useEffect(() => { if (timer.current) clearTimeout(timer.current); timer.current = setTimeout(() => search(title, setHits), 250); return () => { if (timer.current) clearTimeout(timer.current); }; }, [title, search]);
  useEffect(() => { const t = setTimeout(() => search(parentQ, setParentHits), 250); return () => clearTimeout(t); }, [parentQ, search]);

  const create = useCallback(async () => {
    setBusy(true); setErr(null);
    try {
      const body: Record<string, unknown> = { group_id: groupId, action: 'create', type, title };
      if (initialSlug && title === initialTitle) body.slug = initialSlug;
      if (parent) body.parent_id = parent.id; else if (initialParentId) body.parent_id = initialParentId;
      const r = await fetch('/api/verse/tree', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const d = await r.json().catch(() => ({}));
      if (r.status === 409 && d.duplicate) { setErr(`A page already exists at that name.`); setBusy(false); return; }
      if (!r.ok || !d.page) { setErr(d.error ?? 'Could not create the page.'); setBusy(false); return; }
      router.push(`/verse/${spaceSlug}/${d.page.slug}`);
    } catch { setErr('Could not reach the server.'); setBusy(false); }
  }, [groupId, type, title, parent, initialSlug, initialTitle, initialParentId, router, spaceSlug]);

  return (
    <div className="vcreate">
      <div className="vcreate-head">
        <h1>New page</h1>
        <p>Search first. If it exists, go to it; otherwise create it.</p>
      </div>

      <input className="vcreate-search" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Page title..." aria-label="Page title" autoFocus />

      {hits.length > 0 ? (
        <div className="vcreate-res">
          <div className="rh">Existing pages</div>
          {hits.map((h) => (
            <Link key={h.slug} href={`/verse/${spaceSlug}/${h.slug}`} className="vcreate-hit">
              {h.title} <span className="path">/verse/{spaceSlug}/{h.slug}</span>
            </Link>
          ))}
        </div>
      ) : null}

      {title.trim() ? (
        <>
          <section className="vcreate-sec">
            <div className="sh">Page type</div>
            <div className="vcreate-types">
              {TYPES.map((t) => (
                <button key={t.key} type="button" onClick={() => setType(t.key)} aria-pressed={type === t.key} className={type === t.key ? 'sel' : undefined}>
                  {t.label}{t.note ? <span className="note">{t.note}</span> : null}
                </button>
              ))}
            </div>
          </section>

          <section className="vcreate-sec">
            <div className="sh">Position in the tree</div>
            {parent ? (
              <div className="vcreate-parent">Under <strong>{parent.title}</strong> <button type="button" onClick={() => { setParent(null); setParentQ(''); }}>change</button></div>
            ) : (
              <>
                <input className="vcreate-psearch" value={parentQ} onChange={(e) => setParentQ(e.target.value)} placeholder="Top level (search a parent page...)" aria-label="Parent page" />
                {parentHits.length > 0 ? (
                  <div className="vcreate-res">
                    {parentHits.map((h) => <button key={h.slug} type="button" className="vcreate-hit" onClick={() => { setParent({ id: h.id, title: h.title }); setParentQ(''); }}>{h.title}</button>)}
                  </div>
                ) : null}
              </>
            )}
          </section>

          <section className="vcreate-sec">
            <div className="sh">Definitive URL</div>
            <div className="vcreate-slug">kpopquiz.org/verse/{spaceSlug}/<strong>{slug}</strong> · flat, never changes</div>
          </section>

          <div className="vcreate-foot">
            {err ? <span role="alert" className="vcreate-err">{err}</span> : null}
            <button type="button" className="vcreate-primary" disabled={busy} onClick={create}>{busy ? 'Creating...' : `Create "${title.trim()}"`}</button>
          </div>
        </>
      ) : null}
    </div>
  );
}
