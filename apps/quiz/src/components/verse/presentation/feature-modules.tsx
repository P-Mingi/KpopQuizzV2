import Link from 'next/link';

import { getPhotocards } from '@/lib/verse/photocards';
import { getActiveSpacePoll } from '@/lib/verse/presentation/poll';
import { getEras } from '@/lib/verse/eras';
import { upcomingBirthday } from '@/lib/verse/date-engines';
import { PollVote } from './poll-vote';

import type { ModuleProps } from './module-registry';

// V-DESIGN v2 - borderless editorial block: a small-caps eyebrow + content, spaced
// by the section rhythm. No card, no border (frames are opt-in and wrap this).
function Card({ title, children }: { title: string; children: React.ReactNode }): React.ReactElement {
  return (
    <div className="v-module">
      <h3 className="v-eyebrow">{title}</h3>
      {children}
    </div>
  );
}

function daysUntil(iso: string, today: Date): number {
  return Math.ceil((new Date(iso).getTime() - today.getTime()) / 86400000);
}
function nextAnniversary(inception: string | null, today: Date): { label: string; days: number } | null {
  if (!inception) return null;
  const m = inception.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const year = today.getFullYear();
  let next = new Date(`${year}-${m[2]}-${m[3]}T00:00:00`);
  if (next.getTime() < today.getTime()) next = new Date(`${year + 1}-${m[2]}-${m[3]}T00:00:00`);
  const yrs = next.getFullYear() - Number(m[1]);
  return { label: `${yrs}th anniversary`, days: Math.max(0, daysUntil(next.toISOString().slice(0, 10), today)) };
}

/** NOW (canonical position 7) - the current era plus the next date we hold
 * (comeback / birthday / anniversary). Contextual: hides entirely when idle.
 * Zone-aware density: compact label/value rows in the main column (a display
 * number there overwhelms the flow); the big quiet number stays a rail thing. */
export async function CountdownModule({ space, placement }: ModuleProps): Promise<React.ReactElement | null> {
  const today = new Date();
  const cands: { label: string; days: number }[] = [];
  const anni = nextAnniversary(space.group.inception_date, today);
  if (anni) cands.push(anni);
  const bday = upcomingBirthday(space.idols.map((i) => ({ name: i.name, slug: i.slug, birth_date: i.birth_date })), today, 365);
  if (bday) cands.push({ label: `${bday.name}'s birthday`, days: bday.inDays });
  if (space.comeback) { const d = daysUntil(space.comeback.release_date, today); if (d >= 0) cands.push({ label: space.comeback.title, days: d }); }
  // Current era: an era whose period covers today (or is open-ended).
  const eras = await getEras(space.group.id);
  const iso = today.toISOString().slice(0, 10);
  const current = eras.find((e) => e.periodStart && e.periodStart <= iso && (!e.periodEnd || e.periodEnd >= iso)) ?? null;
  if (!cands.length && !current) return null;
  const next = cands.sort((a, b) => a.days - b.days)[0] ?? null;
  const inMain = placement.zone === 'main';
  if (inMain) {
    return (
      <Card title="Now">
        <div className="flex flex-col gap-1.5">
          {current ? (
            <div className="flex flex-wrap items-baseline gap-x-2 text-sm">
              <span className="text-tertiary">Current era</span>
              <Link href={`/verse/${space.group.slug}/timeline`} className="font-bold no-underline" style={{ color: 'var(--verse-ink)' }}>{current.name}</Link>
            </div>
          ) : null}
          {next ? (
            <div className="flex flex-wrap items-baseline gap-x-2 text-sm">
              <span className="text-tertiary">{next.label}</span>
              <span className="font-bold tabular-nums" style={{ color: 'var(--verse-ink)' }}>{next.days === 0 ? 'today' : `in ${next.days} day${next.days === 1 ? '' : 's'}`}</span>
            </div>
          ) : null}
        </div>
      </Card>
    );
  }
  return (
    <Card title="Now">
      {current ? (
        <p className="mb-2 text-sm text-secondary">
          Current era: <Link href={`/verse/${space.group.slug}/timeline`} className="font-bold no-underline" style={{ color: 'var(--verse-ink)' }}>{current.name}</Link>
        </p>
      ) : null}
      {next ? (
        <>
          <div className="text-[14px] font-semibold text-primary">{next.label}</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-extrabold leading-none tabular-nums" style={{ fontSize: 'var(--v-type-num)', color: 'var(--verse-ink)' }}>{next.days === 0 ? 'Today' : next.days}</span>
            {next.days > 0 ? <span className="text-[12px] uppercase tracking-wide text-tertiary">day{next.days === 1 ? '' : 's'}</span> : null}
          </div>
        </>
      ) : null}
    </Card>
  );
}

/** QUOTE HIGHLIGHT - fan-written pull-quote (no lyrics; capped in validation).
 * Editorial: large type, an accent quote mark, no box. */
export function QuoteModule({ placement }: ModuleProps): React.ReactElement | null {
  const text = typeof placement.props?.text === 'string' ? placement.props.text : '';
  if (!text.trim()) return null;
  const attribution = typeof placement.props?.attribution === 'string' ? placement.props.attribution : '';
  return (
    <blockquote className="v-module" style={{ maxWidth: 'var(--v-measure)' }}>
      <span aria-hidden className="block text-4xl font-black leading-none" style={{ color: 'var(--verse-accent)' }}>&ldquo;</span>
      <p className="mt-1 font-semibold leading-tight" style={{ fontSize: 'clamp(1.2rem, 2.4vw, 1.7rem)', color: 'var(--verse-ink)', letterSpacing: 'var(--v-tracking-tight)' }}>{text}</p>
      {attribution ? <cite className="mt-3 block text-[11px] not-italic uppercase tracking-[0.12em] text-tertiary">{attribution}</cite> : null}
    </blockquote>
  );
}

/** SPOTLIGHT - featured photocard from the space collection (pinned or first). */
export async function SpotlightModule({ space, placement }: ModuleProps): Promise<React.ReactElement | null> {
  const cards = await getPhotocards(space.group.id);
  if (!cards.length) return null;
  const pinnedId = typeof placement.props?.photocardId === 'number' ? placement.props.photocardId : null;
  const card = (pinnedId ? cards.find((c) => c.id === pinnedId) : null) ?? cards.find((c) => c.image_url) ?? cards[0]!;
  return (
    <Card title="Spotlight">
      <div className="flex gap-3">
        <div className="flex aspect-[3/4] w-20 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg" style={{ background: 'var(--verse-soft-strong)' }}>
          {card.image_url ? <img src={card.image_url} alt={card.name} className="h-full w-full object-cover" loading="lazy" /> : <span className="px-1 text-center text-[10px] font-semibold text-tertiary">{card.era ?? card.name}</span>}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold" style={{ color: 'var(--verse-ink)' }}>{card.name}</p>
          <p className="truncate text-[11px] text-tertiary">{[card.era, card.version, card.card_type].filter(Boolean).join(' · ')}</p>
        </div>
      </div>
    </Card>
  );
}

/** POLL - the space's active poll (reuses the vote engine), rendered as an island. */
export async function PollModule({ space }: ModuleProps): Promise<React.ReactElement | null> {
  const tally = await getActiveSpacePoll(space.group.id);
  if (!tally) return null;
  return <PollVote initial={tally} groupSlug={space.group.slug} />;
}
