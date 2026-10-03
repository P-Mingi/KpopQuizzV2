'use client';

import { useEffect, useState } from 'react';

import { UxAvatar } from '@/components/ux-v1/avatar';
import { UxButton } from '@/components/ux-v1/button';
import { PinnedRow } from '@/components/ux-v1/panel';
import { PersonName } from '@/components/ux-v1/person-name';
import { useUxMe } from '@/components/ux-v1/use-ux-me';
import { comma, quizzesLabel, rankText } from '@/lib/ux-v1/p9/format';

import type { StandingResponse } from '@/app/api/creators/standing/route';

// The viewer's own row under each board (prototype .pin[data-auth="in"]): a
// client island, so /creators stays static/ISR. Signed in only; one GET
// /api/creators/standing for both periods. Read only. A guest sees no row.

let inflight: Promise<StandingResponse | null> | null = null;

function load(): Promise<StandingResponse | null> {
  if (!inflight) {
    inflight = fetch('/api/creators/standing', { credentials: 'include', cache: 'no-store' })
      .then((r) => (r.ok ? (r.json() as Promise<StandingResponse>) : null))
      .catch(() => null);
  }
  return inflight;
}

export function CreatorsPin({ period }: { period: 'month' | 'all' }): React.ReactElement | null {
  const me = useUxMe();
  const signedIn = Boolean(me?.profile);
  const [s, setS] = useState<StandingResponse | null>(null);
  useEffect(() => {
    if (!signedIn) return undefined;
    let on = true;
    void load().then((x) => { if (on) setS(x); });
    return () => { on = false; };
  }, [signedIn]);

  if (!signedIn || !s?.me || !s.standing) return null;
  const st = s.standing;
  if (st.quizzes === 0) {
    return (
      <PinnedRow you className="p9-pin g8-cr-pin" end={<UxButton variant="ghost" size="sm" href="/create">Create a quiz</UxButton>}>
        You have not published a quiz yet.
      </PinnedRow>
    );
  }
  const mine = period === 'month' ? st.month : st.all;
  return (
    <PinnedRow
      you
      className="p9-pin g8-cr-pin"
      rank={<span className="ux-num">{rankText(mine.rank)}</span>}
      lead={<UxAvatar name={s.me.username} src={s.me.avatar.src} bg={s.me.avatar.bg} fg={s.me.avatar.fg} size={40} />}
      end={<span className="p9-pin-v ux-num">{comma(mine.plays)} {mine.plays === 1 ? 'play' : 'plays'}</span>}
    >
      <PersonName name={s.me.username} accent={s.me.accent} font={s.me.font} href={s.me.href} showBias={false} />
      {' '}
      <span className="p9-pin-s">· {quizzesLabel(st.quizzes)}</span>
    </PinnedRow>
  );
}
