// Run O1 twin (rule 18) of apps/quiz/src/app/(site)/daily/route.ts, row 13. OtakuQuiz has no blind test (owner, 2026-10-26) and the openings
// quiz page does not render yet, so the Opening of the day goes to the series index: no redirect to a 404.
import { redirect } from 'next/navigation';

export default function OpeningOfTheDay(): never {
  redirect('/series');
}
