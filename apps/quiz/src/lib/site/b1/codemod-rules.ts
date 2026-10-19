// Run O1, lane B1. The rules of the brand codemod: each hard-coded host or brand name of a file the
// lane owns, and the registry read that renders the same bytes on the kpop build. Data only; the
// runner is apps/quiz/scripts/o1/b1/codemod.mts and the logic is codemod-core.ts.
//
// Care taken so the kpop output stays byte for byte today's:
//  - a text child stays ONE text node: a literal "x" becomes {value} or {`${a}/b`}, never "{a}/b"
//    (two adjacent text nodes would add a comment marker to the served HTML);
//  - a template string keeps its words around the substituted value.
//
// Files in HOT.txt are skipped by the runner and wait for their branch to merge (rule 12); their rules
// are written now so that one re-run converts them. Rules marked `note` explain what else must move.

import type { FileRule } from './codemod-core';

const SITE_IMPORT = "import { SITE } from '@/lib/site/registry';";
const BRAND_IMPORT = "import { brandWordmark, domainWordmark } from '@/lib/site/brand';";
const SRC = 'apps/quiz/src/';

export const RULES: readonly FileRule[] = [
  // ---- files free today -------------------------------------------------------------------------
  {
    file: `${SRC}app/robots.ts`,
    imports: [SITE_IMPORT],
    edits: [{ from: "sitemap: 'https://kpopquiz.org/sitemap.xml',", to: 'sitemap: `${SITE.url}/sitemap.xml`,' }],
  },
  {
    file: `${SRC}components/layout/logo.tsx`,
    imports: [SITE_IMPORT],
    edits: [
      { from: '// "KpopQuiz" wordmark next to it.', to: '// brand wordmark next to it.' },
      { from: '<span>KpopQuiz</span>', to: '<span>{SITE.brand.name}</span>' },
    ],
  },
  {
    file: `${SRC}components/layout/mobile-top-bar.tsx`,
    imports: [SITE_IMPORT],
    edits: [{ from: '\n              KpopQuiz\n            </span>', to: '\n              {SITE.brand.name}\n            </span>' }],
  },
  {
    file: `${SRC}components/ux-v1/brand.tsx`,
    imports: [SITE_IMPORT, BRAND_IMPORT.replace('brandWordmark, domainWordmark', 'brandWordmark')],
    edits: [
      { from: ' * The KpopQuiz mark: the rabbit mascot', to: ' * The brand mark: the rabbit mascot' },
      { from: "label = 'KpopQuiz home'", to: 'label = `${SITE.brand.name} home`' },
      { from: '<span>Kpop<b>Quiz</b></span>', to: '<span>{brandWordmark().head}<b>{brandWordmark().tail}</b></span>' },
    ],
  },
  {
    file: `${SRC}components/ux-v1/story-image.ts`,
    imports: [SITE_IMPORT],
    edits: [
      { from: 'instead of the plain "kpopquiz.org": "Play at kpopquiz.org".', to: 'instead of the plain domain: "Play at <domain>".' },
      { from: "ctx.fillText('kpopquiz.org', PAD, L.footerY);", to: 'ctx.fillText(SITE.domain, PAD, L.footerY);' },
    ],
  },
  {
    file: `${SRC}lib/share.ts`,
    imports: [SITE_IMPORT],
    edits: [
      { from: "'https://kpopquiz.org'", to: 'SITE.url' },
      { from: "const text = 'My K-pop passport on kpopquiz.org';", to: 'const text = `My K-pop passport on ${SITE.domain}`;' },
      { from: '(Level ${level}) on kpopquiz.org`', to: '(Level ${level}) on ${SITE.domain}`' },
      { from: '`${scoreText} on KpopQuiz - can you beat me?`', to: '`${scoreText} on ${SITE.brand.name} - can you beat me?`' },
    ],
  },
  {
    file: `${SRC}lib/seo/og.ts`,
    imports: [SITE_IMPORT],
    edits: [
      { from: "{ url: '/og-default.png', width: 1200, height: 630, alt: 'KpopQuiz: K-pop quizzes made by fans' }", to: '{ url: SITE.brand.ogTemplate, width: 1200, height: 630, alt: `${SITE.brand.name}: K-pop quizzes made by fans` }' },
    ],
  },
  {
    file: `${SRC}app/api/og/group/[slug]/route.tsx`,
    imports: [SITE_IMPORT],
    edits: [{ from: '\n          kpopquiz.org\n        </div>', to: '\n          {SITE.domain}\n        </div>' }],
  },
  {
    file: `${SRC}app/api/og/level-up/route.tsx`,
    imports: [SITE_IMPORT],
    edits: [
      { from: '// "I reached {Title} on kpopquiz.org" + the celebrate', to: '// "I reached {Title} on <domain>" + the celebrate' },
      { from: "<span style={{ fontWeight: 800, marginLeft: 8 }}>kpopquiz.org</span>", to: '<span style={{ fontWeight: 800, marginLeft: 8 }}>{SITE.domain}</span>' },
    ],
  },
  {
    file: `${SRC}app/api/og/page/route.tsx`,
    imports: [SITE_IMPORT],
    edits: [
      { from: "sp.get('title') || 'KpopQuiz'", to: "sp.get('title') || SITE.brand.name" },
      { from: '\n            KPOPQUIZ.ORG\n', to: '\n            {SITE.domain.toUpperCase()}\n' },
    ],
  },
  {
    file: `${SRC}app/api/og/[slug]/route.tsx`,
    imports: [SITE_IMPORT],
    edits: [{ from: 'textShadow: SHADOW }}>kpopquiz</div>', to: 'textShadow: SHADOW }}>{SITE.brand.name.toLowerCase()}</div>' }],
  },
  {
    file: `${SRC}app/api/og/passport/[username]/route.tsx`,
    imports: [BRAND_IMPORT],
    edits: [
      { from: "kpop<span style={{ display: 'flex', color: BRAND }}>quiz</span>", to: "{brandWordmark().head.toLowerCase()}<span style={{ display: 'flex', color: BRAND }}>{brandWordmark().tail.toLowerCase()}</span>" },
      { from: "kpop<span style={{ display: 'flex', color: BRAND }}>quiz.org</span>", to: "{domainWordmark().head}<span style={{ display: 'flex', color: BRAND }}>{domainWordmark().tail}</span>" },
    ],
  },
  {
    file: `${SRC}app/api/og/verse/route.tsx`,
    imports: [SITE_IMPORT],
    edits: [{ from: '>kpopquiz.org/verse</div>', to: '>{`${SITE.domain}/verse`}</div>' }],
  },
  {
    file: `${SRC}app/api/og/verse/[slug]/route.tsx`,
    imports: [SITE_IMPORT],
    edits: [{ from: '>kpopquiz.org/verse</div>', to: '>{`${SITE.domain}/verse`}</div>' }],
  },

  // ---- files on HOT.txt (skipped until their branch merges; rule 12) -----------------------------
  {
    file: `${SRC}app/sitemap.ts`,
    imports: [SITE_IMPORT],
    edits: [{ from: "const SITE_URL = 'https://kpopquiz.org';", to: 'const SITE_URL = SITE.url;' }],
  },
  {
    file: `${SRC}lib/indexnow.ts`,
    imports: [SITE_IMPORT],
    edits: [
      { from: '// https://kpopquiz.org/<KEY>.txt (public/ file)', to: '// <site origin>/<KEY>.txt (public/ file)' },
      { from: "const HOST = 'kpopquiz.org';", to: 'const HOST = SITE.domain;' },
    ],
  },
  {
    file: `${SRC}app/llms.txt/route.ts`,
    imports: [SITE_IMPORT],
    note: 'registry.test.ts reads the first line of BODY from this file: repoint it first (request B1-1).',
    edits: [
      { from: 'const BODY = `# kpopquiz.org\n', to: 'const BODY = `# ${SITE.seo.llmsTxt.title}\n' },
      { from: '\nkpopquiz.org is an independent K-pop quiz site.', to: '\n${SITE.domain} is an independent K-pop quiz site.' },
      { from: 'Please attribute to kpopquiz.org and link', to: 'Please attribute to ${SITE.domain} and link' },
    ],
  },
  {
    file: `${SRC}components/layout/footer.tsx`,
    imports: [SITE_IMPORT],
    edits: [{ from: "{new Date().getFullYear()} kpopquiz.org</span>", to: '{new Date().getFullYear()}{` ${SITE.domain}`}</span>' }],
  },
  {
    file: `${SRC}lib/seo/org.ts`,
    imports: [SITE_IMPORT],
    note: 'registry.test.ts reads SITE_URL, CONTACT_EMAIL and the organization literals from this file: repoint it first (request B1-1).',
    edits: [
      { from: "export const SITE_URL = 'https://kpopquiz.org';", to: 'export const SITE_URL = SITE.url;' },
      { from: "export const CONTACT_EMAIL = 'contact@kpopquiz.org';", to: "export const CONTACT_EMAIL = SITE.seo.organization.email ?? '';" },
      { from: "role: 'Founder of kpopquiz.org',", to: 'role: `Founder of ${SITE.domain}`,' },
      { from: "    name: 'KpopQuiz',\n    alternateName: 'kpopquiz.org',", to: '    name: SITE.seo.organization.name,\n    alternateName: SITE.seo.organization.alternateName,' },
      { from: 'logo: `${SITE_URL}/logo-512.png`,', to: 'logo: `${SITE_URL}${SITE.seo.organization.logo}`,' },
    ],
  },
];

/**
 * Files of the lane's scope where a brand literal stays on purpose, and why. The runner's --check
 * accepts exactly these; anything else left in an owned, non-HOT file fails it.
 */
export const ALLOWLIST: readonly { readonly file: string; readonly reason: string }[] = [
  { file: `${SRC}lib/site/b1/codemod-rules.ts`, reason: 'The rules hold the literals they replace, by definition.' },
  { file: `${SRC}lib/site/b1/codemod-core.ts`, reason: 'BRAND_LITERAL_RE is the pattern that finds them.' },
  {
    file: `${SRC}app/layout.tsx`,
    reason: 'KPOP_METADATA: registry.test.ts (F0, not editable by B1) reads these literals from this file. The block moves to lib/site/kpop.ts once that test reads it there (request B1-1).',
  },
];

/** Paths a codemod never touches (brief B1, "Never change"). Used by the runner's report of the rest of src. */
export const NEVER_CHANGE: readonly RegExp[] = [
  /\.test\.[a-z]+$/,
  /^apps\/quiz\/scripts\/check-[^/]*\.mts$/,
  /^apps\/quiz\/src\/lib\/(articles|i18n)\//,
  /^apps\/quiz\/src\/lib\/auth\/return-to\.ts$/,
  /^packages\/shared\//,
];
