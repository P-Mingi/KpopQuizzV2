// Launch polish (lane ADS): the web path of a rewarded ad that gives +1 pack. AdSense gives NO server callback on the web, so the server cannot see the ad.
// What it does instead, all of it on the server:
//   1. a TICKET is issued before the ad (POST /api/cards/ad/ticket): a random id held in cards_ad_tickets, bound to the player, single use. Nobody can
//      forge one (122 random bits) and a ticket of another player is refused by the owner check below, so there is no key to sign with and none to leak;
//   2. the browser claims (POST /api/cards/ad/claim) only from Google's `adViewed` event; a dismissed ad claims nothing (lib/cards/ads.ts);
//   3. the server accepts the claim ONCE per ticket (the transaction id 'web:<ticket>' of cards_ad_events makes a retry return the first answer), only for the
//      ticket's owner, only at least AD_MIN_SECONDS after the ticket was issued (the ad cannot have played sooner), only while the ticket is under 2 hours old, and
//      only within CARDS_AD_PACKS_PER_DAY packs a Paris day per player. All of that but the delay is cards_ad_pack_grant (121, applied in production).
// Honest limit: the server cannot prove the ad played, only that a ticket was asked for, waited for and not reused. A signed callback (AppLixir, later) is the
// other path: /api/cards/ad/ssv, NET_CARDS_AD_PACKS, off.
import { adMinSeconds, adProviderOf, AD_PROVIDER_PATH } from './ads';
import { adPacksPerDay } from './ad-packs';
import { cardsAdsOn } from './flags';
import { parseAdsenseAccount } from '@/lib/site/adsense';

export const AD_WEB_AD_UNIT = 'adsense-web';

export interface AdClaimEnv {
  NEXT_PUBLIC_CARDS_AD_PROVIDER?: string | undefined;
  NEXT_PUBLIC_ADSENSE_PUB_ID?: string | undefined;
  CARDS_AD_PACKS_PER_DAY?: string | undefined;
  CARDS_AD_MIN_SECONDS?: string | undefined;
}

/** Written out in full so Next inlines the public ones. */
export function adClaimEnv(): AdClaimEnv {
  return {
    NEXT_PUBLIC_CARDS_AD_PROVIDER: process.env.NEXT_PUBLIC_CARDS_AD_PROVIDER,
    NEXT_PUBLIC_ADSENSE_PUB_ID: process.env.NEXT_PUBLIC_ADSENSE_PUB_ID,
    CARDS_AD_PACKS_PER_DAY: process.env.CARDS_AD_PACKS_PER_DAY,
    CARDS_AD_MIN_SECONDS: process.env.CARDS_AD_MIN_SECONDS,
  };
}

/** The ticket and claim routes answer only when: the hub has Cards open and NET_CARDS_ADS on, the provider is AdSense (its path is the claim), a well formed
 *  publisher id is set, and at least one ad pack a day is allowed. Otherwise they answer like an unknown URL. */
export function adClaimOn(env: AdClaimEnv = adClaimEnv()): boolean {
  return cardsAdsOn() && AD_PROVIDER_PATH[adProviderOf(env.NEXT_PUBLIC_CARDS_AD_PROVIDER)] === 'claim'
    && parseAdsenseAccount(env.NEXT_PUBLIC_ADSENSE_PUB_ID) !== null && adPacksPerDay(env) > 0;
}

/** The transaction id of a web claim: one per ticket, so a retried claim cannot give a second pack. */
export const adClaimTx = (ticket: string): string => `web:${ticket.toLowerCase()}`;

export interface TicketRow { user_id: string; issued_at: string; used_at: string | null }

/**
 * Whether a claim may go on to the database. 'ticket': no such ticket or it belongs to someone else. 'too_soon': the ticket is younger than `minSeconds`
 * (nothing is spent: the player may claim again, the ad is still playing or was skipped). 'ok': the database decides the rest (age under 2 hours, single
 * use, the daily cap). A ticket that is already spent goes on too: the database answers a retry with the first answer, or refuses it.
 */
export function claimCheck(row: TicketRow | null, userId: string, nowMs: number, minSeconds: number): 'ok' | 'ticket' | 'too_soon' {
  if (!row || row.user_id.toLowerCase() !== userId.toLowerCase()) return 'ticket';
  if (row.used_at !== null) return 'ok';
  const issued = Date.parse(row.issued_at);
  if (!Number.isFinite(issued)) return 'ticket';
  return nowMs - issued < minSeconds * 1000 ? 'too_soon' : 'ok';
}

export const claimMinSeconds = (env: AdClaimEnv = adClaimEnv()): number => adMinSeconds(env.CARDS_AD_MIN_SECONDS);
