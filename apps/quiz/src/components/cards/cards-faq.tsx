// Bunnyverse Cards, lot 3 point A18 (lot 4 C5): the Help tab of the Cards (/cards/help): three steps, then eleven questions in plain English,
// then the photo credits (the page adds those). A server component: the text is in the HTML the server sends, under real headings (h2
// sections, h3 questions). Every answer states what the code does, with the numbers taken from lib/cards/rules.ts. No FAQPage JSON-LD (the
// pages are closed to search engines while the hub is private, and the markup would promise a rich result they cannot have).
import Link from 'next/link';

import { CAP, CRAFT_COST, PACK_SIZE, PERIOD_S, PITY_UR, RARITY_LABEL, SHARDS, SHARD_PACK_COST, TIMER_PACKS_PER_DAY } from '@/lib/cards/rules';

import { REMOVAL_PROMISE } from './report-form';

/** Shards a rewarded ad gives (lane ECON's ad for shards; the ad layer itself is in components/cards-bridge). */
export const AD_SHARDS = 25;

export interface FaqItem { id: string; q: string; a: React.ReactNode }

export const FAQ: readonly FaqItem[] = [
  { id: 'free', q: 'Is it free?', a: <>Yes. Bunnyverse Cards is free to play, and it stays free.</> },
  {
    id: 'ads', q: 'Are there ads?',
    a: <>The only ads are optional rewarded ads on bunnyverse.org. When one is available you can watch it to get {AD_SHARDS} shards. You never have to: the timer brings a pack every {PERIOD_S / 60} minutes either way.</>,
  },
  { id: 'sold', q: 'Are packs ever sold?', a: <>Never. Packs cannot be bought, and cards cannot be bought, sold or traded. You get packs from the timer, from bonuses and from shards.</> },
  {
    id: 'photos', q: 'Where do the photos come from?',
    a: <>From free licences, such as Wikimedia Commons and other free photo sources. Every card credits its photographer, the licence and the source, on the card page and in the photo credits at the bottom of this page.</>,
  },
  {
    id: 'report', q: 'How do I report a photo?',
    a: <>Use the <Link href="/cards/report">report form</Link>, or the Report a photo link next to any credit. {REMOVAL_PROMISE}</>,
  },
  {
    id: 'account', q: 'Why do I need an account?',
    a: <>To keep what you open. Your account holds your packs, your shards, your binder and the bonus packs you earn from quizzes and Kpopdle. You can try one demo pack without an account; when you sign in, its cards are added to your binder.</>,
  },
  {
    id: 'refill', q: 'How does the stack of packs refill?',
    a: <>A new pack arrives every {PERIOD_S / 60} minutes, and you hold up to {CAP}. The timer gives at most {TIMER_PACKS_PER_DAY} packs a day. At midnight, Paris time, the stack is topped up to {CAP}.</>,
  },
  {
    id: 'shards', q: 'What are shards, and what is crafting?',
    a: <>A card you already have is a copy. Recycle the extra copies and each one gives shards: {SHARDS.C} for a {RARITY_LABEL.C} up to {SHARDS.L} for a {RARITY_LABEL.L}. {SHARD_PACK_COST} shards open a pack, and you can craft a card you are missing for shards, from {CRAFT_COST.C} for a {RARITY_LABEL.C} to {CRAFT_COST.L} for a {RARITY_LABEL.L}.</>,
  },
  {
    id: 'gold', q: 'Is there a Gold guarantee?',
    a: <>Yes. If {PITY_UR - 1} packs in a row hold no {RARITY_LABEL.UR} and no {RARITY_LABEL.L}, the {PITY_UR}th pack holds a {RARITY_LABEL.UR} at the latest. A pack with one of them starts the count again.</>,
  },
  {
    id: 'half', q: 'What is a half card, and what if I miss one?',
    a: <>A group photo gives two half cards, marked 1/2 and 2/2, that sit side by side in the binder and make one picture. If you have one half, the other shows as a missing card with its number, and its card page links to the half you have.</>,
  },
  {
    id: 'home', q: 'Can I add Bunnyverse to my home screen?',
    a: <>Yes. Open bunnyverse.org in your phone&rsquo;s browser, open its share or menu button and choose Add to Home Screen. Bunnyverse then opens like an app.</>,
  },
];

export function CardsFaq(): React.ReactElement {
  return (
    <section className="faq" aria-labelledby="faq-how">
      <h2 className="h2" id="faq-how">How it works</h2>
      <ol className="faq-steps">
        <li><b>Get a pack.</b> You hold up to {CAP} packs. A new one arrives every {PERIOD_S / 60} minutes, and at midnight, Paris time, the stack fills up again.</li>
        <li><b>Open it.</b> Each pack holds {PACK_SIZE} cards. Tap the pack to tear it, then tap each card to turn it over.</li>
        <li><b>Fill your binder.</b> Every new card goes in your binder. Extra copies turn into shards, and {SHARD_PACK_COST} shards open another pack.</li>
      </ol>

      <h2 className="h2" id="faq-q">Questions</h2>
      <div className="faq-list">
        {FAQ.map((f) => (
          <div key={f.id} id={`faq-${f.id}`}>
            <h3>{f.q}</h3>
            <p>{f.a}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
