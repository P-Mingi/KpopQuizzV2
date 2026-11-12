'use client';

// Bunnyverse Cards, lane U: the Packs page (the prototype's Packs view): the pack, the stack of five and its two timers, Open, the last
// pull and the aside (Watch an ad only when lane B's ad layer can play one, Use 50 shards, the binder progress, the drop rates).
// A guest sees the same page with "Sign in to open" and no stack. Nothing is decided here: the wallet and the cards come from /api/cards.
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { analytics } from '@/lib/analytics';
import { CAP, PERIOD_MS, PERIOD_S, SHARD_PACK_COST } from '@/lib/cards/rules';
import { isError } from '@/lib/cards/ui-api';
import { getRewardedAd, onRewardedAdChange } from '@/lib/cards/ui-ads';
import { fmtClock, fmtHours, ownedCount } from '@/lib/cards/ui-model';
import { PACK_LOGO_SRC } from '@/lib/cards/ui-logo';
import { useSignIn } from '@/components/ux-v1/sign-in-sheet';

import { CardFront } from './card-art';
import { useCards } from './cards-provider';
import { FavStar } from './fav-star';
import { attachTilt } from './fx';
import { PackOpening } from './pack-opening';

import type { OpenedCard, OpenResult, PackSource } from '@/lib/cards/types';

interface Opening { cards: OpenedCard[]; source: PackSource }

const ERRORS: Record<string, string> = {
  empty: 'No pack left. The next one comes soon.', shards: `You need ${SHARD_PACK_COST} shards for a pack.`, limit: 'No ads left today.', disabled: 'Ads are not available right now.',
  conflict: 'That ad was already used.', forbidden: 'This account cannot open packs.', network: 'The connection dropped. Try again.', failed: 'Something went wrong. Try again.', bonus: 'No bonus pack to open.',
};

export function PacksView({ rates }: { rates: React.ReactNode }): React.ReactElement {
  const c = useCards();
  const { status, state, now, catalog, owned, lastPack, byN, api, toast } = c;
  const signIn = useSignIn();
  const [opening, setOpening] = useState<Opening | null>(null);
  const [busy, setBusy] = useState(false);
  const [adLayer, setAdLayer] = useState(getRewardedAd());
  const [packEl, setPackEl] = useState<HTMLButtonElement | null>(null);

  useEffect(() => { setAdLayer(getRewardedAd()); return onRewardedAdChange(() => setAdLayer(getRewardedAd())); }, []);
  useEffect(() => attachTilt(packEl, 12), [packEl]);

  const ready = status === 'ready' && state !== null;
  const guest = status === 'guest';
  const total = catalog.cards.length;
  const own = useMemo(() => ownedCount(catalog.cards, owned), [catalog.cards, owned]);
  const stock = state?.stock ?? 0;
  const adOk = ready && !!adLayer && adLayer.available() && state.adsEnabled && state.adsLeft > 0;
  const nextMs = state?.nextAt && now !== null ? Math.max(0, Date.parse(state.nextAt) - now) : 0;
  const midMs = state && now !== null ? Math.max(0, Date.parse(state.midnightAt) - now) : 0;
  const full = ready && stock >= state.cap;

  const begin = useCallback((r: OpenResult, source: PackSource): void => {
    analytics.gameStart({ site: 'hub', game: 'cards', mode: 'classic', kind: 'cards_standard' });
    c.applyResult(r);
    setOpening({ cards: r.pack.cards, source });
  }, [c]);

  const openWith = useCallback(async (source: 'stock' | 'shards' | 'bonus'): Promise<void> => {
    if (busy || !api) return;
    setBusy(true);
    const r = await api.open(source);
    setBusy(false);
    if (isError(r)) {
      if (r.error === 'signin') signIn({ title: 'Sign in to open packs', sub: 'Your collection lives with your account.' });
      else toast(ERRORS[r.error] ?? ERRORS.failed!);
      return;
    }
    begin(r, source);
  }, [api, begin, busy, signIn, toast]);

  const watchAd = useCallback(async (): Promise<void> => {
    if (busy || !api || !adLayer) return;
    setBusy(true);
    const t = await api.adTicket();
    if (isError(t)) { setBusy(false); toast(ERRORS[t.error] ?? ERRORS.failed!); return; }
    const watched = await adLayer.show();
    if (!watched) { setBusy(false); toast('The ad was closed before the end, so no pack this time.'); return; }
    const r = await api.adGrant(t.ticket);
    setBusy(false);
    if (isError(r)) { toast(ERRORS[r.error] ?? ERRORS.failed!); return; }
    begin(r, 'ad');
  }, [adLayer, api, begin, busy, toast]);

  const primary = (): void => {
    if (guest) { signIn({ title: 'Sign in to open packs', sub: 'Your collection lives with your account.' }); return; }
    if (!ready) return;
    if (stock > 0) void openWith('stock');
    else if (adOk) void watchAd();
    else toast(`No pack left. The next one comes in ${fmtClock(nextMs)}.`);
  };

  const closeOpening = (then: 'none' | 'stock' | 'ad'): void => {
    setOpening(null);
    if (then === 'stock') setTimeout(() => void openWith('stock'), 80);
    if (then === 'ad') setTimeout(() => void watchAd(), 80);
  };

  const last = useMemo(() => {
    if (lastPack) return lastPack.map((p) => ({ card: byN.get(p.n), isNew: p.isNew })).filter((x) => x.card);
    return [...owned.values()].sort((a, b) => Date.parse(b.at) - Date.parse(a.at)).slice(0, 5).map((o) => ({ card: byN.get(o.n), isNew: false })).filter((x) => x.card);
  }, [lastPack, owned, byN]);

  const openLabel = guest ? 'Sign in to open' : !ready ? 'Open a pack' : stock > 0 ? 'Open a pack' : adOk ? 'Open now with an ad' : `Next pack in ${fmtClock(nextMs)}`;
  const openDisabled = busy || (!guest && (!ready || (stock <= 0 && !adOk)));
  const sub = guest ? 'Packs belong to your account.' : !ready ? '' : stock > 0 ? 'You can also tap the pack.' : adOk ? `Or wait ${fmtClock(nextMs)} for a free pack.` : 'No ads left today. The refill keeps going.';
  const shards = state?.shards ?? 0;

  return (
    <div className="wrap page">
      <div className="cols">
        <div>
          <h1 className="h1" id="t-packs">Packs</h1>
          <p className="lede">You hold up to {CAP} packs. One more comes every {PERIOD_S / 60} minutes, and the stack is full again at midnight, Paris time.</p>

          <div className="box bay" aria-busy={status === 'loading'}>
            <div className="bay-pack">
              <button
                type="button" ref={setPackEl} className={`pack${ready && stock > 0 ? ' float' : ''}`} aria-label={guest ? 'Sign in to open a pack' : 'Open a pack'}
                aria-disabled={guest || (ready && stock > 0) ? 'false' : 'true'} onClick={primary}
              >
                <span className="pk"><span className="pk-face" /><span className="pk-crimp t" /><span className="pk-crimp b" /></span>
                <span className="pk-body"><span className="pk-logo">{/* eslint-disable-next-line @next/next/no-img-element */}<img src={PACK_LOGO_SRC} alt="" /></span><span className="pk-title">CARDS</span></span>
                <span className="pk-count">5 CARDS</span>
              </button>
            </div>
            <div className="bay-status">
              {guest ? (
                <div>
                  <p className="stack-label"><b>Sign in</b> to keep a stack of packs.</p>
                  <p className="hint" style={{ marginTop: 6 }}>Your account holds your packs, your shards and your binder. Playing is free and packs are never sold.</p>
                </div>
              ) : (
                <>
                  <div>
                    <div className="stack" aria-hidden="true">
                      {Array.from({ length: CAP }, (_, i) => <i key={i} className={ready && i < stock ? 'on' : undefined} />)}
                    </div>
                    <p className="stack-label" style={{ marginTop: 10 }} aria-live="polite">{ready ? <><b className="num">{stock}</b> of {CAP} packs ready</> : 'Loading your packs'}</p>
                  </div>
                  <div className="timers">
                    <div className="trow">
                      <div className="ring">
                        <svg viewBox="0 0 48 48" aria-hidden="true">
                          <circle className="bg" cx="24" cy="24" r="20" />
                          <circle className="fg" cx="24" cy="24" r="20" strokeDasharray="125.66" strokeDashoffset={ready && !full ? (125.66 * (nextMs / PERIOD_MS)).toFixed(2) : 0} />
                        </svg>
                        <span className="ic"><svg className="ico" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="13" r="8" /><path d="M12 9v4l2.5 2M9 2h6" /></svg></span>
                      </div>
                      <div>
                        <b className="num">{!ready ? '' : full ? 'Stack full' : fmtClock(nextMs)}</b>
                        <span>{full ? `Open one and the next arrives ${PERIOD_S / 60} minutes later` : 'until the next pack'}</span>
                      </div>
                    </div>
                    <div className="trow">
                      <span className="moon"><svg className="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" /></svg></span>
                      <div><b className="num">{ready ? fmtHours(midMs) : ''}</b><span>until midnight in Paris: the stack fills up to {CAP}</span></div>
                    </div>
                  </div>
                </>
              )}
              <div className="actions">
                <button type="button" className="btn-primary lg" onClick={primary} disabled={openDisabled}>{openLabel}</button>
              </div>
              <p className="hint">{sub}</p>
            </div>
          </div>

          <div className="sec-head"><h2 className="h2">Last pull</h2><span>{last.length ? 'Tap a card to see it in full' : ''}</span></div>
          {last.length ? (
            <div className="strip">
              {last.map((x, i) => (
                <div className="pw" key={`${x.card!.n}-${i}`}>
                  <Link className="pocket" href={`/cards/c/${x.card!.num}`} aria-label={`${x.card!.name}, ${x.card!.num}`}>
                    {x.isNew ? <span className="newb">New</span> : null}
                    <CardFront card={x.card!} />
                  </Link>
                  <FavStar n={x.card!.n} name={x.card!.name} edition={x.card!.edition} />
                </div>
              ))}
            </div>
          ) : (
            <p className="emptyline">Your last 5 cards will show here.</p>
          )}
        </div>

        <aside className="aside" aria-label="More ways to open">
          {ready ? (
            <div className="box">
              <h2 className="h2">Can&rsquo;t wait?</h2>
              <ul className="lines">
                {adOk ? (
                  <li className="line">
                    <svg className="ico" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="3" /><path d="M10 9.5v5l4.5-2.5z" /></svg>
                    <div className="ltxt"><b>Watch an ad</b><span>Opens a pack right away &middot; {state.adsLeft} left today</span></div>
                    <button type="button" className="btn-outline sm" onClick={() => void watchAd()} disabled={busy}>Watch</button>
                  </li>
                ) : null}
                {state.bonusLeft > 0 ? (
                  <li className="line">
                    <svg className="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l2.4 5 5.6.8-4 3.9 1 5.5-5-2.7-5 2.7 1-5.5-4-3.9 5.6-.8z" /></svg>
                    <div className="ltxt"><b>Bonus pack</b><span>{state.bonusLeft} earned today from quizzes and Kpopdle</span></div>
                    <button type="button" className="btn-outline sm" onClick={() => void openWith('bonus')} disabled={busy}>Open</button>
                  </li>
                ) : null}
                <li className="line">
                  <svg className="gem gc-SR" viewBox="0 0 24 24" aria-hidden="true" style={{ width: 20, height: 20 }}><use href="#bvc-g-R" /></svg>
                  <div className="ltxt">
                    <b>Use {SHARD_PACK_COST} shards</b>
                    <span>{Math.min(shards, SHARD_PACK_COST)} of {SHARD_PACK_COST} shards{shards > SHARD_PACK_COST ? ` (${shards} in total)` : ''}</span>
                    <span className="bar"><i style={{ width: `${Math.min(100, (shards / SHARD_PACK_COST) * 100)}%` }} /></span>
                  </div>
                  <button type="button" className="btn-outline sm" onClick={() => void openWith('shards')} disabled={busy || shards < SHARD_PACK_COST}>Open</button>
                </li>
              </ul>
            </div>
          ) : null}
          <div className="box">{rates}</div>
          <div className="box">
            <h2 className="h2">Your binder</h2>
            <p className="lede" style={{ marginTop: 6, fontSize: 15 }}><b className="num" style={{ color: 'var(--txt1)' }}>{ready ? own : 0}</b> of <span className="num">{total}</span> cards</p>
            <span className="bar" style={{ height: 8 }}><i style={{ width: `${ready && total ? ((own / total) * 100).toFixed(1) : 0}%` }} /></span>
            <p style={{ marginTop: 12 }}><Link href="/cards/binder" className="btn-quiet" style={{ width: '100%' }}>Open the binder</Link></p>
          </div>
        </aside>
      </div>

      {opening ? <PackOpening cards={opening.cards} source={opening.source} onClose={closeOpening} adAvailable={adOk} /> : null}
    </div>
  );
}
