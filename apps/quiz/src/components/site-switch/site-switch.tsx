// Site switcher (owner, 2026-11-22; redesigned 2026-11-23 from the integrator's prototype): KpopQuiz, OtakuQuiz and Bunnyverse from the top bar.
// ONE button holds the brand (the rabbit and the wordmark of the site) and a chevron: where the switcher shows it IS the brand's place in the bar,
// so the logo still reads as the brand and the name stays visible. It opens a 340px panel: a mono label, one 60px link row per quiz site (a 36px
// square chip in the colours of the site, the name, one line), the current site as a non-link row with a check and aria-current="page", then a
// separator and the Bunnyverse row (black chip, arrow). On a phone (up to 760px) the panel spans the width under the bar with 10px margins and a
// scrim behind it, rows of 64px. Tokens of the site only, no new font or dependency. The links are always in the served HTML (nofollow, through
// the signed-in jump), so a closed panel changes nothing for a crawler. The Home link is still in the nav links and the tab bar.
// Hub (owner, 2026-11-23): the same component in the bars of the hub (the shell's, the home's and the daily games'); there the current row is Bunnyverse
// (a non-link row after the separator, with the check), KpopQuiz and OtakuQuiz are links. 'use client' so the hub's server bars can render it.
'use client';

import { useEffect, useId, useRef, useState } from 'react';

import { UxBrandMark } from '@/components/ux-v1/brand';
import { Icon } from '@/components/ux-v1/icon';

import type { SiteSwitchModel, SwitchItem } from '@/lib/site-switch/model';

const BLURB: Readonly<Record<string, string>> = { kpop: 'K-pop quizzes', anime: 'Anime quizzes', hub: 'Every site, one passport' };
const INITIAL: Readonly<Record<string, string>> = { kpop: 'K', anime: 'O', hub: 'B' };
// Chip fills: the accent fill of each site (registry tokens pink-fill: kpop #D13A6E, OtakuQuiz #C2410C), white initial, 4.5:1 or more in both
// themes (kpop 4.9, OtakuQuiz 5.18). The Bunnyverse chip is the ink of the hub; in dark mode it turns to the light ink so it stays visible.
export const CHIP_FILL: Readonly<Record<string, string>> = { kpop: '#D13A6E', anime: '#C2410C', hub: '#1F1B17' };

const CSS = [
  '.ux-sw{position:relative;flex:0 0 auto;display:flex;align-items:center;--sw-edge:#E6E0D7;--sw-chip-hub:#1F1B17;--sw-chip-hub-ink:#fff}',
  'html.ux-v1.dark .ux-sw{--sw-edge:var(--ux-edge);--sw-chip-hub:#F3F0EB;--sw-chip-hub-ink:#141312}',
  '@media (prefers-color-scheme:dark){html.ux-v1:not(.light) .ux-sw{--sw-edge:var(--ux-edge);--sw-chip-hub:#F3F0EB;--sw-chip-hub-ink:#141312}}',
  '.ux-sw-btn{display:inline-flex;align-items:center;gap:10px;height:44px;padding:0 10px 0 8px;margin:0 0 0 -8px;border:0;border-radius:12px;background:transparent;color:var(--ux-ink);font:inherit;font-weight:700;font-size:17px;letter-spacing:-0.02em;white-space:nowrap;cursor:pointer}',
  '.ux-sw-btn:hover,.ux-sw[data-open] .ux-sw-btn{background:var(--ux-surface)}',
  '.ux-sw-btn:focus-visible,.ux-sw-i:focus-visible{outline:2px solid var(--ux-ink);outline-offset:2px}',
  '.ux-sw-btn .ux-sw-chev{width:16px;height:16px;flex:0 0 auto;color:var(--ux-muted);transition:transform .18s ease}',
  '.ux-sw[data-open] .ux-sw-btn .ux-sw-chev{transform:rotate(180deg)}',
  '.ux-sw-menu{display:none;position:absolute;top:calc(100% + 8px);left:0;width:340px;max-width:calc(100vw - 20px);z-index:70;box-sizing:border-box;padding:8px;background:var(--ux-raised);border:1px solid var(--sw-edge);border-radius:20px;box-shadow:0 16px 40px rgba(31,27,23,.12),0 2px 8px rgba(31,27,23,.06)}',
  '.ux-sw[data-open] .ux-sw-menu{display:block}',
  '.ux-sw-lab{margin:0;padding:8px 12px 6px;font-family:var(--font-dm-mono),"DM Mono",ui-monospace,monospace;font-size:11px;font-weight:500;letter-spacing:.08em;text-transform:uppercase;color:var(--ux-muted)}',
  '.ux-sw-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:2px}',
  '.ux-sw-sep{height:1px;margin:6px 4px;border:0;background:var(--sw-edge);list-style:none}',
  '.ux-sw-i{display:flex;align-items:center;gap:12px;min-height:60px;padding:8px 12px;border-radius:14px;color:var(--ux-ink);text-decoration:none}',
  'a.ux-sw-i:hover{background:var(--ux-surface)}',
  '.ux-sw-chip{flex:0 0 auto;display:grid;place-items:center;width:36px;height:36px;border-radius:11px;color:#fff;font-size:16px;font-weight:700;line-height:1}',
  '.ux-sw-chip[data-chip=hub]{background:var(--sw-chip-hub);color:var(--sw-chip-hub-ink)}',
  '.ux-sw-t{display:flex;flex-direction:column;min-width:0;flex:1 1 auto;line-height:1.3}',
  '.ux-sw-t b{font-size:16px;font-weight:700}',
  '.ux-sw-t small{font-size:13px;font-weight:500;color:var(--ux-muted)}',
  '.ux-sw-end{flex:0 0 auto;width:20px;height:20px;color:var(--ux-ink)}',
  '.ux-sw-scrim{display:none}',
  // The button replaces the brand link, so the bar keeps its budget (the old round button took 36px): the tighter gaps stay for the desktop bar.
  '@media (min-width:901px){.ux-nav-in:has(.ux-sw){gap:14px}.ux-nav-in:has(.ux-sw) .ux-links a{padding:0 8px}}',
  '@media (max-width:760px){.ux-sw{position:static}.ux-sw-menu{position:absolute;left:10px;right:10px;top:70px;width:auto;max-width:none}.ux-sw-i{min-height:64px}',
  '.ux-sw[data-open] .ux-sw-scrim{display:block;position:absolute;left:0;right:0;top:64px;height:100vh;z-index:69;background:rgba(20,19,18,.4)}}',
  '@media (prefers-reduced-motion:reduce){.ux-sw-btn .ux-sw-chev{transition:none}}',
].join('');

export function SiteSwitch({ model }: { model: SiteSwitchModel }): React.ReactElement {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key !== 'Escape') return;
      setOpen(false);
      root.current?.querySelector<HTMLButtonElement>('.ux-sw-btn')?.focus();
    };
    const onDown = (e: Event): void => { if (root.current && !root.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('pointerdown', onDown); };
  }, [open]);
  const quiz = model.items.filter((it) => it.id !== 'hub');
  const hub = model.items.find((it) => it.id === 'hub');
  return (
    <div className="ux-sw" ref={root} data-testid="site-switch" {...(open ? { 'data-open': '' } : {})}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <button type="button" className="ux-sw-btn" aria-haspopup="true" aria-expanded={open} aria-controls={menuId} onClick={() => setOpen((o) => !o)}>
        <UxBrandMark />
        <Icon name="chev" className="ux-sw-chev" />
      </button>
      <div className="ux-sw-scrim" aria-hidden="true" onClick={() => setOpen(false)} />
      <nav className="ux-sw-menu" id={menuId} aria-label="Switch site">
        <p className="ux-sw-lab" aria-hidden="true">Switch site</p>
        <ul className="ux-sw-list">
          {quiz.map((it) => <li key={it.id}><Row item={it} /></li>)}
          {hub ? <li className="ux-sw-sep" role="separator" /> : null}
          {hub ? <li><Row item={hub} /></li> : null}
        </ul>
      </nav>
    </div>
  );
}

function Row({ item }: { item: SwitchItem }): React.ReactElement {
  const body = (
    <>
      <span className="ux-sw-chip" data-chip={item.id} style={item.id === 'hub' ? undefined : { background: CHIP_FILL[item.id] ?? '#1F1B17' }} aria-hidden="true">{INITIAL[item.id] ?? item.label.slice(0, 1)}</span>
      <span className="ux-sw-t"><b>{item.label}</b><small>{BLURB[item.id] ?? ''}</small></span>
      {item.href === null ? <Check /> : item.id === 'hub' ? <Arrow /> : null}
    </>
  );
  return item.href === null
    ? <span className="ux-sw-i" aria-current="page" data-site={item.id}>{body}</span>
    : <a className="ux-sw-i" href={item.href} rel="nofollow" data-site={item.id}>{body}</a>;
}

function Check(): React.ReactElement {
  return <svg className="ux-sw-end" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" data-end="check"><path d="M4.5 10.5l3.5 3.5 7.5-8" /></svg>;
}
function Arrow(): React.ReactElement {
  return <svg className="ux-sw-end" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" data-end="arrow"><path d="M4 10h11M10.5 5l5 5-5 5" /></svg>;
}
