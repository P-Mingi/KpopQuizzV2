import { SectionHeader } from '@/components/ux-v1/section-header';
import { t } from '@/lib/anime/copy';
import { safeUrl } from '@/lib/anime/series-model';

import type { SeriesFactRow } from '@/lib/anime/series';

interface SeriesFactListProps {
  readonly name: string;
  /** At most nine (HUB_FACT_LIMIT), already unique. */
  readonly facts: readonly SeriesFactRow[];
  /** How many facts the series has in all. */
  readonly total: number;
  /** The /{series}-trivia page, only when it exists (9 facts or more). */
  readonly triviaHref: string | null;
}

/** "Facts": up to nine sourced facts of the series, and the way to the trivia page when there is one. Server component. */
export function SeriesFactList({ name, facts, total, triviaHref }: SeriesFactListProps): React.ReactElement | null {
  if (facts.length === 0) return null;
  const action = triviaHref ? { href: triviaHref, label: t('hub.factsAll', { name, count: total }) } : undefined;
  return (
    <section className="ux-sec anime-o2-facts-block" aria-labelledby="anime-o2-facts-h" data-testid="series-facts-list">
      <SectionHeader id="anime-o2-facts-h" title={t('hub.facts', { name })} icon="bulb" {...(action ? { action } : {})} />
      <ul className="anime-o2-fact-list">
        {facts.map((f) => {
          const url = safeUrl(f.source_url);
          return (
            <li key={f.fact}>
              <span>{f.fact}</span>
              <small>{url ? <a href={url} rel="nofollow noopener" target="_blank">{f.source}</a> : f.source}</small>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
