// KpopCards: the "Drop rates" box of the lobby (v6): a colour bar of the editions, the table (Edition, Cards 1 to 4, Card 5) and the four rules. Server-safe, no state.
// The percentages are the real catalog's (computeOdds of lib/cards/rules.ts): only the editions that have a card in packs are listed.
import { PITY_UR, RARITY_LABEL } from '@/lib/cards/rules';
import { KC } from '@/lib/kpopcards/contract';
import { dupBiasExempt, dupBiasRule } from '@/lib/kpopcards/dup-text';

import { Gem } from './card-art';

import type { CatalogOdds, Rarity } from '@/lib/cards/types';

const fmtP = (x: number): string => (x <= 0 ? 'none' : `${Math.round(x * 100) / 100}%`);
const RANK: readonly Rarity[] = ['C', 'U', 'R', 'SR', 'UR', 'L'];

export function OddsBox({ odds, pityLeft = null }: { odds: CatalogOdds | null; pityLeft?: number | null }): React.ReactElement {
  const live = odds ? RANK.filter((r) => odds.available.includes(r)) : [];
  return (
    <>
      <div className="oddsbar" id="oddsbar" aria-hidden="true">
        {odds ? live.map((r) => <i key={r} style={{ width: `${odds.card[r]}%`, background: `var(--g-${r.toLowerCase()})` }} title={`${RARITY_LABEL[r]} ${fmtP(odds.card[r])}`} />) : null}
      </div>
      <table id="odds">
        <thead><tr><th>Edition</th><th>Cards 1 to 4</th><th>Card 5</th></tr></thead>
        <tbody>
          {odds ? live.map((r) => (
            <tr key={r}>
              <td><span className="rname"><Gem r={r} className={`gem gc-${r}`} /><span>{RARITY_LABEL[r]}</span></span></td>
              <td>{fmtP(odds.card[r])}</td>
              <td className={odds.fifth[r] <= 0 ? 'zero' : undefined}>{fmtP(odds.fifth[r])}</td>
            </tr>
          )) : null}
        </tbody>
      </table>
      <ul className="rules">
        <li><b>Duplicates.</b> {dupBiasRule()} {dupBiasExempt()}</li>
        <li><b>Gold guarantee.</b> If {PITY_UR - 1} packs in a row bring nothing Gold or better, the fifth card of pack {PITY_UR} is Gold. {pityLeft !== null ? <span id="pity-r">You are at {PITY_UR - pityLeft} of {PITY_UR - 1}.</span> : null}</li>
        <li><b>Golden pack.</b> Every {KC.GOLDEN_EVERY}th pack is golden: its fifth card is Holo or better.</li>
        <li><b>Missing half.</b> When you own one half of a group card, the same edition gives you the other half.</li>
        <li><b>Themed packs</b> only change which idols can come out, never the odds of an edition.</li>
      </ul>
    </>
  );
}
