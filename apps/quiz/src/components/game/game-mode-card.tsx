import Link from 'next/link';

/**
 * One uniform, repeatable game-mode card (D0, Option A). Adding a new mode is a
 * single <GameModeCard>. `tint` is a CSS custom-property name (e.g. '--tot')
 * that colors the icon tile, badge, and play arrow. comingSoon renders a
 * non-interactive card that slots into the same grid.
 */
interface Props {
  name: string;
  desc: string;
  href: string;
  tint: string;
  icon: React.ReactNode;
  stat: string;
  badge?: string;
  comingSoon?: boolean;
  /** Accent border + tinted wash (used for the newest/featured mode). */
  highlight?: boolean;
  index?: number;
}

export function GameModeCard({
  name,
  desc,
  href,
  tint,
  icon,
  stat,
  badge,
  comingSoon = false,
  highlight = false,
  index = 0,
}: Props): React.ReactElement {
  const style = { '--gm-tint': `var(${tint})`, animationDelay: `${index * 40}ms` } as React.CSSProperties;

  const inner = (
    <>
      {comingSoon ? (
        <span className="gm-badge gm-soon">Coming soon</span>
      ) : (
        badge && <span className="gm-badge">{badge}</span>
      )}
      <span className="gm-icon" aria-hidden="true">{icon}</span>
      <span className="gm-name">{name}</span>
      <span className="gm-desc">{desc}</span>
      <span className="gm-foot">
        <span className="gm-stat">{stat}</span>
        <span className="gm-play">{comingSoon ? 'Soon' : 'Play →'}</span>
      </span>
    </>
  );

  if (comingSoon) {
    return (
      <div className="gm-card gm-disabled" style={style} aria-disabled="true">
        {inner}
      </div>
    );
  }

  return (
    <Link href={href} className={`gm-card${highlight ? ' gm-highlight' : ''}`} style={style}>
      {inner}
    </Link>
  );
}
