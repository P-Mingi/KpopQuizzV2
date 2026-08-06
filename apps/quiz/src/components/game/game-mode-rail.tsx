import Link from 'next/link';

export interface ModeRailItem {
  slug: string;
  label: string;
  sub?: string;
  /** Override the computed href (`${base}/${slug}`) with a full path. */
  href?: string;
}

// G-HUB v2 step 4: the in-game mode rail. A horizontally-scrollable strip of
// image mode-cards (CSS-art covers, legal wall) that switch variants without an
// interstitial - each card is a real crawlable <Link> to a sibling variant URL
// that auto-starts on arrival. Server-rendered, so it also cross-links every live
// sibling for SEO. Min-gate (law 5): renders nothing when there is only the
// current variant (nothing to switch to). The current card is marked
// aria-current + highlighted. Not a tablist: each variant is its own real URL
// with its own data + SEO, so links (not client tabs) are correct here.
export function GameModeRail({ base, current, items, label }: {
  base: string;
  current: string;
  items: ModeRailItem[];
  label: string;
}): React.ReactElement | null {
  if (items.length < 2) return null;
  return (
    <nav className="gmr" aria-label={label}>
      <ul className="gmr-track">
        {items.map((it, i) => {
          const active = it.slug === current;
          return (
            <li key={it.slug}>
              <Link
                href={it.href ?? `${base}/${it.slug}`}
                className={`gmr-card${active ? ' on' : ''}`}
                aria-current={active ? 'page' : undefined}
              >
                <span className={`gmr-cover lmc-g${(i % 6) + 1}`} aria-hidden="true" />
                <span className="gmr-card-text">
                  <span className="gmr-name">{it.label}</span>
                  {it.sub ? <span className="gmr-sub">{it.sub}</span> : null}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
