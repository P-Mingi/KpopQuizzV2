// KpopCards: the pointer tilt of the v6 prototype (tilt(el, max, drag)): one style write per frame, transform and opacity only. The card (or the pack)
// leans toward the pointer (--rx, --ry), the glare and the foil slide (--gx, --gy, --fx, --fy), --go shows the glare. On a touch screen it follows a
// finger only when `drag` is set (the card view). Skipped under reduced motion (the `rm` class of the Cards root, or the media query). Returns the cleanup.
export function reduced(): boolean {
  if (typeof document === 'undefined') return false;
  return !!document.querySelector('.bvc.rm') || (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches);
}

export function tilt(el: HTMLElement | null, max = 14, drag = false): () => void {
  if (!el) return () => undefined;
  const node: HTMLElement = el;
  let raf = 0;
  let lx = 0.5;
  let ly = 0.5;
  const apply = (): void => {
    raf = 0;
    if (reduced()) return;
    node.classList.add('tilting');
    node.style.setProperty('--rx', `${((0.5 - ly) * max).toFixed(2)}deg`);
    node.style.setProperty('--ry', `${((lx - 0.5) * max * 1.2).toFixed(2)}deg`);
    node.style.setProperty('--gx', `${((lx - 0.5) * 50).toFixed(1)}%`);
    node.style.setProperty('--gy', `${((ly - 0.5) * 50).toFixed(1)}%`);
    node.style.setProperty('--fx', `${((0.5 - lx) * 24).toFixed(1)}%`);
    node.style.setProperty('--fy', `${((0.5 - ly) * 24).toFixed(1)}%`);
    node.style.setProperty('--go', '1');
  };
  const reset = (): void => {
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    node.classList.remove('tilting');
    for (const [k, v] of [['--rx', '0deg'], ['--ry', '0deg'], ['--gx', '0%'], ['--gy', '0%'], ['--fx', '0%'], ['--fy', '0%'], ['--go', '0']] as const) node.style.setProperty(k, v);
  };
  const move = (e: PointerEvent): void => {
    if (e.pointerType !== 'mouse' && !drag) return;
    if (e.pointerType !== 'mouse' && !e.buttons && e.pressure === 0) return;
    const r = node.getBoundingClientRect();
    lx = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
    ly = Math.max(0, Math.min(1, (e.clientY - r.top) / r.height));
    if (!raf) raf = requestAnimationFrame(apply);
  };
  const up = (e: PointerEvent): void => { if (e.pointerType !== 'mouse') reset(); };
  node.addEventListener('pointermove', move);
  node.addEventListener('pointerleave', reset);
  node.addEventListener('pointercancel', reset);
  if (drag) node.addEventListener('pointerup', up);
  return () => {
    reset();
    node.removeEventListener('pointermove', move);
    node.removeEventListener('pointerleave', reset);
    node.removeEventListener('pointercancel', reset);
    node.removeEventListener('pointerup', up);
  };
}
