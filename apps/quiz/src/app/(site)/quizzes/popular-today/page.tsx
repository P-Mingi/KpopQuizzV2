import { PopularPage, popularMeta } from '@/components/quiz/popular-page';

// S2 #3: most played in the last 24h. ISR 30 min.
export const revalidate = 1800;
export const metadata = popularMeta('today');

export default function PopularTodayPage(): React.ReactElement {
  return <PopularPage window="today" />;
}
