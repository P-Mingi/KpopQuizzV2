// Bunnyverse Cards, lane U: the drop rates, two tables: each card, and the fifth card of every pack, with the calculation in plain
// words. Server component, no state. The percentages are those of the real catalog (the server's computeOdds of lib/cards/rules.ts, sent with the catalog): only the rarities that have
// a card are listed, because an edition with no card can never come out.
import { RARITY_LABEL } from '@/lib/cards/rules';
import { oddsView } from '@/lib/cards/ui-model';

import { Gem } from './card-art';

import type { CatalogOdds } from '@/lib/cards/types';

const pct = (v: number | undefined): string => `${(v ?? 0).toFixed(2)}%`;

/**
 * `rules`: list items (<li>) appended to the "Pack rules" list under the table. That list is the place of the rules sentences: lane ECON
 * adds the Gold guarantee, the missing half and the focus pack there (id "rates-rules", data-slot "pack-rules").
 */
export function DropRates({ odds, rules = null }: { odds: CatalogOdds | null; rules?: React.ReactNode }): React.ReactElement {
  const t = oddsView(odds);
  return (
    <details className="rates" id="rates">
      <summary>
        <span className="h2">Drop rates</span>
        <svg className="ico chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
      </summary>
      {/* Lot 3 point A10: one table, one row per edition that exists in packs (computeOdds of the real pool), the first four cards and the fifth. */}
      <table id="rates-table" aria-label="Chance of each edition">
        <caption>Chance of each edition</caption>
        <thead>
          <tr><th scope="col">Edition</th><th scope="col">Cards 1 to 4</th><th scope="col">Card 5</th></tr>
        </thead>
        <tbody>
          {t.present.map((r) => (
            <tr key={r}>
              <th scope="row"><span className="rname"><Gem r={r} className={`gem gc-${r}`} /><span>{RARITY_LABEL[r]}</span></span></th>
              <td>{pct(t.each[r])}</td>
              <td>{pct(t.fifth[r])}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="fifth">{t.eachWords}</p>
      {t.fifthWords ? <p className="fifth">{t.fifthWords}</p> : null}
      {t.drawSteps.length ? (
        <>
          <p><b>How a card is drawn</b></p>
          <ol className="draw">{t.drawSteps.map((x) => <li key={x}>{x}</li>)}</ol>
          <ul className="draw" aria-label="Type split by edition">{t.typeSplit.map((x) => <li key={x}>{x}</li>)}</ul>
          <p><b>The chance of one given card</b></p>
          <ul className="draw" aria-label="Chance of one given card">{t.cardChance.map((x) => <li key={`${x.r}-${x.kind}`}>{x.label}</li>)}</ul>
        </>
      ) : null}
      {t.absent.length ? <p>Not in packs yet: {t.absent.map((r) => RARITY_LABEL[r]).join(', ')}.</p> : null}
      <section className="rules-place" id="rates-rules" aria-labelledby="rates-rules-h" data-slot="pack-rules">
        <h3 className="rules-h" id="rates-rules-h">Pack rules</h3>
        <ul className="rules-list">
          <li>Each card is drawn on its own.{t.fifthFloor ? ` The fifth card of every pack is ${RARITY_LABEL[t.fifthFloor]} or better.` : ''}</li>
          <li>Packs are never sold and cards can&rsquo;t be sold.</li>
          {rules}
        </ul>
      </section>
    </details>
  );
}
