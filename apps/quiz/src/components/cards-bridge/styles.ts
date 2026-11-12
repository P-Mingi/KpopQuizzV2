// Bunnyverse Cards, lane B: the rules of the bridge blocks, one inline style string (tokens only, no stylesheet changes), the way kpopdle-group.tsx does.
export const CARDS_BRIDGE_CSS = `
.cb-home, .cb-group { display: flex; flex-direction: column; gap: 10px; padding: 22px; border: 1px solid var(--ux-line); border-radius: 22px; background: var(--ux-raised); color: var(--ux-ink); }
.cb-home h2, .cb-group h2 { font-size: 20px; line-height: 1.3; font-weight: 800; }
.cb-home p, .cb-group p { font-size: 15px; line-height: 1.5; color: var(--ux-muted); }
.cb-home .cb-big { font-size: 18px; font-weight: 700; color: var(--ux-ink); }
.cb-home .ux-btn { align-self: flex-start; }
.cb-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(84px, 1fr)); gap: 8px; list-style: none; padding: 0; margin: 0; }
.cb-card { aspect-ratio: 55 / 85; border-radius: 10px; border: 1px solid var(--ux-line); overflow: hidden; background: var(--ux-sunken, var(--ux-raised)); display: flex; align-items: center; justify-content: center; text-align: center; font-size: 11px; line-height: 1.2; padding: 4px; color: var(--ux-muted); }
.cb-card img { width: 100%; height: 100%; object-fit: cover; display: block; }
.cb-card.is-missing { filter: grayscale(1); opacity: .75; }
.cb-links { display: flex; flex-wrap: wrap; gap: 14px; }
.cb-bonus { display: flex; align-items: center; gap: 8px; margin-top: 8px; font-size: 14px; }
@media (max-width: 760px) { .cb-home, .cb-group { padding: 18px; } .cb-home .ux-btn { align-self: stretch; text-align: center; } }
`;
