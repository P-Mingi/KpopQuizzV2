import { PopularPage, popularMeta } from '@/components/quiz/popular-page';

// S2 #3: most played in the last 7 days. ISR 1 hour.
export const revalidate = 3600;
export const metadata = popularMeta('week');

export default function PopularThisWeekPage(): React.ReactElement {
  return <PopularPage window="week" />;
}
