import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { forbiddenIn, mostCommon } from '@/lib/personality/page-copy';
import { getRoster, rosterSlugs, sourcedRole } from '@/lib/personality/rosters';
import { playerTraits } from '@/lib/personality/traits';

import { WmaAbout } from './about';

import type { MostCommon } from '@/lib/personality/page-copy';
import type { QuizView } from '@/lib/personality/view';

// SEO Mission 2, part D: the server sections of a Which member are you page, rendered as
// the crawler gets them. The members section (sourced, with its sources), the forbidden
// words on every page, the 100-result min-gate of "Most common result", More games.

const ASOF = '2026-10-15T09:30:00.000Z';
const QUESTIONS = Array.from({ length: 8 }, (_, i) => ({ text: `Question ${i + 1}`, options: [{ text: 'a', weights: { energy: 5 } }, { text: 'b', weights: { care: 0 } }] }));

function viewFor(slug: string, name: string): QuizView {
  const roster = getRoster(slug)!;
  const profiles = roster.members.filter((m) => m.profile).map((m, i) => ({ id: m.profile!, name: m.name, axes: { energy: (i * 13) % 100, chaos: (i * 29) % 100, care: (i * 41) % 100, craft: (i * 53) % 100, heart: (i * 67) % 100, spotlight: (i * 79) % 100 } }));
  return {
    quiz: 'wma', groupSlug: slug, kicker: 'Which member are you', kickerIcon: 'users',
    title: { before: 'Which ', em: name, after: ' member are you?' }, lead: '', meta: [], cta: 'Start', eyebrow: 'You are', who: 'fans',
    questions: QUESTIONS.map((q) => ({ text: q.text, options: q.options.map((o) => ({ text: o.text, icon: 'star' as const })) })),
    engine: { kind: 'axes', questions: QUESTIONS, profiles },
    results: profiles.map((p) => ({ id: p.id, name: p.name, role: sourcedRole(slug, p.id) ?? `Member of ${name}`, description: 'You do things.', traits: playerTraits(p.axes), photo: null })),
    distribution: null, shareUrl: `https://kpopquiz.org/which-${slug}-member-are-you`, shareKicker: `Which ${name} member are you`, biasOffer: true,
  };
}

function render(slug: string, name: string, opts: { common?: MostCommon | null; songs?: number | null; trivia?: boolean; roster?: boolean } = {}): string {
  return renderToStaticMarkup(h(WmaAbout, {
    group: { slug, name },
    view: viewFor(slug, name),
    wmaSlugs: ['bts', 'stray-kids', slug],
    names: new Map([['bts', 'BTS'], ['stray-kids', 'Stray Kids']]),
    roster: opts.roster === false ? null : getRoster(slug),
    common: opts.common ?? null,
    blindtestSongs: opts.songs ?? null,
    trivia: opts.trivia ?? false,
  }));
}

const text = (html: string): string => html.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&#x27;/g, "'").replace(/\s+/g, ' ');

describe('The <group> members', () => {
  it('lists every sourced member with the public role, and shows the sources next to it', () => {
    const html = render('bts', 'BTS');
    const roster = getRoster('bts')!;
    expect(html).toContain('<h2 id="pers-members-h"');
    expect(text(html)).toContain('The BTS members');
    const members = /data-testid="pers-members"[\s\S]*?<\/section>/.exec(html)![0];
    expect((members.match(/<tr>/g) ?? []).length).toBe(roster.members.length + 1);
    for (const m of roster.members) {
      expect(members).toContain(`<th scope="row">${m.name}</th>`);
      if (m.role) expect(members).toContain(`<td>${m.role}</td>`);
    }
    expect(members).toContain(`href="${roster.wikipediaUrl}"`);
    expect(members).toContain(`href="${roster.wikidataUrl}"`);
    expect(text(members)).toContain('both checked October 15, 2026');
    expect(text(members)).toContain(`BTS has ${roster.members.length} members:`);
  });

  it('a plain list when few members have a role, the roles then said in a sentence; a team column only with teams', () => {
    const nj = render('newjeans', 'NewJeans');
    expect(nj).not.toContain('Public role');
    expect(nj).not.toContain('<table class="ux-pers-table"><caption class="ux-sr">');
    for (const m of getRoster('newjeans')!.members) expect(nj).toContain(`<li>${m.name}</li>`);
    expect(text(nj)).not.toContain('Wikipedia lists');
    const en = render('enhypen', 'ENHYPEN');
    expect(en).not.toContain('Public role');
    expect(text(en)).toContain('Wikipedia lists Jungwon as leader.');
    expect(en).not.toContain('Not listed');
    expect(render('seventeen', 'SEVENTEEN')).toContain('<th scope="col">Team</th>');
    expect(render('bts', 'BTS')).not.toContain('<th scope="col">Team</th>');
  });

  it('hides without a sourced line-up (min-gate), and the page keeps its other sections', () => {
    const html = render('bts', 'BTS', { roster: false });
    expect(html).not.toContain('pers-members');
    expect(html).toContain('data-testid="pers-how"');
    expect(html).toContain('data-testid="pers-more"');
  });
});

describe('every page: no forbidden framing, no dash, no heading above h2', () => {
  for (const slug of rosterSlugs()) {
    it(slug, () => {
      const name = slug.toUpperCase();
      const mc = mostCommon(Object.fromEntries(getRoster(slug)!.members.map((m, i) => [m.name, 40 + i])), getRoster(slug)!.members.map((m) => ({ name: m.name })), ASOF, false);
      const html = render(slug, name, { common: mc, songs: 42, trivia: true });
      expect(forbiddenIn(text(html)), slug).toEqual([]);
      expect(/[\u2013\u2014]/.test(html)).toBe(false);
      expect(html).not.toMatch(/<h1/);
      expect(text(html)).not.toMatch(/\b(main|lead|sub) (vocalist|dancer|rapper)\b/i);
      // the only dates on the page are the day the sources were read and the day the counts were read
      for (const d of text(html).match(/\b(January|February|March|April|May|June|July|August|September|October|November|December) \d{1,2}, \d{4}\b/g) ?? []) expect(d).toBe('October 15, 2026');
    });
  }
});

describe('Most common result: shown only above 100 saved results', () => {
  const skz = getRoster('stray-kids')!.members.map((m) => ({ name: m.name }));
  const spread = (total: number): Record<string, number> => {
    const out: Record<string, number> = {};
    skz.forEach((m, i) => { out[m.name] = 0; if (i === 0) out[m.name] = total; });
    return out;
  };
  it('99 results: no section', () => {
    const html = render('stray-kids', 'Stray Kids', { common: mostCommon(spread(99), skz, ASOF, false) });
    expect(html).not.toContain('Most common result');
  });
  it('100 results: the section with n and the date', () => {
    const html = render('stray-kids', 'Stray Kids', { common: mostCommon(spread(100), skz, ASOF, false) });
    expect(text(html)).toContain('Most common result');
    expect(text(html)).toContain('of the 100 results saved up to October 15, 2026');
  });
});

describe('More <group> games', () => {
  it('always links the hub with the exact anchor, and only real doors besides', () => {
    const bare = render('nmixx', 'NMIXX');
    expect(bare).toContain('href="/nmixx-quiz"');
    expect(bare).toContain('>NMIXX quiz</a>');
    expect(bare).not.toContain('/blindtest/group-nmixx');
    expect(bare).not.toContain('/nmixx-trivia');
    expect(bare).not.toContain('name-all-members');
    const full = render('stray-kids', 'Stray Kids', { songs: 120, trivia: true });
    expect(full).toContain('>Stray Kids blind test</a>');
    expect(text(full)).toContain('120 songs');
    expect(full).toContain('href="/stray-kids-name-all-members"');
    expect(full).toContain('href="/stray-kids-trivia"');
  });
});

describe('How your result is calculated', () => {
  it('names the six scales and maps each result to the answers that lead to it', () => {
    const html = render('aespa', 'aespa');
    const how = /data-testid="pers-how"[\s\S]*?<\/section>/.exec(html)![0];
    for (const s of ['Energy', 'Chaos', 'Care', 'Craft', 'Heart', 'Spotlight']) expect(how).toContain(`<th scope="row">${s}</th>`);
    const map = /data-testid="pers-map"[\s\S]*?<\/table>/.exec(how)![0];
    expect((map.match(/<tr>/g) ?? []).length).toBe(getRoster('aespa')!.members.length + 1);
    expect(text(how)).toContain('Each of the 8 answers');
    expect(text(how)).toContain('not a statement about the real person');
  });
});
