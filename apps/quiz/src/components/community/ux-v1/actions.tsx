'use client';

import { useEffect, useState } from 'react';

import { Icon } from '@/components/ux-v1/icon';
import { ShareSheet } from '@/components/ux-v1/share-sheet';
import { useUxToast } from '@/components/ux-v1/toast';
import { takePendingAction } from '@/lib/ux-v1/a0/pending-action';

import { likeKey, useP8Viewer, useRequireAuth } from './viewer';

// The community's small write controls. Every write goes through an EXISTING
// endpoint with its existing payload (data-safety 3):
//   blog heart     POST /api/verse/essays/reactions { essay_id }        (toggle)
//   other hearts   POST /api/ux-v1/p8/like { target_type, target_id }  (pending store: 503 until applied)
//   cheer          POST /api/cheer { event_id }                        (one way)
//   follow         POST /api/follow { username, action }
//   report thread  POST /api/verse/flags { target_type: 'comment', target_id, reason }
// Guests get the sign-in sheet; the action resumes after sign-in.

async function postJson(url: string, body: unknown): Promise<{ ok: boolean; status: number; data: Record<string, unknown> }> {
  try {
    const r = await fetch(url, { method: 'POST', credentials: 'include', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const data = (await r.json().catch(() => ({}))) as Record<string, unknown>;
    return { ok: r.ok, status: r.status, data };
  } catch {
    return { ok: false, status: 0, data: {} };
  }
}

/* ------------------------------------------------------------------- heart --- */

interface LikeProps {
  /** community_likes target type, or 'essay' for a blog (verse_essay_reactions). */
  type: string;
  id: string;
  count: number;
  /** 'post' = 36px action pill (post cards); 'comment' = small heart + count. */
  variant?: 'post' | 'comment';
  label?: string;
}

export function LikeButton({ type, id, count, variant = 'post', label }: LikeProps): React.ReactElement {
  const v = useP8Viewer();
  const toast = useUxToast();
  const requireAuth = useRequireAuth();
  const key = likeKey(type, id);
  const pressed = v.liked.has(key);
  const [n, setN] = useState(count);
  const [busy, setBusy] = useState(false);
  const pendingId = `p8-like:${key}`;

  const toggle = async (): Promise<void> => {
    if (busy) return;
    setBusy(true);
    const on = !pressed;
    v.setLiked(key, on);
    setN((c) => Math.max(0, c + (on ? 1 : -1)));
    const res = type === 'essay'
      ? await postJson('/api/verse/essays/reactions', { essay_id: Number(id) })
      : await postJson('/api/ux-v1/p8/like', { target_type: type, target_id: id });
    setBusy(false);
    if (!res.ok) {
      v.setLiked(key, !on);
      setN((c) => Math.max(0, c + (on ? -1 : 1)));
      toast(res.status === 503 ? 'Hearts open soon.' : 'That did not work. Try again.');
      return;
    }
    if (typeof res.data.count === 'number') setN(res.data.count);
    if (typeof res.data.mine === 'boolean') v.setLiked(key, res.data.mine);
  };

  // Resume after sign-in (the sheet stored this heart before leaving).
  useEffect(() => {
    if (!v.signedIn) return;
    if (takePendingAction(pendingId)) void toggle();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, when the session is known
  }, [v.signedIn]);

  const onClick = (): void => requireAuth({ title: 'Sign in to like', sub: 'Your hearts show on your passport. No password needed.', action: { id: pendingId } }, () => { void toggle(); });
  const name = label ?? (pressed ? 'Unlike' : 'Like');
  if (variant === 'comment') {
    return (
      <button type="button" className="p8-lk" aria-pressed={pressed} aria-label={`${name}, ${n} ${n === 1 ? 'like' : 'likes'}`} onClick={onClick} disabled={busy}>
        <Icon name="heart" /><span>{n}</span>
      </button>
    );
  }
  return (
    <button type="button" className="ux-pa2" aria-pressed={pressed} aria-label={`${name}, ${n} ${n === 1 ? 'like' : 'likes'}`} onClick={onClick} disabled={busy}>
      <Icon name="heart" /><span>{n}</span>
    </button>
  );
}

/* ------------------------------------------------------------------- share --- */

export function ShareButton({ path, title, line2, image }: { path: string; title: string; line2: string; image?: string | null }): React.ReactElement {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState(path);
  useEffect(() => { setUrl(`${window.location.origin}${path}`); }, [path]);
  return (
    <>
      <button type="button" className="ux-pa2" style={{ marginLeft: 'auto' }} aria-label="Share" onClick={() => setOpen(true)}>
        <Icon name="share" />
      </button>
      <ShareSheet open={open} onClose={() => setOpen(false)} title="Share this post" url={url} text={title} preview={{ image: image ?? null, line1: title, line2 }} />
    </>
  );
}

/* ------------------------------------------------------------------- cheer --- */

export function CheerButton({ eventId, count, who }: { eventId: number; count: number; who: string }): React.ReactElement {
  const v = useP8Viewer();
  const toast = useUxToast();
  const requireAuth = useRequireAuth();
  const [on, setOn] = useState(false);
  const [n, setN] = useState(count);
  const pendingId = `p8-cheer:${eventId}`;

  const cheer = async (): Promise<void> => {
    if (on) return;
    setOn(true);
    setN((c) => c + 1);
    const res = await postJson('/api/cheer', { event_id: eventId });
    if (!res.ok) { setOn(false); setN((c) => Math.max(0, c - 1)); toast('That did not work. Try again.'); return; }
    if (typeof res.data.count === 'number') setN(res.data.count);
    toast(`You cheered ${who}`);
  };

  useEffect(() => {
    if (!v.signedIn) return;
    if (takePendingAction(pendingId)) void cheer();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, when the session is known
  }, [v.signedIn]);

  return (
    <button
      type="button"
      className="p8-cheer"
      aria-pressed={on}
      aria-label={on ? `Cheered ${who}${n > 1 ? `, ${n} cheers` : ''}` : `Cheer ${who}${n > 0 ? `, ${n} ${n === 1 ? 'cheer' : 'cheers'}` : ''}`}
      onClick={() => requireAuth({ title: 'Sign in to cheer', sub: 'Cheer a fan on the live feed. No password needed.', action: { id: pendingId } }, () => { void cheer(); })}
    >
      <Icon name="heart" />
    </button>
  );
}

/* ------------------------------------------------------------------ follow --- */

export function FollowButton({ username }: { username: string }): React.ReactElement | null {
  const v = useP8Viewer();
  const toast = useUxToast();
  const requireAuth = useRequireAuth();
  const [busy, setBusy] = useState(false);
  const on = v.following.has(username);
  const pendingId = `p8-follow:${username}`;

  const toggle = async (): Promise<void> => {
    if (busy) return;
    setBusy(true);
    const next = !on;
    v.setFollowing(username, next);
    const res = await postJson('/api/follow', { username, action: next ? 'follow' : 'unfollow' });
    setBusy(false);
    if (!res.ok) { v.setFollowing(username, !next); toast('That did not work. Try again.'); return; }
    toast(next ? `You follow ${username}` : 'Unfollowed');
  };

  useEffect(() => {
    if (!v.signedIn) return;
    if (takePendingAction(pendingId) && !v.following.has(username)) void toggle();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, when the session is known
  }, [v.signedIn]);

  if (v.username && v.username === username) return null; // never follow yourself
  return (
    <button
      type="button"
      className="ux-btn ux-btn-ghost ux-btn-sm p8-follow"
      aria-pressed={on}
      disabled={busy}
      onClick={() => requireAuth({ title: `Sign in to follow ${username}`, sub: 'Their posts show in your Following tab. No password needed.', action: { id: pendingId } }, () => { void toggle(); })}
    >
      {on ? 'Following' : 'Follow'}
    </button>
  );
}

/* ------------------------------------------------------------------ report --- */

/** Report a thread: files a patrol flag on its opening post (existing verse flags). */
export function ReportButton({ commentId }: { commentId: number }): React.ReactElement {
  const toast = useUxToast();
  const requireAuth = useRequireAuth();
  const [done, setDone] = useState(false);
  const report = async (): Promise<void> => {
    if (done) return;
    const res = await postJson('/api/verse/flags', { target_type: 'comment', target_id: commentId, reason: 'Reported from the community' });
    if (!res.ok) { toast(res.status === 429 ? 'Too many reports for now. Try later.' : 'That did not work. Try again.'); return; }
    setDone(true);
    toast('Thanks. A moderator will look at it.');
  };
  return (
    <button
      type="button"
      className="ux-pa2"
      aria-label={done ? 'Reported' : 'Report'}
      disabled={done}
      onClick={() => requireAuth({ title: 'Sign in to report', sub: 'Reports go to the moderators. No password needed.' }, () => { void report(); })}
    >
      <Icon name="flag" />
    </button>
  );
}
