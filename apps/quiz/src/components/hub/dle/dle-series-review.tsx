'use client';

// Lot 3 DLE (owner request of 2026-11-14): the series pictures that remain after the non-free deletion, for the owner to check, in the same private
// preview as the pictures that are not free. Asked for AFTER the page, only when the server said this build may offer the preview (PRIVATE_LAUNCH=1 on
// the hub), on the general Otakudle page only. Anyone but the verified admin gets a 404 and nothing is drawn. Read only: no button here writes anything.
// Owner copy, in French (the admin's language).
import { useEffect, useState } from 'react';

import { seriesImageUrl, seriesIndexUrl } from '@/lib/dle/preview';

import type { SeriesReviewItem } from '@/lib/entity-images/series-review';

/** The line under a picture about its source: the host, or why there is none. */
export function sourceLine(i: Pick<SeriesReviewItem, 'source' | 'host'>): string {
  return i.source === 'host' && i.host ? `Source : ${i.host}` : i.source === 'unreadable' ? 'Source : adresse illisible' : 'Source : aucune';
}

/** Keeps only well-formed items of an index answer (the browser trusts nothing it did not shape). */
export function seriesItemsOf(series: unknown): SeriesReviewItem[] {
  if (!Array.isArray(series)) return [];
  return series.flatMap((s): SeriesReviewItem[] => {
    const o = s as Partial<SeriesReviewItem> | null;
    if (!o || typeof o.slug !== 'string' || typeof o.license !== 'string' || typeof o.verified !== 'boolean') return [];
    const source = o.source === 'host' || o.source === 'unreadable' ? o.source : 'none';
    return [{ slug: o.slug, license: o.license, verified: o.verified, source, host: typeof o.host === 'string' ? o.host : null }];
  });
}

export function SeriesReviewGrid({ items, base = '' }: { items: readonly SeriesReviewItem[]; base?: string }): React.ReactElement | null {
  if (items.length === 0) return null;
  const verified = items.filter((i) => i.verified).length;
  return (
    <section aria-labelledby="dle-sr-h" className="hub-dle-review">
      <h2 id="dle-sr-h">Aperçu privé : séries restantes</h2>
      <p>
        {items.length} séries, {verified} vérifiée{verified > 1 ? 's' : ''}, {items.length - verified} non vérifiée{items.length - verified > 1 ? 's' : ''}.
        Rien ici ne supprime ni ne modifie une image.
      </p>
      <ul>
        {items.map((i) => (
          <li key={i.slug}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={seriesImageUrl(base, i.slug)} alt="" width={96} height={128} loading="lazy" decoding="async" />
            <code>{i.slug}</code>
            <span>Licence : {i.license}</span>
            <span>{i.verified ? 'Vérifiée' : 'Non vérifiée'}</span>
            <span>{sourceLine(i)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function DleSeriesReview({ enabled }: { enabled: boolean }): React.ReactElement | null {
  const [items, setItems] = useState<SeriesReviewItem[]>([]);
  const base = process.env.__NEXT_ROUTER_BASEPATH || '';
  useEffect(() => {
    if (!enabled) return undefined;
    let alive = true;
    fetch(seriesIndexUrl(base), { credentials: 'same-origin', cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { ok?: boolean; series?: unknown } | null) => { if (alive && j && j.ok === true) setItems(seriesItemsOf(j.series)); })
      .catch(() => undefined);
    return () => { alive = false; };
  }, [enabled, base]);
  return enabled ? <SeriesReviewGrid items={items} base={base} /> : null;
}
