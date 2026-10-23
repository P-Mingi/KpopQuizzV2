import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { UxQuizCardData } from '@/components/ux-v1/quiz-card';

// Lane O2: the series art in its components. A build of the anime site shows the art where kpop shows a photo or initials;
// a build of kpop is untouched (the Flight trees of o1-o2-art-tree.test.ts hold that).

const html = (el: React.ReactElement): string => renderToStaticMarkup(el);
const BANNED = /k-?pop|[\u2013\u2014]|\p{Extended_Pictographic}|<image|<img|xlink:href|href=/iu;

const CARD: UxQuizCardData = {
  slug: 'death-note-basics', title: 'Death Note Basics: Rules and Creators', group_name: 'Death Note', group_slug: 'death-note', quiz_type: 'true_false',
  difficulty: 'easy', play_count: 3, cover_image_url: null,
};
const LONG: UxQuizCardData = { ...CARD, slug: 'orv', title: "Forty-Eight Episodes to a Block: Omniscient Reader's Viewpoint Odds and Ends", group_name: "Omniscient Reader's Viewpoint", group_slug: 'omniscient-readers-viewpoint' };

describe('the series art', () => {
  it('draws the same picture for the same slug, in each size, from shapes and text only', async () => {
    const { SeriesArt } = await import('./series-art');
    for (const size of ['avatar', 'card', 'hub'] as const) {
      const a = html(h(SeriesArt, { slug: 'death-note', title: 'Death Note', size }));
      expect(a).toBe(html(h(SeriesArt, { slug: 'death-note', title: 'Death Note', size })));
      expect(a).toContain(`anime-o2-art-${size}`);
      expect(a).toContain('aria-hidden="true"');
      expect(a).toContain('<path d="M');
      expect(a).not.toMatch(BANNED);
    }
    expect(html(h(SeriesArt, { slug: 'death-note', title: 'Death Note', size: 'avatar' }))).toContain('>DN<');
  });

  it('prints a long title in full, on at most two lines on the card and three on the hub header', async () => {
    const { SeriesArt } = await import('./series-art');
    const card = html(h(SeriesArt, { slug: 'omniscient-readers-viewpoint', title: "Omniscient Reader's Viewpoint", size: 'card' }));
    const hub = html(h(SeriesArt, { slug: 'omniscient-readers-viewpoint', title: "Omniscient Reader's Viewpoint", size: 'hub' }));
    const text = (s: string): string => (s.match(/<tspan[^>]*>([^<]*)<\/tspan>/g) ?? []).map((t) => t.replace(/<[^>]+>/g, '')).join(' ').replace(/&#x27;/g, "'");
    expect(text(card)).toBe("Omniscient Reader's Viewpoint");
    expect((card.match(/<tspan/g) ?? []).length).toBeLessThanOrEqual(2);
    expect(text(hub)).toBe("Omniscient Reader's Viewpoint");
    expect((hub.match(/<tspan/g) ?? []).length).toBeLessThanOrEqual(3);
  });

  it('is named for assistive technology only when it is given a label', async () => {
    const { SeriesArt } = await import('./series-art');
    const named = html(h(SeriesArt, { slug: 'bleach', title: 'Bleach', size: 'card', label: 'Bleach' }));
    expect(named).toContain('role="img"');
    expect(named).toContain('aria-label="Bleach"');
    expect(named).not.toContain('aria-hidden');
  });

  it('is what the A7 title card draws, with the classes of the hub', async () => {
    const { TitleCard } = await import('./title-card');
    const wide = html(h(TitleCard, { title: 'One Piece', slug: 'one-piece' }));
    expect(wide).toContain('anime-o2-card');
    expect(wide).toContain('anime-o2-art-hub');
    const mono = html(h(TitleCard, { title: 'One Piece', slug: 'one-piece', variant: 'mono' }));
    expect(mono).toContain('anime-o2-card-sm');
    expect(mono).toContain('anime-o2-art-avatar');
  });
});

// The anime layout fills the SERIES_ART slot of lib/ux-v1/a0/group-photos.ts (register-art), which the shared components read.
describe('the shared components on a build of the anime site', () => {
  beforeEach(async () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_ID', 'anime');
    vi.resetModules();
    await import('./register-art');
  });
  afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

  it('the quiz card shows the art strip, the quiz type and the whole title, and no empty block', async () => {
    const { UxQuizCard } = await import('@/components/ux-v1/quiz-card');
    const out = html(h(UxQuizCard, { quiz: LONG }));
    expect(out).toContain('anime-o2-art-cov');
    expect(out).toContain('anime-o2-art-strip');
    expect(out).toContain('aria-label="Omniscient Reader&#x27;s Viewpoint"');
    expect(out).toContain('anime-o2-art-type');
    expect(out).toContain('True or false');
    expect(out).toContain('anime-o2-art-name');
    expect(out).toContain(LONG.title.replace(/'/g, '&#x27;'));
    expect(out).not.toContain('ux-qcov-fb');
    expect(out).not.toContain('ux-fbn');
    expect(out).not.toMatch(/[\u2013\u2014]|\p{Extended_Pictographic}/u);
  });

  it('the quiz card keeps a cover of its own and the preview mode', async () => {
    const { UxQuizCard } = await import('@/components/ux-v1/quiz-card');
    const own = html(h(UxQuizCard, { quiz: { ...CARD, cover_image_url: 'data:image/png;base64,AAAA' }, preview: true }));
    expect(own).toContain('ux-qcov-img');
    expect(own).not.toContain('anime-o2-art');
    expect(html(h(UxQuizCard, { quiz: CARD, preview: true }))).toContain('role="img" aria-label="Preview: Death Note Basics');
  });

  it('the stacked phone list marks its grid, and only on a build with the art', async () => {
    const source = readFileSync(fileURLToPath(new URL('../quizzes/ux-v1/results.tsx', import.meta.url)), 'utf8');
    expect(source).toContain("className={SERIES_ART.dress ? 'p2-grid anime-o2-art-stack' : 'p2-grid'}");
    const css = readFileSync(fileURLToPath(new URL('../../styles/sites/anime/o2.css', import.meta.url)), 'utf8');
    expect(css).toContain('.anime-o2-art-stack .anime-o2-art-sq { display: block; }');
  });

  it('the series rail shows the art, not the initials, and lets the name wrap', async () => {
    const { GroupsRail } = await import('@/components/home/ux-v1/groups-rail');
    const out = html(h(GroupsRail, { groups: [{ slug: 'omniscient-readers-viewpoint', name: "Omniscient Reader's Viewpoint", photo: null, initials: 'OR', quizzes: 5, isNew: true }] }));
    expect(out).toContain('anime-o2-art-avatar');
    expect(out).not.toContain('is-ini');
    expect(out).toContain('anime-o2-art-item');
    expect(out).toContain('p1-gn anime-o2-art-name');
  });

  it('the passport rows and the create field show the art of a series', async () => {
    const rows = await import('@/components/profile/ux-v1/rows');
    expect(html(h(rows.GroupAvatar, { slug: 'bleach', name: 'Bleach' }))).toContain('anime-o2-art-avatar');
    const field = await import('@/components/create/ux-v1/group-field');
    expect(html(h(field.GroupAvatar, { slug: 'bleach', name: 'Bleach' }))).toContain('anime-o2-art-avatar');
    expect(html(h(field.GroupAvatar, { slug: null, name: 'New series' }))).not.toContain('anime-o2-art');
  });

  it('the new quizzes list shows the art square in place of the grey glyph tile', async () => {
    const { NewRows } = await import('@/components/home/ux-v1/quiz-rows');
    const row = { ...LONG, id: 'q-1', like_count: 0, language: 'en', total_score_sum: 0, total_completions: 0, created_at: '2026-10-21T00:00:00Z', question_count: 5, display_color: '#000000', text_color: '#ffffff', logo_url: null, fandom_name: null, creator_username: 'x', creator_avatar_url: null, creator_avatar_bg: '#222222', creator_avatar_text: '#ffffff', creator_xp: 0 };
    const out = html(h(NewRows, { quizzes: [row] as never, now: new Date('2026-10-23T00:00:00Z') }));
    expect(out).toContain('anime-o2-art-thumb');
    expect(out).not.toContain('p1-nthumb');
  });
});
