/**
 * Haptic feedback for mobile. Noop on devices without navigator.vibrate
 * or when running in SSR.
 */

function canVibrate(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
}

export function hapticLight(): void {
  if (canVibrate()) navigator.vibrate(10);
}

export function hapticMedium(): void {
  if (canVibrate()) navigator.vibrate(30);
}

export function hapticHeavy(): void {
  if (canVibrate()) navigator.vibrate([50, 30, 50]);
}

export function hapticSuccess(): void {
  if (canVibrate()) navigator.vibrate([10, 50, 10]);
}

export function hapticError(): void {
  if (canVibrate()) navigator.vibrate([50, 20, 50, 20, 50]);
}
