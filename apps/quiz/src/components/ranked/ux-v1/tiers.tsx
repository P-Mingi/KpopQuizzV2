import { TIER_STRIP } from '@/lib/ranked/view';

import type { TierDisplay, TierKey } from '@/lib/ranked/view';

// Tier visuals of the ranked page (prototype #ranked, DESIGN-SPEC 15.4): the big
// shield of the season card, the tier chips of the results impact block and the
// ladder rows, and the seven-stop "Tiers" strip. Server-safe (no hooks). Colours
// are the prototype's tier colours (p7.css, .p7-t-<key>).

const ORDER: TierKey[] = TIER_STRIP.map((t) => t.key);

/** CSS class that sets --p7-tc for a tier (neutral when null). */
export function tierClass(key: TierKey | null): string {
  return key ? `p7-t-${key}` : 'p7-t-none';
}

/**
 * The season card shield (96 x 112): the tier colour and the division numeral.
 * Decorative: the card's H1 says the tier in words.
 */
export function TierShield({ tier }: { tier: TierDisplay | null }): React.ReactElement {
  return (
    <svg className={`p7-shield ${tierClass(tier?.key ?? null)}`} viewBox="0 0 96 112" aria-hidden="true" focusable="false">
      <path d="M48 2 92 18v32c0 28-19 48-44 60C23 98 4 78 4 50V18L48 2Z" />
      {tier?.numeral ? (
        <text x="48" y="57" textAnchor="middle" dominantBaseline="central">{tier.numeral}</text>
      ) : null}
    </svg>
  );
}

/** "Gold I" chip with the tier gem (results impact block). `gain` rings it in the tier colour. */
export function TierChip({ tier, gain }: { tier: TierDisplay; gain?: boolean }): React.ReactElement {
  return (
    <span className={`p7-tierchip ${tierClass(tier.key)}${gain ? ' is-gain' : ''}`}>
      <i aria-hidden="true" />
      {tier.label}
    </span>
  );
}

/** The small tier gem of a ladder row (the row's text names the tier). */
export function TierGem({ tier }: { tier: TierDisplay }): React.ReactElement {
  return <span className={`p7-gem ${tierClass(tier.key)}`} aria-hidden="true" />;
}

/**
 * The seven stops, Bronze to Legend, with their floors. `current` lights one stop
 * (the player's tier) and dims the ones below as passed; null = rules only.
 */
export function TierStrip({ current }: { current: TierKey | null }): React.ReactElement {
  const at = current ? ORDER.indexOf(current) : -1;
  return (
    <ol className={`p7-track${current ? ' has-on' : ''}`} aria-label="Tiers, lowest to highest">
      {TIER_STRIP.map((t, i) => {
        const state = at < 0 ? '' : i === at ? ' is-on' : i < at ? ' is-past' : '';
        return (
          <li key={t.key} className={`p7-tk ${tierClass(t.key)}${state}`} aria-current={i === at ? 'true' : undefined}>
            <i aria-hidden="true" />
            <b>{t.name}</b>
            <small>{t.floor}</small>
          </li>
        );
      })}
    </ol>
  );
}
