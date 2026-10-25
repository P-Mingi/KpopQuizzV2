import { Icon } from '@/components/ux-v1/icon';
import { Panel } from '@/components/ux-v1/panel';
import { t } from '@/lib/anime/copy';
import { adaptationLine } from '@/lib/anime/manhwa';
import { airingRecord, headerFacts, sourceLinks } from '@/lib/anime/series-model';

import type { SeriesSourceRow } from '@/lib/anime/series';
import type { SeriesRow } from '@/lib/anime/types';

interface SeriesFactsProps {
  readonly series: SeriesRow;
  /** The name the hub prints as its title; the English title is listed when it differs. */
  readonly name?: string;
  readonly sources: readonly SeriesSourceRow[];
}

/**
 * A1, the facts under the hub's title: the native and romaji titles, studios, years, status, episodes or chapters,
 * "Sources (i)" from entity_sources, and "Now airing" only when `series.airing` holds a record. Server component: the
 * facts are in the HTML. It takes the place of the facts line of the group hub (GroupHubV11 `slots.heroFacts`).
 */
export function SeriesFacts({ series, sources, name }: SeriesFactsProps): React.ReactElement | null {
  const facts = headerFacts(series, name);
  const airing = airingRecord(series.airing);
  const links = sourceLinks(sources, series);
  const adapts = adaptationLine(series);
  if (facts.length === 0 && !airing && links.length === 0 && !adapts) return null;
  return (
    <div className="anime-o2-facts" data-testid="series-facts">
      {airing ? (
        <p className="anime-o2-airing" data-testid="now-airing">
          <Icon name="play" />
          <b>{t('hub.nowAiring')}</b>
          {airing.episode !== null ? <span>{t('hub.airingEpisode', { number: airing.episode })}</span> : null}
          {airing.nextDate ? <span>{t('hub.airingNext', { date: airing.nextDate })}</span> : null}
          {airing.sourceUrl ? <a href={airing.sourceUrl} rel="nofollow noopener" target="_blank">{t('hub.airingSource')}</a> : null}
        </p>
      ) : null}
      {adapts ? <p className="anime-o2-adapts" data-testid="manhwa-adaptation">{adapts}</p> : null}
      {facts.length > 0 ? (
        <dl className="anime-o2-dl">
          {facts.map((f) => (
            <div key={f.key} className="anime-o2-fact">
              <dt>{f.label}</dt>
              <dd className={f.key === 'native' ? 'anime-o2-native' : undefined} lang={f.key === 'native' ? 'ja' : undefined}>{f.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      {links.length > 0 ? (
        <details className="anime-o2-sources">
          <summary>{t('hub.sources')} <span aria-hidden="true">(i)</span></summary>
          <Panel as="div" title={t('hub.sourcesNote')} icon="book">
            <ul className="anime-o2-source-list">
              {links.map((l) => (
                <li key={l.key}>
                  {l.url ? <a href={l.url} rel="nofollow noopener" target="_blank">{l.label}</a> : l.label}
                  {l.fields.length > 0 ? <small>{l.fields.join(', ')}</small> : null}
                </li>
              ))}
            </ul>
          </Panel>
        </details>
      ) : null}
    </div>
  );
}
