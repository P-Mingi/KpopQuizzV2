import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  transpilePackages: ['@kpopquiz/shared'],
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
    // REFONTE P1 - the killed features' 301s (permanent). Group-scoped URLs carry
    // their fandom intent to the kept /{group}-quiz hub; everything else lands on
    // the nearest kept browse hub (/quizzes), never on home. /tier-list/l/[slug] is
    // deliberately NOT listed: its own route handler resolves the list's subject
    // group per-list (see app/(site)/tier-list/l/[slug]/route.ts).
    const refonteRedirects = [
      // 1. Games hub + all mini games (sort-it, match-up, name-them-all, name-all,
      // this-or-that). The group-specific game slugs are not group-prefixed in the
      // path, so they cannot be resolved statically and go to /quizzes.
      { source: '/games', destination: '/quizzes', permanent: true },
      { source: '/games/:path*', destination: '/quizzes', permanent: true },
      { source: '/pt/games', destination: '/pt/quizzes', permanent: true },
      // 2. Rankings (this-or-that verdicts). The hub -> /quizzes; a group ranking
      // carries group intent -> the group hub.
      { source: '/rankings', destination: '/quizzes', permanent: true },
      { source: '/rankings/:group/:type', destination: '/:group-quiz', permanent: true },
      // 3. Tier lists. Subject pages are group-scoped -> the group hub; the maker
      // surfaces -> /quizzes. /tier-list/l/:slug handled by its resolver route.
      { source: '/tier-list', destination: '/quizzes', permanent: true },
      { source: '/tier-list/new', destination: '/quizzes', permanent: true },
      { source: '/tier-list/create', destination: '/quizzes', permanent: true },
      { source: '/tier-list/share', destination: '/quizzes', permanent: true },
      { source: '/tier-list/mine/:path*', destination: '/quizzes', permanent: true },
      { source: '/tier-list/subject/:group/:kind', destination: '/:group-quiz', permanent: true },
      // 4. Battle / duel 1v1 (was noindex). -> /quizzes.
      { source: '/battle', destination: '/quizzes', permanent: true },
      { source: '/battle/:path*', destination: '/quizzes', permanent: true },
      { source: '/battle-preview', destination: '/quizzes', permanent: true },
      { source: '/battle-preview/:path*', destination: '/quizzes', permanent: true },
      // 5. Personality ("which member are you"). The pretty /which-* URLs and the
      // /personality/[group] routes carry group intent -> the group hub.
      { source: '/personality', destination: '/quizzes', permanent: true },
      { source: '/personality/:group', destination: '/:group-quiz', permanent: true },
      { source: '/personality/:group/r/:member', destination: '/:group-quiz', permanent: true },
      { source: '/which-:group-member-are-you', destination: '/:group-quiz', permanent: true },
      { source: '/which-:group-member-are-you/r/:member', destination: '/:group-quiz', permanent: true },
    ];
    return [groupRedirect, ...howWellRedirects, ...leaderboardRedirects, ...refonteRedirects];
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
