'use client';

import { useEffect, useState } from 'react';

import { Icon } from '@/components/ux-v1/icon';
import { UxButton } from '@/components/ux-v1/button';
import { ShareSheet } from '@/components/ux-v1/share-sheet';
import { useSignIn } from '@/components/ux-v1/sign-in-sheet';
import { useUxToast } from '@/components/ux-v1/toast';
import { takePendingAction } from '@/lib/ux-v1/a0/pending-action';

import { useIsOwner } from './passport-band';

interface PassportActionsProps {
  username: string;
  displayName: string;
  owner: 'server' | 'check';
  level: string;
}

type FollowState = { signedIn: boolean; isSelf: boolean; following: boolean } | null;
const FOLLOW_ACTION = 'p10-follow';

/**
 * Right side of the passport head (prototype: Edit passport + share). The owner
 * gets Edit passport (/settings); a visitor gets Follow (the EXISTING /api/follow,
 * same GET + POST as the live button; a guest gets the sign-in sheet and the
 * follow resumes after sign-in). Share opens A0's share sheet with the public URL.
 */
export function PassportActions({ username, displayName, owner, level }: PassportActionsProps): React.ReactElement {
  const isOwner = useIsOwner(username, owner);
  const signIn = useSignIn();
  const toast = useUxToast();
  const [share, setShare] = useState(false);
  const [follow, setFollow] = useState<FollowState>(null);
  const [pending, setPending] = useState(false);
  const [origin, setOrigin] = useState('https://kpopquiz.org');

  useEffect(() => { setOrigin(window.location.origin); }, []);

  // Visitor follow state (GET, read only). Not asked on /me.
  useEffect(() => {
    if (owner === 'server') return;
    let cancelled = false;
    fetch(`/api/follow?username=${encodeURIComponent(username)}`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: FollowState) => { if (!cancelled) setFollow(d); })
      .catch(() => { if (!cancelled) setFollow(null); });
    return () => { cancelled = true; };
  }, [owner, username]);

  const write = async (next: boolean): Promise<void> => {
    setFollow((s) => (s ? { ...s, following: next } : s));
    setPending(true);
    try {
      const res = await fetch('/api/follow', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ username, action: next ? 'follow' : 'unfollow' }),
      });
      if (!res.ok) { setFollow((s) => (s ? { ...s, following: !next } : s)); toast('That did not work. Try again.'); }
    } catch {
      setFollow((s) => (s ? { ...s, following: !next } : s));
      toast('That did not work. Try again.');
    } finally {
      setPending(false);
    }
  };

  // Resume a follow started as a guest, once signed in.
  useEffect(() => {
    if (!follow?.signedIn || follow.isSelf || follow.following) return;
    const p = takePendingAction(FOLLOW_ACTION);
    if ((p?.payload as { username?: string } | undefined)?.username === username) void write(true);
    // write is stable enough for a one-shot resume
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [follow?.signedIn, follow?.isSelf, username]);

  const onFollow = (): void => {
    if (!follow) return;
    if (!follow.signedIn) {
      signIn({ title: `Sign in to follow ${displayName}`, sub: 'See their new quizzes in your feed. No password needed.', action: { id: FOLLOW_ACTION, payload: { username } } });
      return;
    }
    void write(!follow.following);
  };

  const url = `${origin}/u/${username}`;
  return (
    <div className="p10-acts">
      {isOwner ? (
        <UxButton variant="ghost" href="/settings" icon="pen">Edit passport</UxButton>
      ) : follow && !follow.isSelf ? (
        <UxButton variant={follow.following ? 'ghost' : 'primary'} aria-pressed={follow.following} onClick={onFollow} disabled={pending}>
          {follow.following ? <><Icon name="check" />Following</> : <><Icon name="plus" />Follow</>}
        </UxButton>
      ) : null}
      <button type="button" className="ux-ib ux-ib-bordered" aria-label="Share passport" aria-haspopup="dialog" onClick={() => setShare(true)}>
        <Icon name="share" />
      </button>
      <ShareSheet
        open={share}
        onClose={() => setShare(false)}
        title={isOwner ? 'Share your passport' : `Share ${displayName}'s passport`}
        preview={{ image: `/api/og/passport/${encodeURIComponent(username)}`, line1: displayName, line2: level }}
        url={url}
        text={isOwner ? 'My K-pop passport on KpopQuiz' : `${displayName}'s K-pop passport on KpopQuiz`}
        {...(isOwner ? {
          onStoryImage: () => { window.open(`/api/fancard/${encodeURIComponent(username)}`, '_blank', 'noopener'); },
          storyFile: async () => {
            try {
              const r = await fetch(`/api/fancard/${encodeURIComponent(username)}`);
              if (!r.ok) return null;
              return new File([await r.blob()], `fancard-${username}.png`, { type: 'image/png' });
            } catch { return null; }
          },
        } : {})}
      />
    </div>
  );
}
