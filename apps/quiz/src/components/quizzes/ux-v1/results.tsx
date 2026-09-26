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
  /** The server-rendered cards of this page (real <a href="/q/..."> links). */
  children: React.ReactNode;
  filters: P2Filters;
  /** Ids of the server page (a later page can shift by a play; never show a quiz twice). */
  ids: string[];
  hasNext: boolean;
  /** Total pages of the result, for "Page 2 of 9" (null when the count is unavailable). */
  pageCount: number | null;
}

/**
 * The result grid (A0's UxQuizGrid + UxQuizCard: photo cards on desktop, bordered
 * rows on phones) and its pagination. "Load more quizzes" is the real ?page=N+1
 * link (rel=next, what crawlers and no-JS visitors follow); once hydrated it appends
 * the next page in place from GET /api/ux-v1/p2/quizzes (same query as the page),
 * moves focus to the first new card and says how many were added. Pages after the
 * first also link back (rel=prev).
 */
export function P2Results({ children, filters, ids, hasNext, pageCount }: Props): React.ReactElement {
  const { pending } = useP2Nav();
  const announce = useAnnounce();
  const ready = useIsClient();
  const [extra, setExtra] = useState<P2Card[]>([]);
  const [next, setNext] = useState<number | null>(hasNext ? filters.page + 1 : null);
  const [loading, setLoading] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);
  const focusAt = useRef<number | null>(null);

  useEffect(() => {
    const i = focusAt.current;
    if (i === null) return;
    focusAt.current = null;
    gridRef.current?.querySelectorAll<HTMLAnchorElement>('a.ux-qcard')[i]?.focus();
  }, [extra]);

  const nextHref = next !== null ? p2Href(filters, { page: next }) : null;

  const more = async (e: React.MouseEvent<HTMLAnchorElement>): Promise<void> => {
    if (!isPlainClick(e) || next === null || !nextHref) return;
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/ux-v1/p2/quizzes?${p2Query(filters, next)}`);
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as P2PagePayload;
      const seen = new Set([...ids, ...extra.map((q) => q.id)]);
      const fresh = data.quizzes.filter((q) => !seen.has(q.id));
      focusAt.current = fresh.length ? ids.length + extra.length : null;
      setExtra((x) => [...x, ...fresh]);
      setNext(data.hasMore ? next + 1 : null);
      announce(fresh.length ? `${fresh.length} more quizzes loaded` : 'No more quizzes');
    } catch {
      window.location.assign(nextHref);
    } finally {
      setLoading(false);
    }
  };

  const busy = pending || loading;
  const prevHref = filters.page > 1 ? p2Href(filters, { page: filters.page - 1 }) : null;

  return (
    <div className={['p2-results', pending ? 'is-pending' : ''].filter(Boolean).join(' ')} aria-busy={busy} data-ready={ready ? '' : undefined}>
      <div ref={gridRef}>
        <UxQuizGrid stack className="p2-grid">
          {children}
          {extra.map((q) => <UxQuizCard key={q.id} quiz={q} />)}
        </UxQuizGrid>
      </div>
      {nextHref || prevHref ? (
        <div className="p2-more">
          {nextHref ? (
            <UxButton variant="ghost" size="lg" href={nextHref} rel="next" prefetch={false} onClick={(e) => { void more(e); }} aria-disabled={loading || undefined}>
              {loading ? 'Loading quizzes' : 'Load more quizzes'}
            </UxButton>
          ) : null}
          {prevHref ? (
            <p className="p2-pager">
              <Link href={prevHref} rel="prev" prefetch={false} className="ux-lnk">Previous page</Link>
              {pageCount !== null ? <span className="ux-num">Page {filters.page} of {pageCount}</span> : null}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
