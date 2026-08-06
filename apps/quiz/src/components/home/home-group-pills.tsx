import Link from 'next/link';

import { GroupLogo } from '@/components/ui/group-logo';
import { ScrollRow } from '@/components/ui/scroll-row';
import type { Group } from '@/lib/db/types';

const SEE_ALL: React.CSSProperties = {
  fontSize: 12, fontWeight: 600, color: 'var(--brand)', textDecoration: 'none', whiteSpace: 'nowrap',
};
const HEAD: React.CSSProperties = {
  display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14,
};

// §2e - spec display order.
const ORDER = [
  'general-kpop', 'bts', 'blackpink', 'stray-kids', 'twice', 'aespa',
  'seventeen', 'newjeans', 'exo', 'ive', 'enhypen', 'txt', 'le-sserafim',
];

/** §2e + §10f - circle group coins (logo only, no label) in a horizontal scroll rail.
 * SEO: link straight to the group quiz HUB (/<slug>-quiz), not /quizzes?group=<slug>
 * which only canonicals there. This flows the home page's authority directly to the
 * pages that rank for "<group> quiz", tightens the internal-link graph, and lands the
 * user on the dedicated group hub instead of a filtered browse view. */
export function HomeGroupPills({ groups }: { groups: Group[] }): React.ReactElement | null {
  const bySlug = new Map(groups.map((g) => [g.slug, g]));
  const ordered = ORDER.map((s) => bySlug.get(s)).filter((g): g is Group => Boolean(g));
  const pills = ordered.length > 0 ? ordered : groups.filter((g) => g.quiz_count > 0).slice(0, 13);
  if (pills.length === 0) return null;

  return (
    <section className="home-section">
      <div style={HEAD}>
        <p className="sec-label" style={{ marginBottom: 0 }}>Browse by group</p>
        <Link href="/quizzes" style={SEE_ALL}>Browse all quizzes &rarr;</Link>
      </div>

      <ScrollRow scrollerClassName="home-group-rail" scrollerRole="list" ariaLabel="Browse quizzes by group">
        {pills.map((g) => (
          <Link key={g.slug} href={`/${g.slug}-quiz`} className="home-group-coin" role="listitem" aria-label={`${g.name} quiz`}>
            <GroupLogo
              groupName={g.name}
              logoUrl={g.logo_url}
              displayColor={g.display_color}
              textColor={g.text_color}
              size={60}
            />
          </Link>
        ))}
      </ScrollRow>
    </section>
  );
}
