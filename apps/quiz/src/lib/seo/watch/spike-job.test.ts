import { describe, expect, it, vi } from 'vitest';

import { runSpikeJob, spikeEmail } from './spike-job';
import { SPIKE_BASELINE_WINDOWS, WINDOW_MS } from './spikes';

import type { SpikeDeps } from './spike-job';

const NOW = Date.parse('2026-10-15T12:00:00Z');
const H = 3600000;

function plays(groupId: number, perDay: number, today: number): Array<{ groupId: number; at: number }> {
  const out: Array<{ groupId: number; at: number }> = [];
  for (let k = 1; k <= SPIKE_BASELINE_WINDOWS; k++) for (let i = 0; i < perDay; i++) out.push({ groupId, at: NOW - k * WINDOW_MS - 2 * H - i * 1000 });
  // today's plays all inside the last hour, so the previous evaluation saw none of them
  for (let i = 0; i < today; i++) out.push({ groupId, at: NOW - 10 * 60 * 1000 - i * 1000 });
  return out;
}

function deps(over: Partial<SpikeDeps> = {}): SpikeDeps & { calls: string[] } {
  const calls: string[] = [];
  const d: SpikeDeps = {
    now: () => NOW,
    readPlays: async () => plays(3, 8, 90),
    readGroups: async (ids) => ids.map((id) => ({ id, name: 'ILLIT', slug: 'illit' })),
    enqueueOutbox: vi.fn(async () => { calls.push('outbox'); return 'enqueued' as const; }),
    pingDirect: vi.fn(async () => { calls.push('ping'); }),
    sendEmail: vi.fn(async () => { calls.push('email'); return 'sent' as const; }),
    alert: vi.fn(async () => { calls.push('discord'); return 'sent' as const; }),
    logRun: vi.fn(async () => { calls.push('log'); }),
    ...over,
  };
  return Object.assign(d, { calls });
}

const LIVE = { dryRun: false, indexNowOn: true, indexNowDryRun: false };

describe('runSpikeJob', () => {
  it('a new spike: hub to the IndexNow outbox, one e-mail, one run logged', async () => {
    const d = deps();
    const r = await runSpikeJob(d, LIVE);
    expect(r.spikes).toEqual([{ group: 'ILLIT', slug: 'illit', plays24h: 90, median14: 8, threshold: 40, hub: 'https://kpopquiz.org/illit-quiz' }]);
    expect(d.enqueueOutbox).toHaveBeenCalledWith(['/illit-quiz'], 'play-spike');
    expect(r.indexnow).toBe('outbox');
    expect(r.email).toBe('sent');
    expect(d.calls).toEqual(['outbox', 'email', 'log']);
  });

  it('dry run: computes the spike, sends and writes nothing', async () => {
    const d = deps();
    const r = await runSpikeJob(d, { ...LIVE, dryRun: true });
    expect(r.spikes).toHaveLength(1);
    expect(r.email).toBe('dry_run');
    expect(r.indexnow).toBe('dry_run');
    expect(d.calls).toEqual([]);
  });

  it('outbox SQL not applied: falls back to the shared IndexNow helper', async () => {
    const d = deps({ enqueueOutbox: vi.fn(async () => 'missing' as const) });
    const r = await runSpikeJob(d, LIVE);
    expect(r.indexnow).toBe('direct');
    expect(d.pingDirect).toHaveBeenCalledWith(['/illit-quiz']);
  });

  it('outbox missing and INDEXNOW_DRY_RUN: no ping', async () => {
    const d = deps({ enqueueOutbox: vi.fn(async () => 'missing' as const) });
    const r = await runSpikeJob(d, { ...LIVE, indexNowDryRun: true });
    expect(r.indexnow).toBe('dry_run');
    expect(d.pingDirect).not.toHaveBeenCalled();
  });

  it('SEO_SPIKE_INDEXNOW=0: the e-mail still goes, IndexNow does not', async () => {
    const d = deps();
    const r = await runSpikeJob(d, { ...LIVE, indexNowOn: false });
    expect(r.indexnow).toBe('off');
    expect(d.enqueueOutbox).not.toHaveBeenCalled();
    expect(r.email).toBe('sent');
  });

  it('e-mail not configured: the alert goes to the Discord ops channel instead', async () => {
    const d = deps({ sendEmail: vi.fn(async () => 'not_configured' as const) });
    const r = await runSpikeJob(d, LIVE);
    expect(r.email).toBe('not_configured');
    expect(r.discord).toBe('sent');
    expect(d.alert).toHaveBeenCalledTimes(1);
  });

  it('no spike: nothing is sent, nothing is logged', async () => {
    const d = deps({ readPlays: async () => plays(3, 8, 12) });
    const r = await runSpikeJob(d, LIVE);
    expect(r.spikes).toEqual([]);
    expect(d.calls).toEqual([]);
  });

  it('a failed read reports the error and sends nothing', async () => {
    const d = deps({ readPlays: async () => { throw new Error('timeout'); } });
    const r = await runSpikeJob(d, LIVE);
    expect(r.ok).toBe(false);
    expect(r.error).toContain('timeout');
    expect(d.calls).toEqual([]);
  });
});

describe('spikeEmail', () => {
  const row = { group: 'BTS', slug: 'bts', plays24h: 312, median14: 40, threshold: 200, hub: 'https://kpopquiz.org/bts-quiz' };

  it('states the count, the median, the threshold, the window and the hub, in short French', () => {
    const m = spikeEmail([row], 'outbox');
    expect(m.subject).toBe('Pic de parties: BTS (312 en 24 h)');
    expect(m.text).toContain('312 parties en 24 h');
    expect(m.text).toContain('médiane des 14 jours précédents 40 par jour');
    expect(m.text).toContain('https://kpopquiz.org/bts-quiz');
    expect(m.text).toContain('file IndexNow');
    expect(m.text.split('\n').length).toBeLessThanOrEqual(15);
  });

  it('never claims an IndexNow submission that did not happen', () => {
    expect(spikeEmail([row], 'off').text).not.toContain('dans la file');
    expect(spikeEmail([row], 'failed').text).toContain('échoué');
  });

  it('no em or en dash', () => {
    const m = spikeEmail([row, { ...row, group: 'ILLIT' }], 'direct');
    expect(`${m.subject}${m.text}`).not.toMatch(/[\u2013\u2014]/);
  });
});
