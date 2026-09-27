'use client';

import { useRouter, useSearchParams } from 'next/navigation';

import { UxDropdown } from '@/components/ux-v1/dropdown';
import { Segmented } from '@/components/ux-v1/segmented';

// Kit gallery: Segmented and UxDropdown with LINK options (P2 request 3). The pick
// lives in the URL (?kitsort, ?kittype); the counts are component states for the
// gallery. The server HTML is the Suspense fallback (default pick, real links); once
// hydrated the live version reads the URL.

const SORTS = [
  { value: 'trending', label: 'Trending' },
  { value: 'newest', label: 'Newest' },
  { value: 'played', label: 'Most played' },
  { value: 'rated', label: 'Top rated' },
];
const TYPES = [
  { value: 'classic', label: 'Classic', count: 1204 },
  { value: 'tf', label: 'True/false', count: 312 },
  { value: 'image', label: 'Image', count: 88 },
];

function kitHref(sort: string, type: string | null): string {
  const q = new URLSearchParams();
  if (sort !== 'trending') q.set('kitsort', sort);
  if (type) q.set('kittype', type);
  const s = q.toString();
  return s ? `/ux-v1/kit?${s}` : '/ux-v1/kit';
}

export function KitLinkControlsView({ sort, type, onNavigate }: {
  sort: string;
  type: string | null;
  onNavigate?: ((href: string, value: string) => void) | undefined;
}): React.ReactElement {
  return (
    <div className="ux-kit-row" style={{ marginTop: 20 }} data-kit="link-controls">
      <div>
        <span className="ux-kit-label">Segmented, link options (nav, aria-current)</span>
        <Segmented label="Sort (links)" value={sort} options={SORTS.map((o) => ({ ...o, href: kitHref(o.value, type) }))} />
      </div>
      <div>
        <span className="ux-kit-label">Dropdown, link options with counts</span>
        <UxDropdown label="Type (links)" value={type} options={TYPES.map((o) => ({ ...o, href: kitHref(sort, o.value) }))} onNavigate={onNavigate} />
      </div>
    </div>
  );
}

/** Live version: the pick comes from the URL; the dropdown shows the page-router hook. */
export function KitLinkControls(): React.ReactElement {
  const params = useSearchParams();
  const router = useRouter();
  return (
    <KitLinkControlsView
      sort={params.get('kitsort') ?? 'trending'}
      type={params.get('kittype')}
      onNavigate={(href) => {
        (window as unknown as { __kitLastNav?: string }).__kitLastNav = href;
        router.push(href, { scroll: false });
      }}
    />
  );
}
