// Run O1 twin (rule 18) of apps/quiz/src/app/(site)/daily/route.ts, row 13: the kpop daily blind test is run from the
// blind test hub (its daily band), so the Opening of the day sends there, as /daily sends to the quiz of the day.
import { redirect } from 'next/navigation';

export default function OpeningOfTheDay(): never {
  redirect('/blindtest');
}
