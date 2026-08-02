import Link from 'next/link';
import { SectionHeader } from '@/components/verse/primitives/section-header';

import { getHeroEssay } from '@/lib/verse/essays';

import type { ModuleProps } from './module-registry';

// V-ESSAYS-MAX step 6 - the featured-essay home widget (duality). Its own
// editorial identity (serif, "Featured essay" kicker), distinct from the binder /
// shelf widgets. Pure server render (the hero is public); min-gates by returning
// null when a space has no featured hero pick.
export async function FeaturedEssayModule({ space }: ModuleProps): Promise<React.ReactElement | null> {
  const hero = await getHeroEssay(space.group.id);
  if (!hero) return null;
  return (
    <div>
      <SectionHeader kicker="Featured essay" accent />
      <Link href={`/verse/${space.group.slug}/essays/${hero.id}`} className="mt-2 block no-underline">
        <p className="text-lg font-extrabold leading-snug" style={{ color: 'var(--verse-ink)', fontFamily: 'var(--v-editorial-font)' }}>{hero.title}</p>
        {hero.dek ? <p className="mt-1 line-clamp-2 text-sm text-secondary">{hero.dek}</p> : null}
        <p className="mt-2 text-xs text-tertiary">by {hero.authorName} · <span className="tabular-nums">{hero.readingMin} min read</span></p>
      </Link>
    </div>
  );
}
