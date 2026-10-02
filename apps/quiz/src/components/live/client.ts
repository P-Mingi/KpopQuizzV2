'use client';

// Browser side plumbing of the live blindtest, shared by the host screen and the
// phone: the API calls, the tokens kept in this browser, and the Realtime
// subscription. A browser only ever RECEIVES on the room channel (private
// channel, receive-only policy); everything it does is a call to /api/live.

import { LIVE_EVENT, LIVE_TOKEN_HEADER } from '@/lib/live/constants';

import type { LiveErrorCode, LivePublicState } from '@/lib/live/types';

export type LiveReply<T> = { ok: true; status: number; data: T } | { ok: false; status: number; error: LiveErrorCode };

/** One call to the live API. Never throws: a network failure is `server_error` with status 0. */
export async function liveCall<T>(
  path: string,
  opts: { method?: 'GET' | 'POST'; token?: string | null | undefined; body?: unknown; signal?: AbortSignal } = {},
): Promise<LiveReply<T>> {
  try {
    const headers: Record<string, string> = {};
    if (opts.token) headers[LIVE_TOKEN_HEADER] = opts.token;
    if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
    const res = await fetch(path, {
      method: opts.method ?? (opts.body !== undefined ? 'POST' : 'GET'),
      headers,
      cache: 'no-store',
      ...(opts.body !== undefined ? { body: JSON.stringify(opts.body) } : {}),
      ...(opts.signal ? { signal: opts.signal } : {}),
    });
    const data = await res.json().catch(() => ({})) as Record<string, unknown>;
    if (res.ok) return { ok: true, status: res.status, data: data as T };
    const error = typeof data.error === 'string' ? data.error as LiveErrorCode : 'server_error';
    return { ok: false, status: res.status, error };
  } catch {
    return { ok: false, status: 0, error: 'server_error' };
  }
}

// ---------------------------------------------------------------------------
// Tokens. They live in this browser only (localStorage): the host token of the
// room this tab opened, and one player token per room code. Storage blocked
// (private mode): the room still works until the tab is reloaded.
// ---------------------------------------------------------------------------

const HOST_KEY = 'kq-live-host';
const PLAYER_KEY = 'kq-live-player';

export interface HostSession { code: string; token: string }
export interface PlayerSession { code: string; token: string }

function read<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage blocked: nothing to keep */
  }
}

export function loadHostSession(): HostSession | null {
  const s = read<HostSession>(HOST_KEY);
  return s && typeof s.code === 'string' && typeof s.token === 'string' ? s : null;
}
export function saveHostSession(s: HostSession | null): void { write(HOST_KEY, s); }

export function loadPlayerSession(code: string): PlayerSession | null {
  const s = read<PlayerSession>(PLAYER_KEY);
  return s && s.code === code && typeof s.token === 'string' ? s : null;
}
/** The last room this phone joined (the join page offers to go back in). */
export function lastPlayerSession(): PlayerSession | null {
  const s = read<PlayerSession>(PLAYER_KEY);
  return s && typeof s.code === 'string' && typeof s.token === 'string' ? s : null;
}
export function savePlayerSession(s: PlayerSession | null): void { write(PLAYER_KEY, s); }

// ---------------------------------------------------------------------------
// Realtime: one subscription per topic and per page, shared by whoever listens
// (the host page shows a phone too). Receive only.
// ---------------------------------------------------------------------------

export type ChannelStatus = 'connecting' | 'live' | 'down';

interface Hub {
  listeners: Set<(state: LivePublicState) => void>;
  statusListeners: Set<(status: ChannelStatus) => void>;
  status: ChannelStatus;
  close: () => void;
}

const hubs = new Map<string, Hub>();

function openHub(topic: string): Hub {
  const hub: Hub = { listeners: new Set(), statusListeners: new Set(), status: 'connecting', close: () => {} };
  const setStatus = (s: ChannelStatus): void => {
    hub.status = s;
    for (const fn of hub.statusListeners) fn(s);
  };
  let closed = false;
  hub.close = () => { closed = true; };
  // The Supabase browser client is loaded when a room is joined, not with the page.
  void import('@/lib/supabase/client').then(({ createBrowserClient }) => {
    if (closed) return;
    const supabase = createBrowserClient();
    const channel = supabase.channel(topic, { config: { private: true, broadcast: { self: false, ack: false } } });
    channel.on('broadcast', { event: LIVE_EVENT }, (message: { payload?: unknown }) => {
      const state = message.payload as LivePublicState | undefined;
      if (!state || typeof state !== 'object' || typeof state.seq !== 'number') return;
      for (const fn of hub.listeners) fn(state);
    });
    hub.close = () => { closed = true; void supabase.removeChannel(channel); };
    // A private channel is joined with the visitor's key (anon, or the session when signed in).
    void Promise.resolve(supabase.realtime.setAuth()).catch(() => {}).then(() => {
      if (closed) return;
      channel.subscribe((status: string) => {
        if (status === 'SUBSCRIBED') setStatus('live');
        else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') setStatus('down');
      });
    });
  }).catch(() => {
    // No Realtime in this browser (blocked socket, missing config): the caller polls.
    setStatus('down');
  });
  return hub;
}

/**
 * Listen to a room. `onState` gets every public state the server broadcasts;
 * `onStatus` says whether the channel is up, so the caller can poll while it is
 * not. Returns the function that stops listening.
 */
export function subscribeLive(
  topic: string,
  onState: (state: LivePublicState) => void,
  onStatus?: (status: ChannelStatus) => void,
): () => void {
  let hub = hubs.get(topic);
  if (!hub) {
    hub = openHub(topic);
    hubs.set(topic, hub);
  }
  const h = hub;
  h.listeners.add(onState);
  if (onStatus) {
    h.statusListeners.add(onStatus);
    onStatus(h.status);
  }
  return () => {
    h.listeners.delete(onState);
    if (onStatus) h.statusListeners.delete(onStatus);
    if (h.listeners.size === 0) {
      h.close();
      hubs.delete(topic);
    }
  };
}

/** What a person reads when a call is refused. */
export function liveErrorText(error: LiveErrorCode): string {
  switch (error) {
    case 'not_live': return 'Live blindtest is not open yet.';
    case 'not_found':
    case 'bad_code': return 'No room with this code. Check the big screen.';
    case 'gone': return 'This room is closed.';
    case 'full': return 'This room is full (50 players).';
    case 'removed': return 'The host removed you from this room.';
    case 'rate_limited': return 'Too many rooms opened from here. Try again in a few minutes.';
    case 'nickname_empty': return 'Type a nickname.';
    case 'nickname_too_long': return 'That nickname is too long (16 characters at most).';
    case 'nickname_blocked': return 'Pick another nickname.';
    case 'late': return 'Too late for this round.';
    case 'duplicate': return 'Your answer is already locked in.';
    case 'not_open': return 'The round is over.';
    default: return 'Something went wrong. Try again.';
  }
}
