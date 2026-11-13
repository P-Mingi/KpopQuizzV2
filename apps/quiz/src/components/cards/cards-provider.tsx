'use client';

// Bunnyverse Cards, lane U: what the Cards pages share while the player moves between Packs and Binder: the catalog (handed down by the
// server layout), the wallet read from GET /api/cards/state, a one second clock, the cards pulled and not yet looked at (the Binder badge)
// and the small toast. A guest (401) gets status 'guest' and no wallet: no page shows a fake stack.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { isError } from '@/lib/cards/ui-api';
import { createHttpApi } from '@/lib/kpopcards/http-api';
import { legacyApi } from '@/lib/kpopcards/legacy';
import { setKcApi } from '@/lib/kpopcards/registry';

import { syncPrefs } from './opening-prefs-sync';
import { ownedMap } from '@/lib/cards/ui-model';

import { clearPendingDemo, deviceId, pendingDemo } from './demo-store';

import type { CardsApi, RecycleResult } from '@/lib/cards/ui-api';
import type { KpopCardsApi, LobbyState } from '@/lib/kpopcards/contract';
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
  /** The contract's API (the seeded mock in a development fixture, the fetch client otherwise) and the lobby state it last answered (null for a guest or before the first read). */
  kc: KpopCardsApi | null;
  lobby: LobbyState | null;
  fixture: boolean;
  /** Point A18: the server can draw a demo pack for a signed-out visitor (a secret is set); false: the sign-in call to action only. */
  demo: boolean;
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

export function CardsProvider({ catalog, fixture, demo = false, children }: { catalog: SlimCatalog; fixture: boolean; demo?: boolean; children: React.ReactNode }): React.ReactElement {
  const [api, setApi] = useState<CardsApi | null>(null);
  const [kc, setKc] = useState<KpopCardsApi | null>(null);
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
      // NODE_ENV is inlined by the build: in production this branch (and the mock with its fixture) is dead code and leaves the bundle.
      const [mock, fx, ex] = process.env.NODE_ENV !== 'production' && fixture ? await Promise.all([import('@/lib/kpopcards/mock-api'), import('@/lib/cards/ui-fixture'), import('./proto-example')]) : [null, null, null];
      const world = mock && fx ? mock.fixtureWorld(fx.fixtureCatalog()) : null;
      const themes = fx ? fx.fixtureThemes(fx.fixtureCatalog()) : null;
      if (world && themes) for (const [id, t] of themes) world.themeOf.set(id, t);
      const k = mock && world ? mock.createMockApi({ world, example: new URLSearchParams(window.location.search).get('kcstate') !== 'empty', nickname: 'mingi' }) : createHttpApi();
      const example = new URLSearchParams(window.location.search).get('kcstate') !== 'empty';
      if (mock && fx && ex && example && 'data' in k) ex.applyProtoExample((k as { data: Parameters<typeof ex.applyProtoExample>[0] }).data, fx.fixtureCatalog().cards, Date.now());
      if (!alive) return;
      setKcApi(k);
      setKc(k);
      const a = legacyApi(k);
      setApi(a);
      // Development fixture only: ?kcstate=guest shows the signed-out lobby (the QA harness and the prototype's guest view).
      const r = process.env.NODE_ENV !== 'production' && fixture && new URLSearchParams(window.location.search).get('kcstate') === 'guest' ? null : await a.state();
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

  const prefSound = (state as LobbyState | null)?.prefs?.sound;
  const prefVibration = (state as LobbyState | null)?.prefs?.vibration;
  useEffect(() => syncPrefs(kc, prefSound === undefined || prefVibration === undefined ? null : { sound: prefSound, vibration: prefVibration }), [kc, prefSound, prefVibration]);

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

  // Point A18: a demo pack opened before sign in is attached to the account once the visitor is signed in: the token is posted once (it is
  // dropped on any answer except a dropped connection, which keeps it for the next visit).
  const claiming = useRef(false);
  useEffect(() => {
    if (status !== 'ready' || !api || claiming.current) return;
    const token = pendingDemo();
    if (!token) return;
    claiming.current = true;
    void (async () => {
      const r = await api.demoClaim(token, deviceId());
      if (isError(r)) {
        if (r.error !== 'network' && r.error !== 'failed') clearPendingDemo();
        if (r.error === 'limit') toast('Your demo cards could not be added today. Open a real pack instead.');
        claiming.current = false;
        return;
      }
      clearPendingDemo();
      setState(r.state);
      setNewSet((prev) => { const s = new Set(prev); for (const c of r.added) if (c.isNew) s.add(c.n); return s; });
      toast(`Your demo pack is in your binder: ${r.added.length} cards.`);
      claiming.current = false;
    })();
  }, [status, api, toast]);

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
    status, state, now, catalog, byN, owned, api, kc, lobby: (state as LobbyState | null), fixture, demo, lastPack, newSet, clearNew: (n?: number) => setNewSet((prev) => { if (n === undefined) return new Set(); const s = new Set(prev); s.delete(n); return s; }), applyResult, refresh, toggleFav, recycle, toast,
  }), [status, state, now, catalog, byN, owned, api, kc, fixture, demo, lastPack, newSet, applyResult, refresh, toggleFav, recycle, toast]);

  return (
    <Ctx.Provider value={value}>
      {children}
      <div id="toast" className={toastOn ? 'show' : undefined} role="status" aria-live="polite">{toastMsg}</div>
    </Ctx.Provider>
  );
}
