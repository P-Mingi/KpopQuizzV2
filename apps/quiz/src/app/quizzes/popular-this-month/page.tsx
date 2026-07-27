import { PopularPage, popularMeta } from '@/components/quiz/popular-page';

// S2 #3: most played in the last 30 days. ISR 6 hours.
export const revalidate = 21600;
export const metadata = popularMeta('month');

export default function PopularThisMonthPage(): React.ReactElement {
  return <PopularPage window="month" />;
}
