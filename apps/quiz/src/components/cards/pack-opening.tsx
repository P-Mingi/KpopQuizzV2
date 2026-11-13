'use client';

// KpopCards (agent C): the opening of a pack, one pack or five at once, exactly as docs/design/cards/kpopcards-prototype-v6.html
// (startOpening, startMulti, tear, reveal, sendDown, summary, multiGrid, multiDone). The cards were drawn by the server before this screen
// shows (POST /api/cards/open): nothing here draws or decides a result, it only shows the cards it was given.
// Every number (timings per edition, bursts, sounds, sizes) comes from lib/cards/opening-plan.ts. A tap during an animation is never lost: one
// tap is buffered, the running animation jumps to its end, then the tap acts (StepRunner). Under reduced motion every change is a 200 ms fade.
// Lot 5: nothing behind the opening is painted (class ovopen), the particles are one canvas at one pixel per pixel (at most 260), only
// transform and opacity animate.
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';

import { analytics } from '@/lib/analytics';
import {
  FINISH_COLORS, MULTI, SPOT_GLOW, TEAR, TEAR_COLORS, multiDelays, multiDoneAfter, multiFlipAfter, multiOrder, rarityIndex, revealPlan, summaryPlan, warnLevel,
} from '@/lib/cards/opening-plan';
import { PACK_SIZE, RARITIES, RARITY_LABEL, SHARDS } from '@/lib/cards/rules';

import { CardBack, CardFront, Gem } from './card-art';
import { useCards } from './cards-provider';
import { FavStar } from './fav-star';
import { Fx, attachTilt, onReducedMotionChange, reducedMotion } from './fx';
import { listenForGesture, openingOutput } from './opening-output';
import { FADE_MS, StepRunner, finishAnimations, leaveWait, spotlightIndex } from './reveal-steps';

import '@/styles/cards/cards-opening.css';

import type { OpenedCard, PackSource, Rarity } from '@/lib/cards/types';
import type { SlimCard } from '@/lib/cards/ui-types';

type Phase = 'pack' | 'tearing' | 'torn' | 'reveal' | 'multi' | 'grid' | 'summary';
type Vars = React.CSSProperties & Record<`--${string}`, string | number>;

/** The face of the pack: three colours, the name under the word, the address of the page ("all", "daily", "focus/twice"), golden or not. */
export interface PackLook { c: readonly [string, string, string]; title: string; path: string; golden: boolean }
export const GOLD_COLORS: readonly [string, string, string] = ['#FFF1B8', '#F2B53A', '#B77A0E'];
const DEFAULT_LOOK: PackLook = { c: ['#FF3E86', '#C55BFF', '#4CC9FF'], title: 'ALL IDOLS', path: 'all', golden: false };

export type OpeningSource = PackSource | 'daily' | 'focus';
/** What comes next when the player leaves: nothing, one more pack, or five more. */
export type OpeningNext = 'none' | 'stock' | 'stock5';

export interface OpeningCard extends OpenedCard {
  /** The server's Gold guarantee fired for this card ("Gold guarantee"). */
  pity?: boolean;
}
export interface OpeningProps {
  /** 5 cards, or 25 when `packs` is 5, in draw order. */
  cards: OpeningCard[];
  source: OpeningSource;
  look?: PackLook;
  packs?: 1 | 5;
  /** Packs of the run that were golden (Open 5 says "2 golden packs"). */
  goldenPacks?: number;
  /** Sets this opening finished: shown as "You finished X. +1 pack in Missions". */
  finished?: readonly { id: string; name: string; packs?: number }[];
  /** The server's headline for the summary ("3 new cards for your collection") and what the copies are worth in shards; computed here when absent. */
  headline?: string;
  copiesShards?: number;
  /** The Full Art odds in percent (the stamp says "0.3% of cards"). null or absent: the stamp says only FULL ART. */
  fullArtOdds?: number | null;
  /** Called when the player leaves the screen; `then` says what comes next. */
  onClose: (then: OpeningNext) => void;
  /** The demo pack of a signed-out visitor, drawn and signed by the server: no New badge, no count; it ends on a sign in. */
  demo?: { onSignIn: () => void };
  /** The page of a card (the summary links to it). */
  cardHref?: (card: SlimCard) => string;
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

function PackFace({ id, look, golden, dealt }: { id: string; look: PackLook; golden: boolean; dealt?: boolean }): React.ReactElement {
  const c = golden ? GOLD_COLORS : look.c;
  const title = golden ? 'GOLDEN PACK' : look.title;
  return (
    <button
      type="button" id={id} className={`pack${golden ? ' golden' : ''}`} aria-label="Open the pack" tabIndex={dealt ? -1 : 0}
      style={{ '--p1': c[0], '--p2': c[1], '--p3': c[2] } as Vars}
    >
      <span className="pk top-part" id={`${id}-top`}><span className="pk-face" /><span className="pk-crimp t" /></span>
      <span className="pk main-part" id={`${id}-main`}><span className="pk-face" /><span className="pk-crimp b" /></span>
      <span className="pk-body"><span className="pk-word">Kpop<b>Cards</b></span><span className="pk-title">{title}</span></span>
      <span className="pk-count">5 CARDS</span>
      <i className="burst" />
    </button>
  );
}

export function PackOpening({ cards, source, look = DEFAULT_LOOK, packs = 1, goldenPacks = 0, finished = [], headline, copiesShards, fullArtOdds = null, onClose, demo, cardHref }: OpeningProps): React.ReactElement {
  const ctx = useCards();
  const router = useRouter();
  const rows = useMemo(
    () => cards.map((c) => ({ card: ctx.byN.get(c.n) as SlimCard, isNew: c.isNew, pair: c.completesPair === true, pity: c.pity === true })).filter((r) => r.card),
    [cards, ctx.byN],
  );
  const len = rows.length;
  const multi = packs === 5;
  const bestRarity: Rarity = rows.reduce<Rarity>((b, r) => (rarityIndex(r.card.rarity) > rarityIndex(b) ? r.card.rarity : b), 'C');
  const warn = warnLevel(bestRarity);
  const golden = look.golden && !multi;
  const hrefOf = cardHref ?? ((c: SlimCard) => `/kpopcards/c/${c.num}`);

  const [phase, setPhaseState] = useState<Phase>(multi ? 'multi' : 'pack');
  const [idx, setIdxState] = useState(0);
  const [flipped, setFlippedState] = useState(false);
  const [active, setActive] = useState<number | null>(null);
  const [charge, setCharge] = useState<Rarity | null>(null);
  const [flipVar, setFlipVar] = useState<number | null>(null);
  const [stamp, setStamp] = useState(false);
  const [legend, setLegend] = useState(false);
  const [hint, setHint] = useState<React.ReactNode>(null);
  const [label, setLabel] = useState<{ idx: number } | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [spot, setSpot] = useState(false);
  const [ripped, setRipped] = useState(false);
  const [dealt, setDealt] = useState(false);
  const [turned, setTurned] = useState(false);
  const [, setReducedState] = useState(() => reducedMotion());

  // The machine lives in a ref so the timers never read a stale render.
  const m = useRef({ phase: (multi ? 'multi' : 'pack') as Phase, idx: 0, flipped: false, queued: false, waiting: false, shownAt: 0, fast: false, summarySpot: false });
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const fx = useRef<Fx | null>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const packRef = useRef<HTMLButtonElement>(null);
  const cutRef = useRef<HTMLElement>(null);
  const zoneRef = useRef<HTMLDivElement>(null);
  const pileRef = useRef<HTMLDivElement>(null);
  const pulledRef = useRef<HTMLDivElement>(null);
  const fanRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const addRef = useRef<HTMLButtonElement>(null);
  const reducedRef = useRef(reducedMotion());
  const tiltOff = useRef<(() => void) | null>(null);
  const fanTilts = useRef<(() => void)[]>([]);
  const actRef = useRef<() => void>(() => undefined);
  const run = useMemo(() => new StepRunner(() => { if (m.current.queued) { m.current.queued = false; actRef.current(); } }), []);
  const out = (): ReturnType<typeof openingOutput> => openingOutput();

  const setPhase = (p: Phase): void => { m.current.phase = p; setPhaseState(p); };
  const later = useCallback((fn: () => void, ms: number): void => { timers.current.push(setTimeout(fn, ms)); }, []);

  /* ---- the classes of the screen, set by hand so a change replays its animation and a render never undoes it ---- */
  const cls = (name: string, on: boolean): void => { root.current?.classList.toggle(name, on); };
  const setTone = (r: Rarity | null): void => { (['SR', 'UR', 'L'] as const).forEach((x) => cls(`tone-${x}`, r === x)); };
  const stage = (on: boolean, bang = false): void => {
    cls('boom', on);
    const el = root.current;
    if (!bang) { cls('bang', false); return; }
    if (el) { el.classList.remove('bang'); void el.offsetWidth; el.classList.add('bang'); }
  };
  const jump = (): void => {
    cls('jump', true);
    requestAnimationFrame(() => requestAnimationFrame(() => cls('jump', false)));
  };
  const sweep = (card: Element | null | undefined): void => {
    if (!card || reducedRef.current) return;
    card.classList.remove('sweep'); void (card as HTMLElement).offsetWidth; card.classList.add('sweep');
    later(() => card.classList.remove('sweep'), 1000);
  };

  useEffect(() => {
    const ts = timers.current;
    const html = document.documentElement;
    const scope = root.current?.closest('.bvc') ?? null;
    html.style.overflow = 'hidden';
    html.classList.add('ovopen');
    scope?.classList.add('ovopen');
    if (canvas.current) fx.current = new Fx(canvas.current);
    const stopGesture = listenForGesture();
    cls('rm', reducedRef.current);
    const off = onReducedMotionChange((v) => { reducedRef.current = v; cls('rm', v); setReducedState(v); });
    return () => {
      ts.forEach(clearTimeout); run.cancel(); off(); stopGesture(); tiltOff.current?.(); fanTilts.current.forEach((f) => f()); fx.current?.destroy();
      html.style.overflow = ''; html.classList.remove('ovopen'); scope?.classList.remove('ovopen');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run]);

  // The first screen: the clip of the two pack halves, the tilt, the focus, and the warning buzz of a big pull.
  useEffect(() => {
    if (multi) {
      document.querySelectorAll<HTMLElement>('.mp .pk.top-part').forEach((e) => { e.style.clipPath = zig(14, 22, true); });
      document.querySelectorAll<HTMLElement>('.mp .pk.main-part').forEach((e) => { e.style.clipPath = zig(14, 22, false); });
      setHint(bestRarity && warn ? <><b>Something shines</b> in these packs</> : <><b>{packs} packs</b> opening</>);
      // Five packs rip together, one rip sound after another, then the grid is dealt.
      for (let j = 0; j < packs; j++) later(() => { if (m.current.phase === 'multi') out().cue({ kind: 'rip' }); }, j * MULTI.ripStagger);
      if (warn) out().vibrate([12, 80, 12]);
      run.start([[reducedRef.current ? MULTI.ripAfterReduced : MULTI.ripAfter, () => {
        setRipped(true);
        run.start([[m.current.fast ? 0 : reducedRef.current ? MULTI.gridAfterReduced : MULTI.gridAfter, multiGrid]]);
      }]]);
      return undefined;
    }
    const top = document.getElementById('opk-top');
    const main = document.getElementById('opk-main');
    if (top) top.style.clipPath = zig(14, 22, true);
    if (main) main.style.clipPath = zig(14, 22, false);
    packRef.current?.focus();
    setHint(warn ? <><b>Something shines</b> in this pack. Tap to open it</> : golden ? <><b>A golden pack:</b> its fifth card is Holo or better</> : <><b>Tap the pack</b> to open it</>);
    if (warn) out().vibrate([12, 80, 12]);
    return attachTilt(packRef.current, 10);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stockLeft = ctx.state?.stock ?? 0;
  const stepText = demo ? 'Demo pack'
    : multi ? `${packs} packs · ${stockLeft} left`
    : source === 'ad' ? 'Pack from an ad' : source === 'shards' ? 'Pack bought with shards' : source === 'bonus' ? 'Bonus pack' : source === 'daily' ? 'Pack of the day' : source === 'focus' ? 'Focus pack'
    : `${golden ? 'Golden pack · ' : ''}${stockLeft} pack${stockLeft === 1 ? '' : 's'} left`;

  /* ---- a tap during an animation runs it to its end ---- */
  const skipAnim = useCallback((): void => {
    // Steps that look at the flag run their "jumped" variant (no confetti burst, a smaller rain).
    m.current.fast = true;
    jump();
    flushSync(() => { for (let k = 0; k < 8 && run.busy; k++) run.finish(); });
    m.current.fast = false;
    finishAnimations(root.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run]);

  /* ---- tear ---- */
  const showPile = (): void => {
    setPhase('reveal');
    setHint(<><b>Tap the card</b> to reveal it</>);
    later(() => pileRef.current?.focus(), 30);
  };

  const tear = (): void => {
    const ph = m.current.phase;
    if (ph === 'torn' || ph === 'reveal' || ph === 'summary') return;
    if (ph === 'pack') out().cue({ kind: 'rip' });
    setPhase('torn');
    const p = packRef.current;
    if (!p) return;
    p.classList.add('opening');
    if (cutRef.current) cutRef.current.style.opacity = '0';
    zoneRef.current?.classList.remove('warn');
    const r = p.getBoundingClientRect();
    fx.current?.burst(r.left + r.width / 2, r.top + r.height * 0.14, { n: TEAR.burst.n, colors: TEAR_COLORS, speed: TEAR.burst.speed, g: TEAR.burst.g, size: TEAR.burst.size });
    out().vibrate(18);
    run.start([[reducedRef.current ? TEAR.pileAfterReduced : TEAR.pileAfter, showPile]]);
  };

  const autoTear = (): void => {
    if (m.current.phase !== 'pack') return;
    setPhase('tearing');
    out().cue({ kind: 'rip' });
    const cut = cutRef.current;
    const red = reducedRef.current;
    if (cut) { cut.style.transition = red ? 'none' : 'width .45s cubic-bezier(.45,0,.35,1)'; void cut.offsetWidth; cut.style.width = '92%'; }
    run.start([[red ? TEAR.cutMsReduced : TEAR.tearAfter, tear]]);
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
      if (d.prog >= TEAR.drag) tear();
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
    if (!moved || d.prog < TEAR.drag) autoTear();
  };

  /* ---- the summary (after five taps, after Reveal all, after Open 5) ---- */
  const toSummary = (withSpot: boolean): void => {
    m.current.summarySpot = withSpot && spotlightIndex(rows.map((r) => r.card.rarity)) !== null;
    setPhase('summary');
    setSpot(m.current.summarySpot);
    setActive(null); setLabel(null); setCharge(null); setStamp(false); setLegend(false);
    setHint(null);
    setTone(null); stage(false);
    // The pack is complete once its fifth card is shown: game_complete with the existing enums (a full pack is 5 cards of 5).
    if (!demo) analytics.gameComplete({ site: 'hub', game: 'cards', mode: 'classic', kind: 'cards_standard', score: PACK_SIZE, max: PACK_SIZE });
    later(() => addRef.current?.focus(), 80);
  };

  // What the summary plays: the sting, the sweep on the best card, the stage and the rain of a Gold or Full Art, the finished sets.
  useEffect(() => {
    if (phase !== 'summary') return;
    const red = reducedRef.current;
    const o = out();
    const f = fx.current;
    const stop: ReturnType<typeof setTimeout>[] = [];
    if (multi || m.current.summarySpot) {
      const plan = summaryPlan(bestRarity, { spot: m.current.summarySpot, multi, reduced: red });
      const bestEl = multi ? gridRef.current?.querySelector('.mc.best .card') : fanRef.current?.querySelector('.fc.best .card');
      if (plan.sweep) sweep(bestEl);
      plan.sting.forEach((t) => o.tone(t));
      if (plan.stage) {
        setTone(bestRarity); stage(true, true);
        if (plan.boom) o.cue({ kind: 'boom' });
        if (plan.rain) f?.rain(plan.rain.colors, plan.rain.n);
        stop.push(setTimeout(() => { stage(false); setTone(null); }, plan.stageOffMs));
      }
      if (!multi) stop.push(setTimeout(() => setSpot(false), plan.stageOffMs));
      else stop.push(setTimeout(() => gridRef.current?.classList.remove('spot'), red ? MULTI.spotHoldReduced : MULTI.spotHold));
    }
    if (finished.length) f?.rain(FINISH_COLORS, multi ? 60 : 80);
    if (!multi) {
      fanTilts.current.forEach((x) => x());
      fanTilts.current = Array.from(fanRef.current?.querySelectorAll<HTMLElement>('.card') ?? []).map((c) => attachTilt(c, 12));
    }
    return () => stop.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  /* ---- reveal one card ---- */
  const reveal = (): void => {
    const i = m.current.idx;
    const x = rows[i];
    if (!x) return;
    const red = reducedRef.current;
    const r = x.card.rarity;
    const plan = revealPlan(r, { reduced: red });
    setActive(i);
    setFlipVar(plan.flip);
    if (plan.charge) {
      setCharge(r);
      setHint(plan.chargeHint === 'full' ? <><b>{RARITY_LABEL.L}</b> on its way</> : <><b>{RARITY_LABEL[r]}</b> or better</>);
      setTone(r);
      out().vibrate([10, 60, 10]);
      if (plan.stageOnCharge) { stage(true); if (plan.hum) out().cue({ kind: 'hum', ms: plan.hum }); }
    }
    run.start([
      [plan.wait, () => {
        m.current.flipped = true;
        setFlippedState(true);
        out().cue({ kind: 'flip' });
        const cardEl = pileRef.current?.querySelector<HTMLElement>(`[data-i="${i}"] .side.front .card`) ?? null;
        if (cardEl) { tiltOff.current?.(); tiltOff.current = attachTilt(cardEl, 16); }
      }],
      [plan.wait + plan.labelAt, () => {
        const p = revealPlan(r, { fast: m.current.fast, reduced: red });
        const el = pileRef.current?.querySelector<HTMLElement>(`[data-i="${i}"]`);
        const rect = el?.getBoundingClientRect();
        const cxp = rect ? rect.left + rect.width / 2 : innerWidth / 2;
        const cyp = rect ? rect.top + rect.height / 2 : innerHeight / 2;
        const f = fx.current;
        if (f && p.burst) f.burst(cxp, cyp, p.burst);
        if (f && p.rain) f.rain(p.rain.colors, p.rain.n);
        if (f && p.confetti) f.burst(cxp, cyp, p.confetti);
        if (f && p.afterBurst) { const ab = p.afterBurst; later(() => f.burst(cxp, cyp, ab), ab.delay ?? 0); }
        if (p.sweep) sweep(el?.querySelector('.side.front .card'));
        if (p.bang) {
          stage(true, true);
          if (p.legend) { setLegend(true); setStamp(true); }
          if (p.boom) out().cue({ kind: 'boom' });
        }
        out().cue({ kind: 'sting', ri: rarityIndex(r) });
        out().vibrate(p.vibrate);
        setLabel({ idx: i });
        setHint(i < len - 1 ? <><b>Tap again</b> for the next card &middot; {i + 1} of {len}</> : <><b>Tap again</b> to see your pull</>);
        m.current.shownAt = performance.now();
      }],
    ]);
  };

  const sendDown = (): void => {
    const i = m.current.idx;
    const red = reducedRef.current;
    const el = pileRef.current?.querySelector<HTMLElement>(`[data-i="${i}"]`);
    const slot = pulledRef.current?.children[i] as HTMLElement | undefined;
    tiltOff.current?.();
    tiltOff.current = null;
    stage(false); setTone(null); setStamp(false);
    if (el && red) {
      el.style.transition = 'opacity .2s'; el.style.opacity = '0';
    } else if (el && slot) {
      const sr = slot.getBoundingClientRect();
      const er = el.getBoundingClientRect();
      el.style.transition = 'transform .5s cubic-bezier(.5,0,.3,1), opacity .5s';
      el.style.transform = `translate(${sr.left + sr.width / 2 - (er.left + er.width / 2)}px,${sr.top + sr.height / 2 - (er.top + er.height / 2)}px) scale(${sr.width / er.width})`;
    }
    run.start([[red ? FADE_MS : 520, () => {
      setLabel(null); setTone(null); setCharge(null); setActive(null); setLegend(false); setStamp(false); setFlipVar(null);
      stage(false);
      m.current.idx = i + 1; m.current.flipped = false;
      setIdxState(i + 1); setFlippedState(false);
      if (i + 1 >= len) toSummary(false);
      else setHint(<><b>Tap the card</b> to reveal it &middot; {i + 2} of {len}</>);
    }]]);
  };

  /** What a tap on the pile does when nothing is running: show the card, or (after its minimum stay) send it down. */
  const act = (): void => {
    if (m.current.phase !== 'reveal' || m.current.waiting) return;
    if (!m.current.flipped) { reveal(); return; }
    const row = rows[m.current.idx];
    const wait = row ? leaveWait(m.current.shownAt, performance.now(), row.card.rarity) : 0;
    if (wait > 0) {
      m.current.waiting = true;
      later(() => { m.current.waiting = false; if (m.current.phase === 'reveal') sendDown(); }, wait);
    } else sendDown();
  };
  actRef.current = act;

  const onPile = (): void => {
    if (m.current.phase !== 'reveal' || m.current.waiting) return;
    // Never ignore a tap during an animation: buffer it (one), run the animation to its end, then the tap acts.
    if (run.busy) { m.current.queued = true; skipAnim(); return; }
    act();
  };

  /* ---- Open 5: the 25 cards ---- */
  const order = useMemo(() => multiOrder(rows.map((r) => ({ rarity: r.card.rarity, isNew: r.isNew, card: r.card }))), [rows]);
  const multiGrid = (): void => {
    if (m.current.phase !== 'multi') return;
    setPhase('grid');
    setHint(null);
    const red = reducedRef.current;
    requestAnimationFrame(() => setDealt(true));
    run.start([[multiFlipAfter(order.length, red), () => {
      setTurned(true);
      if (!m.current.fast && !red) for (let t = 0; t < 8; t++) later(() => out().cue({ kind: 'flip' }), t * 120);
      run.start([[m.current.fast ? 0 : multiDoneAfter(order.length, red), multiDone]]);
    }]]);
  };
  const multiDone = (): void => {
    if (m.current.phase === 'summary') return;
    m.current.summarySpot = true;
    setPhase('summary');
    setSpot(true);
    if (!demo) analytics.gameComplete({ site: 'hub', game: 'cards', mode: 'classic', kind: 'cards_standard', score: PACK_SIZE * packs, max: PACK_SIZE * packs });
    later(() => addRef.current?.focus(), 80);
  };

  /** Reveal all: one pack goes straight to its summary with the best card held up; five packs run the deal to its end. */
  const skip = (): void => {
    const ph = m.current.phase;
    if (ph === 'summary') return;
    if (multi) { skipAnim(); return; }
    run.cancel();
    m.current.queued = false; m.current.waiting = false;
    tiltOff.current?.(); tiltOff.current = null;
    toSummary(true);
  };

  /* ---- leaving ---- */
  const fly = (then: OpeningNext): void => {
    if (leaving) return;
    setLeaving(true);
    const targets = Array.from(document.querySelectorAll<HTMLElement>('[data-kc-target="collection"], #bvc-tab-binder'));
    const target = targets.find((t) => t.getBoundingClientRect().width > 0) ?? null;
    const cardsEls = multi ? [] : Array.from(root.current?.querySelectorAll<HTMLElement>('#fan .fc') ?? []);
    // Under reduced motion the cards do not fly; the screen fades out in 200 ms instead.
    if (reducedRef.current || !target || !cardsEls.length) {
      later(() => onClose(then), reducedRef.current ? FADE_MS : 0);
      return;
    }
    const tr = target.getBoundingClientRect();
    cardsEls.forEach((c, i) => {
      const r = c.getBoundingClientRect();
      const f = c.cloneNode(true) as HTMLElement;
      f.className = 'flyer'; f.style.left = `${r.left}px`; f.style.top = `${r.top}px`; f.style.width = `${r.width}px`; f.style.transform = 'none';
      root.current?.appendChild(f);
      c.style.visibility = 'hidden';
      later(() => { f.style.transform = `translate(${tr.left + tr.width / 2 - r.left - r.width / 2}px,${tr.top + tr.height / 2 - r.top - r.height / 2}px) scale(.12) rotate(${i * 30 - 60}deg)`; f.style.opacity = '0'; }, 20 + i * 70);
      later(() => f.remove(), 900 + i * 70);
    });
    later(() => onClose(then), 700);
  };

  /* ---- render ---- */
  const newCount = rows.filter((r) => r.isNew).length;
  const dupShards = copiesShards ?? rows.filter((r) => !r.isNew).reduce((s, r) => s + SHARDS[r.card.rarity], 0);
  const title = headline ?? (newCount ? `${newCount} new card${newCount > 1 ? 's' : ''} for your collection` : 'Only copies this time');
  const best = RARITIES.indexOf(bestRarity);
  const narrow = typeof window !== 'undefined' && innerWidth < 520;
  const spreadPct = narrow ? 42 : 62;
  const current = rows[idx];
  const bestIdx = rows.reduce((b, r, i) => (rarityIndex(r.card.rarity) > rarityIndex(rows[b]!.card.rarity) ? i : b), 0);
  const stampOdds = fullArtOdds && fullArtOdds > 0 ? `${fullArtOdds}% of cards · 1 in ${Math.round(100 / fullArtOdds)}` : null;
  const finLines = finished.map((s) => (
    <span key={s.id} className="finish pop">
      <svg className="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
      You finished {s.name}. +{s.packs ?? 1} pack{(s.packs ?? 1) > 1 ? 's' : ''} in Missions
    </span>
  ));
  const againLabel = stockLeft >= 5 && multi ? 'Open 5 more' : `Open another (${stockLeft} left)`;
  const path = `kpopcards/open/${look.path}${multi ? `?packs=${packs}` : ''}`;
  const slots = multi ? [] : rows;

  return (
    <div ref={root} className="ov" role="dialog" aria-modal="true" aria-label="Pack opening">
      <div className="stagefx" aria-hidden="true"><i className="glow" /><i className="rays" /><i className="ring r1" /><i className="ring r2" /><i className="ring r3" /><i className="flash" /></div>
      <div className="ov-top">
        <span className="ov-step"><span className="ov-path">{path}</span><span>{stepText}</span></span>
        {phase !== 'summary' ? <button type="button" className="btn-quiet skip" onClick={skip}>Reveal all</button> : <span />}
      </div>
      <div className={`ov-mid${phase === 'grid' || (phase === 'summary' && multi) ? ' scroll' : ''}`} onClick={multi && phase !== 'summary' ? () => skipAnim() : undefined}>
        {phase === 'multi' ? (
          <>
            <div className="ov-hint" aria-live="polite">{hint}</div>
            <div className={`mpacks${warn ? ` warn warn-${warn}` : ''}${ripped ? ' rip' : ''}`} id="mpacks">
              {Array.from({ length: packs }, (_, i) => <div key={i} className="mp" style={{ '--i': i } as Vars}><PackFace id={`mpk${i}`} look={look} golden={false} dealt /></div>)}
            </div>
          </>
        ) : null}
        {phase === 'pack' || phase === 'tearing' || phase === 'torn' ? (
          <>
            <div className="ov-hint" aria-live="polite">{hint}</div>
            <div ref={zoneRef} className={`tearzone${warn ? ` warn warn-${warn}` : ''}`}>
                <button
                  type="button" id="opk" ref={packRef} className={`pack${golden ? ' golden' : ''}`} aria-label="Open the pack. Press Enter to rip it."
                  style={{ '--p1': (golden ? GOLD_COLORS : look.c)[0], '--p2': (golden ? GOLD_COLORS : look.c)[1], '--p3': (golden ? GOLD_COLORS : look.c)[2] } as Vars}
                  onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); autoTear(); } }}
                  onClick={(e) => e.preventDefault()}
                >
                  <span className="pk top-part" id="opk-top"><span className="pk-face" /><span className="pk-crimp t" /></span>
                  <span className="pk main-part" id="opk-main"><span className="pk-face" /><span className="pk-crimp b" /></span>
                  <span className="pk-body"><span className="pk-word">Kpop<b>Cards</b></span><span className="pk-title">{golden ? 'GOLDEN PACK' : look.title}</span></span>
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
                    className={`rc${isActive ? '' : ' enter'}${isActive && flipped ? ' flipped' : ''}${isActive && charge ? ` charge charge-${charge}` : ''}${isActive && legend ? ' legend' : ''}`}
                    style={{ '--i': rows.length - 1 - i, ...(isActive && flipVar !== null ? { '--flip': `${flipVar}ms` } : {}), transform: isActive ? 'none' : `translate(${i * 3}px,${i * -4}px) rotate(${(i % 2 ? 1.2 : -1.2) * i}deg)` } as Vars}
                  >
                    <div className="rc-in">
                      <div className="side back"><CardBack /></div>
                      <div className="side front"><CardFront card={x.card} /></div>
                    </div>
                  </div>
                );
              })}
              {stamp ? <div className="stamp"><b>FULL ART</b>{stampOdds ? <span>{stampOdds}</span> : null}</div> : null}
            </div>
            <div className="rlabel" aria-live="polite">
              {label && current && label.idx === idx ? (
                <>
                  <span className="rtag pop"><Gem r={current.card.rarity} className={`gem gc-${current.card.rarity}`} />{RARITY_LABEL[current.card.rarity]}</span>
                  {demo ? null : current.isNew ? <span className="rtag new pop">New</span> : <span className="rtag dup pop">+1 copy</span>}
                  {current.pair ? <span className="rtag half pop">Completes the pair</span> : null}
                  {current.pity ? <span className="rtag pity pop">Gold guarantee</span> : null}
                  {current.card.rarity === 'L' ? <span className="rnext pop"><b>Tap again</b> {idx < len - 1 ? 'for the next card' : 'to see your pull'}</span> : null}
                </>
              ) : null}
            </div>
          </>
        ) : null}
        {(phase === 'grid' || (phase === 'summary' && multi)) ? (
          <>
            <div className="ov-title" id="m-title" aria-live="polite">{phase === 'summary' ? title : `${len} cards`}</div>
            <div className={`mgrid${dealt ? ' dealt' : ''}${turned ? ' flip' : ''}${phase === 'summary' && spot ? ' spot' : ''}`} id="mgrid" ref={gridRef} style={{ '--spot': SPOT_GLOW[bestRarity] } as Vars}>
              {order.map((o, pos) => {
                const x = o.row.card;
                const ri = rarityIndex(x.rarity);
                const dl = multiDelays(pos, order.length, x.rarity);
                const isNew = rows[o.i]!.isNew;
                return (
                  <button
                    key={o.i} type="button" disabled={phase !== 'summary'}
                    className={`mc${ri >= 2 ? ` hi hi-${x.rarity}` : ''}${pos === 0 ? ' best' : ''}`}
                    style={{ '--d': `${dl.d}ms`, '--fd': `${dl.fd}ms` } as Vars}
                    aria-label={`${x.name}, ${RARITY_LABEL[x.rarity]}`}
                    onClick={() => { if (phase === 'summary') router.push(hrefOf(x)); }}
                  >
                    <span className="mc-b"><CardBack /></span>
                    <span className="mc-f"><CardFront card={x} /></span>
                    {isNew && !demo ? <span className="mc-tag">New</span> : null}
                  </button>
                );
              })}
            </div>
            {phase === 'summary' ? (
              <div className="totals" id="m-tot">
                {demo ? null : <span className="tot"><b>{newCount}</b>new</span>}
                {!demo ? <span className="tot"><b>{len - newCount}</b>{len - newCount === 1 ? 'copy' : 'copies'}, worth {dupShards} shards</span> : null}
                <span className="tot">Best: <b className={`rt-${RARITIES[best]}`}>{RARITY_LABEL[RARITIES[best]!]}</b></span>
                {goldenPacks > 0 ? <span className="tot gold"><b>{goldenPacks}</b>golden pack{goldenPacks > 1 ? 's' : ''}</span> : null}
                {finLines}
              </div>
            ) : null}
          </>
        ) : null}
        {phase === 'summary' && !multi ? (
          <>
            <h2 className="ov-title" aria-live="polite">{demo ? 'Your demo pack' : title}</h2>
            {finLines.length ? <div className="rlabel fin">{finLines}</div> : null}
            <div className={`fan${spot ? ' spot' : ''}`} id="fan" ref={fanRef} style={{ '--spot': SPOT_GLOW[bestRarity] } as Vars}>
              {rows.map((x, i) => (
                <div
                  key={x.card.n} className={`fc${i < 2 ? ' lft' : ''}${i === bestIdx ? ' best' : ''}`}
                  style={{ transform: `translateX(${(i - 2) * spreadPct}%) translateY(${Math.abs(i - 2) * 16}px) rotate(${(i - 2) * (narrow ? 7 : 9)}deg)`, zIndex: i === 2 ? 5 : 5 - Math.abs(i - 2) }}
                >
                  {demo ? (
                    <div className="fc-b" aria-label={`${x.card.name}, ${RARITY_LABEL[x.card.rarity]}`} role="img">
                      <CardFront card={x.card} />
                    </div>
                  ) : (
                    <>
                      <Link href={hrefOf(x.card)} className="fc-b" aria-label={`${x.card.name}, ${RARITY_LABEL[x.card.rarity]}${x.isNew ? ', new' : ', copy'}${x.pair ? ', completes the pair' : ''}. See the card.`}>
                        <span className={`rtag ${x.isNew ? 'new' : 'dup'}`}>{x.isNew ? 'New' : '+1 copy'}</span>
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
        {phase === 'summary' || multi ? null : slots.map((x, i) => (i < idx ? <div key={x.card.n} className="pop" style={{ position: 'relative' }}><CardFront card={x.card} /></div> : <i key={x.card.n} className="slot" />))}
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
            <button type="button" ref={addRef} className="btn-primary lg" onClick={() => fly('none')} disabled={leaving}>Add to collection</button>
            {stockLeft > 0 ? <button type="button" className="btn-outline again" onClick={() => fly(multi && stockLeft >= 5 ? 'stock5' : 'stock')} disabled={leaving}>{againLabel}</button> : null}
          </>
        ) : null}
      </div>
      <canvas id="fx" ref={canvas} aria-hidden="true" />
    </div>
  );
}
