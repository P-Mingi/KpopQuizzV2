'use client';

import { useRouter } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState } from 'react';

import { Icon } from '@/components/ux-v1/icon';
import { Segmented } from '@/components/ux-v1/segmented';
import { Sheet } from '@/components/ux-v1/sheet';
import { useSignIn } from '@/components/ux-v1/sign-in-sheet';
import { useUxToast } from '@/components/ux-v1/toast';
import { groupPhotoUrl } from '@/lib/ux-v1/a0/group-photos';
import { takePendingAction } from '@/lib/ux-v1/a0/pending-action';
import { draftToDoc, editorModes, validateDraft } from '@/lib/ux-v1/p8/draft';

import { useP8Viewer } from './viewer';

import type { Draft, EditorMode } from '@/lib/ux-v1/p8/draft';
import type { P8Features } from '@/lib/ux-v1/p8/types';
import type { VerseScope } from '@/lib/ux-v1/p8/verse-gate';

// FandomVerse: this build's base path, inlined by Next at build time ('' on kpop and hub, so the code is today's; '/anime' on the anime build).
const BASE_PATH = process.env.__NEXT_ROUTER_BASEPATH || '';

// The New post editor (DESIGN-SPEC 13.3 + 17.9, prototype sheet #editor): one sheet,
// four modes. Writes go through the EXISTING endpoints with their existing payloads:
//   Thread   POST /api/verse/threads { group_id, title, body }
//   Blog     GET/POST /api/verse/membership (join is the fan's own tap), then
//            POST /api/verse/essays { group_id, title, content } and
//            PATCH /api/verse/essays { id, action: 'submit' } (curator review, as today)
//   Debate   POST /api/ux-v1/p8/debates      (pending store: disabled until applied)
//   Challenge POST /api/ux-v1/p8/challenges  (pending store: disabled until applied)
// A guest gets the sign-in sheet at Post; the draft is kept and posting continues.
// Verse gates (lib/ux-v1/p8/verse-gate): Thread and Blog write to the Verse, so they exist
// only while the Verse is public, and their group picker lists the live spaces only.
// v12 (owner, 2026-10-06, `community`): Thread and Blog are community posts instead, for
// every group and General K-pop, the Verse open or not: { origin: 'community' } on the same
// routes; a blog is published at once (no space to join, no review); both may carry a photo,
// shrunk to a JPEG here and checked on the server (POST /api/ux-v1/p8/photo) before posting.
// /community?compose=<mode> opens the sheet in that mode on arrival; with
// compose=challenge&quiz=<slug> (P5's create done link) the score picker lists the
// fan's runs of that quiz and preselects the latest one.

export interface EditorGroup { id: number; name: string; slug: string }

const MODES: { value: EditorMode; label: string }[] = [
  { value: 'thread', label: 'Thread' }, { value: 'blog', label: 'Blog' },
  { value: 'debate', label: 'Debate' }, { value: 'challenge', label: 'Challenge' },
];
const HEAD: Record<EditorMode, [string, string]> = {
  thread: ['New thread', 'Ask a question or start a discussion.'],
  blog: ['New blog', 'A longer piece. Blogs get their own tab and are reviewed before they go public.'],
  debate: ['New debate', 'Two to four options. Fans vote, results show after voting.'],
  challenge: ['New challenge', 'Pick one of your scores. Fans play the same quiz and reply with theirs.'],
};
const DAYS: { value: '1' | '3' | '7'; label: string }[] = [{ value: '1', label: '1 day' }, { value: '3', label: '3 days' }, { value: '7', label: '7 days' }];

interface EditorCtx { open: (mode?: EditorMode) => void; modes: EditorMode[] }
const Ctx = createContext<EditorCtx>({ open: () => {}, modes: [] });
export function useEditor(): EditorCtx { return useContext(Ctx); }

interface Result { id: string; label: string; sub: string; thumb: string | null }
const QUIZ_SLUG = /^[a-z0-9][a-z0-9-]{0,150}$/i;

const BLOG_NOW = 'A longer piece. It is published right away, with your name.';

function emptyDraft(mode: EditorMode, groupId: number | null): Draft {
  return { mode, groupId, title: '', body: '', question: '', options: ['', ''], days: '3', playId: null, message: '', photo: null };
}

async function send(method: 'POST' | 'PATCH', url: string, body: unknown): Promise<{ ok: boolean; status: number; data: Record<string, unknown> }> {
  try {
    const r = await fetch(BASE_PATH ? BASE_PATH + url : url, { method, credentials: 'include', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    return { ok: r.ok, status: r.status, data: (await r.json().catch(() => ({}))) as Record<string, unknown> };
  } catch {
    return { ok: false, status: 0, data: {} };
  }
}

/** Human line for an API error code (existing routes' codes). */
function errorLine(status: number, code: unknown): string {
  const c = String(code ?? '');
  if (status === 401) return 'Sign in to post.';
  if (c === 'rate_limited' || status === 429) return 'You are posting fast. Try again in a few minutes.';
  if (c === 'new_account_no_links') return 'New accounts can post links after their first day.';
  if (c === 'blocked_term') return 'This has words that are not allowed here (insults or sexual content). Edit them and try again. Nothing was posted.';
  if (c === 'nsfw_image') return 'This photo cannot be posted here. Pick another one.';
  if (c === 'bad_photo') return 'That photo is no longer available. Add it again.';
  if (c === 'bad_group') return 'Pick a group.';
  if (c === 'blocked') return 'You cannot post in this group.';
  if (c === 'too_long') return 'That is too long. Shorten it and try again.';
  if (c === 'membership_required') return 'Join the group space first.';
  if (c === 'not_live' || status === 503) return 'This kind of post opens soon.';
  return 'That did not post. Try again.';
}

const isVerseMode = (m: EditorMode): boolean => m === 'thread' || m === 'blog';

export function EditorProvider({ children, groups, features, verse, community = false }: { children: React.ReactNode; groups: EditorGroup[]; features: P8Features; verse: VerseScope; community?: boolean }): React.ReactElement {
  const [mode, setMode] = useState<EditorMode | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft('thread', null));
  const v = useP8Viewer();
  const signIn = useSignIn();
  const toast = useUxToast();
  const router = useRouter();
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const [busy, setBusy] = useState(false);
  const [joinFor, setJoinFor] = useState<EditorGroup | null>(null);
  const [results, setResults] = useState<Result[] | null>(null);
  // The quiz a challenge is attached to (?quiz=<slug>), and its title once read.
  const [attach, setAttach] = useState<string | null>(null);
  const [attachTitle, setAttachTitle] = useState<string | null>(null);
  const uid = useId().replace(/:/g, '');
  const resumed = useRef(false);
  const composed = useRef(false);

  const verseIds = useMemo(() => new Set(verse.groupIds), [verse.groupIds]);
  const modes = useMemo(() => editorModes((verse.open && verse.groupIds.length > 0) || community, features), [verse.open, verse.groupIds.length, features, community]);
  const modeOptions = useMemo(() => MODES.filter((x) => modes.includes(x.value)), [modes]);
  /** A group a mode may post to: Thread and Blog only in a live space (any group as community posts). */
  const groupFor = useCallback((m: EditorMode, id: number | null): number | null => (id !== null && isVerseMode(m) && !community && !verseIds.has(id) ? null : id), [verseIds, community]);
  const defaultGroup = useMemo(() => groups.find((g) => g.slug === v.mainGroup)?.id ?? null, [groups, v.mainGroup]);

  const open = useCallback((want?: EditorMode) => {
    const m = want && modes.includes(want) ? want : modes[0];
    if (!m) return; // nothing can be posted: the composer is hidden too
    setErrors({});
    setJoinFor(null);
    setDraft((d) => ({ ...d, mode: m, groupId: groupFor(m, d.groupId ?? defaultGroup) }));
    setMode(m);
  }, [modes, groupFor, defaultGroup]);
  const close = useCallback(() => { setMode(null); setBusy(false); }, []);
  const ctx = useMemo(() => ({ open, modes }), [open, modes]);
  const set = <K extends keyof Draft>(k: K, val: Draft[K]): void => { setDraft((d) => ({ ...d, [k]: val })); setErrors((e) => ({ ...e, [k]: undefined })); };

  // Arrival with ?compose=<mode>[&quiz=<slug>]: open the sheet in that mode once, then
  // drop the two params from the address so a reload or Back does not reopen it.
  useEffect(() => {
    if (composed.current) return;
    composed.current = true;
    const q = new URLSearchParams(window.location.search);
    const m = modes.find((x) => x === q.get('compose'));
    if (!m) return; // unknown, or not available (a Verse mode while the Verse is hidden)
    const slug = m === 'challenge' ? q.get('quiz') : null;
    q.delete('compose');
    q.delete('quiz');
    const rest = q.toString();
    window.history.replaceState(window.history.state, '', `${window.location.pathname}${rest ? `?${rest}` : ''}${window.location.hash}`);
    // Read from the address (an external source), applied outside the effect body.
    queueMicrotask(() => { if (slug && QUIZ_SLUG.test(slug)) setAttach(slug); open(m); });
  }, [open, modes]);

  // Challenge mode: the fan's recent quiz runs (their own plays, read only); with an
  // attached quiz, only the runs of that quiz, the latest one preselected.
  useEffect(() => {
    if (mode !== 'challenge' || !v.signedIn || results !== null) return;
    let off = false;
    fetch(attach ? `${BASE_PATH}/api/ux-v1/p8/my-results?quiz=${encodeURIComponent(attach)}` : `${BASE_PATH}/api/ux-v1/p8/my-results`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : { results: [] }))
      .then((d: { results?: Result[]; quiz?: { title: string } | null }) => {
        if (off) return;
        const list = d.results ?? [];
        setResults(list);
        setAttachTitle(d.quiz?.title ?? null);
        const first = list[0];
        if (attach && first) setDraft((x) => (x.playId ? x : { ...x, playId: first.id }));
      })
      .catch(() => { if (!off) setResults([]); });
    return () => { off = true; };
  }, [mode, v.signedIn, results, attach]);
  const allScores = (): void => { setAttach(null); setAttachTitle(null); setResults(null); set('playId', null); };

  const pending = (draft.mode === 'debate' && !features.fanDebates) || (draft.mode === 'challenge' && !features.challenges);

  const submit = useCallback(async (d: Draft): Promise<void> => {
    const errs = validateDraft(d);
    // A Verse mode posts only to a live space (a kept draft may predate a gate change).
    if (isVerseMode(d.mode) && d.groupId !== null && groupFor(d.mode, d.groupId) === null) errs.groupId = 'Pick a group.';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    if (!v.signedIn) {
      signIn({ title: 'Sign in to post', sub: 'Your post appears in the feed with your passport. Your draft is kept.', action: { id: 'p8-post', payload: d } });
      return;
    }
    setBusy(true);
    const g = groups.find((x) => x.id === d.groupId);
    const extra = community ? { origin: 'community', ...(d.photo ? { cover: { assetPath: d.photo.assetPath } } : {}) } : {};
    if (d.mode === 'thread') {
      const r = await send('POST', '/api/verse/threads', { group_id: d.groupId, title: d.title.trim(), body: d.body.trim(), ...extra });
      setBusy(false);
      if (!r.ok) { setErrors({ form: errorLine(r.status, r.data.error) }); return; }
      close();
      setDraft(emptyDraft('thread', d.groupId));
      toast(g ? `Posted to ${g.name}` : 'Posted');
      router.push(`/community/thread/${String(r.data.id)}`);
      return;
    }
    if (d.mode === 'blog' && community) {
      const c = await send('POST', '/api/verse/essays', { group_id: d.groupId, title: d.title.trim(), content: draftToDoc(d.body), ...extra });
      setBusy(false);
      if (!c.ok || typeof c.data.id !== 'number') { setErrors({ form: errorLine(c.status, c.data.error) }); return; }
      close();
      setDraft(emptyDraft('blog', d.groupId));
      toast(g ? `Blog posted to ${g.name}` : 'Blog posted');
      router.push(`/community/blog/${String(c.data.id)}`);
      return;
    }
    if (d.mode === 'blog') {
      const m = await fetch(`${BASE_PATH}/api/verse/membership?group_id=${d.groupId}`, { credentials: 'include' }).then((x) => x.json()).catch(() => null) as { member?: boolean; blocked?: boolean } | null;
      if (m?.blocked) { setBusy(false); setErrors({ form: errorLine(403, 'blocked') }); return; }
      if (!m?.member) { setBusy(false); setJoinFor(g ?? null); return; }
      const c = await send('POST', '/api/verse/essays', { group_id: d.groupId, title: d.title.trim(), content: draftToDoc(d.body) });
      if (!c.ok || typeof c.data.id !== 'number') { setBusy(false); setErrors({ form: errorLine(c.status, c.data.error) }); return; }
      const s = await send('PATCH', '/api/verse/essays', { id: c.data.id, action: 'submit' });
      setBusy(false);
      if (!s.ok) { setErrors({ form: `Saved as a draft, not sent for review: ${errorLine(s.status, s.data.error)}` }); return; }
      close();
      setDraft(emptyDraft('blog', d.groupId));
      toast('Sent for review. A curator publishes it.');
      return;
    }
    if (d.mode === 'debate') {
      const r = await send('POST', '/api/ux-v1/p8/debates', { group_id: d.groupId, question: d.question.trim(), options: d.options.map((o) => o.trim()).filter(Boolean), days: Number(d.days) });
      setBusy(false);
      if (!r.ok) { setErrors({ form: errorLine(r.status, r.data.error) }); return; }
      close();
      setDraft(emptyDraft('debate', d.groupId));
      toast('Debate posted');
      router.push(`/community/debate/${String(r.data.id)}`);
      return;
    }
    const r = await send('POST', '/api/ux-v1/p8/challenges', { play_id: d.playId, message: d.message.trim() || null });
    setBusy(false);
    if (!r.ok) { setErrors({ form: errorLine(r.status, r.data.error) }); return; }
    close();
    setDraft(emptyDraft('challenge', d.groupId));
    toast('Challenge posted');
    router.push(`/community/challenge/${String(r.data.id)}`);
  }, [v.signedIn, groups, signIn, toast, close, router, groupFor, community]);

  // Back from sign-in: reopen with the kept draft and continue posting (16.6).
  useEffect(() => {
    if (!v.signedIn || resumed.current) return;
    resumed.current = true;
    const p = takePendingAction('p8-post');
    const d = p?.payload as Draft | undefined;
    // Signed in to add a photo: the draft comes back open, nothing is posted yet.
    const kept = takePendingAction('p8-draft')?.payload as Draft | undefined;
    if (!d && kept && kept.mode && modes.includes(kept.mode)) { queueMicrotask(() => { setDraft(kept); setMode(kept.mode); }); return; }
    if (!d || !d.mode || !modes.includes(d.mode)) return;
    // Continue from the stored action (an external store), outside the effect body.
    queueMicrotask(() => { setDraft(d); setMode(d.mode); void submit(d); });
  }, [v.signedIn, submit, modes]);

  const join = async (): Promise<void> => {
    if (!joinFor) return;
    setBusy(true);
    const r = await send('POST', '/api/verse/membership', { group_id: joinFor.id, action: 'join' });
    setBusy(false);
    if (!r.ok) { setErrors({ form: errorLine(r.status, r.data.error) }); return; }
    toast(`You joined the ${joinFor.name} space`);
    setJoinFor(null);
    void submit(draft);
  };

  const m = mode ?? draft.mode;
  return (
    <Ctx value={ctx}>
      {children}
      <Sheet open={mode !== null} onClose={close} title={HEAD[m][0]} width={640} className="p8-ed">
        <Segmented options={modeOptions} value={m} onChange={(x) => { setDraft((d) => ({ ...d, mode: x, groupId: groupFor(x, d.groupId) })); setMode(x); setErrors({}); setJoinFor(null); }} label="Post type" className="p8-modes4" />
        <p className="p8-help">{m === 'blog' && community ? BLOG_NOW : HEAD[m][1]}</p>

        <div className="ux-field">
          <label htmlFor={`p8-g-${uid}`}>Group</label>
          <GroupPicker id={`p8-g-${uid}`} groups={isVerseMode(m) && !community ? groups.filter((g) => verseIds.has(g.id)) : groups} value={draft.groupId} onChange={(id) => set('groupId', id)} invalid={!!errors.groupId}
            empty={isVerseMode(m) && !community ? 'No open fandom space matches.' : 'No group matches.'} />
          {errors.groupId ? <p className="p8-ed-err">{errors.groupId}</p> : null}
        </div>

        {m === 'thread' || m === 'blog' ? (
          <>
            <div className="ux-field">
              <label htmlFor={`p8-t-${uid}`}>Title</label>
              <input id={`p8-t-${uid}`} className="ux-inp" value={draft.title} maxLength={m === 'blog' ? 160 : 140} placeholder={m === 'blog' ? 'Every era, ranked' : 'Which album should a new fan start with?'}
                aria-invalid={errors.title ? true : undefined} onChange={(e) => set('title', e.target.value)} />
              {errors.title ? <p className="p8-ed-err">{errors.title}</p> : null}
            </div>
            <div className="ux-field">
              <label htmlFor={`p8-b-${uid}`}>Text{m === 'thread' ? <small>Optional</small> : null}</label>
              <textarea id={`p8-b-${uid}`} className="ux-inp" value={draft.body} maxLength={m === 'blog' ? 20000 : 2000} rows={m === 'blog' ? 8 : 4} placeholder="Say more"
                aria-invalid={errors.body ? true : undefined} onChange={(e) => set('body', e.target.value)} />
              {errors.body ? <p className="p8-ed-err">{errors.body}</p> : null}
            </div>
            {community ? (
              <PhotoField id={`p8-p-${uid}`} photo={draft.photo ?? null} onChange={(ph) => set('photo', ph)} signedIn={v.signedIn === true}
                onSignIn={() => signIn({ title: 'Sign in to add a photo', sub: 'Photos are checked before they are posted. Your draft is kept.', action: { id: 'p8-draft', payload: draft } })} />
            ) : null}
          </>
        ) : null}

        {m === 'debate' ? (
          <>
            <div className="ux-field">
              <label htmlFor={`p8-q-${uid}`}>Question</label>
              <input id={`p8-q-${uid}`} className="ux-inp" value={draft.question} maxLength={160} placeholder="Best 4th gen title track of 2024?"
                aria-invalid={errors.question ? true : undefined} onChange={(e) => set('question', e.target.value)} />
              {errors.question ? <p className="p8-ed-err">{errors.question}</p> : null}
            </div>
            <div className="ux-field">
              <div className="ux-flabel" id={`p8-o-${uid}`}>Options <small>2 to 4</small></div>
              <div className="p8-opts-in" role="group" aria-labelledby={`p8-o-${uid}`}>
                {draft.options.map((o, i) => (
                  <input key={i} className="ux-inp" value={o} maxLength={80} placeholder={`Option ${i + 1}`} aria-label={`Option ${i + 1}`}
                    aria-invalid={errors.options && !o.trim() && i < 2 ? true : undefined}
                    onChange={(e) => set('options', draft.options.map((x, j) => (j === i ? e.target.value : x)))} />
                ))}
              </div>
              {draft.options.length < 4 ? (
                <button type="button" className="ux-lnk p8-addopt" onClick={() => set('options', [...draft.options, ''])}><Icon name="plus" />Add an option</button>
              ) : null}
              {errors.options ? <p className="p8-ed-err">{errors.options}</p> : null}
            </div>
            <div className="ux-field">
              <div className="ux-flabel">Closes in</div>
              <Segmented options={DAYS} value={draft.days} onChange={(x) => set('days', x)} label="Closes in" />
            </div>
          </>
        ) : null}

        {m === 'challenge' ? (
          <>
            <div className="ux-field">
              <div className="ux-flabel" id={`p8-r-${uid}`}>Your score to beat</div>
              {!v.signedIn ? <p className="p8-help">Sign in to pick one of your recent scores.</p>
                : results === null ? <p className="p8-help">Loading your recent scores...</p>
                  : !results.length ? (attach
                    ? <p className="p8-help">No score on {attachTitle ?? 'this quiz'} yet. <a className="ux-lnk" href={`${BASE_PATH}/q/${encodeURIComponent(attach)}`}>Play it once</a> and your score becomes the one to beat.</p>
                    : <p className="p8-help">Play a quiz first: your recent scores show up here.</p>)
                    : (
                      <div className="p8-opts" role="radiogroup" aria-labelledby={`p8-r-${uid}`}>
                        {results.map((r) => (
                          <label key={r.id} className="p8-opt">
                            <input type="radio" name={`p8-res-${uid}`} checked={draft.playId === r.id} onChange={() => set('playId', r.id)} />
                            <span className="p8-rd" aria-hidden="true" />
                            <span className="ux-thumb" aria-hidden="true">
                              {/* eslint-disable-next-line @next/next/no-img-element -- 48 x 36 thumb of the fan's own quiz, lazy */}
                              {r.thumb ? <img src={r.thumb} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Icon name="play" size="sm" />}
                            </span>
                            <span><b>{r.label}</b><small>{r.sub}</small></span>
                          </label>
                        ))}
                      </div>
                    )}
              {v.signedIn && attach && results !== null ? <button type="button" className="ux-lnk p8-allres" onClick={allScores}>Show all my recent scores</button> : null}
              {errors.playId ? <p className="p8-ed-err">{errors.playId}</p> : null}
            </div>
            <div className="ux-field">
              <label htmlFor={`p8-m-${uid}`}>Message <small>Optional</small></label>
              <input id={`p8-m-${uid}`} className="ux-inp" value={draft.message} maxLength={280} placeholder="Your turn." onChange={(e) => set('message', e.target.value)} />
            </div>
          </>
        ) : null}

        {joinFor ? (
          <div className="ux-field p8-join" role="status">
            <p className="p8-help" style={{ marginTop: 0 }}>Blogs are written by members of a group space. Join the {joinFor.name} space to post this one.</p>
            <button type="button" className="ux-btn ux-btn-ghost" style={{ marginTop: 10 }} onClick={() => { void join(); }} disabled={busy}>Join {joinFor.name}</button>
          </div>
        ) : null}
        {errors.form ? <p className="p8-ed-err" role="alert">{errors.form}</p> : null}
        <div style={{ height: 24 }} aria-hidden="true" />
        <div className="p8-ed-foot" style={{ padding: 0 }}>
          {pending ? <p className="p8-ed-note">{m === 'debate' ? 'Fan debates open soon. Vote on the daily debate meanwhile.' : 'Challenge posts open soon. Challenge a friend from any results screen meanwhile.'}</p> : null}
          <button type="button" className="ux-btn ux-btn-ghost" onClick={close}>Cancel</button>
          <button type="button" className="ux-btn ux-btn-primary" disabled={busy || pending} onClick={() => { void submit({ ...draft, mode: m }); }}>
            {busy ? 'Posting...' : 'Post'}
          </button>
        </div>
      </Sheet>
    </Ctx>
  );
}

/* ------------------------------------------------------------- photo field --- */

const MAX_SIDE = 1600;

/** The chosen picture as a JPEG of at most 1600 px a side (also drops its EXIF data). */
async function toJpeg(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const scale = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bmp.width * scale));
  canvas.height = Math.max(1, Math.round(bmp.height * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('no_canvas');
  ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  bmp.close();
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('no_blob'))), 'image/jpeg', 0.86));
}

/** Photo of a community thread or blog: picked, shrunk here, checked and stored by the
 *  server before the post exists (nothing is posted with a refused photo). */
function PhotoField({ id, photo, onChange, signedIn, onSignIn }: { id: string; photo: { assetPath: string; url: string } | null; onChange: (p: { assetPath: string; url: string } | null) => void; signedIn: boolean; onSignIn: () => void }): React.ReactElement {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const pick = async (file: File | undefined): Promise<void> => {
    if (!file) return;
    setError(null);
    if (!file.type.startsWith('image/')) { setError('Pick a photo (JPEG, PNG or WebP).'); return; }
    setBusy(true);
    try {
      const jpeg = await toJpeg(file);
      const r = await fetch(`${BASE_PATH}/api/ux-v1/p8/photo`, { method: 'POST', credentials: 'include', headers: { 'content-type': 'image/jpeg' }, body: jpeg });
      const data = (await r.json().catch(() => ({}))) as { assetPath?: string; url?: string; error?: string };
      if (r.ok && data.assetPath && data.url) onChange({ assetPath: data.assetPath, url: data.url });
      else if (data.error === 'nsfw_image') setError('This photo cannot be posted here. Pick another one.');
      else if (r.status === 413 || data.error === 'too_big') setError('That photo is too large. Pick a smaller one.');
      else if (r.status === 429) setError('You added many photos in a short time. Try again later.');
      else if (r.status === 401) setError('Sign in to add a photo.');
      else setError('The photo could not be added. Try again.');
    } catch {
      setError('That file could not be read as a photo.');
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  };
  return (
    <div className="ux-field p8-photo">
      <label htmlFor={id}>Photo <small>Optional</small></label>
      {photo ? (
        <div className="p8-photo-prev">
          {/* eslint-disable-next-line @next/next/no-img-element -- the checked photo just uploaded, shown at its stored address */}
          <img src={photo.url} alt="The photo of your post" />
          <button type="button" className="ux-btn ux-btn-ghost ux-btn-sm" onClick={() => onChange(null)}>Remove the photo</button>
        </div>
      ) : (
        <>
          <input ref={input} id={id} type="file" accept="image/jpeg,image/png,image/webp" className="ux-sr" disabled={busy}
            onChange={(e) => { void pick(e.target.files?.[0]); }} />
          <button type="button" className="ux-btn ux-btn-ghost p8-photo-btn" disabled={busy} aria-busy={busy || undefined}
            onClick={() => { if (!signedIn) { onSignIn(); return; } input.current?.click(); }}>
            <Icon name="img" />{busy ? 'Checking the photo...' : 'Add a photo'}
          </button>
        </>
      )}
      {error ? <p className="p8-ed-err" role="alert">{error}</p> : null}
    </div>
  );
}

/* ------------------------------------------------------------ group picker --- */

function GroupPicker({ id, groups, value, onChange, invalid, empty }: { id: string; groups: EditorGroup[]; value: number | null; onChange: (id: number | null) => void; invalid: boolean; empty: string }): React.ReactElement {
  const [q, setQ] = useState('');
  const [openList, setOpenList] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  // Closing on blur waits a beat (a click on an option lands first); a new focus or
  // keystroke cancels a pending close, so the list never shuts under the fan's typing.
  const blurT = useRef<number | undefined>(undefined);
  const keepOpen = (): void => { window.clearTimeout(blurT.current); setOpenList(true); };
  const sel = groups.find((g) => g.id === value) ?? null;
  const listId = `${id}-list`;
  const matches = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (s ? groups.filter((g) => g.name.toLowerCase().includes(s)) : groups).slice(0, 50);
  }, [q, groups]);

  const pick = (g: EditorGroup): void => { onChange(g.id); setQ(''); setOpenList(false); };
  const onKey = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpenList(true); setActive((a) => Math.min(matches.length - 1, a + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
    else if (e.key === 'Enter' && openList && matches[active]) { e.preventDefault(); pick(matches[active]!); }
    else if (e.key === 'Escape' && openList) { e.stopPropagation(); e.preventDefault(); setOpenList(false); }
    else if (e.key === 'Backspace' && !q && sel) onChange(null);
  };

  return (
    <div className="p8-gbox" style={invalid ? { borderColor: 'var(--ux-no)' } : undefined}>
      {sel ? (
        <span className="p8-gchip">
          <span className="ux-gav" aria-hidden="true" style={groupPhotoUrl(sel.slug) ? { backgroundImage: `url("${groupPhotoUrl(sel.slug)}")` } : undefined}>{groupPhotoUrl(sel.slug) ? null : sel.name.charAt(0)}</span>
          {sel.name}
          <button type="button" aria-label={`Remove ${sel.name}`} onClick={() => { onChange(null); inputRef.current?.focus(); }}><Icon name="x" /></button>
        </span>
      ) : null}
      <input
        ref={inputRef}
        id={id}
        role="combobox"
        aria-expanded={openList}
        aria-controls={openList ? listId : undefined}
        aria-autocomplete="list"
        aria-activedescendant={openList && matches[active] ? `${listId}-${matches[active]!.id}` : undefined}
        aria-invalid={invalid || undefined}
        placeholder={sel ? 'Change group' : 'Search groups'}
        value={q}
        onChange={(e) => { setQ(e.target.value); keepOpen(); setActive(0); }}
        onFocus={keepOpen}
        onBlur={() => { blurT.current = window.setTimeout(() => setOpenList(false), 120); }}
        onKeyDown={onKey}
        autoComplete="off"
      />
      {openList ? (
        <div className="p8-glist" id={listId} role="listbox" aria-label="Groups">
          {matches.length ? matches.map((g, i) => (
            <div key={g.id} id={`${listId}-${g.id}`} role="option" aria-selected={i === active} onMouseDown={(e) => { e.preventDefault(); pick(g); }} onMouseEnter={() => setActive(i)}>
              <span className="ux-gav" aria-hidden="true" style={groupPhotoUrl(g.slug) ? { backgroundImage: `url("${groupPhotoUrl(g.slug)}")` } : undefined}>{groupPhotoUrl(g.slug) ? null : g.name.charAt(0)}</span>
              {g.name}
            </div>
          )) : <p className="p8-glist-empty">{empty}</p>}
        </div>
      ) : null}
    </div>
  );
}
