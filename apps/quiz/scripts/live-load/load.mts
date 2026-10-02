// Load and chaos test of the live blindtest (SYSTEM.md 5.5, V12 prompt 4d).
//
//   scripted phones: 5 rooms x 50 players at once, then 1 room x 50 for 20 rounds
//   reported:        p95 answer latency, Realtime message loss, refusals by reason,
//                    and whether every final score is the one the answers earn
//   chaos:           two players with the same nickname, a 51st player, double
//                    taps, answers after the deadline, phones that drop and come
//                    back, a host that reloads mid game
//
// TWO MODES
//
//   --dry   (default) Everything is local: the real service over the memory store
//           behind a local HTTP server, and the local Realtime fake
//           (local-fake.ts). No network beyond 127.0.0.1, no database. This is
//           the only mode an agent of the V12 run may start.
//
//             pnpm --filter quiz exec tsx scripts/live-load/load.mts --dry
//
//   --real  Against a running app and the project's Realtime. IT WRITES: rooms,
//           players and answers (marked is_test when the app does not run in the
//           production environment) and it opens up to 250 Realtime connections.
//           It needs, in this order:
//             1. docs/pending-migrations/v12-g4-live.sql applied (owner's go);
//             2. the project's real Realtime limits read by the owner in the
//                Supabase dashboard (concurrent connections, messages per second,
//                channel joins per second) and passed as --limit-connections;
//             3. a LOCAL production build with both flags on (never the public
//                site: a kpopquiz.org address is refused);
//             4. the owner's go for this test, given as --owner-go "<their words>".
//           NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are read
//           from the environment and never printed.
//
//             pnpm --filter quiz exec tsx scripts/live-load/load.mts --real \
//               --base http://localhost:3064 --limit-connections 500 --owner-go "go live load test"
//
// Options: --rooms 5 --players 50 --rounds 5 --long-rounds 20 --seconds 5
//          --drop 0.02 (dry: share of broadcast deliveries lost) --out <file.json>
//          --phase both|burst|long --quiet

import fs from 'node:fs';
import http from 'node:http';

import { LIVE_EVENT, LIVE_MAX_PLAYERS, LIVE_TOKEN_HEADER } from '../../src/lib/live/constants';
import { fakeGenerated } from '../../src/lib/live/fake';
import { roundPoints, streakBonus } from '../../src/lib/live/scoring';
import { LocalLive } from './local-fake';

import type { GeneratedQuestion } from '../../src/lib/live/fake';
import type { LiveHostState, LivePlayerState, LivePublicState } from '../../src/lib/live/types';
import type { AddressInfo } from 'node:net';

// ---------------------------------------------------------------------------
// Arguments
// ---------------------------------------------------------------------------

const argv = process.argv.slice(2);
const has = (name: string): boolean => argv.includes(`--${name}`);
const arg = (name: string, fallback: string): string => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] !== undefined ? (argv[i + 1] as string) : fallback;
};
const num = (name: string, fallback: number): number => {
  const v = Number(arg(name, String(fallback)));
  return Number.isFinite(v) ? v : fallback;
};

const REAL = has('real');
const CFG = {
  rooms: num('rooms', 5),
  players: num('players', 50),
  rounds: num('rounds', 5),
  longRounds: num('long-rounds', 20),
  seconds: num('seconds', 5),
  drop: num('drop', 0.02),
  phase: arg('phase', 'both') as 'both' | 'burst' | 'long',
  out: arg('out', ''),
  quiet: has('quiet'),
  base: arg('base', ''),
  limitConnections: num('limit-connections', 0),
  ownerGo: arg('owner-go', ''),
};

const log = (...a: unknown[]): void => { if (!CFG.quiet) console.log(...a); };
const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));
const rand = (min: number, max: number): number => min + Math.random() * (max - min);

function pct(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)] as number;
}

// ---------------------------------------------------------------------------
// Transport: HTTP to the app (or the local server), Realtime to the project
// (or the local fake).
// ---------------------------------------------------------------------------

interface Reply<T> { status: number; body: T; ms: number }

interface Transport {
  base: string;
  call<T>(method: 'GET' | 'POST', path: string, token?: string | null, body?: unknown): Promise<Reply<T>>;
  /** Listen to a room topic. Resolves once the channel is joined. `close()` drops the connection. */
  listen(topic: string, onState: (s: LivePublicState) => void): Promise<{ close: () => void }>;
  generate(count: number): Promise<GeneratedQuestion[]>;
  stop(): Promise<void>;
  /** Realtime counters when the transport can know them (dry mode). */
  realtime?: () => { deliveries: number; dropped: number; clientSends: number; refusedJoins: number };
}

async function httpCall<T>(base: string, method: 'GET' | 'POST', path: string, token?: string | null, body?: unknown): Promise<Reply<T>> {
  const t0 = performance.now();
  const headers: Record<string, string> = {};
  if (token) headers[LIVE_TOKEN_HEADER] = token;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  try {
    const res = await fetch(`${base}${path}`, { method, headers, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
    const data = await res.json().catch(() => ({})) as T;
    return { status: res.status, body: data, ms: performance.now() - t0 };
  } catch {
    return { status: 0, body: {} as T, ms: performance.now() - t0 };
  }
}

async function dryTransport(): Promise<Transport> {
  const local = new LocalLive({ dropRate: CFG.drop });
  const server = http.createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => chunks.push(c));
    req.on('end', () => {
      const url = new URL(req.url ?? '/', 'http://127.0.0.1');
      const token = req.headers[LIVE_TOKEN_HEADER];
      void local.api(req.method ?? 'GET', url.pathname, { [LIVE_TOKEN_HEADER]: Array.isArray(token) ? token[0] : token }, chunks.length ? Buffer.concat(chunks).toString('utf8') : null)
        .then((r) => {
          res.writeHead(r.status, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(r.body));
        });
    });
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  let ref = 0;
  return {
    base,
    call: (method, path, token, body) => httpCall(base, method, path, token, body),
    listen: (topic, onState) => new Promise((resolve, reject) => {
      // A minimal client of the channel protocol the Supabase client speaks (vsn 2.0.0).
      const joinRef = String(++ref);
      const conn = local.connect({
        send: (text) => {
          const [, , , event, payload] = JSON.parse(text) as [string | null, string | null, string, string, { status?: string; event?: string; payload?: LivePublicState }];
          if (event === 'phx_reply') {
            if (payload.status === 'ok') resolve({ close: () => conn.onClose() });
            else reject(new Error('join refused'));
          } else if (event === 'broadcast' && payload.event === LIVE_EVENT && payload.payload) {
            onState(payload.payload);
          }
        },
      });
      conn.onMessage(JSON.stringify([joinRef, joinRef, `realtime:${topic}`, 'phx_join', { config: { private: true, broadcast: { self: false, ack: false } } }]));
    }),
    generate: async (count) => fakeGenerated(count),
    stop: () => new Promise<void>((resolve) => { server.close(() => resolve()); }),
    realtime: () => ({ deliveries: local.deliveries, dropped: local.dropped, clientSends: local.clientSends, refusedJoins: local.refusedJoins }),
  };
}

async function realTransport(): Promise<Transport> {
  const base = CFG.base.replace(/\/+$/, '');
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const problems: string[] = [];
  if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(base)) problems.push('--base must be a local production build (http://localhost:<port>): never the public site, never a preview');
  if (!CFG.ownerGo.trim()) problems.push('--owner-go "<the owner\'s words>" is missing: this test writes and needs the owner\'s go');
  if (!(CFG.limitConnections > 0)) problems.push('--limit-connections <n> is missing: the owner reads the project\'s real Realtime limit in the Supabase dashboard first');
  if (!url || !anon) problems.push('NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be in the environment');
  const needed = Math.max(CFG.rooms * CFG.players, CFG.players);
  if (CFG.limitConnections > 0 && needed > CFG.limitConnections * 0.6) {
    problems.push(`this run opens ${needed} Realtime connections, more than 60% of the limit given (${CFG.limitConnections}): the site's own visitors share that limit. Lower --rooms or --players.`);
  }
  if (problems.length > 0) {
    console.error('Refusing to run against a real app:');
    for (const p of problems) console.error(`  - ${p}`);
    process.exit(2);
  }
  const status = await httpCall<{ ok?: boolean; error?: string }>(base, 'GET', '/api/live');
  if (status.status !== 200) {
    console.error(`GET ${base}/api/live answered ${status.status} (${status.body.error ?? 'no body'}): the app is not serving the live mode (flag off, or the SQL is not applied).`);
    process.exit(2);
  }
  const { createClient } = await import('@supabase/supabase-js');
  const clients: Array<{ removeAllChannels: () => Promise<unknown> }> = [];
  return {
    base,
    call: (method, path, token, body) => httpCall(base, method, path, token, body),
    listen: (topic, onState) => new Promise((resolve, reject) => {
      // One client per phone: one socket each, as real phones have.
      const client = createClient(url as string, anon as string, { auth: { persistSession: false, autoRefreshToken: false } });
      clients.push(client);
      const channel = client.channel(topic, { config: { private: true, broadcast: { self: false, ack: false } } });
      channel.on('broadcast', { event: LIVE_EVENT }, (m: { payload?: unknown }) => { if (m.payload) onState(m.payload as LivePublicState); });
      const timer = setTimeout(() => reject(new Error('join timed out')), 15_000);
      channel.subscribe((s: string) => {
        if (s === 'SUBSCRIBED') { clearTimeout(timer); resolve({ close: () => { void client.removeAllChannels(); } }); }
        else if (s === 'CHANNEL_ERROR' || s === 'TIMED_OUT') { clearTimeout(timer); reject(new Error(s)); }
      });
    }),
    generate: async (count) => {
      // The real generate route gives 15 songs at most: two calls for a 20 round game.
      const out: GeneratedQuestion[] = [];
      const seen = new Set<string>();
      for (let tries = 0; out.length < count && tries < 6; tries++) {
        const r = await httpCall<{ questions?: GeneratedQuestion[] }>(base, 'POST', '/api/blind-test/generate', null, { playlist: 'all', count: Math.min(15, Math.max(5, count - out.length)), mode: 'challenge' });
        for (const q of r.body.questions ?? []) if (!seen.has(q.song_id)) { seen.add(q.song_id); out.push(q); }
      }
      if (out.length < count) throw new Error(`generate gave ${out.length} songs, ${count} needed`);
      return out.slice(0, count);
    },
    stop: async () => { await Promise.all(clients.map((c) => c.removeAllChannels().catch(() => {}))); },
  };
}

// ---------------------------------------------------------------------------
// One room
// ---------------------------------------------------------------------------

interface Metrics {
  answerMs: number[];
  joinMs: number[];
  hostMs: number[];
  refusals: Record<string, number>;
  expectedDeliveries: number;
  receivedDeliveries: number;
  resyncs: number;
  scoreMismatches: number;
  failures: string[];
}

const newMetrics = (): Metrics => ({ answerMs: [], joinMs: [], hostMs: [], refusals: {}, expectedDeliveries: 0, receivedDeliveries: 0, resyncs: 0, scoreMismatches: 0, failures: [] });
const refuse = (m: Metrics, key: string): void => { m.refusals[key] = (m.refusals[key] ?? 0) + 1; };

interface Phone {
  name: string;
  token: string;
  id: string;
  /** seq of every state received on the channel. */
  seen: Set<number>;
  latest: LivePublicState | null;
  listening: { close: () => void } | null;
  /** What this phone's answers should have earned. */
  expected: { score: number; streak: number };
  /** ms the server reported for the answer of the current round, or null. */
  answer: { choice: number; ms: number } | null;
}

interface RoomPlan { index: number; players: number; rounds: number; chaos: boolean }

async function playRoom(t: Transport, plan: RoomPlan, m: Metrics): Promise<void> {
  const tag = `room ${plan.index + 1}`;
  const questions = await t.generate(plan.rounds);
  const created = await t.call<{ code: string; host_token: string; state: LiveHostState }>('POST', '/api/live/rooms', null, {
    playlist: 'all', label: 'Load test', rounds: plan.rounds, seconds: CFG.seconds, questions,
  });
  if (created.status !== 201) { m.failures.push(`${tag}: create answered ${created.status}`); return; }
  const { code, host_token: hostToken } = created.body;
  const topic = created.body.state.topic;
  const correct = questions.map((q) => q.choices.indexOf(q.correct_answer));

  // ----- every phone joins at once (the QR goes up on the screen) -----
  const phones: Phone[] = [];
  await Promise.all(Array.from({ length: plan.players }, async (_, i) => {
    // Chaos: a few phones pick the same nickname.
    const nickname = plan.chaos && i % 10 === 1 ? 'mingi' : `fan${plan.index + 1}-${i + 1}`;
    const r = await t.call<{ token: string; state: LivePlayerState; error?: string }>('POST', `/api/live/rooms/${code}/join`, null, { nickname, colour: i % 4 });
    m.joinMs.push(r.ms);
    if (r.status !== 201) { m.failures.push(`${tag}: join ${i + 1} answered ${r.status}`); return; }
    const phone: Phone = { name: r.body.state.you.name, token: r.body.token, id: r.body.state.you.id, seen: new Set(), latest: null, listening: null, expected: { score: 0, streak: 0 }, answer: null };
    phones.push(phone);
    const onState = (s: LivePublicState): void => { phone.seen.add(s.seq); if (!phone.latest || s.seq >= phone.latest.seq) phone.latest = s; };
    try {
      phone.listening = await t.listen(topic, onState);
    } catch (e) {
      m.failures.push(`${tag}: ${phone.name} could not join the channel (${e instanceof Error ? e.message : 'error'})`);
    }
  }));
  if (new Set(phones.map((p) => p.name.toLowerCase())).size !== phones.length) m.failures.push(`${tag}: two players show the same name`);

  // Chaos: one more player than the room takes.
  if (plan.chaos && plan.players >= LIVE_MAX_PLAYERS) {
    const extra = await t.call<{ error?: string }>('POST', `/api/live/rooms/${code}/join`, null, { nickname: 'one more' });
    if (extra.status === 409) refuse(m, 'full (the 51st player)');
    else m.failures.push(`${tag}: the 51st player got ${extra.status}`);
  }

  const host = async (body: Record<string, unknown>): Promise<LiveHostState | null> => {
    const r = await t.call<{ state?: LiveHostState; error?: string }>('POST', `/api/live/rooms/${code}/host`, hostToken, body);
    m.hostMs.push(r.ms);
    if (r.status !== 200 || !r.body.state) { m.failures.push(`${tag}: host ${String(body.action)} answered ${r.status} ${r.body.error ?? ''}`); return null; }
    return r.body.state;
  };
  /** After a broadcast: who got it on the channel, and a resync through the state route for who did not. */
  const settle = async (state: LiveHostState): Promise<void> => {
    await sleep(REAL ? 400 : 20);
    for (const p of phones) {
      if (!p.listening) continue;
      m.expectedDeliveries += 1;
      if (p.seen.has(state.seq)) { m.receivedDeliveries += 1; continue; }
      // What the phone's safety net does: read the state with its token.
      const r = await t.call<LivePlayerState>('GET', `/api/live/rooms/${code}/state`, p.token);
      m.resyncs += 1;
      if (r.status === 200) p.latest = r.body;
      else m.failures.push(`${tag}: ${p.name} could not resync (${r.status})`);
    }
  };

  for (let round = 1; round <= plan.rounds; round++) {
    const started = await host({ action: 'start', round });
    if (!started) return;
    await settle(started);
    const right = correct[round - 1] as number;

    // Chaos: the host tab reloads in the middle of the game and reads the room back.
    if (plan.chaos && round === 2) {
      const back = await t.call<LiveHostState>('GET', `/api/live/rooms/${code}/state`, hostToken);
      if (back.status !== 200 || back.body.status !== 'round' || back.body.round !== round || !back.body.host.question) m.failures.push(`${tag}: the host did not get its room back after a reload`);
    }
    // Chaos: a phone drops (socket closed) and comes back with its token.
    if (plan.chaos && round === 3 && phones.length > 3) {
      const p = phones[3] as Phone;
      p.listening?.close();
      p.listening = null;
      const back = await t.call<LivePlayerState>('GET', `/api/live/rooms/${code}/state`, p.token);
      const mine = back.status === 200 ? back.body.players.find((x) => x.id === p.id) : undefined;
      if (!mine || mine.score !== p.expected.score) m.failures.push(`${tag}: ${p.name} came back without its score`);
      try {
        p.listening = await t.listen(topic, (s) => { p.seen.add(s.seq); p.latest = s; });
      } catch { m.failures.push(`${tag}: ${p.name} could not rejoin the channel`); }
    }

    await Promise.all(phones.map(async (p, i) => {
      p.answer = null;
      // Most answer inside the round; in a chaos room a few answer after the deadline, a few not at all.
      const late = plan.chaos && i % 17 === 5;
      const silent = plan.chaos && i % 13 === 7;
      if (silent) return;
      await sleep(late ? CFG.seconds * 1000 + 150 : rand(80, Math.min(2500, CFG.seconds * 1000 * 0.6)));
      const choice = i % 5 === 0 ? (right + 1) % 4 : right;
      const r = await t.call<{ ok?: boolean; ms?: number; error?: string }>('POST', `/api/live/rooms/${code}/answer`, p.token, { choice });
      m.answerMs.push(r.ms);
      if (r.status === 200 && typeof r.body.ms === 'number') {
        p.answer = { choice, ms: r.body.ms };
        // Chaos: a double tap. The second answer must be refused.
        if (plan.chaos && i % 7 === 0) {
          const again = await t.call<{ error?: string }>('POST', `/api/live/rooms/${code}/answer`, p.token, { choice: right });
          if (again.status === 409 && again.body.error === 'duplicate') refuse(m, 'duplicate (double tap)');
          else m.failures.push(`${tag}: a second answer got ${again.status}`);
        }
      } else if (r.status === 409 && (r.body.error === 'late' || r.body.error === 'not_open')) {
        refuse(m, late ? 'late (after the deadline)' : `${r.body.error} (the round was closed first)`);
        if (!late && r.body.error === 'late') m.failures.push(`${tag}: an answer inside the round was called late`);
      } else {
        m.failures.push(`${tag}: answer of ${p.name} got ${r.status} ${r.body.error ?? ''}`);
      }
    }));

    const revealed = await host({ action: 'reveal', round });
    if (!revealed) return;
    await settle(revealed);
    // What each answer should have earned, from the time the SERVER reported.
    for (const p of phones) {
      if (p.answer && p.answer.choice === right) {
        p.expected.streak += 1;
        p.expected.score += roundPoints(p.answer.ms, CFG.seconds * 1000) + streakBonus(p.expected.streak);
      } else {
        p.expected.streak = 0;
      }
      const shown = revealed.players.find((x) => x.id === p.id);
      if (!shown || shown.score !== p.expected.score) m.scoreMismatches += 1;
    }
    const board = await host({ action: 'board' });
    if (!board) return;
    await settle(board);
  }

  const ended = await host({ action: 'end' });
  if (ended) {
    await settle(ended);
    // Every phone ends on the final state, by the channel or by its resync.
    for (const p of phones) if (p.latest?.status !== 'ended') m.failures.push(`${tag}: ${p.name} did not reach the end of the game`);
    // The leaderboard is ordered by points, then by the lower total answer time (ties).
    for (let i = 1; i < ended.players.length; i++) {
      if ((ended.players[i - 1] as { score: number }).score < (ended.players[i] as { score: number }).score) m.failures.push(`${tag}: the final ranking is not ordered`);
    }
  }
  for (const p of phones) p.listening?.close();
  // The host closes the room: nothing is kept (test rooms are deleted by the expiry cron).
  await t.call('POST', `/api/live/rooms/${code}/host`, hostToken, { action: 'close' });
}

// ---------------------------------------------------------------------------

function summarise(name: string, m: Metrics, rooms: number, players: number, rounds: number, seconds: number): Record<string, unknown> {
  const loss = m.expectedDeliveries === 0 ? 0 : 1 - m.receivedDeliveries / m.expectedDeliveries;
  return {
    phase: name,
    rooms,
    players_per_room: players,
    rounds,
    wall_seconds: Math.round(seconds * 10) / 10,
    answers: m.answerMs.length,
    answer_latency_ms: { p50: Math.round(pct(m.answerMs, 50)), p95: Math.round(pct(m.answerMs, 95)), p99: Math.round(pct(m.answerMs, 99)), max: Math.round(Math.max(0, ...m.answerMs)) },
    join_latency_ms: { p50: Math.round(pct(m.joinMs, 50)), p95: Math.round(pct(m.joinMs, 95)), max: Math.round(Math.max(0, ...m.joinMs)) },
    host_action_latency_ms: { p50: Math.round(pct(m.hostMs, 50)), p95: Math.round(pct(m.hostMs, 95)), max: Math.round(Math.max(0, ...m.hostMs)) },
    realtime: {
      deliveries_expected: m.expectedDeliveries,
      deliveries_received: m.receivedDeliveries,
      message_loss_pct: Math.round(loss * 10_000) / 100,
      recovered_by_state_route: m.resyncs,
    },
    refusals_expected_by_the_scenario: m.refusals,
    score_mismatches: m.scoreMismatches,
    failures: m.failures.slice(0, 40),
    failure_count: m.failures.length,
  };
}

async function main(): Promise<void> {
  const t = REAL ? await realTransport() : await dryTransport();
  log(REAL
    ? `REAL run against ${t.base} (owner go: "${CFG.ownerGo}"). Rooms and answers are written.`
    : `DRY run: local server ${t.base}, memory store, local Realtime fake, ${Math.round(CFG.drop * 100)}% of broadcast deliveries dropped on purpose.`);
  const report: Record<string, unknown> = {
    mode: REAL ? 'real' : 'dry',
    started_at: new Date().toISOString(),
    config: { rooms: CFG.rooms, players: CFG.players, rounds: CFG.rounds, long_rounds: CFG.longRounds, seconds: CFG.seconds, ...(REAL ? { limit_connections: CFG.limitConnections } : { drop: CFG.drop }) },
    phases: [] as unknown[],
  };
  let failed = 0;

  if (CFG.phase !== 'long') {
    log(`Phase 1: ${CFG.rooms} rooms x ${CFG.players} players at once, ${CFG.rounds} rounds each (chaos on) ...`);
    const m = newMetrics();
    const t0 = performance.now();
    await Promise.all(Array.from({ length: CFG.rooms }, (_, i) => playRoom(t, { index: i, players: CFG.players, rounds: CFG.rounds, chaos: true }, m)));
    const s = summarise('burst', m, CFG.rooms, CFG.players, CFG.rounds, (performance.now() - t0) / 1000);
    (report.phases as unknown[]).push(s);
    failed += m.failures.length + m.scoreMismatches;
    log(JSON.stringify(s, null, 1));
  }
  if (CFG.phase !== 'burst') {
    log(`Phase 2: 1 room x ${CFG.players} players for ${CFG.longRounds} rounds ...`);
    const m = newMetrics();
    const t0 = performance.now();
    await playRoom(t, { index: 0, players: CFG.players, rounds: CFG.longRounds, chaos: false }, m);
    const s = summarise('long', m, 1, CFG.players, CFG.longRounds, (performance.now() - t0) / 1000);
    (report.phases as unknown[]).push(s);
    failed += m.failures.length + m.scoreMismatches;
    log(JSON.stringify(s, null, 1));
  }
  if (t.realtime) {
    const r = t.realtime();
    report.local_realtime = r;
    if (r.clientSends > 0) { failed += 1; log(`A client sent ${r.clientSends} messages on a room channel: phones must only receive.`); }
  }
  report.finished_at = new Date().toISOString();
  report.ok = failed === 0;
  await t.stop();
  if (CFG.out) fs.writeFileSync(CFG.out, `${JSON.stringify(report, null, 1)}\n`);
  log(failed === 0 ? 'OK: no failure, every final score is the one its answers earn.' : `FAILED: ${failed} problem(s), see "failures" above.`);
  process.exit(failed === 0 ? 0 : 1);
}

void main();
