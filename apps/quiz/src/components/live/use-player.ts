'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { parseRoomCode } from '@/lib/live/code';
import { BT_TRACKING, bestCombo, btLocale, newBtRunId, trackBtRun } from '@/lib/tracking/bt';

import { liveCall, loadPlayerSession, savePlayerSession, subscribeLive } from './client';

import type { ChannelStatus } from './client';
import type { LiveErrorCode, LivePlayerState, LivePublicState } from '@/lib/live/types';
import type { BtRunSong } from '@/lib/tracking/bt';

// A phone in a live room. It joins with a nickname, keeps its player token in
// this browser, receives the room state on the private Realtime channel and
// sends one answer per round to the API. It never sends on the channel.
//
// Losing the connection is normal on a phone: on every (re)subscription, when
// the tab comes back to the front, and on a slow timer, it reads the state route
// again with its token. That is also how a phone that dropped keeps its score:
// the token is the player, not the socket.

export type PhonePhase =
  | 'idle'        // no room yet (the host has not opened one, or no code typed)
  | 'form'        // a room code is known, the player has not joined
  | 'joining'
  | 'in'          // joined: `state` says what to show
  | 'removed'
  | 'gone'        // closed or expired
  | 'not_live';   // the mode is not open yet (SQL not applied)

export interface PhoneApi {
  phase: PhonePhase;
  code: string | null;
  state: LivePlayerState | null;
  /** Last refusal to show under the form or the buttons. */
  error: LiveErrorCode | null;
  /** The answer being sent or locked (0 to 3), with the server time once the API answered. */
  locked: { choice: number; ms: number | null } | null;
  channel: ChannelStatus;
  join: (code: string, nickname: string, colour: number) => Promise<void>;
  answer: (choice: number) => Promise<void>;
  /** Forget this room (after "closed" or "removed") and show the form again. */
  leave: () => void;
}

const POLL_DOWN_MS = 2500;
const POLL_SAFETY_MS = 20_000;

interface RunTrack {
  runId: string;
  game: number;
  startedAt: number;
  started: boolean;
  songs: BtRunSong[];
  done: Set<number>;
  finished: boolean;
}

export function useLivePlayer(roomCode: string | null): PhoneApi {
  const [code, setCode] = useState<string | null>(roomCode);
  const [phase, setPhase] = useState<PhonePhase>(roomCode ? 'form' : 'idle');
  const [state, setState] = useState<LivePlayerState | null>(null);
  const [error, setError] = useState<LiveErrorCode | null>(null);
  const [locked, setLocked] = useState<{ choice: number; ms: number | null } | null>(null);
  const [channel, setChannel] = useState<ChannelStatus>('connecting');
  const tokenRef = useRef<string | null>(null);
  const stateRef = useRef<LivePlayerState | null>(null);
  const lockedRef = useRef<{ round: number; game: number; choice: number; ms: number | null } | null>(null);
  const runRef = useRef<RunTrack | null>(null);

  // ----- tracking (lib/tracking/bt.ts, its own switch; nothing is sent when it is off) -----
  const track = useCallback((s: LivePlayerState): void => {
    if (!BT_TRACKING) return;
    const ctx = { playlist: `live:${s.code}`, mode: 'classic' as const, source: 'live' as const, locale: btLocale(), rounds: s.rounds };
    let run = runRef.current;
    if (s.status === 'round' && (!run || run.game !== s.game)) {
      const runId = newBtRunId();
      if (!runId) return;
      run = { runId, game: s.game, startedAt: Date.now(), started: false, songs: [], done: new Set(), finished: false };
      runRef.current = run;
    }
    if (!run || run.game !== s.game || run.finished) return;
    if (!run.started) {
      // The clip plays on the host screen: the first round reaching this phone is the start of its run.
      run.started = true;
      trackBtRun({ event: 'start', run_id: run.runId, ...ctx });
    }
    const me = s.players.find((p) => p.id === s.you.id);
    if (s.reveal && me && me.result && !run.done.has(s.round)) {
      run.done.add(s.round);
      const mine = lockedRef.current;
      if (me.result !== 'none') {
        run.songs.push({
          song_id: s.reveal.song_id,
          kind: s.reveal.kind,
          correct: me.result === 'ok',
          ms: mine && mine.round === s.round && mine.game === s.game && mine.ms !== null ? mine.ms : s.seconds * 1000,
        });
      }
    }
    if (s.status === 'ended' || s.status === 'closed') {
      run.finished = true;
      trackBtRun({
        event: 'finish',
        run_id: run.runId,
        ...ctx,
        answered: run.songs.length,
        correct: run.songs.filter((x) => x.correct).length,
        score: me?.score ?? 0,
        best_combo: bestCombo(run.songs),
        duration_ms: Date.now() - run.startedAt,
        completed: s.status === 'ended',
        songs: run.songs,
      });
    }
  }, []);

  // A phone that leaves in the middle of a game: the run is recorded as not completed.
  useEffect(() => {
    if (!BT_TRACKING) return;
    const onHide = (): void => {
      const run = runRef.current;
      const s = stateRef.current;
      if (!run || !s || !run.started || run.finished) return;
      run.finished = true;
      trackBtRun({
        event: 'finish',
        run_id: run.runId,
        playlist: `live:${s.code}`,
        mode: 'classic',
        source: 'live',
        locale: btLocale(),
        rounds: s.rounds,
        answered: run.songs.length,
        correct: run.songs.filter((x) => x.correct).length,
        score: s.players.find((p) => p.id === s.you.id)?.score ?? 0,
        best_combo: bestCombo(run.songs),
        duration_ms: Date.now() - run.startedAt,
        completed: false,
        songs: run.songs,
      });
    };
    window.addEventListener('pagehide', onHide);
    return () => window.removeEventListener('pagehide', onHide);
  }, []);

  // ----- state -----
  const apply = useCallback((next: LivePlayerState): void => {
    const cur = stateRef.current;
    if (cur && cur.code === next.code && next.seq < cur.seq) return;
    stateRef.current = next;
    // A lock belongs to one round of one game.
    const l = lockedRef.current;
    if (next.you.answer && next.status === 'round') {
      lockedRef.current = { round: next.round, game: next.game, choice: next.you.answer.choice, ms: next.you.answer.ms };
      setLocked({ choice: next.you.answer.choice, ms: next.you.answer.ms });
    } else if (l && (l.round !== next.round || l.game !== next.game || next.status === 'lobby')) {
      lockedRef.current = null;
      setLocked(null);
    } else if (!l) {
      setLocked(null);
    }
    setState(next);
    setPhase('in');
    track(next);
  }, [track]);

  const refuse = useCallback((status: number, err: LiveErrorCode): void => {
    if (err === 'removed') { setPhase('removed'); return; }
    if (err === 'not_live') { setPhase('not_live'); return; }
    if (err === 'gone' || err === 'not_found' || status === 404) { setPhase('gone'); return; }
    if (err === 'unauthorized') {
      // The token of another room or of a closed game: start again from the form.
      tokenRef.current = null;
      savePlayerSession(null);
      setState(null);
      stateRef.current = null;
      setPhase('form');
    }
  }, []);

  const refresh = useCallback(async (): Promise<void> => {
    const c = stateRef.current?.code ?? code;
    const token = tokenRef.current;
    if (!c || !token) return;
    const r = await liveCall<LivePlayerState>(`/api/live/rooms/${c}/state`, { token });
    if (r.ok) apply(r.data);
    else if (r.status !== 0) refuse(r.status, r.error);
  }, [apply, code, refuse]);

  // The room code comes from the page (the URL, or the host opening a room next to this phone).
  useEffect(() => {
    const next = roomCode ? parseRoomCode(roomCode) : null;
    if (next === (stateRef.current?.code ?? code)) return;
    setCode(next);
    setState(null);
    stateRef.current = null;
    tokenRef.current = null;
    setError(null);
    setPhase(next ? 'form' : 'idle');
    // Only the page's code drives this: `code` also changes when the player types one and joins.
  }, [roomCode]);

  // Back in a room this browser already joined (reload, dropped connection, the phone was locked).
  useEffect(() => {
    if (!code || tokenRef.current) return;
    const saved = loadPlayerSession(code);
    if (!saved) return;
    tokenRef.current = saved.token;
    void refresh();
  }, [code, refresh]);

  // Receive the room on its private channel; poll while the channel is down, and slowly as a safety net.
  const topic = state?.topic ?? null;
  const inRoom = phase === 'in';
  useEffect(() => {
    if (!topic || !inRoom) return;
    let first = true;
    const stop = subscribeLive(
      topic,
      (pub: LivePublicState) => {
        const cur = stateRef.current;
        if (!cur || pub.code !== cur.code) return;
        if (pub.status === 'closed') { setPhase('gone'); track({ ...cur, ...pub, you: cur.you }); return; }
        // Not on the list any more: the host removed this phone (the state route says so).
        if (!pub.players.some((p) => p.id === cur.you.id)) { void refresh(); return; }
        apply({ ...pub, you: { ...cur.you, answer: null } });
      },
      (status) => {
        setChannel(status);
        // Whatever was broadcast while this phone was not listening is in the state route.
        if (status === 'live' && !first) void refresh();
        if (status === 'live') first = false;
      },
    );
    return stop;
  }, [apply, inRoom, refresh, topic, track]);

  useEffect(() => {
    if (!inRoom) return;
    const every = channel === 'live' ? POLL_SAFETY_MS : POLL_DOWN_MS;
    const id = window.setInterval(() => { if (document.visibilityState === 'visible') void refresh(); }, every);
    const onVisible = (): void => { if (document.visibilityState === 'visible') void refresh(); };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', onVisible);
    };
  }, [channel, inRoom, refresh]);

  const join = useCallback(async (rawCode: string, nickname: string, colour: number): Promise<void> => {
    const c = parseRoomCode(rawCode);
    if (!c) { setError('bad_code'); return; }
    setError(null);
    setPhase('joining');
    const r = await liveCall<{ token: string; state: LivePlayerState }>(`/api/live/rooms/${c}/join`, { body: { nickname, colour } });
    if (!r.ok) {
      setError(r.error);
      setPhase(r.error === 'not_live' ? 'not_live' : 'form');
      return;
    }
    tokenRef.current = r.data.token;
    savePlayerSession({ code: c, token: r.data.token });
    setCode(c);
    apply(r.data.state);
  }, [apply]);

  const answer = useCallback(async (choice: number): Promise<void> => {
    const s = stateRef.current;
    const token = tokenRef.current;
    if (!s || !token || s.status !== 'round' || lockedRef.current) return;
    // Lock at once: a second tap does nothing, whatever the network does.
    lockedRef.current = { round: s.round, game: s.game, choice, ms: null };
    setLocked({ choice, ms: null });
    setError(null);
    const r = await liveCall<{ ok: true; ms: number; round: number }>(`/api/live/rooms/${s.code}/answer`, { token, body: { choice } });
    if (r.ok) {
      const l = lockedRef.current;
      if (l && l.round === r.data.round) {
        l.ms = r.data.ms;
        setLocked({ choice: l.choice, ms: r.data.ms });
      }
      return;
    }
    if (r.error === 'duplicate') { void refresh(); return; }
    // Refused (late, the round closed, the network): the buttons unlock only if the round is still open.
    lockedRef.current = null;
    setLocked(null);
    setError(r.error);
    if (r.status !== 0) refuse(r.status, r.error);
    void refresh();
  }, [refresh, refuse]);

  const leave = useCallback((): void => {
    tokenRef.current = null;
    savePlayerSession(null);
    stateRef.current = null;
    lockedRef.current = null;
    setState(null);
    setLocked(null);
    setError(null);
    setPhase(code ? 'form' : 'idle');
  }, [code]);

  return { phase, code, state, error, locked, channel, join, answer, leave };
}
