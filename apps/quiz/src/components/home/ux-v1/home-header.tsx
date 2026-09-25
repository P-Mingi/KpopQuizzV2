'use client';

import { useMemo } from 'react';

import { UxButton } from '@/components/ux-v1/button';
import { useUxMe } from '@/components/ux-v1/use-ux-me';
import { streakView } from '@/lib/ux-v1/a0/streak';
import { greetingFor } from '@/lib/ux-v1/p1/format';

// Home header (DESIGN-SPEC 17.2 + 17.11): the live site's centred hero. The server
// render is ALWAYS the guest header, with production's heading semantics and copy
// (owner-locked for SEO): H1 "K-pop Quiz / Are you a real fan?", H2 sub line, the
// two CTAs with the exact-match "Browse K-pop quizzes" anchor. The home reads no
// cookie on the server (static/ISR), so a signed-in fan's greeting ("Good evening,
// Mingi" + one streak line, no CTAs) swaps in on the client from /api/auth/me.

function streakLine(days: number | undefined, last: string | null | undefined): string {
  const v = streakView(days, last);
  if (!v) return 'Your quiz of the day is ready. Any quiz or blindtest today starts a streak.';
  if (v.state === 'at_risk') return `Your quiz of the day is ready. Any quiz or blindtest today keeps your ${v.days}-day streak.`;
  return `Streak saved: ${v.days} ${v.days === 1 ? 'day' : 'days'}. Come back tomorrow to make it ${v.days + 1}.`;
}

export function HomeHeader(): React.ReactElement {
  const me = useUxMe();
  const profile = me?.profile ?? null;
  const signedIn = useMemo(() => {
    if (!profile) return null;
    const name = (profile.display_name || profile.username || '').trim();
    return { greeting: greetingFor(new Date().getHours()), name, line: streakLine(profile.daily_streak, profile.last_daily_date) };
  }, [profile]);

  if (signedIn) {
    return (
      <header className="p1-hhead" data-auth="in">
        <h1 tabIndex={-1}>
          <span className="p1-eyb">K-pop Quiz</span>
          {signedIn.name ? <>{signedIn.greeting}, <em>{signedIn.name}</em></> : signedIn.greeting}
        </h1>
        <p className="p1-hsub">{signedIn.line}</p>
      </header>
    );
  }

  return (
    <header className="p1-hhead" data-auth="out">
      <h1 tabIndex={-1}>
        <span className="p1-eyb">K-pop Quiz</span>
        Are you a <em>real fan?</em>
      </h1>
      <h2 className="p1-hsub">Prove it. Play K-pop quizzes and see where you rank.</h2>
      <div className="p1-hcta">
        <UxButton href="/quizzes" icon="play" aria-label="Browse K-pop quizzes">Browse K-pop quizzes</UxButton>
        <UxButton href="/create" variant="ghost" icon="plus" aria-label="Create a quiz">Create a quiz</UxButton>
      </div>
    </header>
  );
}
