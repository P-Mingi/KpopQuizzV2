'use client';

// Bunnyverse Cards, lane U: the page of one card (the prototype's detail sheet, as a page): the card that flips to its back, the credit
// under it (server markup, handed in), the facts, the player's copies, the ladder of editions of the same idol, group or event, and the
// reason sentence when an edition cannot exist yet. The back is a nicety; everything it says is also in the text beside it.
import Link from 'next/link';
import { Fragment, useEffect, useRef, useState } from 'react';

import { EDITIONS, ODDS, RARITIES, RARITY_NAMES } from '@/lib/cards/rules';

import { CardFront, Gem, LOCK_ICON } from './card-art';
import { useCards } from './cards-provider';
import { FavStar } from './fav-star';
import { attachTilt } from './fx';
import { MASCOT_SRC } from '@/lib/cards/ui-logo';

import type { LockReason, Rarity } from '@/lib/cards/types';
import type { SlimCard } from '@/lib/cards/ui-types';

export interface Rung { rarity: Rarity; card: SlimCard | null; reason: LockReason | null; anchor: string }

export interface DetailProps {
  /** The card shown, or null when the page shows an edition that cannot exist yet. */
  card: SlimCard | null;
  /** The edition that cannot exist yet (when card is null). */
  lockedRarity: Rarity | null;
  entityName: string;
  entityKind: 'idol' | 'group' | 'event';
  sub: string;
  facts: [string, string][];
  backCredit: string | null;
  ladder: Rung[];
  /** Why this entity has fewer editions: a title, the sentences and what is needed. */
  why: { title: string; sentences: string[]; need: string } | null;
  lockSentence: string | null;
  /** The credit block, rendered on the server. */
  credit: React.ReactNode;
}

export function CardDetail(p: DetailProps): React.ReactElement {
  const { card, lockedRarity } = p;
  const { owned, status, clearNew } = useCards();
  const [flipped, setFlipped] = useState(false);
  const flipRef = useRef<HTMLDivElement>(null);
  const rarity: Rarity = card ? card.rarity : (lockedRarity as Rarity);
  const ed = EDITIONS[rarity];
  const o = card ? owned.get(card.n) : undefined;

  useEffect(() => {
    if (!card) return undefined;
    clearNew(card.n);
    return attachTilt(flipRef.current?.querySelector<HTMLElement>('.card') ?? null, 18);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card?.n]);

  const toggle = (): void => setFlipped((v) => !v);
  return (
    <div className="wrap d-page">
      <Link className="back-link" href="/cards/binder"><span aria-hidden="true">&larr;</span> Binder</Link>
      <div className="sheet">
        <div className="d-card">
          {card ? (
            <>
              <div
                className={`d-flip${flipped ? ' flipped' : ''}`} ref={flipRef} role="button" tabIndex={0} aria-pressed={flipped}
                aria-label={flipped ? 'Flip the card back to its front' : 'Flip the card to see its back'}
                onClick={toggle} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } }}
              >
                <div className="fr"><CardFront card={card} /></div>
                <div className="bk" aria-hidden="true">
                  <div className="d-back">
                    <div className="bh">{/* eslint-disable-next-line @next/next/no-img-element */}<img src={MASCOT_SRC} alt="" width={64} height={64} />{p.entityName}</div>
                    <dl>{p.facts.map(([k, v]) => <Fragment key={k}><dt>{k}</dt><dd>{v}</dd></Fragment>)}</dl>
                    {p.backCredit ? <div className="lic"><b>Photo credit</b>{p.backCredit}</div> : null}
                  </div>
                </div>
              </div>
              <p className="d-hint">Tap the card to see its back</p>
              {p.credit}
            </>
          ) : (
            <>
              <div className="d-front-locked">
                <div className="pocket locked">
                  <span className="miss"><span className="mno">{ed.name}</span><span className="mic">{LOCK_ICON}</span><span><span className="mnm">{p.entityName}</span><span className="med">Not issued yet</span></span></span>
                </div>
              </div>
              <p className="d-hint">This edition is not issued yet</p>
            </>
          )}
        </div>
        <div className="d-info">
          <div className="d-title">
            <h1>{p.entityName}</h1>
            {card && o ? <FavStar n={card.n} name={card.name} edition={ed.name} className="in" /> : null}
          </div>
          <p className="d-sub">{p.sub}</p>
          <div className="tags"><span className="tag"><Gem r={rarity} className={`gem gc-${rarity}`} />{RARITY_NAMES[rarity]}</span>{card ? <span className="tag num">{card.num}</span> : null}</div>
          <p className="d-sub" style={{ marginTop: 10 }}>
            {card
              ? <>{ed.name} edition, card {card.num}, {ODDS[rarity]}% of a normal card. {status === 'ready' ? (o ? (o.copies > 1 ? `You have ${o.copies} copies.` : 'You have 1 copy.') : "You don't have it yet.") : ''}</>
              : <>{ed.name} edition, not issued yet.</>}
          </p>
          {p.lockSentence ? (
            <div className="reason" role="note">
              <b><svg className="ico" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16.5v.5" /></svg>Why this edition is not issued</b>
              {p.lockSentence}
            </div>
          ) : null}
          <h2 className="ladder-h">{p.entityKind === 'idol' ? 'All editions of this idol' : p.entityKind === 'group' ? 'All editions of this group' : 'All editions of this event'}</h2>
          <div className="ladder" id="ladder">
            {RARITIES.filter((r) => p.ladder.some((x) => x.rarity === r)).map((r) => {
              const rung = p.ladder.find((x) => x.rarity === r)!;
              const edName = EDITIONS[r].name;
              if (!rung.card) {
                return (
                  <Link key={r} className={`rung locked${!card && rarity === r ? ' cur' : ''}`} href={`/cards/c/${rung.anchor}?lock=${r}`} aria-label={`${edName}, not issued`}>
                    <span className="lk"><svg className="ico" viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg></span>
                    <span className="rn"><Gem r={r} className={`gem gc-${r}`} />{edName}</span><span className="st">Not issued</span>
                  </Link>
                );
              }
              const eo = owned.get(rung.card.n);
              return (
                <Link key={r} className={`rung ${eo ? 'owned' : 'missing'}${card && rung.card.n === card.n ? ' cur' : ''}`} href={`/cards/c/${rung.card.num}`} aria-label={`${edName}, ${eo ? `you have ${eo.copies}` : 'missing'}`} aria-current={card && rung.card.n === card.n ? 'page' : undefined}>
                  <span className="mini"><CardFront card={rung.card} /></span>
                  <span className="rn"><Gem r={r} className={`gem gc-${r}`} />{edName}</span>
                  <span className="st">{status !== 'ready' ? '' : eo ? `×${eo.copies}` : 'Missing'}</span>
                </Link>
              );
            })}
          </div>
          {p.why ? (
            <div className="reason why">
              <b><svg className="ico" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16.5v.5" /></svg>{p.why.title}</b>
              {p.why.sentences.map((s) => <p key={s}>{s}</p>)}
              <p>{p.why.need}</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
