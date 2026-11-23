// KpopCards: the Help tab (/kpopcards/help): the v6 prototype's page: three steps, then eleven questions in plain English (a list of details), then the credits.
// A server component: the text is in the HTML the server sends, under real headings. Every answer states what the code does, with the numbers taken from
// lib/cards/rules.ts. No FAQPage JSON-LD (the pages are closed to search engines while the hub is private).
import Link from 'next/link';

import { adsPerDay } from '@/lib/cards/flags';
import { kcPath } from '@/lib/cards/kc-paths';
import { CRAFT_COST, PERIOD_S, PITY_UR, RARITY_LABEL, SHARDS, SHARD_PACK_COST, TIMER_PACKS_PER_DAY } from '@/lib/cards/rules';
import { KC } from '@/lib/kpopcards/contract';
import { editionCount } from '@/lib/kpopcards/seo';
import { dupBiasExempt, dupBiasRule } from '@/lib/kpopcards/dup-text';

import { REMOVAL_PROMISE } from './report-form';

// The stack of KpopCards holds KC.STACK_CAP packs; CAP of lib/cards/rules.ts is the old Bunnyverse Cards stack of 5.
const CAP = KC.STACK_CAP;

/** The packs a day a rewarded ad can give (CARDS_AD_PACKS_PER_DAY, default 3), read when the page renders. */
function AdsAnswer(): React.ReactElement {
  return <>Only if you choose: a rewarded ad gives 1 pack, up to {adsPerDay()} a day. Packs and cards won this way cannot be traded or given. Ads never show in front of a pack, and kpopquiz.org has none.</>;
}

export interface FaqItem { id: string; q: string; a: React.ReactNode }

const shardLine = (['C', 'U', 'R', 'SR', 'UR', 'L'] as const).map((r) => `${RARITY_LABEL[r]} ${SHARDS[r]}`).join(', ');
const craftLine = (['C', 'U', 'R', 'SR', 'UR'] as const).map((r) => `${RARITY_LABEL[r]} ${CRAFT_COST[r]}`).join(', ');

export const FAQ: readonly FaqItem[] = [
  { id: 'free', q: 'Is it free?', a: <>Yes. Packs are never sold, and cards can&apos;t be sold or turned into money. The game pays for itself with a few ads on bunnyverse.org.</> },
  { id: 'account', q: 'Do I need an account?', a: <>Not to try it: anyone can open one demo pack. To keep cards and get a pack every {PERIOD_S / 60} minutes, sign in with your free Bunnyverse passport, the same one as kpopquiz.org.</> },
  { id: 'crypto', q: 'Is there crypto, NFTs or a marketplace?', a: <>No. Cards have no money value, there is no market and no auction, and no card is ever numbered to look scarce.</> },
  {
    id: 'odds', q: 'How do the odds work?',
    a: <>Each card is drawn on its own with the <Link href={kcPath.odds}>odds</Link> of the lobby, the same for everyone. The fifth card is Stage or better. {dupBiasRule()} {dupBiasExempt()} <b>{RARITY_LABEL.UR} guarantee:</b> if {PITY_UR - 1} packs in a row bring nothing {RARITY_LABEL.UR} or better, the fifth card of pack {PITY_UR} is {RARITY_LABEL.UR}.</>,
  },
  {
    id: 'shards', q: 'What are shards?',
    a: <>Extra copies become shards when you recycle them: {shardLine}. {SHARD_PACK_COST} shards open a pack. You can also craft a card you&apos;re missing: {craftLine}. {RARITY_LABEL.L} only comes from packs.</>,
  },
  {
    id: 'locked', q: 'Why is a card locked?',
    a: <>Each edition uses its own free photo, from a different day. An idol with 3 free photos has 3 editions, from Standard up. An idol joins packs with 2 photos, and a new edition opens as soon as another photo is approved.</>,
  },
  { id: 'half', q: 'What is a half card?', a: <>Group photos are split into two cards, 1/2 and 2/2, so the faces stay big. When you own one half, the same edition gives you the other half.</> },
  {
    id: 'photos', q: 'Where do the photos come from?',
    a: <>Only photos under a free licence, mostly from Wikimedia Commons, with everyone in them 18 or older on the day. The author and licence are on every card and on the credits page. <b>Report a photo</b> and it leaves the game within 48 hours. {REMOVAL_PROMISE}</>,
  },
  { id: 'ads', q: 'Why are there ads?', a: <AdsAnswer /> },
  {
    id: 'notify', q: 'Will it send me notifications?',
    a: <>Only if you turn them on: one when your stack of {CAP} is full, never between 22:00 and 08:00. The timer gives up to {TIMER_PACKS_PER_DAY} packs a day, so leaving a tab open all day brings nothing more.</>,
  },
  { id: 'home', q: 'Can I put it on my home screen?', a: <>Yes. On iPhone, tap Share and then Add to Home Screen. On Android, open the browser menu and tap Install app.</> },
];

const Chev = (): React.ReactElement => <svg className="ico chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>;

export function CardsFaq({ children }: { children?: React.ReactNode }): React.ReactElement {
  return (
    <>
      <div className="steps" aria-labelledby="faq-how">
        <div className="stepc"><span className="n">1</span><b>Open</b><p>A free pack every {PERIOD_S / 60} minutes, up to {CAP} waiting. The stack fills up again at midnight, Paris time.</p></div>
        <div className="stepc"><span className="n">2</span><b>Collect</b><p>Every idol has up to {editionCount()} editions, from {RARITY_LABEL.C} to {RARITY_LABEL.L}, and each edition uses its own photo.</p></div>
        <div className="stepc"><span className="n">3</span><b>Complete</b><p>Sets and the weekly list give packs. Extra copies turn into shards, and shards craft the cards you miss.</p></div>
      </div>
      {children}
      <h2 id="faq-q">Questions</h2>
      <div className="faq" id="faq">
        {FAQ.map((f, i) => (
          <details key={f.id} id={`faq-${f.id}`} {...(i === 0 ? { open: true } : {})}>
            <summary>{f.q}<Chev /></summary>
            <p>{f.a}</p>
          </details>
        ))}
      </div>
    </>
  );
}
