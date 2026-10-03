// A local stand-in for the two things a live blindtest talks to, for checks that
// must not touch production (V12 run rules 3 and 4):
//
//   the API       /api/live/** answered by the REAL service (src/lib/live/service.ts)
//                 over the memory store, plus /api/blind-test/generate answered
//                 with made-up questions
//   Realtime      the Phoenix channel protocol (vsn 2.0.0) the Supabase client
//                 speaks: join of a private topic, heartbeat, server broadcasts.
//                 Like the Realtime Authorization policy of the pending SQL, a
//                 topic can be joined only while its room is open, and a client
//                 that tries to SEND on a topic is refused and counted.
//
// Used by e2e/ux-v12/g4.spec.ts (Playwright route + routeWebSocket) and by the
// dry mode of load.mts. Nothing here runs in the app.

import { LIVE_EVENT, LIVE_TOKEN_HEADER } from '../../src/lib/live/constants';
import { fakeGenerated, fakeLive } from '../../src/lib/live/fake';
import { createRoom, expireRooms, getState, hostAction, joinRoom, liveStatus, peekRoom, submitAnswer } from '../../src/lib/live/service';

import type { FakeLive, GeneratedQuestion } from '../../src/lib/live/fake';
import type { LivePublicState } from '../../src/lib/live/types';

export interface LocalReply { status: number; body: unknown }

/** One Realtime connection as the fake sees it. */
export interface Peer { send: (text: string) => void }

export interface LocalLiveOptions {
  terms?: string[];
  /** false = "the SQL is not applied": every live route answers 503 not_live. */
  open?: boolean;
  /** Chaos: share of broadcast deliveries that are silently lost (0 to 1). */
  dropRate?: number;
  /** Chaos: delay added to each broadcast delivery, ms. */
  deliveryDelayMs?: number;
  /** The clock of the "database" (tests that move time). Default: the wall clock. */
  realTime?: boolean;
}

interface Conn {
  peer: Peer;
  topics: Map<string, string | null>; // topic -> join_ref
  open: boolean;
}

export class LocalLive {
  readonly live: FakeLive;
  open: boolean;
  dropRate: number;
  deliveryDelayMs: number;
  /** Messages a browser tried to send on a room topic. Must stay 0: phones only receive. */
  clientSends = 0;
  /** Joins refused because the channel was not private or the room not open. */
  refusedJoins = 0;
  deliveries = 0;
  dropped = 0;
  /** Every API call, for assertions. */
  calls: Array<{ method: string; path: string; status: number; token: boolean }> = [];
  /** What the host screens asked the (fake) generate route. */
  generated: Array<{ playlist: string; count: number }> = [];
  /** Replace the made-up questions (a spec that needs given answer texts). */
  questions: ((count: number) => GeneratedQuestion[]) | null = null;
  private conns = new Set<Conn>();

  constructor(opts: LocalLiveOptions = {}) {
    this.live = fakeLive({ realTime: opts.realTime ?? true, ...(opts.terms ? { terms: opts.terms } : {}) });
    this.open = opts.open ?? true;
    this.dropRate = opts.dropRate ?? 0;
    this.deliveryDelayMs = opts.deliveryDelayMs ?? 0;
    this.live.onBroadcast((topic, state) => this.deliver(topic, state));
  }

  // ----- API -----

  async api(method: string, pathname: string, headers: Record<string, string | undefined>, bodyText: string | null): Promise<LocalReply> {
    const token = headers[LIVE_TOKEN_HEADER] ?? null;
    const reply = await this.route(method.toUpperCase(), pathname.replace(/\/+$/, ''), token, bodyText);
    this.calls.push({ method: method.toUpperCase(), path: pathname, status: reply.status, token: !!token });
    return reply;
  }

  private async route(method: string, path: string, token: string | null, bodyText: string | null): Promise<LocalReply> {
    let body: unknown = {};
    if (bodyText) {
      try { body = JSON.parse(bodyText); } catch { return { status: 400, body: { error: 'bad_request' } }; }
    }
    if (method === 'POST' && path === '/api/blind-test/generate') {
      const count = Math.max(1, Math.min(20, Number((body as { count?: unknown }).count) || 10));
      this.generated.push({ playlist: String((body as { playlist?: unknown }).playlist ?? 'all'), count });
      return { status: 200, body: { questions: (this.questions ?? fakeGenerated)(count), playlist: (body as { playlist?: unknown }).playlist ?? 'all' } };
    }
    if (!path.startsWith('/api/live')) return { status: 404, body: { error: 'not_found' } };
    if (!this.open) return { status: 503, body: { error: 'not_live' } };
    const deps = this.live.deps;
    if (method === 'GET' && path === '/api/live') return liveStatus(deps);
    if (method === 'POST' && path === '/api/live/rooms') return createRoom(deps, { body, ipHash: 'local' });
    const m = /^\/api\/live\/rooms\/([^/]+)(?:\/(state|join|answer|host))?$/.exec(path);
    if (!m) return { status: 404, body: { error: 'not_found' } };
    const code = decodeURIComponent(m[1] as string);
    const leaf = m[2];
    if (method === 'GET' && !leaf) return peekRoom(deps, code);
    if (method === 'GET' && leaf === 'state') return getState(deps, code, token);
    if (method === 'POST' && leaf === 'join') return joinRoom(deps, code, body);
    if (method === 'POST' && leaf === 'answer') return submitAnswer(deps, code, token, body);
    if (method === 'POST' && leaf === 'host') return hostAction(deps, code, token, body);
    return { status: 405, body: { error: 'bad_request' } };
  }

  /** The expiry cron, as the route would run it. */
  expire(): Promise<LocalReply> {
    return expireRooms(this.live.deps);
  }

  // ----- Realtime -----

  private topicOpen(topic: string): boolean {
    const id = topic.startsWith('live:') ? topic.slice(5) : '';
    const room = this.live.store.rooms.get(id);
    return !!room && room.status !== 'closed';
  }

  /** A browser opened a Realtime socket. Feed its frames to `onMessage`. */
  connect(peer: Peer): { onMessage: (frame: string | ArrayBuffer | Buffer) => void; onClose: () => void } {
    const conn: Conn = { peer, topics: new Map(), open: true };
    this.conns.add(conn);
    const reply = (joinRef: string | null, ref: string | null, topic: string, status: 'ok' | 'error', response: unknown): void => {
      if (conn.open) peer.send(JSON.stringify([joinRef, ref, topic, 'phx_reply', { status, response }]));
    };
    return {
      onMessage: (frame) => {
        if (typeof frame !== 'string') {
          // A binary frame is a client broadcast push (the serializer of vsn 2.0.0).
          this.clientSends += 1;
          return;
        }
        let msg: [string | null, string | null, string, string, Record<string, unknown>];
        try { msg = JSON.parse(frame) as typeof msg; } catch { return; }
        const [joinRef, ref, fullTopic, event, payload] = msg;
        const topic = fullTopic.replace(/^realtime:/, '');
        if (fullTopic === 'phoenix' && event === 'heartbeat') { reply(null, ref, 'phoenix', 'ok', {}); return; }
        if (event === 'phx_join') {
          const config = (payload?.config ?? {}) as { private?: boolean };
          if (config.private !== true || !this.topicOpen(topic)) {
            this.refusedJoins += 1;
            reply(joinRef, ref, fullTopic, 'error', { reason: 'Unauthorized: You do not have permissions to read from this Channel topic' });
            return;
          }
          conn.topics.set(topic, joinRef);
          reply(joinRef, ref, fullTopic, 'ok', { postgres_changes: [] });
          return;
        }
        if (event === 'phx_leave') { conn.topics.delete(topic); reply(joinRef, ref, fullTopic, 'ok', {}); return; }
        if (event === 'access_token') return;
        if (event === 'broadcast' || event === 'presence') {
          // No INSERT policy on realtime.messages for these topics: refused.
          this.clientSends += 1;
          reply(joinRef, ref, fullTopic, 'error', { reason: 'Unauthorized: You do not have permissions to write to this Channel topic' });
        }
      },
      onClose: () => {
        conn.open = false;
        this.conns.delete(conn);
      },
    };
  }

  /** How many sockets are listening to a topic. */
  listeners(topic: string): number {
    let n = 0;
    for (const c of this.conns) if (c.open && c.topics.has(topic)) n += 1;
    return n;
  }

  private deliver(topic: string, state: LivePublicState): void {
    const frameFor = (joinRef: string | null): string =>
      JSON.stringify([joinRef, null, `realtime:${topic}`, 'broadcast', { event: LIVE_EVENT, type: 'broadcast', payload: state }]);
    for (const conn of this.conns) {
      if (!conn.open || !conn.topics.has(topic)) continue;
      this.deliveries += 1;
      if (this.dropRate > 0 && Math.random() < this.dropRate) { this.dropped += 1; continue; }
      const frame = frameFor(conn.topics.get(topic) ?? null);
      const send = (): void => { if (conn.open) conn.peer.send(frame); };
      if (this.deliveryDelayMs > 0) setTimeout(send, this.deliveryDelayMs);
      else send();
    }
  }
}
