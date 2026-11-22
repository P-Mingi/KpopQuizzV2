// Owner, 2026-11-22 ("on OtakuQuiz and kpopquiz the images are not showing anymore"): a quiz page draws the picture its quiz card draws.
// Production: "Idol Bands Quiz" (General K-pop) has no cover of its own, its card showed the General K-pop fallback cover and its page the
// typographic cover; an OtakuQuiz quiz (My Hero Academia) showed the typographic cover although its series has a bundled photo.
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { GENERAL_KPOP_FALLBACK_COVER, GENERAL_KPOP_GROUP_SLUG } from '@/lib/ux-v1/a0/general-kpop-cover';
import { groupPhotoUrl } from '@/lib/ux-v1/a0/group-photos';

import { quizFallbackCover, quizGroupPhoto } from './quiz-picture';

describe('the picture of a quiz without a cover of its own', () => {
  it('kpopquiz.org: the group photo, as the card; General K-pop gets its fallback cover last', () => {
    expect(quizGroupPhoto('kpop', 'bts')).toBe(groupPhotoUrl('bts'));
    expect(quizGroupPhoto('kpop', 'bts')).toBeTruthy();
    expect(quizGroupPhoto('kpop', GENERAL_KPOP_GROUP_SLUG)).toBeNull();
    expect(quizFallbackCover('kpop', GENERAL_KPOP_GROUP_SLUG)).toBe(GENERAL_KPOP_FALLBACK_COVER);
    expect(quizFallbackCover('kpop', 'bts')).toBeNull();
  });

  it('OtakuQuiz: the series photo (the bundled one when the owner set none); no K-pop fallback', () => {
    expect(quizGroupPhoto('anime', 'my-hero-academia')).toBe('/series/my-hero-academia.webp');
    expect(quizGroupPhoto('anime', 'anime-mix')).toBe('/series/anime-mix.webp');
    expect(quizFallbackCover('anime', GENERAL_KPOP_GROUP_SLUG)).toBeNull();
    expect(quizGroupPhoto('anime', 'no-such-series')).toBeNull();
    expect(quizGroupPhoto('kpop', null)).toBeNull();
  });

  it('the quiz page uses that order: its own cover, the group or series photo, the fallback cover', () => {
    const src = readFileSync(new URL('../../app/(site)/q/[slug]/ux-page.tsx', import.meta.url), 'utf8');
    expect(src).toContain('const cover = quiz.cover_image_url ?? groupPhoto ?? quizFallbackCover(site, quiz.group_slug);');
    expect(src).toContain('const groupPhoto = quizGroupPhoto(site, quiz.group_slug);');
    expect(src).toContain('photo: quizGroupPhoto(site, r.group_slug) ?? r.cover_image_url ?? quizFallbackCover(site, r.group_slug)');
    expect(src).not.toMatch(/groupPhotoUrl\(/);
  });
});
