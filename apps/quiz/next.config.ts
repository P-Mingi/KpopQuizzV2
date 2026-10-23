import type { NextConfig } from 'next';

import { buildUxStylesheet, uxStylesheetVersion } from './src/lib/ux-v1/a0/stylesheet';

// V12 (NEXT_PUBLIC_UX_V12, default off, and only together with NEXT_PUBLIC_UX_V1: the
// rule of lib/ux-v12.ts, inlined because this file is read before the app).
const on = (v: string | undefined): boolean => v === '1' || v === 'true';
const UX_V12_ON = on(process.env.NEXT_PUBLIC_UX_V1) && on(process.env.NEXT_PUBLIC_UX_V12);

// The flag-on stylesheet's ?v= (app/layout.tsx): a hash of the very bytes
// /api/ux-v1/a0/styles serves for this build's flags, so its immutable address changes
// whenever the CSS does, deployed from git or from the command line alike.
const UX_CSS_VERSION = uxStylesheetVersion(buildUxStylesheet({ v12: UX_V12_ON }));

// V12 G5: the groups that have a profile set in personality_profiles (read 2026-10-02).
// "Which member are you" is relaunched for these only, and only with the flag on.
const WMA_GROUPS = [
  'aespa', 'ateez', 'blackpink', 'bts', 'enhypen', 'g-i-dle', 'itzy', 'ive',
  'le-sserafim', 'newjeans', 'nmixx', 'seventeen', 'stray-kids', 'twice', 'txt',
];
const WMA = WMA_GROUPS.join('|');

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  transpilePackages: ['@kpopquiz/shared'],
  // SEO Mission 3, part C: the Monday e-mail and /admin/seo/import read docs/seo/TARGETS.md and
  // docs/seo/CALENDAR.md at run time (lib/seo/weekly/repo-docs.ts). They sit at the repository
  // root, outside this app, so the two routes list them here to carry them. A file that does not
  // exist yet is simply not carried, and the code skips what needs it.
  outputFileTracingIncludes: {
    '/api/cron/seo-weekly-report': ['../../docs/seo/TARGETS.md', '../../docs/seo/CALENDAR.md'],
    '/admin/seo/import': ['../../docs/seo/TARGETS.md'],
  },
  // V12 (G1 request R7, issue C3-002): the blindtest tracking switch is always inlined, as ''
  // when it is unset, so the legacy blindtest pages drop the tracking import() at build
  // and load no tracking chunk while tracking is off.
  env: { NEXT_PUBLIC_BT_TRACKING: process.env.NEXT_PUBLIC_BT_TRACKING ?? '', UX_CSS_VERSION },
  async redirects() {
    const groupSlugs = [
      'bts', 'blackpink', 'stray-kids', 'seventeen', 'twice', 'aespa',
      'newjeans', 'exo', 'g-i-dle', 'ive', 'enhypen', 'ateez', 'itzy',
      'red-velvet', 'le-sserafim', 'txt', 'shinee', 'got7', 'mamamoo',
      'nct', 'general-kpop',
    ];
    // SEO Fix 4: EVERY /group/{slug} permanently (308) redirects to the real
    // 200 hub /{slug}-quiz. Wildcard so it covers all current AND future groups
    // (no hardcoded list to fall out of sync). Runs at the edge before routing,
    // so the legacy src/app/group/[slug] route is no longer needed/reachable.
    const groupRedirect = {
      source: '/group/:slug',
      destination: '/:slug-quiz',
      permanent: true,
    };
    // Legacy "how-well-do-you-know-{group}" URLs -> the same hub.
    const howWellRedirects = groupSlugs.map((slug) => ({
      source: `/how-well-do-you-know-${slug}`,
      destination: `/${slug}-quiz`,
      permanent: true,
    }));
    // Nav unification (B3): Ranks / Hall of Fame -> Leaderboard
    const leaderboardRedirects = [
      { source: '/ranks', destination: '/leaderboard', permanent: true },
      { source: '/hall-of-fame', destination: '/leaderboard', permanent: true },
    ];
    // SEO (fandom-name -> real group hub). "coer" / "coers" is the CORTIS fandom
    // name, NOT a separate group: the quiz /q/are-you-a-real-coer belongs to the
    // Cortis group and the real hub is /cortis-quiz (the #1 hub). /coer-quiz was
    // 404-ing while "coer quiz" intent ranks (pos 4.81). Consolidate the fandom
    // slug onto the real hub. No COER group exists, so no DB row is needed - this
    // is the pure-code path for the "COER hub" item.
    const fandomRedirects = [
      { source: '/coer-quiz', destination: '/cortis-quiz', permanent: true },
    ];
    // REFONTE P1 - the killed features. SEO (owner, 2026-10-15): a 301 only to the exact
    // page that replaces a URL, else 410. Nothing replaces /games, /pt/games, /rankings,
    // /tier-list, /battle, /battle-preview or the /personality index, so none of them is
    // redirected here any more (they all went to /quizzes or a group hub, many URLs to one
    // generic page): the middleware answers them 410, and /games/name-all/<group> and
    // /battle?quiz=<slug> 301 to their exact successor (lib/seo/legacy-urls.ts).
    const refonteRedirects = [
      // Personality ("which member are you"). The pretty /which-* URLs and the
      // /personality/[group] routes carry group intent -> the group hub.
      { source: '/personality/:group', destination: '/:group-quiz', permanent: true },
      { source: '/personality/:group/r/:member', destination: '/:group-quiz', permanent: true },
      // V12 G5: with the flag on, the relaunched groups are left out of this redirect
      // (the rewrite below serves them); every other group keeps its 301 to the hub.
      {
        source: UX_V12_ON ? `/which-:group((?!(?:${WMA})-member-are-you)[^/]+?)-member-are-you` : '/which-:group-member-are-you',
        destination: '/:group-quiz',
        permanent: true,
      },
      { source: '/which-:group-member-are-you/r/:member', destination: '/:group-quiz', permanent: true },
    ];
    return [groupRedirect, ...howWellRedirects, ...leaderboardRedirects, ...fandomRedirects, ...refonteRedirects];
  },
  // V12 pretty URLs (requests run/requests/G6.md R1 and run/requests/G5.md R1). Only
  // with both flags on at build; with a flag off there is no rewrite: the Name them all
  // URLs 301 to / in the middleware and the Which member URLs keep their REFONTE 301.
  // A direct hit on /personality/<group> keeps its REFONTE 301 above.
  async rewrites() {
    if (!UX_V12_ON) return [];
    return [
      {
        source: '/:group(bts|blackpink|stray-kids|twice|aespa|newjeans|seventeen|exo|g-i-dle|ive|le-sserafim|red-velvet|ateez|enhypen|txt|itzy|shinee)-name-all-members',
        destination: '/name-all/:group?via=pretty',
      },
      { source: `/which-:group(${WMA})-member-are-you`, destination: '/personality/:group' },
    ];
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [32, 48, 64, 96, 128, 220],
    minimumCacheTTL: 31536000,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'i.pinimg.com',
      },
      {
        // Cover Art Archive covers by MBID (see src/lib/image-hosts.ts for the
        // gate rationale; keep the two lists in sync).
        protocol: 'https',
        hostname: 'coverartarchive.org',
      },
      {
        // Deezer public image CDN (see src/lib/image-hosts.ts).
        protocol: 'https',
        hostname: 'cdn-images.dzcdn.net',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        // Group logos stored on Google Drive (drive.google.com/thumbnail?id=...).
        // Drive sometimes 302s to lh3.googleusercontent.com, which is listed above.
        protocol: 'https',
        hostname: 'drive.google.com',
      },
      {
        protocol: 'https',
        hostname: 'cdn.discordapp.com',
      },
      {
        protocol: 'https',
        hostname: 'i.ytimg.com',
      },
    ],
  },

  // W4 - framing policy, set deliberately because the site had NO anti-clickjacking
  // header at all before this.
  //
  //   /embed/*      frameable by anyone. That is the product: partners put the widget
  //                 on their own pages. The page reads no cookies and exposes no user
  //                 data, so framing it is safe.
  //   everything    frame-ancestors 'self' + X-Frame-Options SAMEORIGIN. The rest of
  //   else          the site is now explicitly NOT frameable by third parties, which
  //                 it previously was by omission.
  //
  // Order matters: the more specific /embed rule is listed first.
  async headers() {
    return [
      {
        source: '/embed/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: 'frame-ancestors *' },
        ],
      },
      {
        // Everything EXCEPT /embed. Next applies every matching rule, so a plain
        // '/:path*' here also matched /embed and the restrictive value won: the
        // widget was unframeable, which is the one thing it must not be. The
        // negative lookahead keeps the two policies from overlapping at all.
        source: '/((?!embed/).*)',
        headers: [
          { key: 'Content-Security-Policy', value: "frame-ancestors 'self'" },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        ],
      },
    ];
  },
};

export default nextConfig;
