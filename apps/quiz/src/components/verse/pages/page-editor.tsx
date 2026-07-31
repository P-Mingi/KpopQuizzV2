'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useEditor, EditorContent } from '@tiptap/react';

import { verseEditorExtensions } from '@/components/verse/editor/extensions';
import { FirstEditTour } from '@/components/verse/editor/first-edit-tour';
import { setMentionGroup } from '@/components/verse/editor/mention';

import type { PageKindDef, InfoboxFieldDef } from '@/lib/verse/pages/kinds';

// V-PAGES step 5 - the page editor (contributor+). Scaffolded per kind: typed
// infobox form (fact fields carry a source input pair), the constrained Verse
// TipTap for the body (seeded with the kind's suggested section headings on
// first open), debounced autosave to the drafts rail, submit-for-review, and
// the curator's publish/return. Every save answers with the server's verdicts
// (the gates speak in the UI, not just at the API).

interface PageShape {
  id: number; group_id: number; kind: string; slug: string; title: string;
  status: string; infobox: Record<string, unknown>;
}

const EMPTY_DOC = { type: 'doc', content: [{ type: 'paragraph' }] };

function scaffoldDoc(def: PageKindDef): object {
  if (!def.sections.length) return EMPTY_DOC;
  return {
    type: 'doc',
    content: def.sections.flatMap((s) => [
      { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: s.label }] },
      { type: 'paragraph' },
    ]),
  };
}

function factParts(raw: unknown): { value: string; source: string } {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const o = raw as { value?: unknown; source?: unknown };
    return { value: String(o.value ?? ''), source: String(o.source ?? '') };
  }
  return { value: raw == null ? '' : String(raw), source: '' };
}

const inputCls = 'w-full rounded-lg border px-3 py-2 text-sm outline-none';
const inputStyle: React.CSSProperties = { borderColor: 'var(--verse-line)', background: 'var(--bg-surface)', color: 'var(--text-primary)' };

function InfoboxField({ f, raw, onChange }: { f: InfoboxFieldDef; raw: unknown; onChange: (v: unknown) => void }): React.ReactElement {
  const fact = factParts(raw);
  return (
    <div>
      <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-tertiary" htmlFor={`ib-${f.key}`}>
        {f.label}{f.fact ? <span className="ml-1 normal-case tracking-normal" style={{ color: 'var(--verse-brand-text, #6d4de0)' }}>fact · source required</span> : null}
      </label>
      {f.type === 'select' ? (
        <select id={`ib-${f.key}`} className={inputCls} style={inputStyle} value={String(raw ?? '')} onChange={(e) => onChange(e.target.value || undefined)}>
          <option value="">Not set</option>
          {(f.options ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : f.fact ? (
        <div className="flex flex-col gap-1.5">
          <input id={`ib-${f.key}`} className={inputCls} style={inputStyle} placeholder={f.help ?? f.label} value={fact.value}
            onChange={(e) => onChange(e.target.value || fact.source ? { value: e.target.value, source: fact.source } : undefined)} />
          <input aria-label={`Source for ${f.label}`} className={inputCls} style={inputStyle} placeholder="https:// source for this fact" value={fact.source}
            onChange={(e) => onChange(fact.value || e.target.value ? { value: fact.value, source: e.target.value } : undefined)} />
        </div>
      ) : (
        <input id={`ib-${f.key}`} className={inputCls} style={inputStyle} placeholder={f.help ?? ''} value={String(raw ?? '')}
          onChange={(e) => onChange(e.target.value || undefined)} />
      )}
    </div>
  );
}

export function PageEditor({ page, def, initialBody, canPublish, groupSlug }: {
  page: PageShape; def: PageKindDef; initialBody: unknown | null; canPublish: boolean; groupSlug?: string | undefined;
}): React.ReactElement {
  setMentionGroup(groupSlug);
  const router = useRouter();
  const [title, setTitle] = useState(page.title);
  const [infobox, setInfobox] = useState<Record<string, unknown>>(page.infobox ?? {});
  const [status, setStatus] = useState(page.status);
  const [saving, setSaving] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [errors, setErrors] = useState<string[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const editor = useEditor({
    extensions: verseEditorExtensions,
    content: (initialBody as object) ?? scaffoldDoc(def),
    immediatelyRender: false,
  });

  const save = async (): Promise<boolean> => {
    setSaving('saving');
    setErrors([]);
    const res = await fetch('/api/verse/pages/save', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ page_id: page.id, title, infobox, body: editor?.getJSON() ?? null }),
    });
    const out = (await res.json()) as { ok?: boolean; errors?: string[] };
    setSaving(out.ok ? 'saved' : 'idle');
    if (!out.ok) setErrors(out.errors ?? ['Save failed.']);
    return !!out.ok;
  };

  // Debounced autosave on body/meta change.
  useEffect(() => {
    if (!editor) return;
    const arm = (): void => {
      setSaving('idle');
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => { void save(); }, 2500);
    };
    editor.on('update', arm);
    return () => { editor.off('update', arm); if (timer.current) clearTimeout(timer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, title, infobox]);

  const act = async (url: string, body: Record<string, unknown>, after?: (out: Record<string, unknown>) => void): Promise<void> => {
    if (!(await save())) return;
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const out = (await res.json()) as { ok?: boolean; errors?: string[]; status?: string };
    if (!out.ok) { setErrors(out.errors ?? ['That did not work.']); return; }
    if (out.status) setStatus(out.status);
    after?.(out as Record<string, unknown>);
  };

  return (
    <div className="grid grid-cols-1 gap-x-8 lg:grid-cols-3 lg:gap-x-12">
      <div className="lg:col-span-2">
        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-tertiary" htmlFor="page-title">Title</label>
        <input id="page-title" className={`${inputCls} mb-4 text-lg font-bold`} style={inputStyle} value={title} onChange={(e) => { setTitle(e.target.value); setSaving('idle'); }} />

        <div className="rounded-xl border" style={{ borderColor: 'var(--verse-line)' }}>
          <FirstEditTour />
          {/* V-EDITOR-MAX (cold-task 2 friction): the wiki editor had NO toolbar;
              a first-time fan had no visible way to structure text or cite a
              source. The essential six, matching the section editor's idiom. */}
          {editor ? (
            <div className="v-toolbar flex flex-wrap items-center gap-0.5 border-b px-2 py-1.5" style={{ borderColor: 'var(--verse-line)' }} role="group" aria-label="Formatting">
              {([
                { label: 'Bold', name: 'Bold', on: () => editor.chain().focus().toggleBold().run(), active: editor.isActive('bold') },
                { label: 'Italic', name: 'Italic', on: () => editor.chain().focus().toggleItalic().run(), active: editor.isActive('italic') },
                { label: 'H2', name: 'Heading level 2', on: () => editor.chain().focus().toggleHeading({ level: 2 }).run(), active: editor.isActive('heading', { level: 2 }) },
                { label: 'H3', name: 'Heading level 3', on: () => editor.chain().focus().toggleHeading({ level: 3 }).run(), active: editor.isActive('heading', { level: 3 }) },
                { label: 'List', name: 'Bulleted list', on: () => editor.chain().focus().toggleBulletList().run(), active: editor.isActive('bulletList') },
                { label: 'Link', name: 'Link', on: () => {
                  if (editor.isActive('link')) { editor.chain().focus().unsetLink().run(); return; }
                  const url = window.prompt('Source URL (https):');
                  if (!url) return;
                  if (!/^https:\/\/\S+$/i.test(url)) { setErrors(['Sources must be https links.']); return; }
                  editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
                }, active: editor.isActive('link') },
              ] as const).map((b) => (
                // mousedown only guards the selection; the action rides click so
                // Enter/Space work for keyboard users too.
                <button key={b.label} type="button" onMouseDown={(e) => e.preventDefault()} onClick={b.on}
                  className="rounded px-2 py-1 text-xs font-semibold transition-colors"
                  style={{ color: b.active ? 'var(--verse-accent-text)' : 'var(--text-secondary)', background: b.active ? 'var(--verse-accent)' : 'transparent' }}
                  aria-pressed={b.active} aria-label={b.name}>{b.label}</button>
              ))}
            </div>
          ) : null}
          <div className="p-3"><EditorContent editor={editor} /></div>
        </div>

        {errors.length > 0 ? (
          <ul className="mt-3 space-y-1 text-sm" style={{ color: '#c0392b' }} role="alert">
            {errors.map((e, i) => <li key={i}>{e}</li>)}
          </ul>
        ) : null}

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => void save()} className="inline-flex min-h-[44px] items-center rounded-xl border px-5 text-sm font-bold" style={{ borderColor: 'var(--verse-line)', color: 'var(--text-primary)' }}>
            {saving === 'saving' ? 'Saving...' : saving === 'saved' ? 'Saved' : 'Save draft'}
          </button>
          {status === 'draft' ? (
            <button type="button" onClick={() => void act('/api/verse/pages/submit', { page_id: page.id })} className="inline-flex min-h-[44px] items-center rounded-xl px-5 text-sm font-bold text-white" style={{ background: 'var(--verse-accent, #7c5cfc)' }}>
              Submit for review
            </button>
          ) : null}
          {canPublish ? (
            <button type="button" onClick={() => void act('/api/verse/pages/publish', { page_id: page.id, action: 'publish' }, () => router.refresh())} className="inline-flex min-h-[44px] items-center rounded-xl px-5 text-sm font-bold text-white" style={{ background: '#1e8e5a' }}>
              Publish
            </button>
          ) : null}
          <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-tertiary">{status}</span>
        </div>
      </div>

      <aside className="mt-8 lg:col-span-1 lg:mt-0">
        {def.infobox.length > 0 ? (
          <div className="verse-frame verse-frame-rounded">
            <h2 className="v-eyebrow">{def.label} facts</h2>
            <div className="flex flex-col gap-3">
              {def.infobox.map((f) => (
                <InfoboxField key={f.key} f={f} raw={infobox[f.key]}
                  onChange={(v) => { setInfobox((prev) => { const next = { ...prev }; if (v === undefined) delete next[f.key]; else next[f.key] = v; return next; }); setSaving('idle'); }} />
              ))}
            </div>
          </div>
        ) : null}
        <p className="mt-3 text-[12px] leading-relaxed text-tertiary">
          {def.fanWritten
            ? 'This is a fan-written kind: no external sources required, and the page carries a fan-written badge.'
            : 'Facts need an https source each. Dating, health, family, residence and rumor content is never allowed.'}
        </p>
      </aside>
    </div>
  );
}
