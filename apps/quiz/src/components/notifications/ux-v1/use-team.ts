'use client';

import { useEffect, useState } from 'react';

import { teamSet } from '@/lib/ux-v1/p11/team';
import { isUxV12 } from '@/lib/ux-v12';

// The editorial usernames, read once per page load (shared by the bell and the
// notifications page). No request at all unless the v12 flag is on.

const EMPTY: ReadonlySet<string> = new Set();
let shared: Promise<Set<string>> | null = null;

function load(): Promise<Set<string>> {
  shared ??= fetch('/api/ux-v1/p11/team')
    .then((r) => (r.ok ? r.json() : null))
    .then((d) => teamSet(d))
    .catch(() => new Set<string>());
  return shared;
}

export function useTeamUsernames(): ReadonlySet<string> {
  const [team, setTeam] = useState<ReadonlySet<string>>(EMPTY);
  useEffect(() => {
    if (!isUxV12()) return;
    let off = false;
    void load().then((s) => { if (!off && s.size) setTeam(s); });
    return () => { off = true; };
  }, []);
  return team;
}
