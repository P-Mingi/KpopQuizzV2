'use client';

// Bunnyverse Cards, lane B: the ads layer in the browser (hub only; lane U places the components on /cards and /cards/binder). Everything starts from a
// server-made AdsContext (lib/cards/ads-server.ts): a disabled context renders nothing and loads nothing. In the EEA, the UK and Switzerland (and
// when the country is unknown) no ad request goes out before Google's certified CMP reports an answer (TCF v2).
import { useCallback, useEffect, useRef, useState } from 'react';

import { withBasePath } from '@/lib/site/base-path';
import { AD_INTRO_ODDS_PATH, AD_INTRO_TITLE, adPersonalisation, cmpSrc, consentAllows, createRewardController, scriptAttributes } from '@/lib/cards/ads';

import type { AdPersonalisation, AdsContext, RewardState, TcData } from '@/lib/cards/ads';
import type { AdClaimResult } from '@/lib/cards/types';

type W = Window & {
  adsbygoogle?: unknown[] & { requestNonPersonalizedAds?: number };
  adBreak?: (o: unknown) => void;
  adConfig?: (o: unknown) => void;
  __tcfapi?: (cmd: string, v: number, cb: (d: TcData, ok: boolean) => void) => void;
};

function addScript(attrs: Record<string, string>): void {
  if (document.querySelector(`script[src="${attrs.src}"]`)) return;
  const s = document.createElement('script');
  s.async = true;
  for (const [k, v] of Object.entries(attrs)) s.setAttribute(k, v);
  document.head.appendChild(s);
}

/** The one consent tool is Google's CMP (TCF v2), loaded on every visit of an ad-enabled page. `ok`: an ad request may go out (in the consent regions only
 *  once the CMP has an answer). `mode`: personalised only with the consent for purposes 1, 3 and 4 and no known minor, else non personalised. */
export function useAdConsent(ctx: AdsContext): { ok: boolean; mode: AdPersonalisation } {
  const [ok, setOk] = useState(() => ctx.enabled && !ctx.consentRequired);
  const [mode, setMode] = useState<AdPersonalisation>('non_personalised');
  useEffect(() => {
    if (!ctx.enabled) return;
    if (!ctx.consentRequired) setOk(true);
    const src = cmpSrc(ctx);
    if (src) addScript({ src });
    let stop = false;
    const w = window as W;
    const attach = (): boolean => {
      if (typeof w.__tcfapi !== 'function') return false;
      w.__tcfapi('addEventListener', 2, (tc, success) => {
        if (stop || !success) return;
        setOk(consentAllows(ctx, tc));
        setMode(adPersonalisation(tc, { knownMinor: ctx.knownMinor }));
      });
      return true;
    };
    let timer: ReturnType<typeof setInterval> | null = null;
    if (!attach()) timer = setInterval(() => { if (attach() && timer) clearInterval(timer); }, 500);
    return () => { stop = true; if (timer) clearInterval(timer); };
  }, [ctx]);
  return { ok, mode };
}

/** Loads the ad script once consent allows, with the H5 bootstrap (adBreak and adConfig push to adsbygoogle). Returns true when loaded. */
function useAdScript(ctx: AdsContext): boolean {
  const { ok: allowed, mode } = useAdConsent(ctx);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    if (!allowed) return;
    const attrs = scriptAttributes(ctx);
    if (!attrs) return;
    const w = window as W;
    w.adsbygoogle = w.adsbygoogle || [];
    // Non personalised unless Google's consent message said yes (and never for a known minor): set before the script, updated when the answer changes.
    w.adsbygoogle.requestNonPersonalizedAds = mode === 'personalised' ? 0 : 1;
    w.adBreak = w.adConfig = (o: unknown) => { (w.adsbygoogle as unknown[]).push(o); };
    w.adConfig({ preloadAdBreaks: 'on' });
    addScript(attrs);
    setLoaded(true);
  }, [allowed, mode, ctx]);
  return loaded;
}

async function post(path: string, body?: unknown): Promise<Response> {
  return fetch(withBasePath(path), {
    method: 'POST', credentials: 'same-origin', cache: 'no-store',
    ...(body === undefined ? {} : { headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }),
  });
}

/** "Watch an ad, get 1 pack". Hidden with no publisher id, no consent, no ad available, or no ad left today. A press on the button never starts an ad: it opens
 *  the screen that says "Watch an ad, get 1 pack" (with the link to the odds), and only its own Watch button starts one (Google's rewarded rule: the player
 *  chooses). `onGranted` gets the answer of the claim. `onAvailable` says whether the button can play an ad now (the main button of the packs page reads it);
 *  `buttonRef` lets that main button press this one (which opens the same screen). */
export function RewardedAdButton({ ctx, onGranted, className, label = 'Watch an ad, get 1 pack', onAvailable, buttonRef }: {
  ctx: AdsContext; onGranted: (r: AdClaimResult) => void; className?: string; label?: React.ReactNode; onAvailable?: (ok: boolean) => void; buttonRef?: React.Ref<HTMLButtonElement>;
}): React.ReactElement | null {
  const loaded = useAdScript(ctx);
  const [state, setState] = useState<RewardState>('hidden');
  const [intro, setIntro] = useState(false);
  const ctl = useRef<ReturnType<typeof createRewardController> | null>(null);
  const cb = useRef(onGranted);
  cb.current = onGranted;
  const avail = useRef(onAvailable);
  avail.current = onAvailable;
  useEffect(() => { avail.current?.(ctx.enabled && state !== 'hidden'); }, [ctx.enabled, state]);
  useEffect(() => {
    if (!loaded) return;
    const w = window as W;
    ctl.current = createRewardController({
      adBreak: (o) => { (w.adBreak as (x: unknown) => void)(o); },
      ticket: async () => {
        const r = await post('/api/cards/ad/ticket');
        if (!r.ok) return null;
        const j = (await r.json()) as { ticket?: string };
        return typeof j.ticket === 'string' ? j.ticket : null;
      },
      grant: async (ticket) => {
        const r = await post('/api/cards/ad/claim', { ticket });
        if (r.ok) cb.current((await r.json()) as AdClaimResult);
      },
      onState: setState,
    });
    ctl.current.probe();
  }, [loaded]);
  const open = useCallback(() => { setIntro(true); }, []);
  const watch = useCallback(() => { setIntro(false); ctl.current?.agree(); void ctl.current?.click(); }, []);
  if (!ctx.enabled || state === 'hidden') return null;
  return (
    <>
      <button type="button" ref={buttonRef} className={className ?? 'ux-btn ux-btn-ghost'} disabled={state === 'busy'} onClick={open} data-testid="cards-ad-button">
        {label}
      </button>
      {intro ? <AdIntro onWatch={watch} onClose={() => setIntro(false)} /> : null}
    </>
  );
}

/** The screen before each ad. It says what the ad is for, links to the pack's odds, and starts nothing by itself. */
export function AdIntro({ onWatch, onClose }: { onWatch: () => void; onClose: () => void }): React.ReactElement {
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="ad-intro-t" data-testid="cards-ad-intro" className="ad-intro">
      <h2 id="ad-intro-t">{AD_INTRO_TITLE}</h2>
      <p>One short ad plays when you press Watch. The pack is added once it has played.</p>
      <p><a href={withBasePath(AD_INTRO_ODDS_PATH)} data-testid="cards-ad-intro-odds">See the odds of a pack</a></p>
      <div>
        <button type="button" onClick={onWatch} data-testid="cards-ad-intro-watch">Watch the ad</button>
        <button type="button" onClick={onClose} data-testid="cards-ad-intro-close">Not now</button>
      </div>
    </div>
  );
}

/** The one display banner of the binder pages. Never place it next to an Open button. Needs consent, a publisher id and a slot id. */
export function BinderBanner({ ctx }: { ctx: AdsContext }): React.ReactElement | null {
  const loaded = useAdScript(ctx);
  const pushed = useRef(false);
  useEffect(() => {
    if (!loaded || pushed.current) return;
    pushed.current = true;
    try { ((window as W).adsbygoogle as unknown[]).push({}); } catch { /* no banner */ }
  }, [loaded]);
  if (!loaded || !ctx.enabled || !ctx.client || !ctx.bannerSlot) return null;
  return (
    <aside aria-label="Advertisement" data-testid="cards-banner">
      <ins className="adsbygoogle" style={{ display: 'block' }} data-ad-client={ctx.client} data-ad-slot={ctx.bannerSlot} data-ad-format="auto" data-full-width-responsive="true" />
    </aside>
  );
}
