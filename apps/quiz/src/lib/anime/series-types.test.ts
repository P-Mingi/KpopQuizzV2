// Run O1 (Manhwa label on quiz cards): the slug-to-type map that the anime quiz card reads is generated from the series data and
// equals it; a quiz card names a series by slug only, and the three manhwa (type webtoon) carry the label, no other series does.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { dressQuizCard } from '@/components/anime/dress-quiz-card';
import { UxQuizCard } from '@/components/ux-v1/quiz-card';
import { COPY as O2 } from '@/copy/anime/o2';

import { isManhwaType, seriesTypeOfSlug } from './manhwa';
import { SERIES_TYPE_BY_SLUG } from './series-types.generated';

import type { UxQuizCardData } from '@/components/ux-v1/quiz-card';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../..');
const DATA = path.join(ROOT, 'docs/anime/data/series');
const files = fs.readdirSync(DATA).filter((f) => f.endsWith('.json')).sort()
  .map((f) => JSON.parse(fs.readFileSync(path.join(DATA, f), 'utf8')) as { group: { slug: string; name: string }; series: { type: string } });

const MANHWA = ['omniscient-readers-viewpoint', 'solo-leveling', 'tower-of-god'];
const card = (slug: string, name: string, cover: string | null = null): UxQuizCardData => ({
  slug: `${slug}-basics`, title: `${name} Basics`, group_name: name, group_slug: slug, quiz_type: 'multiple_choice', difficulty: 'easy', play_count: 20, cover_image_url: cover,
});
// UxQuizCard is a function component: call it to get its element tree, as the shared card does before the slot dresses it.
const dressed = (c: UxQuizCardData): string => renderToStaticMarkup(dressQuizCard(UxQuizCard({ quiz: c }), c));

describe('the generated slug-to-type map', () => {
  it('equals the series data: same slugs, same types', () => {
    expect(files.length).toBeGreaterThan(20);
    const fromData = Object.fromEntries(files.map((f) => [f.group.slug, f.series.type]));
    expect(SERIES_TYPE_BY_SLUG).toEqual(fromData);
  });

  it('marks exactly the three webtoons as manhwa', () => {
    const manhwa = Object.keys(SERIES_TYPE_BY_SLUG).filter((s) => isManhwaType(seriesTypeOfSlug(s))).sort();
    expect(manhwa).toEqual(MANHWA);
    expect(seriesTypeOfSlug('not-a-series')).toBeNull();
    expect(seriesTypeOfSlug('constructor')).toBeNull();
    expect(seriesTypeOfSlug(null)).toBeNull();
  });
});

describe('the Manhwa label on the anime quiz card', () => {
  it('labels the quizzes of the three manhwa with the copy of the series page', () => {
    for (const slug of MANHWA) {
      const f = files.find((x) => x.group.slug === slug)!;
      const out = dressed(card(slug, f.group.name));
      expect(out).toContain('data-testid="manhwa-tag"');
      expect(out).toContain(`>${O2['series.manhwa']}<`);
    }
  });

  it('labels a manhwa card that has a picture of its own, and leaves its picture', () => {
    const out = dressed(card('solo-leveling', 'Solo Leveling', 'https://i.pinimg.com/cover.jpg'));
    expect(out).toContain('data-testid="manhwa-tag"');
    expect(out).toContain('ux-qcov-img');
  });

  it('labels no other series', () => {
    for (const f of files.filter((x) => !MANHWA.includes(x.group.slug))) {
      expect(dressed(card(f.group.slug, f.group.name))).not.toContain('manhwa-tag');
    }
    expect(dressed(card('death-note', 'Death Note', 'https://i.pinimg.com/cover.jpg'))).not.toContain('manhwa-tag');
  });
});
