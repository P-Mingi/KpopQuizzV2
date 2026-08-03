// V-HARMONY-2A step 4 - THE doorway renderer. One component, four formats. The
// SEO INVARIANT (LAW) is enforced HERE, structurally: every branch emits
// <Link href={it.href}>{it.title}</Link> for each item, so the crawlable HTML
// always carries the real href + true title regardless of the curator's chosen
// format. Format changes only the wrapper skin; a custom section heading changes
// the <h2> label, never a target's title. This is why a richly-configured space
// and a default space emit an identical set of hrefs + link text.
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

export function DoorwayList({ heading, items, format, action, as = 'h2' }: {
  heading: React.ReactNode;
  items: DoorwayItem[];
  format: DoorwayFormat;
  action?: React.ReactNode | undefined;
  as?: 'h2' | 'h3';
}): React.ReactElement {
  return (
    <section className="v-module">
      <SectionHeader kicker={heading} as={as} action={action} />
      {format === 'button' ? (
        <div className="flex flex-wrap gap-2">
          {items.map((it) => (
            <Link key={it.href} href={it.href} className="v-tap inline-flex min-h-[36px] items-center rounded-full border px-4 text-xs font-bold no-underline" style={{ borderColor: 'var(--verse-line)', color: 'var(--verse-ink)' }}>
              {it.title}
            </Link>
          ))}
        </div>
      ) : format === 'feature' ? (
        // The first item is the hero (the one the curator most wants clicked);
        // the rest stay as quiet links so their hrefs remain in the HTML.
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
      ) : format === 'card' ? (
        <div className="v-grid-cards">
          {items.map((it) => (
            <Link key={it.href} href={it.href} className="group -mx-2 rounded-xl px-2 py-1.5 no-underline transition-colors hover:bg-[var(--verse-soft)]">
              <span className={cardTitle} style={{ color: 'var(--verse-ink)' }}>{it.title}</span>
              {it.sub ? <span className={subCls}>{it.sub}</span> : null}
            </Link>
          ))}
        </div>
      ) : (
        // link (default, quiet inline list)
        <ul className="flex flex-col gap-1.5">
          {items.map((it) => (
            <li key={it.href}>
              <Link href={it.href} className={linkTitle} style={{ color: 'var(--verse-ink)' }}>{it.title}</Link>
              {it.sub ? <span className="ml-2 text-[12px] text-tertiary">{it.sub}</span> : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
