// V-ROLES step 3 - the role badge: subtle, text-first, on the V-DESIGN system.
// A badge, not a costume: members carry none; contributor is quiet; curator and
// space admin carry the space accent. Text content IS the accessible name.

const LABELS: Record<string, string> = {
  contributor: 'Contributor',
  curator: 'Curator',
  space_admin: 'Space admin',
};

export function RoleBadge({ role }: { role?: string | null | undefined }): React.ReactElement | null {
  if (!role || !LABELS[role]) return null;
  const loud = role === 'curator' || role === 'space_admin';
  return (
    <span
      className="inline-flex items-center rounded-full px-1.5 py-px text-[9.5px] font-bold uppercase tracking-[0.07em]"
      style={loud
        ? { background: 'var(--verse-soft-strong)', color: 'var(--verse-ink)' }
        : { background: 'var(--verse-soft)', color: 'var(--text-tertiary)' }}
    >
      {LABELS[role]}
    </span>
  );
}
