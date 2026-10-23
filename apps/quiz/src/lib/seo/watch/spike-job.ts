// SEO Mission 3, part D, point 3: the hourly play-spike job. When a group's plays jump (rule in
// spikes.ts), the owner gets an e-mail at once and the group hub (/<slug>-quiz) goes to IndexNow.
//
// IndexNow path, in this order:
//   1. the IndexNow outbox (seo_indexnow_enqueue, docs/pending-migrations/seo-indexnow.sql on
//      branch seo/m3-indexnow), which the hourly flush sends;
//   2. while that SQL is not applied, the shared helper lib/indexnow.ts (rulebook 11.1: "until
//      the outbox exists, use the shared helper"), unless INDEXNOW_DRY_RUN or SEO_WATCH_DRY_RUN.
// Rulebook 11.2 says play counts never trigger a submission. The mission asks for this one
// explicitly, so it stays, bounded: one enqueue per group per new spike (the edge rule), and
// SEO_SPIKE_INDEXNOW=0 turns it off without touching the e-mail.
//
// E-mail: lib/seo/watch/email.ts (Resend, owner only, recipient from the env). When it is not
// configured or fails, the same text goes to the Discord ops alert, so a spike is never lost.

import { pingIndexNow } from '@/lib/indexnow';
import { fetchAllRows } from '@/lib/db/fetch-all';

import { seoAlert } from './alert';
import { sendOwnerEmail } from './email';
import { isIndexNowDryRun, isWatchDryRun, SITE_ORIGIN, spikeIndexNowOn } from './env';
import { logWatchRun } from './runs';
import { bucketPlays, detectNewSpikes, LOOKBACK_MS, SPIKE_MIN_PLAYS, SPIKE_MULTIPLIER } from './spikes';
import { isMissingRelation, serviceClientOrNull } from './store';

import type { AlertOutcome } from './alert';
import type { EmailOutcome } from './email';
import type { WatchRun } from './runs';
import type { Svc } from './store';

export interface SpikeDeps {
  now(): number;
  readPlays(sinceIso: string): Promise<Array<{ groupId: number; at: number }>>;
  readGroups(ids: number[]): Promise<Array<{ id: number; name: string; slug: string }>>;
  /** 'enqueued', or 'missing' when the outbox SQL is not applied. Throws on any other failure. */
  enqueueOutbox(paths: string[], reason: string): Promise<'enqueued' | 'missing'>;
  pingDirect(paths: string[]): Promise<void>;
  sendEmail(msg: { subject: string; text: string }): Promise<EmailOutcome>;
  alert(context: string, detail: string): Promise<AlertOutcome>;
  logRun(run: WatchRun): Promise<unknown>;
}

export interface SpikeReportRow {
  group: string;
  slug: string;
  plays24h: number;
  median14: number;
  threshold: number;
  hub: string;
}

export type IndexNowOutcome = 'none' | 'outbox' | 'direct' | 'dry_run' | 'off' | 'failed';

export interface SpikeReport {
  ok: boolean;
  dryRun: boolean;
  groupsWithPlays: number;
  spikes: SpikeReportRow[];
  email: EmailOutcome | 'none';
  discord: AlertOutcome | 'none';
  indexnow: IndexNowOutcome;
  error?: string;
}

/** The owner's e-mail: short, plain French, numbers with their window and denominator. */
const INDEXNOW_LINE: Record<IndexNowOutcome, string> = {
  none: 'IndexNow: rien à envoyer.',
  outbox: 'Le hub est dans la file IndexNow (envoi au prochain passage horaire).',
  direct: 'Le hub a été signalé à IndexNow.',
  dry_run: 'IndexNow: test à blanc, rien envoyé.',
  off: 'IndexNow coupé (SEO_SPIKE_INDEXNOW=0).',
  failed: 'IndexNow: la mise en file a échoué, voir les logs du cron.',
};

export function spikeEmail(rows: readonly SpikeReportRow[], indexnow: IndexNowOutcome = 'none'): { subject: string; text: string } {
  const first = rows[0]!;
  const subject = rows.length === 1
    ? `Pic de parties: ${first.group} (${first.plays24h} en 24 h)`
    : `Pic de parties: ${rows.length} groupes (${rows.map((r) => r.group).join(', ')})`.slice(0, 200);
  const lines = rows.map((r) =>
    `${r.group}: ${r.plays24h} parties en 24 h, médiane des 14 jours précédents ${r.median14} par jour (seuil: plus de ${r.threshold}). Hub: ${r.hub}`,
  );
  const text = [
    ...lines,
    '',
    `Règle: plus de ${SPIKE_MULTIPLIER} fois la médiane de 14 fenêtres de 24 h, et au moins ${SPIKE_MIN_PLAYS} parties. Parties = parties terminées (table plays) des quiz du groupe, heure UTC.`,
    INDEXNOW_LINE[indexnow],
    'Rien à faire, sauf si tu veux mettre le groupe en avant.',
  ].join('\n');
  return { subject, text };
}

export async function runSpikeJob(deps: SpikeDeps, opts: { dryRun: boolean; indexNowOn: boolean; indexNowDryRun: boolean }): Promise<SpikeReport> {
  const report: SpikeReport = { ok: true, dryRun: opts.dryRun, groupsWithPlays: 0, spikes: [], email: 'none', discord: 'none', indexnow: 'none' };
  const nowMs = deps.now();
  let plays: Array<{ groupId: number; at: number }>;
  try {
    plays = await deps.readPlays(new Date(nowMs - LOOKBACK_MS).toISOString());
  } catch (err) {
    report.ok = false;
    report.error = `plays read failed: ${(err as Error).message}`;
    return report;
  }
  const counts = bucketPlays(plays, nowMs);
  report.groupsWithPlays = counts.size;
  const found = detectNewSpikes(counts);
  if (found.length === 0) return report;

  let groups: Array<{ id: number; name: string; slug: string }> = [];
  try {
    groups = await deps.readGroups(found.map((f) => f.groupId));
  } catch (err) {
    report.ok = false;
    report.error = `groups read failed: ${(err as Error).message}`;
    return report;
  }
  const byId = new Map(groups.map((g) => [g.id, g]));
  report.spikes = found.flatMap((f) => {
    const g = byId.get(f.groupId);
    if (!g) return [];
    return [{ group: g.name, slug: g.slug, plays24h: f.current, median14: f.median, threshold: f.exceed, hub: `${SITE_ORIGIN}/${g.slug}-quiz` }];
  });
  if (report.spikes.length === 0) return report;

  // IndexNow first (cheap, server side), then the e-mail.
  const paths = report.spikes.map((r) => `/${r.slug}-quiz`);
  if (!opts.indexNowOn) report.indexnow = 'off';
  else if (opts.dryRun) report.indexnow = 'dry_run';
  else {
    try {
      const r = await deps.enqueueOutbox(paths, 'play-spike');
      if (r === 'enqueued') report.indexnow = 'outbox';
      else if (opts.indexNowDryRun) report.indexnow = 'dry_run';
      else {
        await deps.pingDirect(paths);
        report.indexnow = 'direct';
      }
    } catch (err) {
      console.error('[seo/spikes] IndexNow enqueue failed:', (err as Error).message);
      report.indexnow = 'failed';
    }
  }

  const mail = spikeEmail(report.spikes, report.indexnow);
  report.email = opts.dryRun ? 'dry_run' : await deps.sendEmail(mail);
  if (report.email === 'not_configured' || report.email === 'failed') {
    report.discord = await deps.alert('spikes', `${mail.subject}. ${mail.text.split('\n')[0]}`);
  }
  if (!opts.dryRun) {
    await deps.logRun({ kind: 'spikes', ok: true, summary: mail.subject, detail: { spikes: report.spikes, email: report.email, indexnow: report.indexnow } });
  }
  return report;
}

type EmbeddedQuiz = { group_id: number | null } | Array<{ group_id: number | null }> | null;

/** The production dependencies (service role). Null when the service role is not configured. */
export function supabaseSpikeDeps(svc: Svc | null = serviceClientOrNull()): SpikeDeps | null {
  if (!svc) return null;
  const dryRun = isWatchDryRun();
  return {
    now: () => Date.now(),
    async readPlays(sinceIso) {
      const rows = await fetchAllRows<{ created_at: string; quizzes: EmbeddedQuiz }>(() =>
        svc.from('plays').select('created_at, quizzes(group_id)').gte('created_at', sinceIso).order('created_at').order('id'),
      );
      const out: Array<{ groupId: number; at: number }> = [];
      for (const r of rows) {
        const q = Array.isArray(r.quizzes) ? r.quizzes[0] : r.quizzes;
        if (q?.group_id != null) out.push({ groupId: q.group_id, at: Date.parse(r.created_at) });
      }
      return out;
    },
    async readGroups(ids) {
      const { data, error } = await svc.from('groups').select('id, name, slug').in('id', ids);
      if (error) throw new Error(error.message);
      return (data ?? []) as Array<{ id: number; name: string; slug: string }>;
    },
    async enqueueOutbox(paths, reason) {
      const { error } = await svc.rpc('seo_indexnow_enqueue', { p_paths: paths, p_reason: reason });
      if (!error) return 'enqueued';
      if (isMissingRelation(error)) return 'missing';
      throw new Error(error.message);
    },
    async pingDirect(paths) {
      await pingIndexNow(paths);
    },
    sendEmail: (msg) => sendOwnerEmail(msg, { dryRun }),
    alert: (context, detail) => seoAlert(context, detail, { dryRun }),
    logRun: (run) => logWatchRun(run, svc),
  };
}

export function spikeJobOptions(dryRun: boolean): { dryRun: boolean; indexNowOn: boolean; indexNowDryRun: boolean } {
  return { dryRun, indexNowOn: spikeIndexNowOn(), indexNowDryRun: isIndexNowDryRun() || dryRun };
}
