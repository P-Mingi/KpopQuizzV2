'use client';

// Bunnyverse Cards, lane B: the ads layer in the browser (hub only; lane U places the components on /cards and /cards/binder). Everything starts from a
// server-made AdsContext (lib/cards/ads-server.ts): a disabled context renders nothing and loads nothing. In the EEA, the UK and Switzerland (and
// when the country is unknown) no ad request goes out before Google's certified CMP reports an answer (TCF v2).
import { useCallback, useEffect, useRef, useState } from 'react';

import { withBasePath } from '@/lib/site/base-path';
import { cmpSrc, consentAllows, createRewardController, scriptAttributes } from '@/lib/cards/ads';

import type { AdsContext, RewardState, TcData } from '@/lib/cards/ads';
import type { OpenResult } from '@/lib/cards/types';

type W = Window & {
  adsbygoogle?: unknown[];
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

/** True once an ad request may go out. */
export function useAdConsent(ctx: AdsContext): boolean {
  const [ok, setOk] = useState(() => ctx.enabled && !ctx.consentRequired);
  useEffect(() => {
    if (!ctx.enabled) return;
    if (!ctx.consentRequired) { setOk(true); return; }
    const src = cmpSrc(ctx);
    if (src) addScript({ src });
    let stop = false;
    const w = window as W;
    const attach = (): boolean => {
      if (typeof w.__tcfapi !== 'function') return false;
      w.__tcfapi('addEventListener', 2, (tc, success) => { if (!stop && success) setOk(consentAllows(ctx, tc)); });
      return true;
    };
    let timer: ReturnType<typeof setInterval> | null = null;
    if (!attach()) timer = setInterval(() => { if (attach() && timer) clearInterval(timer); }, 500);
    return () => { stop = true; if (timer) clearInterval(timer); };
  }, [ctx]);
  return ok;
}

/** Loads the ad script once consent allows, with the H5 bootstrap (adBreak and adConfig push to adsbygoogle). Returns true when loaded. */
function useAdScript(ctx: AdsContext): boolean {
  const allowed = useAdConsent(ctx);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    if (!allowed) return;
    const attrs = scriptAttributes(ctx);
    if (!attrs) return;
    const w = window as W;
    w.adsbygoogle = w.adsbygoogle || [];
    w.adBreak = w.adConfig = (o: unknown) => { (w.adsbygoogle as unknown[]).push(o); };
    w.adConfig({ preloadAdBreaks: 'on' });
    addScript(attrs);
    setLoaded(true);
  }, [allowed, ctx]);
  return loaded;
}

async function post(path: string, body?: unknown): Promise<Response> {
  return fetch(withBasePath(path), {
    method: 'POST', credentials: 'same-origin', cache: 'no-store',
    ...(body === undefined ? {} : { headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }),
  });
}

/** "Watch an ad, open a pack". Hidden with no publisher id, no consent, no ad available, or no ad left today. `onGranted` gets the pack of the server. */
export function RewardedAdButton({ ctx, onGranted, className }: { ctx: AdsContext; onGranted: (r: OpenResult) => void; className?: string }): React.ReactElement | null {
  const loaded = useAdScript(ctx);
  const [state, setState] = useState<RewardState>('hidden');
  const ctl = useRef<ReturnType<typeof createRewardController> | null>(null);
  const cb = useRef(onGranted);
  cb.current = onGranted;
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
        const r = await post('/api/cards/ad/grant', { ticket });
        if (r.ok) cb.current((await r.json()) as OpenResult);
      },
      onState: setState,
    });
    ctl.current.probe();
  }, [loaded]);
  const click = useCallback(() => { void ctl.current?.click(); }, []);
  if (!ctx.enabled || state === 'hidden') return null;
  return (
    <button type="button" className={className ?? 'ux-btn ux-btn-ghost'} disabled={state === 'busy'} onClick={click} data-testid="cards-ad-button">
      Watch an ad, open a pack
    </button>
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
