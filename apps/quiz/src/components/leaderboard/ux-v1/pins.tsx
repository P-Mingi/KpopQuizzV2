'use client';

import { useEffect, useState } from 'react';

import { UxAvatar } from '@/components/ux-v1/avatar';
import { UxButton } from '@/components/ux-v1/button';
import { PinnedRow } from '@/components/ux-v1/panel';
import { PersonName } from '@/components/ux-v1/person-name';
import { useSignIn } from '@/components/ux-v1/sign-in-sheet';
import { useUxMe } from '@/components/ux-v1/use-ux-me';
import { groupPhotoUrl } from '@/lib/ux-v1/a0/group-photos';
import { addedLine, comma, quizzesLabel, rankText } from '@/lib/ux-v1/p9/format';
import { groupInitials } from '@/lib/ux-v1/p1/format';

import { GroupAvatar } from './board';

import type { P9Standing } from '@/lib/ux-v1/p9/standing';

// The pinned "you" rows under each board (prototype .pin[data-auth]): per-viewer
// CLIENT islands, so /leaderboard stays static/ISR. They read the shared
// /api/auth/me (A0 useUxMe), then, signed in only, GET /api/ux-v1/p9/standing once
// for the whole page. Read only. While the session is unknown a pin keeps its
// 68px box empty (no flash of the guest row for a signed-in fan, no layout shift).

type State = { kind: 'loading' } | { kind: 'guest' } | { kind: 'error' } | { kind: 'in'; s: P9Standing };

let inflight: Promise<P9Standing | null> | null = null;

function loadStanding(): Promise<P9Standing | null> {
  if (!inflight) {
    inflight = fetch('/api/ux-v1/p9/standing', { credentials: 'include', cache: 'no-store' })
      .then((r) => (r.ok ? (r.json() as Promise<P9Standing>) : null))
      .catch(() => null);
  }
  return inflight;
}

function useStanding(): State {
  const me = useUxMe();
  const signedIn = Boolean(me?.profile);
  const [s, setS] = useState<P9Standing | null | undefined>(undefined);
  useEffect(() => {
    if (!signedIn) return undefined;
    let on = true;
    void loadStanding().then((x) => { if (on) setS(x); });
    return () => { on = false; };
  }, [signedIn]);
  if (me === null) return { kind: 'loading' };
  if (!me.profile) return { kind: 'guest' };
  if (s === undefined) return { kind: 'loading' };
  if (s === null) return { kind: 'error' };
  if (!s.signedIn) return { kind: 'guest' };
  return { kind: 'in', s };
}

function Reserved(): React.ReactElement {
  return <div className="p9-pin-wait" aria-hidden="true" />;
}

/** Fandom war: "STAY is #2 · you added 1,240 points this week" + Play for STAY; guests: sign in. */
export function WarPin(): React.ReactElement | null {
  const st = useStanding();
  const signIn = useSignIn();
  if (st.kind === 'loading') return <Reserved />;
  if (st.kind === 'error') return null;
  if (st.kind === 'guest') {
    return (
      <PinnedRow
        className="p9-pin"
        end={(
          <UxButton
            variant="ghost"
            size="sm"
            onClick={() => signIn({ title: 'Join the fandom war', sub: 'Pick your group and every quiz you play for it adds points to its fandom.' })}
          >
            Sign in
          </UxButton>
        )}
      >
        Sign in and pick your group: every quiz you play for it adds to its fandom.
      </PinnedRow>
    );
  }
  const { war, me } = st.s;
  if (!war) {
    return (
      <PinnedRow
        you
        className="p9-pin"
        lead={me ? <UxAvatar name={me.username} src={me.avatar.src} bg={me.avatar.bg} fg={me.avatar.fg} size={40} /> : undefined}
        end={<UxButton variant="ghost" size="sm" href="/settings">Settings</UxButton>}
      >
        Pick your main group in Settings to see your fandom here.
      </PinnedRow>
    );
  }
  return (
    <PinnedRow
      you
      className="p9-pin"
      lead={<GroupAvatar photo={groupPhotoUrl(war.slug)} initials={groupInitials(war.group)} size="row" />}
      end={<UxButton size="sm" href={war.href}>Play for {war.fandom}</UxButton>}
    >
      {war.rank === null ? (
        <b className="p9-pin-b">{war.fandom} has no points this week yet</b>
      ) : (
        <>
          <b className="p9-pin-b">{war.fandom} is {rankText(war.rank)}</b>
          {' '}
          <span className="p9-pin-s">· {addedLine(war.points)}</span>
        </>
      )}
    </PinnedRow>
  );
}

/** Players: "#212 · you · Lv 7 · STAY · 640 XP". Signed in only (prototype). */
export function PlayerPin(): React.ReactElement | null {
  const st = useStanding();
  if (st.kind === 'loading') return <Reserved />;
  if (st.kind !== 'in' || !st.s.me || !st.s.player) return null;
  const { me, player } = st.s;
  return (
    <PinnedRow
      you
      className="p9-pin"
      rank={<span className="ux-num">{rankText(player.rank)}</span>}
      lead={<UxAvatar name={me.username} src={me.avatar.src} bg={me.avatar.bg} fg={me.avatar.fg} size={40} />}
      end={<span className="p9-pin-v ux-num">{comma(player.xp)} XP</span>}
    >
      <PersonName name={me.username} accent={me.accent} font={me.font} href={me.href} showBias={false} />
      {' '}
      <span className="p9-pin-s">· {player.line}</span>
    </PinnedRow>
  );
}

/** Creators (all time): "#38 · you · 3 quizzes · 312 plays"; no quiz yet: a way to make one. */
export function CreatorPin(): React.ReactElement | null {
  const st = useStanding();
  if (st.kind === 'loading') return <Reserved />;
  if (st.kind !== 'in' || !st.s.me || !st.s.creator) return null;
  const { me, creator } = st.s;
  if (creator.quizzes === 0) {
    return (
      <PinnedRow you className="p9-pin" end={<UxButton variant="ghost" size="sm" href="/create">Create a quiz</UxButton>}>
        You have not published a quiz yet.
      </PinnedRow>
    );
  }
  return (
    <PinnedRow
      you
      className="p9-pin"
      rank={<span className="ux-num">{rankText(creator.rank)}</span>}
      lead={<UxAvatar name={me.username} src={me.avatar.src} bg={me.avatar.bg} fg={me.avatar.fg} size={40} />}
      end={<span className="p9-pin-v ux-num">{comma(creator.plays)} {creator.plays === 1 ? 'play' : 'plays'}</span>}
    >
      <PersonName name={me.username} accent={me.accent} font={me.font} href={me.href} showBias={false} />
      {' '}
      <span className="p9-pin-s">· {quizzesLabel(creator.quizzes)}</span>
    </PinnedRow>
  );
}
