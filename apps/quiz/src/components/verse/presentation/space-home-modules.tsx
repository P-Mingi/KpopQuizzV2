import Link from 'next/link';

import { VerseGameLink } from '@/components/verse/verse-game-link';
import { onThisDay } from '@/lib/verse/date-engines';

import type { CrossPromoTarget } from '@/lib/analytics';
import type { Space } from '@/lib/verse/space';

// V-DESIGN v2 - today's home modules, rebuilt on the editorial system: NO borders,
// NO card backgrounds, NO dotted dividers by default. Sections separate by
// whitespace + a small-caps eyebrow + type hierarchy, and visual grids fill the
// wide canvas. Opt-in frames (curator choice) wrap these unchanged.

// A section is an h2 eyebrow (kept as a real heading for SEO) + content, spaced by
// the section rhythm. No box.
function Section({ title, children }: { title: string; children: React.ReactNode }): React.ReactElement {
  return (
    <section className="v-module">
      <h2 className="v-eyebrow">{title}</h2>
      {children}
    </section>
  );
}

export function GameWidgets({ space }: { space: Space }): React.ReactElement | null {
  const { group, surfaces } = space;
  const tiles = [
    surfaces.quiz && { href: `/${group.slug}-quiz`, label: 'Quizzes', sub: 'Test your knowledge', target: 'group-quiz' as CrossPromoTarget },
    surfaces.blindtest && { href: `/blindtest/group-${group.slug}`, label: 'Blind test', sub: 'Name the song', target: 'blindtest' as CrossPromoTarget },
    surfaces.nameAll && { href: `/games/name-all/${group.slug}`, label: 'Name them all', sub: 'The full roster', target: 'name-all' as CrossPromoTarget },
    surfaces.personality && { href: `/personality/${group.slug}`, label: 'Which member', sub: 'Personality match', target: 'games' as CrossPromoTarget },
  ].filter(Boolean) as { href: string; label: string; sub: string; target: CrossPromoTarget }[];
  if (!tiles.length) return null;
  return (
    <Section title="Play">
      <div className="v-grid-cards">
        {tiles.map((t) => (
          <VerseGameLink key={t.href} target={t.target} href={t.href}
            className="group -mx-2 rounded-xl px-2 py-2.5 no-underline transition-colors hover:bg-[var(--verse-soft)]">
            <span className="flex items-baseline gap-1.5">
              <span className="text-[15px] font-bold" style={{ color: 'var(--verse-ink)' }}>{t.label}</span>
              <svg className="opacity-0 transition-opacity group-hover:opacity-100" width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="var(--verse-ink)" strokeWidth="2" aria-hidden><path d="M6 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </span>
            <span className="mt-0.5 block text-[13px] text-tertiary">{t.sub}</span>
          </VerseGameLink>
        ))}
      </div>
    </Section>
  );
}

export function MembersStrip({ space }: { space: Space }): React.ReactElement | null {
  const { group, idols } = space;
  if (!idols.length) return null;
  return (
    <Section title="Members">
      <ul className="v-grid-media">
        {idols.map((m) => (
          <li key={m.id}>
            <Link href={`/verse/${group.slug}/members/${m.slug}`} className="group block no-underline">
              <div className="aspect-[3/4] w-full overflow-hidden rounded-[var(--v-radius-media)]" style={{ background: 'var(--verse-soft)' }}>
                {m.photo_url
                  ? <img src={m.photo_url} alt={m.name} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]" loading="lazy" />
                  : <span className="flex h-full w-full items-center justify-center text-xl font-bold" style={{ color: 'var(--verse-ink)' }}>{m.name.slice(0, 2)}</span>}
              </div>
              <span className="mt-2 block truncate text-[13.5px] font-semibold text-primary">{m.name}</span>
              {m.name_hangul ? <span className="block truncate text-[11.5px] text-tertiary">{m.name_hangul}</span> : null}
            </Link>
          </li>
        ))}
      </ul>
    </Section>
  );
}

export function Discography({ space }: { space: Space }): React.ReactElement | null {
  const { group, albums } = space;
  const recent = albums.filter((a) => a.release_date).slice(0, 8);
  if (!recent.length) return null;
  return (
    <Section title="Latest releases">
      <ul className="v-grid-cards">
        {recent.map((a) => (
          <li key={a.id} className="border-t pt-2.5" style={{ borderColor: 'var(--v-hairline)' }}>
            <Link href={`/verse/${group.slug}/albums/${a.slug}`} className="group block no-underline">
              <span className="block text-[14.5px] font-semibold leading-snug transition-colors group-hover:text-[var(--verse-ink)]" style={{ color: 'var(--verse-ink)' }}>{a.title}</span>
              <span className="mt-1 block text-[12px] uppercase tracking-wide text-tertiary">
                {a.release_date?.slice(0, 4)} · {a.type}{a.region !== 'kr' ? ` · ${a.region}` : ''}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Section>
  );
}

export function OnThisDay({ space }: { space: Space }): React.ReactElement | null {
  const entries = onThisDay(
    space.idols.map((i) => ({ name: i.name, slug: i.slug, birth_date: i.birth_date })),
    space.albums.map((a) => ({ title: a.title, slug: a.slug, release_date: a.release_date, type: a.type })),
    space.group.inception_date,
    new Date(),
  );
  if (!entries.length) return null;
  return (
    <div className="v-module">
      <h3 className="v-eyebrow">On this day</h3>
      <ul className="space-y-2 text-sm text-secondary">
        {entries.map((e, i) => (
          <li key={i} className="leading-snug">{e.label}{e.yearsAgo ? <span className="text-tertiary"> · {e.yearsAgo}y ago</span> : null}</li>
        ))}
      </ul>
    </div>
  );
}

export function StatsFlex({ space }: { space: Space }): React.ReactElement {
  const { counts } = space;
  const stats = [
    { n: counts.members, l: 'members' },
    { n: counts.albums, l: 'releases' },
    { n: counts.tracks, l: 'tracks' },
  ];
  return (
    <div className="v-module">
      <h3 className="v-eyebrow">In numbers</h3>
      <div className="flex flex-wrap gap-x-8 gap-y-3">
        {stats.map((s) => (
          <div key={s.l}>
            <div className="font-extrabold leading-none tabular-nums" style={{ fontSize: 'var(--v-type-num)', color: 'var(--verse-ink)' }}>{s.n}</div>
            <div className="mt-1 text-[11px] uppercase tracking-wide text-tertiary">{s.l}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function MastheadInvite({ space }: { space: Space }): React.ReactElement {
  return (
    <div className="v-module">
      <h3 className="v-eyebrow">Curators</h3>
      <p className="text-sm leading-relaxed text-secondary" style={{ maxWidth: 'var(--v-measure)' }}>
        This space is looking for its founding {space.group.fandom_name} curators. Run it, and get credited for it.
      </p>
      <a href={`/login?returnTo=${encodeURIComponent(`/verse/${space.group.slug}`)}`} className="mt-2 inline-flex items-center gap-1 text-sm font-bold no-underline" style={{ color: 'var(--verse-ink)' }}>
        Become a curator
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M6 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </a>
    </div>
  );
}

export const MODULE_RENDERERS: Record<string, (props: { space: Space }) => React.ReactElement | null> = {
  game_widgets: GameWidgets,
  members: MembersStrip,
  discography: Discography,
  on_this_day: OnThisDay,
  stats: StatsFlex,
  masthead: MastheadInvite,
};
