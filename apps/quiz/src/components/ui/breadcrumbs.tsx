import Link from 'next/link';

export interface BreadcrumbItem {
  label: string;
  /** Omit `href` for the last (current) item. */
  href?: string;
}

interface Props {
  items: BreadcrumbItem[];
}

/**
 * Breadcrumb navigation with inline `BreadcrumbList` JSON-LD. Renders a
 * visible `<nav>` for users and a `<script>` tag for search engines. The
 * final item is rendered as plain text (no link) since it represents the
 * current page.
 */
export function Breadcrumbs({ items }: Props): React.ReactElement | null {
  if (items.length === 0) return null;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.label,
      ...(item.href ? { item: `https://kpopquiz.org${item.href}` } : {}),
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
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
