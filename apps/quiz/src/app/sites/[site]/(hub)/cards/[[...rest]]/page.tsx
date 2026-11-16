// KpopCards: the old addresses. Bunnyverse Cards became KpopCards at /kpopcards, so /cards and every sub-path (binder, help, report, c/<num> ...) redirect there,
// permanently (308), the query kept (?card=BV1-0042 of the report form). Unknown sub-paths go to the lobby. NET_CARDS off: 404 before this page (the route map).
import { permanentRedirect } from 'next/navigation';

import { oldCardsTarget } from '@/lib/cards/kc-paths';

// The [site] layout allows no param that was not generated at build (dynamicParams = false, O1 guard). An empty list of static params is not
// enough: a production server then answers every value with NoFallbackError (a 404; seen with next start on 2026-11-13). The rule of the
// hub's open-ended pages (as u/[username]): rendered per request, dynamicParams = true.
export const dynamic = 'force-dynamic';
export const dynamicParams = true;

interface Props { params: Promise<{ rest?: string[] }>; searchParams: Promise<Record<string, string | string[] | undefined>> }

export default async function OldCardsRedirect({ params, searchParams }: Props): Promise<never> {
  const [{ rest }, q] = await Promise.all([params, searchParams]);
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(q)) for (const x of Array.isArray(v) ? v : v === undefined ? [] : [v]) qs.append(k, x);
  const target = oldCardsTarget(rest ?? []);
  permanentRedirect(qs.size ? `${target}?${qs.toString()}` : target);
}
