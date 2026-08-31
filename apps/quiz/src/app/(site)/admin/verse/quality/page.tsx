import Link from 'next/link';
import { redirect } from 'next/navigation';

import { createServerClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/admin';
import { computeQuality } from '@/lib/verse/quality';

export const dynamic = 'force-dynamic';

function Pct({ n, d }: { n: number; d: number }): React.ReactElement {
  const p = d ? Math.round((n / d) * 100) : 0;
  return <span className="tabular-nums">{n}/{d} <span className="text-tertiary">({p}%)</span></span>;
}

export default async function VerseQualityPage(): Promise<React.ReactElement> {
  const c = await createServerClient();
  const { data: { user } } = await c.auth.getUser();
  if (!user || !isAdmin(user.id)) redirect('/');

  const { summary, groups, wanted } = await computeQuality();
  const dot = (on: boolean): React.ReactElement => <span className={`inline-block h-2.5 w-2.5 rounded-full ${on ? 'bg-green-500' : 'bg-neutral-300'}`} aria-label={on ? 'yes' : 'no'} />;

  return (
    <div>
      <h1 className="mb-1 text-xl font-bold">Verse quality</h1>
      <p className="mb-4 text-sm text-secondary">Computed coverage across content groups. Lowest coverage first, plus the most-wanted work.</p>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { l: 'Groups', v: <span className="tabular-nums">{summary.groups}</span> },
          { l: 'With overview', v: <Pct n={summary.withOverview} d={summary.groups} /> },
          { l: 'Eras narrated', v: <Pct n={summary.erasNarrated} d={summary.eras} /> },
          { l: 'Members with lore', v: <Pct n={summary.idolsWithLore} d={summary.idols} /> },
        ].map((s) => (
          <div key={s.l} className="rounded-xl border border-default p-3">
            <div className="text-lg font-bold">{s.v}</div>
            <div className="text-[11px] uppercase tracking-wide text-tertiary">{s.l}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-secondary">Most-wanted work</h2>
          <ul className="space-y-1.5">
            {wanted.length === 0 ? <li className="text-sm text-tertiary">Everything tracked is covered.</li> : null}
            {wanted.map((w, i) => (
              <li key={i}>
                <Link href={w.href} className="flex items-center gap-2 rounded-lg border border-default px-3 py-2 text-sm no-underline hover:bg-surface-1">
                  <span className="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase text-tertiary" style={{ border: '1px solid var(--border)' }}>{w.kind}</span>
                  {w.label}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-secondary">Coverage by group</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-tertiary">
                  <th className="py-1 pr-3">Group</th><th className="px-1" title="Overview">Ov</th><th className="px-1" title="Era story">Era</th><th className="px-1" title="Member lore">Lore</th><th className="px-1" title="Awards">Awd</th><th className="pl-2 text-right">Score</th>
                </tr>
              </thead>
              <tbody>
                {groups.map((g) => (
                  <tr key={g.slug} className="border-t border-default">
                    <td className="py-1.5 pr-3"><Link href={`/verse/${g.slug}`} className="font-medium no-underline hover:text-accent">{g.name}</Link></td>
                    <td className="px-1 text-center">{dot(g.signals.overview)}</td>
                    <td className="px-1 text-center" title={`${g.erasNarrated}/${g.erasTotal}`}>{dot(g.signals.eraStory)}</td>
                    <td className="px-1 text-center" title={`${g.idolsWithLore}/${g.idolsTotal}`}>{dot(g.signals.idolLore)}</td>
                    <td className="px-1 text-center">{dot(g.signals.awards)}</td>
                    <td className="pl-2 text-right tabular-nums">{Math.round(g.score * 100)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
