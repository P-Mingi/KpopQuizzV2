import { UxButton } from '@/components/ux-v1/button';
import { SectionHeader } from '@/components/ux-v1/section-header';
import { t } from '@/lib/anime/copy';

import type { OpeningRow } from '@/lib/anime/series-model';

interface OpeningsTableProps {
  readonly name: string;
  readonly rows: readonly OpeningRow[];
  /** The openings quiz of the series, only at 15 playable themes or more (MIN_PLAYABLE_THEMES); null: no link. */
  readonly quizHref: string | null;
}

/**
 * A4, openings and endings: kind (opening, ending, insert song), number, title, artist, season. The link to the
 * openings quiz shows only when the series has enough playable themes. The last column is the empty credit slot of a later
 * lot (a crossover credit); it prints nothing now. Server component.
 */
export function OpeningsTable({ name, rows, quizHref }: OpeningsTableProps): React.ReactElement | null {
  if (rows.length === 0) return null;
  return (
    <section className="ux-sec anime-o2-openings" aria-labelledby="anime-o2-openings-h" data-testid="openings">
      <SectionHeader id="anime-o2-openings-h" title={t('hub.openings')} icon="music" />
      <table className="anime-o2-table">
        <thead>
          <tr>
            <th scope="col">{t('hub.openingColNumber')}</th>
            <th scope="col">{t('hub.openingColTitle')}</th>
            <th scope="col">{t('hub.openingColArtist')}</th>
            <th scope="col">{t('hub.openingColSeason')}</th>
            <th scope="col" className="anime-o2-credit"><span className="ux-sr">{t('hub.openingsCredit')}</span></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td data-label={t('hub.openingColNumber')}>{r.kindLabel} {r.number}</td>
              <td data-label={t('hub.openingColTitle')}>{r.title}</td>
              <td data-label={t('hub.openingColArtist')}>{r.artist}</td>
              <td data-label={t('hub.openingColSeason')}>{r.season ?? ''}</td>
              <td className="anime-o2-credit" data-slot="credit" />
            </tr>
          ))}
        </tbody>
      </table>
      {quizHref ? (
        <p className="anime-o2-openings-play"><UxButton href={quizHref} icon="music" variant="ghost">{t('hub.openingsQuiz', { name })}</UxButton></p>
      ) : null}
    </section>
  );
}
