import { getVerseContributions } from '@/lib/verse/contributions';

const LEVEL = (n: number): string => {
  if (n === 0) return 'var(--border)';
  if (n === 1) return 'var(--bg-accent)';
  if (n <= 3) return 'var(--fill-accent, var(--text-accent))';
  return 'var(--text-accent)';
};

/** W4.5 - Verse edit contribution heatmap (13 weeks). Min-gated: renders nothing until
 * the user has made at least one edit. Server component; reads real revision history. */
export async function ContributionGraph({ userId }: { userId: string }): Promise<React.ReactElement | null> {
  const { total, days } = await getVerseContributions(userId);
  if (total === 0) return null;

  // Column-major weeks (7 rows).
  const weeks: Array<Array<{ date: string; count: number }>> = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));

  return (
    <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 14, boxShadow: 'var(--shadow-card)', padding: 16, marginTop: 14, maxWidth: 520, marginLeft: 'auto', marginRight: 'auto' }}>
      <div className="mb-2 flex items-baseline justify-between">
        <h2 className="text-[11px] font-bold uppercase tracking-wide text-tertiary">Verse contributions</h2>
        <span className="text-xs text-tertiary tabular-nums">{total} edit{total === 1 ? '' : 's'} · 13 weeks</span>
      </div>
      <div className="flex gap-[3px] overflow-x-auto">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-[3px]">
            {week.map((d) => (
              <span key={d.date} title={`${d.count} on ${d.date}`} style={{ width: 11, height: 11, borderRadius: 2, background: LEVEL(d.count) }} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
