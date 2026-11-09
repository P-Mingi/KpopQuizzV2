// O1 audit 03 P1-7 (rulebook 10.3): fr, es and id landings are noindex, out of the sitemap and out of the hreflang cluster
// until a native review (reviewed_by, reviewed_at) is recorded; English is always indexable.
import { describe, expect, it } from 'vitest';

import { LANDING_LANGS, LANDING_REVIEW, indexableLandingLangs, landingAlternates, landingIndexable } from './bt-landing';

const OK = { reviewed_by: 'A. Reviewer', reviewed_at: '2026-12-01' };

describe('landing review', () => {
  it('no localized landing is reviewed today: only English is indexable', () => {
    expect(LANDING_REVIEW).toEqual({ fr: null, es: null, id: null });
    expect(indexableLandingLangs()).toEqual(['en']);
    expect(landingAlternates()).toEqual({ en: '/guess-the-kpop-song', 'x-default': '/guess-the-kpop-song' });
  });

  it('a recorded review opens exactly that language, in the page head, the cluster and the list', () => {
    const review = { fr: OK, es: null, id: null };
    expect(landingIndexable('fr', review)).toBe(true);
    expect(landingIndexable('es', review)).toBe(false);
    expect(indexableLandingLangs(review)).toEqual(['en', 'fr']);
    expect(landingAlternates(indexableLandingLangs(review))).toEqual({ en: '/guess-the-kpop-song', fr: '/fr/blind-test-kpop', 'x-default': '/guess-the-kpop-song' });
  });

  it('a review without a name or with an unreadable date does not count', () => {
    expect(landingIndexable('id', { id: { reviewed_by: ' ', reviewed_at: '2026-12-01' } })).toBe(false);
    expect(landingIndexable('id', { id: { reviewed_by: 'A', reviewed_at: 'soon' } })).toBe(false);
  });

  it('English needs no review and every language is known', () => {
    expect(landingIndexable('en')).toBe(true);
    expect(LANDING_LANGS).toEqual(['en', 'fr', 'es', 'id']);
  });
});
