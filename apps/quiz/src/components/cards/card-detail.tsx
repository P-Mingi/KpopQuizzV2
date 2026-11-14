'use client';

// KpopCards: the page of one card (the v6 prototype's detail sheet, as a page): the card that flips to its back, the credit
// under it (server markup, handed in), the facts, the player's copies, the ladder of editions of the same idol, group or event, and the
// reason sentence when an edition cannot exist yet. The back is a nicety; everything it says is also in the text beside it.
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Fragment, useEffect, useRef, useState } from 'react';

import { LOCK_SENTENCES, RARITIES, RARITY_LABEL } from '@/lib/cards/rules';
import { isApiError } from '@/lib/kpopcards/contract';

import { CardFront, Gem, Ico, LOCK_ICON } from './card-art';
import { CraftButton } from './craft-button';
import { useCards } from './cards-provider';
import { FavStar } from './fav-star';
import { LockButton } from './lock-button';
import { WantButton } from './wish-toggle';
import { reduced, tilt } from './kc-tilt';
import { kcPath } from '@/lib/cards/kc-paths';
import { withBasePath } from '@/lib/site/base-path';
import { MASCOT_PATH } from '@/lib/cards/ui-logo';

import type { LockReason, Rarity } from '@/lib/cards/types';
import type { CardMoment } from '@/lib/kpopcards/contract';
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
  /** The sheet sits over the collection page (which has the page's one H1): the title is an H2, as in the prototype. Alone (tests, no page behind) it is the H1. */
  inSheet?: boolean;
}

const DATE = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Paris', day: 'numeric', month: 'long', year: 'numeric' });
const MONTH = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Paris', month: 'long', year: 'numeric' });
const eventDate = (d: string | null, precision: 'day' | 'month' | 'year' | null): string | null => {
  if (!d) return null;
  const t = new Date(d);
  if (Number.isNaN(t.getTime())) return null;
  return precision === 'year' ? String(t.getUTCFullYear()) : precision === 'month' ? MONTH.format(t) : DATE.format(t);
};

/** The prototype's "The moment" box: the photo's event, the player's own history of the card, the quiz link (GET /api/cards/card/<n>). */
function Moment({ n, owned }: { n: number; owned: boolean }): React.ReactElement | null {
  const { kc, status, fixture } = useCards();
  const [m, setM] = useState<CardMoment | null>(null);
  useEffect(() => {
    let live = true;
    if (!kc) return undefined;
    void kc.card(n).then((r) => { if (live && !isApiError(r)) setM(r); });
    return () => { live = false; };
  }, [kc, n, owned, status]);
  if (!m) return null;
  const when = m.event ? eventDate(m.event.date, m.event.precision) : null;
  const yours = m.yours ? `${m.yours.how === 'craft' ? 'Crafted on' : 'Pulled on'} ${DATE.format(new Date(m.yours.firstAt))}${m.yours.how !== 'craft' && m.yours.packNo ? `, pack ${m.yours.packNo}` : ''}` : status === 'ready' ? 'Not in your binder yet' : null;
  if (!m.event && !yours && !m.quiz) return null;
  return (
    <div className="moment">
      <h3><Ico name="camera" />The moment</h3>
      <dl>
        {m.event ? <><dt>Photo</dt><dd>{m.event.name}{when ? ` \u00B7 ${when}` : ''}</dd></> : null}
        {yours ? <><dt>Your card</dt><dd>{yours}</dd></> : null}
        {m.quiz ? <><dt>Quiz</dt><dd><a href={m.quiz.url} target="_blank" rel="noopener">Play the {m.quiz.title.replace(/ quizzes on kpopquiz\.org$/, '')} quiz on kpopquiz.org</a></dd></> : null}
      </dl>
      {fixture ? <small>Example data in this prototype. In the game it comes from the photo record.</small> : null}
    </div>
  );
}

/** The prototype's reason box under the ladder: why an idol or a group has fewer than six editions. */
function reasonText(p: DetailProps): { title: string; text: string } | null {
  const have = p.ladder.filter((x) => x.card);
  const n = have.length;
  if (n >= p.ladder.length || (p.entityKind !== 'idol' && p.entityKind !== 'group')) return null;
  const top = n >= 1 ? RARITY_LABEL[have[n - 1]!.rarity] : '';
  const locked = p.ladder.find((x) => !x.card && x.reason && x.reason !== 'one');
  const why = locked?.reason ? `${LOCK_SENTENCES[locked.reason]} ` : '';
  if (p.entityKind === 'group') return { title: `Why ${p.entityName} has ${n} editions`, text: `Each edition uses its own group photo, split into the two halves. ${p.entityName} has ${n} free group photos so far, so ${n} editions, Standard up to ${top}.` };
  return { title: `Why ${p.entityName} has ${n < 2 ? 'no cards yet' : `${n} editions`}`, text: n < 2 ? `Not in packs yet. ${p.entityName} has one free photo so far, and an idol joins packs with two. ${why}`.trim() : `Each edition uses its own free photo, from a different day. ${p.entityName} has ${n} so far, so ${n} editions, Standard up to ${top}. ${why}The next edition is issued as soon as another photo is approved.` };
}


export function CardDetail(p: DetailProps): React.ReactElement {
  const { card, lockedRarity } = p;
  const { owned, status, clearNew, newSet } = useCards();
  const router = useRouter();
  const sp = useSearchParams();
  const [flipped, setFlipped] = useState(false);
  const flipRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const rarity: Rarity = card ? card.rarity : (lockedRarity as Rarity);
  const edName = RARITY_LABEL[rarity];
  const o = card ? owned.get(card.n) : undefined;
  const Title = p.inSheet ? 'h2' : 'h1';
  // The sheet keeps the collection's own query (view, sort, filters) so the binder behind it, and the way back, are the ones the player left.
  const keep = (extra?: Record<string, string>): string => { const q = new URLSearchParams(sp.toString()); q.delete('lock'); for (const [k, v] of Object.entries(extra ?? {})) q.set(k, v); const s = q.toString(); return s ? `?${s}` : ''; };
  const close = (): void => { router.push(`${kcPath.collection}${keep()}`); };

  // Lot 3 point A7: dragging a finger (or the pointer) over the card tilts it, 18 degrees at most, and it springs back on release; a TAP flips
  // it. Both faces tilt: the front card and the back sheet each follow the pointer (only the face turned to you receives it).
  useEffect(() => {
    if (!card) return undefined;
    clearNew(card.n);
    const front = flipRef.current?.querySelector<HTMLElement>('.card') ?? null;
    const offs = [front, flipRef.current?.querySelector<HTMLElement>('.d-back') ?? null].map((el) => tilt(el, 18, true));
    // The sweep of light, once, when the card is new to the player or not owned yet (the prototype's sweep()).
    if (front && !reduced() && (!owned.has(card.n) || newSet.has(card.n))) { front.classList.remove('sweep'); void front.offsetWidth; front.classList.add('sweep'); window.setTimeout(() => front.classList.remove('sweep'), 1000); }
    return () => offs.forEach((off) => off());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card?.n]);

  useEffect(() => {
    closeRef.current?.focus();
    const key = (e: KeyboardEvent): void => { if (e.key === 'Escape') router.push(`${kcPath.collection}${keep()}`); };
    document.addEventListener('keydown', key);
    return () => document.removeEventListener('keydown', key);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card?.n]);

  // A drag is not a tap: the pointer travelling more than 8 px between press and release makes the click that follows a no-op.
  const down = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  const toggle = (): void => setFlipped((v) => !v);
  const reason = reasonText(p);
  const half = card && p.pair ? p.pair : null;
  const mate = half?.mate ?? null;
  return (
    <div className="dt" id="dt" role="dialog" aria-modal="true" aria-label="Card details" onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
      <div className="sheet" id="sheet">
        <button type="button" className="close" id="dt-x" aria-label="Close" ref={closeRef} onClick={close}><Ico name="x" /></button>
        <div className="d-card">
          {card ? (
            <div
              className={`d-flip${flipped ? ' flipped' : ''}`} id="dflip" ref={flipRef} role="button" tabIndex={0} aria-pressed={flipped}
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
          ) : (
            <div className="d-flip" id="dflip">
              <div className="fr">
                <div className="pocket locked" style={{ cursor: 'default' }}>
                  <span className="miss"><span className="mno">{edName}</span><span className="mic">{LOCK_ICON}</span><span><span className="mnm">{p.entityName}</span><span className="med">Not issued yet</span></span></span>
                </div>
              </div>
            </div>
          )}
          <p className="d-hint">{card ? <>Tap to see the back {'·'} drag to tilt</> : 'This edition is not issued yet'}</p>
          {card ? p.credit : null}
        </div>
        <div className="d-info">
          <div className="d-title">
            <Title>{p.entityName}{card && card.part ? ` ${card.part}/2` : ''}</Title>
            {card && o ? <FavStar n={card.n} name={card.name} edition={edName} className="in" /> : null}
            {card && o ? <LockButton n={card.n} name={card.name} /> : null}
          </div>
          <p className="d-sub">{p.sub}</p>
          <div className="tags"><span className="tag"><Gem r={rarity} className={`gem gc-${rarity}`} />{RARITY_LABEL[rarity]}{p.rates[rarity] ? ` · ${p.rates[rarity]} of cards` : ''}</span>{card ? <span className="tag num">{card.num}</span> : null}{card && o ? <span className="tag">{o.copies > 1 ? `${o.copies} copies` : '1 copy'}</span> : null}</div>
          {card && !o && status === 'ready' ? (
            <div className="d-acts">
              <CraftButton n={card.n} rarity={card.rarity} name={p.entityName} after={<WantButton n={card.n} name={p.entityName} edition={edName} />} />
            </div>
          ) : null}
          {card && mate ? (
            <div className="d-acts">
              <button type="button" className="btn-quiet" id="d-pair" onClick={() => router.push(`${kcPath.card(mate.num)}${keep()}`)}>See half {mate.part}/2</button>
              <small id="d-half">{owned.has(mate.n) ? 'You have the other half.' : o ? `Missing half: the next ${edName} of ${p.entityName} you draw is the other half.` : 'Own one half, and the same edition gives you the other.'}</small>
            </div>
          ) : null}
          {card && half ? (
            <p className="sr-only" id="d-half-words">
              This card is the {half.side} half of the group photo.{' '}
              {mate ? <>The {half.side === 'left' ? 'right' : 'left'} half is <Link className="d-mate" href={`${kcPath.card(mate.num)}${keep()}`}>card {mate.num}</Link>. Own both to see the whole picture.</> : 'Its other half is not in packs.'}
            </p>
          ) : null}
          {card ? <Moment n={card.n} owned={!!o} /> : null}
          {p.lockSentence ? (
            <div className="reason" role="note">
              <b><svg className="ico" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16.5v.5" /></svg>Why this edition is not issued</b>
              {p.lockSentence}
            </div>
          ) : null}
          <h3 className="ladder-h">{p.entityKind === 'idol' ? `All editions of ${p.entityName}` : p.entityKind === 'group' ? 'All editions of this half' : 'All editions of this event'}</h3>
          <div className="ladder" id="ladder">
            {RARITIES.filter((r) => p.ladder.some((x) => x.rarity === r)).map((r) => {
              const rung = p.ladder.find((x) => x.rarity === r)!;
              const rn = RARITY_LABEL[r];
              if (!rung.card) {
                return (
                  <button type="button" key={r} className={`rung locked${!card && rarity === r ? ' cur' : ''}`} onClick={() => router.push(`${kcPath.card(rung.anchor)}${keep({ lock: r })}`)} aria-label={`${rn}, not issued`}>
                    <span className="lk"><svg className="ico" viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg></span>
                    <span className="rn"><Gem r={r} className={`gem gc-${r}`} />{rn}</span><span className="st">Not issued</span>
                  </button>
                );
              }
              const sameHalf = card?.part === 2 && rung.mate ? rung.mate : rung.card;
              const eo = owned.get(sameHalf.n) ?? (rung.mate ? owned.get(rung.mate.n) : undefined);
              const isCur = !!card && (rung.card.n === card.n || rung.mate?.n === card.n);
              return (
                <button type="button" key={r} className={`rung ${eo ? 'owned' : 'missing'}${isCur ? ' cur' : ''}`} onClick={() => router.push(`${kcPath.card(sameHalf.num)}${keep()}`)} aria-label={`${rn}, ${eo ? `you have ${eo.copies}` : 'missing'}`} aria-current={isCur ? 'true' : undefined}>
                  <span className="mini"><CardFront card={sameHalf} /></span>
                  <span className="rn"><Gem r={r} className={`gem gc-${r}`} />{rn}</span>
                  <span className="st">{status !== 'ready' ? '' : eo ? `×${eo.copies}` : 'Missing'}</span>
                </button>
              );
            })}
          </div>
          {Object.keys(p.rates).length ? (
            <div className="sr-only">
              <h3>How often each edition comes</h3>
              <ul className="ed-odds">{RARITIES.filter((r) => p.rates[r]).map((r) => <li key={r}>{RARITY_LABEL[r]} {'\u00B7'} {p.rates[r]} of cards</li>)}</ul>
            </div>
          ) : null}
          {reason ? (
            <div className="reason">
              <b><svg className="ico" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16.5v.5" /></svg>{reason.title}</b>
              {reason.text}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
