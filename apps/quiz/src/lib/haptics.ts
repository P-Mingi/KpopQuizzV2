// Shared haptics primitive (Workstream M, M1.13). One coherent vibration set,
// feature-detected + mobile-only, gated by prefers-reduced-motion and a user
// toggle. navigator.vibrate is a no-op on devices without a motor (iOS Safari,
// most desktops), so this never throws and never affects non-mobile users.
const HAPTICS_KEY = 'haptics_enabled';

export type HapticPattern = 'correct' | 'wrong' | 'levelUp' | 'streak' | 'mastered' | 'follow';

const PATTERNS: Record<HapticPattern, number | number[]> = {
  correct: 15,
  wrong: [10, 30, 10],
  levelUp: [100, 50, 100],
  streak: [20, 40, 20],
  mastered: [40, 30, 40, 30, 70],
  follow: 12,
};

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// Coarse pointer = touch device. Keeps haptics off desktops even where a stray
// vibrate API exists.
function isTouch(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
}

export function hapticsEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(HAPTICS_KEY) !== 'false'; // default on
}

export function setHapticsEnabled(on: boolean): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(HAPTICS_KEY, on ? 'true' : 'false');
}

export function haptic(pattern: HapticPattern): void {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
  if (!isTouch() || prefersReducedMotion() || !hapticsEnabled()) return;
  try { navigator.vibrate(PATTERNS[pattern]); } catch { /* non-critical */ }
}
