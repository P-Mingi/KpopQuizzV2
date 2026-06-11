import { redirect, permanentRedirect } from 'next/navigation';

/**
 * The old bracket "tournament" gameplay was replaced by the continuous duel
 * model (Pipeline 1). This route now permanently redirects each old category
 * URL to the new duel with that matchup preselected, so existing links + SEO
 * land on the live game. The category slug is the duel question key: a known
 * group prefix splits into (group, type), everything else is a 'general' bucket.
 */
const GROUP_PREFIXES = ['stray-kids', 'blackpink', 'seventeen', 'aespa', 'bts'];

function slugToDuel(slug: string): { group: string; type: string } {
  for (const g of GROUP_PREFIXES) {
    if (slug.startsWith(`${g}-`)) return { group: g, type: slug.slice(g.length + 1) };
  }
  return { group: 'general', type: slug };
}

export default async function LegacyTotRedirect({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<never> {
  const { slug } = await params;
  if (!slug) redirect('/games/this-or-that');
  const { group, type } = slugToDuel(slug);
  permanentRedirect(
    `/games/this-or-that?group=${encodeURIComponent(group)}&type=${encodeURIComponent(type)}`,
  );
}
