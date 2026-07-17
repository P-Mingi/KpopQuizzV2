import { haptic } from '@/lib/haptics';

// Celebration primitive (Workstream M, M1.13). Fires confetti (DYNAMIC-IMPORTED,
// so the confetti code never enters the main bundle) plus the matching haptic.
// Fully gated by prefers-reduced-motion: a reduced-motion user gets no confetti
// and no vibration. The real <Mascot variant='celebrate'> is rendered by the
// callers' overlays (level-up, result, battle win), not here.
export type CelebrationKind = 'levelUp' | 'mastered' | 'perfect';

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function celebrate(kind: CelebrationKind = 'perfect'): void {
  haptic(kind === 'mastered' ? 'mastered' : kind === 'levelUp' ? 'levelUp' : 'correct');
  if (prefersReducedMotion()) return;
  // Dynamic import keeps the confetti out of the initial bundle.
  void import('@/lib/confetti').then((m) => m.burst(kind === 'perfect' ? 80 : 110)).catch(() => {});
}
