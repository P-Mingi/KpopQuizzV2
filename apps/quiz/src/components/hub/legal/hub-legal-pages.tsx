// Launch polish, lane LEGAL: the three legal pages of bunnyverse.org that OtakuQuiz already had, /terms, /contact and /dmca, in the same
// structure as the OtakuQuiz pages (app/sites/[site]/terms|contact|dmca/page.tsx dispatch here when SITE_ID is 'hub'). Names, host and
// mailbox come from the registry, never from this file; the publisher and the postal address are in the legal notice, not repeated here.
// Every sentence says what the code does: the rules of KpopCards are the ones of lib/cards (rules, ad-packs, ads, report, push, social).
import Link from 'next/link';

import { cardsOn } from '@/lib/cards/ui-flag';
import { siteAddress } from '@/lib/site/brand';
import { HUB_EMAIL, MIN_AGE } from '@/lib/site/hub/copy';
import { robotsFor } from '@/lib/site/indexing';
import { SITE, siteConfig } from '@/lib/site/registry';

import type { Metadata } from 'next';

/** The day the three pages were last written (shown on the page). */
export const HUB_LEGAL_UPDATED = 'November 20, 2026';

const H2 = 'text-lg font-medium mt-8 mb-3';
const P = 'text-sm text-secondary leading-relaxed';
const UL = 'list-disc pl-5 space-y-1 text-sm text-secondary leading-relaxed mt-2';
const A = 'text-primary underline hover:no-underline';

function Mail(): React.ReactElement {
  return <a href={`mailto:${HUB_EMAIL}`} className={A}>{HUB_EMAIL}</a>;
}

export const HUB_TERMS_META = {
  title: 'Terms of Service',
  description: 'Bunnyverse terms of service: your account, public profiles, KpopCards packs and shards with no money value, ads, reporting a photo and minors.',
} as const;

export const HUB_CONTACT_META = {
  title: 'Contact',
  description: 'Contact Bunnyverse: write to us about your account, KpopCards, a photo you want removed or a privacy request. We read every message we get.',
} as const;

export const HUB_DMCA_META = {
  title: 'DMCA and Photo Takedown',
  description: 'How to report a copyrighted photo on Bunnyverse or in KpopCards and have it taken down: what to send, what we do, counter-notice and repeat claims.',
} as const;

function metaOf(m: { readonly title: string; readonly description: string }, path: string): Metadata {
  return { title: m.title, description: m.description, robots: robotsFor(true), alternates: { canonical: path } };
}
export const hubTermsMetadata = (): Metadata => metaOf(HUB_TERMS_META, '/terms');
export const hubContactMetadata = (): Metadata => metaOf(HUB_CONTACT_META, '/contact');
export const hubDmcaMetadata = (): Metadata => metaOf(HUB_DMCA_META, '/dmca');

export function HubTerms(): React.ReactElement {
  const name = SITE.brand.name;
  const kpop = siteConfig('kpop').brand.name;
  const anime = siteConfig('anime').brand.name;
  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-medium mb-2">Terms of Service</h1>
      <p className="text-sm text-secondary mb-8">Last updated: {HUB_LEGAL_UPDATED}</p>

      <p className={P}>
        {`Welcome to ${name} (${siteAddress(SITE)}). By using it, you agree to these terms. If you do not agree, please do not use it.`}
      </p>

      <h2 className={H2}>1. What {name} is</h2>
      <p className={P}>
        {`${name} is a free, fan-made home for fan quiz sites and games. It holds one account that you can use on ${kpop} and ${anime}, `}
        the daily games, and KpopCards, a card collection game. We are not affiliated with any artist, entertainment company, record label,
        studio or publisher.
      </p>
      <p className={`${P} mt-3`}>
        {`${kpop} and ${anime} have their own terms. These terms cover ${name}, the shared account (the passport), the daily games and KpopCards.`}
      </p>

      <h2 className={H2}>2. Your account</h2>
      <p className={P}>
        You sign in with Google or Discord. You are responsible for what happens on your account, so keep your sign-in safe. You must be at
        least {MIN_AGE} years old to have an account. If you are under 18, you confirm that a parent or guardian agrees that you use it.
        Please keep one account for yourself. You can leave a site or delete your whole account from your settings, and the privacy policy
        says what is deleted.
      </p>

      <h2 className={H2}>3. Your public profile</h2>
      <p className={P}>
        Your username and your avatar can be seen by other people, and so can anything you choose to show on your profile. Your email
        address is never shown. In KpopCards other players can see your nickname (your username), your completion percentage, the three
        cards you pick for your showcase and your badges. Your wishlist is shown to your friends only. Do not choose a username or an avatar
        that is hateful, sexual, or that pretends to be someone else. We may change or remove one that breaks this rule.
      </p>

      <h2 className={H2}>4. KpopCards</h2>
      <p className={P}>KpopCards is a game of collecting digital cards of K-pop idols and groups. These rules apply to it:</p>
      <ul className={UL}>
        <li>There is nothing to buy. Packs are never sold, and no payment is asked for any pack, shard or card.</li>
        <li>Cards, packs and shards have no money value. They cannot be sold, bought, traded for money or moved out of the game, and there is no market.</li>
        <li>You get packs from the timer, from sets and the weekly list, and from bonuses. Extra copies of a card become shards, and shards
          can craft a card you are missing.</li>
        <li>You can choose to watch a rewarded ad for a pack or for shards. It is never required. There is a daily limit, and the reward is
          given only once the ad has been viewed.</li>
        <li>The server draws every pack. The odds of each pack are published in the game.</li>
        <li>Do not use bots, scripts or several accounts to get more packs, and do not try to get an ad reward without watching the ad. We may
          remove the cards, packs or accounts involved.</li>
        <li>You can add friends with a one-time code. There is no chat. Do not use a code to bother another player.</li>
        <li>Notifications are optional, and you can turn them off at any time.</li>
        <li>We may change the rules, the odds, the limits and the rewards, and we may retire or replace a card, for example when a photo is
          removed or a rule is corrected. Cards are part of the game, not property you can claim.</li>
        <li>A card that is not out yet shows only its name and the words Card coming. We never give a date.</li>
      </ul>

      <h2 className={H2}>5. Photos on the cards</h2>
      <p className={P}>
        We use only photos under a free licence, mostly from Wikimedia Commons. The author and the licence are shown on every card and on
        the credits page. We do not use the picture of a person under 18. If you are the person in a photo, or its photographer, or you act for
        an agency, you can report a card or a photo with the report form of KpopCards, without signing in. We remove a reported photo within 48
        hours and the card leaves the packs. You can also follow the steps of the{' '}
        <Link href="/dmca" className={A}>DMCA page</Link>.
      </p>

      <h2 className={H2}>6. Advertising</h2>
      <p className={P}>
        The game is paid for by a few ads. They are shown by Google AdSense: an optional rewarded ad, and a banner on some pages of KpopCards.
        Where the law asks for it, no ad is requested before you answer Google&apos;s consent message. The{' '}
        <Link href="/privacy" className={A}>privacy policy</Link> explains the cookies, the consent and personalised ads.
      </p>

      <h2 className={H2}>7. Minors</h2>
      <p className={P}>
        {`The sites are not for children under ${MIN_AGE}. If you are under ${MIN_AGE}, please do not create an account, and if you are a parent who finds one, write to us and we delete it. `}
        Players between {MIN_AGE} and 17 need the agreement of a parent or guardian. Nothing in the game can be bought, so no one can spend
        money there. We do not show personalised ads to a player we know to be under 18.
      </p>

      <h2 className={H2}>8. Conduct</h2>
      <p className={P}>You agree not to:</p>
      <ul className={UL}>
        <li>Exploit bugs or weak points of the service, or try to get into the accounts or data of others</li>
        <li>Scrape or bulk-download the content, or load the service with automated requests</li>
        <li>Use the service for commercial purposes without our permission</li>
        <li>Harass other players or send them spam</li>
        <li>Send a false report</li>
      </ul>

      <h2 className={H2}>9. Intellectual property</h2>
      <p className={P}>
        K-pop group names, logos, member names and the names of anime and series belong to their owners. We use them to describe fan-made
        quizzes and games, and we do not claim them. The design of {name}, its text and its code belong to us or to their authors. If you
        think something on {name} infringes your rights, write to us or follow the steps of the DMCA page.
      </p>

      <h2 className={H2}>10. Moderation</h2>
      <p className={P}>
        We may remove content, change a username, take cards or packs back when they came from a bug or a breach of these terms, and suspend
        or ban an account that breaks these terms. If you think we made a mistake, write to us and we look at it.
      </p>

      <h2 className={H2}>11. Availability</h2>
      <p className={P}>
        {`${name} is provided "as is", without a promise that it is always available or free of errors. We may change, pause or stop any part of it. If we stop KpopCards, your cards stop having any use.`}
      </p>

      <h2 className={H2}>12. Limits of our liability</h2>
      <p className={P}>
        {`${name} is a free game. As far as the law allows, we are not liable for damage that comes from using it, such as a wrong answer, a lost progress, an account problem or an interruption. This does not limit the rights that the law gives you as a consumer.`}
      </p>

      <h2 className={H2}>13. Changes to these terms</h2>
      <p className={P}>
        We may update these terms. The date of the last update is at the top of this page. If you keep using {name} after a change, you accept
        the new terms. French law applies to these terms.
      </p>

      <h2 className={H2}>14. Contact</h2>
      <p className={P}>
        For a question about these terms, write to <Mail />. The publisher and the host are named in the{' '}
        <Link href="/legal" className={A}>legal notice</Link>, and you can also use the <Link href="/contact" className={A}>contact page</Link>.
      </p>
    </div>
  );
}

export function HubContact(): React.ReactElement {
  const name = SITE.brand.name;
  const cards = cardsOn();
  return (
    <div className="py-8 max-w-xl">
      <h1 className="text-2xl font-bold text-[var(--text-primary)]">Contact</h1>

      <p className="mt-3 text-sm text-[var(--text-secondary)] leading-relaxed">
        Questions, feedback, a photo you want removed or a request about your data? We would love to hear from you.
        {` ${name} is made by fans, for fans, and we read every message.`}
      </p>

      <div className="mt-6 flex flex-col gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">Email</p>
          <a href={`mailto:${HUB_EMAIL}`} className="text-sm font-medium text-[var(--accent)] hover:underline">{HUB_EMAIL}</a>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">Who runs this</p>
          <Link href="/legal" className="text-sm font-medium text-[var(--accent)] hover:underline">Legal notice: publisher and host</Link>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">Your data</p>
          <Link href="/privacy" className="text-sm font-medium text-[var(--accent)] hover:underline">Privacy policy and your rights</Link>
        </div>

        {cards ? (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">A photo or a card</p>
            <Link href="/kpopcards/report" className="text-sm font-medium text-[var(--accent)] hover:underline">Report a photo</Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function HubDmca(): React.ReactElement {
  const name = SITE.brand.name;
  const cards = cardsOn();
  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-medium mb-2">DMCA &amp; Photo Takedown</h1>
      <p className="text-sm text-secondary mb-8">Last updated: {HUB_LEGAL_UPDATED}</p>

      <p className={P}>
        {`${name} (${siteAddress(SITE)}) shows photos under free licences, mostly from Wikimedia Commons, on its cards and in its daily games. `}
        The author and the licence of each photo are on the credits page. If you own a photo and want it removed, we act on a valid
        request quickly.
      </p>

      <h2 className={H2}>1. How to request a takedown</h2>
      <p className={P}>
        {cards ? (
          <>Use the <Link href="/kpopcards/report" className={A}>report form</Link> of KpopCards, which needs no sign-in, or send us a notice
          through our <Link href="/contact" className={A}>contact page</Link>.</>
        ) : (
          <>Send us a notice through our <Link href="/contact" className={A}>contact page</Link>.</>
        )}{' '}
        Please include:
      </p>
      <ul className={UL}>
        <li>the exact URL of the page, or the number of the card, that shows the photo;</li>
        <li>a description of the work you own and proof that you own it (or that you act for the owner);</li>
        <li>whether you are the person shown, the photographer, an agency or someone else;</li>
        <li>your name and a way to reach you;</li>
        <li>a statement, made in good faith, that the use is not authorized by you, the owner or the law.</li>
      </ul>

      <h2 className={H2}>2. What we do</h2>
      <p className={P}>
        We remove a reported photo within 48 hours. The card that uses it leaves the packs and the photo is shown nowhere. We may also remove
        a photo during our own checks, without a request. The contact detail you give in a report is kept only until the report is closed,
        then erased.
      </p>

      <h2 className={H2}>3. Counter-notice</h2>
      <p className={P}>
        If a photo was removed and you believe that was a mistake, write to us through the contact page with an explanation and we will look
        at it.
      </p>

      <h2 className={H2}>4. Repeat claims</h2>
      <p className={P}>
        A false or abusive report can lead us to ignore the next ones from the same source. Accounts that send them repeatedly may be
        removed from the platform.
      </p>

      <p className={`${P} mt-8`}>
        See also our <Link href="/terms" className={A}>Terms</Link> and <Link href="/privacy" className={A}>Privacy</Link> pages.
      </p>
    </div>
  );
}
