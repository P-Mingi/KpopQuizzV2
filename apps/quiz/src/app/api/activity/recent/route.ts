import { NextResponse } from 'next/server';

import { createPublicReadClient } from '@/lib/supabase/server';

// Recent activity for the home ticker (Workstream M, M1.7). Global (not per-user),
// cached ~45s. display_name is already baked at write time, so there is no
// per-user resolution here. LIVENESS GATE: only return events when the feed is
// genuinely busy (>= ACTIVITY_MIN_PER_HOUR in the last hour); below that, return
// nothing so the ticker renders absent (no empty state).
export const dynamic = 'force-dynamic';

const RECENT_LIMIT = 15;
const MIN_PER_HOUR = Number(process.env.ACTIVITY_MIN_PER_HOUR ?? 8);

interface EventRow {
  id: number;
  event_type: string;
  display_name: string;
  group_slug: string | null;
  payload: Record<string, unknown>;
  created_at: string;
}

function line(e: EventRow, groupName: (slug: string | null) => string): string | null {
  const who = e.display_name;
  const g = groupName(e.group_slug);
  const score = typeof e.payload.score === 'number' ? e.payload.score : null;
  const total = typeof e.payload.total === 'number' ? e.payload.total : null;
  const streak = typeof e.payload.streak === 'number' ? e.payload.streak : null;
  switch (e.event_type) {
    case 'quiz_completed': return score !== null && total !== null ? `${who} scored ${score}/${total} on the ${g} quiz` : `${who} played the ${g} quiz`;
    case 'perfect_score': return `${who} aced the ${g} quiz${total !== null ? ` (${total}/${total})` : ''}`;
    case 'battle_won': return `${who} won a battle`;
    case 'duel_voted': return e.group_slug ? `${who} voted in a ${g} duel` : `${who} cast a duel vote`;
    case 'blindtest_played': return `${who} played a blindtest`;
    case 'quiz_created': return `${who} created a ${g} quiz`;
    case 'group_mastered': return `${who} mastered ${g}`;
    case 'streak_milestone': return streak !== null ? `${who} hit a ${streak}-day streak` : `${who} kept a streak going`;
    default: return null;
  }
}

export async function GET(): Promise<NextResponse> {
  const db = createPublicReadClient();
  const hourAgo = new Date(Date.now() - 3_600_000).toISOString();

  const { count } = await db
    .from('activity_events')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', hourAgo);

  const headers = { 'Cache-Control': 'public, max-age=30, s-maxage=45, stale-while-revalidate=60' };

  // Liveness gate: too quiet -> render nothing.
  if (!count || count < MIN_PER_HOUR) {
    return NextResponse.json({ events: [] }, { headers });
  }

  const [{ data: rows }, { data: groups }] = await Promise.all([
    db.from('activity_events').select('id, event_type, display_name, group_slug, payload, created_at').order('created_at', { ascending: false }).limit(RECENT_LIMIT),
    db.from('groups').select('slug, name'),
  ]);

  const nameBySlug = new Map<string, string>();
  for (const g of (groups ?? []) as Array<{ slug: string; name: string }>) nameBySlug.set(g.slug, g.name);
  const groupName = (slug: string | null): string => (slug ? nameBySlug.get(slug) ?? 'K-pop' : 'K-pop');

  const events = ((rows ?? []) as EventRow[])
    .map((e) => ({ id: e.id, text: line(e, groupName), created_at: e.created_at }))
    .filter((e): e is { id: number; text: string; created_at: string } => e.text !== null);

  return NextResponse.json({ events }, { headers });
}
