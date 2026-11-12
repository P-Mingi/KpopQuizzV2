// Bunnyverse Cards, lane B: the ads context of one request, decided on the server (country from the platform header, flags from the env).
// The pages of lane U call it and pass the result to the ad components as a prop. Off or unconfigured: `enabled: false` and nothing is rendered.
import { headers } from 'next/headers';

import { SITE_ID } from '@/lib/site/registry';

import { adsContext } from './ads';

import type { AdsContext } from './ads';

export async function readAdsContext(): Promise<AdsContext> {
  let country: string | null = null;
  try { country = (await headers()).get('x-vercel-ip-country'); } catch { country = null; }
  return adsContext({
    NET_CARDS_ADS: process.env.NET_CARDS_ADS,
    NEXT_PUBLIC_NET_CARDS_ADS: process.env.NEXT_PUBLIC_NET_CARDS_ADS,
    NEXT_PUBLIC_CARDS_ADSENSE_CLIENT: process.env.NEXT_PUBLIC_CARDS_ADSENSE_CLIENT,
    NEXT_PUBLIC_CARDS_BANNER_SLOT: process.env.NEXT_PUBLIC_CARDS_BANNER_SLOT,
    NEXT_PUBLIC_CARDS_ADS_TEST: process.env.NEXT_PUBLIC_CARDS_ADS_TEST,
  }, country, SITE_ID);
}
