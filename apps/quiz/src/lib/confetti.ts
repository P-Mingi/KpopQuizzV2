// Tiny self-contained confetti (Workstream M, M1.13). No dependency (keeps the
// bundle lean per the CWV work); this module is dynamic-imported by lib/celebrate
// so it never loads until a celebration actually fires. Renders on a fixed,
// pointer-events:none canvas overlay, so it cannot shift layout (no CLS).
const COLORS = ['#E8457A', '#7F77DD', '#378ADD', '#EF9F27', '#1D9E75', '#F2A6C0'];

interface Particle { x: number; y: number; vx: number; vy: number; size: number; rot: number; vrot: number; color: string }

export function burst(count = 90): void {
  if (typeof document === 'undefined') return;

  const canvas = document.createElement('canvas');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = window.innerWidth;
  const h = window.innerHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  Object.assign(canvas.style, {
    position: 'fixed', inset: '0', width: '100%', height: '100%',
    pointerEvents: 'none', zIndex: '9999',
  } as CSSStyleDeclaration);
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  if (!ctx) { canvas.remove(); return; }
  ctx.scale(dpr, dpr);

  const cx = w / 2;
  const cy = h * 0.4;
  const particles: Particle[] = Array.from({ length: count }, () => {
    const angle = Math.random() * Math.PI * 2;
    const speed = 4 + Math.random() * 7;
    return {
      x: cx, y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 3,
      size: 5 + Math.random() * 6,
      rot: Math.random() * Math.PI,
      vrot: (Math.random() - 0.5) * 0.3,
      color: COLORS[Math.floor(Math.random() * COLORS.length)]!,
    };
  });

  const start = performance.now();
  const DURATION = 1600;

  function frame(now: number): void {
    const elapsed = now - start;
    ctx!.clearRect(0, 0, w, h);
    for (const p of particles) {
      p.vy += 0.18; // gravity
      p.vx *= 0.99;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vrot;
      ctx!.save();
      ctx!.translate(p.x, p.y);
      ctx!.rotate(p.rot);
      ctx!.globalAlpha = Math.max(0, 1 - elapsed / DURATION);
      ctx!.fillStyle = p.color;
      ctx!.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      ctx!.restore();
    }
    if (elapsed < DURATION) {
      requestAnimationFrame(frame);
    } else {
      canvas.remove();
    }
  }
  requestAnimationFrame(frame);
}
