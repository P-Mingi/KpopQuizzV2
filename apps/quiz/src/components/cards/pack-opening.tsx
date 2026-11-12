'use client';

// Bunnyverse Cards, lane U: the opening of a pack, ported from the approved prototype v4 (startOpening, bindTear, tear, showPile, reveal,
// sendDown, summary). The five cards were drawn by the server before this screen shows (POST /api/cards/open), so nothing here decides a
// result. Tap or press Enter on the pack to rip it (or drag across), tap the pile to reveal and send each card down, "Reveal all" skips.
// Keyboard: the pack and the pile are buttons; the result of each card is read out through an aria-live region.
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { analytics } from '@/lib/analytics';
import { EDITIONS, PACK_SIZE, RARITIES, RARITY_NAMES, SHARDS } from '@/lib/cards/rules';
import { PACK_LOGO_SRC } from '@/lib/cards/ui-logo';

import { CardBack, CardFront, Gem } from './card-art';
import { useCards } from './cards-provider';
import { FavStar } from './fav-star';
import { Fx, PACK_BURST, RARITY_BURST, attachTilt, reducedMotion } from './fx';

import type { OpenedCard, PackSource, Rarity } from '@/lib/cards/types';
import type { SlimCard } from '@/lib/cards/ui-types';

type Phase = 'pack' | 'tearing' | 'torn' | 'reveal' | 'summary';
type Vars = React.CSSProperties & Record<`--${string}`, string | number>;

export interface OpeningProps {
  cards: OpenedCard[];
  source: PackSource;
  /** Called when the player leaves the screen; `then` says what comes next. */
  onClose: (then: 'none' | 'stock') => void;
}

function zig(y: number, teeth: number, top: boolean): string {
  const pts: string[] = [];
  const w = 100 / teeth;
  if (top) {
    pts.push('0% 0%', '100% 0%');
    for (let i = teeth; i >= 0; i--) pts.push(`${(i * w).toFixed(2)}% ${(i % 2 ? y + 2.2 : y - 1.2).toFixed(2)}%`);
  } else {
    for (let j = 0; j <= teeth; j++) pts.push(`${(j * w).toFixed(2)}% ${(j % 2 ? y + 2.2 : y - 1.2).toFixed(2)}%`);
    pts.push('100% 100%', '0% 100%');
  }
  return `polygon(${pts.join(',')})`;
}

export function PackOpening({ cards, source, onClose }: OpeningProps): React.ReactElement {
  const ctx = useCards();
  const rows = useMemo(() => cards.map((c) => ({ card: ctx.byN.get(c.n) as SlimCard, isNew: c.isNew })).filter((r) => r.card), [cards, ctx.byN]);
  const len = rows.length;
  const [phase, setPhaseState] = useState<Phase>('pack');
  const [idx, setIdxState] = useState(0);
  const [flipped, setFlippedState] = useState(false);
  const [active, setActive] = useState<number | null>(null);
  const [charge, setCharge] = useState<Rarity | null>(null);
  const [slow, setSlow] = useState(false);
  const [tone, setTone] = useState<Rarity | null>(null);
  const [hint, setHint] = useState<React.ReactNode>(<><b>Tap the pack</b> to open it</>);
  const [label, setLabel] = useState<{ idx: number } | null>(null);
  const [leaving, setLeaving] = useState(false);

  // The machine lives in a ref so the timers never read a stale render.
  const m = useRef({ phase: 'pack' as Phase, idx: 0, flipped: false, busy: false });
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const fx = useRef<Fx | null>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const packRef = useRef<HTMLButtonElement>(null);
  const cutRef = useRef<HTMLElement>(null);
  const pileRef = useRef<HTMLDivElement>(null);
  const pulledRef = useRef<HTMLDivElement>(null);
  const addRef = useRef<HTMLButtonElement>(null);
  const reduced = typeof window !== 'undefined' && reducedMotion();

  const setPhase = (p: Phase): void => { m.current.phase = p; setPhaseState(p); };
  const later = useCallback((fn: () => void, ms: number): void => { timers.current.push(setTimeout(fn, ms)); }, []);

  useEffect(() => {
    const ts = timers.current;
    document.documentElement.style.overflow = 'hidden';
    if (canvas.current) fx.current = new Fx(canvas.current);
    return () => { ts.forEach(clearTimeout); fx.current?.destroy(); document.documentElement.style.overflow = ''; };
  }, []);

  // The first screen: the clip of the two pack halves, the tilt, the focus.
  useEffect(() => {
    const top = document.getElementById('opk-top');
    const main = document.getElementById('opk-main');
    if (top) top.style.clipPath = zig(14, 22, true);
    if (main) main.style.clipPath = zig(14, 22, false);
    packRef.current?.focus();
    return attachTilt(packRef.current, 10);
  }, []);

  const stepText = source === 'ad' ? 'Pack from an ad' : source === 'shards' ? 'Pack bought with shards' : source === 'bonus' ? 'Bonus pack' : `${ctx.state?.stock ?? 0} pack${ctx.state?.stock === 1 ? '' : 's'} left after this one`;

  /* ---- tear ---- */
  const tear = useCallback((): void => {
    if (m.current.phase === 'torn' || m.current.phase === 'reveal' || m.current.phase === 'summary') return;
    setPhase('torn');
    const p = packRef.current;
    if (!p) return;
    p.classList.add('opening');
    if (cutRef.current) cutRef.current.style.opacity = '0';
    const r = p.getBoundingClientRect();
    fx.current?.burst(r.left + r.width / 2, r.top + r.height * 0.14, { n: 60, colors: PACK_BURST, speed: 9, g: 0.1, size: 2.6 });
    if (navigator.vibrate) try { navigator.vibrate(18); } catch { /* not supported */ }
    later(showPile, reduced ? 50 : 950);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [later, reduced]);

  const autoTear = useCallback((): void => {
    if (m.current.phase !== 'pack') return;
    setPhase('tearing');
    const cut = cutRef.current;
    if (cut) { cut.style.transition = 'width .45s cubic-bezier(.45,0,.35,1)'; void cut.offsetWidth; cut.style.width = '92%'; }
    later(tear, reduced ? 60 : 470);
  }, [later, tear, reduced]);

  const drag = useRef<{ x: number; w: number; prog: number } | null>(null);
  const onDown = (e: React.PointerEvent<HTMLButtonElement>): void => {
    drag.current = { x: e.clientX, w: e.currentTarget.getBoundingClientRect().width, prog: 0 };
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* ignore */ }
  };
  const onMove = (e: React.PointerEvent<HTMLButtonElement>): void => {
    const d = drag.current;
    if (!d || m.current.phase !== 'pack') return;
    const dx = e.clientX - d.x;
    if (dx > 4) {
      d.prog = Math.min(1, dx / (d.w * 0.8));
      if (cutRef.current) cutRef.current.style.width = `${d.prog * 92}%`;
      if (d.prog >= 0.62) tear();
    }
  };
  const onUp = (e: React.PointerEvent<HTMLButtonElement>): void => {
    const d = drag.current;
    if (!d) return;
    const moved = Math.abs(e.clientX - d.x) > 6;
    drag.current = null;
    if (m.current.phase !== 'pack') return;
    if (!moved || d.prog < 0.62) autoTear();
  };

  /* ---- reveal ---- */
  function showPile(): void {
    setPhase('reveal');
    setHint(<><b>Tap the card</b> to reveal it</>);
    later(() => pileRef.current?.focus(), 30);
  }

  const toSummary = useCallback((): void => {
    setPhase('summary');
    setHint(null);
    // The pack is complete once its fifth card is shown: game_complete with the existing enums (a full pack is 5 cards of 5).
    analytics.gameComplete({ site: 'hub', game: 'cards', mode: 'classic', kind: 'cards_standard', score: PACK_SIZE, max: PACK_SIZE });
    later(() => addRef.current?.focus(), 80);
  }, [later]);

  const reveal = useCallback((fast: boolean): void => {
    const i = m.current.idx;
    const x = rows[i];
    if (!x) return;
    const ri = RARITIES.indexOf(x.card.rarity);
    m.current.busy = true;
    setActive(i);
    const pre = fast ? 0 : ri >= 5 ? 1100 : ri >= 3 ? 700 : 0;
    if (pre) {
      setCharge(x.card.rarity);
      setHint(ri >= 5 ? <><b>A Legendary card</b> is on its way</> : <><b>{RARITY_NAMES[x.card.rarity]}</b> or better</>);
      setTone(x.card.rarity);
    }
    later(() => {
      if (ri >= 5 && !fast) setSlow(true);
      m.current.flipped = true;
      setFlippedState(true);
      const el = pileRef.current?.querySelector<HTMLElement>(`[data-i="${i}"]`);
      const r = el?.getBoundingClientRect();
      const cxp = r ? r.left + r.width / 2 : innerWidth / 2;
      const cyp = r ? r.top + r.height / 2 : innerHeight / 2;
      if (el) attachTilt(el.querySelector<HTMLElement>('.card'), 16);
      later(() => {
        const f = fx.current;
        if (f && ri >= 1) f.burst(cxp, cyp, { n: [0, 18, 30, 60, 80, 120][ri]!, colors: RARITY_BURST[x.card.rarity], speed: [0, 5, 6, 8, 9, 11][ri]!, size: ri >= 4 ? 3.4 : 2.6 });
        if (f && ri === 4) f.rain(RARITY_BURST.UR, 90);
        if (f && ri === 5) { f.rain(RARITY_BURST.L, 160); f.burst(cxp, cyp, { n: 90, colors: RARITY_BURST.L, speed: 13, shape: 'confetti', size: 4 }); }
        setLabel({ idx: i });
        setHint(i < len - 1 ? <><b>Tap again</b> for the next card &middot; {i + 1} of {len}</> : <><b>Tap again</b> to see your pull</>);
        m.current.busy = false;
      }, fast ? 0 : ri >= 5 ? 900 : 380);
    }, pre);
  }, [later, len, rows]);

  const sendDown = useCallback((fast: boolean): void => {
    const i = m.current.idx;
    const el = pileRef.current?.querySelector<HTMLElement>(`[data-i="${i}"]`);
    const slot = pulledRef.current?.children[i] as HTMLElement | undefined;
    m.current.busy = true;
    if (el && slot) {
      const sr = slot.getBoundingClientRect();
      const er = el.getBoundingClientRect();
      el.style.transition = `transform ${fast ? 0.25 : 0.55}s cubic-bezier(.5,0,.3,1), opacity .5s`;
      el.style.transform = `translate(${sr.left + sr.width / 2 - (er.left + er.width / 2)}px,${sr.top + sr.height / 2 - (er.top + er.height / 2)}px) scale(${sr.width / er.width})`;
    }
    later(() => {
      setLabel(null); setTone(null); setCharge(null); setSlow(false); setActive(null);
      m.current.idx = i + 1; m.current.flipped = false;
      setIdxState(i + 1); setFlippedState(false);
      m.current.busy = false;
      if (i + 1 >= len) toSummary();
      else setHint(<><b>Tap the card</b> to reveal it &middot; {i + 2} of {len}</>);
    }, fast ? 260 : 560);
  }, [later, len, toSummary]);

  const onPile = (): void => {
    if (m.current.busy || m.current.phase !== 'reveal') return;
    if (!m.current.flipped) reveal(false); else sendDown(false);
  };

  const revealAllFast = useCallback((): void => {
    if (m.current.phase !== 'reveal') return;
    const step = (): void => {
      if (m.current.idx >= len || m.current.phase === 'summary') return;
      if (m.current.busy) { later(step, 120); return; }
      if (!m.current.flipped) { reveal(true); later(step, 420); } else { sendDown(true); later(step, 300); }
    };
    step();
  }, [later, len, reveal, sendDown]);

  const skip = (): void => {
    if (m.current.phase === 'pack' || m.current.phase === 'tearing') { tear(); later(revealAllFast, reduced ? 100 : 1000); return; }
    revealAllFast();
  };

  /* ---- leaving ---- */
  const fly = (then: 'none' | 'stock'): void => {
    if (leaving) return;
    setLeaving(true);
    const target = document.getElementById('bvc-tab-binder');
    const cardsEls = document.querySelectorAll<HTMLElement>('#fan .fc');
    if (reduced || !target || !cardsEls.length) { onClose(then); return; }
    const tr = target.getBoundingClientRect();
    cardsEls.forEach((c, i) => {
      const r = c.getBoundingClientRect();
      const f = c.cloneNode(true) as HTMLElement;
      f.className = 'flyer'; f.style.left = `${r.left}px`; f.style.top = `${r.top}px`; f.style.width = `${r.width}px`; f.style.transform = 'none';
      document.body.appendChild(f);
      c.style.visibility = 'hidden';
      setTimeout(() => { f.style.transform = `translate(${tr.left + tr.width / 2 - r.left - r.width / 2}px,${tr.top + tr.height / 2 - r.top - r.height / 2}px) scale(.12) rotate(${i * 30 - 60}deg)`; f.style.opacity = '0'; }, 20 + i * 70);
      setTimeout(() => f.remove(), 900 + i * 70);
    });
    later(() => onClose(then), 700);
  };

  /* ---- render ---- */
  const newCount = rows.filter((r) => r.isNew).length;
  const dupShards = rows.filter((r) => !r.isNew).reduce((s, r) => s + SHARDS[r.card.rarity], 0);
  const best = rows.reduce((mx, r) => Math.max(mx, RARITIES.indexOf(r.card.rarity)), 0);
  const stockLeft = ctx.state?.stock ?? 0;
  const narrow = typeof window !== 'undefined' && innerWidth < 520;
  const spreadPct = narrow ? 42 : 62;
  const current = rows[idx];

  return (
    <div className={`ov${tone ? ` tone-${tone}` : ''}`} role="dialog" aria-modal="true" aria-label="Pack opening">
      <div className="ov-top">
        <span className="ov-step">{stepText}</span>
        {phase !== 'summary' ? <button type="button" className="btn-quiet" onClick={skip}>Reveal all</button> : <span />}
      </div>
      <div className="ov-mid">
        {phase === 'pack' || phase === 'tearing' || phase === 'torn' ? (
          <>
            <div className="ov-hint" aria-live="polite">{hint}</div>
            <div className="tearzone">
              <button
                type="button" id="opk" ref={packRef} className="pack" aria-label="Open the pack. Press Enter to rip it."
                onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); autoTear(); } }}
                onClick={(e) => e.preventDefault()}
              >
                <span className="pk top-part" id="opk-top"><span className="pk-face" /><span className="pk-crimp t" /></span>
                <span className="pk main-part" id="opk-main"><span className="pk-face" /><span className="pk-crimp b" /></span>
                <span className="pk-body"><span className="pk-logo">{/* eslint-disable-next-line @next/next/no-img-element */}<img src={PACK_LOGO_SRC} alt="" /></span><span className="pk-title">CARDS</span></span>
                <span className="pk-count">5 CARDS</span>
                <i className="burst" />
              </button>
              <i className="cutline" ref={cutRef as React.RefObject<HTMLElement>} />
            </div>
          </>
        ) : null}
        {phase === 'reveal' ? (
          <>
            <div className="ov-hint" aria-live="polite">{hint}</div>
            <div
              className="pile" id="pile" ref={pileRef} role="button" tabIndex={0}
              aria-label={flipped ? 'Send this card down and see the next' : 'Reveal the next card'}
              onClick={onPile} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPile(); } }}
            >
              {[...rows.keys()].reverse().filter((i) => i >= idx).map((i) => {
                const x = rows[i]!;
                const isActive = active === i;
                return (
                  <div
                    key={i} data-i={i}
                    className={`rc${isActive ? '' : ' enter'}${isActive && flipped ? ' flipped' : ''}${isActive && slow ? ' slow' : ''}${isActive && charge ? ` charge charge-${charge}` : ''}`}
                    style={{ '--i': rows.length - 1 - i, transform: isActive ? 'none' : `translate(${i * 3}px,${i * -4}px) rotate(${(i % 2 ? 1.2 : -1.2) * i}deg)` } as Vars}
                  >
                    <div className="rc-in">
                      <div className="side back"><CardBack /></div>
                      <div className="side front"><CardFront card={x.card} /></div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="rlabel" aria-live="polite">
              {label && current && label.idx === idx ? (
                <>
                  <span className="rtag pop"><Gem r={current.card.rarity} className={`gem gc-${current.card.rarity}`} />{RARITY_NAMES[current.card.rarity]} &middot; {EDITIONS[current.card.rarity].name}</span>
                  {current.isNew ? <span className="rtag new pop">New</span> : <span className="rtag dup pop">+1 copy</span>}
                </>
              ) : null}
            </div>
          </>
        ) : null}
        {phase === 'summary' ? (
          <>
            <h2 className="ov-title" aria-live="polite">{newCount ? `${newCount} new card${newCount > 1 ? 's' : ''} for your binder` : 'Only copies this time'}</h2>
            <div className="fan" id="fan">
              {rows.map((x, i) => (
                <div
                  key={x.card.n} className={`fc${i < 2 ? ' lft' : ''}`}
                  style={{ transform: `translateX(${(i - 2) * spreadPct}%) translateY(${Math.abs(i - 2) * 16}px) rotate(${(i - 2) * (narrow ? 7 : 9)}deg)`, zIndex: i === 2 ? 5 : 5 - Math.abs(i - 2) }}
                >
                  <Link href={`/cards/c/${x.card.num}`} className="fc-b" aria-label={`${x.card.name}, ${EDITIONS[x.card.rarity].name}${x.isNew ? ', new' : ', copy'}. See the card.`}>
                    <span className={`rtag ${x.isNew ? 'new' : 'dup'}`}>{x.isNew ? 'New' : '+1 copy'}</span>
                    <CardFront card={x.card} />
                  </Link>
                  <FavStar n={x.card.n} name={x.card.name} edition={EDITIONS[x.card.rarity].name} />
                </div>
              ))}
            </div>
            <div className="totals">
              <span className="tot"><b>{newCount}</b>new</span>
              {newCount < len ? <span className="tot"><b>{len - newCount}</b>{len - newCount === 1 ? 'copy' : 'copies'}, worth {dupShards} shard{dupShards === 1 ? '' : 's'}</span> : null}
              <span className="tot">Best: <b className={`rt-${RARITIES[best]}`}>{RARITY_NAMES[RARITIES[best]!]}</b></span>
            </div>
          </>
        ) : null}
      </div>
      <div className="pulled" ref={pulledRef}>
        {phase === 'summary' ? null : rows.map((x, i) => (i < idx ? <div key={x.card.n} className="pop" style={{ position: 'relative' }}><CardFront card={x.card} /></div> : <i key={x.card.n} className="slot" />))}
      </div>
      <div className="ov-actions">
        {phase === 'summary' ? (
          <>
            <button type="button" ref={addRef} className="btn-primary lg" onClick={() => fly('none')} disabled={leaving}>Add to binder</button>
            {stockLeft > 0 ? <button type="button" className="btn-outline again" onClick={() => fly('stock')} disabled={leaving}>Open another ({stockLeft} left)</button> : null}
          </>
        ) : null}
      </div>
      <canvas id="fx" ref={canvas} aria-hidden="true" />
    </div>
  );
}
