import { Icon } from '@/components/ux-v1/icon';
import { UxRow } from '@/components/ux-v1/panel';
import { SectionHeader } from '@/components/ux-v1/section-header';

import type { GeneralTheme } from '@/lib/hubs/general-themes';

// The General K-pop theme pages as rows with their listed counts (SEO phase 1): on the category hub (PR 15) and on
// /groups (PR 16, the owner's entry to the theme pages). Server component, no client code. `children` go between the
// heading and the rows (the hub's ItemList JSON-LD, the /groups lead line).
export function ThemeTopics({ id, topics, counts, children }: {
  id: string;
  topics: readonly GeneralTheme[];
  counts: ReadonlyMap<string, number>;
  children?: React.ReactNode;
}): React.ReactElement {
  return (
    <section className="ux-sec" aria-labelledby={id}>
      <SectionHeader id={id} title="General K-pop quizzes by topic" />
      {children}
      <div className="ux-rows">
        {topics.map((t) => {
          const n = counts.get(t.slug) ?? 0;
          return <UxRow key={t.slug} href={`/${t.slug}`} lead={<span className="p3-rowico"><Icon name="t-classic" /></span>} title={t.h1} end={<span className="ux-num">{n} {n === 1 ? 'quiz' : 'quizzes'}</span>} />;
        })}
      </div>
    </section>
  );
}
