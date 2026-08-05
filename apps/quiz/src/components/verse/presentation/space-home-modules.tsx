import Link from 'next/link';
import { WidgetShell } from '@/components/verse/primitives/widget-shell';

import { VerseGameLink } from '@/components/verse/verse-game-link';
import { onThisDay } from '@/lib/verse/date-engines';
import { getSpaceQuizzes } from '@/lib/verse/space-quizzes';
import { resolveSpaceImages } from '@/lib/verse/space-image';

import type { CrossPromoTarget } from '@/lib/analytics';
import type { Space } from '@/lib/verse/space';
import type { ModulePlacement } from '@/lib/verse/presentation/types';

// V-DESIGN v2 - today's home modules, rebuilt on the editorial system: NO borders,
// NO card backgrounds, NO dotted dividers by default. Sections separate by
// whitespace + a small-caps eyebrow + type hierarchy, and visual grids fill the
// wide canvas. Opt-in frames (curator choice) wrap these unchanged.

// A section is an h2 eyebrow (kept as a real heading for SEO) + content, spaced by
// the section rhythm. An optional quiet action sits on the header line (right),
// giving a boxed module a structured header instead of a floating label.
/* V-POLISH-2 iteration (V4 Part 1 item 1): main sections carry DISPLAY titles
   with the accent-rule motif (the vitals band's signature echoed); rail
   modules keep small eyebrows. The size CONTRAST is the hierarchy the
   walkthrough said was missing. */
function Section({ title, action, children }: { title: string; action?: { label: string; href: string }; children: React.ReactNode }): React.ReactElement {
  return (
    <section className="v-module">
      <div className="flex items-end justify-between gap-3">
        <h2 className="v-section-title">{title}</h2>
        {action ? <Link href={action.href} className="v-eyebrow whitespace-nowrap pb-1 no-underline transition-colors hover:text-primary" style={{ letterSpacing: '0.08em' }}>{action.label}</Link> : null}
      </div>
      <div className="v-section-rule" aria-hidden />
      {children}
    </section>
  );
}

// V-SPACE-FLOW: games are DE-EMPHASIZED - one compact module at canonical
// position 11 (last content block). The space's OWN quizzes come first (real
// shelf, credited "by {curator} of {space}" when the creator is a member), then
// the game links, then the in-space create entry.
export async function GameWidgets({ space }: { space: Space }): Promise<React.ReactElement | null> {
  const { group, surfaces } = space;
  const links = [
    surfaces.quiz && { href: `/${group.slug}-quiz`, label: 'Quizzes', target: 'group-quiz' as CrossPromoTarget },
    surfaces.blindtest && { href: `/blindtest/group-${group.slug}`, label: 'Blind test', target: 'blindtest' as CrossPromoTarget },
    surfaces.nameAll && { href: `/games/name-all/${group.slug}`, label: 'Name them all', target: 'name-all' as CrossPromoTarget },
    surfaces.personality && { href: `/personality/${group.slug}`, label: 'Which member', target: 'games' as CrossPromoTarget },
  ].filter(Boolean) as { href: string; label: string; target: CrossPromoTarget }[];
  const shelf = await getSpaceQuizzes(group.id, 3);
  if (!links.length && !shelf.length) return null;
  return (
    <Section title="Play">
      {shelf.length > 0 ? (
        <ul className="mb-3 space-y-1.5">
          {shelf.map((q) => (
            <li key={q.id}>
              <VerseGameLink target={'group-quiz' as CrossPromoTarget} href={`/q/${q.slug}`} className="group inline-flex flex-wrap items-baseline gap-x-2 no-underline">
                <span className="text-sm font-bold" style={{ color: 'var(--verse-ink)' }}>{q.title}</span>
                <span className="text-[11.5px] text-tertiary">
                  {q.displayName ? (q.spaceRole ? `by ${q.displayName} of ${group.fandom_name}` : `by ${q.displayName}`) : null}
                  {q.playCount > 0 ? `${q.username ? ' · ' : ''}${q.playCount.toLocaleString('en-US')} plays` : null}
                </span>
              </VerseGameLink>
            </li>
          ))}
        </ul>
      ) : null}
      {links.length > 0 ? (
        <>
          <p className="text-sm text-secondary">Test your {group.name} knowledge:</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-5 gap-y-1">
            {links.map((t) => (
              <VerseGameLink key={t.href} target={t.target} href={t.href}
                className="inline-flex min-h-[44px] items-center text-sm font-bold no-underline transition-opacity hover:opacity-75"
                style={{ color: 'var(--verse-ink)' }}>
                {t.label}
              </VerseGameLink>
            ))}
          </div>
        </>
      ) : null}
      <Link href={`/verse/${group.slug}/create`} className="mt-1 inline-flex min-h-[44px] items-center gap-1 text-[13px] font-semibold no-underline text-tertiary transition-colors hover:text-primary">
        Make a {group.name} quiz for the space
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M6 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </Link>
    </Section>
  );
}

interface MemberRow { member?: number | string; photo?: unknown; name?: unknown; link?: unknown }

// V-BUILDER-3 step 4: the member grid honors the curator's draft/published edits -
// ORDER + per-member photo/name/link overrides (co-design 7). Empty props render
// byte-identically to the entity roster (parity). Two invariants hold: (1) the link
// stays keyed to the ENTITY slug (the real member page) unless the curator explicitly
// set a link, so a display-name override never breaks the page link; (2) photo overrides
// ride the step-3 image rail and resolve through the fail-closed gate (never a hotlink,
// nothing on hide/removal). Only active members render (governance: inactive = 404).
export async function MembersStrip({ space, placement }: { space: Space; placement?: ModulePlacement }): Promise<React.ReactElement | null> {
  const { group, idols } = space;
  if (!idols.length) return null;

  const rows = (Array.isArray(placement?.props?.rows) ? placement!.props!.rows : []) as MemberRow[];
  const ovById = new Map<number, MemberRow>();
  for (const r of rows) { const mid = Number(r?.member); if (mid) ovById.set(mid, r); }

  const photoPaths = rows.map((r) => (typeof r?.photo === 'string' ? r.photo : '')).filter(Boolean);
  const railUrls = photoPaths.length ? await resolveSpaceImages(photoPaths) : {};

  const byId = new Map(idols.map((m) => [m.id, m] as const));
  const ordered: typeof idols = [];
  const seen = new Set<number>();
  for (const r of rows) { const m = byId.get(Number(r?.member)); if (m && !seen.has(m.id)) { ordered.push(m); seen.add(m.id); } }
  for (const m of idols) { if (!seen.has(m.id)) ordered.push(m); }

  return (
    <Section title="Members">
      <ul className="v-grid-media">
        {ordered.map((m) => {
          const ov = ovById.get(m.id);
          const name = ov && typeof ov.name === 'string' && ov.name.trim() ? ov.name.trim() : m.name;
          const photo = ov && typeof ov.photo === 'string' && railUrls[ov.photo] ? railUrls[ov.photo] : m.photo_url;
          const href = ov && typeof ov.link === 'string' && ov.link.trim() ? ov.link.trim() : `/verse/${group.slug}/members/${m.slug}`;
          return (
            <li key={m.id}>
              <Link href={href} className="group block no-underline">
                <div className="aspect-[3/4] w-full overflow-hidden rounded-[var(--v-radius-media)]" style={{ background: 'var(--verse-soft)' }}>
                  {photo
                    ? <img src={photo} alt={name} className="v-zoom h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]" loading="lazy" />
                    : <span className="flex h-full w-full items-center justify-center text-xl font-bold" style={{ color: 'var(--verse-ink)' }}>{name.slice(0, 2)}</span>}
                </div>
                <span className="mt-2 block truncate text-[13.5px] font-semibold text-primary">{name}</span>
                {m.name_hangul ? <span className="block truncate text-[11.5px] text-tertiary">{m.name_hangul}</span> : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}

export function Discography({ space }: { space: Space }): React.ReactElement | null {
  const { group, albums } = space;
  const recent = albums.filter((a) => a.release_date).slice(0, 6);
  if (!recent.length) return null;
  // No hairline rows inside a filled box (chrome must not compete with the card
  // edge): the grid + type hierarchy carry the rhythm.
  return (
    <Section title="Latest releases" action={{ label: `All ${albums.length}`, href: `/verse/${group.slug}/discography` }}>
      <ul className="v-grid-cards">
        {recent.map((a) => (
          <li key={a.id}>
            <Link href={`/verse/${group.slug}/albums/${a.slug}`} className="group block no-underline">
              <span className="block text-[14.5px] font-semibold leading-snug" style={{ color: 'var(--verse-ink)' }}>{a.title}</span>
              <span className="mt-0.5 block text-[11.5px] uppercase tracking-wide text-tertiary">
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
    <WidgetShell eyebrow="On this day">
      <ul className="space-y-2 text-sm text-secondary">
        {entries.map((e, i) => (
          <li key={i} className="leading-snug">{e.label}{e.yearsAgo ? <span className="text-tertiary"> · {e.yearsAgo}y ago</span> : null}</li>
        ))}
      </ul>
    </WidgetShell>
  );
}

/* V-POLISH-2 C1 - THE OVERSIZED VITALS BAND (owner-approved signature).
   Display-scale tabular numerals, uppercase micro-labels, exactly ONE accent
   rule, and the sourcing line saying the quiet part loud. Boldness from scale
   and rhythm; no glow, no gradient. Works in the rail (wraps to a column) and
   at main width (one band). */
export function StatsFlex({ space }: { space: Space }): React.ReactElement {
  const { counts, group } = space;
  const est = group.inception_date ? group.inception_date.slice(0, 4) : null;
  const stats = [
    ...(est ? [{ n: est, l: 'est.' }] : []),
    { n: String(counts.members), l: 'members' },
    { n: String(counts.albums), l: 'releases' },
    { n: String(counts.tracks), l: 'tracks' },
  ];
  return (
    <WidgetShell eyebrow="In numbers">
      <div className="h-[3px] w-12" style={{ background: 'var(--verse-cta, var(--verse-accent))' }} aria-hidden />
      <div className="mt-4 flex flex-wrap gap-x-10 gap-y-5">
        {stats.map((s) => (
          <div key={s.l}>
            <div className="font-extrabold leading-none tabular-nums" style={{ fontSize: 'clamp(2.5rem, 4.2vw, 3.6rem)', letterSpacing: '-0.03em', color: 'var(--verse-ink)' }}>{s.n}</div>
            <div className="mt-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-tertiary">{s.l}</div>
          </div>
        ))}
      </div>
      <p className="mt-4 text-[11.5px] text-tertiary">Every number sourced · Wikidata + MusicBrainz, both CC0</p>
    </WidgetShell>
  );
}

export function MastheadInvite({ space }: { space: Space }): React.ReactElement {
  return (
    <WidgetShell eyebrow="Curators">
      <p className="leading-relaxed text-secondary" style={{ fontSize: 'var(--v-type-body)', maxWidth: 'var(--v-measure)' }}>
        This space is looking for its founding {space.group.fandom_name} curators. Run it, and get credited for it.
      </p>
      <a href={`/login?returnTo=${encodeURIComponent(`/verse/${space.group.slug}`)}`} className="mt-1 inline-flex min-h-[44px] items-center gap-1 py-1 text-sm font-bold no-underline" style={{ color: 'var(--verse-ink)' }}>
        Become a curator
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M6 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </a>
      {/* V-TRUST step 2: the covenant at the in-space decision moment. Always shown. */}
      <a href="/verse/promises" className="mt-1 inline-flex min-h-[36px] items-center gap-1 py-1 text-xs font-semibold no-underline" style={{ color: 'var(--verse-brand-text)' }}>
        Before you build: what we promise you
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M6 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </a>
    </WidgetShell>
  );
}

export const MODULE_RENDERERS: Record<string, (props: { space: Space; placement?: ModulePlacement }) => React.ReactElement | null | Promise<React.ReactElement | null>> = {
  game_widgets: GameWidgets,
  members: MembersStrip,
  discography: Discography,
  on_this_day: OnThisDay,
  stats: StatsFlex,
  masthead: MastheadInvite,
};
