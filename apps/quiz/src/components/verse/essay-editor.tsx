'use client';

import { useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';

import { verseEditorExtensions } from '@/components/verse/editor/extensions';

const EMPTY_DOC = { type: 'doc', content: [{ type: 'paragraph' }] };

interface Props { groupId: number; initialId?: number | undefined; initialTitle?: string | undefined; initialContent?: unknown; initialStatus?: string | undefined }

/** W4.12 - member essay editor. Draft autosaves on Save; Submit sends it to the curator
 * review queue (not public until featured). Reuses the constrained Verse editor extensions. */
export function EssayEditor({ groupId, initialId, initialTitle, initialContent, initialStatus }: Props): React.ReactElement {
  const [id, setId] = useState<number | null>(initialId ?? null);
  const [title, setTitle] = useState(initialTitle ?? '');
  const [status, setStatus] = useState(initialStatus ?? 'draft');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const editor = useEditor({ extensions: verseEditorExtensions, content: (initialContent as object) ?? EMPTY_DOC, immediatelyRender: false });

  async function save(): Promise<number | null> {
    if (!title.trim()) { setMsg('Give it a title.'); return null; }
    setBusy(true); setMsg('');
    const res = await fetch('/api/verse/essays', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ group_id: groupId, id, title, content: editor?.getJSON() }) });
    setBusy(false);
    if (res.status === 401) { window.location.href = `/login?returnTo=${encodeURIComponent(window.location.pathname)}`; return null; }
    if (!res.ok) { setMsg((await res.json()).error ?? 'error'); return null; }
    const d = await res.json(); setId(d.id); setMsg('Draft saved.'); return d.id;
  }

  async function submit() {
    const savedId = id ?? await save();
    if (!savedId) return;
    setBusy(true);
    const res = await fetch('/api/verse/essays', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: savedId, action: 'submit' }) });
    setBusy(false);
    if (res.ok) { setStatus('submitted'); setMsg('Submitted for review. A curator will feature or return it.'); }
    else setMsg((await res.json()).error ?? 'error');
  }

  const Btn = ({ on, active, label }: { on: () => void; active?: boolean; label: string }): React.ReactElement => (
    <button type="button" onClick={on} aria-pressed={!!active} className="rounded px-2 py-1 text-xs font-semibold" style={{ background: active ? 'var(--verse-soft-strong)' : 'var(--verse-soft)', color: 'var(--verse-ink)' }}>{label}</button>
  );

  if (status === 'submitted') {
    return <p className="rounded-xl border border-dashed p-5 text-sm text-secondary" style={{ borderColor: 'var(--verse-line)' }}>{msg || 'Submitted for review.'}</p>;
  }

  return (
    <div className="verse-scope">
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Essay title" maxLength={160} className="mb-3 w-full rounded-lg border border-default bg-transparent px-3 py-2 text-lg font-bold" style={{ color: 'var(--verse-ink)' }} />
      {editor ? (
        <div className="mb-2 flex flex-wrap gap-1.5">
          <Btn label="B" active={editor.isActive('bold')} on={() => editor.chain().focus().toggleBold().run()} />
          <Btn label="I" active={editor.isActive('italic')} on={() => editor.chain().focus().toggleItalic().run()} />
          <Btn label="H2" active={editor.isActive('heading', { level: 2 })} on={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} />
          <Btn label="List" active={editor.isActive('bulletList')} on={() => editor.chain().focus().toggleBulletList().run()} />
          <Btn label="Quote" active={editor.isActive('blockquote')} on={() => editor.chain().focus().toggleBlockquote().run()} />
        </div>
      ) : null}
      <div className="verse-editor-area rounded-xl border border-default p-3" style={{ borderColor: 'var(--verse-line)' }}>
        <EditorContent editor={editor} />
      </div>
      <div className="mt-3 flex items-center gap-3">
        <button onClick={save} disabled={busy} className="rounded-lg border px-4 py-1.5 text-sm font-semibold" style={{ borderColor: 'var(--verse-line)', color: 'var(--verse-ink)' }}>Save draft</button>
        <button onClick={submit} disabled={busy} className="rounded-lg px-4 py-1.5 text-sm font-bold" style={{ background: 'var(--verse-accent)', color: 'var(--verse-accent-text)' }}>Submit for review</button>
        {msg ? <span className="text-xs text-secondary">{msg}</span> : null}
      </div>
      <p className="mt-2 text-xs text-tertiary">Essays are reviewed by curators before they appear. Fan-written and credited.</p>
    </div>
  );
}
