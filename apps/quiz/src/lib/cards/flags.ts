// Bunnyverse Cards: the switches (docs/o1/briefs/CARDS-CONTRACT.md section 4), all off by default, modelled on dleOpen() of
// lib/site/hub/daily-guess.ts: the hub build AND the flag. Off, a Cards URL is a 404 like any unknown one.
// Everything also stays behind PRIVATE_LAUNCH on the hub (the hub's own gate, not read here).
//   NET_CARDS                  server, hub    /cards, /cards/binder, /cards/c/[num], the Cards part of /credits, /api/cards/*
//   NET_CARDS_BRIDGES          server, kpop and hub   the kpopquiz.org home block, the group block, the quiz-end and Kpopdle-win bonus,
//                              the profile link and the passport section
//   NET_CARDS_ADS              server, hub    the rewarded ad (ticket and grant routes)
//   NEXT_PUBLIC_NET_CARDS_ADS  public, hub    the ad button, the binder banner, the consent banner (inlined at build)
//   CARDS_ADS_PER_DAY          server         rewarded ads a Paris day, default 10
//   CARDS_BONUS_PER_DAY        server         bonus packs a Paris day, default 3 until the owner rules (decision 1)
// kpopquiz.org never loads an ad script: every ads helper is false off the hub.

import { flagOn, SITE_ID } from '@/lib/site/registry';

import { ADS_PER_DAY_DEFAULT, BONUS_PER_DAY_DEFAULT } from './rules';

import type { SiteId } from '@/lib/site/types';

interface Env {
  readonly NET_CARDS?: string | undefined;
  readonly NET_CARDS_BRIDGES?: string | undefined;
  readonly NET_CARDS_ADS?: string | undefined;
  readonly NEXT_PUBLIC_NET_CARDS_ADS?: string | undefined;
  readonly CARDS_ADS_PER_DAY?: string | undefined;
  readonly CARDS_BONUS_PER_DAY?: string | undefined;
}

/** The pieces a test replaces. Defaults read the build's site and process.env (written out in full so Next inlines the public flag). */
export interface FlagCtx {
  readonly site?: SiteId;
  readonly env?: Env;
}

function envOf(ctx: FlagCtx | undefined): Env {
  return (
    ctx?.env ?? {
      NET_CARDS: process.env.NET_CARDS,
      NET_CARDS_BRIDGES: process.env.NET_CARDS_BRIDGES,
      NET_CARDS_ADS: process.env.NET_CARDS_ADS,
      NEXT_PUBLIC_NET_CARDS_ADS: process.env.NEXT_PUBLIC_NET_CARDS_ADS,
      CARDS_ADS_PER_DAY: process.env.CARDS_ADS_PER_DAY,
      CARDS_BONUS_PER_DAY: process.env.CARDS_BONUS_PER_DAY,
    }
  );
}

/** The guard of every Cards page and /api/cards/* route: the hub build with NET_CARDS on. */
export function cardsOpen(ctx?: FlagCtx): boolean {
  return (ctx?.site ?? SITE_ID) === 'hub' && flagOn(envOf(ctx).NET_CARDS);
}

/** The bridges to kpopquiz.org and the passport: the kpop or hub build, NET_CARDS and NET_CARDS_BRIDGES both on. */
export function cardsBridgesOn(ctx?: FlagCtx): boolean {
  const site = ctx?.site ?? SITE_ID;
  const env = envOf(ctx);
  return (site === 'kpop' || site === 'hub') && flagOn(env.NET_CARDS) && flagOn(env.NET_CARDS_BRIDGES);
}

/** The rewarded ad, server side: Cards open and NET_CARDS_ADS on, hub only, and at least one ad a day. */
export function cardsAdsOn(ctx?: FlagCtx): boolean {
  return cardsOpen(ctx) && flagOn(envOf(ctx).NET_CARDS_ADS) && adsPerDay(ctx) > 0;
}

/** The public half of the ad switch (the button, the banner, the consent banner). Hub only. */
export function cardsAdsPublicOn(ctx?: FlagCtx): boolean {
  return (ctx?.site ?? SITE_ID) === 'hub' && flagOn(envOf(ctx).NEXT_PUBLIC_NET_CARDS_ADS);
}

/** A whole number from an env string, within [0, max]; the fallback for anything else. */
function intSetting(raw: string | undefined, fallback: number, max: number): number {
  if (raw === undefined || !/^\s*\d{1,4}\s*$/.test(raw)) return fallback;
  return Math.min(max, Number(raw));
}

/** Rewarded ads a Paris day (CARDS_ADS_PER_DAY, default 10, 0 turns them off, at most 100). */
export function adsPerDay(ctx?: FlagCtx): number {
  return intSetting(envOf(ctx).CARDS_ADS_PER_DAY, ADS_PER_DAY_DEFAULT, 100);
}

/** Bonus packs a Paris day (CARDS_BONUS_PER_DAY, default 3, 0 turns them off, at most 20). */
export function bonusPerDay(ctx?: FlagCtx): number {
  return intSetting(envOf(ctx).CARDS_BONUS_PER_DAY, BONUS_PER_DAY_DEFAULT, 20);
}
