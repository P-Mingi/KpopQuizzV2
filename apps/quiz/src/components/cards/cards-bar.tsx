'use client';

// Bunnyverse Cards, lane U: the bar under the hub chrome: Packs and Binder, and the wallet (packs held, shards). The prototype drew this
// as its own top bar with the logo; here the hub's top bar stays and this one belongs to the Cards. Not sticky: the hub keeps its own.
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { useCards } from './cards-provider';

const Icon = ({ d }: { d: string }): React.ReactElement => <svg className="ico" viewBox="0 0 24 24" aria-hidden="true"><path d={d} /></svg>;

export function CardsBar(): React.ReactElement {
  const { status, state, newSet } = useCards();
  const path = usePathname() ?? '';
  const onBinder = path.startsWith('/cards/binder');
  const onPacks = path === '/cards';
  const n = newSet.size;
  return (
    <div className="bar-cards">
      <nav className="tabs" aria-label="Cards">
        <Link href="/cards" aria-current={onPacks ? 'page' : undefined}><Icon d="M7 3h10l1 3v13l-1 2H7l-1-2V6zM6 7h12M6 17h12" />Packs</Link>
        <Link href="/cards/binder" id="bvc-tab-binder" aria-current={onBinder ? 'page' : undefined}>
          <Icon d="M5 4a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1zM5 7h2M5 12h2M5 17h2M10 8h6M10 12h6" />Binder
          {n > 0 ? <span className="badge" aria-label={`${n} new ${n === 1 ? 'card' : 'cards'}`}>{n}</span> : null}
        </Link>
      </nav>
      {status === 'ready' && state ? (
        <div className="wallet" aria-label="Your wallet">
          <span className="pill"><Icon d="M7 3h10l1 3v13l-1 2H7l-1-2V6zM6 7h12M6 17h12" /><span className="num"><b>{state.stock}</b>/{state.cap}</span><span className="lbl">packs</span></span>
          <span className="pill"><svg className="gem" viewBox="0 0 24 24" aria-hidden="true"><use href="#bvc-g-R" /></svg><b className="num">{state.shards}</b><span className="lbl">shards</span></span>
        </div>
      ) : null}
    </div>
  );
}
