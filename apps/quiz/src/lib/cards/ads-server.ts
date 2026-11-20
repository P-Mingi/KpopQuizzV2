// Bunnyverse Cards, lane B: the ads context of one request, decided on the server (country from the platform header, flags from the env).
// The pages of lane U call it and pass the result to the ad components as a prop. Off or unconfigured: `enabled: false` and nothing is rendered.
import { headers } from 'next/headers';

import { SITE_ID } from '@/lib/site/registry';

import { adsContext } from './ads';

import type { AdsContext } from './ads';

/**
 * Does the site KNOW this player is under 18? Today it holds no age of any player: no birth date, no age question at sign-up (the terms ask for 15 or
 * older and a parent's yes under 18, as a promise, not a field), no age range in the profile or the passport. So nobody is a known minor and this answers
 * false. When an age exists one day, read it here and return isKnownMinor(age): the tag and the non personalised mode already follow from it.
 */
async function playerKnownMinor(): Promise<boolean> {
  return false;
}

export async function readAdsContext(): Promise<AdsContext> {
  let country: string | null = null;
  try { country = (await headers()).get('x-vercel-ip-country'); } catch { country = null; }
  return adsContext({
    NET_CARDS_ADS: process.env.NET_CARDS_ADS,
    NEXT_PUBLIC_NET_CARDS_ADS: process.env.NEXT_PUBLIC_NET_CARDS_ADS,
    NEXT_PUBLIC_ADSENSE_PUB_ID: process.env.NEXT_PUBLIC_ADSENSE_PUB_ID,
    NEXT_PUBLIC_CARDS_BANNER_SLOT: process.env.NEXT_PUBLIC_CARDS_BANNER_SLOT,
    NEXT_PUBLIC_CARDS_ADS_TEST: process.env.NEXT_PUBLIC_CARDS_ADS_TEST,
  }, country, SITE_ID, { knownMinor: await playerKnownMinor() });
}
