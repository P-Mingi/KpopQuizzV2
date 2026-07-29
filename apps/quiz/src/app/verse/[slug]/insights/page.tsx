import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { getSpace } from '@/lib/verse/space';
import { currentSpaceRole, roleAtLeast } from '@/lib/verse/roles';
import { getSpaceInsights } from '@/lib/verse/insights';
import { UserAvatar } from '@/components/ui/user-avatar';

import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Space insights', robots: { index: false, follow: false } };

function Metric({ label, value, sub }: { label: string; value: string | number; sub?: string }): React.ReactElement {
  return (
    <div className="rounded-xl border p-3" style={{ borderColor: 'var(--verse-line)' }}>
      <div className="text-xl font-black tabular-nums" style={{ color: 'var(--verse-ink)' }}>{value}</div>
      <div className="text-[11px] uppercase tracking-wide text-tertiary">{label}</div>
      {sub ? <div className="mt-0.5 text-[11px] text-secondary">{sub}</div> : null}
    </div>
  );
}

export default async function InsightsPage({ params }: { params: Promise<{ slug: string }> }): Promise<React.ReactElement> {
  const { slug } = await params;
  const space = await getSpace(slug);
  if (!space) notFound();
  const { role } = await currentSpaceRole(space.group.id);
  if (!roleAtLeast(role, 'curator')) redirect(`/verse/${slug}`);

  const ins = await getSpaceInsights(space.group.id, slug, space.group.name);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-bold" style={{ color: 'var(--verse-ink)' }}>{space.group.fandom_name} insights</h1>
        <p className="text-xs text-tertiary">The numbers that matter for this space. Real data only.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Metric label="Members" value={ins.members} sub={ins.membersLast30 ? `+${ins.membersLast30} in 30 days` : 'no new joins yet'} />
        <Metric label="Complete" value={`${ins.coveragePct}%`} sub={`${ins.openQuests} quests open`} />
        <Metric label="Edits" value={ins.edits} sub={ins.editsLast7 ? `${ins.editsLast7} this week` : 'none this week'} />
        <Metric label="Discussion" value={ins.comments} sub="comments on the space" />
        <Metric label="Quiz plays" value={ins.plays.toLocaleString()} sub={`${ins.quizCount} quizzes`} />
      </div>

      <section>
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--verse-ink)' }}>Top contributors</h2>
        {ins.topContributors.length === 0 ? (
          <p className="text-sm text-tertiary">No contributions yet. As fans write, they appear here.</p>
        ) : (
          <ol className="space-y-1.5">
            {ins.topContributors.map((c, i) => (
              <li key={c.userId} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm" style={{ background: 'var(--verse-soft)' }}>
                <span className="w-4 text-center font-bold text-tertiary tabular-nums">{i + 1}</span>
                <UserAvatar username={c.username ?? c.name} avatarUrl={c.avatarUrl} bgColor={c.avatarBg ?? '#6b7280'} textColor={c.avatarText ?? '#ffffff'} size={26} />
                <span className="font-semibold text-primary">{c.name}</span>
                <span className="ml-auto text-xs text-tertiary">{c.tier} · {c.xp} XP</span>
              </li>
            ))}
          </ol>
        )}
      </section>

      <Link href={`/verse/${slug}/curate`} className="inline-block text-sm font-semibold text-secondary no-underline hover:text-primary">Back to curator tools</Link>
    </div>
  );
}
