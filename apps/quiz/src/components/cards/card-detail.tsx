'use client';

// Bunnyverse Cards, lane U: the page of one card (the prototype's detail sheet, as a page): the card that flips to its back, the credit
// under it (server markup, handed in), the facts, the player's copies, the ladder of editions of the same idol, group or event, and the
// reason sentence when an edition cannot exist yet. The back is a nicety; everything it says is also in the text beside it.
import Link from 'next/link';
import { Fragment, useEffect, useRef, useState } from 'react';

import { RARITIES, RARITY_LABEL } from '@/lib/cards/rules';
import { partWord } from '@/lib/cards/ui-model';

import { CardFront, Gem, LOCK_ICON } from './card-art';
import { useCards } from './cards-provider';
import { FavStar } from './fav-star';
import { attachTilt } from './fx';
import { withBasePath } from '@/lib/site/base-path';
import { MASCOT_PATH } from '@/lib/cards/ui-logo';

import type { LockReason, Rarity } from '@/lib/cards/types';
import type { SlimCard } from '@/lib/cards/ui-types';

/** `mate`: the other half of a group pair (the rung shows both halves side by side). */
export interface Rung { rarity: Rarity; card: SlimCard | null; mate?: SlimCard; reason: LockReason | null; anchor: string }

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
  /** Lot 2: set for a half of a group photo: which side it is, and the other half (null when that half is not in packs). */
  pair?: { side: 'left' | 'right'; mate: SlimCard | null } | null;
  /** Lot 3 point A5: the chance of one card being of each edition ("10%"), from the odds the Packs page shows; only editions in packs. */
  rates: Partial<Record<Rarity, string>>;
  /** The credit block, rendered on the server. */
  credit: React.ReactNode;
}

export function CardDetail(p: DetailProps): React.ReactElement {
  const { card, lockedRarity } = p;
  const { owned, status, clearNew } = useCards();
  const [flipped, setFlipped] = useState(false);
  const flipRef = useRef<HTMLDivElement>(null);
  const rarity: Rarity = card ? card.rarity : (lockedRarity as Rarity);
  const edName = RARITY_LABEL[rarity];
  const o = card ? owned.get(card.n) : undefined;

  // Lot 3 point A7: dragging a finger (or the pointer) over the card tilts it, 14 degrees at most, and it springs back on release; a TAP flips
  // it. Both faces tilt: the front card and the back sheet each follow the pointer (only the face turned to you receives it).
  useEffect(() => {
    if (!card) return undefined;
    clearNew(card.n);
    const offs = [flipRef.current?.querySelector<HTMLElement>('.card') ?? null, flipRef.current?.querySelector<HTMLElement>('.d-back') ?? null].map((el) => attachTilt(el, 14));
    return () => offs.forEach((off) => off());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card?.n]);

  // A drag is not a tap: the pointer travelling more than 8 px between press and release makes the click that follows a no-op.
  const down = useRef<{ x: number; y: number; moved: boolean } | null>(null);
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
                onPointerDown={(e) => { down.current = { x: e.clientX, y: e.clientY, moved: false }; }}
                onPointerMove={(e) => { const d = down.current; if (d && !d.moved && Math.hypot(e.clientX - d.x, e.clientY - d.y) > 8) d.moved = true; }}
                onClick={() => { const d = down.current; down.current = null; if (d?.moved) return; toggle(); }}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } }}
              >
                <div className="fr"><CardFront card={card} /></div>
                <div className="bk" aria-hidden="true">
                  <div className="d-back">
                    <div className="bh">{/* eslint-disable-next-line @next/next/no-img-element */}<img src={withBasePath(MASCOT_PATH)} alt="" width={64} height={64} />{p.entityName}</div>
                    <dl>{p.facts.map(([k, v]) => <Fragment key={k}><dt>{k}</dt><dd>{v}</dd></Fragment>)}</dl>
                    {p.backCredit ? <div className="lic"><b>Photo credit</b>{p.backCredit}</div> : null}
                  </div>
                </div>
              </div>
              <p className="d-hint">Tap the card to flip it. Drag to tilt it.</p>
              {p.pair && p.pair.mate && card ? (
                <div className="d-pair" aria-label="The two halves of the group photo">
                  {(card.part === 1 ? [card, p.pair.mate] : [p.pair.mate, card]).map((h) => {
                    const ho = owned.get(h.n);
                    return (
                      <Link key={h.n} className={`pocket${h.n === card.n ? ' cur' : ''}${ho || h.n === card.n ? '' : ' unowned'}`} href={`/cards/c/${h.num}`} aria-label={`${h.name}, ${partWord(h)}, ${h.num}`} aria-current={h.n === card.n ? 'page' : undefined}>
                        <CardFront card={h} />
                      </Link>
                    );
                  })}
                </div>
              ) : null}
              {p.credit}
            </>
          ) : (
            <>
              <div className="d-front-locked">
                <div className="pocket locked">
                  <span className="miss"><span className="mno">{edName}</span><span className="mic">{LOCK_ICON}</span><span><span className="mnm">{p.entityName}</span><span className="med">Not issued yet</span></span></span>
                </div>
              </div>
              <p className="d-hint">This edition is not issued yet</p>
            </>
          )}
        </div>
        <div className="d-info">
          <div className="d-title">
            <h1>{p.entityName}</h1>
            {card && o ? <FavStar n={card.n} name={card.name} edition={edName} className="in" /> : null}
          </div>
          <p className="d-sub">{p.sub}</p>
          <div className="tags"><span className="tag"><Gem r={rarity} className={`gem gc-${rarity}`} />{RARITY_LABEL[rarity]}</span>{card ? <span className="tag num">{card.num}</span> : null}{card && p.pair ? <span className="tag">{p.pair.side === 'left' ? 'Left' : 'Right'} half {card.part}/2</span> : null}</div>
          <p className="d-sub" style={{ marginTop: 10 }}>
            {card
              ? <>{edName} edition, card {card.num}. {status === 'ready' ? (o ? (o.copies > 1 ? `You have ${o.copies} copies.` : 'You have 1 copy.') : "You don't have it yet.") : ''}</>
              : <>{edName} edition, not issued yet.</>}
          </p>
          {card && p.pair ? (
            <p className="d-sub" id="d-half">
              This card is the {p.pair.side} half of the group photo.{' '}
              {p.pair.mate
                ? <>The {p.pair.side === 'left' ? 'right' : 'left'} half is <Link className="d-mate" href={`/cards/c/${p.pair.mate.num}`}>card {p.pair.mate.num}</Link>. Own both to see the whole picture.</>
                : 'Its other half is not in packs.'}
            </p>
          ) : null}
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
              const rn = RARITY_LABEL[r];
              if (!rung.card) {
                return (
                  <Link key={r} className={`rung locked${!card && rarity === r ? ' cur' : ''}`} href={`/cards/c/${rung.anchor}?lock=${r}`} aria-label={`${rn}, not issued`}>
                    <span className="lk"><svg className="ico" viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg></span>
                    <span className="rn"><Gem r={r} className={`gem gc-${r}`} />{rn}</span><span className="st">Not issued</span>
                  </Link>
                );
              }
              const eo = owned.get(rung.card.n) ?? (rung.mate ? owned.get(rung.mate.n) : undefined);
              const isCur = !!card && (rung.card.n === card.n || rung.mate?.n === card.n);
              return (
                <Link key={r} className={`rung ${eo ? 'owned' : 'missing'}${isCur ? ' cur' : ''}`} href={`/cards/c/${rung.card.num}`} aria-label={`${rn}, ${eo ? `you have ${eo.copies}` : 'missing'}`} aria-current={isCur ? 'page' : undefined}>
                  <span className={`mini${rung.mate ? ' pairmini' : ''}`}><CardFront card={rung.card} />{rung.mate ? <CardFront card={rung.mate} /> : null}</span>
                  <span className="rn"><Gem r={r} className={`gem gc-${r}`} />{rn}</span>
                  <span className="st">{status !== 'ready' ? '' : eo ? `×${eo.copies}` : 'Missing'}</span>
                </Link>
              );
            })}
          </div>
          {Object.keys(p.rates).length ? (
            <>
              <h2 className="ladder-h">How often each edition comes</h2>
              <ul className="ed-odds">
                {RARITIES.filter((r) => p.rates[r]).map((r) => (
                  <li key={r} className={r === rarity ? 'cur' : undefined}><Gem r={r} className={`gem gc-${r}`} />{RARITY_LABEL[r]} &middot; {p.rates[r]} of cards</li>
                ))}
              </ul>
            </>
          ) : null}
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
