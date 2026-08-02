import Link from 'next/link';
import { SectionHeader } from '@/components/verse/primitives/section-header';

import { RoleBadge } from '@/components/verse/roles/role-badge';

import type { ProfileStats, ProfileSpace } from '@/lib/verse/profile-stats';
import type { ProfileSection, Visibility } from '@/lib/verse/profile-sections';
import type { ActivityItem } from '@/lib/verse/activity';

// V-PROFILE-ONE step 3 - the fan-resume BAND. Pure presentational (no data fetch,
// no server-only import) so the SERVER page renders the stranger view (only
// opted-in sections, ISR-safe) and the owner CLIENT island renders the full view
// with the same component. `mode` decides whether private sections are shown
// (dimmed, "Only you") or hidden. `renderToggle` lets the owner island inject a
// per-section public/private control (step 3b) without making the band stateful.

export interface FanResumeData {
  username: string;
  visibility: Visibility;
  stats: ProfileStats;
  activity: ActivityItem[];
}

type TileKey = 'contrib_xp' | 'pages' | 'essays' | 'quiz';
const STAT_LABELS: Record<TileKey, string> = {
  contrib_xp: 'Contribution XP', pages: 'Pages', essays: 'Essays', quiz: 'Quiz accuracy',
};

function relTime(iso: string, nowMs: number): string {
  const d = nowMs - new Date(iso).getTime();
  const day = 86400000;
  if (d < 3600000) return `${Math.max(1, Math.round(d / 60000))}m ago`;
  if (d < day) return `${Math.round(d / 3600000)}h ago`;
  if (d < 30 * day) return `${Math.round(d / day)}d ago`;
  return new Date(iso).toISOString().slice(0, 10);
}

export function FanResumeBand({ data, mode, nowMs, renderToggle }: {
  data: FanResumeData;
  mode: 'public' | 'owner';
  nowMs: number;
  renderToggle?: (section: ProfileSection) => React.ReactNode;
}): React.ReactElement | null {
  const { visibility, stats, activity } = data;
  const owner = mode === 'owner';
  const shown = (s: ProfileSection): boolean => owner || visibility[s];

  // Numeric stat tiles: value + min-gate at zero (a zero section never shows).
  const allTiles: Array<{ key: TileKey; value: number; suffix?: string }> = [
    { key: 'contrib_xp', value: stats.contribXp },
    { key: 'pages', value: stats.pages },
    { key: 'essays', value: stats.essays },
    ...(stats.quizAccuracy != null ? [{ key: 'quiz', value: stats.quizAccuracy, suffix: '%' } as { key: TileKey; value: number; suffix?: string }] : []),
  ];
  const tiles = allTiles.filter((t) => t.value > 0 && shown(t.key));

  const rolesShown = shown('roles') && stats.spaces.length > 0;
  const activityShown = shown('activity') && activity.length > 0;
  const cardsShown = shown('cards') && stats.cards > 0;

  // Stranger with nothing opted in -> render nothing (the owner island still reveals).
  if (!owner && !rolesShown && !activityShown && !cardsShown && tiles.length === 0) return null;

  const privacyTag = (s: ProfileSection): React.ReactNode => owner
    ? (renderToggle ? renderToggle(s) : (
      <span className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide" style={{ background: visibility[s] ? 'var(--verse-soft, #eef)' : 'var(--bg-surface-1, #f3f3f3)', color: visibility[s] ? 'var(--verse-ink, #333)' : 'var(--text-tertiary, #888)' }}>
        {visibility[s] ? 'Public' : 'Only you'}
      </span>
    )) : null;

  const sectionHeader = (label: string, s: ProfileSection): React.ReactElement => (
    <div className="mb-2 flex items-center justify-between gap-2">
      <SectionHeader kicker={label} as="h3" />
      {privacyTag(s)}
    </div>
  );

  return (
    <section aria-label="Fan resume" style={{ marginTop: 14, maxWidth: 520, marginLeft: 'auto', marginRight: 'auto' }}>
      <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}>
        <h2 className="mb-3 text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Fan resume</h2>

        {/* Cross-space role chips */}
        {rolesShown ? (
          <div className={`mb-4 ${owner && !visibility.roles ? 'opacity-60' : ''}`}>
            {sectionHeader('Spaces', 'roles')}
            <ul className="flex flex-wrap gap-1.5">
              {stats.spaces.map((sp: ProfileSpace) => (
                <li key={sp.slug}>
                  <Link href={`/verse/${sp.slug}`} className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold no-underline" style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
                    {sp.name}
                    <RoleBadge role={sp.role} />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {/* Stat tiles */}
        {tiles.length ? (
          <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {tiles.map((t) => (
              // Toggle on its own row below the value, so a long label never collides with it.
              <div key={t.key} className={`flex flex-col rounded-xl border p-2.5 ${owner && !visibility[t.key] ? 'opacity-60' : ''}`} style={{ borderColor: 'var(--border)' }}>
                <span className="text-[10px] font-bold uppercase leading-tight tracking-wide" style={{ color: 'var(--text-tertiary)' }}>{STAT_LABELS[t.key]}</span>
                <span className="mt-1 text-xl font-extrabold tabular-nums" style={{ color: 'var(--text-primary)' }}>{t.value.toLocaleString('en-US')}{t.suffix ?? ''}</span>
                {owner ? <div className="mt-2">{privacyTag(t.key)}</div> : null}
              </div>
            ))}
          </div>
        ) : null}

        {/* Showcase count line (the shelf cards render separately; this is the resume summary) */}
        {cardsShown ? (
          <div className={`mb-4 ${owner && !visibility.cards ? 'opacity-60' : ''}`}>
            {sectionHeader('Showcase', 'cards')}
            <p className="text-sm" style={{ color: 'var(--text-primary)' }}><span className="font-extrabold tabular-nums">{stats.cards}</span> card{stats.cards === 1 ? '' : 's'} pinned</p>
          </div>
        ) : null}

        {/* Recent activity */}
        {activityShown ? (
          <div className={owner && !visibility.activity ? 'opacity-60' : ''}>
            {sectionHeader('Recent activity', 'activity')}
            <ul className="space-y-1.5">
              {activity.slice(0, 8).map((a, i) => (
                <li key={i} className="flex items-baseline justify-between gap-3 text-sm">
                  <span style={{ color: 'var(--text-primary)' }}>
                    {a.href ? <Link href={a.href} className="underline decoration-1 underline-offset-2 hover:opacity-80" style={{ color: 'var(--text-primary)', textDecorationColor: 'var(--border)' }}>{a.title}</Link> : <span style={{ color: 'var(--text-secondary)' }}>{a.title}</span>}
                    {a.groupName ? <span className="ml-1.5 text-xs" style={{ color: 'var(--text-tertiary)' }}>{a.groupName}</span> : null}
                  </span>
                  <time className="shrink-0 text-xs tabular-nums" style={{ color: 'var(--text-tertiary)' }} dateTime={a.at}>{relTime(a.at, nowMs)}</time>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </section>
  );
}
