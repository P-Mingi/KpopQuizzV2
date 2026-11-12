// Bunnyverse Cards, lane B: the words of the bridges, pure so the tests pin them. No dash, no invented number: every count comes in.
export function packsLine(stock: number, cap: number): string {
  return `${stock} of ${cap} ${cap === 1 ? 'pack' : 'packs'} ready`;
}

/** "9:05" or "1:02:03" from a number of milliseconds; null once the time has passed (the island refetches). */
export function countdownText(ms: number): string | null {
  if (!Number.isFinite(ms) || ms <= 0) return null;
  const s = Math.ceil(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`;
}

export function bonusLine(bonusLeft: number): string | null {
  if (!Number.isFinite(bonusLeft) || bonusLeft < 1) return null;
  return '+1 pack, open it on Bunnyverse';
}

export function groupCardsTitle(name: string): string {
  return `${name} cards`;
}

export function groupCardsCount(owned: number | null, total: number): string {
  return owned === null ? `${total} ${total === 1 ? 'card' : 'cards'}` : `${owned} of ${total} owned`;
}

export function collectionLine(owned: number, total: number): string {
  return `${owned} of ${total} cards`;
}
