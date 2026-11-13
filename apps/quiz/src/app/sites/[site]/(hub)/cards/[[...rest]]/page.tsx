// KpopCards: the old addresses. Bunnyverse Cards became KpopCards at /kpopcards, so /cards and every sub-path (binder, help, report, c/<num> ...) redirect there,
// permanently (308), the query kept (?card=BV1-0042 of the report form). Unknown sub-paths go to the lobby. NET_CARDS off: 404 before this page (the route map).
import { permanentRedirect } from 'next/navigation';

import { oldCardsTarget } from '@/lib/cards/kc-paths';

// The [site] layout has generateStaticParams and dynamicParams = false (O1 guard), and a dynamic segment of its own with no generateStaticParams still answers 404 under it.
// The rule for every dynamic page of the hub: dynamicParams = true AND a generateStaticParams (the finite values when they are finite, else an empty list: rendered on first request).
export const dynamicParams = true;
export function generateStaticParams(): { rest: string[] }[] { return []; }

interface Props { params: Promise<{ rest?: string[] }>; searchParams: Promise<Record<string, string | string[] | undefined>> }

export default async function OldCardsRedirect({ params, searchParams }: Props): Promise<never> {
  const [{ rest }, q] = await Promise.all([params, searchParams]);
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(q)) for (const x of Array.isArray(v) ? v : v === undefined ? [] : [v]) qs.append(k, x);
  const target = oldCardsTarget(rest ?? []);
  permanentRedirect(qs.size ? `${target}?${qs.toString()}` : target);
}
