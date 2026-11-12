// Bunnyverse Cards, lane U: the drop rates, both lines: each card, and the fifth card of every pack, with the calculation in plain
// words. Server component, no state. The percentages are those of the real catalog (the server's computeOdds of lib/cards/rules.ts, sent with the catalog): only the rarities that have
// a card are listed, because an edition with no card can never come out.
import { EDITIONS, RARITY_NAMES } from '@/lib/cards/rules';
import { oddsView } from '@/lib/cards/ui-model';

import { Gem } from './card-art';

import type { CatalogOdds } from '@/lib/cards/types';

const pct = (v: number | undefined): string => `${(v ?? 0).toFixed(2)}%`;

export function DropRates({ odds }: { odds: CatalogOdds | null }): React.ReactElement {
  const t = oddsView(odds);
  return (
    <details className="rates" id="rates">
      <summary>
        <span className="h2">Drop rates</span>
        <svg className="ico chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
      </summary>
      <table>
        <thead>
          <tr><th scope="col">Rarity</th><th scope="col">Each card</th><th scope="col">Fifth card</th></tr>
        </thead>
        <tbody>
          {t.present.map((r) => (
            <tr key={r}>
              <td><span className="rname"><Gem r={r} className={`gem gc-${r}`} /><span>{RARITY_NAMES[r]}</span><small>{EDITIONS[r].name}</small></span></td>
              <td>{pct(t.each[r])}</td>
              <td className={t.fifth[r] === undefined ? 'dim' : undefined}>{pct(t.fifth[r])}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="fifth">{t.eachWords}</p>
      {t.fifthWords ? <p className="fifth">{t.fifthWords}</p> : null}
      {t.absent.length ? <p>Not in packs yet: {t.absent.map((r) => RARITY_NAMES[r]).join(', ')}.</p> : null}
      <p>Each card is drawn on its own. The fifth card of every pack is Uncommon or better. Packs are never sold and cards can&rsquo;t be sold.</p>
    </details>
  );
}
