import { getPhotocards } from '@/lib/verse/photocards';
import { getActiveSpacePoll } from '@/lib/verse/presentation/poll';
import { upcomingBirthday } from '@/lib/verse/date-engines';
import { PollVote } from './poll-vote';

import type { ModuleProps } from './module-registry';

function Card({ title, children }: { title: string; children: React.ReactNode }): React.ReactElement {
  return (
    <div className="rounded-xl border p-4" style={{ borderColor: 'var(--verse-line)', background: 'var(--verse-soft)' }}>
      <h3 className="mb-2 text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--verse-ink)' }}>{title}</h3>
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

/** COUNTDOWN - next comeback / birthday / anniversary from dates we already hold. */
export function CountdownModule({ space }: ModuleProps): React.ReactElement | null {
  const today = new Date();
  const cands: { label: string; days: number }[] = [];
  const anni = nextAnniversary(space.group.inception_date, today);
  if (anni) cands.push(anni);
  const bday = upcomingBirthday(space.idols.map((i) => ({ name: i.name, slug: i.slug, birth_date: i.birth_date })), today, 365);
  if (bday) cands.push({ label: `${bday.name}'s birthday`, days: bday.inDays });
  if (space.comeback) { const d = daysUntil(space.comeback.release_date, today); if (d >= 0) cands.push({ label: space.comeback.title, days: d }); }
  if (!cands.length) return null;
  const next = cands.sort((a, b) => a.days - b.days)[0]!;
  return (
    <Card title="Countdown">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-semibold text-primary">{next.label}</span>
        <span className="text-2xl font-extrabold tabular-nums" style={{ color: 'var(--verse-ink)' }}>
          {next.days === 0 ? 'Today' : `${next.days}d`}
        </span>
      </div>
    </Card>
  );
}

/** QUOTE HIGHLIGHT - fan-written pull-quote (no lyrics; capped in validation). */
export function QuoteModule({ placement }: ModuleProps): React.ReactElement | null {
  const text = typeof placement.props?.text === 'string' ? placement.props.text : '';
  if (!text.trim()) return null;
  const attribution = typeof placement.props?.attribution === 'string' ? placement.props.attribution : '';
  return (
    <blockquote className="my-2 rounded-xl border-l-4 py-3 pl-4 pr-3" style={{ borderColor: 'var(--verse-accent)', background: 'var(--verse-soft)' }}>
      <p className="text-lg font-semibold leading-snug" style={{ color: 'var(--verse-ink)' }}>{text}</p>
      {attribution ? <cite className="mt-1 block text-xs not-italic text-tertiary">- {attribution}</cite> : null}
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
