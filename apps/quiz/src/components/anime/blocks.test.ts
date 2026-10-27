import { createElement as h } from 'react';
import { renderToStaticMarkup, renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { GroupAvatar } from '@/components/group/ux-v1/group-avatar';
import { HubQuizzes } from '@/components/group/ux-v1/hub-quizzes';
import { MemberTiles } from '@/components/group/ux-v1/member-tiles';
import { SpoilerGate } from '@/components/spoilers/spoiler-gate';
import { SpoilerShield } from '@/components/spoilers/spoiler-shield';
import { TextCard } from '@/components/ux-v1/text-card';
import {
  groupQuizzesByArc, openingRows, quizLevels, shieldArcs, splitCharacters, storyMap, uniqueFacts,
} from '@/lib/anime/series-model';
import { FIXTURE_SLUGS, hubFromFixture, readFixture } from '@/lib/anime/test-support';

import { CharacterTiles } from './character-tiles';
import { OpeningsTable } from './openings-table';
import { SeriesFactList } from './series-fact-list';
import { SeriesFacts } from './series-facts';
import { StoryMap } from './story-map';
import { TitleCard } from './title-card';

import type { SeriesHub } from '@/lib/anime/series';

// The title-card tests below name series that now have a free photo (docs/anime/images): they run on an empty photo map, so the card
// is what they draw. The photo path is held by lib/anime/series-images-real.test.ts on the real map.
vi.mock('@/lib/anime/series-images.generated', () => ({ SERIES_IMAGES: {}, SERIES_IMAGE_CREDITS: {} }));


vi.mock('next/image', () => ({ default: (p: Record<string, unknown>) => h('img', { src: p.src as string, alt: p.alt as string, className: p.className as string }) }));

const html = (el: React.ReactElement): string => renderToStaticMarkup(el);
/** The text of a markup as written in the data: the entities React escapes are put back. */
const plain = (out: string): string => out.replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&');

/** Every question text of a fixture quiz that carries a tag above arc 0. */
function taggedTexts(slug: string): string[] {
  return readFixture(slug).quizzes.flatMap((q) => q.questions.filter((x) => (x.spoiler?.arc ?? 0) > 0).map((x) => x.question ?? '')).filter(Boolean);
}
function lockedNames(hub: SeriesHub): string[] {
  return hub.characters.filter((c) => c.spoiler_level > 0).map((c) => c.name);
}
function with15Playable(hub: SeriesHub): SeriesHub {
  return { ...hub, themes: Array.from({ length: 16 }, (_, i) => ({ ...hub.themes[i % hub.themes.length]!, id: 900 + i, number: i + 1, kind: 'op' as const, deezer_playable: true })) };
}
/** Words that must never reach an anime page (rule 10 and N). */
const BANNED = /k-?pop|kpopquiz|[\u2013\u2014]|\p{Extended_Pictographic}/iu;

describe('shared components keep the kpop markup byte for byte when no prop is given', () => {
  it('MemberTiles prints the tiles of the group hub as before', () => {
    const out = renderToString(h(MemberTiles, { label: 'BTS members', groupName: 'BTS', tiles: [{ name: 'Jin', photoUrl: null }, { name: 'V', photoUrl: 'https://cdn.example/v.jpg' }] }));
    expect(out).toBe('<ul class="p3-members" aria-label="BTS members" tabindex="0"><li><span class="p3-member-face is-ini" aria-hidden="true">JI</span><span>Jin</span></li><li><img class="p3-member-face" src="https://cdn.example/v.jpg" alt="V of BTS" width="80" height="80" loading="lazy"/><span>V</span></li></ul>');
  });

  it('GroupAvatar prints the monogram or the photo as before, and takes a picture of its own', () => {
    expect(renderToString(h(GroupAvatar, { name: 'TXT', photo: null, size: 40 }))).toBe('<span class="p3-gav is-ini" style="width:40px;height:40px" aria-hidden="true">TX</span>');
    const art = renderToString(h(GroupAvatar, { name: 'TXT', photo: null, size: 40, art: h('svg', { className: 'x' }) }));
    expect(art).toBe('<span class="p3-gav" style="width:40px;height:40px" aria-hidden="true"><svg class="x"></svg></span>');
  });

  it('TextCard prints the card as before, and a note after the numbers when given', () => {
    const props = { href: '/q/a', title: 'T', quizType: 'multiple_choice', difficulty: 'easy', plays: 3 };
    const plain = renderToString(h(TextCard, props));
    expect(plain).toBe(renderToString(h(TextCard, { ...props, note: undefined })));
    expect(plain.endsWith('</span></a>')).toBe(true);
    expect(renderToString(h(TextCard, { ...props, note: h('span', { className: 'n' }, 'Safe') }))).toContain('</span><span class="n">Safe</span></a>');
  });
});

describe.each(FIXTURE_SLUGS)('the blocks of the %s fixture', (slug) => {
  const hub = hubFromFixture(slug, { trivia: 10, picks: { [1000 + (100 + FIXTURE_SLUGS.indexOf(slug)) * 10]: 31 } });

  it('A1 prints the facts, Sources only with a source, Now airing only with a record', () => {
    const out = html(h(SeriesFacts, { series: hub.series, sources: [] }));
    expect(out).toContain(hub.series.title_en === 'Death Note' ? 'Madhouse' : 'Studio');
    expect(out).not.toContain('Sources');
    expect(out).not.toContain('Now airing');
    const sourced = html(h(SeriesFacts, {
      series: { ...hub.series, airing: { episode: 4, next_air_date: '2026-11-02', source_url: 'https://example.org/schedule' } },
      sources: [{ field: 'episodes', source: 'wikipedia', source_ref: '1', source_url: 'https://en.wikipedia.org/wiki/Test', fetched_at: '2026-10-01' }],
    }));
    expect(sourced).toContain('Now airing');
    expect(sourced).toContain('Episode 4');
    expect(sourced).toContain('Sources');
    expect(sourced).toContain('(i)');
    expect(sourced).toContain('href="https://en.wikipedia.org/wiki/Test"');
    expect(sourced).toContain('rel="nofollow noopener"');
  });

  it('A2 prints the story map and every quiz under its arc, with the label of the spoiler-free view', () => {
    const map = html(h(StoryMap, { nodes: storyMap(hub.arcs, hub.quizzes) }));
    for (const a of hub.arcs) expect(map).toContain(a.name);
    const grouping = {
      seriesSlug: hub.group.slug, groupId: hub.group.id, sections: groupQuizzesByArc(hub.quizzes, hub.arcs), levels: quizLevels(hub.quizzes, hub.arcs),
      labels: { heading: 'Quizzes by arc', safe: 'Safe for you', covers: 'Covers {arc}' },
    };
    const list = hub.quizzes.map((q) => ({ ...q, difficulty: q.difficulty, like_count: 0 }));
    const out = renderToString(h(HubQuizzes, { groupName: hub.group.name, quizzes: list, grouping }));
    expect(out).toContain('Quizzes by arc');
    for (const q of hub.quizzes) expect(out, q.slug).toContain(`href="/q/${q.slug}"`);
    const free = hub.quizzes.filter((q) => !q.spoiler_arc_ord).length;
    expect(out.split('Safe for you').length - 1).toBe(free);
    for (const q of hub.quizzes.filter((x) => x.spoiler_arc_ord)) {
      expect(out).toContain(`Covers ${hub.arcs.find((a) => a.ord === q.spoiler_arc_ord)!.name}`);
    }
    // the same list without a grouping is the kpop list: one grid, no arc heading
    expect(renderToString(h(HubQuizzes, { groupName: hub.group.name, quizzes: list }))).not.toContain('anime-o2-arc');
  });

  it('A3 prints the open characters, locks the others without a name, and never prints an image', () => {
    const split = splitCharacters(hub.characters, hub.oshiCounts);
    const out = renderToString(h(CharacterTiles, { seriesSlug: hub.group.slug, groupId: hub.group.id, name: hub.group.name, open: split.open, lockedCount: split.lockedCount }));
    for (const c of split.open) expect(out, c.slug).toContain(c.name);
    for (const name of lockedNames(hub)) expect(out, name).not.toContain(name);
    expect(out.split('Locked').length - 1).toBe(split.lockedCount);
    expect(out).not.toContain('<img');
    expect(out).toContain('href="/login"');
    expect(out).toContain('anime-o2-role-');
    const picked = split.open.find((c) => c.picks !== null);
    if (picked) expect(out).toContain(`${picked.picks} fans picked ${picked.name} as their oshi`);
  });

  it('A4 prints the openings table with an empty credit slot, and no link to a blind test or an openings quiz', () => {
    const rows = openingRows(hub.themes);
    for (const themes of [hub.themes, with15Playable(hub).themes]) {
      const out = html(h(OpeningsTable, { name: hub.group.name, rows: openingRows(themes) }));
      for (const r of rows) expect(plain(out)).toContain(r.title);
      expect(out).toContain('data-slot="credit"');
      expect(out).not.toContain('href=');
      expect(out).not.toMatch(/blindtest|blind test|openings-quiz|openings quiz/i);
    }
  });

  it('A5 prints the shield on the spoiler-free view, with the medium and the arc to pick', () => {
    const out = renderToString(h(SpoilerShield, { seriesSlug: hub.group.slug, groupId: hub.group.id, arcs: shieldArcs(hub.arcs), signedIn: false }));
    expect(out).toContain('Spoiler shield');
    expect(out).toContain('Spoiler-free view');
    expect(out).toContain('Show everything');
    expect(out).toContain('You see spoiler-free content only.');
    expect(out).toContain('aria-pressed="true"');
    expect(out).toContain('>Anime<');
    expect(out).toContain('>Manga<');
  });

  it('A5 prints the interstitial on a quiz above arc 0, and no tagged question text anywhere', () => {
    const tagged = readFixture(slug).quizzes.find((q) => q.expected_level.arc_ord > 0);
    if (!tagged) return;
    const arc = tagged.expected_level.arc_ord;
    const out = renderToString(h(SpoilerGate, {
      seriesSlug: hub.group.slug, groupId: hub.group.id, name: hub.group.name, level: { arc, scope: tagged.expected_level.scope },
      arcName: hub.arcs.find((a) => a.ord === arc)!.name, arcs: shieldArcs(hub.arcs),
    }));
    expect(out).toContain(`This quiz can spoil ${hub.group.name}`);
    expect(out).toContain('Show anyway');
    expect(out).toContain('Set my progress');
    expect(out).toContain('Spoiler shield');
    for (const text of taggedTexts(slug)) expect(out).not.toContain(text);
  });

  it('A7 draws the same card for the same title, from text and shapes only', () => {
    const a = html(h(TitleCard, { title: hub.group.name }));
    expect(a).toBe(html(h(TitleCard, { title: hub.group.name })));
    expect(a).toContain('aria-hidden="true"');
    expect(a).not.toMatch(/<image|<img|xlink:href|href=/);
    expect(html(h(TitleCard, { title: hub.group.name, variant: 'mono' }))).toContain('anime-o2-card-sm');
  });

  it('the facts list shows at most nine facts and links the trivia page', () => {
    const facts = uniqueFacts(hub.trivia);
    expect(facts).toHaveLength(10);
    const out = html(h(SeriesFactList, { name: hub.group.name, facts: facts.slice(0, 9), total: facts.length, triviaHref: `/${hub.group.slug}-trivia` }));
    expect(out.split('<li>').length - 1).toBe(9);
    expect(out).toContain(`href="/${hub.group.slug}-trivia"`);
    expect(html(h(SeriesFactList, { name: hub.group.name, facts: facts.slice(0, 3), total: 3, triviaHref: null }))).not.toContain('-trivia');
  });

  it('no block says K-pop, uses a dash character or an emoji, or leaks a tagged question or a locked name', () => {
    const split = splitCharacters(hub.characters, hub.oshiCounts);
    // The arc names are public (the story map prints them), so the locked-name check leaves the story map out.
    const map = html(h(StoryMap, { nodes: storyMap(hub.arcs, hub.quizzes) }));
    const parts = [
      html(h(SeriesFacts, { series: hub.series, sources: [] })),
      renderToString(h(CharacterTiles, { seriesSlug: hub.group.slug, groupId: hub.group.id, name: hub.group.name, open: split.open, lockedCount: split.lockedCount })),
      html(h(OpeningsTable, { name: hub.group.name, rows: openingRows(with15Playable(hub).themes) })),
      renderToString(h(SpoilerShield, { seriesSlug: hub.group.slug, groupId: hub.group.id, arcs: shieldArcs(hub.arcs), signedIn: true })),
      html(h(TitleCard, { title: hub.group.name })),
    ].join('');
    expect(parts + map).not.toMatch(BANNED);
    for (const text of taggedTexts(slug)) expect(parts + map).not.toContain(text);
    for (const name of lockedNames(hub)) expect(parts).not.toContain(name);
  });
});
