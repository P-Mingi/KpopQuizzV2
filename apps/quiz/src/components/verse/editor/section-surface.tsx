'use client';

import { useEffect, useState } from 'react';

import { renderTipTapJSON } from '@/lib/verse/render-content';

import { SectionEditor } from './section-editor';

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

  useEffect(() => {
    fetch('/api/verse/can-edit').then((r) => r.ok ? r.json() : null).then((d) => setCanEdit(!!d?.canEdit)).catch(() => {});
  }, []);

  const hasContent = html.replace(/<[^>]*>/g, '').trim().length > 0;

  return (
    <section className="mb-6" id={`section-${props.section}`}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--verse-ink)' }}>{props.label}</h2>
        <div className="flex items-center gap-2">
          {props.locked ? <span className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase" style={{ background: 'var(--verse-soft)', color: 'var(--verse-ink)' }} title={props.lockReason ?? 'Protected'}>Locked</span> : null}
          {canEdit && !editing && !(props.locked) ? (
            <button onClick={() => setEditing(true)} className="rounded-full border px-3 py-1 text-xs font-bold" style={{ borderColor: 'var(--verse-line)', color: 'var(--verse-ink)' }}>Edit</button>
          ) : null}
        </div>
      </div>

      {editing ? (
        <SectionEditor
          entityType={props.entityType} entityId={props.entityId} section={props.section}
          initialContent={content} baseRevisionId={base}
          onClose={() => setEditing(false)}
          onSaved={(revId, newContent) => { setContent(newContent); setHtml(renderTipTapJSON(newContent)); setBase(revId); setEditing(false); }}
        />
      ) : hasContent ? (
        <div className="verse-prose" dangerouslySetInnerHTML={{ __html: html }} />
      ) : (
        <div className="rounded-xl border border-dashed p-5" style={{ borderColor: 'var(--verse-line)', background: 'var(--verse-soft)' }}>
          <p className="text-sm text-secondary">{props.emptyInvite}</p>
          {canEdit ? <button onClick={() => setEditing(true)} className="mt-2 text-sm font-bold no-underline" style={{ color: 'var(--verse-ink)' }}>Start writing</button> : null}
        </div>
      )}
    </section>
  );
}
