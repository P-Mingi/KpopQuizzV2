// Run O1 (IMG): the photo path on the REAL generated map (docs/anime/images): a series that has a photo draws an img with the alt of its
// entry and the sizes of its box, never the title card. The title card tests (blocks, series-art, the seam) run on an empty map.
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { dressQuizCard } from '@/components/anime/dress-quiz-card';
import { PHOTO_SIZES, SeriesArt } from '@/components/anime/series-art';
import { TitleCard } from '@/components/anime/title-card';
import { UxQuizCard } from '@/components/ux-v1/quiz-card';

import { SERIES_IMAGES } from './series-images.generated';

import type { UxQuizCardData } from '@/components/ux-v1/quiz-card';

const html = (el: React.ReactElement): string => renderToStaticMarkup(el);
/** An alt as it is written in the markup (quotes and ampersands escaped). */
const escaped = (alt: string): string => /alt="([^"]*)"/.exec(html(h('img', { alt })))![1]!;
const photos = Object.entries(SERIES_IMAGES).filter(([, e]) => e.file && e.alt);

describe('a series with a photo, on the real map', () => {
  it('has photos for the series the title card tests name, and for the general mix', () => {
    for (const slug of ['death-note', 'one-piece', 'spy-x-family', 'anime-mix']) expect(SERIES_IMAGES[slug]?.file, slug).toBe(`/series/${slug}.webp`);
  });

  it('draws the photo, with the alt of its entry and the sizes of its box, in each size', () => {
    for (const slug of ['death-note', 'one-piece', 'spy-x-family']) {
      const e = SERIES_IMAGES[slug]!;
      for (const size of ['avatar', 'card', 'hub'] as const) {
        const out = html(h(SeriesArt, { slug, title: slug, size }));
        expect(out, `${slug} ${size}`).toContain(`alt="${escaped(e.alt!)}"`);
        expect(out).toContain(`sizes="${PHOTO_SIZES[size]}"`);
        expect(out).toContain(encodeURIComponent(e.file!));
        expect(out).toContain('anime-o2-photo');
        expect(out).not.toMatch(/<svg|<text|<tspan/);
      }
    }
  });

  it('the hub title card is the photo, and the avatar of a related series too', () => {
    expect(html(h(TitleCard, { title: 'One Piece', slug: 'one-piece' }))).toContain('<img');
    expect(html(h(TitleCard, { title: 'One Piece', slug: 'one-piece', variant: 'mono' }))).toContain('anime-o2-art-avatar');
  });

  it('every entry with a photo draws an img and no title card', () => {
    expect(photos.length).toBeGreaterThan(20);
    for (const [slug, e] of photos) {
      const out = html(h(SeriesArt, { slug, title: slug, size: 'card' }));
      expect(out, slug).toContain(`alt="${escaped(e.alt!)}"`);
      expect(out, slug).not.toContain('<svg');
    }
  });

  it('a quiz card of such a series shows the photo in the strip and in the square, with the quiz title below', () => {
    const card: UxQuizCardData = { slug: 'death-note-basics', title: 'Death Note Basics', group_name: 'Death Note', group_slug: 'death-note', quiz_type: 'multiple_choice', difficulty: 'easy', play_count: 20, cover_image_url: null };
    const out = html(dressQuizCard(UxQuizCard({ quiz: card }), card));
    expect(out.match(/<img/g)?.length).toBe(2);
    expect(out).toContain(`alt="${escaped(SERIES_IMAGES['death-note']!.alt!)}"`);
    expect(out).toContain('Death Note Basics');
  });
});
