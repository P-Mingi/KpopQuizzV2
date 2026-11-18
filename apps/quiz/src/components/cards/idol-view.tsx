'use client';

// KpopCards (lot 5): the idol page. Unlocked by owning a card of the idol: the editions the player has, the silhouettes of the ones missing, the facts, and the way
// to that idol's quizzes on kpopquiz.org. Locked, it says how to open it and shows only silhouettes (no card art of an idol the player does not own).
import Link from 'next/link';

import { findIdol } from '@/lib/cards/kc-idol';
import { isApiError } from '@/lib/kpopcards/contract';
import { useEffect, useState } from 'react';

import type { IdolPage } from '@/lib/kpopcards/contract';
import { kcPath } from '@/lib/cards/kc-paths';
import { RARITIES, RARITY_LABEL } from '@/lib/cards/rules';

import { CardFront, Gem, LOCK_ICON } from './card-art';
import { useCards } from './cards-provider';

export function IdolView({ slug }: { slug: string }): React.ReactElement {
  const { catalog, owned, status, kc } = useCards();
  const info = findIdol(catalog, slug, (n) => owned.has(n));
  const [page, setPage] = useState<IdolPage | null>(null);
  useEffect(() => { if (kc) void kc.idol(slug).then((r) => setPage(isApiError(r) ? null : r)); }, [kc, slug]);
  if (!info) {
    return <div className="wrap page"><h1 className="h1">Idol not found</h1><p className="page-note">No idol of this name is in the game. <Link href={kcPath.collection}>Back to the collection</Link></p></div>;
  }
  const open = page ? page.unlocked : info.cards.some((c) => owned.has(c.n));
  const quizzes = page?.quizzes ?? [];
  const have = info.cards.filter((c) => owned.has(c.n)).length;
  return (
    <div className="wrap page">
      <p><Link className="back-link" href={info.group ? kcPath.group(info.group.toLowerCase().replace(/[^a-z0-9]+/g, '-')) : kcPath.collection}><span aria-hidden="true">&larr;</span> {info.group ?? 'Collection'}</Link></p>
      <h1 className="h1" id="t-idol">{info.name}</h1>
      <p className="lede">{info.group ?? 'Soloist'}{info.debutYear ? ` · debut ${info.debutYear}` : ''}</p>
      {!open ? (
        <p className="page-note" role="status" id="idol-locked">{status === 'guest' ? 'Sign in and open a pack to find a card of ' : 'Own a card of '}{info.name} to open this page.</p>
      ) : (
        <div className="tags"><span className="tag num">{have} of {info.cards.length} cards</span>{quizzes.map((q) => <a key={q.url} className="btn-outline sm" href={q.url} target="_blank" rel="noopener">{q.title}</a>)}</div>
      )}
      <h2 className="ladder-h" style={{ marginTop: 22 }}>All editions of {info.name}</h2>
      <div className="ladder" id="ladder">
        {RARITIES.map((r) => {
          const c = info.editions[r];
          const rn = RARITY_LABEL[r];
          if (!c) return <span key={r} className="rung locked"><span className="lk">{LOCK_ICON}</span><span className="rn"><Gem r={r} className={`gem gc-${r}`} />{rn}</span><span className="st">Not issued</span></span>;
          const mine = owned.get(c.n);
          return mine && open ? (
            <Link key={r} className="rung owned" href={kcPath.card(c.num)} aria-label={`${rn}, you have ${mine.copies}`}><span className="mini"><CardFront card={c} /></span><span className="rn"><Gem r={r} className={`gem gc-${r}`} />{rn}</span><span className="st">{'×'}{mine.copies}</span></Link>
          ) : (
            <span key={r} className="rung missing"><span className="lk">{LOCK_ICON}</span><span className="rn"><Gem r={r} className={`gem gc-${r}`} />{rn}</span><span className="st">Missing</span></span>
          );
        })}
      </div>
      <footer className="foot"><Link href={kcPath.report}>Report a photo</Link><span>Every photo is free to reuse, credited on the card.</span></footer>
    </div>
  );
}
