'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { useAudioPlayer } from '@/components/blind-test/use-audio-player';
import { HostTiles } from '@/components/ux-v1/answer-tiles';
import { UxButton } from '@/components/ux-v1/button';
import { Segmented } from '@/components/ux-v1/segmented';
import { Sheet } from '@/components/ux-v1/sheet';
import { useAnnounce, useUxToast } from '@/components/ux-v1/toast';
import { LIVE_DEFAULT_ROUNDS, LIVE_DEFAULT_SECONDS, LIVE_MAX_PLAYERS, LIVE_ROUND_OPTIONS, LIVE_SECOND_OPTIONS } from '@/lib/live/constants';
import { nicknameInitial } from '@/lib/live/nickname';
import { answerShape } from '@/lib/ux-v1/a0/answer-shapes';
import { ALL_PICK, GENERATIONS, MIXES } from '@/lib/ux-v1/p6/playlists';

import { liveCall, liveErrorText, loadHostSession, saveHostSession } from './client';
import { LivePhoneFrame } from './phone';
import { LiveQr } from './qr-code';

import type { HostSession } from './client';
import type { LiveErrorCode, LiveHostState, LivePublicPlayer } from '@/lib/live/types';

// The host screen of a live blindtest (prototype view `livegame`: `.screen`,
// `.hostctl` and the phone frame). This tab is the clock: it starts each round,
// shows the timer from the server's round start, asks for the reveal when the
// time is up, and plays the clip. The audio plays here only.
//
// Everything it does is a call to /api/live with the host token, which stays in
// this browser: a reload reads the room back from the state route and goes on.
// The lobby and the running round are polled once a second (who joined, how many
// answered): those two are not broadcast, see lib/live/service.ts.

interface Pick { playlist: string; label: string }

/** Playlists the generate route serves today. A link may add one: /live?playlist=<id>&name=<label>. */
const PICKS: readonly Pick[] = [
  ALL_PICK,
  ...MIXES,
  ...GENERATIONS.filter((g) => g.playlist === '5th-gen'),
];

const fmt = (n: number): string => n.toLocaleString('en-US');
const tone = (colour: number): string => `ux-c-${answerShape(colour).tone}`;
const RING = 2 * Math.PI * 48;
const POLL_MS = 1000;

function Head({ right }: { right?: React.ReactNode }): React.ReactElement {
  return (
    <div className="ux-live-sh">
      <span className="ux-live-logo"><i aria-hidden="true">K</i>KpopQuiz live</span>
      <span>{right}</span>
    </div>
  );
}

function PlayerDot({ p, className }: { p: LivePublicPlayer; className?: string }): React.ReactElement {
  return <i className={[tone(p.colour), className ?? ''].filter(Boolean).join(' ')} aria-hidden="true">{nicknameInitial(p.name)}</i>;
}

export function LiveStage(): React.ReactElement {
  const toast = useUxToast();
  const announce = useAnnounce();
  const { unlock, loadAndPlay, preload, stop, play, fadeOut, cleanup, audioRef } = useAudioPlayer();

  /** null while checking; false = the mode is not open yet (SQL not applied). */
  const [open, setOpen] = useState<boolean | null>(null);
  const [session, setSession] = useState<HostSession | null>(null);
  const [state, setState] = useState<LiveHostState | null>(null);
  const [view, setView] = useState<'setup' | 'room'>('setup');
  const [picks, setPicks] = useState<readonly Pick[]>(PICKS);
  const [pick, setPick] = useState<Pick>(ALL_PICK);
  const [rounds, setRounds] = useState<number>(LIVE_DEFAULT_ROUNDS);
  const [seconds, setSeconds] = useState<number>(LIVE_DEFAULT_SECONDS);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [managing, setManaging] = useState(false);
  const [left, setLeft] = useState<{ s: number; frac: number } | null>(null);
  const [origin, setOrigin] = useState<{ host: string; base: string } | null>(null);

  const stateRef = useRef<LiveHostState | null>(null);
  const sessionRef = useRef<HostSession | null>(null);
  /** Server clock minus this tab's clock, ms. */
  const offsetRef = useRef(0);
  const revealingRef = useRef<string | null>(null);

  const apply = useCallback((next: LiveHostState): void => {
    const cur = stateRef.current;
    // Polls and action replies can cross: never go back in time.
    if (cur && cur.code === next.code && (next.seq < cur.seq || (next.seq === cur.seq && next.now < cur.now))) return;
    offsetRef.current = next.now - Date.now();
    stateRef.current = next;
    setState(next);
  }, []);

  const lose = useCallback((err: LiveErrorCode): void => {
    // The room is gone (closed, two hours old) or the token is no longer good.
    saveHostSession(null);
    sessionRef.current = null;
    stateRef.current = null;
    setSession(null);
    setState(null);
    setView('setup');
    setManaging(false);
    cleanup();
    if (err === 'not_live') setOpen(false);
    else toast(liveErrorText('gone'));
  }, [cleanup, toast]);

  const refused = useCallback((status: number, err: LiveErrorCode): void => {
    if (err === 'gone' || err === 'unauthorized' || err === 'not_live' || status === 404) { lose(err); return; }
    if (err === 'bad_state') return; // a repeated click: the next poll shows where the room is
    toast(liveErrorText(err));
  }, [lose, toast]);

  const hostCall = useCallback(async (body: Record<string, unknown>): Promise<LiveHostState | null> => {
    const s = sessionRef.current;
    if (!s) return null;
    const r = await liveCall<{ state?: LiveHostState; closed?: boolean }>(`/api/live/rooms/${s.code}/host`, { token: s.token, body });
    if (r.ok && r.data.state) { apply(r.data.state); return r.data.state; }
    if (!r.ok) refused(r.status, r.error);
    return null;
  }, [apply, refused]);

  const refresh = useCallback(async (): Promise<void> => {
    const s = sessionRef.current;
    if (!s) return;
    const r = await liveCall<LiveHostState>(`/api/live/rooms/${s.code}/state`, { token: s.token });
    if (r.ok) apply(r.data);
    else if (r.status !== 0) refused(r.status, r.error);
  }, [apply, refused]);

  // On load: is the mode open, and does this browser host a room (a reload resumes it)?
  useEffect(() => {
    let off = false;
    setOrigin({ host: window.location.host, base: window.location.origin });
    try {
      const q = new URLSearchParams(window.location.search);
      const id = (q.get('playlist') ?? '').trim();
      if (/^[A-Za-z0-9][A-Za-z0-9_.+-]{0,79}$/.test(id)) {
        const known = PICKS.find((p) => p.playlist === id);
        const linked: Pick = known ?? { playlist: id, label: (q.get('name') ?? '').replace(/\s+/g, ' ').trim().slice(0, 40) || id };
        if (!known) setPicks([linked, ...PICKS]);
        setPick(linked);
      }
    } catch { /* no query to read */ }
    void (async () => {
      const saved = loadHostSession();
      if (saved) {
        const r = await liveCall<LiveHostState>(`/api/live/rooms/${saved.code}/state`, { token: saved.token });
        if (off) return;
        if (r.ok) {
          sessionRef.current = saved;
          setSession(saved);
          apply(r.data);
          setRounds(r.data.rounds);
          setSeconds(r.data.seconds);
          setView('room');
          setOpen(true);
          return;
        }
        if (r.status !== 0) saveHostSession(null);
      }
      const s = await liveCall<{ ok: boolean }>('/api/live');
      if (off) return;
      setOpen(s.ok || !(s.error === 'not_live' || s.status === 404));
    })();
    return () => { off = true; };
  }, [apply]);

  useEffect(() => cleanup, [cleanup]);

  const status = state?.status ?? null;
  const inRoom = view === 'room' && !!state;

  // Who joined (lobby) and how many answered (round): not broadcast, so the host screen asks.
  useEffect(() => {
    if (!session || (status !== 'lobby' && status !== 'round')) return;
    const id = window.setInterval(() => { if (document.visibilityState === 'visible') void refresh(); }, POLL_MS);
    return () => window.clearInterval(id);
  }, [refresh, session, status]);

  // Buffer the next clip while the current screen is up, so the round starts on the first note.
  const nextUrl = state?.host.next_preview_url ?? null;
  useEffect(() => { if (nextUrl) preload(nextUrl); }, [nextUrl, preload]);

  const reveal = useCallback(async (): Promise<void> => {
    const s = stateRef.current;
    if (!s || s.status !== 'round') return;
    const key = `${s.game}:${s.round}`;
    if (revealingRef.current === key) return;
    revealingRef.current = key;
    const next = await hostCall({ action: 'reveal', round: s.round });
    if (!next) revealingRef.current = null;
    else if (next.reveal) announce(`The answer was ${next.reveal.answer}.`);
  }, [announce, hostCall]);

  // The round timer, from the server's round start. At zero the host asks for the reveal.
  const endsAt = status === 'round' ? state?.ends_at ?? null : null;
  const roundSeconds = state?.seconds ?? LIVE_DEFAULT_SECONDS;
  useEffect(() => {
    if (endsAt === null) { setLeft(null); return; }
    const tick = (): void => {
      const ms = endsAt - (Date.now() + offsetRef.current);
      const total = roundSeconds * 1000;
      setLeft({ s: Math.max(0, Math.min(roundSeconds, Math.ceil(ms / 1000))), frac: Math.max(0, Math.min(1, ms / total)) });
      if (ms <= 0) void reveal();
    };
    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [endsAt, reveal, roundSeconds]);

  // Everybody answered: no need to wait for the timer.
  const answered = state?.answered ?? 0;
  const playerCount = state?.players.length ?? 0;
  useEffect(() => {
    if (status !== 'round' || playerCount === 0 || answered < playerCount) return;
    const id = window.setTimeout(() => { void reveal(); }, 600);
    return () => window.clearTimeout(id);
  }, [answered, playerCount, reveal, status]);

  async function generate(p: Pick, count: number): Promise<unknown[] | null> {
    try {
      const res = await fetch('/api/blind-test/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playlist: p.playlist, count, mode: 'challenge' }),
      });
      const data = await res.json().catch(() => ({})) as { questions?: unknown };
      if (!res.ok || !Array.isArray(data.questions) || data.questions.length < count) {
        setError(res.status === 400 ? 'This playlist has too few songs for a live game. Pick another one.' : 'The songs could not be loaded. Try again.');
        return null;
      }
      return data.questions;
    } catch {
      setError('The songs could not be loaded. Try again.');
      return null;
    }
  }

  const settingsBody = (questions: unknown[]): Record<string, unknown> => ({ playlist: pick.playlist, label: pick.label, rounds, seconds, questions });

  const openRoom = async (): Promise<void> => {
    if (busy || open === false) return;
    unlock(); // inside the click (iOS Safari): the clips play later, after network calls
    setBusy(true);
    setError(null);
    const questions = await generate(pick, rounds);
    if (!questions) { setBusy(false); return; }
    if (sessionRef.current && stateRef.current?.status === 'lobby') {
      // "Settings" from the lobby: the same room, the players stay.
      if (await hostCall({ action: 'settings', ...settingsBody(questions) })) setView('room');
      setBusy(false);
      return;
    }
    const r = await liveCall<{ code: string; host_token: string; state: LiveHostState }>('/api/live/rooms', { body: settingsBody(questions) });
    setBusy(false);
    if (!r.ok) {
      if (r.error === 'not_live') setOpen(false);
      else setError(liveErrorText(r.error));
      return;
    }
    const s: HostSession = { code: r.data.code, token: r.data.host_token };
    saveHostSession(s);
    sessionRef.current = s;
    setSession(s);
    apply(r.data.state);
    setView('room');
    announce(`Room ${r.data.code.split('').join(' ')} is open.`);
  };

  const start = async (round: number): Promise<void> => {
    if (busy) return;
    unlock();
    setBusy(true);
    const next = await hostCall({ action: 'start', round });
    setBusy(false);
    const url = next?.host.question?.preview_url;
    if (next && next.status === 'round' && url) {
      loadAndPlay(url);
      announce(`Round ${next.round} of ${next.rounds}. ${next.prompt ?? ''}`);
    }
  };

  const replay = (): void => {
    unlock();
    const url = stateRef.current?.host.question?.preview_url;
    if (audioRef.current) { stop(); play(); } else if (url) loadAndPlay(url);
  };

  const board = async (): Promise<void> => {
    if (busy) return;
    setBusy(true);
    fadeOut(600);
    await hostCall({ action: 'board' });
    setBusy(false);
  };

  const end = async (): Promise<void> => {
    if (busy) return;
    setBusy(true);
    await hostCall({ action: 'end' });
    setBusy(false);
  };

  const again = async (): Promise<void> => {
    if (busy) return;
    unlock();
    setBusy(true);
    setError(null);
    const questions = await generate(pick, rounds);
    if (questions) await hostCall({ action: 'again', ...settingsBody(questions) });
    else toast('The songs could not be loaded. Try again.');
    setBusy(false);
  };

  const remove = async (p: LivePublicPlayer): Promise<void> => {
    if (await hostCall({ action: 'remove', player_id: p.id })) toast(`${p.name} was removed`);
  };

  const closeRoom = async (): Promise<void> => {
    const s = sessionRef.current;
    if (!s) return;
    setBusy(true);
    await liveCall(`/api/live/rooms/${s.code}/host`, { token: s.token, body: { action: 'close' } });
    setBusy(false);
    saveHostSession(null);
    sessionRef.current = null;
    stateRef.current = null;
    setSession(null);
    setState(null);
    setView('setup');
    cleanup();
  };

  // ----- the screen -----
  let screen: React.ReactNode;
  let controls: React.ReactNode;

  if (!inRoom || !state) {
    const editing = !!session && state?.status === 'lobby';
    screen = (
      <>
        <Head />
        <div className="ux-live-round2 is-setup">
          <h2 className="ux-live-h3">Host a live blindtest</h2>
          {open === false ? (
            <p className="ux-live-closed" role="status">Live blindtest is not open yet. It opens here soon.</p>
          ) : null}
          <div className="ux-live-setupg">
            <div>
              <div className="ux-live-flabel" id="ux-live-pl">Playlist</div>
              <div className="ux-live-fopts" role="radiogroup" aria-labelledby="ux-live-pl">
                {picks.map((p) => (
                  <button
                    key={p.playlist}
                    type="button"
                    role="radio"
                    aria-checked={p.playlist === pick.playlist}
                    className="ux-live-fopt"
                    onClick={() => setPick(p)}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="ux-live-flabel">Rounds and time to answer</div>
              <div className="ux-live-segs">
                <Segmented
                  label="Rounds"
                  options={LIVE_ROUND_OPTIONS.map((n) => ({ value: String(n), label: String(n) }))}
                  value={String(rounds)}
                  onChange={(v) => setRounds(Number(v))}
                />
                <Segmented
                  label="Seconds"
                  options={LIVE_SECOND_OPTIONS.map((n) => ({ value: String(n), label: `${n} s` }))}
                  value={String(seconds)}
                  onChange={(v) => setSeconds(Number(v))}
                />
              </div>
            </div>
          </div>
          {error ? <p className="ux-live-err" role="alert">{error}</p> : null}
        </div>
        <div className="ux-live-sfoot"><span>Up to {LIVE_MAX_PLAYERS} players · no account needed to join</span></div>
      </>
    );
    controls = (
      <>
        <UxButton size="lg" icon="play" onClick={() => { void openRoom(); }} disabled={busy || open !== true} aria-busy={busy || undefined}>
          {editing ? 'Back to the room' : 'Open the room'}
        </UxButton>
      </>
    );
  } else if (state.status === 'lobby') {
    const joinUrl = `${origin?.base ?? 'https://kpopquiz.org'}/join/${state.code}`;
    screen = (
      <>
        <Head right={<>Room <b>{state.code}</b></>} />
        <div className="ux-live-lobby">
          <div className="ux-live-qrbox"><LiveQr text={joinUrl} label={`QR code to join room ${state.code.split('').join(' ')}`} /></div>
          <div className="ux-live-joinfo">
            <div className="ux-live-l1">Join on your phone at</div>
            <div className="ux-live-url">{origin?.host ?? 'kpopquiz.org'}/join</div>
            <div className="ux-live-code" aria-label={`Room code ${state.code.split('').join(' ')}`}>{state.code}</div>
            <ul className="ux-live-players" aria-label="Players in the room">
              {state.players.map((p) => (
                <li key={p.id}><PlayerDot p={p} />{p.name}</li>
              ))}
            </ul>
          </div>
        </div>
        <div className="ux-live-sfoot">
          <span><b>{state.players.length}</b> {state.players.length === 1 ? 'player' : 'players'} in</span>
          <span>Audio plays on this screen only</span>
        </div>
      </>
    );
    controls = (
      <>
        <UxButton size="lg" icon="play" onClick={() => { void start(1); }} disabled={busy || state.players.length < 2} aria-busy={busy || undefined}>Start</UxButton>
        <UxButton size="lg" variant="ghost" onClick={() => setView('setup')}>Settings</UxButton>
      </>
    );
  } else if (state.status === 'round') {
    const q = state.host.question;
    screen = (
      <>
        <Head right={<>Round <b>{state.round}</b> of {state.rounds}</>} />
        <div className="ux-live-round2">
          <div className="ux-live-orb" role="timer" aria-label={`${left?.s ?? state.seconds} seconds left`}>
            <svg viewBox="0 0 110 110" aria-hidden="true" focusable="false">
              <circle className="ux-live-orb-bg" cx="55" cy="55" r="48" />
              <circle className="ux-live-orb-fg" cx="55" cy="55" r="48" strokeDasharray={RING.toFixed(1)} strokeDashoffset={(RING * (1 - (left?.frac ?? 1))).toFixed(1)} />
            </svg>
            <b>{left?.s ?? state.seconds}</b>
          </div>
          <h2 className="ux-live-h3">{state.prompt}</h2>
          {q ? <HostTiles options={q.options} /> : null}
          <div className="ux-live-answered"><b>{state.answered}</b> of {state.players.length} answered</div>
        </div>
      </>
    );
    controls = (
      <>
        <UxButton variant="ghost" onClick={() => { void reveal(); }}>Skip the timer</UxButton>
        <UxButton variant="quiet" icon="redo" onClick={replay}>Replay clip</UxButton>
      </>
    );
  } else if (state.status === 'reveal') {
    const q = state.host.question;
    screen = (
      <>
        <Head right={<>Round <b>{state.round}</b> of {state.rounds}</>} />
        <div className="ux-live-round2 is-reveal">
          <div className="ux-live-qlab">{state.prompt}</div>
          <h2 className="ux-live-h3">{state.reveal?.answer}</h2>
          {q && state.reveal ? <HostTiles options={q.options} reveal={{ correct: state.reveal.correct, counts: state.reveal.counts }} /> : null}
        </div>
      </>
    );
    controls = <UxButton size="lg" onClick={() => { void board(); }} disabled={busy}>Show the leaderboard</UxButton>;
  } else if (state.status === 'board') {
    const last = state.round >= state.rounds;
    screen = (
      <>
        <Head right={<>Round <b>{state.round}</b> of {state.rounds}</>} />
        <div className="ux-live-board">
          <h2 className="ux-live-bh">Leaderboard</h2>
          <ol className="ux-live-rows">
            {state.players.slice(0, 5).map((p) => (
              <li key={p.id} className="ux-live-br">
                <span className="ux-live-rk">{p.rank}</span>
                <PlayerDot p={p} />
                <b>{p.name}</b>
                <span className="ux-live-pts">{fmt(p.score)}</span>
                <span className="ux-live-up">{p.gain > 0 ? `+${fmt(p.gain)}` : ''}</span>
              </li>
            ))}
          </ol>
        </div>
      </>
    );
    controls = last
      ? <UxButton size="lg" onClick={() => { void end(); }} disabled={busy}>Show the podium</UxButton>
      : <UxButton size="lg" onClick={() => { void start(state.round + 1); }} disabled={busy} aria-busy={busy || undefined}>Next round</UxButton>;
  } else {
    const [first, second, third] = state.players;
    const places: Array<[LivePublicPlayer | undefined, string, number]> = [[second, 'is-p2', 2], [first, 'is-p1', 1], [third, 'is-p3', 3]];
    screen = (
      <>
        <Head />
        <div className="ux-live-round2 is-end">
          <h2 className="ux-live-h3">Final podium</h2>
          <ol className="ux-live-podium">
            {places.map(([p, cls, place]) => (p ? (
              <li key={p.id} className={`ux-live-p ${cls}`}>
                <PlayerDot p={p} />
                <b>{p.name}</b>
                <span className="ux-muted ux-num ux-live-ppts">{fmt(p.score)}<span className="ux-sr"> points, place {place}</span></span>
                <div className="ux-live-blk" aria-hidden="true">{place}</div>
              </li>
            ) : null))}
          </ol>
        </div>
      </>
    );
    controls = (
      <>
        <UxButton size="lg" icon="redo" onClick={() => { void again(); }} disabled={busy} aria-busy={busy || undefined}>Play again</UxButton>
        <UxButton size="lg" variant="ghost" onClick={() => { void closeRoom(); }} disabled={busy}>Close the room</UxButton>
      </>
    );
  }

  const canManage = inRoom && !!state && state.status !== 'ended' && state.players.length > 0;

  return (
    <div className="ux-live-wrap">
      <div className="ux-live-main">
        <div className="ux-live-screen" data-state={inRoom && state ? state.status : 'setup'} data-open={open === null ? 'checking' : open ? 'yes' : 'no'}>
          {screen}
        </div>
        <div className="ux-live-ctl">
          {controls}
          {canManage ? <UxButton variant="quiet" size={state.status === 'round' ? 'md' : 'lg'} icon="users" onClick={() => setManaging(true)}>Players</UxButton> : null}
        </div>
      </div>
      <div className="ux-live-side">
        <LivePhoneFrame code={session ? session.code : null} />
        <p className="ux-live-cap">Play along here, or join on your own phone.</p>
      </div>
      <Sheet open={managing && !!state} onClose={() => setManaging(false)} title="Players" width={440}>
        <ul className="ux-live-manage">
          {(state?.players ?? []).map((p) => (
            <li key={p.id}>
              <PlayerDot p={p} />
              <b>{p.name}</b>
              <UxButton variant="ghost" size="sm" onClick={() => { void remove(p); }} aria-label={`Remove ${p.name}`}>Remove</UxButton>
            </li>
          ))}
        </ul>
        {state && state.players.length === 0 ? <p className="ux-muted">Nobody is in the room.</p> : null}
      </Sheet>
    </div>
  );
}
