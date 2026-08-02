import Link from 'next/link';
import { SectionHeader } from '@/components/verse/primitives/section-header';

import { attachedPages } from '@/lib/verse/pages/links';
import { getKind } from '@/lib/verse/pages/kinds';
import { KPOP_PAGE_REGISTRY } from '@/lib/verse/pages/kpop-kinds';

// V-PAGES step 4 - the "More about this" zone on entity pages: the custom pages
// whose body references this entity (an album lists its versions page, MV pages,
// photocard set...). Published sources only (requirement 2); renders nothing
// when no page is attached (min-gate: no empty doorway).
export async function MoreAboutThis({ groupId, groupSlug, entityRef, entityLabel }: {
  groupId: number; groupSlug: string; entityRef: string; entityLabel: string;
}): Promise<React.ReactElement | null> {
  const pages = await attachedPages(groupId, entityRef);
  if (pages.length === 0) return null;
  return (
    <section className="v-module">
      <SectionHeader kicker={<>More about {entityLabel}</>} as="h2" />
      <div className="v-grid-cards">
        {pages.map((p) => {
          const def = getKind(KPOP_PAGE_REGISTRY, p.kind);
          return (
            <Link key={p.slug} href={`/verse/${groupSlug}/wiki/${p.slug}`} className="group -mx-2 rounded-xl px-2 py-1.5 no-underline transition-colors hover:bg-[var(--verse-soft)]">
              <span className="block text-[14.5px] font-bold" style={{ color: 'var(--verse-ink)' }}>{p.title}</span>
              <span className="mt-0.5 block text-[12px] text-tertiary">{def?.label ?? p.kind}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
