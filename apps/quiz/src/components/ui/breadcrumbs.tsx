import Link from 'next/link';

import { jsonLdScript } from '@/lib/verse/jsonld';

export interface BreadcrumbItem {
  label: string;
  /** Omit `href` for the last (current) item. */
  href?: string;
}

interface Props {
  items: BreadcrumbItem[];
  /** The site origin of the JSON-LD item URLs. Default: the kpop site's. */
  origin?: string;
}

/**
 * Breadcrumb navigation with inline `BreadcrumbList` JSON-LD. Renders a
 * visible `<nav>` for users and a `<script>` tag for search engines. The
 * final item is rendered as plain text (no link) since it represents the
 * current page.
 */
export function Breadcrumbs({ items, origin = 'https://kpopquiz.org' }: Props): React.ReactElement | null {
  if (items.length === 0) return null;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.label,
      ...(item.href ? { item: `${origin}${item.href}` } : {}),
    })),
  };

  return (
    <>
      {/* QA class 4: user-authored labels (essay/thread/wiki/quiz titles) reach this
          JSON-LD sink; jsonLdScript escapes < > & so a title cannot break out. */}
      {jsonLdScript(jsonLd)}
      <nav aria-label="Breadcrumb" className="mb-4">
        <ol className="flex flex-wrap items-center gap-1 text-xs text-tertiary">
          {items.map((item, i) => (
            <li key={i} className="flex items-center gap-1">
              {i > 0 && <span className="text-ghost" aria-hidden="true">/</span>}
              {item.href ? (
                <Link
                  href={item.href}
                  className="hover:text-accent transition-colors"
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  className="text-secondary font-medium truncate max-w-[200px]"
                  aria-current="page"
                >
                  {item.label}
                </span>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </>
  );
}
