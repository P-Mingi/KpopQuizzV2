'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { isConfiguredImageHost } from '@/lib/image-hosts';

import { verseEditorExtensions } from './extensions';

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

interface Props {
  entityType: string;
  entityId: string;
  section: string;
  initialContent: unknown | null;
  baseRevisionId: number | null;
  groupSlug?: string | undefined;   // for widget embeds (discography/quiz/stats)
  suggestMode?: boolean;            // visitor suggestion (queued, not applied)
  onClose: () => void;
  onSaved: (newRevisionId: number, content: unknown) => void;
}

const EMPTY_DOC = { type: 'doc', content: [{ type: 'paragraph' }] };

export function SectionEditor({ entityType, entityId, section, initialContent, baseRevisionId, groupSlug, suggestMode, onClose, onSaved }: Props): React.ReactElement {
  const lsKey = `verse-draft:${entityType}:${entityId}:${section}`;
  const [base, setBase] = useState<number | null>(baseRevisionId);
  const [draftState, setDraftState] = useState<SaveState>('idle');
  const [summary, setSummary] = useState('');
  const [minor, setMinor] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState<{ current: unknown; revId: number | null } | null>(null);
  const [restore, setRestore] = useState<unknown | null>(null);
  const draftTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const editor = useEditor({
    extensions: verseEditorExtensions,
    content: (initialContent as object) ?? EMPTY_DOC,
    immediatelyRender: false,
    editorProps: { attributes: { class: 'verse-prose verse-editor-area', 'aria-label': 'Section editor' } },
    onUpdate: () => scheduleDraft(),
  });

  const [submitted, setSubmitted] = useState(false);

  // On mount: offer a newer local/server draft if one exists. Suggest mode uses
  // localStorage only (the server draft endpoint is editor-gated).
  useEffect(() => {
    let local: unknown = null;
    try { const s = localStorage.getItem(lsKey); if (s) local = JSON.parse(s); } catch { /* ignore */ }
    if (suggestMode) { if (local) setRestore(local); return; }
    fetch(`/api/verse/draft?entity_type=${entityType}&entity_id=${entityId}&section=${section}`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { const server = d?.draft?.content ?? null; const candidate = server ?? local; if (candidate) setRestore(candidate); })
      .catch(() => { if (local) setRestore(local); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scheduleDraft = useCallback(() => {
    if (!editor) return;
    setDraftState('saving');
    if (draftTimer.current) clearTimeout(draftTimer.current);
    draftTimer.current = setTimeout(async () => {
      const content = editor.getJSON();
      try { localStorage.setItem(lsKey, JSON.stringify(content)); } catch { /* quota */ }
      if (suggestMode) { setDraftState('saved'); return; }
      try {
        await fetch('/api/verse/draft', {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ entity_type: entityType, entity_id: entityId, section, content, base_revision_id: base }),
        });
        setDraftState('saved');
      } catch { setDraftState('error'); }
    }, 1500);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, base]);

  async function publish(force = false) {
    if (!editor) return;
    setPublishing(true); setError(null);
    const content = editor.getJSON();
    if (suggestMode) {
      const res = await fetch('/api/verse/suggest', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entity_type: entityType, entity_id: entityId, section, content, summary, minor }),
      });
      setPublishing(false);
      if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error ?? 'Could not submit'); return; }
      try { localStorage.removeItem(lsKey); } catch { /* ignore */ }
      setSubmitted(true);
      return;
    }
    const res = await fetch('/api/verse/section', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entity_type: entityType, entity_id: entityId, section, content, summary, minor, base_revision_id: force ? conflict?.revId ?? base : base }),
    });
    setPublishing(false);
    if (res.status === 409) {
      const d = await res.json();
      setConflict({ current: d.current, revId: d.current_revision_id });
      return;
    }
    if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error ?? 'Save failed'); return; }
    const d = await res.json();
    try { localStorage.removeItem(lsKey); } catch { /* ignore */ }
    onSaved(d.revision_id, content);
  }

  const insertImage = () => {
    const url = window.prompt('Image URL (official / press assets only):');
    if (!url) return;
    if (!isConfiguredImageHost(url)) { setError('That image host is not on the approved list.'); return; }
    editor?.chain().focus().setImage({ src: url }).run();
  };

  if (!editor) return <div className="p-4 text-sm text-secondary">Loading editor...</div>;

  if (submitted) return (
    <div className="rounded-xl border border-default bg-surface p-5 text-center" style={{ borderColor: 'var(--verse-line)', background: 'var(--verse-soft)' }}>
      <p className="text-sm font-bold" style={{ color: 'var(--verse-ink)' }}>Suggestion submitted for review</p>
      <p className="mt-1 text-sm text-secondary">A reviewer will check it. Thanks for improving this page.</p>
      <button onClick={onClose} className="mt-2 text-sm font-bold" style={{ color: 'var(--verse-ink)' }}>Close</button>
    </div>
  );

  const Btn = ({ on, active, label, disabled }: { on: () => void; active?: boolean; label: string; disabled?: boolean }) => (
    <button type="button" onMouseDown={(e) => { e.preventDefault(); on(); }} disabled={disabled}
      className="rounded px-2 py-1 text-xs font-semibold transition-colors"
      style={{ color: active ? 'var(--verse-accent-text)' : 'var(--text-secondary)', background: active ? 'var(--verse-accent)' : 'transparent' }}
      aria-pressed={active} aria-label={label}>{label}</button>
  );

  return (
    <div className="rounded-xl border border-default bg-surface" style={{ borderColor: 'var(--verse-line)' }}>
      {/* Restore banner */}
      {restore ? (
        <div className="flex items-center gap-2 border-b border-default px-3 py-2 text-xs" style={{ background: 'var(--verse-soft)' }}>
          <span className="text-secondary">Unsaved draft found.</span>
          <button className="font-bold" style={{ color: 'var(--verse-ink)' }} onClick={() => { editor.commands.setContent(restore as object); setRestore(null); }}>Restore it</button>
          <button className="text-tertiary" onClick={() => setRestore(null)}>Discard</button>
        </div>
      ) : null}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 border-b border-default px-2 py-1.5" style={{ borderColor: 'var(--verse-line)' }} role="toolbar" aria-label="Formatting">
        <Btn label="Bold" on={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} />
        <Btn label="Italic" on={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} />
        <span className="mx-1 h-4 w-px bg-[var(--verse-line)]" />
        <Btn label="H2" on={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} />
        <Btn label="H3" on={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })} />
        <span className="mx-1 h-4 w-px bg-[var(--verse-line)]" />
        <Btn label="List" on={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} />
        <Btn label="1. List" on={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} />
        <Btn label="Quote" on={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} />
        <span className="mx-1 h-4 w-px bg-[var(--verse-line)]" />
        <Btn label="Table" on={() => editor.chain().focus().insertTable({ rows: 2, cols: 2, withHeaderRow: true }).run()} />
        <Btn label="Image" on={insertImage} />
        <Btn label="Divider" on={() => editor.chain().focus().setHorizontalRule().run()} />
        {groupSlug ? (
          <>
            <span className="mx-1 h-4 w-px bg-[var(--verse-line)]" />
            <Btn label="+Disco" on={() => editor.chain().focus().insertContent({ type: 'verseEmbed', attrs: { kind: 'discography', group: groupSlug } }).run()} />
            <Btn label="+Quiz" on={() => editor.chain().focus().insertContent({ type: 'verseEmbed', attrs: { kind: 'quiz', group: groupSlug } }).run()} />
            <Btn label="+Stats" on={() => editor.chain().focus().insertContent({ type: 'verseEmbed', attrs: { kind: 'stats', group: groupSlug } }).run()} />
          </>
        ) : null}
        <span className="mx-1 h-4 w-px bg-[var(--verse-line)]" />
        <Btn label="Undo" on={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} />
        <Btn label="Redo" on={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} />
        <span className="ml-auto text-[11px] text-tertiary">{draftState === 'saving' ? 'Saving...' : draftState === 'saved' ? 'Draft saved' : draftState === 'error' ? 'Draft save failed' : ''}</span>
      </div>

      {/* Editing surface */}
      <div className="px-4 py-3">
        <EditorContent editor={editor} />
      </div>

      {/* Conflict panel */}
      {conflict ? (
        <div className="border-t border-default px-4 py-3 text-sm" style={{ background: 'var(--verse-soft)' }}>
          <p className="font-bold" style={{ color: 'var(--verse-ink)' }}>This section changed while you were editing.</p>
          <p className="mt-1 text-secondary">Your work is kept as a draft. Load the current version to merge by hand, or overwrite it with yours.</p>
          <div className="mt-2 flex gap-3">
            <button className="font-bold" style={{ color: 'var(--verse-ink)' }} onClick={() => { editor.commands.setContent(conflict.current as object); setBase(conflict.revId); setConflict(null); }}>Load current</button>
            <button className="font-bold text-secondary" onClick={() => publish(true)}>Overwrite with mine</button>
            <button className="text-tertiary" onClick={() => setConflict(null)}>Keep editing</button>
          </div>
        </div>
      ) : null}

      {/* Footer: summary + publish */}
      <div className="flex flex-wrap items-center gap-2 border-t border-default px-3 py-2" style={{ borderColor: 'var(--verse-line)' }}>
        <input value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Edit summary (what changed)"
          className="min-w-0 flex-1 rounded border border-default bg-transparent px-2 py-1 text-sm" style={{ borderColor: 'var(--verse-line)' }} aria-label="Edit summary" />
        <label className="flex items-center gap-1 text-xs text-secondary"><input type="checkbox" checked={minor} onChange={(e) => setMinor(e.target.checked)} /> minor</label>
        <button type="button" onClick={() => publish(false)} disabled={publishing}
          className="rounded-full px-4 py-1.5 text-sm font-bold disabled:opacity-50" style={{ background: 'var(--verse-accent)', color: 'var(--verse-accent-text)' }}>
          {publishing ? 'Saving...' : suggestMode ? 'Submit suggestion' : 'Publish'}
        </button>
        <button type="button" onClick={onClose} className="rounded-full px-3 py-1.5 text-sm font-semibold text-secondary hover:text-primary">Cancel</button>
        {error ? <span className="w-full text-xs text-[var(--wrong,#A32D2D)]">{error}</span> : null}
      </div>
    </div>
  );
}
