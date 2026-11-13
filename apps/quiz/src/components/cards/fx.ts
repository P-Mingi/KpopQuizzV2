// Bunnyverse Cards, lane U: the pointer tilt and the particles of the reveal, ported from the prototype (tilt, burst, rain). Browser only.
// Everything here is skipped under prefers-reduced-motion. Lot 3 point B9: the setting is read live (one MediaQueryList, whose
// `matches` follows the system), and onReducedMotionChange tells a screen when it changes.
let mql: MediaQueryList | null | undefined;
function reducedList(): MediaQueryList | null {
  if (mql === undefined) mql = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  return mql;
}
export function reducedMotion(): boolean {
  return !!reducedList()?.matches;
}
/** Calls `cb` with the new value each time the reduced-motion setting changes. Returns the cleanup. */
export function onReducedMotionChange(cb: (reduced: boolean) => void): () => void {
  const m = reducedList();
  if (!m) return () => undefined;
  const on = (e: MediaQueryListEvent): void => cb(e.matches);
  m.addEventListener('change', on);
  return () => m.removeEventListener('change', on);
}

/**
 * A pointer tilt with a moving glare on an element (the card or the pack). Returns the cleanup.
 * Lot 3 point B6: a move only changes custom properties that feed `transform` and `opacity` (the card's tilt, the foil and the glare
 * layers are translated, never repainted), at most once per animation frame (moves are coalesced), and the rectangle is measured once
 * when the pointer enters (and again on a resize), never on a move. `max` is the angle at the edge of the element, in degrees; on a
 * touch screen the finger drives it the same way and the card springs back on release (the CSS transition of the resting state).
 */
export function attachTilt(el: HTMLElement | null, max = 14): () => void {
  if (!el) return () => undefined;
  const node: HTMLElement = el;
  let box: { x: number; y: number; w: number; h: number } | null = null;
  let frame = 0;
  let px = 0;
  let py = 0;
  let on = false;
  const measure = (): void => {
    const r = node.getBoundingClientRect();
    box = { x: r.left + window.scrollX, y: r.top + window.scrollY, w: r.width || 1, h: r.height || 1 };
  };
  const paint = (): void => {
    frame = 0;
    if (!box || reducedMotion()) return;
    const x = Math.min(1, Math.max(0, (px - box.x) / box.w));
    const y = Math.min(1, Math.max(0, (py - box.y) / box.h));
    if (!on) { on = true; node.classList.add('tilting'); }
    node.style.setProperty('--rx', `${((0.5 - y) * 2 * max).toFixed(2)}deg`);
    node.style.setProperty('--ry', `${((x - 0.5) * 2 * max).toFixed(2)}deg`);
    node.style.setProperty('--gx', x.toFixed(3));
    node.style.setProperty('--gy', y.toFixed(3));
    node.style.setProperty('--go', '1');
  };
  const enter = (): void => { measure(); };
  const move = (e: PointerEvent): void => {
    if (reducedMotion()) return;
    if (!box) measure();
    px = e.pageX;
    py = e.pageY;
    if (!frame) frame = requestAnimationFrame(paint);
  };
  const leave = (): void => {
    if (frame) { cancelAnimationFrame(frame); frame = 0; }
    on = false;
    box = null;
    node.classList.remove('tilting');
    node.style.setProperty('--rx', '0deg');
    node.style.setProperty('--ry', '0deg');
    node.style.setProperty('--go', '0');
  };
  const up = (e: PointerEvent): void => { if (e.pointerType !== 'mouse') leave(); };
  const resize = (): void => { box = null; };
  node.addEventListener('pointerenter', enter);
  node.addEventListener('pointerdown', enter);
  node.addEventListener('pointermove', move);
  node.addEventListener('pointerleave', leave);
  node.addEventListener('pointerup', up);
  node.addEventListener('pointercancel', leave);
  window.addEventListener('resize', resize);
  return () => {
    if (frame) cancelAnimationFrame(frame);
    node.removeEventListener('pointerenter', enter);
    node.removeEventListener('pointerdown', enter);
    node.removeEventListener('pointermove', move);
    node.removeEventListener('pointerleave', leave);
    node.removeEventListener('pointerup', up);
    node.removeEventListener('pointercancel', leave);
    window.removeEventListener('resize', resize);
  };
}

interface Particle { x: number; y: number; vx: number; vy: number; g: number; life: number; dec: number; s: number; c: string; sh: string; rot: number; vr: number }
export interface BurstOptions { n?: number; colors?: readonly string[]; speed?: number; up?: number; g?: number; size?: number; shape?: string }

/** The particle layer on one canvas. */
export class Fx {
  private cx: CanvasRenderingContext2D | null;
  private p: Particle[] = [];
  private running = false;
  private dpr = Math.min(2, typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1);
  constructor(private cv: HTMLCanvasElement) {
    this.cx = cv.getContext('2d');
    this.size();
    window.addEventListener('resize', this.size);
  }
  private size = (): void => { this.cv.width = innerWidth * this.dpr; this.cv.height = innerHeight * this.dpr; };
  destroy(): void { window.removeEventListener('resize', this.size); this.p.length = 0; }
  clear(): void { this.p.length = 0; }
  burst(x: number, y: number, o: BurstOptions = {}): void {
    if (reducedMotion()) return;
    const n = o.n ?? 40; const cols = o.colors ?? ['#fff']; const sp = o.speed ?? 7;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2; const v = sp * (0.35 + Math.random() * 0.9);
      this.p.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - (o.up ?? 2), g: o.g ?? 0.18, life: 1, dec: 0.008 + Math.random() * 0.014, s: (o.size ?? 3) * (0.5 + Math.random()), c: cols[i % cols.length]!, sh: o.shape ?? 'spark', rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3 });
    }
    this.start();
  }
  rain(colors: readonly string[], n: number): void {
    if (reducedMotion()) return;
    for (let i = 0; i < n; i++) this.p.push({ x: Math.random() * innerWidth, y: -20 - Math.random() * innerHeight * 0.5, vx: (Math.random() - 0.5) * 1.2, vy: 2 + Math.random() * 3, g: 0.03, life: 1, dec: 0.004 + Math.random() * 0.004, s: 3 + Math.random() * 4, c: colors[i % colors.length]!, sh: 'confetti', rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.25 });
    this.start();
  }
  private start(): void { if (!this.running) { this.running = true; requestAnimationFrame(this.tick); } }
  private tick = (): void => {
    const cx = this.cx; if (!cx) return;
    cx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0); cx.clearRect(0, 0, innerWidth, innerHeight);
    for (let i = this.p.length - 1; i >= 0; i--) {
      const p = this.p[i]!;
      p.vy += p.g; p.vx *= 0.985; p.x += p.vx; p.y += p.vy; p.life -= p.dec; p.rot += p.vr;
      if (p.life <= 0 || p.y > innerHeight + 40) { this.p.splice(i, 1); continue; }
      cx.globalAlpha = Math.max(0, Math.min(1, p.life * 1.4)); cx.fillStyle = p.c;
      if (p.sh === 'confetti') { cx.save(); cx.translate(p.x, p.y); cx.rotate(p.rot); cx.fillRect(-p.s, -p.s * 0.4, p.s * 2, p.s * 0.8); cx.restore(); }
      else { cx.beginPath(); cx.arc(p.x, p.y, p.s * p.life, 0, Math.PI * 2); cx.fill(); }
    }
    cx.globalAlpha = 1;
    if (this.p.length) requestAnimationFrame(this.tick); else { this.running = false; cx.clearRect(0, 0, innerWidth, innerHeight); }
  };
}

/** The particle colours of each rarity (the prototype's RCOL), the one place outside the style sheets that holds raw colours. */
export const RARITY_BURST: Record<'C' | 'U' | 'R' | 'SR' | 'UR' | 'L', readonly string[]> = {
  C: ['#8B93A7'], U: ['#12A877', '#4BE3A3'], R: ['#2F80ED', '#5DB2FF'], SR: ['#9B59D9', '#BE92FF', '#E8457A'],
  UR: ['#D99A00', '#FFC94D', '#FF9E5E'], L: ['#E8457A', '#FFC24B', '#3CCB7F', '#2F9BFF', '#9B59D9'],
};
export const PACK_BURST: readonly string[] = ['#FF8DB8', '#C55BFF', '#4CC9FF', '#FFD27A'];
