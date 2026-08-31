// V-UPGRADE-1 Phase B: the Verse mirror of the public passport (/u/[username]).
// The page COMPONENT + its generateMetadata are re-exported, so the SAME profile
// renders under Verse chrome AND the canonical it emits still points at the Play
// original (/u/[username]) - Google consolidates the two URLs, no duplicate
// content. revalidate is declared locally (Next forbids re-exporting route config).
// generateStaticParams is intentionally NOT re-exported: the mirror is out of the
// sitemap and renders on-demand, so we never pre-build a second copy of a profile.
export { default, generateMetadata } from '@/app/(site)/u/[username]/page';

export const revalidate = 3600;
