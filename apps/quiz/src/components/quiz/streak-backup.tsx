'use client';

import { useEffect, useState } from 'react';

import { guestStreak, shouldOfferBackup, markBackupOffered } from '@/lib/guest-streak';

// W3b PART 2 moment 2 - STREAK BACKUP.
//
// One calm, TRUE line, at streak 3, 7 and 14 only, once per milestone, dismissible,
// and it blocks nothing. The doctrine's rule, kept literally: loss aversion with a
// true statement, never a countdown, never nagging.
//
// What it must never become: a timer, a warning, a repeated prompt, or a claim that
// signing in restores anything from the past. It states where the streak lives and
// offers to put a name on it from here on.
export function StreakBackup({ signedIn }: { signedIn: boolean }): React.ReactElement | null {
  const [streak, setStreak] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (signedIn) return; // a signed-in streak is already backed up; saying otherwise would be false
    const s = guestStreak();
    if (shouldOfferBackup(s)) {
      markBackupOffered(s); // once per milestone, even if they never act on it
      setStreak(s);
    }
  }, [signedIn]);

  if (streak === 0 || dismissed) return null;

  return (
    <div className="streak-backup" role="status">
      <p className="streak-backup-line">
        {streak} days in a row. This streak lives in this browser only.
      </p>
      <div className="streak-backup-actions">
        <a
          className="streak-backup-cta"
          href={`/login?next=${encodeURIComponent(typeof window === 'undefined' ? '/' : window.location.pathname)}`}
        >
          Save it to an account
        </a>
        <button type="button" className="streak-backup-dismiss" onClick={() => setDismissed(true)}>
          Not now
        </button>
      </div>
    </div>
  );
}
