'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';

import { UxAvatar } from '@/components/ux-v1/avatar';
import { Icon } from '@/components/ux-v1/icon';
import { PersonName } from '@/components/ux-v1/person-name';
import { useSignIn } from '@/components/ux-v1/sign-in-sheet';
import { useUxToast } from '@/components/ux-v1/toast';
import { useUxMe } from '@/components/ux-v1/use-ux-me';
import { playComment } from '@/lib/sounds';
import { relativeTime } from '@/lib/ux-v1/p4/format';

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

/**
 * Results comments (DESIGN-SPEC 14.4 / 16.7: folded, a real field, the score chip).
 * Same GET and POST /api/quiz/[id]/comment { content } as the EXISTS quiz-comments.tsx
 * (max 200 characters; the endpoint attaches the commenter's best score). Guests get
 * the sign-in sheet ("Sign in to reply") and their text comes back after it. Names
 * carry the author's flair (17.8). Comment hearts and replies are not shown: quiz
 * comments have no like or reply store yet (no dead controls).
 */
export function P4Comments({ quizId, isClues, count, chip, pendingText }: {
  quizId: string;
  isClues: boolean;
  /** crawl-time count from the page (the list below is live) */
  count: number;
  /** the score the endpoint will attach ("Your score 7/8 is shown") */
  chip: string | null;
  /** text kept across the sign-in sheet (16.6) */
  pendingText: string | null;
}): React.ReactElement {
  const [open, setOpen] = useState(pendingText !== null);
  const [list, setList] = useState<CommentRow[] | null>(null);
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const [text, setText] = useState(pendingText ?? '');
  const [focused, setFocused] = useState(pendingText !== null);
  const [busy, setBusy] = useState(false);
  const me = useUxMe();
  const signIn = useSignIn();
  const toast = useUxToast();
  const uid = useId().replace(/:/g, '');
  const area = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!open || list !== null) return;
    let cancelled = false;
    fetch(`/api/quiz/${quizId}/comment?limit=20`)
      .then((r) => (r.ok ? (r.json() as Promise<{ comments: CommentRow[] }>) : { comments: [] }))
      .then((d) => { if (!cancelled) setList(d.comments ?? []); })
      .catch(() => { if (!cancelled) setList([]); });
    return () => { cancelled = true; };
  }, [open, list, quizId]);

  useEffect(() => {
    if (pendingText !== null) window.setTimeout(() => area.current?.focus(), 80);
  }, [pendingText]);

  const askSignIn = useCallback((t: string) => {
    signIn({ title: 'Sign in to reply', sub: 'Your reply shows with your score and your passport.', action: { id: 'p4-comment', payload: { text: t } } });
  }, [signIn]);

  const send = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const t = text.trim();
    if (!t) { area.current?.focus(); toast('Write something first'); return; }
    if (busy) return;
    if (me && !me.profile) { askSignIn(t); return; }
    setBusy(true);
    try {
      const res = await fetch(`/api/quiz/${quizId}/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: t }),
      });
      if (res.status === 401) { askSignIn(t); return; }
      const d = res.ok ? ((await res.json()) as { comment?: CommentRow }) : null;
      if (!d?.comment) { toast('Could not post. Try again.'); return; }
      const c: CommentRow = { ...d.comment, avatar_url: d.comment.avatar_url ?? me?.profile?.avatar_url ?? null };
      setList((prev) => [c, ...(prev ?? [])]);
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

  const shown = list?.length ?? count;
  const myName = me?.profile?.username ?? '';

  return (
    <details className="p4-acc" open={open} onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}>
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
      {(list ?? []).map((c) => (
        <div key={c.id} className={`p4-cmt${fresh.has(c.id) ? ' is-new' : ''}`}>
          <UxAvatar name={c.username} src={c.avatar_url ?? null} />
          <div>
            <div className="p4-h">
              <PersonName name={c.username} accent={c.name_accent} font={c.name_font} bias={c.bias} href={`/u/${c.username}`} />
              {' '}<span>{c.score != null && c.total ? `· ${c.score}/${c.total * (isClues ? 3 : 1)} ` : ''}· {relativeTime(c.created_at)}</span>
            </div>
            <p>{c.content}</p>
          </div>
        </div>
      ))}
    </details>
  );
}
