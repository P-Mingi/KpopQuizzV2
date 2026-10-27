// Run O1 twin (rule 18) of apps/quiz/src/app/(site)/quizzes/popular-this-month/page.tsx, rows 31d: copied by scripts/o1/twins-codemod.mjs; kpop modules imported, not copied.
import { PopularPage, popularMeta } from '@/components/quiz/popular-page';

// S2 #3: most played in the last 30 days. ISR 6 hours.
export const revalidate = 21600;
export const metadata = popularMeta('month');

export default function PopularThisMonthPage(): React.ReactElement {
  return <PopularPage window="month" />;
}
