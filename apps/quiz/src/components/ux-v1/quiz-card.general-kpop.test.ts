// The quiz card of General K-pop with no cover (owner, 2026-11-04): it shows the fallback cover (lib/ux-v1/a0/general-kpop-cover.ts) in place of
// the grey typographic cover (group name over a type glyph). Only General K-pop, and only with no cover of its own: a General K-pop quiz with
// a cover keeps it, and the cards of every other group draw what they drew. next/image is replaced by a plain <img> so the src can be read.
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { isConfiguredImageHost } from '@/lib/image-hosts';
import { GENERAL_KPOP_FALLBACK_COVER, GENERAL_KPOP_GROUP_SLUG, generalKpopFallbackCover } from '@/lib/ux-v1/a0/general-kpop-cover';
import { CATCH_ALL_SLUG } from '@/lib/ux-v1/p3/model';

import { UxQuizCard } from './quiz-card';

import type { UxQuizCardData } from './quiz-card';

vi.mock('next/image', () => ({
  default: (p: Record<string, unknown>) => h('img', { src: p.src as string, alt: p.alt as string, className: p.className as string, 'data-sizes': p.sizes as string, style: p.style as object }),
}));

const GENERAL: UxQuizCardData = {
  slug: 'k-pop-company-quiz', title: 'K-pop company quiz', group_name: 'General K-pop', group_slug: 'general-kpop', quiz_type: 'multiple_choice',
  difficulty: 'easy', play_count: 500, cover_image_url: null,
};
const OWN_COVER = 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/quiz-images/quiz-images/2026/10/own-cover.jpg';
const render = (quiz: UxQuizCardData, props: Record<string, unknown> = {}): string => renderToStaticMarkup(h(UxQuizCard, { quiz, ...props }));
const srcs = (html: string): string[] => [...html.matchAll(/<img [^>]*src="([^"]*)"/g)].map((m) => m[1]!.replace(/&amp;/g, '&'));

describe('the fallback cover of General K-pop', () => {
  it('is one named constant, a Supabase Storage picture on a host next/image accepts, and General K-pop is the catch-all slug', () => {
    expect(GENERAL_KPOP_FALLBACK_COVER).toBe('https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/quiz-images/quiz-images/2026/05/230d8943-2746-4839-b04a-0181541fad1b.jpg');
    expect(isConfiguredImageHost(GENERAL_KPOP_FALLBACK_COVER)).toBe(true);
    expect(GENERAL_KPOP_GROUP_SLUG).toBe(CATCH_ALL_SLUG);
    expect(generalKpopFallbackCover('general-kpop')).toBe(GENERAL_KPOP_FALLBACK_COVER);
    for (const slug of ['bts', 'general-kpop-2', 'General-Kpop', '', null, undefined]) expect(generalKpopFallbackCover(slug)).toBeNull();
  });

  it('shows on a General K-pop card with no cover, in place of the typographic cover', () => {
    for (const cover of [null, '', '   ']) {
      const html = render({ ...GENERAL, cover_image_url: cover });
      expect(srcs(html), JSON.stringify(cover)).toEqual([GENERAL_KPOP_FALLBACK_COVER]);
      expect(html).toContain('class="ux-qcov-img"');
      expect(html).toContain('alt=""');
      expect(html).not.toContain('ux-qcov-fb');
      expect(html).not.toContain('ux-fbn');
      // The card is still one link to its quiz page, with the group and the title as text.
      expect(html).toContain('href="/q/k-pop-company-quiz"');
      expect(html).toContain('<span class="ux-qg">General K-pop</span>');
      expect(html).toContain('K-pop company quiz</h3>');
    }
  });

  it('is centred in the 4:3 box, and follows the priority and sizes of the card like any cover', () => {
    const html = render(GENERAL, { priority: true, sizes: '96px' });
    expect(html).toContain('data-sizes="96px"');
    expect(html).toContain('object-position:center');
    expect(html).not.toContain('center 25%');
  });

  it('shows in the stacked phone list and in the preview of a draft of the group with no cover too', () => {
    expect(srcs(render(GENERAL, { titleAs: 'h2', className: 'x' }))).toEqual([GENERAL_KPOP_FALLBACK_COVER]);
    const preview = render({ ...GENERAL, slug: '' }, { preview: true });
    expect(srcs(preview)).toEqual([GENERAL_KPOP_FALLBACK_COVER]);
    expect(preview).toContain('role="img"');
    expect(preview).not.toContain('<a ');
  });

  it('is not shown when the card has a cover: a General K-pop quiz with a cover keeps it', () => {
    const html = render({ ...GENERAL, cover_image_url: OWN_COVER });
    expect(srcs(html)).toEqual([OWN_COVER]);
    expect(html).not.toContain(GENERAL_KPOP_FALLBACK_COVER);
    expect(html).toContain('object-position:center 25%');
  });

  it('is not shown over the draft cover of the preview (a data: picture of the creator)', () => {
    const html = render({ ...GENERAL, cover_image_url: 'data:image/png;base64,AAAA' }, { preview: true });
    expect(html).toContain('src="data:image/png;base64,AAAA"');
    expect(html).not.toContain(GENERAL_KPOP_FALLBACK_COVER);
  });

  it('shows when the cover is on a host the site cannot serve (the card draws no cover for it: the grey block was what showed)', () => {
    const html = render({ ...GENERAL, cover_image_url: 'https://elsewhere.example/c.jpg' });
    expect(srcs(html)).toEqual([GENERAL_KPOP_FALLBACK_COVER]);
  });

  it('leaves the card of every other group as it was: a group with no photo keeps the typographic cover, a group with a photo its photo', () => {
    const other: UxQuizCardData = { ...GENERAL, slug: 'a', title: 'A quiz', group_name: 'An Unknown Group', group_slug: 'an-unknown-group' };
    const plain = render(other);
    expect(plain).toContain('<div class="ux-qcov-fb"><span class="ux-fbn">');
    expect(plain).toContain('An Unknown Group</span></div>');
    expect(plain).not.toContain('<img');
    expect(plain).not.toContain(GENERAL_KPOP_FALLBACK_COVER);
    const withPhoto = render({ ...other, group_name: 'BTS', group_slug: 'bts' });
    expect(srcs(withPhoto)).toEqual(['/idols/BTS.jpg']);
    expect(withPhoto).not.toContain(GENERAL_KPOP_FALLBACK_COVER);
    // A cover of its own, the same on any group.
    expect(srcs(render({ ...other, cover_image_url: OWN_COVER }))).toEqual([OWN_COVER]);
    // A look-alike slug is another group.
    expect(render({ ...other, group_slug: 'general-kpop-2', group_name: 'General K-pop 2' })).toContain('ux-qcov-fb');
  });
});
