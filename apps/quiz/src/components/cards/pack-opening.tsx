'use client';

// Bunnyverse Cards, lane U: the opening of a pack, ported from the approved prototype v4 (startOpening, bindTear, tear, showPile, reveal,
// sendDown, summary). The five cards were drawn by the server before this screen shows (POST /api/cards/open), so nothing here decides a
// result. Tap or press Enter on the pack to rip it (or drag across), tap the pile to reveal and send each card down, "Reveal all" skips.
// Keyboard: the pack and the pile are buttons; the result of each card is read out through an aria-live region.
// Lot 3: a tap during an animation is never lost (point B5): one tap is buffered, the running animation jumps to its end, then the tap's
// action runs, and a card stays on screen 150 ms (Standard to Holo) or 450 ms (Era and above) before a tap can send it down. "Reveal all"
// turns the five cards at once and then holds up the best card of the pack for 600 ms (B8). Under reduced motion every change is a 200 ms fade, and the
// setting is read again when it changes (B9).
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';

import { analytics } from '@/lib/analytics';
import { PACK_SIZE, RARITIES, RARITY_LABEL, SHARDS } from '@/lib/cards/rules';
import { PACK_LOGO_SRC } from '@/lib/cards/ui-logo';

import { CardBack, CardFront, Gem } from './card-art';
import { useCards } from './cards-provider';
import { FavStar } from './fav-star';
import { Fx, PACK_BURST, RARITY_BURST, attachTilt, onReducedMotionChange, reducedMotion } from './fx';
import { FADE_MS, FLIP_ALL_MS, SPOTLIGHT_MS, StepRunner, finishAnimations, leaveWait, spotlightIndex } from './reveal-steps';

import type { OpenedCard, PackSource, Rarity } from '@/lib/cards/types';
import type { SlimCard } from '@/lib/cards/ui-types';

type Phase = 'pack' | 'tearing' | 'torn' | 'reveal' | 'all' | 'spot' | 'summary';
type Vars = React.CSSProperties & Record<`--${string}`, string | number>;

export interface OpeningProps {
  cards: OpenedCard[];
  source: PackSource;
  /** Called when the player leaves the screen; `then` says what comes next. */
  onClose: (then: 'none' | 'stock') => void;
  /** Lot 3 point A18: the demo pack of a signed-out visitor, drawn and signed by the server. Nothing is saved yet, so no New badge and no count; it ends
   *  on a sign in, after which its cards are attached to the account. */
  demo?: { onSignIn: () => void };
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

export function PackOpening({ cards, source, onClose, demo }: OpeningProps): React.ReactElement {
  const ctx = useCards();
  const rows = useMemo(() => cards.map((c) => ({ card: ctx.byN.get(c.n) as SlimCard, isNew: c.isNew, pair: c.completesPair === true })).filter((r) => r.card), [cards, ctx.byN]);
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
  const [spot, setSpot] = useState<number | null>(null);
  const [allFlip, setAllFlip] = useState(false);
  const [, setReducedState] = useState(() => reducedMotion());

  // The machine lives in a ref so the timers never read a stale render.
  const m = useRef({ phase: 'pack' as Phase, idx: 0, flipped: false, queued: false, waiting: false, shownAt: 0 });
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const fx = useRef<Fx | null>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const packRef = useRef<HTMLButtonElement>(null);
  const cutRef = useRef<HTMLElement>(null);
  const pileRef = useRef<HTMLDivElement>(null);
  const pulledRef = useRef<HTMLDivElement>(null);
  const addRef = useRef<HTMLButtonElement>(null);
  // Point B9: the setting is a ref the timers read, kept current by a change listener.
  const reducedRef = useRef(reducedMotion());
  const tiltOff = useRef<(() => void) | null>(null);
  // Point B5: the timed steps of the running animation; when the last one has run, the buffered tap (if any) runs.
  const actRef = useRef<() => void>(() => undefined);
  const run = useMemo(() => new StepRunner(() => { if (m.current.queued) { m.current.queued = false; actRef.current(); } }), []);

  const setPhase = (p: Phase): void => { m.current.phase = p; setPhaseState(p); };
  const later = useCallback((fn: () => void, ms: number): void => { timers.current.push(setTimeout(fn, ms)); }, []);

  useEffect(() => {
    const ts = timers.current;
    document.documentElement.style.overflow = 'hidden';
    if (canvas.current) fx.current = new Fx(canvas.current);
    const off = onReducedMotionChange((v) => { reducedRef.current = v; setReducedState(v); });
    return () => { ts.forEach(clearTimeout); run.cancel(); off(); tiltOff.current?.(); fx.current?.destroy(); document.documentElement.style.overflow = ''; };
  }, [run]);

  // The first screen: the clip of the two pack halves, the tilt, the focus.
  useEffect(() => {
    const top = document.getElementById('opk-top');
    const main = document.getElementById('opk-main');
    if (top) top.style.clipPath = zig(14, 22, true);
    if (main) main.style.clipPath = zig(14, 22, false);
    packRef.current?.focus();
    return attachTilt(packRef.current, 6);
  }, []);

  const stepText = demo ? 'Demo pack' : source === 'ad' ? 'Pack from an ad' : source === 'shards' ? 'Pack bought with shards' : source === 'bonus' ? 'Bonus pack' : `${ctx.state?.stock ?? 0} pack${ctx.state?.stock === 1 ? '' : 's'} left after this one`;

  /* ---- B5: a tap during an animation runs it to its end ---- */
  const skipAnim = useCallback((): void => {
    // The turn of "Reveal all" finishes in one pass, so the spotlight that follows it still gets its 600 ms; every other animation runs to
    // the very end (a step may schedule the next one, hence the loop).
    const once = m.current.phase === 'all';
    flushSync(() => { for (let k = 0; k < (once ? 1 : 6) && run.busy; k++) run.finish(); });
    finishAnimations(root.current);
  }, [run]);

  /* ---- tear ---- */
  const showPile = (): void => {
    setPhase('reveal');
    setHint(<><b>Tap the card</b> to reveal it</>);
    later(() => pileRef.current?.focus(), 30);
  };

  const tear = (): void => {
    if (m.current.phase === 'torn' || m.current.phase === 'reveal' || m.current.phase === 'spot' || m.current.phase === 'summary') return;
    setPhase('torn');
    const p = packRef.current;
    if (!p) return;
    p.classList.add('opening');
    if (cutRef.current) cutRef.current.style.opacity = '0';
    const r = p.getBoundingClientRect();
    fx.current?.burst(r.left + r.width / 2, r.top + r.height * 0.14, { n: 60, colors: PACK_BURST, speed: 9, g: 0.1, size: 2.6 });
    if (navigator.vibrate) try { navigator.vibrate(18); } catch { /* not supported */ }
    run.start([[reducedRef.current ? FADE_MS : 950, showPile]]);
  };

  const autoTear = (): void => {
    if (m.current.phase !== 'pack') return;
    setPhase('tearing');
    const cut = cutRef.current;
    const red = reducedRef.current;
    if (cut) { cut.style.transition = red ? 'none' : 'width .45s cubic-bezier(.45,0,.35,1)'; void cut.offsetWidth; cut.style.width = '92%'; }
    run.start([[red ? 60 : 470, tear]]);
  };

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
    // A tap on a pack that is already tearing is not lost: the tear runs to its end and the pile shows.
    if (m.current.phase === 'tearing' || m.current.phase === 'torn') { skipAnim(); return; }
    if (m.current.phase !== 'pack') return;
    if (!moved || d.prog < 0.62) autoTear();
  };

  /* ---- reveal ---- */
  const toSummary = (): void => {
    setPhase('summary');
    setSpot(null);
    setAllFlip(false);
    setHint(null);
    // The pack is complete once its fifth card is shown: game_complete with the existing enums (a full pack is 5 cards of 5).
    if (!demo) analytics.gameComplete({ site: 'hub', game: 'cards', mode: 'classic', kind: 'cards_standard', score: PACK_SIZE, max: PACK_SIZE });
    later(() => addRef.current?.focus(), 80);
  };

  /** The five have turned. The best card of the pack is held up for 600 ms (point B8): it rises and glows while the others fade; a pack
   *  whose five cards are of one rarity has no best card and goes straight to the summary. */
  const spotlight = (): void => {
    const k = spotlightIndex(rows.map((r) => r.card.rarity));
    if (k === null) { toSummary(); return; }
    setSpot(k);
    setPhase('spot');
    run.start([[SPOTLIGHT_MS, toSummary]]);
  };

  const reveal = (fast: boolean): void => {
    const i = m.current.idx;
    const x = rows[i];
    if (!x) return;
    const red = reducedRef.current;
    const ri = RARITIES.indexOf(x.card.rarity);
    setActive(i);
    const pre = fast || red ? 0 : ri >= 5 ? 1100 : ri >= 3 ? 700 : 0;
    if (pre) {
      setCharge(x.card.rarity);
      setHint(ri >= 5 ? <><b>A {RARITY_LABEL[x.card.rarity]}</b> card is on its way</> : <><b>{RARITY_LABEL[x.card.rarity]}</b> or better</>);
      setTone(x.card.rarity);
    }
    const labelAfter = fast ? 0 : red ? FADE_MS : ri >= 5 ? 900 : 380;
    run.start([
      [pre, () => {
        if (ri >= 5 && !fast && !red) setSlow(true);
        m.current.flipped = true;
        setFlippedState(true);
        const el = pileRef.current?.querySelector<HTMLElement>(`[data-i="${i}"]`);
        const cardEl = el?.querySelector<HTMLElement>('.card') ?? null;
        // Point B7: a sweep of light over a foil card as it turns up (CSS, 900 ms), and the tilt of the finger or the pointer.
        if (cardEl && !red) { cardEl.classList.add('sweep'); tiltOff.current?.(); tiltOff.current = attachTilt(cardEl, 10); }
      }],
      [pre + labelAfter, () => {
        const el = pileRef.current?.querySelector<HTMLElement>(`[data-i="${i}"]`);
        const r = el?.getBoundingClientRect();
        const cxp = r ? r.left + r.width / 2 : innerWidth / 2;
        const cyp = r ? r.top + r.height / 2 : innerHeight / 2;
        const f = fx.current;
        if (f && ri >= 1) f.burst(cxp, cyp, { n: [0, 18, 30, 60, 80, 120][ri]!, colors: RARITY_BURST[x.card.rarity], speed: [0, 5, 6, 8, 9, 11][ri]!, size: ri >= 4 ? 3.4 : 2.6 });
        if (f && ri === 4) f.rain(RARITY_BURST.UR, 90);
        if (f && ri === 5) { f.rain(RARITY_BURST.L, 160); f.burst(cxp, cyp, { n: 90, colors: RARITY_BURST.L, speed: 13, shape: 'confetti', size: 4 }); }
        setLabel({ idx: i });
        setHint(i < len - 1 ? <><b>Tap again</b> for the next card &middot; {i + 1} of {len}</> : <><b>Tap again</b> to see your pull</>);
        m.current.shownAt = performance.now();
      }],
    ]);
  };

  const sendDown = (fast: boolean): void => {
    const i = m.current.idx;
    const red = reducedRef.current;
    const el = pileRef.current?.querySelector<HTMLElement>(`[data-i="${i}"]`);
    const slot = pulledRef.current?.children[i] as HTMLElement | undefined;
    tiltOff.current?.();
    tiltOff.current = null;
    if (el && red) {
      el.style.opacity = '0';
    } else if (el && slot) {
      const sr = slot.getBoundingClientRect();
      const er = el.getBoundingClientRect();
      el.style.transition = `transform ${fast ? 0.25 : 0.55}s cubic-bezier(.5,0,.3,1), opacity .5s`;
      el.style.transform = `translate(${sr.left + sr.width / 2 - (er.left + er.width / 2)}px,${sr.top + sr.height / 2 - (er.top + er.height / 2)}px) scale(${sr.width / er.width})`;
    }
    run.start([[red ? FADE_MS : fast ? 260 : 560, () => {
      setLabel(null); setTone(null); setCharge(null); setSlow(false); setActive(null);
      m.current.idx = i + 1; m.current.flipped = false;
      setIdxState(i + 1); setFlippedState(false);
      if (i + 1 >= len) toSummary();
      else setHint(<><b>Tap the card</b> to reveal it &middot; {i + 2} of {len}</>);
    }]]);
  };

  /** What a tap on the pile does when nothing is running: show the card, or (after its minimum stay) send it down. */
  const act = (): void => {
    if (m.current.phase !== 'reveal' || m.current.waiting) return;
    if (!m.current.flipped) { reveal(false); return; }
    const row = rows[m.current.idx];
    const wait = row ? leaveWait(m.current.shownAt, performance.now(), row.card.rarity) : 0;
    if (wait > 0) {
      m.current.waiting = true;
      later(() => { m.current.waiting = false; if (m.current.phase === 'reveal') sendDown(false); }, wait);
    } else sendDown(false);
  };
  actRef.current = act;

  const onPile = (): void => {
    if (m.current.phase !== 'reveal' || m.current.waiting) return;
    // Point B5: never ignore a tap during an animation: buffer it (one), run the animation to its end, then the tap acts.
    if (run.busy) { m.current.queued = true; skipAnim(); return; }
    act();
  };

  /** Point B8: the five cards turn at once (a row of five, face down, then all turned together), then the best one is spotlighted. */
  const revealAll = (): void => {
    if (m.current.phase !== 'reveal') return;
    m.current.queued = false;
    m.current.waiting = false;
    if (run.busy) skipAnim();
    tiltOff.current?.();
    tiltOff.current = null;
    setLabel(null); setTone(null); setCharge(null); setSlow(false); setActive(null);
    setAllFlip(false);
    setPhase('all');
    setHint(null);
    // A short beat so the face-down row has painted before it turns; under reduced motion the turn is a 200 ms fade.
    run.start([[40, () => setAllFlip(true)], [40 + (reducedRef.current ? FADE_MS : FLIP_ALL_MS), spotlight]]);
  };

  const skip = (): void => {
    if (m.current.phase === 'all' || m.current.phase === 'spot') { skipAnim(); return; }
    if (m.current.phase === 'pack' || m.current.phase === 'tearing' || m.current.phase === 'torn') {
      flushSync(() => { if (m.current.phase === 'pack') { setPhase('tearing'); tear(); } });
      skipAnim();
    }
    revealAll();
  };

  /* ---- leaving ---- */
  const fly = (then: 'none' | 'stock'): void => {
    if (leaving) return;
    setLeaving(true);
    const target = document.getElementById('bvc-tab-binder');
    const cardsEls = document.querySelectorAll<HTMLElement>('#fan .fc');
    // Point B9: under reduced motion the cards do not fly; the screen fades out in 200 ms instead.
    if (reducedRef.current || !target || !cardsEls.length) {
      root.current?.classList.add('fade-out');
      later(() => onClose(then), reducedRef.current ? FADE_MS : 0);
      return;
    }
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
    <div ref={root} className={`ov${tone ? ` tone-${tone}` : ''}`} role="dialog" aria-modal="true" aria-label="Pack opening">
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
                  <span className="rtag pop"><Gem r={current.card.rarity} className={`gem gc-${current.card.rarity}`} />{RARITY_LABEL[current.card.rarity]}</span>
                  {demo ? null : current.isNew ? <span className="rtag new pop">New</span> : <span className="rtag dup pop">+1 copy</span>}
                  {current.pair ? <span className="rtag pair pop">Completes the pair</span> : null}
                </>
              ) : null}
            </div>
          </>
        ) : null}
        {phase === 'all' || phase === 'spot' ? (
          <>
            <div
              className={`allrow${phase === 'spot' ? ' spotting' : ''}`} role="button" tabIndex={0} onClick={skipAnim}
              aria-label={phase === 'spot' && spot !== null ? `Best card of the pack: ${rows[spot]!.card.name}, ${RARITY_LABEL[rows[spot]!.card.rarity]}. Continue.` : 'Your five cards. Continue.'}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); skipAnim(); } }}
            >
              {rows.map((x, i) => (
                <div key={x.card.n} className={`allc${spot === i ? ' best' : ''}`}>
                  <div className={`rc${allFlip ? ' flipped' : ''}`}>
                    <div className="rc-in">
                      <div className="side back"><CardBack /></div>
                      <div className="side front"><CardFront card={x.card} className={spot === i ? 'sweep' : ''} /></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="rlabel" aria-live="polite">
              {phase === 'spot' && spot !== null ? <span className="rtag pop"><Gem r={rows[spot]!.card.rarity} className={`gem gc-${rows[spot]!.card.rarity}`} />{RARITY_LABEL[rows[spot]!.card.rarity]}</span> : null}
            </div>
          </>
        ) : null}
        {phase === 'summary' ? (
          <>
            <h2 className="ov-title" aria-live="polite">{demo ? 'Your demo pack' : newCount ? `${newCount} new card${newCount > 1 ? 's' : ''} for your binder` : 'Only copies this time'}</h2>
            <div className="fan" id="fan">
              {rows.map((x, i) => (
                <div
                  key={x.card.n} className={`fc${i < 2 ? ' lft' : ''}`}
                  style={{ transform: `translateX(${(i - 2) * spreadPct}%) translateY(${Math.abs(i - 2) * 16}px) rotate(${(i - 2) * (narrow ? 7 : 9)}deg)`, zIndex: i === 2 ? 5 : 5 - Math.abs(i - 2) }}
                >
                  {demo ? (
                    <div className="fc-b" aria-label={`${x.card.name}, ${RARITY_LABEL[x.card.rarity]}`} role="img">
                      <CardFront card={x.card} />
                    </div>
                  ) : (
                    <>
                      <Link href={`/cards/c/${x.card.num}`} className="fc-b" aria-label={`${x.card.name}, ${RARITY_LABEL[x.card.rarity]}${x.isNew ? ', new' : ', copy'}${x.pair ? ', completes the pair' : ''}. See the card.`}>
                        <span className={`rtag ${x.isNew ? 'new' : 'dup'}`}>{x.isNew ? 'New' : '+1 copy'}</span>
                        {x.pair ? <span className="rtag pair">Completes the pair</span> : null}
                        <CardFront card={x.card} />
                      </Link>
                      <FavStar n={x.card.n} name={x.card.name} edition={RARITY_LABEL[x.card.rarity]} />
                    </>
                  )}
                </div>
              ))}
            </div>
            <div className="totals">
              {demo ? null : <span className="tot"><b>{newCount}</b>new</span>}
              {!demo && newCount < len ? <span className="tot"><b>{len - newCount}</b>{len - newCount === 1 ? 'copy' : 'copies'}, worth {dupShards} shard{dupShards === 1 ? '' : 's'}</span> : null}
              <span className="tot">Best: <b className={`rt-${RARITIES[best]}`}>{RARITY_LABEL[RARITIES[best]!]}</b></span>
            </div>
          </>
        ) : null}
      </div>
      <div className="pulled" ref={pulledRef}>
        {phase === 'summary' ? null : rows.map((x, i) => (i < idx ? <div key={x.card.n} className="pop" style={{ position: 'relative' }}><CardFront card={x.card} /></div> : <i key={x.card.n} className="slot" />))}
      </div>
      <div className="ov-actions">
        {phase === 'summary' && demo ? (
          <>
            <button type="button" ref={addRef} className="btn-primary lg" onClick={demo.onSignIn}>Sign in to keep these cards</button>
            <button type="button" className="btn-outline again" onClick={() => onClose('none')}>Close</button>
          </>
        ) : null}
        {phase === 'summary' && !demo ? (
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
