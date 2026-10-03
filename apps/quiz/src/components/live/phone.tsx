'use client';

import { useEffect, useId, useState } from 'react';

import { UxButton } from '@/components/ux-v1/button';
import { PhoneButtons } from '@/components/ux-v1/phone-buttons';
import { useSignIn } from '@/components/ux-v1/sign-in-sheet';
import { useUxMe } from '@/components/ux-v1/use-ux-me';
import { LIVE_CODE_LENGTH, normalizeRoomCode } from '@/lib/live/code';
import { LIVE_COLOURS, LIVE_NICK_MAX } from '@/lib/live/constants';
import { liveAnswerSaysClosed } from '@/lib/live/open';
import { nicknameInitial } from '@/lib/live/nickname';
import { BT_TRACKING } from '@/lib/tracking/bt';
import { answerShape } from '@/lib/ux-v1/a0/answer-shapes';

import { liveCall, liveErrorText } from './client';
import { useLivePlayer } from './use-player';

import type { PhoneApi } from './use-player';

// The phone of a live blindtest (prototype: the phone frame of view `livegame`).
// One component, two places: full page on /join and /join/<code>, and inside the
// phone frame next to the host screen on /live (the host can play along there).
// A phone shows no answer text and plays no audio: four colour + shape buttons,
// then what the round was worth.

const HOST_LABEL = 'kpopquiz.org/join';
const fmt = (n: number): string => n.toLocaleString('en-US');
const toneOf = (colour: number): string => answerShape(colour).tone;

type MsgIcon = 'plus' | 'check' | 'cross' | 'trophy';
const MSG_PATH: Record<MsgIcon, string> = {
  plus: 'M12 5v14M5 12h14',
  check: 'M5 12l5 5L20 7',
  cross: 'M6 6l12 12M18 6L6 18',
  trophy: 'M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z',
};

function Msg({ icon, tone, title, sub, live = true }: {
  icon: MsgIcon;
  /** A colour class (`ux-c-a..d`) or a state (`is-good`, `is-no`). */
  tone: string;
  title: string;
  sub?: string | undefined;
  live?: boolean | undefined;
}): React.ReactElement {
  return (
    <div className="ux-live-pmsg" role={live ? 'status' : undefined}>
      <div className={`ux-live-pmsg-ic ${tone}`} aria-hidden="true">
        <svg viewBox="0 0 24 24" focusable="false"><path d={MSG_PATH[icon]} /></svg>
      </div>
      <b>{title}</b>
      {sub ? <span>{sub}</span> : null}
    </div>
  );
}

function Top({ code }: { code: string | null }): React.ReactElement {
  return (
    <div className="ux-live-ptop">
      <span>{HOST_LABEL}</span>
      <b>{code ? <><span className="ux-sr">Room </span>{code}</> : null}</b>
    </div>
  );
}

function Foot({ left, right }: { left: React.ReactNode; right: React.ReactNode }): React.ReactElement {
  return <div className="ux-live-pfoot"><span>{left}</span><b>{right}</b></div>;
}

function JoinForm({ phone, roomCode, lockCode }: { phone: PhoneApi; roomCode: string | null; lockCode: boolean }): React.ReactElement {
  const id = useId();
  const [code, setCode] = useState(roomCode ?? '');
  const [nick, setNick] = useState('');
  const [colour, setColour] = useState(0);
  const busy = phone.phase === 'joining';

  useEffect(() => { if (roomCode) setCode(roomCode); }, [roomCode]);

  const submit = (e: React.FormEvent): void => {
    e.preventDefault();
    if (busy) return;
    void phone.join(code, nick, colour);
  };

  return (
    <form className="ux-live-form" onSubmit={submit} noValidate>
      <h2 className="ux-live-ph">Join a game</h2>
      <label className="ux-sr" htmlFor={`${id}-code`}>Room code</label>
      <input
        id={`${id}-code`}
        className="ux-inp ux-live-inp ux-live-codei"
        value={code}
        onChange={(e) => setCode(normalizeRoomCode(e.target.value).slice(0, LIVE_CODE_LENGTH))}
        placeholder="CODE"
        maxLength={LIVE_CODE_LENGTH + 2}
        autoCapitalize="characters"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        inputMode="text"
        readOnly={lockCode}
        aria-invalid={phone.error === 'bad_code' || phone.error === 'not_found' ? true : undefined}
      />
      <label className="ux-sr" htmlFor={`${id}-nick`}>Nickname</label>
      <input
        id={`${id}-nick`}
        className="ux-inp ux-live-inp"
        value={nick}
        onChange={(e) => setNick(e.target.value)}
        placeholder="Nickname"
        maxLength={LIVE_NICK_MAX}
        autoComplete="nickname"
        enterKeyHint="go"
        aria-invalid={phone.error?.startsWith('nickname_') ? true : undefined}
      />
      <div className="ux-live-avs" role="radiogroup" aria-label="Colour">
        {Array.from({ length: LIVE_COLOURS }, (_, i) => (
          <button
            key={i}
            type="button"
            role="radio"
            aria-checked={i === colour}
            aria-label={`Colour ${i + 1}`}
            className={`ux-c-${toneOf(i)}`}
            onClick={() => setColour(i)}
          >
            {i === colour ? nicknameInitial(nick || 'K') : ''}
          </button>
        ))}
      </div>
      {phone.error ? <p className="ux-live-perr" role="alert">{liveErrorText(phone.error)}</p> : null}
      <UxButton type="submit" size="lg" block className="ux-live-joinbtn" disabled={busy} aria-busy={busy || undefined}>Join</UxButton>
      <p className="ux-live-pnote">No account needed</p>
    </form>
  );
}

function InRoom({ phone }: { phone: PhoneApi }): React.ReactElement | null {
  const me = useUxMe();
  const signIn = useSignIn();
  const s = phone.state;
  if (!s) return null;
  const mine = s.players.find((p) => p.id === s.you.id);
  const points = mine?.score ?? 0;
  const tone = `ux-c-${toneOf(s.you.colour)}`;

  if (s.status === 'lobby') {
    return (
      <>
        <Msg icon="check" tone={tone} title="You are in!" sub="Look at the big screen. The game starts soon." />
        <Foot left={s.you.name} right={s.code} />
      </>
    );
  }

  if (s.status === 'round') {
    const locked = phone.locked;
    return (
      <>
        <PhoneButtons
          className="ux-live-pbtns"
          onAnswer={(i) => { void phone.answer(i); }}
          locked={locked ? locked.choice : null}
          label={s.prompt ?? 'Your answer'}
        />
        {phone.error && !locked ? <p className="ux-live-perr" role="alert">{liveErrorText(phone.error)}</p> : null}
        <Foot
          left={locked ? (locked.ms === null ? 'Locked in' : `Locked in · ${(locked.ms / 1000).toFixed(1)} s`) : s.you.name}
          right={`${fmt(points)} pts`}
        />
      </>
    );
  }

  if (s.status === 'reveal') {
    const result = mine?.result ?? 'none';
    const ok = result === 'ok';
    const title = ok ? `+${fmt(mine?.gain ?? 0)}` : result === 'no' ? 'Not this time' : 'No answer';
    const sub = ok
      ? ((mine?.streak ?? 0) >= 3 ? `Streak ${mine?.streak} · +${fmt(mine?.bonus ?? 0)} bonus` : 'Correct')
      : 'Streak reset';
    return (
      <>
        <Msg icon={ok ? 'check' : 'cross'} tone={ok ? 'is-good' : 'is-no'} title={title} sub={sub} />
        <Foot left={s.you.name} right={`${fmt(points)} pts`} />
      </>
    );
  }

  // Leaderboard between rounds, and the end of the game.
  const ended = s.status === 'ended';
  const signedIn = !!me?.profile;
  return (
    <>
      <Msg
        icon="trophy"
        tone={tone}
        title={`#${mine?.rank ?? s.players.length} of ${s.players.length}`}
        sub={`${fmt(points)} points${ended || s.round >= s.rounds ? '' : ' · next round soon'}`}
      />
      {ended ? (
        <div className="ux-live-pend">
          {/* The run is recorded with this browser's anonymous id; signing in attaches it (claim-runs).
              Without run tracking there is nothing to keep, so the button is not shown. */}
          {BT_TRACKING && me !== null && !signedIn ? (
            <UxButton block onClick={() => signIn({ title: 'Keep your live score', sub: 'Sign in to save this game to your passport. No password needed.' })}>
              Save my score
            </UxButton>
          ) : null}
          <UxButton block variant="ghost" href="/blindtest">Play solo</UxButton>
        </div>
      ) : null}
    </>
  );
}

interface LivePhoneProps {
  /** Room code from the page (the URL on /join/<code>, the open room on /live); null when none. */
  code: string | null;
  /** Inside the phone frame next to the host screen. */
  framed?: boolean | undefined;
}

export function LivePhoneBody({ code, framed }: LivePhoneProps): React.ReactElement {
  const phone = useLivePlayer(code);
  const joined = phone.phase === 'in' && phone.state ? phone.state.code : null;
  // Set once the island is interactive (the e2e spec waits for it before it types).
  const [ready, setReady] = useState(false);
  useEffect(() => { setReady(true); }, []);
  // The join page asks GET /api/live once, like the host screen, so a phone learns the
  // mode is not open before it types a code (issue C2-003). Only a clear "not open"
  // (503 not_live, or 404 with the flag off) shows the notice; the form stays under it
  // and fails soft on its own answer (a join then says "Not open yet" too).
  const [closed, setClosed] = useState(false);
  useEffect(() => {
    if (framed) return;
    let off = false;
    void (async () => {
      const s = await liveCall<{ ok: boolean }>('/api/live');
      if (!off && liveAnswerSaysClosed(s)) setClosed(true);
    })();
    return () => { off = true; };
  }, [framed]);
  const notice = closed && (phone.phase === 'idle' || phone.phase === 'form');

  // On the join page the address follows the room, so a reload comes back to it.
  useEffect(() => {
    if (framed || !joined) return;
    const path = `/join/${joined}`;
    if (window.location.pathname !== path) window.history.replaceState(null, '', path);
  }, [framed, joined]);

  let body: React.ReactNode;
  switch (phone.phase) {
    case 'idle':
      body = framed
        ? <Msg icon="plus" tone="ux-c-b" title="Waiting for a room" sub="The host opens it on the big screen." live={false} />
        : <JoinForm phone={phone} roomCode={null} lockCode={false} />;
      break;
    case 'form':
    case 'joining':
      body = <JoinForm phone={phone} roomCode={phone.code} lockCode={!!framed} />;
      break;
    case 'in':
      body = <InRoom phone={phone} />;
      break;
    case 'removed':
      body = (
        <>
          <Msg icon="cross" tone="is-no" title="You were removed" sub="The host removed you from this room." />
          {framed ? null : <UxButton block variant="ghost" href="/join">Join another room</UxButton>}
        </>
      );
      break;
    case 'not_live':
      body = <Msg icon="plus" tone="ux-c-b" title="Not open yet" sub="Live blindtest is not open yet. Come back soon." />;
      break;
    default:
      body = (
        <>
          <Msg icon="cross" tone="ux-c-b" title="Room closed" sub="This room is closed. Rooms last two hours." />
          {framed ? null : <UxButton block variant="ghost" href="/join" onClick={() => phone.leave()}>Join another room</UxButton>}
        </>
      );
  }

  return (
    <div className="ux-live-pbody" data-phase={phone.phase} data-open={closed ? 'no' : undefined} data-status={phone.state?.status ?? ''} data-ready={ready ? '1' : undefined}>
      <Top code={joined} />
      {notice ? <Msg icon="plus" tone="ux-c-b" title="Not open yet" sub="Live blindtest is not open yet. Come back soon." /> : null}
      {body}
    </div>
  );
}

/** The phone frame of the host page (prototype `.phone`). */
export function LivePhoneFrame({ code }: { code: string | null }): React.ReactElement {
  return (
    <div className="ux-live-phone" role="group" aria-label="A player's phone">
      <div className="ux-live-scr">
        <span className="ux-live-notch" aria-hidden="true" />
        <LivePhoneBody code={code} framed />
      </div>
    </div>
  );
}
