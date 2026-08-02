import Link from 'next/link';
import { SectionHeader } from '@/components/verse/primitives/section-header';

import { UserAvatar } from '@/components/ui/user-avatar';
import { getSpaceMembers } from '@/lib/verse/membership';

const ROLE_PILL: Record<string, string> = { space_admin: 'Space admin', curator: 'Curator', contributor: 'Contributor' };

/** W4.2 - the space member directory (fans who joined). Public/ISR; min-gated: renders
 * nothing until at least one member exists (no ghost roster). Curators are surfaced. */
export async function MemberDirectory({ groupId, fandomName }: { groupId: number; fandomName: string }): Promise<React.ReactElement | null> {
  const members = await getSpaceMembers(groupId);
  if (members.length === 0) return null;

  const staff = members.filter((m) => m.role !== 'member');
  return (
    <section>
      <SectionHeader kicker={fandomName} as="h2" action={<span className="text-tertiary tabular-nums">{members.length} fan{members.length === 1 ? '' : 's'}{staff.length ? ` · ${staff.length} on the team` : ''}</span>} />
      <ul className="flex flex-wrap gap-2">
        {members.slice(0, 60).map((m) => {
          const name = m.displayName || m.username || 'Fan';
          const pill = ROLE_PILL[m.role];
          const inner = (
            <span className="inline-flex items-center gap-2 rounded-full py-1 pl-1 pr-3" style={{ background: 'var(--verse-soft)' }}>
              <UserAvatar username={m.username ?? name} avatarUrl={m.avatarUrl} bgColor={m.avatarBg ?? '#6b7280'} textColor={m.avatarText ?? '#ffffff'} size={26} />
              <span className="text-xs font-semibold text-primary">{name}</span>
              {pill ? <span className="rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase" style={{ background: 'var(--verse-soft-strong)', color: 'var(--verse-ink)' }}>{pill}</span> : null}
              {m.xp > 0 ? <span className="rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase text-tertiary" style={{ border: '1px solid var(--verse-line)' }} title={`${m.xp} contribution XP`}>{m.tier}</span> : null}
            </span>
          );
          return <li key={m.userId}>{m.username ? <Link href={`/u/${m.username}`} className="no-underline">{inner}</Link> : inner}</li>;
        })}
      </ul>
    </section>
  );
}
