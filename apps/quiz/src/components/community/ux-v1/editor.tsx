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
import { draftToDoc, validateDraft } from '@/lib/ux-v1/p8/draft';

import { useP8Viewer } from './viewer';

import type { Draft, EditorMode } from '@/lib/ux-v1/p8/draft';
import type { P8Features } from '@/lib/ux-v1/p8/types';

// The New post editor (DESIGN-SPEC 13.3 + 17.9, prototype sheet #editor): one sheet,
// four modes. Writes go through the EXISTING endpoints with their existing payloads:
//   Thread   POST /api/verse/threads { group_id, title, body }
//   Blog     GET/POST /api/verse/membership (join is the fan's own tap), then
//            POST /api/verse/essays { group_id, title, content } and
//            PATCH /api/verse/essays { id, action: 'submit' } (curator review, as today)
//   Debate   POST /api/ux-v1/p8/debates      (pending store: disabled until applied)
//   Challenge POST /api/ux-v1/p8/challenges  (pending store: disabled until applied)
// A guest gets the sign-in sheet at Post; the draft is kept and posting continues.

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

interface EditorCtx { open: (mode?: EditorMode) => void }
const Ctx = createContext<EditorCtx>({ open: () => {} });
export function useEditor(): EditorCtx { return useContext(Ctx); }

interface Result { id: string; label: string; sub: string; thumb: string | null }

function emptyDraft(mode: EditorMode, groupId: number | null): Draft {
  return { mode, groupId, title: '', body: '', question: '', options: ['', ''], days: '3', playId: null, message: '' };
}

async function send(method: 'POST' | 'PATCH', url: string, body: unknown): Promise<{ ok: boolean; status: number; data: Record<string, unknown> }> {
  try {
    const r = await fetch(url, { method, credentials: 'include', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
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
  if (c === 'blocked_term') return 'Some of that wording is not allowed here. Edit it and try again.';
  if (c === 'blocked') return 'You cannot post in this group.';
  if (c === 'too_long') return 'That is too long. Shorten it and try again.';
  if (c === 'membership_required') return 'Join the group space first.';
  if (c === 'not_live' || status === 503) return 'This kind of post opens soon.';
  return 'That did not post. Try again.';
}

export function EditorProvider({ children, groups, features }: { children: React.ReactNode; groups: EditorGroup[]; features: P8Features }): React.ReactElement {
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
  const uid = useId().replace(/:/g, '');
  const resumed = useRef(false);

  const defaultGroup = useMemo(() => groups.find((g) => g.slug === v.mainGroup)?.id ?? null, [groups, v.mainGroup]);

  const open = useCallback((m: EditorMode = 'thread') => {
    setErrors({});
    setJoinFor(null);
    setDraft((d) => ({ ...d, mode: m, groupId: d.groupId ?? defaultGroup }));
    setMode(m);
  }, [defaultGroup]);
  const close = useCallback(() => { setMode(null); setBusy(false); }, []);
  const ctx = useMemo(() => ({ open }), [open]);
  const set = <K extends keyof Draft>(k: K, val: Draft[K]): void => { setDraft((d) => ({ ...d, [k]: val })); setErrors((e) => ({ ...e, [k]: undefined })); };

  // Challenge mode: the fan's recent quiz runs (their own plays, read only).
  useEffect(() => {
    if (mode !== 'challenge' || !v.signedIn || results !== null) return;
    let off = false;
    fetch('/api/ux-v1/p8/my-results', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : { results: [] }))
      .then((d: { results?: Result[] }) => { if (!off) setResults(d.results ?? []); })
      .catch(() => { if (!off) setResults([]); });
    return () => { off = true; };
  }, [mode, v.signedIn, results]);

  const pending = (draft.mode === 'debate' && !features.fanDebates) || (draft.mode === 'challenge' && !features.challenges);

  const submit = useCallback(async (d: Draft): Promise<void> => {
    const errs = validateDraft(d);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    if (!v.signedIn) {
      signIn({ title: 'Sign in to post', sub: 'Your post appears in the feed with your passport. Your draft is kept.', action: { id: 'p8-post', payload: d } });
      return;
    }
    setBusy(true);
    const g = groups.find((x) => x.id === d.groupId);
    if (d.mode === 'thread') {
      const r = await send('POST', '/api/verse/threads', { group_id: d.groupId, title: d.title.trim(), body: d.body.trim() });
      setBusy(false);
      if (!r.ok) { setErrors({ form: errorLine(r.status, r.data.error) }); return; }
      close();
      setDraft(emptyDraft('thread', d.groupId));
      toast(g ? `Posted to ${g.name}` : 'Posted');
      router.push(`/community/thread/${String(r.data.id)}`);
      return;
    }
    if (d.mode === 'blog') {
      const m = await fetch(`/api/verse/membership?group_id=${d.groupId}`, { credentials: 'include' }).then((x) => x.json()).catch(() => null) as { member?: boolean; blocked?: boolean } | null;
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
  }, [v.signedIn, groups, signIn, toast, close, router]);

  // Back from sign-in: reopen with the kept draft and continue posting (16.6).
  useEffect(() => {
    if (!v.signedIn || resumed.current) return;
    resumed.current = true;
    const p = takePendingAction('p8-post');
    const d = p?.payload as Draft | undefined;
    if (!d || !d.mode) return;
    // Continue from the stored action (an external store), outside the effect body.
    queueMicrotask(() => { setDraft(d); setMode(d.mode); void submit(d); });
  }, [v.signedIn, submit]);

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
        <Segmented options={MODES} value={m} onChange={(x) => { setDraft((d) => ({ ...d, mode: x })); setMode(x); setErrors({}); setJoinFor(null); }} label="Post type" className="p8-modes4" />
        <p className="p8-help">{HEAD[m][1]}</p>

        <div className="ux-field">
          <label htmlFor={`p8-g-${uid}`}>Group</label>
          <GroupPicker id={`p8-g-${uid}`} groups={groups} value={draft.groupId} onChange={(id) => set('groupId', id)} invalid={!!errors.groupId} />
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
                  : !results.length ? <p className="p8-help">Play a quiz first: your recent scores show up here.</p>
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

/* ------------------------------------------------------------ group picker --- */

function GroupPicker({ id, groups, value, onChange, invalid }: { id: string; groups: EditorGroup[]; value: number | null; onChange: (id: number | null) => void; invalid: boolean }): React.ReactElement {
  const [q, setQ] = useState('');
  const [openList, setOpenList] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
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
        onChange={(e) => { setQ(e.target.value); setOpenList(true); setActive(0); }}
        onFocus={() => setOpenList(true)}
        onBlur={() => window.setTimeout(() => setOpenList(false), 120)}
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
          )) : <p className="p8-glist-empty">No group matches.</p>}
        </div>
      ) : null}
    </div>
  );
}
