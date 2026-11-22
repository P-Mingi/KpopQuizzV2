// Site switcher (owner, 2026-11-22): KpopQuiz, OtakuQuiz and Bunnyverse from the top bar. A round chevron button sits against the logo (the
// workspace switcher pattern: it costs 36px, where a three name pill needs 280px and the bar of kpopquiz.org has about 30 to spare), and opens a
// small panel of three 52px rows: a colour dot, the name, one line, "You are here" on the current one. The same markup serves phone and desktop:
// the panel hangs under the button, and on a phone it spans the screen under the bar. Tokens of the site only, no new font or dependency. The links
// are always in the served HTML (nofollow, through the signed-in jump), so a closed panel changes nothing for a crawler.
import { useEffect, useId, useRef, useState } from 'react';

import { Icon } from '@/components/ux-v1/icon';

import type { SiteSwitchModel } from '@/lib/site-switch/model';

const BLURB: Readonly<Record<string, string>> = { kpop: 'K-pop quizzes', anime: 'Anime and manga quizzes', hub: 'Every site, one passport' };
const DOT: Readonly<Record<string, string>> = { kpop: '#E8457A', anime: '#C2410C', hub: '#1F1B17' };

const CSS = [
  '.ux-sw{position:relative;flex:0 0 auto;display:flex;align-items:center;margin-left:-10px}',
  '.ux-sw-btn{display:inline-grid;place-items:center;width:32px;height:32px;padding:0;border:1px solid var(--ux-edge);border-radius:999px;background:var(--ux-surface);color:var(--ux-ink);cursor:pointer}',
  '.ux-sw-btn:hover,.ux-sw[data-open] .ux-sw-btn{background:var(--ux-surface-2);border-color:var(--ux-input)}',
  '.ux-sw-btn .ux-ico{width:16px;height:16px;transition:transform .15s}',
  '.ux-sw[data-open] .ux-sw-btn .ux-ico{transform:rotate(180deg)}',
  '.ux-sw-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}',
  '.ux-sw-list{display:none;list-style:none;margin:0;padding:6px;flex-direction:column;gap:2px;position:absolute;top:calc(100% + 12px);left:0;width:272px;z-index:70;background:var(--ux-raised);border:1px solid var(--ux-edge);border-radius:16px;box-shadow:0 12px 32px rgba(0,0,0,.14)}',
  '.ux-sw[data-open] .ux-sw-list{display:flex}',
  '.ux-sw-i{display:flex;align-items:center;gap:12px;min-height:52px;padding:0 12px;border-radius:12px;color:var(--ux-ink)}',
  'a.ux-sw-i:hover{background:var(--ux-surface)}',
  '.ux-sw-i[aria-current]{background:var(--ux-pink-soft)}',
  '.ux-sw-dot{flex:0 0 auto;width:12px;height:12px;border-radius:50%;box-shadow:0 0 0 1px var(--ux-edge)}',
  '.ux-sw-t{display:flex;flex-direction:column;min-width:0;line-height:1.25}',
  '.ux-sw-t b{font-size:15px;font-weight:600}',
  '.ux-sw-t small{font-size:12px;font-weight:500;color:var(--ux-muted)}',
  '.ux-sw-i[aria-current] .ux-sw-t small{color:var(--ux-pink-soft-ink)}',
  // The button takes 36px of a bar that had about 1px to spare at 1440 with the KpopCards button: with it present, the gaps and pills tighten by 48px (desktop only).
  '@media (min-width:901px){.ux-nav-in:has(.ux-sw){gap:14px}.ux-nav-in:has(.ux-sw) .ux-links a{padding:0 8px}}',
  '@media (max-width:900px){.ux-sw-btn{width:44px;height:44px}.ux-sw{margin-left:-4px}}',
  '@media (max-width:760px){.ux-sw{position:static}.ux-sw-list{position:fixed;left:12px;right:12px;top:calc(70px + env(safe-area-inset-top,0px));width:auto}}',
].join('');

export function SiteSwitch({ model }: { model: SiteSwitchModel }): React.ReactElement {
  const [open, setOpen] = useState(false);
  const listId = useId();
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
  return (
    <div className="ux-sw" ref={root} data-testid="site-switch" {...(open ? { 'data-open': '' } : {})}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <nav aria-label="Switch site" style={{ display: 'contents' }}>
        <button type="button" className="ux-sw-btn" aria-expanded={open} aria-controls={listId} title="Switch site" onClick={() => setOpen((o) => !o)}>
          <Icon name="chev" /><span className="ux-sw-sr">Switch site</span>
        </button>
        <ul className="ux-sw-list" id={listId}>
          {model.items.map((it) => (
            <li key={it.id}>
              {it.href === null
                ? <span className="ux-sw-i" aria-current="true" data-site={it.id}><Row id={it.id} label={it.label} note="You are here" /></span>
                : <a className="ux-sw-i" href={it.href} rel="nofollow" data-site={it.id}><Row id={it.id} label={it.label} note={BLURB[it.id] ?? ''} /></a>}
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}

function Row({ id, label, note }: { id: string; label: string; note: string }): React.ReactElement {
  return (
    <>
      <span className="ux-sw-dot" style={{ background: DOT[id] ?? 'currentColor' }} aria-hidden="true" />
      <span className="ux-sw-t"><b>{label}</b><small>{note}</small></span>
    </>
  );
}
