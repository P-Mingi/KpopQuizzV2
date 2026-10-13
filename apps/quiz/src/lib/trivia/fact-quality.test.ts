import { describe, expect, it } from 'vitest';

import { FACT_MIN_CHARS, isUsableFact } from './fact-quality';

// The trivia fact quality floor (owner, 2026-10-13: SEO). Most examples below are
// real fun_fact strings from published quizzes: the junk ones were on the live
// /<group>-trivia pages, the kept ones must stay there.

describe('isUsableFact: real facts survive', () => {
  it.each([
    'SEVENTEEN has 13 members.',
    'Karina is the leader of aespa',
    'Shuhua (Yeh Shu-hua) is from Tainan, Taiwan.',
    'BTS addressed the 73rd UN General Assembly on September 24, 2018, as part of the UNICEF Generation Unlimited initiative.',
    'Rosé (Park Chaeyoung) was born in New Zealand and grew up in Australia, giving her a distinctive accent in English.',
    'Fun fact: Jungkook was born on September 1, 1997 in Busan.',
  ])('keeps %s', (fact) => {
    expect(isUsableFact(fact)).toBe(true);
  });

  it('the length floor is inclusive at exactly FACT_MIN_CHARS', () => {
    expect('SEVENTEEN has 13 members.'.length).toBe(FACT_MIN_CHARS);
    expect(isUsableFact('SEVENTEEN has 13 members.')).toBe(true);
  });

  it('keeps an English sentence that quotes a Korean, Japanese or Chinese name', () => {
    expect(isUsableFact('Maknae (막내) is the Korean term for the youngest member of a group.')).toBe(true);
    expect(isUsableFact("Tohoshinki (東方神起) is TVXQ's Japanese name, and they became one of the most successful foreign acts in Japan's music history.")).toBe(true);
    expect(isUsableFact(
      'Most notably for example: "어느날 머리에서 뿔이 자랐다" which is just "Crown" in English, or "9와 4분의 3 승강장에서 너를 기다려" being the Korean title for "Run Away".',
    )).toBe(true);
  });

  it('keeps real titles that look like filler: LoL, <3, Answer, La Campanella', () => {
    expect(isUsableFact("THE BADDEST was composed by (G)I-DLE's Soyeon for the 2020 LoL World Championship.")).toBe(true);
    expect(isUsableFact("TWICE released their 3rd studio album 'Formula of Love: O+T=<3' on November 12, 2021.")).toBe(true);
    expect(isUsableFact("Jin's Epiphany is the intro track to Love Yourself: Answer and became a fan favorite.")).toBe(true);
    expect(isUsableFact("Shut Down from Born Pink samples Paganini's La Campanella.")).toBe(true);
    expect(isUsableFact('FEARLESS is by LE SSERAFIM, their debut EP from May 2022.')).toBe(true);
  });

  it('keeps a list-style fact with no English function words', () => {
    expect(isUsableFact('aespa debuted November 17, 2020. ENHYPEN debuted November 30, 2020. IVE December 2021. NewJeans August 2022.')).toBe(true);
    expect(isUsableFact('Baekhyun solo album Delight sold over 1 million copies')).toBe(true);
  });

  it('keeps a fact with a single emoji', () => {
    expect(isUsableFact('Did you know people say Haerin represents a cat? 🐱')).toBe(true);
  });

  it('keeps a lyric comparison that repeats words', () => {
    expect(isUsableFact('Butterfly lyric: "Been been there, never been been there" Air lyric: "Been been there, and I\'ve been been there"')).toBe(true);
  });

  it('keeps a real fact that carries a URL', () => {
    expect(isUsableFact('BTS gave their first UN speech in 2018, see https://www.unicef.org/press-releases for the full text.')).toBe(true);
  });
});

describe('isUsableFact: junk is dropped', () => {
  it('rejects non-strings and blanks', () => {
    expect(isUsableFact(null)).toBe(false);
    expect(isUsableFact(undefined)).toBe(false);
    expect(isUsableFact('')).toBe(false);
    expect(isUsableFact('     \n  ')).toBe(false);
  });

  it.each(['idk', 'lol', 'lmao', 'no fact', 'none', 'n/a', 'test', 'asdf', '...', "I don't know", 'The answer is B', 'Fun fact:'])(
    'rejects the throwaway %s',
    (fact) => {
      expect(isUsableFact(fact)).toBe(false);
    },
  );

  it('rejects short fragments and lines under four words', () => {
    expect(isUsableFact('Renjun is Chinese.')).toBe(false);
    expect(isUsableFact('Psycho is by Red Velvet')).toBe(false);
    expect(isUsableFact('Dahyun-Chaeyoung-Tzuyu-Jihyo-Sana')).toBe(false);
    // Emoji cannot pad a fragment over the length floor.
    expect(isUsableFact('Go Won\'s butterfly 🦋🦋🦋🦋🦋🦋🦋🦋')).toBe(false);
  });

  it('rejects emoji walls and punctuation runs', () => {
    expect(isUsableFact('😭😭😭😭😭😭😭😭😭😭😭😭😭😭😭😭😭😭😭😭😭😭😭😭😭')).toBe(false);
    expect(isUsableFact('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!')).toBe(false);
    expect(isUsableFact('????????????????????????????? ???? ???? ????')).toBe(false);
    expect(isUsableFact('DOEUN❗️❗️❗️❗️❗️❗️❗️❗️❗️ DOE❗️❗️❗️ DOEDOE❗️❗️ GIRAFFE❗️❗️❗️')).toBe(false);
    expect(isUsableFact("The second one gave it away didn't it😭😭")).toBe(false);
  });

  it('rejects stretched letters and one word repeated', () => {
    expect(isUsableFact('its falseeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee')).toBe(false);
    expect(isUsableFact('KIKIKIKIKIKIKKIKIKIKIIKKIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIII')).toBe(false);
    expect(isUsableFact('test test test test test test test')).toBe(false);
  });

  it('rejects chat filler inside a longer line', () => {
    expect(isUsableFact('idk what was going on in this vid 😂')).toBe(false);
    expect(isUsableFact('and lia always loses sadly lol, but she won one recently')).toBe(false);
    expect(isUsableFact('LOL this one was way too easy for any real ARMY')).toBe(false);
    expect(isUsableFact("I wouldn't belive that tbh")).toBe(false);
    expect(isUsableFact('Sneakers ain\'t an albummm! prolly caught you on that one hehe')).toBe(false);
    expect(isUsableFact('No fun fact for this one, sorry everyone!')).toBe(false);
    expect(isUsableFact('CORTIS is my second ult group, right after Stray Kids. :)')).toBe(false);
    expect(isUsableFact('All Gllits hope she feels better soon :(')).toBe(false);
    expect(isUsableFact('Attention is one of my fav NewJeans songs 🎵')).toBe(false);
  });

  it('rejects notes to the player about the quiz', () => {
    expect(isUsableFact('You are right it is yoonchae!')).toBe(false);
    expect(isUsableFact('Flame is not on ep so you are right')).toBe(false);
    expect(isUsableFact('Correct me if this is wrong pls😭')).toBe(false);
    expect(isUsableFact('Congrats, you finished the quiz')).toBe(false);
    expect(isUsableFact('Thanks for playing have a nice day or a nice sleep 💤')).toBe(false);
    expect(isUsableFact('2 more questions and we’re done 😮')).toBe(false);
    expect(isUsableFact('Can you guess who he had the most beef with That the next question')).toBe(false);
    expect(isUsableFact('tough one, but the options make it easier')).toBe(false);
    expect(isUsableFact('Sorry I know it was only ment to be one per member but how could I not 😅')).toBe(false);
  });

  it('rejects lines that only restate the answer', () => {
    expect(isUsableFact('The answer is B because Jisoo is the oldest member')).toBe(false);
    expect(isUsableFact('another valid answer: Chaeryeong')).toBe(false);
    expect(isUsableFact('btw the intruder is the right answer!!!!')).toBe(false);
    expect(isUsableFact('The intruder is ChaeWon from the group tripleS!')).toBe(false);
    expect(isUsableFact('This is from the MV for the song "Heartbeat".')).toBe(false);
  });

  it('rejects a bare URL or a URL with a label', () => {
    expect(isUsableFact('https://www.youtube.com/watch?v=gdZLi9oWNZg')).toBe(false);
    expect(isUsableFact('Source: https://en.wikipedia.org/wiki/BTS_discography')).toBe(false);
  });

  it('rejects lines written in another language', () => {
    expect(isUsableFact('방탄소년단은 2013년 6월 13일에 데뷔한 7인조 보이그룹입니다.')).toBe(false);
    expect(isUsableFact('TWICEは2017年に日本でデビューしたガールズグループです。')).toBe(false);
    expect(isUsableFact('AUUUUU MARTİN BİR MARKADIR')).toBe(false);
    expect(isUsableFact('eslinde jungkookun amma neyse')).toBe(false);
    expect(isUsableFact('şıp şıp şıp (kürek kaslarından bilinir kimdise)')).toBe(false);
    expect(isUsableFact('BTS es el grupo de k-pop que vendió más discos en la historia')).toBe(false);
    expect(isUsableFact('BLACKPINK adalah girl group yang dibentuk oleh YG Entertainment')).toBe(false);
  });
});
