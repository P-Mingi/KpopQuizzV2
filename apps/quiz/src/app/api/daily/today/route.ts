import { NextResponse } from 'next/server';

import { addDays, dayNumber } from '@/lib/daily-rest';
import { getFirstQotdDate, getQuizOfDate, getQuizOfTheDay } from '@/lib/db/queries/quizzes';
import { safeFetch } from '@/lib/error-handling';

// Audit 01 P0-3 / P1-5 / P1-8: today's quiz of the day for the result screens and the home chip, as plain public data
// (slug, title, the day number, yesterday's pick). No user data, so one short shared cache: the cron busts the `quizzes` tag
// at 23:50 UTC and the edge keeps it for 5 minutes.
export const dynamic = 'force-dynamic';

export interface DailyToday {
  /** UTC date of this answer */
  date: string;
  slug: string;
  title: string;
  /** "Daily #N": days since the first quiz of the day, null when that day is unknown */
  number: number | null;
  yesterday: { slug: string; title: string } | null;
}

export async function GET(): Promise<NextResponse> {
  const date = new Date().toISOString().slice(0, 10);
  const q = await safeFetch(getQuizOfTheDay(), null, '[daily/today] getQuizOfTheDay');
  if (!q) return NextResponse.json({ daily: null }, { headers: { 'Cache-Control': 'public, s-maxage=60' } });
  const [first, yesterday] = await Promise.all([
    safeFetch(getFirstQotdDate(), null, '[daily/today] first'),
    safeFetch(getQuizOfDate(addDays(date, -1)), null, '[daily/today] yesterday'),
  ]);
  const body: DailyToday = {
    date,
    slug: q.slug,
    title: q.title,
    number: first && dayNumber(date) >= dayNumber(first) ? dayNumber(date) - dayNumber(first) + 1 : null,
    // yesterday's quiz only when it is not today's (a replay day would offer the same quiz twice)
    yesterday: yesterday && yesterday.slug !== q.slug ? yesterday : null,
  };
  return NextResponse.json({ daily: body }, { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60' } });
}
