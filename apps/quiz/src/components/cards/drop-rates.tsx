// Bunnyverse Cards, lane U: the drop rates, both lines: each card, and the fifth card of every pack. Server component, no state. The
// numbers are ODDS and FIFTH_ODDS of lib/cards/rules.ts, the same table the draw uses.
import { EDITIONS, FIFTH_ODDS, ODDS, RARITIES, RARITY_NAMES } from '@/lib/cards/rules';

import { Gem } from './card-art';

const pct = (v: number): string => `${v}%`;

export function DropRates(): React.ReactElement {
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
          {RARITIES.map((r) => (
            <tr key={r}>
              <td><span className="rname"><Gem r={r} className={`gem gc-${r}`} /><span>{RARITY_NAMES[r]}</span><small>{EDITIONS[r].name}</small></span></td>
              <td>{pct(ODDS[r])}</td>
              <td className={FIFTH_ODDS[r] === 0 ? 'dim' : undefined}>{FIFTH_ODDS[r] === 0 ? '0%' : pct(FIFTH_ODDS[r])}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="fifth">The fifth card of every pack is Uncommon or better: if a Common comes up in fifth place, it becomes an Uncommon.</p>
      <p>Each card is drawn on its own. Packs are never sold and cards can&rsquo;t be sold.</p>
    </details>
  );
}
