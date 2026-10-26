// Run O1 (PERS-2): Which character are you lights the topic item of the top bar (Series on anime) and Quizzes in the tab bar, like Which
// member are you on kpop. kpop keeps today's answers: the word is the site's vocabulary.member.
import { describe, expect, it } from 'vitest';

import { siteConfig } from '@/lib/site/registry';

import { activeNav, activeTab } from './nav';

const KPOP = siteConfig('kpop').vocabulary.member;
const ANIME = siteConfig('anime').vocabulary.member;

describe('Which character are you, anime', () => {
  it.each(['/which-death-note-character-are-you', '/which-attack-on-titan-character-are-you', '/which-death-note-character-are-you/', '/which-death-note-character-are-you?x=1'])(
    '%s lights Series (the groups item) and Quizzes in the tab bar', (p) => {
      expect(activeNav(p, true, ANIME)).toBe('groups');
      expect(activeTab(p, true, ANIME)).toBe('quizzes');
    },
  );

  it('the member page is not a page of the anime site: nothing lit', () => {
    expect(activeNav('/which-death-note-member-are-you', true, ANIME)).toBeNull();
  });

  it('near misses stay unlit', () => {
    for (const p of ['/which-character-are-you', '/x/which-death-note-character-are-you', '/which-death-note-character-are-you/extra']) {
      expect(activeNav(p, true, ANIME), p).toBeNull();
      expect(activeTab(p, true, ANIME), p).toBeNull();
    }
  });

  it('the flag off answers as before: nothing lit', () => {
    expect(activeNav('/which-death-note-character-are-you', false, ANIME)).toBeNull();
  });
});

describe('Which member are you, kpop is unchanged', () => {
  it('lights Groups, and the character page lights nothing on kpop', () => {
    expect(activeNav('/which-bts-member-are-you', true, KPOP)).toBe('groups');
    expect(activeTab('/which-bts-member-are-you', true, KPOP)).toBe('quizzes');
    expect(activeNav('/which-bts-character-are-you', true, KPOP)).toBeNull();
    expect(activeTab('/which-bts-character-are-you', true, KPOP)).toBeNull();
  });

  it('the default word is the site of the build (kpop in the test run)', () => {
    expect(KPOP).toBe('member');
    expect(activeNav('/which-bts-member-are-you', true)).toBe('groups');
  });
});
