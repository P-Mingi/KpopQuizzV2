// Bunnyverse Cards, lane U: the browser's side of the contract (section 3): GET /api/cards/state and the POSTs. One interface, two
// implementations: the real fetch calls (httpApi) and, on a development server with the fixture switch, an in-browser stand-in
// (ui-mock-api.ts, loaded only then). Every answer is the shape of types.ts.
import { withBasePath } from '@/lib/site/base-path';

import type { AdResult, OpenResult, OpenedCard, PackSource, WalletState } from './types';
import type { GoalsState } from './goals';
import type { AdResult, OpenResult, PackSource, WalletState } from './types';

export type ApiError = { error: string };
export type RecycleResult = { recycled: number; shards: number; state: WalletState };
/** POST /api/cards/goals/claim (lane GOALS): the week's reward and the Goals state after it. */
export type WeekClaim = { packs: number; shards: number; goals: GoalsState };

export interface CardsApi {
  /** null: the visitor is not signed in (401). */
  state(): Promise<WalletState | null | ApiError>;
  open(source: Exclude<PackSource, 'ad'>): Promise<OpenResult | ApiError>;
  adTicket(): Promise<{ ticket: string } | ApiError>;
  adGrant(ticket: string): Promise<AdResult | ApiError>;
  recycle(): Promise<RecycleResult | ApiError>;
  favorite(n: number, on: boolean): Promise<boolean>;
  /** Point A18: the demo pack of a signed-out visitor, drawn and signed by the server. Nothing is saved until demoClaim. */
  demoDraw(): Promise<{ token: string; cards: OpenedCard[] } | ApiError>;
  /** Point A18: after sign in, attaches the demo pack's five cards to the account (once per token). */
  demoClaim(token: string, device: string): Promise<{ added: OpenedCard[]; state: WalletState } | ApiError>;
  /** Lane GOALS: the packs waiting, the week and the sets (GET /api/cards/goals). */
  goals(): Promise<GoalsState | ApiError>;
  claimWeek(): Promise<WeekClaim | ApiError>;
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
  adGrant: (ticket) => call<AdResult>('/api/cards/ad/grant', { ticket }),
  recycle: () => call<RecycleResult>('/api/cards/recycle', {}),
  goals: () => call<GoalsState>('/api/cards/goals'),
  claimWeek: () => call<WeekClaim>('/api/cards/goals/claim', {}),
  async favorite(n, on) {
    const r = await call<{ ok: boolean }>('/api/cards/favorite', { n, on });
    return !('error' in r) && r.ok === true;
  },
  demoDraw: () => call<{ token: string; cards: OpenedCard[] }>('/api/cards/demo', {}),
  demoClaim: (token, device) => call<{ added: OpenedCard[]; state: WalletState }>('/api/cards/demo/claim', { token, device }),
};

export const isError = <T extends object>(r: T | ApiError | null): r is ApiError => r !== null && typeof r === 'object' && 'error' in r;
