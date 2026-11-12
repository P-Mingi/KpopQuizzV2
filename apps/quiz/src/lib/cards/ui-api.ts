// Bunnyverse Cards, lane U: the browser's side of the contract (section 3): GET /api/cards/state and the POSTs. One interface, two
// implementations: the real fetch calls (httpApi) and, on a development server with the fixture switch, an in-browser stand-in
// (ui-mock-api.ts, loaded only then). Every answer is the shape of types.ts.
import { withBasePath } from '@/lib/site/base-path';

import type { OpenResult, PackSource, WalletState } from './types';

export type ApiError = { error: string };
export type RecycleResult = { recycled: number; shards: number; state: WalletState };

export interface CardsApi {
  /** null: the visitor is not signed in (401). */
  state(): Promise<WalletState | null | ApiError>;
  open(source: Exclude<PackSource, 'ad'>): Promise<OpenResult | ApiError>;
  adTicket(): Promise<{ ticket: string } | ApiError>;
  adGrant(ticket: string): Promise<OpenResult | ApiError>;
  recycle(): Promise<RecycleResult | ApiError>;
  favorite(n: number, on: boolean): Promise<boolean>;
}

async function call<T>(path: string, body?: unknown): Promise<T | ApiError> {
  try {
    const init: RequestInit = { cache: 'no-store', credentials: 'same-origin' };
    if (body !== undefined) Object.assign(init, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const res = await fetch(withBasePath(path), init);
    if (res.status === 401) return { error: 'signin' };
    const j = (await res.json().catch(() => null)) as (T & { error?: string }) | null;
    if (!res.ok || !j) return { error: j?.error ?? (res.status === 403 ? 'forbidden' : 'failed') };
    return j;
  } catch {
    return { error: 'network' };
  }
}

export const httpApi: CardsApi = {
  async state() {
    const r = await call<WalletState>('/api/cards/state');
    if ('error' in r) return r.error === 'signin' ? null : r;
    return r;
  },
  open: (source) => call<OpenResult>('/api/cards/open', { source }),
  adTicket: () => call<{ ticket: string }>('/api/cards/ad/ticket', {}),
  adGrant: (ticket) => call<OpenResult>('/api/cards/ad/grant', { ticket }),
  recycle: () => call<RecycleResult>('/api/cards/recycle', {}),
  async favorite(n, on) {
    const r = await call<{ ok: boolean }>('/api/cards/favorite', { n, on });
    return !('error' in r) && r.ok === true;
  },
};

export const isError = <T extends object>(r: T | ApiError | null): r is ApiError => r !== null && typeof r === 'object' && 'error' in r;
