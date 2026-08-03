'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';

import { verseEditorExtensions } from '@/components/verse/editor/extensions';
import { CoverArt } from '@/components/verse/cover-art';
import { isConfiguredImageHost } from '@/lib/image-hosts';

const EMPTY_DOC = { type: 'doc', content: [{ type: 'paragraph' }] };

interface AlbumOpt { id: number; title: string; mbid: string | null }
interface SeriesOpt { id: number; title: string; slug: string | null; status: string }
interface Props {
  groupId: number; groupSlug: string; albums: AlbumOpt[];
  initialId?: number | undefined; initialTitle?: string | undefined; initialContent?: unknown;
  initialStatus?: string | undefined; initialCover?: { mbid?: string } | null; initialSeriesId?: number | null;
}

// V-ESSAYS-MAX step 4 - the long-form writing tool. The constrained registry
// editor (h2/h3, lists, pull-quote, divider, image-by-policy, widget embeds - no
// raw HTML) plus a cover picker (policy assets only: album art), a series picker
// (join approved or propose a new one for curator approval), and autosave. The
// existing draft -> submit -> review flow is unchanged.
export function EssayEditor({ groupId, groupSlug, albums, initialId, initialTitle, initialContent, initialStatus, initialCover, initialSeriesId }: Props): React.ReactElement {
  const [id, setId] = useState<number | null>(initialId ?? null);
  const [title, setTitle] = useState(initialTitle ?? '');
  const [status, setStatus] = useState(initialStatus ?? 'draft');
  const [coverMbid, setCoverMbid] = useState<string | null>(initialCover?.mbid ?? null);
  const [seriesId, setSeriesId] = useState<number | null>(initialSeriesId ?? null);
  const [series, setSeries] = useState<SeriesOpt[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const dirty = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saving = useRef(false);

  const doSave = useCallback(async (silent: boolean): Promise<number | null> => {
    if (!title.trim()) { if (!silent) setMsg('Give it a title.'); return null; }
    // In-flight guard: a save (especially the first, id=null) must not run twice
    // concurrently, or a brand-new essay would be created twice.
    if (saving.current) return null;
    saving.current = true;
    if (!silent) setBusy(true);
    try {
      const res = await fetch('/api/verse/essays', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ group_id: groupId, id, title, content: editorRef.current?.getJSON(), cover: coverMbid ? { mbid: coverMbid } : {}, series_id: seriesId }) });
      if (res.status === 401) { window.location.href = `/login?returnTo=${encodeURIComponent(window.location.pathname)}`; return null; }
      if (!res.ok) { setMsg((await res.json().catch(() => ({}))).error === 'membership_required' ? 'Join the space to write.' : 'Could not save. Try again.'); return null; }
      const d = await res.json(); setId(d.id); dirty.current = false; setMsg(silent ? 'Autosaved.' : 'Draft saved.'); return d.id;
    } finally { saving.current = false; if (!silent) setBusy(false); }
  }, [groupId, id, title, coverMbid, seriesId]);

  const scheduleSave = useCallback((): void => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => { if (dirty.current && title.trim()) void doSave(true); }, 2500);
  }, [doSave, title]);

  const editor = useEditor({
    extensions: verseEditorExtensions, content: (initialContent as object) ?? EMPTY_DOC, immediatelyRender: false,
    onUpdate: () => { dirty.current = true; scheduleSave(); },
  });
  const editorRef = useRef(editor);
  editorRef.current = editor;

  useEffect(() => {
    fetch(`/api/verse/essays/series?group_id=${groupId}`).then((r) => (r.ok ? r.json() : null)).then((d) => { if (d?.series) setSeries(d.series); }).catch(() => {});
  }, [groupId]);

  async function submit(): Promise<void> {
    const savedId = id ?? await doSave(false);
    if (!savedId) return;
    setBusy(true);
    const res = await fetch('/api/verse/essays', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: savedId, action: 'submit' }) });
    setBusy(false);
    if (res.ok) { setStatus('submitted'); setMsg('Submitted for review. A curator will feature or return it.'); }
    else setMsg((await res.json().catch(() => ({}))).error ?? 'Could not submit. Try again.');
  }

  async function proposeSeries(): Promise<void> {
    const t = window.prompt('New series name (a curator approves it before it shows publicly):');
    if (!t?.trim()) return;
    const res = await fetch('/api/verse/essays/series', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ group_id: groupId, title: t.trim() }) });
    const d = await res.json().catch(() => ({}));
    if (res.ok && d.series) { setSeries((s) => [...s, d.series]); setSeriesId(d.series.id); dirty.current = true; setMsg(d.series.status === 'approved' ? 'Series created.' : 'Series proposed; a curator will approve it.'); }
    else setMsg(d.error === 'membership_required' ? 'Join the space to propose a series.' : 'Could not propose the series.');
  }

  function insertImage(): void {
    const url = window.prompt('Image URL (official / press assets only):');
    if (!url) return;
    if (!isConfiguredImageHost(url)) { setMsg('That image host is not on the approved list.'); return; }
    editor?.chain().focus().setImage({ src: url }).run();
  }

  const Btn = ({ on, active, label, name }: { on: () => void; active?: boolean; label: string; name?: string }): React.ReactElement => (
    <button type="button" onClick={on} aria-pressed={active === undefined ? undefined : !!active} aria-label={name ?? label} className="v-tap rounded px-2 py-1 text-xs font-semibold" style={{ background: active ? 'var(--verse-soft-strong)' : 'var(--verse-soft)', color: 'var(--verse-ink)' }}>{label}</button>
  );

  if (status === 'submitted') {
    return <p className="rounded-xl border border-dashed p-5 text-sm text-secondary" style={{ borderColor: 'var(--verse-line)' }}>{msg || 'Submitted for review.'}</p>;
  }

  const coverAlbums = albums.filter((a) => a.mbid);

  return (
    <div className="verse-scope">
      <input value={title} onChange={(e) => { setTitle(e.target.value); dirty.current = true; scheduleSave(); }} placeholder="Essay title" maxLength={160} className="mb-3 w-full rounded-lg border border-default bg-transparent px-3 py-2 text-lg font-bold" style={{ color: 'var(--verse-ink)', fontFamily: 'var(--v-editorial-font)' }} />

      {/* Cover picker: policy assets only (album art). */}
      {coverAlbums.length ? (
        <div className="mb-3">
          <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-tertiary">Cover (optional, album art)</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => { setCoverMbid(null); dirty.current = true; scheduleSave(); }} aria-pressed={!coverMbid} className="v-tap flex h-14 w-14 items-center justify-center rounded-lg border text-[10px] font-semibold" style={{ borderColor: !coverMbid ? 'var(--verse-cta, var(--verse-accent))' : 'var(--verse-line)', color: 'var(--text-secondary)' }}>None</button>
            {coverAlbums.slice(0, 10).map((a) => (
              <button key={a.id} type="button" onClick={() => { setCoverMbid(a.mbid); dirty.current = true; scheduleSave(); }} aria-pressed={coverMbid === a.mbid} aria-label={`Cover: ${a.title}`} className="v-tap overflow-hidden rounded-lg" style={{ outline: coverMbid === a.mbid ? '2px solid var(--verse-cta, var(--verse-accent))' : '1px solid var(--verse-line)' }}>
                <CoverArt mbid={a.mbid} title={a.title} className="h-14 w-14" />
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {/* Series picker. */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <label className="text-[11px] font-bold uppercase tracking-wider text-tertiary" htmlFor="essay-series">Series</label>
        <select id="essay-series" value={seriesId ?? ''} onChange={(e) => { setSeriesId(e.target.value ? Number(e.target.value) : null); dirty.current = true; scheduleSave(); }} className="rounded-lg border bg-transparent px-2.5 py-1.5 text-sm" style={{ borderColor: 'var(--verse-line)', color: 'var(--verse-ink)' }}>
          <option value="">No series</option>
          {series.map((s) => <option key={s.id} value={s.id}>{s.title}{s.status === 'proposed' ? ' (pending)' : ''}</option>)}
        </select>
        <button type="button" onClick={() => void proposeSeries()} className="v-tap rounded-lg border px-3 py-1.5 text-xs font-semibold" style={{ borderColor: 'var(--verse-line)', color: 'var(--verse-ink)' }}>Propose new</button>
      </div>

      {editor ? (
        <div className="mb-2 flex flex-wrap gap-1.5">
          <Btn label="B" name="Bold" active={editor.isActive('bold')} on={() => editor.chain().focus().toggleBold().run()} />
          <Btn label="I" name="Italic" active={editor.isActive('italic')} on={() => editor.chain().focus().toggleItalic().run()} />
          <Btn label="H2" name="Heading 2" active={editor.isActive('heading', { level: 2 })} on={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} />
          <Btn label="H3" name="Heading 3" active={editor.isActive('heading', { level: 3 })} on={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} />
          <Btn label="List" name="Bullet list" active={editor.isActive('bulletList')} on={() => editor.chain().focus().toggleBulletList().run()} />
          <Btn label="Pull-quote" name="Pull quote" active={editor.isActive('blockquote')} on={() => editor.chain().focus().toggleBlockquote().run()} />
          <Btn label="Divider" name="Divider" on={() => editor.chain().focus().setHorizontalRule().run()} />
          <Btn label="Image" name="Insert image (policy)" on={insertImage} />
          <span aria-hidden className="mx-0.5 self-center text-tertiary">|</span>
          <Btn label="+Disco" name="Insert discography block" on={() => editor.chain().focus().insertContent({ type: 'verseEmbed', attrs: { kind: 'discography', group: groupSlug } }).run()} />
          <Btn label="+Stats" name="Insert stats block" on={() => editor.chain().focus().insertContent({ type: 'verseEmbed', attrs: { kind: 'stats', group: groupSlug } }).run()} />
        </div>
      ) : null}
      <div className="verse-editor-area rounded-xl border border-default p-3" style={{ borderColor: 'var(--verse-line)' }}>
        <EditorContent editor={editor} />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => void doSave(false)} disabled={busy} className="v-tap rounded-lg border px-4 py-1.5 text-sm font-semibold" style={{ borderColor: 'var(--verse-line)', color: 'var(--verse-ink)' }}>Save draft</button>
        <button type="button" onClick={() => void submit()} disabled={busy} className="v-tap rounded-lg px-4 py-1.5 text-sm font-bold" style={{ background: 'var(--verse-cta, var(--verse-accent))', color: 'var(--verse-cta-text, var(--verse-accent-text))' }}>Submit for review</button>
        {msg ? <span role="status" className="text-xs text-secondary">{msg}</span> : null}
      </div>
      <p className="mt-2 text-xs text-tertiary">Autosaves as you write. Essays are reviewed by curators before they appear, and credited to you.</p>
    </div>
  );
}
