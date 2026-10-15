// SEO Mission 3, part D, point 1: the nightly linked-URL guard. Each URL of the versioned list
// (linked-urls.ts) and of the link-data table (seo_linked_urls) is fetched from production and
// assessed (page-check.ts). A transient failure (network, 5xx) is retried once after a pause, so
// one slow response does not page anyone. Any failure left is one Discord ops alert.

import { seoAlert } from './alert';
import { SITE_ORIGIN } from './env';
import { LINKED_URLS } from './linked-urls';
import { assessOk, assessRedirect, isTransient, sitePath } from './page-check';
import { logWatchRun } from './runs';
import { isMissingRelation, serviceClientOrNull } from './store';

import type { AlertOutcome } from './alert';
import type { LinkedUrl } from './linked-urls';
import type { FetchedPage, Fetcher } from './page-check';
import type { WatchRun } from './runs';
import type { Svc } from './store';

export interface GuardFailure {
  path: string;
  reason: string;
}

export interface GuardReport {
  ok: boolean;
  dryRun: boolean;
  checked: number;
  fromTable: number | 'not_applied' | 'unavailable';
  failures: GuardFailure[];
  alert: AlertOutcome | 'none';
}

export interface GuardDeps {
  fetchPage: Fetcher;
  extraUrls(): Promise<LinkedUrl[] | 'not_applied' | 'unavailable'>;
  alert(context: string, detail: string): Promise<AlertOutcome>;
  logRun(run: WatchRun): Promise<unknown>;
  sleep(ms: number): Promise<void>;
}

/** The list to check: the versioned list first, then table rows not already in it. */
export function mergeLists(base: readonly LinkedUrl[], extra: readonly LinkedUrl[]): LinkedUrl[] {
  const seen = new Set(base.map((u) => sitePath(u.path)));
  const out = [...base];
  for (const u of extra) {
    const key = sitePath(u.path);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(u);
  }
  return out;
}

async function fetchTwice(deps: GuardDeps, url: string): Promise<FetchedPage | null> {
  const first = await deps.fetchPage(url);
  if (!isTransient(first)) return first;
  await deps.sleep(5000);
  return deps.fetchPage(url);
}

/** Check one entry; null when it holds. */
export async function checkLinkedUrl(deps: GuardDeps, entry: LinkedUrl): Promise<string | null> {
  const page = await fetchTwice(deps, `${SITE_ORIGIN}${entry.path}`);
  if (entry.expect.kind === 'ok') return assessOk(entry.path, page);
  const hop = assessRedirect(entry.expect.to, page);
  if (hop) return hop;
  // The successor must itself hold: no chain, no 404 behind the redirect.
  const target = await fetchTwice(deps, `${SITE_ORIGIN}${entry.expect.to}`);
  const behind = assessOk(entry.expect.to, target);
  return behind ? `redirect target ${entry.expect.to}: ${behind}` : null;
}

export async function runLinkedGuard(deps: GuardDeps, opts: { dryRun: boolean; base?: readonly LinkedUrl[] }): Promise<GuardReport> {
  const extra = await deps.extraUrls();
  const list = mergeLists(opts.base ?? LINKED_URLS, Array.isArray(extra) ? extra : []);
  const failures: GuardFailure[] = [];
  // Sequential and gentle: a couple of dozen requests against our own site, once a night.
  for (const entry of list) {
    const reason = await checkLinkedUrl(deps, entry);
    if (reason) failures.push({ path: entry.path, reason });
  }
  const report: GuardReport = {
    ok: failures.length === 0,
    dryRun: opts.dryRun,
    checked: list.length,
    fromTable: Array.isArray(extra) ? extra.length : extra,
    failures,
    alert: 'none',
  };
  if (failures.length > 0) {
    const lines = failures.slice(0, 10).map((f) => `${f.path}: ${f.reason}`).join('; ');
    const more = failures.length > 10 ? ` (+${failures.length - 10} more)` : '';
    report.alert = opts.dryRun ? 'dry_run' : await deps.alert('linked-urls', `${failures.length} of ${list.length} linked URLs failing: ${lines}${more}`);
    if (!opts.dryRun) await deps.logRun({ kind: 'linked_urls', ok: false, summary: `${failures.length} of ${list.length} linked URLs failing`, detail: { failures } });
  }
  return report;
}

/** seo_linked_urls rows as guard entries. */
export async function readLinkedUrlTable(svc: Svc | null): Promise<LinkedUrl[] | 'not_applied' | 'unavailable'> {
  if (!svc) return 'unavailable';
  try {
    const { data, error } = await svc.from('seo_linked_urls').select('path, source, expect_redirect').order('path').limit(1000);
    if (error) return isMissingRelation(error) ? 'not_applied' : 'unavailable';
    return ((data ?? []) as Array<{ path: string; source: string; expect_redirect: string | null }>).map((r) => ({
      path: r.path,
      expect: r.expect_redirect ? { kind: 'redirect' as const, to: r.expect_redirect } : { kind: 'ok' as const },
      evidence: 'link-data' as const,
      note: r.source,
    }));
  } catch {
    return 'unavailable';
  }
}

export function productionGuardDeps(fetchPage: Fetcher, dryRun: boolean, svc: Svc | null = serviceClientOrNull()): GuardDeps {
  return {
    fetchPage,
    extraUrls: () => readLinkedUrlTable(svc),
    alert: (context, detail) => seoAlert(context, detail, { dryRun }),
    logRun: (run) => logWatchRun(run, svc),
    sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
  };
}
