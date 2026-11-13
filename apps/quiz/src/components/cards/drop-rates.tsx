// Bunnyverse Cards, lane U: the drop rates, two tables: each card, and the fifth card of every pack, with the calculation in plain
// words. Server component, no state. The percentages are those of the real catalog (the server's computeOdds of lib/cards/rules.ts, sent with the catalog): only the rarities that have
// a card are listed, because an edition with no card can never come out.
import { RARITY_LABEL } from '@/lib/cards/rules';
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
      <table aria-label="Chance of each card">
        <caption>Each card</caption>
        <thead>
          <tr><th scope="col">Rarity</th><th scope="col">Chance</th></tr>
        </thead>
        <tbody>
          {t.present.map((r) => (
            <tr key={r}>
              <td><span className="rname"><Gem r={r} className={`gem gc-${r}`} /><span>{RARITY_LABEL[r]}</span></span></td>
              <td>{pct(t.each[r])}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {/* Lot 3 point B10: the fifth card has a table of its own (a Standard there is lifted), only the rarities it can be. */}
      <table id="rates-fifth" aria-label="Chance of the fifth card">
        <caption>The fifth card of a pack</caption>
        <thead>
          <tr><th scope="col">Rarity</th><th scope="col">Chance</th></tr>
        </thead>
        <tbody>
          {t.present.filter((r) => t.fifth[r] !== undefined).map((r) => (
            <tr key={r}>
              <td><span className="rname"><Gem r={r} className={`gem gc-${r}`} /><span>{RARITY_LABEL[r]}</span></span></td>
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
          <ul className="draw" aria-label="Type split by rarity">{t.typeSplit.map((x) => <li key={x}>{x}</li>)}</ul>
          <p><b>The chance of one given card</b></p>
          <ul className="draw" aria-label="Chance of one given card">{t.cardChance.map((x) => <li key={`${x.r}-${x.kind}`}>{x.label}</li>)}</ul>
        </>
      ) : null}
      {t.absent.length ? <p>Not in packs yet: {t.absent.map((r) => RARITY_LABEL[r]).join(', ')}.</p> : null}
      <p>Each card is drawn on its own.{t.fifthFloor ? ` The fifth card of every pack is ${RARITY_LABEL[t.fifthFloor]} or better.` : ''} Packs are never sold and cards can&rsquo;t be sold.</p>
    </details>
  );
}
