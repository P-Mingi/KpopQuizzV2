import Link from 'next/link';

import { splitTipTapForFold } from '@/lib/verse/render-content';
import { getKind } from '@/lib/verse/pages/kinds';
import { KPOP_PAGE_REGISTRY } from '@/lib/verse/pages/kpop-kinds';

import type { WikiPage } from '@/lib/verse/pages/data';
import { SourceChip } from '@/components/verse/source-chip';

import type { InfoboxFieldDef } from '@/lib/verse/pages/kinds';

// V-PAGES step 3 - the wiki leaf building blocks (server components, V-DESIGN
// box system: the infobox is a soft-surface card, prose stays open with the
// native fold; full text always in the served HTML).

/** The fan-written badge (owner gate 3): culture kinds carry it, always. */
export function FanWrittenBadge(): React.ReactElement {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-[0.08em]"
      style={{ background: 'var(--verse-soft)', color: 'var(--verse-ink)' }}>
      <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M12 21s-7-4.35-7-9.5A3.5 3.5 0 0 1 12 8a3.5 3.5 0 0 1 7 3.5C19 16.65 12 21 12 21z" /></svg>
      Fan-written
    </span>
  );
}

function fieldDisplay(f: InfoboxFieldDef, raw: unknown): { text: string; source?: string | undefined; href?: string | undefined } | null {
  if (raw == null || raw === '') return null;
  if (f.fact && typeof raw === 'object' && !Array.isArray(raw)) {
    const o = raw as { value?: unknown; source?: string };
    if (o.value == null || o.value === '') return null;
    return { text: String(o.value), source: typeof o.source === 'string' ? o.source : undefined };
  }
  if (f.type === 'url' && typeof raw === 'string') return { text: f.officialOnly ? 'Official link' : raw, href: raw };
  return { text: String(raw) };
}

/** The mini-infobox: typed fields with per-fact source links (provenance visible,
 * the trust currency). Renders nothing when every field is empty. */
export function WikiInfobox({ page }: { page: WikiPage }): React.ReactElement | null {
  const def = getKind(KPOP_PAGE_REGISTRY, page.kind);
  if (!def || def.infobox.length === 0) return null;
  const rows = def.infobox
    .map((f) => ({ f, d: fieldDisplay(f, page.infobox[f.key]) }))
    .filter((r): r is { f: InfoboxFieldDef; d: NonNullable<ReturnType<typeof fieldDisplay>> } => r.d !== null);
  if (rows.length === 0) return null;
  return (
    <div className="verse-frame verse-frame-rounded">
      <h2 className="v-eyebrow">{def.label}</h2>
      <dl className="flex flex-col gap-2.5">
        {rows.map(({ f, d }) => (
          <div key={f.key}>
            <dt className="text-[11px] font-semibold uppercase tracking-[0.08em] text-tertiary">{f.label}</dt>
            <dd className="mt-0.5 text-sm font-semibold" style={{ color: 'var(--verse-ink)' }}>
              {d.href ? (
                <a href={d.href} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex min-h-[28px] items-center gap-1 no-underline hover:underline" style={{ color: 'var(--verse-ink)' }}>
                  {d.text}
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M7 17L17 7M9 7h8v8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </a>
              ) : d.text}
              {d.source ? <span className="ml-1.5"><SourceChip href={d.source} /></span> : null}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/** The page body: full text in the served HTML always; long bodies fold with the
 * native details/summary (V-TEXT law: the fold is presentation only). */
export function WikiBody({ doc }: { doc: unknown }): React.ReactElement | null {
  const split = splitTipTapForFold(doc, 3);
  if (!split.previewHtml.replace(/<[^>]*>/g, '').trim()) return null;
  if (!split.restHtml) {
    return <div className="verse-prose" dangerouslySetInnerHTML={{ __html: split.previewHtml }} />;
  }
  return (
    <div>
      <div className="verse-prose" dangerouslySetInnerHTML={{ __html: split.previewHtml }} />
      <details className="v-fold">
        <summary><span className="v-fold-more">Read the full page</span><span className="v-fold-less">Show less</span></summary>
        <div className="verse-prose" dangerouslySetInnerHTML={{ __html: split.restHtml }} />
      </details>
    </div>
  );
}

/** The trust footer: last edited + history + discussion + attribution. Every
 * content page carries it (the Palworld lesson: provenance is the currency). */
export function TrustFooter({ page, groupSlug, maintainers, starterName }: {
  page: WikiPage; groupSlug: string; maintainers: number; starterName: string;
}): React.ReactElement {
  const edited = new Date(page.updated_at);
  const editedLabel = edited.toISOString().slice(0, 10);
  return (
    <footer className="border-t pt-4" style={{ borderColor: 'var(--v-hairline)', marginTop: 'var(--v-space-section)' }}>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[12.5px] text-tertiary">
        <span>Last edited <time dateTime={page.updated_at}>{editedLabel}</time></span>
        <Link href={`/verse/${groupSlug}/changes`} className="inline-flex min-h-[44px] items-center no-underline hover:text-secondary">History</Link>
        <Link href={`/verse/${groupSlug}/community`} className="inline-flex min-h-[44px] items-center no-underline hover:text-secondary">Discuss this page</Link>
        <span className="ml-auto">
          Started by <span className="font-semibold text-secondary">{starterName}</span>
          {maintainers > 1 ? <>, maintained by <span className="font-semibold text-secondary">{maintainers} fans</span></> : null}
        </span>
      </div>
    </footer>
  );
}

/** Curated related exits: 6-8 links + ONE index link, never a category wall. */
export function RelatedExits({ groupSlug, items }: {
  groupSlug: string;
  items: { href: string; label: string; sub?: string | undefined }[];
}): React.ReactElement | null {
  const shown = items.slice(0, 8);
  return (
    <section className="v-module" style={{ marginTop: 'var(--v-space-section)' }}>
      <h2 className="v-eyebrow">Go deeper</h2>
      {shown.length > 0 ? (
        <div className="v-grid-cards">
          {shown.map((it) => (
            <Link key={it.href} href={it.href} className="group -mx-2 rounded-xl px-2 py-1.5 no-underline transition-colors hover:bg-[var(--verse-soft)]">
              <span className="block text-[14.5px] font-bold" style={{ color: 'var(--verse-ink)' }}>{it.label}</span>
              {it.sub ? <span className="mt-0.5 block text-[12px] text-tertiary">{it.sub}</span> : null}
            </Link>
          ))}
        </div>
      ) : null}
      <Link href={`/verse/${groupSlug}/wiki`} className="mt-3 inline-flex min-h-[44px] items-center gap-1 text-sm font-bold no-underline" style={{ color: 'var(--verse-ink)' }}>
        All pages in this space
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M6 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </Link>
    </section>
  );
}
