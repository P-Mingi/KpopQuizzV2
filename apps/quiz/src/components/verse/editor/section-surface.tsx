'use client';

import { useEffect, useState } from 'react';

import { renderTipTapJSON, extractHeadings, splitTipTapForFold } from '@/lib/verse/render-content';

import { SectionEditor } from './section-editor';
import { HistoryPanel } from './history-panel';

interface Props {
  entityType: string;
  entityId: string;
  section: string;
  label: string;
  initialHtml: string;          // server-rendered content HTML (crawlable), '' when empty
  initialContent: unknown | null;
  baseRevisionId: number | null;
  locked: boolean;
  lockReason: string | null;
  emptyInvite: string;
  groupSlug?: string;
  /** V-TEXT: 'auto' folds long prose (past ~300 words), 'folded' always folds,
   * 'inline' never folds. The fold is a native details: full text stays in the
   * served HTML and expands without JS. */
  foldPref?: 'auto' | 'inline' | 'folded';
}

/**
 * A readable rich-text section with an inline editor for authorized editors. The
 * content renders server-side (crawlable); this client wrapper only adds the Edit
 * affordance (gated by /api/verse/can-edit so the page stays ISR/cookie-free).
 */
export function SectionSurface(props: Props): React.ReactElement {
  const [html, setHtml] = useState(props.initialHtml);
  const [content, setContent] = useState<unknown | null>(props.initialContent);
  const [base, setBase] = useState<number | null>(props.baseRevisionId);
  const [canEdit, setCanEdit] = useState(false);
  const [editing, setEditing] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [history, setHistory] = useState(false);
  const [locked, setLocked] = useState(props.locked);

  async function toggleLock() {
    const reason = locked ? undefined : (window.prompt('Lock reason (optional):') ?? '');
    const res = await fetch('/api/verse/lock', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entity_type: props.entityType, entity_id: props.entityId, section: props.section, locked: !locked, reason }),
    });
    if (res.ok) setLocked(!locked);
  }
  const [hover, setHover] = useState<{ label: string; type: string; href: string; x: number; y: number } | null>(null);

  useEffect(() => {
    const q = props.groupSlug ? `?group=${encodeURIComponent(props.groupSlug)}` : '';
    fetch(`/api/verse/can-edit${q}`).then((r) => r.ok ? r.json() : null).then((d) => setCanEdit(!!d?.canEdit)).catch(() => {});
  }, [props.groupSlug]);

  // Hover preview cards for @-mention chips (identify the entity + jump to it).
  const onMentionOver = (e: React.MouseEvent) => {
    const a = (e.target as HTMLElement).closest('a.verse-mention') as HTMLAnchorElement | null;
    if (!a) return;
    const href = a.getAttribute('href') ?? '';
    const type = href.includes('/members/') ? 'Member' : href.includes('/albums/') ? 'Album' : 'Group';
    const r = a.getBoundingClientRect();
    setHover({ label: a.textContent?.replace(/^@/, '') ?? '', type, href, x: r.left + window.scrollX, y: r.bottom + window.scrollY + 4 });
  };

  const hasContent = html.replace(/<[^>]*>/g, '').trim().length > 0;

  return (
    <section className="mb-6" id={`section-${props.section}`}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--verse-ink)' }}>{props.label}</h2>
        <div className="flex items-center gap-2">
          {locked ? <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase" style={{ background: 'var(--verse-soft)', color: 'var(--verse-ink)' }} title={props.lockReason ?? 'Protected by a reviewer'}>
            <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>Locked
          </span> : null}
          {!editing && (hasContent || canEdit) ? (
            <button onClick={() => setHistory((h) => !h)} className="rounded-full border px-3 py-1 text-xs font-semibold text-secondary" style={{ borderColor: 'var(--verse-line)' }}>History</button>
          ) : null}
          {canEdit && !editing ? (
            <button onClick={() => setEditing(true)} className="rounded-full border px-3 py-1 text-xs font-bold" style={{ borderColor: 'var(--verse-line)', color: 'var(--verse-ink)' }}>Edit</button>
          ) : null}
          {canEdit ? (
            <button onClick={toggleLock} className="rounded-full border px-3 py-1 text-xs font-semibold text-secondary" style={{ borderColor: 'var(--verse-line)' }}>{locked ? 'Unlock' : 'Lock'}</button>
          ) : null}
          {!canEdit && !suggesting && !history && !locked ? (
            <button onClick={() => setSuggesting(true)} className="rounded-full border px-3 py-1 text-xs font-semibold text-secondary" style={{ borderColor: 'var(--verse-line)' }}>Suggest an edit</button>
          ) : null}
        </div>
      </div>

      {history ? (
        <div className="mb-4"><HistoryPanel entityType={props.entityType} entityId={props.entityId} section={props.section} canEdit={canEdit} onClose={() => setHistory(false)} /></div>
      ) : null}

      {editing ? (
        <SectionEditor
          entityType={props.entityType} entityId={props.entityId} section={props.section}
          initialContent={content} baseRevisionId={base} groupSlug={props.groupSlug}
          onClose={() => setEditing(false)}
          onSaved={(revId, newContent) => { setContent(newContent); setHtml(renderTipTapJSON(newContent)); setBase(revId); setEditing(false); }}
        />
      ) : suggesting ? (
        <SectionEditor
          entityType={props.entityType} entityId={props.entityId} section={props.section}
          initialContent={content} baseRevisionId={base} groupSlug={props.groupSlug} suggestMode
          onClose={() => setSuggesting(false)} onSaved={() => setSuggesting(false)}
        />
      ) : hasContent ? (
        <>
          {(() => {
            // Auto-TOC on long sections (>= 3 headings), sticky on desktop.
            const toc = extractHeadings(content);
            if (toc.length < 3) return null;
            return (
              <nav aria-label="Contents" className="verse-toc mb-4 rounded-xl border border-default p-3 lg:float-right lg:ml-4 lg:mb-2 lg:w-52 lg:sticky lg:top-4" style={{ borderColor: 'var(--verse-line)', background: 'var(--verse-soft)' }}>
                <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--verse-ink)' }}>Contents</p>
                <ul className="space-y-1 text-xs">
                  {toc.map((h, i) => (
                    <li key={i} style={{ paddingLeft: h.level === 3 ? 10 : 0 }}>
                      <a href={`#${h.id}`} className="text-secondary hover:text-primary no-underline">{h.text}</a>
                    </li>
                  ))}
                </ul>
              </nav>
            );
          })()}
          {(() => {
            // V-TEXT fold: preview (first 2 blocks) + the rest inside a native
            // <details>. Full text always in the DOM; JS-off readers expand fine.
            const pref = props.foldPref ?? 'auto';
            const split = splitTipTapForFold(content, 2);
            const folds = pref !== 'inline' && split.restHtml !== '' && (pref === 'folded' || split.totalWords > 300);
            if (!folds) {
              return <div className="verse-prose" onMouseOver={onMentionOver} onMouseOut={() => setHover(null)} dangerouslySetInnerHTML={{ __html: html }} />;
            }
            return (
              <div onMouseOver={onMentionOver} onMouseOut={() => setHover(null)}>
                <div className="verse-prose" dangerouslySetInnerHTML={{ __html: split.previewHtml }} />
                <details className="v-fold">
                  <summary><span className="v-fold-more">Read more</span><span className="v-fold-less">Show less</span></summary>
                  <div className="verse-prose" dangerouslySetInnerHTML={{ __html: split.restHtml }} />
                </details>
              </div>
            );
          })()}
          {hover ? (
            <a href={hover.href} className="verse-hover-card" style={{ position: 'absolute', left: hover.x, top: hover.y, zIndex: 40 }}>
              <span className="rounded px-1 text-[9px] font-bold uppercase" style={{ background: 'var(--verse-soft-strong)', color: 'var(--verse-ink)' }}>{hover.type}</span>
              <span className="font-bold" style={{ color: 'var(--verse-ink)' }}>{hover.label}</span>
              <span className="text-[11px] text-tertiary">Open page</span>
            </a>
          ) : null}
        </>
      ) : (
        <div className="rounded-xl border border-dashed p-5" style={{ borderColor: 'var(--verse-line)', background: 'var(--verse-soft)' }}>
          <p className="text-sm text-secondary">{props.emptyInvite}</p>
          {canEdit ? <button onClick={() => setEditing(true)} className="mt-2 text-sm font-bold no-underline" style={{ color: 'var(--verse-ink)' }}>Start writing</button> : null}
        </div>
      )}
    </section>
  );
}
