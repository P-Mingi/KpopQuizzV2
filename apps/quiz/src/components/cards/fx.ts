// Bunnyverse Cards, lane U: the pointer tilt and the particles of the reveal, ported from the prototype (tilt, burst, rain). Browser only.
// Everything here is skipped under prefers-reduced-motion.
export function reducedMotion(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** A pointer tilt with a moving glare on an element (the card or the pack). Returns the cleanup. */
export function attachTilt(el: HTMLElement | null, max = 14): () => void {
  if (!el || reducedMotion()) return () => undefined;
  const move = (e: PointerEvent): void => {
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    el.classList.add('tilting');
    el.style.setProperty('--rx', `${((0.5 - y) * max).toFixed(2)}deg`);
    el.style.setProperty('--ry', `${((x - 0.5) * max * 1.2).toFixed(2)}deg`);
    el.style.setProperty('--mx', `${(x * 100).toFixed(1)}%`);
    el.style.setProperty('--my', `${(y * 100).toFixed(1)}%`);
    el.style.setProperty('--go', '1');
  };
  const leave = (): void => {
    el.classList.remove('tilting');
    el.style.setProperty('--rx', '0deg');
    el.style.setProperty('--ry', '0deg');
    el.style.setProperty('--go', '0');
  };
  el.addEventListener('pointermove', move);
  el.addEventListener('pointerleave', leave);
  return () => { el.removeEventListener('pointermove', move); el.removeEventListener('pointerleave', leave); };
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
