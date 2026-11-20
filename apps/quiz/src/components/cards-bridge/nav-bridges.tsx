// Bunnyverse Cards, lane BRIDGES: the buttons of the top bar (server markup, no hook). Drawn by the client shell only when the server gave it
// a list; its rules ride with it (tokens only), so a build without the list carries no extra byte.
import type { NavBridge } from '@/lib/cards-bridge/nav';

const CSS = '.ux-bridges{display:flex;align-items:center;gap:8px;flex:0 0 auto}@media (max-width:1100px){.ux-bridges{display:none}}';

export function NavBridgeLinks({ items }: { items: readonly NavBridge[] }): React.ReactElement | null {
  if (items.length === 0) return null;
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <nav className="ux-bridges" aria-label="Bunnyverse" data-testid="nav-bridges">
        {items.map((it) => (
          <a key={it.key} className="ux-btn ux-btn-ghost ux-btn-sm" href={it.href} rel="nofollow" data-bridge={it.key}>{it.label}</a>
        ))}
      </nav>
    </>
  );
}
