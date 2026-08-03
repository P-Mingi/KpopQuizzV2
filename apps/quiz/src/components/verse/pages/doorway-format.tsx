// V-HARMONY-2A step 4 - THE doorway renderer. One component, four formats. The
// SEO INVARIANT (LAW) is enforced HERE, structurally: every branch emits
// <Link href={it.href}>{it.title}</Link> for each item, so the crawlable HTML
// always carries the real href + true title regardless of the curator's chosen
// format. Format changes only the wrapper skin; a custom section heading changes
// the <h2> label, never a target's title. This is why a richly-configured space
// and a default space emit an identical set of hrefs + link text.
//
// COLLAPSE (step 6, owner ruling): a curator can DE-EMPHASIZE a door with a
// native <details> disclosure. This is NOT a hide - the items (with their hrefs
// + titles) render inside <details> and stay in the crawlable HTML whether the
// disclosure is open or closed; the browser only visually collapses them. So the
// SEO invariant holds in both states. <details>/<summary> is natively keyboard-
// operable (the summary is focusable; Enter/Space toggles), so the door stays
// accessible.
import Link from 'next/link';

import { SectionHeader } from '@/components/verse/primitives/section-header';

import type { DoorwayFormat } from '@/lib/verse/presentation/doorways';

export interface DoorwayItem {
  href: string;
  title: string;
  sub?: string | undefined;
}

const linkTitle = 'text-sm font-semibold no-underline hover:underline';
const cardTitle = 'block text-[14.5px] font-bold';
const subCls = 'mt-0.5 block text-[12px] text-tertiary';

/** The format-specific item markup, shared by the open and collapsed shells.
 * EVERY branch emits <Link href={it.href}>{it.title}</Link> per item - this is
 * where the SEO invariant lives. */
function DoorwayBody({ items, format }: { items: DoorwayItem[]; format: DoorwayFormat }): React.ReactElement {
  if (format === 'button') {
    return (
      <div className="flex flex-wrap gap-2">
        {items.map((it) => (
          <Link key={it.href} href={it.href} className="v-tap inline-flex min-h-[36px] items-center rounded-full border px-4 text-xs font-bold no-underline" style={{ borderColor: 'var(--verse-line)', color: 'var(--verse-ink)' }}>
            {it.title}
          </Link>
        ))}
      </div>
    );
  }
  if (format === 'feature') {
    // The first item is the hero (the one the curator most wants clicked); the
    // rest stay as quiet links so their hrefs remain in the HTML.
    return (
      <div className="flex flex-col gap-3">
        {items.map((it, i) => (i === 0 ? (
          <Link key={it.href} href={it.href} className="block rounded-2xl border p-5 no-underline transition-colors hover:bg-[var(--verse-soft)]" style={{ borderColor: 'var(--verse-line)', background: 'var(--verse-soft)' }}>
            <span className="block text-lg font-extrabold" style={{ color: 'var(--verse-ink)' }}>{it.title}</span>
            {it.sub ? <span className="mt-1 block text-[13px] text-tertiary">{it.sub}</span> : null}
          </Link>
        ) : (
          <Link key={it.href} href={it.href} className={linkTitle} style={{ color: 'var(--verse-ink)' }}>
            {it.title}{it.sub ? <span className="ml-2 text-[12px] text-tertiary">{it.sub}</span> : null}
          </Link>
        )))}
      </div>
    );
  }
  if (format === 'card') {
    return (
      <div className="v-grid-cards">
        {items.map((it) => (
          <Link key={it.href} href={it.href} className="group -mx-2 rounded-xl px-2 py-1.5 no-underline transition-colors hover:bg-[var(--verse-soft)]">
            <span className={cardTitle} style={{ color: 'var(--verse-ink)' }}>{it.title}</span>
            {it.sub ? <span className={subCls}>{it.sub}</span> : null}
          </Link>
        ))}
      </div>
    );
  }
  // link (default, quiet inline list)
  return (
    <ul className="flex flex-col gap-1.5">
      {items.map((it) => (
        <li key={it.href}>
          <Link href={it.href} className={linkTitle} style={{ color: 'var(--verse-ink)' }}>{it.title}</Link>
          {it.sub ? <span className="ml-2 text-[12px] text-tertiary">{it.sub}</span> : null}
        </li>
      ))}
    </ul>
  );
}

export function DoorwayList({ heading, items, format, action, as = 'h2', collapsed = false }: {
  heading: React.ReactNode;
  items: DoorwayItem[];
  format: DoorwayFormat;
  action?: React.ReactNode | undefined;
  as?: 'h2' | 'h3';
  /** De-emphasize as a native <details> disclosure. Links stay in the HTML. */
  collapsed?: boolean;
}): React.ReactElement {
  const body = <DoorwayBody items={items} format={format} />;

  if (collapsed) {
    return (
      <details className="v-module group">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
          {/* heading content is allowed in <summary>; keep the eyebrow look */}
          <Tag as={as} className="v-eyebrow" style={{ margin: 0 }}>{heading}</Tag>
          <svg aria-hidden viewBox="0 0 20 20" width="16" height="16" className="shrink-0 text-tertiary transition-transform group-open:rotate-180" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M5 8l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </summary>
        <div className="mt-3">
          {action ? <div className="mb-2 text-right text-[12px] font-semibold" style={{ color: 'var(--verse-ink)' }}>{action}</div> : null}
          {body}
        </div>
      </details>
    );
  }

  return (
    <section className="v-module">
      <SectionHeader kicker={heading} as={as} action={action} />
      {body}
    </section>
  );
}

/** Tiny tag helper so the collapsed summary heading keeps the same document
 * outline (h2/h3) the open SectionHeader would emit. */
function Tag({ as, className, style, children }: { as: 'h2' | 'h3'; className?: string; style?: React.CSSProperties; children: React.ReactNode }): React.ReactElement {
  const T = as;
  return <T className={className} style={style}>{children}</T>;
}
