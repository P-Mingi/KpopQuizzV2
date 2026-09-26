'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

import { UxButton } from '@/components/ux-v1/button';
import { UxQuizCard, UxQuizGrid } from '@/components/ux-v1/quiz-card';
import { useAnnounce } from '@/components/ux-v1/toast';
import { useIsClient } from '@/components/ux-v1/use-is-client';
import { p2Href, p2Query } from '@/lib/ux-v1/p2/filters';

import { isPlainClick, useP2Nav } from './nav-context';

import type { P2Card, P2Filters, P2PagePayload } from '@/lib/ux-v1/p2/filters';

interface Props {
  /** The server-rendered cards (real <a href="/q/..."> links) of pages 1..filters.page. */
  children: React.ReactNode;
  /** The filters; `page` = how many pages the server rendered. */
  filters: P2Filters;
  /** Ids already shown (a later page can shift by a play; never show a quiz twice). */
  ids: string[];
  hasNext: boolean;
  /** Total pages of the result, for "Page 2 of 9" (null when the count is unavailable). */
  pageCount: number | null;
}

/**
 * The result grid (A0's UxQuizGrid + UxQuizCard: photo cards on desktop, bordered
 * rows on phones) and its pagination. /quizzes?page=N shows pages 1..N, so "Load
 * more quizzes" is the real ?page=N+1 link (rel=next: crawlers and no-JS visitors
 * follow it and get the same list). Once hydrated it appends page N+1 in place
 * from GET /api/ux-v1/p2/quizzes (same query as the page), updates the address to
 * ?page=N+1 (a reload shows the same list), moves focus to the first new card and
 * says how many were added. From page 2 on, "Previous page" (rel=prev) goes back.
 */
export function P2Results({ children, filters, ids, hasNext, pageCount }: Props): React.ReactElement {
  const { pending } = useP2Nav();
  const announce = useAnnounce();
  const ready = useIsClient();
  const [extra, setExtra] = useState<P2Card[]>([]);
  const [shown, setShown] = useState(filters.page);
  const [more, setMore] = useState(hasNext);
  const [loading, setLoading] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);
  const focusAt = useRef<number | null>(null);

  useEffect(() => {
    const i = focusAt.current;
    if (i === null) return;
    focusAt.current = null;
    gridRef.current?.querySelectorAll<HTMLAnchorElement>('a.ux-qcard')[i]?.focus();
  }, [extra]);

  const nextHref = more ? p2Href(filters, { page: shown + 1 }) : null;
  const prevHref = shown > 1 ? p2Href(filters, { page: shown - 1 }) : null;

  const loadMore = async (e: React.MouseEvent<HTMLAnchorElement>): Promise<void> => {
    if (!isPlainClick(e) || !nextHref) return;
    e.preventDefault();
    if (loading) return;
    const page = shown + 1;
    setLoading(true);
    try {
      const res = await fetch(`/api/ux-v1/p2/quizzes?${p2Query(filters, page)}`);
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as P2PagePayload;
      const seen = new Set([...ids, ...extra.map((q) => q.id)]);
      const fresh = data.quizzes.filter((q) => !seen.has(q.id));
      focusAt.current = fresh.length ? ids.length + extra.length : null;
      setExtra((x) => [...x, ...fresh]);
      setShown(page);
      setMore(data.hasMore);
      // Keep the address in step with the list (Next syncs a native replaceState).
      window.history.replaceState(null, '', nextHref);
      announce(fresh.length ? `${fresh.length} more quizzes loaded` : 'No more quizzes');
    } catch {
      window.location.assign(nextHref);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={['p2-results', pending ? 'is-pending' : ''].filter(Boolean).join(' ')} aria-busy={pending || loading} data-ready={ready ? '' : undefined}>
      <div ref={gridRef}>
        <UxQuizGrid stack className="p2-grid">
          {children}
          {extra.map((q) => <UxQuizCard key={q.id} quiz={q} />)}
        </UxQuizGrid>
      </div>
      {nextHref || prevHref ? (
        <div className="p2-more">
          {nextHref ? (
            <UxButton variant="ghost" size="lg" href={nextHref} rel="next" prefetch={false} onClick={(e) => { void loadMore(e); }} aria-disabled={loading || undefined}>
              {loading ? 'Loading quizzes' : 'Load more quizzes'}
            </UxButton>
          ) : null}
          {prevHref ? (
            <p className="p2-pager">
              {pageCount !== null ? <span className="ux-num">Page {shown} of {pageCount}</span> : null}
              <Link href={prevHref} rel="prev" prefetch={false} className="ux-lnk">Previous page</Link>
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
