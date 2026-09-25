'use client';

import { useEffect, useRef, useState } from 'react';

import { UxButton, UxIconButton } from '@/components/ux-v1/button';
import { useSignIn } from '@/components/ux-v1/sign-in-sheet';
import { useIsClient } from '@/components/ux-v1/use-is-client';
import { useUxToast } from '@/components/ux-v1/toast';
import { useUxMe } from '@/components/ux-v1/use-ux-me';
import { takePendingAction } from '@/lib/ux-v1/a0/pending-action';
import { challengeChip } from '@/lib/ux-v1/p4/challenge';
import { maxScoreFor } from '@/lib/ux-v1/p4/engine';
import { relativeTime } from '@/lib/ux-v1/p4/format';

import { useP4Run } from './run-context';

/** Signed in (true), guest (false), still loading (null). Null during SSR and
 *  hydration too (the shared /api/auth/me cache can already be filled on the
 *  client), so the server HTML and the first client render always match. */
function useSignedIn(): boolean | null {
  const me = useUxMe();
  const mounted = useIsClient();
  if (!mounted) return null;
  return me === null ? null : Boolean(me.profile);
}

/**
 * Start + share, then the timer rule with "Play without a timer" (DESIGN-SPEC 16.7:
 * relaxed runs do not enter the hall of fame). The relaxed control exists only once
 * the relaxed-run column is live (fail soft until the owner applies the migration).
 */
export function P4StartActions(): React.ReactElement {
  const { quiz, start, loading, relaxed, setRelaxed, challenge, openShare } = useP4Run();
  const signedIn = useSignedIn();
  const ready = useIsClient();
  const live = challenge && !challenge.expired ? challenge : null;
  return (
    <>
      <div className="p4-act" data-p4-start="" data-ready={ready ? '' : undefined}>
        <UxButton variant="primary" size="lg" icon="play" onClick={start} disabled={loading} aria-busy={loading || undefined}>
          {loading ? 'Loading...' : 'Start quiz'}
        </UxButton>
        <UxIconButton icon="share" label="Share this quiz" bordered onClick={() => openShare('quiz')} />
      </div>
      <p className="p4-timerline">
        {live ? (
          <><span className="p4-gch">{challengeChip(live)}</span>{' '}Same {live.total} questions.{' '}</>
        ) : null}
        {quiz.timerOn ? (
          <>
            <span>{relaxed && !live ? 'No timer. Relaxed runs do not enter the hall of fame.' : `${quiz.timerSeconds} seconds per question.`}</span>
            {quiz.relaxedLive && !live ? (
              <>{' '}<button type="button" className="ux-lnk" aria-pressed={relaxed} onClick={() => setRelaxed(!relaxed)}>{relaxed ? 'Use the timer' : 'Play without a timer'}</button></>
            ) : null}
          </>
        ) : <span>No timer on this quiz.</span>}
        {signedIn === false ? <span>{quiz.relaxedLive && quiz.timerOn && !live ? ' · ' : ' '}No account needed.</span> : null}
      </p>
    </>
  );
}

/** Phones: a sticky Start once the first one scrolls away (hidden and not focusable until then). */
export function P4StickyStart(): React.ReactElement {
  const { start, loading } = useP4Run();
  const ready = useIsClient();
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = document.querySelector('[data-p4-start]');
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([e]) => { if (e) setShown(!e.isIntersecting && e.boundingClientRect.top < 0); });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div className={`p4-sstart${shown ? ' is-shown' : ''}`} aria-hidden={!shown || undefined} data-ready={ready ? '' : undefined}>
      <UxButton variant="primary" size="lg" block icon="play" onClick={start} disabled={loading} tabIndex={shown ? 0 : -1}>Start quiz</UxButton>
    </div>
  );
}

interface Standing { played: boolean; bestScore?: number; total?: number; bestAt?: string | null }

/** Hall of fame footer: "Your best 2/8 · 6 hours ago" + Beat it + Challenge a friend (signed in), else the invitation. */
export function P4HofMine(): React.ReactElement {
  const { quiz, start, openShare } = useP4Run();
  const signedIn = useSignedIn();
  const ready = useIsClient();
  const [standing, setStanding] = useState<Standing | null>(null);
  useEffect(() => {
    if (signedIn !== true) return;
    let cancelled = false;
    fetch(`/api/ux-v1/p4/standing?quiz=${quiz.id}`, { credentials: 'include' })
      .then((r) => (r.ok ? (r.json() as Promise<Standing>) : null))
      .then((d) => { if (!cancelled && d) setStanding(d); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [signedIn, quiz.id]);

  if (signedIn && standing?.played && typeof standing.bestScore === 'number') {
    const max = maxScoreFor(quiz.quizType, standing.total ?? quiz.questionCount);
    return (
      <div className="p4-mine" data-testid="p4-mine" data-ready={ready ? '' : undefined}>
        <span className="p4-grow">Your best <b>{standing.bestScore}/{max}</b>{standing.bestAt ? <span className="ux-muted"> · {relativeTime(standing.bestAt)}</span> : null}</span>
        <UxButton variant="ghost" size="sm" onClick={start}>Beat it</UxButton>
        <button type="button" className="ux-lnk" onClick={() => openShare('best', { score: standing.bestScore!, total: max })}>Challenge a friend</button>
      </div>
    );
  }
  return (
    <div className="p4-mine" data-testid="p4-mine" data-ready={ready ? '' : undefined}>
      <span className="p4-grow">Play to put your name on this board.</span>
    </div>
  );
}

/** Follow the creator: same GET / POST /api/follow { username, action } as FollowButton; guests get the sign-in sheet and the follow continues after it. */
export function P4Follow({ username }: { username: string }): React.ReactElement | null {
  const signedIn = useSignedIn();
  const signIn = useSignIn();
  const toast = useUxToast();
  const [following, setFollowing] = useState(false);
  const [self, setSelf] = useState(false);
  const [busy, setBusy] = useState(false);
  const resumed = useRef(false);
  const ready = useIsClient();

  const post = async (action: 'follow' | 'unfollow'): Promise<void> => {
    setBusy(true);
    try {
      const res = await fetch('/api/follow', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, action }) });
      if (res.status === 401) { signIn({ title: `Follow ${username}`, sub: 'Sign in to follow creators and see their new quizzes.', action: { id: 'p4-follow', payload: { username } } }); return; }
      const d = res.ok ? ((await res.json()) as { following?: boolean }) : null;
      if (d && typeof d.following === 'boolean') {
        setFollowing(d.following);
        toast(d.following ? `Following ${username}` : `Unfollowed ${username}`);
      } else {
        toast('Could not update. Try again.');
      }
    } catch {
      toast('Could not update. Try again.');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (signedIn !== true) return;
    let cancelled = false;
    fetch(`/api/follow?username=${encodeURIComponent(username)}`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { isSelf?: boolean; following?: boolean } | null) => {
        if (cancelled || !d) return;
        setSelf(Boolean(d.isSelf));
        setFollowing(Boolean(d.following));
        if (!resumed.current && !d.isSelf && !d.following) {
          resumed.current = true;
          const pending = takePendingAction('p4-follow');
          if (pending && (pending.payload as { username?: string } | undefined)?.username === username) void post('follow');
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signedIn, username]);

  if (self) return null;
  const onClick = (): void => {
    if (busy) return;
    if (signedIn === false) {
      signIn({ title: `Follow ${username}`, sub: 'Sign in to follow creators and see their new quizzes.', action: { id: 'p4-follow', payload: { username } } });
      return;
    }
    void post(following ? 'unfollow' : 'follow');
  };
  return (
    <button type="button" className="ux-lnk" aria-pressed={following} onClick={onClick} disabled={busy} data-ready={ready ? '' : undefined}>
      {following ? 'Following' : 'Follow'}
    </button>
  );
}
