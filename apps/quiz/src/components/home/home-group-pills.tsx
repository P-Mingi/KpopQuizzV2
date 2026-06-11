import Link from 'next/link';

import { GroupLogo } from '@/components/ui/group-logo';
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

/** §2e + §10f - labeled group pills (logo + name) → /quizzes?group=<slug>. */
export function HomeGroupPills({ groups }: { groups: Group[] }): React.ReactElement | null {
  const bySlug = new Map(groups.map((g) => [g.slug, g]));
  const ordered = ORDER.map((s) => bySlug.get(s)).filter((g): g is Group => Boolean(g));
  const pills = ordered.length > 0 ? ordered : groups.filter((g) => g.quiz_count > 0).slice(0, 13);
  if (pills.length === 0) return null;

  return (
    <section className="home-section">
      <div style={HEAD}>
        <p className="sec-label" style={{ marginBottom: 0 }}>Browse by group</p>
        <Link href="/quizzes" style={SEE_ALL}>Browse all quizzes →</Link>
      </div>

      <div className="group-pills" role="list">
        {pills.map((g) => (
          <Link key={g.slug} href={`/quizzes?group=${g.slug}`} className="group-pill" role="listitem">
            <GroupLogo
              groupName={g.name}
              logoUrl={g.logo_url}
              displayColor={g.display_color}
              textColor={g.text_color}
              size={24}
            />
            {g.name}
          </Link>
        ))}
      </div>
    </section>
  );
}
