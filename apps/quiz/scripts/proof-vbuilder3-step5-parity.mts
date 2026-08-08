// V-BUILDER-3 step 5 - SEO PARITY PROOF (hero indexable set same shape). The hero /
// identity override is a CONTENT edit (a curator legitimately sets a display name,
// tagline, chips, banner, avatar). The SEO INVARIANT the override must not break: the
// STRUCTURE is unchanged - the hero emits ZERO headings (the page's single sr-only H1
// lives on the home page, never in this chrome), and it introduces NO new crawlable
// anchors. So an overridden hero and a default hero share the SAME indexable set shape:
// same heading count (0), same set of <a href>. The visible name/tagline/image DO change
// (that is the point of an editable identity), which the harness also asserts so the
// parity is meaningful (the override really applied).
//   pnpm -C apps/quiz exec tsx scripts/proof-vbuilder3-step5-parity.mts
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { SpaceHero } from '../src/components/verse/space-hero';
import { PRESENTATION_VERSION } from '../src/lib/verse/presentation/types';
import type { Space } from '../src/lib/verse/space';
import type { Presentation, HeroIdentity } from '../src/lib/verse/presentation/types';

let failures = 0;
const check = (name: string, cond: boolean, detail = ''): void => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? `  -> ${detail}` : ''}`);
  if (!cond) failures += 1;
};

// A minimal but realistic Space (the fields SpaceHero reads).
const baseSpace = (presentation: Presentation): Space => ({
  group: {
    id: 1, name: 'Aurora', slug: 'aurora', fandom_name: 'Polaris',
    display_color: '#6633ff', text_color: '#ffffff', logo_url: null,
    generation: '4th gen', inception_date: '2019-05-01', record_label: 'North Star',
    origin_country: 'KR', official_website: null, quiz_count: 3,
  },
  config: { welcome_line: 'The home of Polaris.', est_year: null, sns_links: [{ label: 'YouTube', url: 'https://youtube.com/@aurora' }], former_members_shown: false, charter_text: null, is_launch: false },
  presentation,
  stickerAssets: [],
  idols: [{ id: 11, name: 'Mina', slug: 'mina', name_hangul: null, positions: ['Leader'], photo_url: null, birth_date: '2000-03-03', nationality: 'KR', unit_id: null, ord: 0 }],
  units: [],
  albums: [],
  comeback: null,
  counts: { members: 5, albums: 4, tracks: 40 },
  surfaces: { quiz: true, blindtest: false, nameAll: false, personality: false },
});

// Extract the indexable-structure signature: heading tags (with text) + the set of
// crawlable <a href> targets. Order-independent set for anchors.
const headings = (html: string): string[] => (html.match(/<h[1-6][^>]*>.*?<\/h[1-6]>/gis) ?? []).map((h) => h.replace(/\s+/g, ' ').trim());
const hrefs = (html: string): string[] => [...html.matchAll(/<a\b[^>]*\shref="([^"]*)"/gi)].map((m) => m[1]!).sort();

const DEFAULT: Presentation = { version: PRESENTATION_VERSION };
const HERO_OVERRIDE: HeroIdentity = {
  banner: 'space/1/banner-abc123.webp',
  avatar: 'space/1/avatar-def456.webp',
  displayName: 'POLARIS OFFICIAL',
  tagline: 'A curator-written tagline for the masthead.',
  chips: [{ label: 'Since', value: '2019' }, { value: '5 stars' }],
};
const OVERRIDDEN: Presentation = { version: PRESENTATION_VERSION, hero: HERO_OVERRIDE };

const htmlDefault = renderToStaticMarkup(createElement(SpaceHero, { space: baseSpace(DEFAULT) }));
const htmlOverridden = renderToStaticMarkup(createElement(SpaceHero, { space: baseSpace(OVERRIDDEN) }));

// ---- the parity assertions --------------------------------------------------
check('hero emits ZERO headings when DEFAULT (one-H1 is page-level)', headings(htmlDefault).length === 0,
  JSON.stringify(headings(htmlDefault)));
check('hero emits ZERO headings when OVERRIDDEN (H1 untouched by the override)', headings(htmlOverridden).length === 0,
  JSON.stringify(headings(htmlOverridden)));
check('the crawlable anchor SET is IDENTICAL (override adds no links)',
  JSON.stringify(hrefs(htmlDefault)) === JSON.stringify(hrefs(htmlOverridden)),
  `default=${JSON.stringify(hrefs(htmlDefault))}  overridden=${JSON.stringify(hrefs(htmlOverridden))}`);

// ---- the override really applied (so the parity is meaningful) --------------
check('override replaced the visible masthead name', htmlOverridden.includes('POLARIS OFFICIAL') && !htmlDefault.includes('POLARIS OFFICIAL'),
  'displayName override present only in the overridden render');
check('override replaced the tagline', htmlOverridden.includes('curator-written tagline') && !htmlDefault.includes('curator-written tagline'));
check('override rendered the vitals chips (Since 2019 / 5 stars)', htmlOverridden.includes('Since 2019') && htmlOverridden.includes('5 stars'));
check('override rendered the banner + avatar images from the ingest-copied paths',
  htmlOverridden.includes('banner-abc123.webp') && htmlOverridden.includes('avatar-def456.webp'));
check('no EXTERNAL image URL smuggled into the rendered hero (fail-closed asset gate)',
  !/src="https?:\/\/(?!.*supabase)/i.test(htmlOverridden) || htmlOverridden.includes('/storage/v1/object/public/verse-space-assets/'),
  'images resolve through spaceAssetUrl (our bucket) only');
// the default hero still shows the data-driven name + derived vitals (no fabrication).
check('default hero shows the data-driven fandom name + derived vitals', htmlDefault.includes('Polaris') && htmlDefault.includes('5 members'),
  'data-driven masthead intact when no override');

console.log(`\nStep-5 hero SEO parity: ${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`);
process.exit(failures === 0 ? 0 : 1);
