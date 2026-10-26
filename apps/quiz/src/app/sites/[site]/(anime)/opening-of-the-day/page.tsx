// Run O1 twin (rule 18) of apps/quiz/src/app/(site)/daily/route.ts, row 13. OtakuQuiz has no blind test (owner, 2026-10-26), so the Opening
// of the day opens the openings quiz of today's series (lib/anime/opening-of-the-day.ts), or the series index when there is none.
import { redirect } from 'next/navigation';

import { openingOfTheDayPath } from '@/lib/anime/opening-of-the-day';
import { createPublicReadClient } from '@/lib/supabase/server';

export const revalidate = 300;

export default async function OpeningOfTheDay(): Promise<never> {
  redirect(await openingOfTheDayPath(createPublicReadClient()));
}
