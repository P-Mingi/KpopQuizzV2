// KpopCards (agent C): a reward arriving in the wallet, the prototype's gain(): the pill bumps, a "+n" label drops under it, and five small
// icons fly from where the reward came from (a button, a pack) to the pill. Nothing flies under reduced motion (the label and the bump stay).
// transform and opacity only. Browser only.
import { reducedMotion } from './fx';

export const GEM_ICON = '<svg class="gem gc-SR" viewBox="0 0 24 24" aria-hidden="true"><use href="#bvc-g-R"/></svg>';

export function bump(el: Element | null): void {
  if (!el) return;
  el.classList.remove('bump');
  void (el as HTMLElement).offsetWidth;
  el.classList.add('bump');
}

/** pill: the counter in the top bar; n: the amount; from: the element the reward comes from; icon: the markup of the flying icon. */
export function flyReward(pill: HTMLElement | null, n: number, from?: Element | null, icon: string = GEM_ICON): void {
  if (!pill || typeof document === 'undefined') return;
  bump(pill);
  const r = pill.getBoundingClientRect();
  const label = document.createElement('span');
  label.className = 'gainf';
  label.textContent = `+${n}`;
  label.style.left = `${r.left + r.width / 2}px`;
  label.style.top = `${r.bottom + 6}px`;
  document.body.appendChild(label);
  setTimeout(() => label.remove(), 1300);
  if (reducedMotion() || !from) return;
  const fr = from.getBoundingClientRect();
  if (!fr.width) return;
  for (let i = 0; i < 5; i++) {
    const g = document.createElement('span');
    g.className = 'gainp';
    g.innerHTML = icon;
    g.style.left = `${fr.left + fr.width / 2 + (i - 2) * 8}px`;
    g.style.top = `${fr.top + fr.height / 2}px`;
    g.style.transitionDelay = `${i * 60}ms`;
    document.body.appendChild(g);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      g.style.transform = `translate(${r.left + r.width / 2 - fr.left - fr.width / 2 - (i - 2) * 8}px,${r.top + r.height / 2 - fr.top - fr.height / 2}px) scale(.6)`;
      g.style.opacity = '.15';
    }));
    setTimeout(() => g.remove(), 900 + i * 60);
  }
}
