// KpopCards: the data of the Help page (how it works, questions, the rules in numbers). One source for the server route and the mock.
import { adsPerDay } from '../cards/flags';

import { KC } from './contract';
import { dupBiasExempt, dupBiasRule } from './dup-text';

import type { HelpData } from './contract';

export function helpData(): HelpData {
  const ads = adsPerDay();
  return {
    how: [
      { title: 'Open a pack', text: `Every ${KC.PERIOD_MIN} minutes a free pack of 5 cards lands in your stack, which holds ${KC.STACK_CAP}. Tap the pack to rip it open. If you choose, a rewarded ad gives 1 pack, up to ${ads} a day.` },
      { title: 'Choose your pack', text: 'Pick All idols, Girl groups, Boy groups or Soloists. The pack of the day is one group, free once a day.' },
      { title: 'Golden packs and the Gold guarantee', text: `Every ${KC.GOLDEN_EVERY}th pack is golden and its fifth card is Holo or better. A Gold card is sure by the ${KC.GOLD_BY_PACK}th pack.` },
      { title: 'Shards', text: `Extra copies recycle into shards. ${KC.SHARD_PACK} shards open a pack, and a card you miss can be crafted.` },
      { title: 'Collect and compare', text: 'Finish groups and sets for reward packs, climb the level every 10 cards, and compare completion with friends. Nobody can buy a pack for money.' },
    ],
    faq: [
      { q: 'Is it free?', a: 'Yes. Packs come from the timer, the pack of the day, sets and the weekly list. No pack is sold for money.' },
      { q: 'Why does an idol have fewer editions than another?', a: 'Each edition uses its own free photo, taken on a different day. When another free photo is approved, the next edition is issued.' },
      { q: 'How often do I get a card I already own?', a: `${dupBiasRule()} ${dupBiasExempt()}` },
      { q: 'What happens to my extra copies?', a: 'You can recycle them into shards. One copy of every card stays, locked cards are never recycled, and Gold and Full Art extras are never recycled in bulk.' },
      { q: 'What does the lock do?', a: 'A locked card can never be recycled by mistake.' },
      { q: 'Who can see my collection?', a: 'Your nickname, level, completion, three starred cards and badges are public in the ranking. Your wishlist is visible to your friends only. There is no chat.' },
      { q: 'How do I add a friend?', a: 'Make a one-time code in the Ranking tab and send it to your friend. The code works once and expires after 24 hours.' },
      { q: 'What is "Still there?"', a: 'If you have done nothing for two hours, the timer waits until you tap back in. It never takes a pack from you.' },
    ],
    rules: { stackCap: KC.STACK_CAP, periodMinutes: KC.PERIOD_MIN, timerPerDay: KC.TIMER_PER_DAY, goldByPack: KC.GOLD_BY_PACK, goldenEvery: KC.GOLDEN_EVERY, shardPack: KC.SHARD_PACK, adsPerDay: ads },
    reportRoles: [{ id: 'person', label: 'I am in the photo' }, { id: 'photographer', label: 'I took the photo' }, { id: 'agency', label: 'I represent the person or the agency' }, { id: 'other', label: 'Something else' }],
    creditsNote: 'Every card photo is free-licensed and credited on the back of the card and in Credits.',
  };
}
