import { BadgeIcon } from './badge-icon';
import { badgeRarity, RARITY_COLOR } from '@/lib/badges';

// Badge redesign - the rarity coin. A circular disc tinted to its rarity, with the
// vector icon centered. Rarity reads from ring colour + glow (see .bcoin in
// globals.css): flat common -> soft-lit rare -> conic-ring epic -> gold-shimmer
// legendary. Locked coins are grayscaled with a lock chip. Shared by the shelf +
// the expanded grid so the family stays consistent.
export function BadgeCoin({ id, earned = true, size = 44 }: { id: string; earned?: boolean; size?: number }): React.ReactElement {
  const rarity = badgeRarity(id);
  const iconSize = Math.round(size * 0.56);
  const lockSize = Math.round(size * 0.42);
  return (
    <span
      className={earned ? 'bcoin' : 'bcoin bcoin-locked'}
      data-rarity={rarity}
      style={{ ['--r' as string]: RARITY_COLOR[rarity], width: size, height: size }}
    >
      {rarity === 'legendary' && earned ? <span className="bcoin-shim" aria-hidden="true" /> : null}
      <BadgeIcon id={id} size={iconSize} />
      {!earned ? (
        <span className="bcoin-lock" aria-hidden="true">
          <svg viewBox="0 0 24 24" width={lockSize} height={lockSize} fill="none">
            <rect x="5" y="10.5" width="14" height="9.5" rx="2.2" fill="currentColor" />
            <path d="M8.2 10.5V7.8a3.8 3.8 0 017.6 0v2.7" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" />
          </svg>
        </span>
      ) : null}
    </span>
  );
}
