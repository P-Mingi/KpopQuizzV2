// Bunnyverse Cards, lane B: reads of the wallet answer (cards_wallet, lane C) tolerate snake_case and camelCase, and a one-row array.
// Anything that is not a number or a time reads as absent: the bridge then shows nothing.
import { CAP } from '@/lib/cards/rules';

export interface BridgeWallet {
  stock: number;
  cap: number;
  nextAt: string | null;
  midnightAt: string | null;
  bonusLeft: number;
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const int = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.trunc(v)) : null);
const iso = (v: unknown): string | null => {
  if (typeof v === 'number' && Number.isFinite(v)) return new Date(v).toISOString();
  if (typeof v === 'string' && !Number.isNaN(Date.parse(v))) return new Date(v).toISOString();
  return null;
};
const pick = (o: Record<string, unknown>, a: string, b: string): unknown => (o[a] !== undefined ? o[a] : o[b]);

export function parseWallet(raw: unknown): BridgeWallet | null {
  const o = Array.isArray(raw) ? raw[0] : raw;
  if (!isObj(o)) return null;
  const stock = int(o.stock);
  if (stock === null) return null;
  return {
    stock,
    cap: int(o.cap) ?? CAP,
    nextAt: iso(pick(o, 'next_at', 'nextAt')),
    midnightAt: iso(pick(o, 'midnight_at', 'midnightAt')),
    bonusLeft: int(pick(o, 'bonus_left', 'bonusLeft')) ?? 0,
  };
}
