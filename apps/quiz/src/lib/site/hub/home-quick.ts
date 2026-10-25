// Run O1, lot H2a: the data of "60 seconds" (one playable question, one K-pop fact and one anime fact, each with its source). The body
// returns the design's sample; lot H2b picks the question and the facts by the rules of the Plan (section 3 C) and keeps the shape (HomeQuick).

import type { HomeQuick } from './home-types';

export async function loadHomeQuick(): Promise<HomeQuick> {
  return {
    question: {
      site: 'kpop',
      source: 'K-pop Songs About Magic',
      path: '/q/kpop-songs-about-magic',
      text: "ITZY's 2022 single Cheshire borrows the concept of a famous cat from which story?",
      options: ['Puss in Boots', 'The Jungle Book', 'Alice in Wonderland', 'The Wizard of Oz'],
      correct: 2,
      explain: 'ITZY said they borrowed the Cheshire Cat from Alice in Wonderland to express an ambiguous feeling. The single came out with its EP on November 30, 2022.',
      explainShort: 'ITZY borrowed the Cheshire Cat from Alice in Wonderland to express an ambiguous feeling.',
    },
    facts: [
      {
        site: 'kpop',
        text: "ZEROBASEONE's 2023 debut single In Bloom samples the riff of a-ha's 1984 hit Take On Me.",
        source: 'Wikipedia',
        path: '/trivia',
      },
      {
        site: 'anime',
        text: 'In Japan, Frieren is called Sōsō no Furīren, which literally means Frieren at the Funeral.',
        source: 'Wikipedia',
        path: '/trivia',
      },
    ],
  };
}
