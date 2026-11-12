'use client';

// Bunnyverse Cards, lane U: what the Cards pages share while the player moves between Packs and Binder: the catalog (handed down by the
// server layout), the wallet read from GET /api/cards/state, a one second clock, the cards pulled and not yet looked at (the Binder badge)
// and the small toast. A guest (401) gets status 'guest' and no wallet: no page shows a fake stack.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { isError, httpApi } from '@/lib/cards/ui-api';
import { ownedMap } from '@/lib/cards/ui-model';

import type { CardsApi, RecycleResult } from '@/lib/cards/ui-api';
import type { OpenResult, OpenedCard, OwnedEntry, WalletState } from '@/lib/cards/types';
import type { SlimCard, SlimCatalog } from '@/lib/cards/ui-types';

export type CardsStatus = 'loading' | 'guest' | 'ready' | 'error';

export interface CardsCtx {
  status: CardsStatus;
  state: WalletState | null;
  /** ms since epoch, null until the browser has mounted (so the server and the first client paint agree). */
  now: number | null;
  catalog: SlimCatalog;
  byN: Map<number, SlimCard>;
  owned: Map<number, OwnedEntry>;
  api: CardsApi | null;
  fixture: boolean;
  lastPack: OpenedCard[] | null;
  newSet: ReadonlySet<number>;
  clearNew: (n?: number) => void;
  applyResult: (r: OpenResult) => void;
  refresh: () => Promise<void>;
  toggleFav: (n: number) => Promise<void>;
  recycle: () => Promise<RecycleResult | { error: string }>;
  toast: (msg: string) => void;
}

const Ctx = createContext<CardsCtx | null>(null);

export function useCards(): CardsCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('useCards outside CardsProvider');
  return c;
}

export function CardsProvider({ catalog, fixture, children }: { catalog: SlimCatalog; fixture: boolean; children: React.ReactNode }): React.ReactElement {
  const [api, setApi] = useState<CardsApi | null>(null);
  const [status, setStatus] = useState<CardsStatus>('loading');
  const [state, setState] = useState<WalletState | null>(null);
  const [now, setNow] = useState<number | null>(null);
  const [lastPack, setLastPack] = useState<OpenedCard[] | null>(null);
  const [newSet, setNewSet] = useState<ReadonlySet<number>>(new Set());
  const [toastMsg, setToastMsg] = useState('');
  const [toastOn, setToastOn] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const byN = useMemo(() => new Map(catalog.cards.map((c) => [c.n, c])), [catalog]);
  const owned = useMemo(() => ownedMap(state?.owned ?? []), [state]);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const a = fixture ? (await import('@/lib/cards/ui-mock-api')).createMockApi() : httpApi;
      if (!alive) return;
      setApi(a);
      const r = await a.state();
      if (!alive) return;
      if (r === null) setStatus('guest');
      else if (isError(r)) setStatus('error');
      else { setState(r); setStatus('ready'); }
    })();
    return () => { alive = false; };
  }, [fixture]);

  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const refresh = useCallback(async (): Promise<void> => {
    if (!api) return;
    const r = await api.state();
    if (r && !isError(r)) setState(r);
  }, [api]);

  // The refill and the midnight happen on the server: when the clock passes either, read the wallet again (once per instant).
  const refetchAt = useRef<number | null>(null);
  useEffect(() => {
    if (!state || now === null) return;
    const due = [state.nextAt, state.midnightAt].filter((x): x is string => !!x).map((x) => Date.parse(x)).filter((t) => t <= now);
    if (due.length === 0) { refetchAt.current = null; return; }
    const key = Math.max(...due);
    if (refetchAt.current === key) return;
    refetchAt.current = key;
    void refresh();
  }, [state, now, refresh]);

  const toast = useCallback((msg: string): void => {
    setToastMsg(msg); setToastOn(true);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastOn(false), 3800);
  }, []);

  const applyResult = useCallback((r: OpenResult): void => {
    setState(r.state);
    setLastPack(r.pack.cards);
    setNewSet((prev) => { const s = new Set(prev); for (const c of r.pack.cards) if (c.isNew) s.add(c.n); return s; });
  }, []);

  const toggleFav = useCallback(async (n: number): Promise<void> => {
    if (!api || !state) return;
    const cur = state.owned.find((o) => o.n === n);
    if (!cur) return;
    const on = !cur.fav;
    setState((s) => (s ? { ...s, owned: s.owned.map((o) => (o.n === n ? { ...o, fav: on } : o)) } : s));
    const ok = await api.favorite(n, on);
    if (!ok) {
      setState((s) => (s ? { ...s, owned: s.owned.map((o) => (o.n === n ? { ...o, fav: !on } : o)) } : s));
      toast('Could not save the favorite. Try again.');
    }
  }, [api, state, toast]);

  const recycle = useCallback(async (): Promise<RecycleResult | { error: string }> => {
    if (!api) return { error: 'network' };
    const r = await api.recycle();
    if (!isError(r)) setState(r.state);
    return r;
  }, [api]);

  const value = useMemo<CardsCtx>(() => ({
    status, state, now, catalog, byN, owned, api, fixture, lastPack, newSet, clearNew: (n?: number) => setNewSet((prev) => { if (n === undefined) return new Set(); const s = new Set(prev); s.delete(n); return s; }), applyResult, refresh, toggleFav, recycle, toast,
  }), [status, state, now, catalog, byN, owned, api, fixture, lastPack, newSet, applyResult, refresh, toggleFav, recycle, toast]);

  return (
    <Ctx.Provider value={value}>
      {children}
      <div id="toast" className={toastOn ? 'show' : undefined} role="status" aria-live="polite">{toastMsg}</div>
    </Ctx.Provider>
  );
}
