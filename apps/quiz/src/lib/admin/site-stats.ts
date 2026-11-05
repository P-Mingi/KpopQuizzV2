// ADMIN-2: the few real numbers the overview of a section shows. Every count is read for ONE named site (siteScope: the explicit site, never the
// build's), with the service-role client the page opens after its guards. A count that cannot be read is null and the page shows a dash: no
// invented number, no zero standing in for a failed read.
import { siteScope } from './site-scope';

import type { SiteId } from '@/lib/site/types';
import type { createServiceRoleClient } from '@/lib/supabase/server';

type Db = ReturnType<typeof createServiceRoleClient>;

export interface SiteCounts {
  readonly members: number | null;
  readonly published: number | null;
  readonly removed: number | null;
  readonly pendingReports: number | null;
  readonly groupsToReview: number | null;
}

async function head(q: PromiseLike<{ count: number | null; error: unknown }>): Promise<number | null> {
  try {
    const { count, error } = await q;
    return error ? null : (count ?? 0);
  } catch {
    return null;
  }
}

export async function readSiteCounts(db: Db, site: SiteId): Promise<SiteCounts> {
  const { forSite } = siteScope(site);
  const quizSite = site !== 'hub';
  const [members, published, removed, pendingReports, groupsToReview] = await Promise.all([
    head(db.from('world_memberships').select('user_id', { count: 'exact', head: true }).eq('site_id', site)),
    quizSite ? head(forSite(db.from('quizzes').select('id', { count: 'exact', head: true })).eq('status', 'published')) : Promise.resolve(null),
    quizSite ? head(forSite(db.from('quizzes').select('id', { count: 'exact', head: true })).eq('status', 'removed')) : Promise.resolve(null),
    quizSite ? head(forSite(db.from('reports').select('id', { count: 'exact', head: true })).eq('status', 'pending')) : Promise.resolve(null),
    quizSite ? head(forSite(db.from('groups').select('id', { count: 'exact', head: true })).eq('needs_review', true)) : Promise.resolve(null),
  ]);
  return { members, published, removed, pendingReports, groupsToReview };
}
