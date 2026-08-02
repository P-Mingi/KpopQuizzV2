import Link from 'next/link';
import { SectionHeader } from '@/components/verse/primitives/section-header';

import { getUserSpaces } from '@/lib/verse/membership';

const ROLE_LABEL: Record<string, string> = { member: 'Member', contributor: 'Contributor', curator: 'Curator', space_admin: 'Space admin' };

/** W4.2 - Verse spaces this user belongs to, shown on their passport. Extends the
 * passport spine; min-gated (renders nothing until they join a space). */
export async function SpaceMembershipsCard({ userId }: { userId: string }): Promise<React.ReactElement | null> {
  const spaces = await getUserSpaces(userId);
  if (spaces.length === 0) return null;

  return (
    <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 14, boxShadow: 'var(--shadow-card)', padding: 16, marginTop: 14, maxWidth: 520, marginLeft: 'auto', marginRight: 'auto' }}>
      <SectionHeader kicker="Verse spaces" as="h2" />
      <ul className="flex flex-wrap gap-2">
        {spaces.map((s) => (
          <li key={s.groupId}>
            <Link href={`/verse/${s.slug}`} className="inline-flex items-center gap-2 rounded-full border border-default px-3 py-1.5 text-sm no-underline transition-colors hover:bg-surface-1">
              <span className="font-semibold text-primary">{s.fandomName ?? s.name}</span>
              {s.role !== 'member' ? <span className="rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase text-accent" style={{ background: 'var(--bg-accent)' }}>{ROLE_LABEL[s.role]}</span> : null}
              {s.xp > 0 ? <span className="text-[10px] font-semibold text-tertiary" title={`${s.xp} contribution XP`}>{s.tier} · {s.xp} XP</span> : null}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
