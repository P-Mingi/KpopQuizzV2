'use client';

// KpopCards lot 7: the reveal of a panorama, the moment a set is complete. Used after the card that completed it in a pack opening and after a
// craft that completes it. The parts of the photo (the cards the player holds) slide together, join into the one landscape card, then the
// card shows with a sweep of light, a burst, a sting and one plain line. It is a screen of its own over whatever is under it (the opening
// or the page), with the stage, the particles and the sound of the opening (the same fx, the same output, the same `.ov` rules), a tap that
// runs the animation to its end and a second tap that leaves, and reduced motion as the other reveals (a 200 ms fade, no particles, no rings).
// Nothing here decides a result: the server granted the panorama in the same transaction as the card.
import { useEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';

import { RARITY_LABEL } from '@/lib/cards/rules';

import { CardFront, Gem, PanoFront } from './card-art';
import { Fx, onReducedMotionChange, reducedMotion } from './fx';
import { listenForGesture, openingOutput } from './opening-output';
import { PANO_DWELL_MS, StepRunner, finishAnimations, panoPlan } from './reveal-steps';

import '@/styles/cards/cards-opening.css';

import type { SlimCard, SlimPano } from '@/lib/cards/ui-types';

type Vars = React.CSSProperties & Record<`--${string}`, string | number>;

/** The line of the reveal, the same wherever it shows. */
export function panoLine(pano: Pick<SlimPano, 'name'>): string {
  return `Set complete: the panorama of ${pano.name} is yours`;
}

export interface PanoRevealProps {
  pano: SlimPano;
  /** The cards of the photo, part 1 first (the ones that slide together). */
  parts: readonly SlimCard[];
  /** Called when the player leaves the reveal. */
  onDone: () => void;
  /** Where it comes from, for the screen reader only. */
  from?: 'pack' | 'craft';
}

export function PanoReveal({ pano, parts, onDone, from = 'pack' }: PanoRevealProps): React.ReactElement {
  const [joined, setJoined] = useState(false);
  const [label, setLabel] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const fx = useRef<Fx | null>(null);
  const reduced = useRef(reducedMotion());
  const m = useRef({ shownAt: 0, left: false, waiting: false });
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const run = useMemo(() => new StepRunner(), []);
  const btn = useRef<HTMLButtonElement>(null);
  const [, setRm] = useState(0);

  useEffect(() => {
    const el = root.current;
    const ts = timers.current;
    const html = document.documentElement;
    const scope = el?.closest('.bvc') ?? null;
    html.style.overflow = 'hidden';
    html.classList.add('ovopen');
    scope?.classList.add('ovopen');
    if (canvas.current) fx.current = new Fx(canvas.current);
    const stopGesture = listenForGesture();
    el?.classList.toggle('rm', reduced.current);
    const off = onReducedMotionChange((v) => { reduced.current = v; el?.classList.toggle('rm', v); setRm((x) => x + 1); });
    const o = openingOutput();
    const tone = pano.rarity === 'SR' || pano.rarity === 'UR' || pano.rarity === 'L' ? pano.rarity : null;
    if (tone) el?.classList.add(`tone-${tone}`);
    if (!reduced.current) o.cue({ kind: 'flip' });
    const start = (fast: boolean): void => {
      const plan = panoPlan(pano.rarity, { reduced: reduced.current, fast });
      run.start([
        [plan.joinMs, () => {
          setJoined(true);
          const rect = stageRef.current?.getBoundingClientRect();
          const cx = rect ? rect.left + rect.width / 2 : innerWidth / 2;
          const cy = rect ? rect.top + rect.height / 2 : innerHeight / 2;
          const f = fx.current;
          if (f && plan.burst) f.burst(cx, cy, plan.burst);
          if (f && plan.rain && !reduced.current) f.rain(plan.rain.colors, plan.rain.n);
          const card = stageRef.current?.querySelector<HTMLElement>('.pano-card .card');
          if (card && plan.sweep) { card.classList.remove('sweep'); void card.offsetWidth; card.classList.add('sweep'); ts.push(setTimeout(() => card.classList.remove('sweep'), 1000)); }
          if (plan.bang) {
            el?.classList.add('boom');
            el?.classList.remove('bang'); void el?.offsetWidth; el?.classList.add('bang');
            if (plan.boom) o.cue({ kind: 'boom' });
          }
          o.cue({ kind: 'sting', ri: plan.ri });
          o.vibrate(plan.vibrate);
        }],
        [plan.labelAt, () => {
          setLabel(true);
          m.current.shownAt = performance.now();
          ts.push(setTimeout(() => btn.current?.focus(), 30));
        }],
      ]);
    };
    start(false);
    return () => {
      ts.forEach(clearTimeout); run.cancel(); off(); stopGesture(); fx.current?.destroy();
      html.classList.remove('ovopen'); scope?.classList.remove('ovopen'); html.style.overflow = '';
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pano.p]);

  const leave = (): void => {
    if (m.current.left) return;
    m.current.left = true;
    onDone();
  };
  /** A tap during the animation runs it to its end (and does not leave); a tap after the dwell leaves. */
  const tap = (): void => {
    if (m.current.left || m.current.waiting) return;
    if (run.busy) {
      root.current?.classList.add('jump');
      flushSync(() => { for (let k = 0; k < 4 && run.busy; k++) run.finish(); });
      finishAnimations(root.current);
      requestAnimationFrame(() => requestAnimationFrame(() => root.current?.classList.remove('jump')));
      return;
    }
    const wait = Math.max(0, Math.ceil(m.current.shownAt + PANO_DWELL_MS - performance.now()));
    if (wait > 0) {
      m.current.waiting = true;
      timers.current.push(setTimeout(() => { m.current.waiting = false; leave(); }, wait));
    } else leave();
  };

  const par = pano.parts === 3 ? 16.5 / 8.5 : 11 / 8.5;
  return (
    <div
      ref={root} className="ov pano-ov" role="dialog" aria-modal="true" aria-label={`Panorama of ${pano.name}`} data-from={from}
      onClick={tap} onKeyDown={(e) => { if (e.key === 'Escape') { e.preventDefault(); tap(); } }}
    >
      <div className="stagefx" aria-hidden="true"><i className="glow" /><i className="rays" /><i className="ring r1" /><i className="ring r2" /><i className="ring r3" /><i className="flash" /></div>
      <div className="ov-top">
        <span className="ov-step"><span className="ov-path">kpopcards/panorama/{pano.num}</span><span>Panorama</span></span>
        <span />
      </div>
      <div className="ov-mid">
        <div className="ov-hint" aria-live="polite">{label ? <><b>Tap</b> to continue</> : <>Putting the photo together</>}</div>
        <div ref={stageRef} className={`pano-rev${joined ? ' joined' : ''}`} style={{ '--par': par, '--np': pano.parts } as Vars}>
          <div className="pano-parts" aria-hidden="true">
            {parts.map((c, k) => <div key={c.n} className="pp" style={{ '--k': k - (parts.length - 1) / 2 } as Vars}><CardFront card={c} /></div>)}
          </div>
          <div className="pano-card"><PanoFront pano={pano} /></div>
        </div>
        <div className="rlabel" aria-live="polite">
          {label ? (
            <>
              <span className="rtag pop"><Gem r={pano.rarity} className={`gem gc-${pano.rarity}`} />{RARITY_LABEL[pano.rarity]}</span>
              <span className="rtag half pop">{pano.num}</span>
            </>
          ) : null}
        </div>
        <p className="pano-line" aria-live="polite">{label ? <span className="pop">{panoLine(pano)}</span> : null}</p>
      </div>
      <div className="ov-actions">
        <button type="button" ref={btn} className="btn-primary lg" onClick={(e) => { e.stopPropagation(); tap(); }} disabled={!label}>Continue</button>
      </div>
      <canvas id="fx-pano" ref={canvas} className="fxc" aria-hidden="true" />
    </div>
  );
}
