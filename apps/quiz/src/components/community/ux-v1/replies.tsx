'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';

import { UxAvatar } from '@/components/ux-v1/avatar';
import { PersonName } from '@/components/ux-v1/person-name';
import { useUxToast } from '@/components/ux-v1/toast';
import { takePendingAction } from '@/lib/ux-v1/a0/pending-action';
import { paragraphs, plural } from '@/lib/ux-v1/p8/format';
import { countVisible, MAX_REPLY_DEPTH, SHOWN_DEPTH } from '@/lib/ux-v1/p8/nesting';

import { LikeButton, ReportButton } from './actions';
import { useP8Viewer, useRequireAuth } from './viewer';

import type { ReportTarget } from './actions';
import type { P8Comment, P8Post } from '@/lib/ux-v1/p8/post';

// FandomVerse: this build's base path, inlined by Next at build time ('' on kpop and hub, so the code is today's; '/anime' on the anime build).
const BASE_PATH = process.env.__NEXT_ROUTER_BASEPATH || '';

// Replies of a post (DESIGN-SPEC 13.4, 16.7 Post, 17.7): the reply box (grows on
// focus, context chip, Reply), then the replies, a heart + count per reply (once the
// likes store is live) and "Show N more replies". Writes:
//   thread   POST /api/verse/discussions { thread_id, body, parent_id? }
//   blog     POST /api/verse/discussions { entity_type: 'essay', entity_id, body, parent_id? }
//   fan debate / challenge / editorial   POST /api/ux-v1/p8/replies { target_type, target_id, body, parent_id? }
//   daily debate   v12: its own comments, POST /api/ux-v1/p8/replies { target_type: 'daily_debate',
//            target_id: day, body, parent_id? | parent_vote? }; the vote keeps its optional
//            reply (POST /api/debate/vote { side, comment }). v11: only that reply.
// v12 (owner, 2026-10-06): replies nest like on Reddit. Any comment or reply takes Reply,
// the heart and Report, down to 10 levels; each level is indented with a thin line; past 6
// levels "Continue this thread" opens the rest (?branch=<id>); a button folds a whole
// branch; a hidden reply keeps its place as "[removed]". A signed-out visitor sees the box:
// a click goes through sign-in, then back to this post.
// v12 (owner, 2026-10-07): a notification opens the post on its reply (?reply=<id>): the
// branch unfolds, "Continue this thread" opens when the reply sits deeper than 6 levels, the
// list grows to include it, then it scrolls into view and is highlighted for a moment.

const FIRST = 4;
const MORE = 10;
/** A reply posted outside the list (the daily debate's vote + reply) joins the list. */
export const REPLY_EVENT = 'p8:reply';

type ReplyTo = NonNullable<P8Post['replyTo']>;

/** What a reply goes under: a comment or reply (its id), or on the daily debate a vote comment. */
export interface ReplyParent { id: string; vote: boolean; depth: number }

async function postJson(url: string, body: unknown): Promise<{ ok: boolean; status: number; data: Record<string, unknown> }> {
  try {
    const r = await fetch(BASE_PATH ? BASE_PATH + url : url, { method: 'POST', credentials: 'include', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    return { ok: r.ok, status: r.status, data: (await r.json().catch(() => ({}))) as Record<string, unknown> };
  } catch { return { ok: false, status: 0, data: {} }; }
}

function errorLine(status: number, code: unknown): string {
  const c = String(code ?? '');
  if (c === 'rate_limited' || status === 429) return 'You are replying fast. Try again in a minute.';
  if (c === 'new_account_no_links') return 'New accounts can post links after their first day.';
  if (c === 'blocked_term') return 'This has words that are not allowed here (insults or sexual content). Edit them and try again. Nothing was posted.';
  if (c === 'blocked') return 'You cannot reply in this group.';
  if (c === 'too_long' || c === 'comment_too_long') return 'That reply is too long.';
  if (c === 'too_deep') return 'This branch is as deep as replies go. Reply higher up.';
  if (c === 'bad_parent') return 'That reply is no longer there. Refresh the page.';
  if (status === 503) return 'Replies here open soon.';
  return 'Your reply did not post. Try again.';
}

/** Where a reply goes, with its existing payload. */
export function replyRequest(to: ReplyTo, body: string, parent: ReplyParent | null): { url: string; payload: Record<string, unknown> } | null {
  if (to.store === 'verse') {
    const base = to.thread_id ? { thread_id: to.thread_id } : { entity_type: to.entity_type, entity_id: to.entity_id };
    return { url: '/api/verse/discussions', payload: { ...base, body, ...(parent ? { parent_id: Number(parent.id) } : {}) } };
  }
  if (to.store === 'community') {
    const under = parent ? (parent.vote ? { parent_vote: parent.id } : { parent_id: Number(parent.id) }) : {};
    return { url: '/api/ux-v1/p8/replies', payload: { target_type: to.target_type, target_id: to.target_id, body, ...under } };
  }
  return null; // v11 daily debate: the reply rides with the vote
}

/** A copy of the tree with `c` added under the node `parentId`. */
function insertUnder(list: P8Comment[], parentId: string, c: P8Comment): P8Comment[] {
  return list.map((x) => (x.id === parentId ? { ...x, replies: [...x.replies, c] } : x.replies.length ? { ...x, replies: insertUnder(x.replies, parentId, c) } : x));
}

/** The nodes from the top comment down to `id` (null = not in the tree). */
function pathTo(list: P8Comment[], id: string): P8Comment[] | null {
  for (const x of list) {
    if (x.id === id) return [x];
    const below = pathTo(x.replies, id);
    if (below) return [x, ...below];
  }
  return null;
}

function findNode(list: P8Comment[], id: string): P8Comment | null {
  for (const x of list) {
    if (x.id === id) return x;
    const hit = findNode(x.replies, id);
    if (hit) return hit;
  }
  return null;
}

export function ReplyBox({ to, placeholder, chip, onPosted, parent = null, autoFocus = false, compact = false, pendingKey }: {
  to: ReplyTo; placeholder: string; chip: string | null; onPosted: (c: P8Comment) => void; parent?: ReplyParent | null; autoFocus?: boolean; compact?: boolean; pendingKey: string;
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
  const pendingId = `p8-reply:${pendingKey}${parent ? `:${parent.id}` : ''}`;
  const guest = v.signedIn === false;

  useEffect(() => { if (autoFocus) ta.current?.focus(); }, [autoFocus]);

  const send = async (body: string): Promise<void> => {
    const req = replyRequest(to, body, parent);
    if (!req || busy) return;
    setBusy(true);
    setErr(null);
    const r = await postJson(req.url, req.payload);
    setBusy(false);
    if (!r.ok) { setErr(errorLine(r.status, r.data.error)); return; }
    setText('');
    setOpen(false);
    toast('Posted');
    const depth = parent ? parent.depth + 1 : 1;
    onPosted({
      id: String(r.data.id ?? `new-${Date.now()}`), likeType: to.store === 'community' ? 'reply' : 'comment',
      person: v.username ? { name: v.displayName ?? v.username, username: v.username, href: `/u/${v.username}`, avatarUrl: v.avatarUrl, accent: null, font: null, bias: null, level: null, levelTitle: null, isSystem: false } : null,
      name: v.displayName ?? v.username ?? 'You', body, meta: typeof r.data.meta === 'string' ? r.data.meta : null,
      at: new Date().toISOString(), ago: 'just now', likes: null, replies: [],
      canReply: typeof r.data.id === 'number' && depth < MAX_REPLY_DEPTH, depth,
    });
  };

  // After sign-in, back on this post: a typed reply is sent; a box the visitor clicked opens.
  useEffect(() => {
    if (!v.signedIn) return;
    const p = takePendingAction(pendingId);
    const pl = p?.payload as { body?: string; open?: boolean } | undefined;
    if (pl?.body) { setText(pl.body); setOpen(true); void send(pl.body); return; }
    if (pl?.open) {
      setOpen(true);
      requestAnimationFrame(() => { ta.current?.scrollIntoView({ block: 'center' }); ta.current?.focus(); });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, when the session is known
  }, [v.signedIn]);

  /** A signed-out visitor sees the box; a click or a key goes through sign-in first. */
  const signInFirst = (): void => {
    requireAuth({ title: 'Sign in to reply', sub: 'Then you come back to this post to write your reply. No password needed.', action: { id: pendingId, payload: { open: true } } }, () => {});
  };

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
        <label className="ux-sr" htmlFor={`p8-rep-${uid}`}>{parent ? 'Reply to this reply' : 'Reply'}</label>
        <textarea
          ref={ta}
          id={`p8-rep-${uid}`}
          className="ux-inp"
          placeholder={placeholder}
          value={text}
          maxLength={2000}
          readOnly={guest}
          aria-invalid={err ? true : undefined}
          aria-describedby={err ? `p8-rep-e-${uid}` : guest ? `p8-rep-g-${uid}` : undefined}
          onClick={guest ? signInFirst : undefined}
          onKeyDown={guest ? (e) => { if (e.key === 'Enter' || e.key === ' ' || e.key.length === 1) { e.preventDefault(); signInFirst(); } } : undefined}
          onChange={(e) => { setText(e.target.value); setErr(null); if (!open) setOpen(true); }}
          onFocus={() => { if (!guest) setOpen(true); }}
        />
        {guest ? <span className="ux-sr" id={`p8-rep-g-${uid}`}>Sign in to reply. You come back to this post after.</span> : null}
        <div className="p8-crow">
          {chip ? <span className="p8-gch">{chip}</span> : <span />}
          <button type="submit" className="ux-btn ux-btn-primary ux-btn-sm" disabled={busy}>{busy ? 'Posting...' : 'Reply'}</button>
        </div>
        {err ? <p className="p8-ed-err" id={`p8-rep-e-${uid}`} role="alert">{err}</p> : null}
      </div>
    </form>
  );
}

/** The report target of a reply: a thread or blog reply (verse_discussions), a community
 *  reply (community_replies) or, v12, a vote comment of the daily debate (its uuid). */
function reportOf(c: P8Comment): ReportTarget | null {
  if (c.removed) return null;
  if (c.likeType === 'debate_vote') return /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(c.id) ? { type: 'debate_vote', ref: c.id } : null;
  const id = Number(c.id);
  if (!Number.isSafeInteger(id) || id <= 0) return null;
  return c.likeType === 'comment' ? { type: 'comment', id } : c.likeType === 'reply' ? { type: 'reply', id } : null;
}

interface NodeCtx {
  to: ReplyTo | null;
  canNest: boolean;
  likes: boolean;
  reportable: boolean;
  postHref: string;
  pendingKey: string;
  replyingTo: string | null;
  onReply: (c: P8Comment) => void;
  onPosted: (parentId: string) => (c: P8Comment) => void;
  folded: ReadonlySet<string>;
  /** The reply a notification opened, highlighted for a moment. */
  flash: string | null;
  toggleFold: (id: string) => void;
  openBranch: (id: string, e: React.MouseEvent<HTMLAnchorElement>) => void;
}

/** The fold button of a branch: a thin circle under the avatar, minus open, plus folded. */
function FoldButton({ c, folded, onClick }: { c: P8Comment; folded: boolean; onClick: () => void }): React.ReactElement {
  const n = countVisible(c.replies);
  return (
    <button
      type="button"
      className="p8-fold"
      aria-expanded={!folded}
      aria-label={folded ? `Show this branch${n ? ` (${plural(n, 'reply', 'replies')})` : ''}` : 'Hide this branch'}
      onClick={onClick}
    >
      <svg viewBox="0 0 12 12" aria-hidden="true" focusable="false"><path d="M3 6h6" />{folded ? <path d="M6 3v6" /> : null}</svg>
    </button>
  );
}

/** One comment and, under a thin line, its replies. `level` = its level in this view (a
 *  "Continue this thread" view starts again at 1). */
function CommentNode({ c, level, ctx }: { c: P8Comment; level: number; ctx: NodeCtx }): React.ReactElement {
  const folded = ctx.folded.has(c.id);
  const report = ctx.reportable ? reportOf(c) : null;
  const paras = paragraphs(c.body);
  const hasKids = c.replies.length > 0;
  const below = countVisible(c.replies);
  const fold = hasKids ? <FoldButton c={c} folded={folded} onClick={() => ctx.toggleFold(c.id)} /> : null;
  const canReply = ctx.canNest && c.canReply && !c.removed;
  return (
    <div className={`p8-node${folded ? ' is-folded' : ''}`} id={`reply-${c.id}`}>
      {c.removed ? (
        <div className="p8-cmt is-removed">
          <div className="p8-cmt-l"><span className="p8-rm-ava" aria-hidden="true" />{fold}</div>
          <div className="p8-cmt-b">
            <div className="p8-cmt-h"><span className="p8-removed">[removed]</span></div>
            {folded ? <p className="p8-folded">{plural(below, 'reply', 'replies')} hidden</p> : null}
          </div>
        </div>
      ) : (
        <div className={`p8-cmt${c.ago === 'just now' ? ' is-new' : ''}${ctx.flash === c.id ? ' is-flash' : ''}`}>
          <div className="p8-cmt-l">
            <UxAvatar name={c.name} src={c.person?.avatarUrl ?? null} size={32} team={c.person?.isTeam} />
            {fold}
          </div>
          <div className="p8-cmt-b">
            <div className="p8-cmt-h">
              {c.person
                ? <PersonName name={c.person.name} accent={c.person.accent} font={c.person.font} bias={c.person.bias} href={c.person.href ?? undefined} isTeam={c.person.isTeam} />
                : <b className="ux-who">{c.name}</b>}
              <span className="p8-meta"> · {[c.meta, c.ago].filter(Boolean).join(' · ')}</span>
            </div>
            {folded ? (
              <p className="p8-folded">{below ? `${plural(below, 'reply', 'replies')} hidden` : 'Hidden'}</p>
            ) : (
              <>
                {(paras.length ? paras : [c.body]).map((p, i) => <p key={i}>{p}</p>)}
                {(ctx.likes && c.likes !== null) || canReply || report ? (
                  <div className="p8-ca">
                    {ctx.likes && c.likes !== null ? <LikeButton type={c.likeType} id={c.id} count={c.likes} variant="comment" /> : null}
                    {canReply ? <button type="button" onClick={() => ctx.onReply(c)} aria-expanded={ctx.replyingTo === c.id}>Reply</button> : null}
                    {report ? <ReportButton target={report} variant="comment" /> : null}
                  </div>
                ) : null}
              </>
            )}
          </div>
        </div>
      )}
      {!folded && ctx.replyingTo === c.id && ctx.to ? (
        <div className="p8-subform">
          <ReplyBox
            to={ctx.to} placeholder="Reply to this reply" chip={null} autoFocus compact pendingKey={ctx.pendingKey}
            parent={{ id: c.id, vote: c.likeType === 'debate_vote', depth: c.depth }} onPosted={ctx.onPosted(c.id)}
          />
        </div>
      ) : null}
      {!folded && hasKids && level < SHOWN_DEPTH ? (
        <div className="p8-thr">
          {c.replies.map((r) => <CommentNode key={r.id} c={r} level={level + 1} ctx={ctx} />)}
        </div>
      ) : null}
      {!folded && hasKids && level >= SHOWN_DEPTH ? (
        <div className="p8-thr p8-cont">
          <a href={`${BASE_PATH}${ctx.postHref}?branch=${encodeURIComponent(c.id)}#replies`} onClick={(e) => ctx.openBranch(c.id, e)}>
            Continue this thread ({plural(below, 'reply', 'replies')})
          </a>
        </div>
      ) : null}
    </div>
  );
}

function branchFromUrl(): string | null {
  try { return new URLSearchParams(window.location.search).get('branch'); } catch { return null; }
}

export function Replies({ post, likesLive, chip, placeholder, children, reportable = false }: {
  post: Pick<P8Post, 'key' | 'kind' | 'href' | 'comments' | 'commentCount' | 'replyTo'>; likesLive: boolean; chip: string | null; placeholder: string; children?: React.ReactNode;
  /** v12: replies take a Report button (3 reports by 3 accounts hide a reply). */
  reportable?: boolean;
}): React.ReactElement {
  const v = useP8Viewer();
  const requireAuth = useRequireAuth();
  const [list, setList] = useState<P8Comment[]>(post.comments);
  const [extra, setExtra] = useState(0);
  const [shown, setShown] = useState(FIRST);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [folded, setFolded] = useState<ReadonlySet<string>>(new Set());
  const [branch, setBranch] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const opened = useRef<string | null>(null);
  const timers = useRef<number[]>([]);
  const [target, setTarget] = useState<string | null>(null);
  const to = post.replyTo;
  const canNest = !!to && to.store !== 'daily_debate';
  const pendingKey = `${post.kind}:${post.key}`;
  const replyToPending = `p8-reply-to:${pendingKey}`;
  const total = post.commentCount + extra;
  const visible = useMemo(() => list.slice(0, shown), [list, shown]);
  const hiddenCount = useMemo(() => countVisible(list.slice(shown)), [list, shown]);
  const focus = branch ? findNode(list, branch) : null;

  // A refresh (a reply just hidden by its 3rd report) brings the server's tree back.
  useEffect(() => { setList(post.comments); setExtra(0); }, [post.comments]);

  const addTop = (c: P8Comment): void => { setList((l) => [c, ...l]); setExtra((n) => n + 1); setShown((n) => n + 1); };
  useEffect(() => {
    const on = (e: Event): void => { const c = (e as CustomEvent<P8Comment>).detail; if (c) addTop(c); };
    window.addEventListener(REPLY_EVENT, on);
    return () => window.removeEventListener(REPLY_EVENT, on);
  }, []);

  // "Continue this thread": the branch named in the URL (?branch=<id>), back and forward included.
  useEffect(() => {
    const read = (): void => setBranch(branchFromUrl());
    read();
    window.addEventListener('popstate', read);
    return () => window.removeEventListener('popstate', read);
  }, []);
  const openBranch = (id: string, e: React.MouseEvent<HTMLAnchorElement>): void => {
    e.preventDefault();
    window.history.pushState(null, '', `${window.location.pathname}?branch=${encodeURIComponent(id)}#replies`);
    setBranch(id);
    document.getElementById('replies')?.scrollIntoView({ block: 'start' });
  };
  const closeBranch = (e: React.MouseEvent<HTMLAnchorElement>): void => {
    e.preventDefault();
    window.history.pushState(null, '', `${window.location.pathname}#replies`);
    setBranch(null);
  };

  // A notification link (?reply=<id>): read on load, after each navigation (the server
  // renders the post again, so its comments change) and on back or forward.
  useEffect(() => {
    const read = (): void => { try { setTarget(new URLSearchParams(window.location.search).get('reply')); } catch { setTarget(null); } };
    read();
    window.addEventListener('popstate', read);
    return () => window.removeEventListener('popstate', read);
  }, [post.comments]);
  useEffect(() => {
    if (!target || opened.current === target) return;
    const path = pathTo(list, target);
    if (!path) return;
    opened.current = target;
    const top = list.indexOf(path[0]!);
    if (top >= shown) setShown(top + 1);
    setFolded((s) => { const n = new Set(s); for (const x of path) n.delete(x.id); return n; });
    setBranch(path.length > SHOWN_DEPTH ? path[SHOWN_DEPTH - 1]!.id : null);
    setFlash(target);
    timers.current.push(
      window.setTimeout(() => document.getElementById(`reply-${target}`)?.scrollIntoView({ block: 'center' }), 80),
      window.setTimeout(() => setFlash((f) => (f === target ? null : f)), 2600),
    );
  }, [target, list, shown]);
  useEffect(() => () => { for (const t of timers.current) window.clearTimeout(t); }, []);

  // A visitor who clicked Reply on a comment comes back from sign-in with that box open.
  useEffect(() => {
    if (!v.signedIn) return;
    const p = takePendingAction(replyToPending);
    const id = (p?.payload as { id?: string } | undefined)?.id;
    if (id) setReplyingTo(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, when the session is known
  }, [v.signedIn]);

  const ctx: NodeCtx = {
    to, canNest, likes: likesLive, reportable, postHref: post.href, pendingKey, replyingTo,
    onReply: (c) => requireAuth(
      { title: 'Sign in to reply', sub: 'Then you come back to this post to write your reply. No password needed.', action: { id: replyToPending, payload: { id: c.id } } },
      () => setReplyingTo((cur) => (cur === c.id ? null : c.id)),
    ),
    onPosted: (parentId) => (c) => {
      setList((l) => insertUnder(l, parentId, c));
      setExtra((n) => n + 1);
      setReplyingTo(null);
    },
    folded,
    flash,
    toggleFold: (id) => setFolded((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; }),
    openBranch,
  };

  return (
    <>
      <h2 className="ux-h2" id="p8-rep-h">{total === 1 ? '1 reply' : `${total.toLocaleString('en-US')} replies`}</h2>
      {to && to.store !== 'daily_debate' ? (
        <ReplyBox to={to} placeholder={placeholder} chip={chip} onPosted={addTop} pendingKey={pendingKey} />
      ) : null}
      {children}
      {focus ? (
        <>
          <p className="p8-branch-bar"><a href={`${BASE_PATH}${post.href}#replies`} onClick={closeBranch}>Back to all replies</a></p>
          <CommentNode c={focus} level={1} ctx={ctx} />
        </>
      ) : (
        visible.map((c) => <CommentNode key={c.id} c={c} level={1} ctx={ctx} />)
      )}
      {!focus && hiddenCount > 0 ? (
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
