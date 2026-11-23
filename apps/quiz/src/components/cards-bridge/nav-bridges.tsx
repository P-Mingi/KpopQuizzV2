// Bunnyverse Cards, lane BRIDGES: the buttons of the top bar (server markup, no hook). Drawn by the client shell only when the server gave it
// a list; its rules ride with it, so a build without the list carries no extra byte.
// Owner, 2026-11-23: "Make this button pink (and beautiful)". The KpopCards button is a pink pill with the pink of the KpopCards banner's button
// (#D13A6E to #B42A5C: white text 4.6:1 or more on every pixel), a soft pink glow, a small photocard icon (a white card with a pink star in front of
// a second card), a lift on hover, and no motion with reduced motion. The colours are fixed: the pill reads the same in both themes.
import type { NavBridge } from '@/lib/cards-bridge/nav';

const CSS = [
  '.ux-bridges{display:flex;align-items:center;gap:8px;flex:0 0 auto}',
  '.ux-bridge{display:inline-flex;align-items:center;gap:7px;height:34px;padding:0 16px 0 12px;border-radius:999px;font-size:14px;font-weight:700;line-height:1;letter-spacing:-.005em;white-space:nowrap;text-decoration:none;color:#FFFFFF;background:linear-gradient(135deg,#D13A6E 0%,#C43266 50%,#B42A5C 100%);box-shadow:inset 0 1px 0 rgba(255,255,255,.3),inset 0 -1px 0 rgba(90,10,40,.18),0 4px 14px rgba(209,58,110,.32);transition:transform .15s ease,box-shadow .15s ease}',
  '.ux-bridge:hover{color:#FFFFFF;transform:translateY(-1px);box-shadow:inset 0 1px 0 rgba(255,255,255,.3),inset 0 -1px 0 rgba(90,10,40,.18),0 8px 22px rgba(209,58,110,.48)}',
  '.ux-bridge:active{transform:translateY(0)}',
  '.ux-bridge:focus-visible{outline:2px solid var(--ux-pink);outline-offset:3px}',
  '.ux-bridge svg{flex:none;width:18px;height:18px;transition:transform .2s ease}',
  '.ux-bridge:hover svg{transform:rotate(-8deg)}',
  '@media (prefers-reduced-motion:reduce){.ux-bridge,.ux-bridge svg{transition:none}.ux-bridge:hover,.ux-bridge:hover svg{transform:none}}',
  '@media (max-width:1100px){.ux-bridges{display:none}}',
].join('');

/** Two photocards: a second card tilted behind, and in front a white card with a pink star. */
function CardsIcon(): React.ReactElement {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <rect x="9" y="3.5" width="11" height="15" rx="2.2" transform="rotate(14 14.5 11)" fill="#FFFFFF" opacity=".45" />
      <rect x="4" y="5.5" width="11" height="15" rx="2.2" fill="#FFFFFF" />
      <path d="M9.5 10.3L10.18 12.07L12.07 12.17L10.59 13.36L11.09 15.18L9.5 14.15L7.91 15.18L8.41 13.36L6.93 12.17L8.82 12.07Z" fill="#C43266" />
    </svg>
  );
}

export function NavBridgeLinks({ items }: { items: readonly NavBridge[] }): React.ReactElement | null {
  if (items.length === 0) return null;
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <nav className="ux-bridges" aria-label="Bunnyverse" data-testid="nav-bridges">
        {items.map((it) => (
          <a key={it.key} className={`ux-bridge ux-bridge-${it.key}`} href={it.href} rel="nofollow" data-bridge={it.key}>
            {it.key === 'cards' ? <CardsIcon /> : null}
            {it.label}
          </a>
        ))}
      </nav>
    </>
  );
}
