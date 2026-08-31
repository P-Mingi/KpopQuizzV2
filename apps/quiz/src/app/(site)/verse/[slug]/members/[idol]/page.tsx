import Link from 'next/link';
import { SectionHeader } from '@/components/verse/primitives/section-header';
import { notFound } from 'next/navigation';

import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { SectionSurface } from '@/components/verse/editor/section-surface';
import { InfoboxCard } from '@/components/verse/editor/infobox-card';
import { DiscussionThread } from '@/components/verse/discussion-thread';
import { WatchButton } from '@/components/verse/watch-button';
import { MoreAboutThis } from '@/components/verse/pages/more-about-this';
import { getIdol } from '@/lib/verse/idol';
import { getSection } from '@/lib/verse/content';
import { renderTipTapJSON } from '@/lib/verse/render-content';
import { personLd, jsonLdScript } from '@/lib/verse/jsonld';

import type { IdolDetail } from '@/lib/verse/idol';
import type { Metadata } from 'next';

export const revalidate = 3600;

export async function generateMetadata({ params }: { params: Promise<{ slug: string; idol: string }> }): Promise<Metadata> {
  const { slug, idol } = await params;
  const d = await getIdol(slug, idol);
  if (!d) return { title: 'Member' };
  const title = `${d.name} (${d.group.name}) - profile`;
  return {
    title,
    description: `${d.name} of ${d.group.name}: ${d.positions.join(', ') || 'member'}. Sourced facts, discography and fan stats.`,
    alternates: { canonical: `https://kpopquiz.org/verse/${slug}/members/${idol}` },
  };
}

/**
 * WHAT FANS KNOW: real per-idol fan behavior, the data no competitor has. Each
 * cell is individually min-gated (hidden below its gate, never zero-padded); the
 * whole block hides when no cell qualifies. Nothing here is faked or estimated.
 */
function FanKnows({ d }: { d: IdolDetail }): React.ReactElement | null {
  const { biasCount, personalityRank, nameRecognitionPct, nameRounds } = d.fanStats;
  const cells: { value: string; label: string; sub?: string }[] = [];
  if (nameRecognitionPct != null) cells.push({ value: `${nameRecognitionPct}%`, label: `${d.group.fandom_name} name ${d.name} right`, sub: `from ${nameRounds} rounds` });
  if (biasCount != null) cells.push({ value: String(biasCount), label: `${d.group.fandom_name} bias ${d.name}` });
  if (personalityRank != null) cells.push({ value: `#${personalityRank}`, label: 'most-gotten personality match' });
  if (cells.length === 0) return null;

  return (
    <section className="mb-6">
      <h2 className="v-section-title">What {d.group.fandom_name} know</h2>
      <div className="v-section-rule" aria-hidden />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {cells.map((c, i) => (
          <div key={i} className="rounded-xl border border-default bg-surface p-4" style={{ borderColor: 'var(--verse-line)' }}>
            <div className="text-2xl font-extrabold tabular-nums" style={{ color: 'var(--verse-ink)' }}>{c.value}</div>
            <div className="mt-0.5 text-xs text-secondary">{c.label}</div>
            {c.sub ? <div className="mt-0.5 text-[10px] text-tertiary">{c.sub}</div> : null}
          </div>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-tertiary">From real fan activity on KpopQuiz. Updates as more fans play.</p>
    </section>
  );
}

export default async function IdolPage({ params }: { params: Promise<{ slug: string; idol: string }> }): Promise<React.ReactElement> {
  const { slug, idol } = await params;
  const d = await getIdol(slug, idol);
  if (!d) notFound();

  const lore = await getSection('idol', String(d.id), 'lore');
  const loreHtml = lore.content ? renderTipTapJSON(lore.content) : '';

  return (
    <article className="mt-2">
      {jsonLdScript(personLd({
        name: d.name, groupSlug: slug, idolSlug: idol, groupName: d.group.name,
        birth_date: d.birth_date, nationality: d.facts.find((f) => f.field === 'nationality')?.value ?? null,
      }))}
      <Breadcrumbs items={[{ label: 'Verse', href: '/verse' }, { label: d.group.fandom_name, href: `/verse/${slug}` }, { label: 'Members', href: `/verse/${slug}/members` }, { label: d.name }]} />
      <Link href={`/verse/${slug}/members`} className="mb-4 mt-2 inline-block text-xs font-semibold text-secondary no-underline hover:text-primary">‹ {d.group.fandom_name} members</Link>

      {/* Header */}
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end">
        <div className="h-32 w-32 shrink-0 overflow-hidden rounded-2xl border border-default" style={{ borderColor: 'var(--verse-line)' }}>
          {d.photo_url
            ? <img src={d.photo_url} alt={d.name} className="h-full w-full object-cover" />
            : <span className="flex h-full w-full items-center justify-center text-3xl font-bold" style={{ background: 'var(--verse-soft)', color: 'var(--verse-ink)' }}>{d.name.slice(0, 2)}</span>}
        </div>
        <div className="min-w-0">
          <h1 className="text-3xl font-extrabold leading-none" style={{ color: 'var(--verse-ink)' }}>{d.name}</h1>
          {(d.name_hangul || d.name_romanized) ? <p className="mt-1 text-sm text-tertiary">{[d.name_hangul, d.name_romanized].filter(Boolean).join('  ·  ')}</p> : null}
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Link href={`/verse/${slug}`} className="rounded-full px-2.5 py-0.5 text-xs font-semibold no-underline" style={{ background: 'var(--verse-soft)', color: 'var(--verse-ink)' }}>{d.group.name}</Link>
            {d.unitName ? <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ background: 'var(--verse-soft)', color: 'var(--verse-ink)' }}>{d.unitName}</span> : null}
            {d.positions.map((p) => <span key={p} className="rounded-full border px-2.5 py-0.5 text-xs font-medium text-secondary" style={{ borderColor: 'var(--verse-line)' }}>{p}</span>)}
          </div>
        </div>
      </header>

      {/* V4 Part 1 item 2 - the reorganization. The rail is STICKY and stays
          useful the whole scroll: typed facts, the in-group card (positions,
          unit, debut), the watch action. The content column reads in the
          ordered arc: identity (header) -> lore -> stats -> games -> siblings
          -> discussion. No void under the facts, no floating modules. */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <aside className="lg:col-span-1">
          <div className="flex flex-col gap-4 lg:sticky lg:top-[84px]">
            <InfoboxCard
              entityType="idol" entityId={String(d.id)}
              facts={d.facts} editableFields={d.editableFields}
            />
            <div className="verse-frame verse-frame-rounded">
              <SectionHeader kicker={<>In {d.group.name}</>} as="h2" />
              <dl className="flex flex-col gap-2 text-sm">
                {d.positions.length ? <div className="flex justify-between gap-3"><dt className="text-tertiary">Position</dt><dd className="text-right font-semibold text-primary">{d.positions.join(', ')}</dd></div> : null}
                {d.unitName ? <div className="flex justify-between gap-3"><dt className="text-tertiary">Unit</dt><dd className="font-semibold text-primary">{d.unitName}</dd></div> : null}
                {d.group.inception_date ? <div className="flex justify-between gap-3"><dt className="text-tertiary">Debut</dt><dd className="font-semibold tabular-nums text-primary">{d.group.inception_date.slice(0, 4)}</dd></div> : null}
              </dl>
              <div className="mt-3"><WatchButton entityType="idol" entityId={String(d.id)} /></div>
            </div>
          </div>
        </aside>

        <div className="lg:col-span-2">
          {/* 1. LORE: the fan-written identity leads. */}
          <SectionSurface
            entityType="idol" entityId={String(d.id)} section="lore"
            label={`What ${d.group.fandom_name} knows about ${d.name}`}
            initialHtml={loreHtml} initialContent={lore.content} baseRevisionId={lore.currentRevisionId}
            locked={lore.locked} lockReason={lore.lockReason} groupSlug={slug} titleStyle="title"
            emptyInvite={`Fan-written lore and starter facts about ${d.name} live here, credited to their authors.`}
          />

          {/* 2. STATS: what the fandom's play behavior says. */}
          <FanKnows d={d} />

          {/* Games row */}
          <section className="mb-6">
            <h2 className="v-section-title">Play {d.group.name}</h2>
            <div className="v-section-rule" aria-hidden />
            <div className="flex flex-wrap gap-3">
              <Link href={`/${d.group.slug}-quiz`} className="verse-tile rounded-xl border border-default bg-surface px-4 py-3 text-sm font-semibold no-underline" style={{ color: 'var(--verse-ink)' }}>Quizzes</Link>
              <Link href={`/games/name-all/${d.group.slug}`} className="verse-tile rounded-xl border border-default bg-surface px-4 py-3 text-sm font-semibold no-underline" style={{ color: 'var(--verse-ink)' }}>Name them all</Link>
              <Link href={`/blindtest/group-${d.group.slug}`} className="verse-tile rounded-xl border border-default bg-surface px-4 py-3 text-sm font-semibold no-underline" style={{ color: 'var(--verse-ink)' }}>Blind test</Link>
            </div>
          </section>

          {/* Related members */}
          {d.bandmates.length ? (
            <section>
              <h2 className="v-section-title">Other members</h2>
              <div className="v-section-rule" aria-hidden />
              <div className="flex flex-wrap gap-3">
                {d.bandmates.map((s) => (
                  <Link key={s.slug} href={`/verse/${slug}/members/${s.slug}`} className="group w-16 shrink-0 no-underline">
                    <div className="aspect-square w-full overflow-hidden rounded-lg border border-default" style={{ borderColor: 'var(--verse-line)' }}>
                      {s.photo_url ? <img src={s.photo_url} alt={s.name} className="h-full w-full object-cover" loading="lazy" /> : <span className="flex h-full w-full items-center justify-center text-xs font-bold" style={{ background: 'var(--verse-soft)', color: 'var(--verse-ink)' }}>{s.name.slice(0, 2)}</span>}
                    </div>
                    <span className="mt-1 block truncate text-center text-[11px] text-secondary">{s.name}</span>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}

          {/* DOOR 3 (V-HARMONY-2A): pages that reference this member (fancam
              logs, choreo notes, era pages...); min-gated to null when none. */}
          <div className="mt-6">
            <MoreAboutThis groupId={d.group.id} groupSlug={slug} entityRef={`idol:${idol}`} entityLabel={d.name} />
          </div>

          <div className="mt-6 border-t pt-4" style={{ borderColor: 'var(--verse-line)' }}>
            <DiscussionThread entityType="idol" entityId={String(d.id)} groupId={d.group.id} />
          </div>
        </div>
      </div>
    </article>
  );
}
