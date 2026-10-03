'use client';

import { Fragment, useCallback, useEffect, useId, useRef, useState } from 'react';

import { UxAvatar } from '@/components/ux-v1/avatar';
import { Icon } from '@/components/ux-v1/icon';
import { PersonName } from '@/components/ux-v1/person-name';
import { useSignIn } from '@/components/ux-v1/sign-in-sheet';
import { useUxToast } from '@/components/ux-v1/toast';
import { useUxMe } from '@/components/ux-v1/use-ux-me';
import { useTeamUsernames } from '@/components/notifications/ux-v1/use-team';
import { playComment } from '@/lib/sounds';
import { isUuid, likeKey, NOT_LIVE, parseExtras, parseReply, REPLY_MAX, resumePayload, writeError } from '@/lib/ux-v1/p4/comments';
import { relativeTime } from '@/lib/ux-v1/p4/format';

import type { LikeTarget, P4CommentExtras, P4CommentResume, P4Reply } from '@/lib/ux-v1/p4/comments';

interface CommentRow {
  id: string;
  username: string;
  content: string;
  created_at: string;
  score?: number | null;
  total?: number | null;
  avatar_url?: string | null;
  name_accent?: string | null;
  name_font?: string | null;
  bias?: string | null;
}

const MAX = 200;
const JSON_HEADERS = { 'Content-Type': 'application/json' };

/** A heart + count (17.7: pink when liked). The count is part of the name ("12 likes"). */
function Heart({ label, liked, count, onClick }: { label: string; liked: boolean; count: number; onClick: () => void }): React.ReactElement {
  return (
    <button type="button" className="p4-lk" aria-pressed={liked} aria-label={`${label}, ${count.toLocaleString('en-US')} ${count === 1 ? 'like' : 'likes'}`} onClick={onClick}>
      <Icon name="heart" /><span>{count.toLocaleString('en-US')}</span>
    </button>
  );
}

/** The inline reply field under a comment (prototype post view "Reply with your score"). */
function ReplyForm({ to, text, setText, busy, chip, me, focusTick, onSend, onClose }: {
  to: string;
  text: string;
  setText: (t: string) => void;
  busy: boolean;
  chip: string | null;
  me: { name: string; avatar: string | null };
  /** bumped to put the caret back in the field (Reply on a reply of the same comment) */
  focusTick: number;
  onSend: () => void;
  onClose: () => void;
}): React.ReactElement {
  const uid = useId().replace(/:/g, '');
  const ta = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ta.current;
    if (!el) return;
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
  }, [focusTick]);
  return (
    <form className="p4-cform p4-rform is-open" onSubmit={(e) => { e.preventDefault(); onSend(); }}>
      <UxAvatar name={me.name} src={me.avatar} />
      <div className="p4-cf">
        <label className="ux-sr" htmlFor={`p4-r-${uid}`}>{`Reply to ${to}`}</label>
        <textarea
          ref={ta}
          id={`p4-r-${uid}`}
          className="ux-inp"
          placeholder="Reply with your score"
          maxLength={REPLY_MAX}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onClose(); } }}
        />
        <div className="p4-crow">
          {chip ? <span className="p4-gch">{chip}</span> : <span />}
          <button className="ux-btn ux-btn-primary ux-btn-sm" type="submit" disabled={busy}>{busy ? 'Sending...' : 'Reply'}</button>
        </div>
      </div>
    </form>
  );
}

/** A comment or reply author's avatar. v12 F5a: an editorial account gets the team
 *  avatar (UxAvatar ignores `team` unless the v12 flag is on). */
export function P4CommentAvatar({ username, src, team }: { username: string; src: string | null; team: boolean }): React.ReactElement {
  return team ? <UxAvatar name={username} src={src} team /> : <UxAvatar name={username} src={src} />;
}

/** A comment or reply author's name with their flair. v12 F5a: an editorial account
 *  gets the Team pill and no fan flair (PersonName ignores `isTeam` unless the v12
 *  flag is on). Comments show no level for anyone. */
export function P4CommentName({ username, accent, font, bias, team }: {
  username: string; accent: string | null | undefined; font: string | null | undefined; bias: string | null | undefined; team: boolean;
}): React.ReactElement {
  return team
    ? <PersonName name={username} accent={accent} font={font} bias={bias} href={`/u/${username}`} isTeam />
    : <PersonName name={username} accent={accent} font={font} bias={bias} href={`/u/${username}`} />;
}

/**
 * Results comments (DESIGN-SPEC 14.4 / 16.7: folded, a real field, the score chip; 17.7
 * and the prototype #end rows: a heart + count, pink when liked, and Reply).
 * The list and the field keep the EXISTING GET and POST /api/quiz/[id]/comment { content }
 * (max 200 characters; the endpoint attaches the commenter's best score). Names carry
 * the author's flair (17.8). Guests get the sign-in sheet ("Sign in to reply" / "Sign in
 * to like") and the action comes back after it (text kept, heart applied).
 * Hearts and replies (X1-002) read GET /api/ux-v1/p4/comments and write POST
 * /api/ux-v1/p4/comments/like { target, id, action } and /reply { commentId, content }.
 * Their store is a pending migration (v11-p4-comment-likes.sql): until it is applied the
 * read answers live:false and no heart and no Reply are rendered (no dead controls).
 * Replies nest one level; Reply on a reply answers in the same thread ("@name ").
 */
export function P4Comments({ quizId, isClues, count, chip, pending }: {
  quizId: string;
  isClues: boolean;
  /** crawl-time count from the page (the list below is live) */
  count: number;
  /** the score the endpoint will attach ("Your score 7/8 is shown") */
  chip: string | null;
  /** the action kept across the sign-in sheet (16.6) */
  pending: P4CommentResume | null;
}): React.ReactElement {
  const pendingText = pending?.kind === 'comment' ? pending.text : null;
  const [open, setOpen] = useState(pending !== null);
  /** the server's list (null until the first read answers) and what this page posted since */
  const [server, setServer] = useState<CommentRow[] | null>(null);
  const [mine, setMine] = useState<CommentRow[]>([]);
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const [text, setText] = useState(pendingText ?? '');
  const [focused, setFocused] = useState(pendingText !== null);
  const [busy, setBusy] = useState(false);
  /** hearts + replies (null until read; live:false = the store is not there) */
  const [extras, setExtras] = useState<P4CommentExtras | null>(null);
  /** a heart the fan pressed wins over any read (a read never undoes a click) */
  const [hearts, setHearts] = useState<Record<string, { liked: boolean; count: number }>>({});
  const heartBusy = useRef(new Set<string>());
  const [myReplies, setMyReplies] = useState<P4Reply[]>([]);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replyBusy, setReplyBusy] = useState(false);
  const [focusTick, setFocusTick] = useState(0);
  const replyButtons = useRef(new Map<string, HTMLButtonElement>());
  const resumed = useRef(pending === null || pending.kind === 'comment');
  const me = useUxMe();
  const signIn = useSignIn();
  const toast = useUxToast();
  const uid = useId().replace(/:/g, '');
  const area = useRef<HTMLTextAreaElement>(null);
  // v12 F5a: editorial usernames (one shared read, none with the v12 flag off)
  const teamNames = useTeamUsernames();
  const isTeam = (username: string): boolean => teamNames.size > 0 && teamNames.has(username.toLowerCase());

  // A comment posted while this read is in flight must not cancel it (the list would stay
  // at the new comment alone): the read depends on the server list only, and the two merge.
  useEffect(() => {
    if (!open || server !== null) return;
    let cancelled = false;
    fetch(`/api/quiz/${quizId}/comment?limit=20`)
      .then((r) => (r.ok ? (r.json() as Promise<{ comments: CommentRow[] }>) : { comments: [] }))
      .then((d) => { if (!cancelled) setServer(d.comments ?? []); })
      .catch(() => { if (!cancelled) setServer([]); });
    return () => { cancelled = true; };
  }, [open, server, quizId]);
  const list: CommentRow[] | null = server === null
    ? (mine.length > 0 ? mine : null)
    : [...mine, ...server.filter((c) => !mine.some((m) => m.id === c.id))];

  // Hearts and replies of the listed comments, once the list is known (read only).
  const serverIds = server === null ? null : server.map((c) => c.id).filter(isUuid).join(',');
  useEffect(() => {
    if (serverIds === null) return;
    let cancelled = false;
    fetch(`/api/ux-v1/p4/comments?quiz=${encodeURIComponent(quizId)}&ids=${serverIds}`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: unknown) => { if (!cancelled) setExtras(parseExtras(d)); })
      .catch(() => { if (!cancelled) setExtras(NOT_LIVE); });
    return () => { cancelled = true; };
  }, [serverIds, quizId]);
  const social = extras?.live === true;

  useEffect(() => {
    if (pendingText !== null) window.setTimeout(() => area.current?.focus(), 80);
  }, [pendingText]);

  const askSignIn = useCallback((r: P4CommentResume) => {
    if (r.kind === 'like') {
      signIn({ title: 'Sign in to like', sub: 'One heart per fan. No password needed.', action: { id: 'p4-comment', payload: resumePayload(r) } });
      return;
    }
    signIn({ title: 'Sign in to reply', sub: 'Your reply shows with your score and your passport.', action: { id: 'p4-comment', payload: resumePayload(r) } });
  }, [signIn]);

  const send = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const t = text.trim();
    if (!t) { area.current?.focus(); toast('Write something first'); return; }
    if (busy) return;
    if (me && !me.profile) { askSignIn({ kind: 'comment', text: t }); return; }
    setBusy(true);
    try {
      const res = await fetch(`/api/quiz/${quizId}/comment`, {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ content: t }),
      });
      if (res.status === 401) { askSignIn({ kind: 'comment', text: t }); return; }
      const d = res.ok ? ((await res.json()) as { comment?: CommentRow }) : null;
      if (!d?.comment) { toast('Could not post. Try again.'); return; }
      const c: CommentRow = { ...d.comment, avatar_url: d.comment.avatar_url ?? me?.profile?.avatar_url ?? null };
      setMine((prev) => [c, ...prev]);
      setFresh((prev) => new Set(prev).add(c.id));
      setText('');
      setFocused(false);
      playComment();
      toast('Posted');
    } catch {
      toast('Could not post. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const heartOf = (target: LikeTarget, id: string): { liked: boolean; count: number } => {
    const key = likeKey(target, id);
    return hearts[key] ?? { liked: (extras?.liked ?? []).includes(key), count: extras?.likes[key] ?? 0 };
  };

  const like = async (target: LikeTarget, id: string): Promise<void> => {
    const key = likeKey(target, id);
    if (heartBusy.current.has(key)) return;
    if (me && !me.profile) { askSignIn({ kind: 'like', target, id }); return; }
    const before = heartOf(target, id);
    const next = { liked: !before.liked, count: Math.max(0, before.count + (before.liked ? -1 : 1)) };
    heartBusy.current.add(key);
    setHearts((h) => ({ ...h, [key]: next }));
    try {
      const res = await fetch('/api/ux-v1/p4/comments/like', {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ target, id, action: next.liked ? 'like' : 'unlike' }),
      });
      const d = (await res.json().catch(() => null)) as { liked?: unknown; count?: unknown; error?: unknown } | null;
      if (res.status === 401) { setHearts((h) => ({ ...h, [key]: before })); askSignIn({ kind: 'like', target, id }); return; }
      if (!res.ok) { setHearts((h) => ({ ...h, [key]: before })); toast(writeError('like', res.status, d?.error)); return; }
      if (d && typeof d.liked === 'boolean' && typeof d.count === 'number') {
        const saved = { liked: d.liked, count: d.count };
        setHearts((h) => ({ ...h, [key]: saved }));
      }
    } catch {
      setHearts((h) => ({ ...h, [key]: before }));
      toast(writeError('like', 0));
    } finally {
      heartBusy.current.delete(key);
    }
  };

  const openReply = (parentId: string, mention: string | null): void => {
    if (mention === null && replyTo === parentId) { setReplyTo(null); return; }
    if (replyTo !== parentId || replyText.trim() === '') setReplyText(mention ? `@${mention} ` : '');
    setReplyTo(parentId);
    setFocusTick((n) => n + 1);
  };

  const closeReply = (): void => {
    const parent = replyTo;
    setReplyTo(null);
    if (parent) window.setTimeout(() => replyButtons.current.get(parent)?.focus(), 0);
  };

  const sendReply = async (): Promise<void> => {
    const parentId = replyTo;
    if (!parentId) return;
    const t = replyText.trim();
    if (!t) { setFocusTick((n) => n + 1); toast('Write something first'); return; }
    if (replyBusy) return;
    if (me && !me.profile) { askSignIn({ kind: 'reply', text: t, replyTo: parentId }); return; }
    setReplyBusy(true);
    try {
      const res = await fetch('/api/ux-v1/p4/comments/reply', {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ commentId: parentId, content: t }),
      });
      const d = (await res.json().catch(() => null)) as { reply?: unknown; error?: unknown } | null;
      if (res.status === 401) { askSignIn({ kind: 'reply', text: t, replyTo: parentId }); return; }
      const r = res.ok ? parseReply(d?.reply) : null;
      if (!r) { toast(writeError('reply', res.ok ? 500 : res.status, d?.error)); return; }
      const shown: P4Reply = { ...r, avatar_url: r.avatar_url ?? me?.profile?.avatar_url ?? null };
      setMyReplies((prev) => [...prev, shown]);
      setFresh((prev) => new Set(prev).add(shown.id));
      setReplyText('');
      closeReply();
      playComment();
      toast('Posted');
    } catch {
      toast(writeError('reply', 0));
    } finally {
      setReplyBusy(false);
    }
  };

  // Back from the sign-in sheet: the reply field reopens with the text, or the heart is
  // applied (once, when the fan is signed in and it is not pressed yet). If the store is
  // not live, a reply's text goes to the comment field so it is never lost.
  useEffect(() => {
    if (resumed.current || !pending || pending.kind === 'comment' || extras === null || list === null) return;
    if (pending.kind === 'like' && me === null) return;
    resumed.current = true;
    if (pending.kind === 'reply') {
      if (extras.live && list.some((c) => c.id === pending.replyTo)) {
        setReplyTo(pending.replyTo);
        setReplyText(pending.text);
        setFocusTick((n) => n + 1);
      } else {
        setText(pending.text);
        setFocused(true);
        window.setTimeout(() => area.current?.focus(), 80);
      }
      return;
    }
    if (extras.live && me?.profile && !heartOf(pending.target, pending.id).liked) void like(pending.target, pending.id);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- once, when the list, the store and the session are known
  }, [pending, extras, list === null, me]);

  const shown = server === null ? count + mine.length : (list?.length ?? count);
  const myName = me?.profile?.username ?? '';
  const scoreOf = (score?: number | null, total?: number | null): string =>
    score != null && total ? `· ${score}/${total * (isClues ? 3 : 1)} ` : '';
  const repliesOf = (parentId: string): P4Reply[] => {
    const fromServer = extras?.replies[parentId] ?? [];
    return [...fromServer, ...myReplies.filter((r) => r.comment_id === parentId && !fromServer.some((s) => s.id === r.id))];
  };

  return (
    <details
      className="p4-acc"
      open={open}
      onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}
      data-social={extras === null ? undefined : social ? 'live' : 'off'}
    >
      <summary>Comments ({shown})<Icon name="chev" /></summary>
      <form className={`p4-cform${focused || text ? ' is-open' : ''}`} onSubmit={(e) => { void send(e); }}>
        <UxAvatar name={myName || 'You'} src={me?.profile?.avatar_url ?? null} />
        <div className="p4-cf">
          <label className="ux-sr" htmlFor={`p4-c-${uid}`}>Comment</label>
          <textarea
            ref={area}
            id={`p4-c-${uid}`}
            className="ux-inp"
            placeholder="Say something about this quiz"
            maxLength={MAX}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onFocus={() => setFocused(true)}
          />
          <div className="p4-crow">
            {chip ? <span className="p4-gch">{chip}</span> : <span />}
            <button className="ux-btn ux-btn-primary ux-btn-sm" type="submit" disabled={busy}>{busy ? 'Sending...' : 'Send'}</button>
          </div>
        </div>
      </form>
      {list !== null && list.length === 0 ? <p className="p4-cempty">Be the first to comment.</p> : null}
      {(list ?? []).map((c) => {
        const actions = social && isUuid(c.id);
        const heart = actions ? heartOf('comment', c.id) : null;
        const replies = actions ? repliesOf(c.id) : [];
        return (
          <Fragment key={c.id}>
            <div className={`p4-cmt${fresh.has(c.id) ? ' is-new' : ''}`}>
              <P4CommentAvatar username={c.username} src={c.avatar_url ?? null} team={isTeam(c.username)} />
              <div className="p4-cb">
                <div className="p4-h">
                  <P4CommentName username={c.username} accent={c.name_accent} font={c.name_font} bias={c.bias} team={isTeam(c.username)} />
                  {' '}<span>{scoreOf(c.score, c.total)}· {relativeTime(c.created_at)}</span>
                </div>
                <p>{c.content}</p>
                {heart ? (
                  <div className="p4-ca">
                    <Heart label="Like this comment" liked={heart.liked} count={heart.count} onClick={() => { void like('comment', c.id); }} />
                    <button
                      type="button"
                      ref={(el) => { if (el) replyButtons.current.set(c.id, el); else replyButtons.current.delete(c.id); }}
                      aria-expanded={replyTo === c.id}
                      aria-label={`Reply to ${c.username}`}
                      onClick={() => openReply(c.id, null)}
                    >Reply</button>
                  </div>
                ) : null}
              </div>
            </div>
            {replies.map((r) => {
              const h = heartOf('reply', r.id);
              return (
                <div key={r.id} className={`p4-cmt p4-cmt-nest${fresh.has(r.id) ? ' is-new' : ''}`}>
                  <P4CommentAvatar username={r.username} src={r.avatar_url} team={isTeam(r.username)} />
                  <div className="p4-cb">
                    <div className="p4-h">
                      <P4CommentName username={r.username} accent={r.name_accent} font={r.name_font} bias={r.bias} team={isTeam(r.username)} />
                      {' '}<span>{scoreOf(r.score, r.total)}· {relativeTime(r.created_at)}</span>
                    </div>
                    <p>{r.content}</p>
                    <div className="p4-ca">
                      <Heart label="Like this reply" liked={h.liked} count={h.count} onClick={() => { void like('reply', r.id); }} />
                      <button type="button" aria-label={`Reply to ${r.username}`} onClick={() => openReply(c.id, r.username)}>Reply</button>
                    </div>
                  </div>
                </div>
              );
            })}
            {actions && replyTo === c.id ? (
              <div className="p4-subform">
                <ReplyForm
                  to={c.username}
                  text={replyText}
                  setText={setReplyText}
                  busy={replyBusy}
                  chip={chip}
                  me={{ name: myName || 'You', avatar: me?.profile?.avatar_url ?? null }}
                  focusTick={focusTick}
                  onSend={() => { void sendReply(); }}
                  onClose={closeReply}
                />
              </div>
            ) : null}
          </Fragment>
        );
      })}
    </details>
  );
}
