'use client';

import { useEffect, useState } from 'react';

// V-ATLAS step 3 - the Map / Index surface. One page, two views of the same
// graph. The Index (the crawlable, faceted page list) is the CONTENT. The Map
// is enhancement that "hydrates on top".
//
// Graceful degradation is the point: with NO JS, `ready` never flips, so BOTH
// the (static, still link-navigable) map and the full index render and stay
// usable - the crawlable list is always in the served HTML. With JS, the view
// collapses to the map by default and the Map / Index toggle switches between
// them; the inactive view is only `hidden`, never unmounted, so the index stays
// in the DOM for crawlers even in map view.
export function AtlasSurface({ mapSlot, indexSlot }: {
  mapSlot: React.ReactNode;
  indexSlot: React.ReactNode;
}): React.ReactElement {
  const [view, setView] = useState<'map' | 'index'>('map');
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);

  const seg = (v: 'map' | 'index', label: string) => (
    <button
      type="button" onClick={() => setView(v)} aria-pressed={view === v}
      className="rounded-full px-3.5 py-1.5 text-[13px] font-bold transition-colors"
      style={view === v
        ? { background: 'var(--verse-ink)', color: 'var(--bg-surface)' }
        : { color: 'var(--verse-ink)', background: 'transparent' }}
    >{label}</button>
  );

  return (
    <div>
      {/* The toggle is a JS enhancement; without JS both views simply show. */}
      {ready ? (
        <div role="group" aria-label="Atlas view" className="mb-4 inline-flex items-center gap-0.5 rounded-full p-0.5" style={{ border: '1px solid var(--verse-line)' }}>
          {seg('map', 'Map')}
          {seg('index', 'Index')}
        </div>
      ) : null}

      <div hidden={ready && view !== 'map'} aria-hidden={ready && view !== 'map'}>{mapSlot}</div>
      <div hidden={ready && view !== 'index'}>{indexSlot}</div>
    </div>
  );
}
