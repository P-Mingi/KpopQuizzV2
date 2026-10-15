// Test fixture (SEO Mission 3): an in-memory IndexNowStore with the semantics of
// docs/pending-migrations/seo-indexnow.sql (one pending row per URL, last_enqueued_at moves
// forward, an attempt counts and settles), so the flush, the fast path and the
// reconciliation are tested without a database. Imported by *.test.ts files only.

import type { EventKind, IndexNowStore } from '@/lib/seo/indexnow-outbox';
import type { EventLite, OutboxRow, StateRow } from '@/lib/seo/indexnow-plan';

export interface MemoryRow extends OutboxRow {
  outcome: 'submitted' | 'covered' | 'gave_up' | null;
  status_code: number | null;
  submitted_at: string | null;
}

export interface MemoryStore extends IndexNowStore {
  rows: MemoryRow[];
  stateRows: Map<string, StateRow>;
  eventRows: Array<EventLite & { status_code: number | null }>;
  clock: { now: Date };
  calls: string[];
  /** Empty the outbox (between two runs of a test). */
  clearOutbox(): void;
}

const ORIGIN = 'https://kpopquiz.org';

export function memoryStore(opts: { live?: boolean; now?: Date } = {}): MemoryStore {
  const clock = { now: opts.now ?? new Date('2026-10-15T10:00:00Z') };
  let nextId = 1;
  const pendingByUrl = new Map<string, MemoryRow>();
  const store: MemoryStore = {
    rows: [],
    stateRows: new Map(),
    eventRows: [],
    clock,
    calls: [],
    clearOutbox() { store.rows.length = 0; pendingByUrl.clear(); },
    async live() { return opts.live ?? true; },
    async enqueue(paths, reason) {
      store.calls.push(`enqueue:${reason}`);
      let n = 0;
      for (const p of new Set(paths)) {
        if (!/^\/[A-Za-z0-9._~%/-]*$/.test(p)) continue;
        const url = `${ORIGIN}${p}`;
        const at = clock.now.toISOString();
        const prevRow = pendingByUrl.get(url);
        const pending = prevRow && prevRow.outcome === null ? prevRow : undefined;
        if (pending) {
          if (pending.last_enqueued_at < at) { pending.last_enqueued_at = at; n += 1; }
          continue;
        }
        const fresh: MemoryRow = { id: nextId++, url, reason, enqueued_at: at, last_enqueued_at: at, attempts: 0, outcome: null, status_code: null, submitted_at: null };
        store.rows.push(fresh);
        pendingByUrl.set(url, fresh);
        n += 1;
      }
      return n;
    },
    async pending(limit) {
      return store.rows.filter((r) => r.outcome === null)
        .sort((a, b) => a.enqueued_at.localeCompare(b.enqueued_at) || a.id - b.id)
        .slice(0, limit)
        .map(({ id, url, reason, enqueued_at, last_enqueued_at, attempts }) => ({ id, url, reason, enqueued_at, last_enqueued_at, attempts }));
    },
    async lastSubmitted(urls) {
      const out = new Map<string, string | null>();
      for (const s of store.stateRows.values()) if (!urls || urls.includes(s.url)) out.set(s.url, s.last_submitted_at);
      return out;
    },
    async recordAttempt(ids, status, ok, atIso) {
      store.calls.push(`attempt:${status}:${ids.length}`);
      const idSet = new Set(ids);
      for (const r of store.rows) {
        if (!idSet.has(r.id) || r.outcome !== null) continue;
        r.attempts += 1;
        r.status_code = status;
        if (ok) {
          r.outcome = 'submitted';
          r.submitted_at = atIso;
          touchState(r.url, atIso);
        }
      }
    },
    async markUrlsSubmitted(urls, status, atIso) {
      store.calls.push(`mark:${status}:${urls.length}`);
      for (const r of store.rows) {
        if (urls.includes(r.url) && r.outcome === null && r.last_enqueued_at <= atIso) {
          r.outcome = 'submitted'; r.submitted_at = atIso; r.status_code = status; r.attempts += 1;
        }
      }
      for (const u of urls) touchState(u, atIso);
    },
    async settle(covered, gaveUp) {
      const c = new Set(covered);
      const g = new Set(gaveUp);
      for (const r of store.rows) {
        if (r.outcome !== null) continue;
        if (c.has(r.id)) r.outcome = 'covered';
        if (g.has(r.id)) r.outcome = 'gave_up';
      }
    },
    async events(kinds, limit) {
      return store.eventRows.filter((e) => kinds.includes(e.kind as EventKind))
        .sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, limit);
    },
    async event(kind, statusCode, detail) {
      store.eventRows.push({ kind, created_at: clock.now.toISOString(), detail, status_code: statusCode });
    },
    async states() { return [...store.stateRows.values()]; },
    async upsertStates(rows) {
      for (const r of rows) {
        const prev = store.stateRows.get(r.url);
        store.stateRows.set(r.url, {
          url: r.url,
          hash: r.hash !== undefined ? r.hash : prev?.hash ?? null,
          indexable: r.indexable !== undefined ? r.indexable : prev?.indexable ?? null,
          in_sitemap: r.in_sitemap !== undefined ? r.in_sitemap : prev?.in_sitemap ?? false,
          last_submitted_at: r.last_submitted_at !== undefined ? r.last_submitted_at : prev?.last_submitted_at ?? null,
          last_checked_at: r.last_checked_at !== undefined ? r.last_checked_at : prev?.last_checked_at ?? null,
          last_changed_at: r.last_changed_at !== undefined ? r.last_changed_at : prev?.last_changed_at ?? null,
          http_status: r.http_status !== undefined ? r.http_status : prev?.http_status ?? null,
          scope: r.scope !== undefined ? r.scope : prev?.scope ?? null,
        });
      }
    },
    async prune() { store.calls.push('prune'); },
  };
  function touchState(url: string, atIso: string): void {
    const prev = store.stateRows.get(url);
    const last = prev?.last_submitted_at && prev.last_submitted_at > atIso ? prev.last_submitted_at : atIso;
    store.stateRows.set(url, {
      url, hash: prev?.hash ?? null, indexable: prev?.indexable ?? null, in_sitemap: prev?.in_sitemap ?? false,
      last_submitted_at: last, last_checked_at: prev?.last_checked_at ?? null, last_changed_at: prev?.last_changed_at ?? null,
      http_status: prev?.http_status ?? null, scope: prev?.scope ?? null,
    });
  }
  return store;
}
