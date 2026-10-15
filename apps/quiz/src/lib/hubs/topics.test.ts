import { describe, expect, it } from 'vitest';

import { contentTopics, dominantTopic, groupByTopic, topicOf, TOPIC_ORDER } from './topics';

// SEO Mission 2: the topic of a quiz from its own words. Real BTS titles from the catalogue.

describe('topicOf', () => {
  it.each([
    ['BTS solo era quiz - match the member to the music', 'solo'],
    ['BTS world records and achievements quiz', 'records'],
    ['BTS concerts and tour moments quiz', 'tours'],
    ['BTS members real names - complete test', 'members'],
    ['Guess the BTS member from clues', 'members'],
    ['BTS discography challenge - name that era', 'songs'],
    ['BTS - Guess the MV from the screenshot', 'songs'],
    ['BTS debut era - how well do you remember?', 'eras'],
    ['BTS ARIRANG comeback quiz - only real ARMYs will pass', 'eras'],
    ['BTS true or false - bet you can\'t get 100%', 'general'],
    ['K-pop BT21 characters quiz', 'general'],
  ])('%s -> %s', (title, topic) => {
    expect(topicOf(title)).toBe(topic);
  });

  it('matches whole words only ("Membership" is not "member", "Tourist" is not "tour")', () => {
    expect(topicOf('ARMY Membership trivia')).toBe('general');
    expect(topicOf('Tourist spots quiz')).toBe('general');
  });
});

describe('dominantTopic', () => {
  it('the topic most prompts are about, from 2 prompts and 30%', () => {
    expect(dominantTopic(['Who is the maknae?', 'Who is the leader?', 'Which agency is ILLIT under?', 'What is their most viewed MV?'])).toBe('members');
  });
  it('null when nothing stands out', () => {
    expect(dominantTopic(['Which agency?', 'Where is Iroha from?', 'Who is not Korean?'])).toBeNull();
    expect(dominantTopic(['Who is the leader?', 'a', 'b', 'c', 'd', 'e', 'f', 'g'])).toBeNull();
    expect(dominantTopic([])).toBeNull();
  });
  it('a tie goes to the earlier rule, whatever the order of the prompts', () => {
    const a = dominantTopic(['Who is the leader?', 'Who is the maknae?', 'Which song came first?', 'Which album sold most?']);
    const b = dominantTopic(['Which album sold most?', 'Which song came first?', 'Who is the maknae?', 'Who is the leader?']);
    expect(a).toBe('members');
    expect(b).toBe('members');
  });
});

describe('contentTopics', () => {
  it('one topic when it stands out, two when the quiz is mixed, none when nothing does', () => {
    expect(contentTopics(['Who is the leader?', 'Who is the maknae?', 'x'])).toEqual(['members']);
    expect(contentTopics(['Who is the leader?', 'Who is the maknae?', 'Which song?', 'Which album?', 'a', 'b', 'c', 'd'])).toEqual(['members', 'songs']);
    expect(contentTopics(['Who is the leader?', 'Which song?', 'a', 'b', 'c'])).toEqual([]);
    expect(contentTopics([])).toEqual([]);
  });
});

describe('groupByTopic', () => {
  it('keeps the topic order and leaves empty topics out', () => {
    const groups = groupByTopic([
      { title: 'BTS Wings era deep dive' },
      { title: 'How well do you know BTS members?' },
      { title: 'BTS: The Ultimate Quiz' },
    ]);
    expect(groups.map((g) => g.topic)).toEqual(['members', 'eras', 'general']);
    const order = groups.map((g) => TOPIC_ORDER.indexOf(g.topic));
    expect([...order].sort((x, y) => x - y)).toEqual(order);
  });
});
