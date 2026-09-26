'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';

import { UxAvatar } from '@/components/ux-v1/avatar';
import { PersonName } from '@/components/ux-v1/person-name';
import { useUxToast } from '@/components/ux-v1/toast';
import { takePendingAction } from '@/lib/ux-v1/a0/pending-action';
import { paragraphs } from '@/lib/ux-v1/p8/format';

import { LikeButton } from './actions';
import { useP8Viewer, useRequireAuth } from './viewer';

import type { P8Comment, P8Post } from '@/lib/ux-v1/p8/post';

// Replies of a post (DESIGN-SPEC 13.4, 16.7 Post, 17.7): the reply box (grows on
// focus, context chip, Reply), then the replies with one level of nesting, a heart +
// count per reply (once the likes store is live) and "Show N more replies". Writes:
//   thread   POST /api/verse/discussions { thread_id, body, parent_id? }
//   blog     POST /api/verse/discussions { entity_type: 'essay', entity_id, body, parent_id? }
//   debate   the daily debate's reply rides with the vote (POST /api/debate/vote
//            { side, comment }: one vote and one reply per fan per day)
//   fan debate / challenge  POST /api/ux-v1/p8/replies (pending store)

const FIRST = 4;
const MORE = 10;
/** A reply posted outside the list (the daily debate's vote + reply) joins the list. */
export const REPLY_EVENT = 'p8:reply';

type ReplyTo = NonNullable<P8Post['replyTo']>;

async function postJson(url: string, body: unknown): Promise<{ ok: boolean; status: number; data: Record<string, unknown> }> {
  try {
    const r = await fetch(url, { method: 'POST', credentials: 'include', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    return { ok: r.ok, status: r.status, data: (await r.json().catch(() => ({}))) as Record<string, unknown> };
  } catch { return { ok: false, status: 0, data: {} }; }
}

function errorLine(status: number, code: unknown): string {
  const c = String(code ?? '');
  if (c === 'rate_limited' || status === 429) return 'You are replying fast. Try again in a minute.';
  if (c === 'new_account_no_links') return 'New accounts can post links after their first day.';
  if (c === 'blocked_term') return 'Some of that wording is not allowed here.';
  if (c === 'blocked') return 'You cannot reply in this group.';
  if (c === 'too_long' || c === 'comment_too_long') return 'That reply is too long.';
  if (status === 503) return 'Replies here open soon.';
  return 'Your reply did not post. Try again.';
}

/** Where a reply goes, with its existing payload. */
export function replyRequest(to: ReplyTo, body: string, parentId: string | null): { url: string; payload: Record<string, unknown> } | null {
  if (to.store === 'verse') {
    const base = to.thread_id ? { thread_id: to.thread_id } : { entity_type: to.entity_type, entity_id: to.entity_id };
    return { url: '/api/verse/discussions', payload: { ...base, body, ...(parentId ? { parent_id: Number(parentId) } : {}) } };
  }
  if (to.store === 'community') {
    return { url: '/api/ux-v1/p8/replies', payload: { target_type: to.target_type, target_id: to.target_id, body, ...(parentId ? { parent_id: Number(parentId) } : {}) } };
  }
  return null; // daily debate: the reply rides with the vote
}

export function ReplyBox({ to, placeholder, chip, onPosted, parentId = null, autoFocus = false, compact = false, pendingKey }: {
  to: ReplyTo; placeholder: string; chip: string | null; onPosted: (c: P8Comment) => void; parentId?: string | null; autoFocus?: boolean; compact?: boolean; pendingKey: string;
}): React.ReactElement {
  const v = useP8Viewer();
  const toast = useUxToast();
  const requireAuth = useRequireAuth();
  const uid = useId().replace(/:/g, '');
  const [text, setText] = useState('');
  const [open, setOpen] = useState(autoFocus);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const ta = useRef<HTMLTextAreaElement>(null);
  const pendingId = `p8-reply:${pendingKey}${parentId ? `:${parentId}` : ''}`;

  useEffect(() => { if (autoFocus) ta.current?.focus(); }, [autoFocus]);

  const send = async (body: string): Promise<void> => {
    const req = replyRequest(to, body, parentId);
    if (!req || busy) return;
    setBusy(true);
    setErr(null);
    const r = await postJson(req.url, req.payload);
    setBusy(false);
    if (!r.ok) { setErr(errorLine(r.status, r.data.error)); return; }
    setText('');
    setOpen(false);
    toast('Posted');
    onPosted({
      id: String(r.data.id ?? `new-${Date.now()}`), likeType: to.store === 'community' ? 'reply' : 'comment',
      person: v.username ? { name: v.displayName ?? v.username, username: v.username, href: `/u/${v.username}`, avatarUrl: v.avatarUrl, accent: null, font: null, bias: null, level: null, levelTitle: null, isSystem: false } : null,
      name: v.displayName ?? v.username ?? 'You', body, meta: null, at: new Date().toISOString(), ago: 'just now', likes: null, replies: [],
      canReply: !parentId && typeof r.data.id === 'number',
    });
  };

  useEffect(() => {
    if (!v.signedIn) return;
    const p = takePendingAction(pendingId);
    const body = (p?.payload as { body?: string } | undefined)?.body;
    if (body) { setText(body); setOpen(true); void send(body); }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, when the session is known
  }, [v.signedIn]);

  const submit = (e: React.FormEvent): void => {
    e.preventDefault();
    const body = text.trim();
    if (!body) { ta.current?.focus(); setErr('Write something first.'); return; }
    requireAuth({ title: 'Sign in to reply', sub: 'Your reply shows with your passport. Your text is kept.', action: { id: pendingId, payload: { body } } }, () => { void send(body); });
  };

  return (
    <form className={`p8-cform${open ? ' is-open' : ''}`} onSubmit={submit} style={compact ? { paddingTop: 0 } : undefined}>
      <UxAvatar name={v.displayName ?? v.username ?? 'You'} src={v.avatarUrl} size={32} />
      <div className="p8-cf">
        <label className="ux-sr" htmlFor={`p8-rep-${uid}`}>{parentId ? 'Reply to this reply' : 'Reply'}</label>
        <textarea
          ref={ta}
          id={`p8-rep-${uid}`}
          className="ux-inp"
          placeholder={placeholder}
          value={text}
          maxLength={2000}
          aria-invalid={err ? true : undefined}
          aria-describedby={err ? `p8-rep-e-${uid}` : undefined}
          onChange={(e) => { setText(e.target.value); setErr(null); if (!open) setOpen(true); }}
          onFocus={() => setOpen(true)}
        />
        <div className="p8-crow">
          {chip ? <span className="p8-gch">{chip}</span> : <span />}
          <button type="submit" className="ux-btn ux-btn-primary ux-btn-sm" disabled={busy}>{busy ? 'Posting...' : 'Reply'}</button>
        </div>
        {err ? <p className="p8-ed-err" id={`p8-rep-e-${uid}`} role="alert">{err}</p> : null}
      </div>
    </form>
  );
}

function CommentItem({ c, nested, canNest, likes, onReply, replyingTo, replyBox }: {
  c: P8Comment; nested?: boolean; canNest: boolean; likes: boolean; onReply: (id: string) => void; replyingTo: string | null; replyBox: (parentId: string) => React.ReactNode;
}): React.ReactElement {
  const paras = paragraphs(c.body);
  return (
    <>
      <div className={`p8-cmt${nested ? ' p8-cmt-nest' : ''}${c.ago === 'just now' ? ' is-new' : ''}`}>
        <UxAvatar name={c.name} src={c.person?.avatarUrl ?? null} size={32} />
        <div className="p8-cmt-b">
          <div className="p8-cmt-h">
            {c.person
              ? <PersonName name={c.person.name} accent={c.person.accent} font={c.person.font} bias={c.person.bias} href={c.person.href ?? undefined} />
              : <b className="ux-who">{c.name}</b>}
            <span className="p8-meta"> · {[c.meta, c.ago].filter(Boolean).join(' · ')}</span>
          </div>
          {(paras.length ? paras : [c.body]).map((p, i) => <p key={i}>{p}</p>)}
          {(likes && c.likes !== null) || (canNest && c.canReply) ? (
            <div className="p8-ca">
              {likes && c.likes !== null ? <LikeButton type={c.likeType} id={c.id} count={c.likes} variant="comment" /> : null}
              {canNest && c.canReply ? <button type="button" onClick={() => onReply(c.id)} aria-expanded={replyingTo === c.id}>Reply</button> : null}
            </div>
          ) : null}
        </div>
      </div>
      {replyingTo === c.id ? <div className="p8-subform">{replyBox(c.id)}</div> : null}
      {c.replies.map((r) => (
        <CommentItem key={r.id} c={r} nested canNest={false} likes={likes} onReply={onReply} replyingTo={replyingTo} replyBox={replyBox} />
      ))}
    </>
  );
}

export function Replies({ post, likesLive, chip, placeholder, children }: {
  post: Pick<P8Post, 'key' | 'kind' | 'comments' | 'commentCount' | 'replyTo'>; likesLive: boolean; chip: string | null; placeholder: string; children?: React.ReactNode;
}): React.ReactElement {
  const [list, setList] = useState<P8Comment[]>(post.comments);
  const [extra, setExtra] = useState(0);
  const [shown, setShown] = useState(FIRST);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const to = post.replyTo;
  const canNest = !!to && to.store !== 'daily_debate';
  const total = post.commentCount + extra;
  const visible = useMemo(() => list.slice(0, shown), [list, shown]);
  const hiddenCount = useMemo(() => list.slice(shown).reduce((s, c) => s + 1 + c.replies.length, 0), [list, shown]);

  const addTop = (c: P8Comment): void => { setList((l) => [c, ...l]); setExtra((n) => n + 1); setShown((n) => n + 1); };
  useEffect(() => {
    const on = (e: Event): void => { const c = (e as CustomEvent<P8Comment>).detail; if (c) addTop(c); };
    window.addEventListener(REPLY_EVENT, on);
    return () => window.removeEventListener(REPLY_EVENT, on);
  }, []);
  const addNested = (parentId: string) => (c: P8Comment): void => {
    setList((l) => l.map((x) => (x.id === parentId ? { ...x, replies: [...x.replies, c] } : x)));
    setExtra((n) => n + 1);
    setReplyingTo(null);
  };

  return (
    <>
      <h2 className="ux-h2" id="p8-rep-h">{total === 1 ? '1 reply' : `${total.toLocaleString('en-US')} replies`}</h2>
      {to && to.store !== 'daily_debate' ? (
        <ReplyBox to={to} placeholder={placeholder} chip={chip} onPosted={addTop} pendingKey={`${post.kind}:${post.key}`} />
      ) : null}
      {children}
      {visible.map((c) => (
        <CommentItem
          key={c.id} c={c} canNest={canNest} likes={likesLive}
          onReply={(id) => setReplyingTo((cur) => (cur === id ? null : id))} replyingTo={replyingTo}
          replyBox={(pid) => (to ? <ReplyBox to={to} placeholder="Reply to this reply" chip={null} parentId={pid} autoFocus compact onPosted={addNested(pid)} pendingKey={`${post.kind}:${post.key}`} /> : null)}
        />
      ))}
      {hiddenCount > 0 ? (
        <div className="p8-cmore">
          <button type="button" className="ux-btn ux-btn-quiet" onClick={() => setShown((n) => n + MORE)}>
            {hiddenCount === 1 ? 'Show 1 more reply' : `Show ${hiddenCount} more replies`}
          </button>
        </div>
      ) : null}
      {!list.length && !to ? <p className="p8-closed">No replies.</p> : null}
    </>
  );
}
