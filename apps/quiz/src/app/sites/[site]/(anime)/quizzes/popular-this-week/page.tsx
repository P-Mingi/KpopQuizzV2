// Run O1 twin (rule 18) of apps/quiz/src/app/(site)/quizzes/popular-this-week/page.tsx, rows 31c: copied by scripts/o1/twins-codemod.mjs; kpop modules imported, not copied.
import { PopularPage, popularMeta } from '@/components/quiz/popular-page';

// S2 #3: most played in the last 7 days. ISR 1 hour.
export const revalidate = 3600;
export const metadata = popularMeta('week');

export default function PopularThisWeekPage(): React.ReactElement {
  return <PopularPage window="week" />;
}
