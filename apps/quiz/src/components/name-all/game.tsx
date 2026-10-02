'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { UxButton } from '@/components/ux-v1/button';
import { Icon } from '@/components/ux-v1/icon';
import { ShareSheet } from '@/components/ux-v1/share-sheet';
import { STORY_KIT_GRADIENT, downloadFile, storyCardFile } from '@/components/ux-v1/story-image';
import { useAnnounce, useUxToast } from '@/components/ux-v1/toast';
import { getAnonId } from '@/lib/anon-id';
import { matchName } from '@/lib/name-all/match';
import { ROUND_SECONDS, formatSeconds, resultHeadline } from '@/lib/name-all/round';

import type { NameAllMember } from '@/lib/name-all/match';
import type { NameAllStats, RoundPayload } from '@/lib/name-all/round';

/**
 * Name them all (V12 G6, SYSTEM.md 5.1, prototype view `nta`): name every member
 * of a group in 60 seconds. Three states on one URL: intro, play, result.
 *
 * The roster and its accepted spellings come from the server (database members +
 * lib/name-all/spellings.ts); the matching is lib/name-all/match.ts. A finished
 * round is sent once to POST /api/name-all/result and the screen never waits for
 * it. The community lines of the result are real aggregates or absent.
 */

type Phase = 'intro' | 'play' | 'end';

interface Props {
  group: { slug: string; name: string };
  members: NameAllMember[];
  stats: NameAllStats | null;
  /** The public path of this page ("/stray-kids-name-all-members"). */
  path: string;
}

const RING_R = 36;
const RING_C = 2 * Math.PI * RING_R;

function Ring({ left }: { left: number }): React.ReactElement {
  const off = RING_C * (1 - left / ROUND_SECONDS);
  return (
    <div className={`ux-nta-ring${left <= 10 ? ' is-low' : ''}`} role="timer" aria-label={`${left} seconds left`}>
      <svg viewBox="0 0 84 84" aria-hidden="true" focusable="false">
        <circle className="ux-nta-ring-bg" cx="42" cy="42" r={RING_R} />
        <circle className="ux-nta-ring-fg" cx="42" cy="42" r={RING_R} strokeDasharray={RING_C.toFixed(1)} strokeDashoffset={off.toFixed(1)} />
      </svg>
      <b aria-hidden="true">{left}</b>
    </div>
  );
}

export function NameAllGame({ group, members, stats, path }: Props): React.ReactElement {
  const total = members.length;
  const what = `${total} ${group.name} members`;
  const [phase, setPhase] = useState<Phase>('intro');
  const [left, setLeft] = useState(ROUND_SECONDS);
  /** Display names, in the order they were found. */
  const [found, setFound] = useState<string[]>([]);
  const [msg, setMsg] = useState('');
  const [last, setLast] = useState<string | null>(null);
  const [end, setEnd] = useState<{ seconds: number; gaveUp: boolean } | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [origin, setOrigin] = useState('https://kpopquiz.org');
  const announce = useAnnounce();
  const toast = useUxToast();
  const input = useRef<HTMLInputElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const startedAt = useRef(0);
  const foundRef = useRef<string[]>([]);
  const sent = useRef(false);

  useEffect(() => { setOrigin(window.location.origin); }, []);

  const finish = useCallback((gaveUp: boolean) => {
    if (sent.current) return;
    sent.current = true;
    const names = foundRef.current;
    const elapsed = Math.min(ROUND_SECONDS, Math.max(names.length > 0 ? 1 : 0, Math.round((performance.now() - startedAt.current) / 1000)));
    setEnd({ seconds: elapsed, gaveUp });
    setPhase('end');
    announce(`${gaveUp ? 'Round over' : names.length === total ? 'All found' : 'Time'}. You found ${names.length} of ${total}.`);
    const anon = getAnonId();
    if (!anon) return; // no storage: the round is simply not counted
    const payload: RoundPayload = { group: group.slug, found: names, seconds: elapsed, gaveUp };
    fetch('/api/name-all/result', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-nta-anon': anon },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {});
  }, [announce, group.slug, total]);

  // the clock: derived from the start time, so a throttled tab does not gain seconds
  useEffect(() => {
    if (phase !== 'play') return;
    const tick = (): void => {
      const remaining = Math.max(0, ROUND_SECONDS - Math.floor((performance.now() - startedAt.current) / 1000));
      setLeft(remaining);
      if (remaining <= 0) finish(false);
    };
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [phase, finish]);

  useEffect(() => {
    if (phase === 'play') input.current?.focus({ preventScroll: true });
    if (phase === 'end') heading.current?.focus({ preventScroll: true });
  }, [phase]);

  const start = (): void => {
    foundRef.current = [];
    sent.current = false;
    startedAt.current = performance.now();
    setFound([]);
    setMsg('');
    setLast(null);
    setEnd(null);
    setLeft(ROUND_SECONDS);
    setShareOpen(false);
    setPhase('play');
  };

  const submit = (e: React.FormEvent): void => {
    e.preventDefault();
    const el = input.current;
    if (!el || phase !== 'play') return;
    const typed = el.value;
    if (!typed.trim()) return;
    const hit = matchName(typed, members);
    if (hit && foundRef.current.includes(hit.member.name)) {
      setMsg(`${hit.member.name} is already in`);
    } else if (hit) {
      const next = [...foundRef.current, hit.member.name];
      foundRef.current = next;
      setFound(next);
      setLast(hit.member.name);
      setMsg('');
      announce(`${hit.member.name} found. ${next.length} of ${total}.`);
      if (next.length >= total) finish(false);
    } else {
      setMsg('Not on the list');
      // restart the shake on every miss (prototype ntSubmit)
      el.classList.remove('is-shake');
      void el.offsetWidth;
      el.classList.add('is-shake');
    }
    el.value = '';
  };

  const head = (title: string, intro?: boolean): React.ReactElement => (
    <div className="ux-nta-head">
      <div>
        <span className="ux-kicker"><Icon name="clock" />Name them all</span>
        <h1 ref={heading} tabIndex={-1}>{title}</h1>
        {intro ? <p>{ROUND_SECONDS} seconds. Type a name and press Enter. Stage names, real names and Hangul all count, and one typo is fine.</p> : null}
      </div>
      {phase === 'end' ? null : <Ring left={phase === 'intro' ? ROUND_SECONDS : left} />}
    </div>
  );

  if (phase === 'intro') {
    return (
      <div className="ux-nta" data-testid="nta" data-state="intro">
        {head(`Name all ${what}`, true)}
        <div className="ux-nta-actions">
          <UxButton size="lg" icon="play" onClick={start} data-testid="nta-start">Start the clock</UxButton>
        </div>
        <div className="ux-nta-grid" aria-hidden="true">
          {members.map((m, i) => (
            <div key={m.name} className="ux-nta-slot"><span className="ux-nta-no">{i + 1}</span><span className="ux-nta-nm">?</span></div>
          ))}
        </div>
      </div>
    );
  }

  if (phase === 'play') {
    return (
      <div className="ux-nta" data-testid="nta" data-state="play">
        {head(`Name all ${what}`)}
        <form className="ux-nta-form" onSubmit={submit}>
          <label className="ux-sr" htmlFor="nta-in">Type a name</label>
          <input
            ref={input}
            id="nta-in"
            className="ux-inp"
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="enter"
            placeholder="Type a member"
            onKeyDown={(e) => { if (e.key === 'Enter' && e.nativeEvent.isComposing) e.preventDefault(); }}
          />
          <UxButton size="lg" type="submit">Enter</UxButton>
        </form>
        <div className="ux-nta-meta">
          <span data-testid="nta-msg" aria-live="polite">{msg}</span>
          <span>
            <b data-testid="nta-count">{found.length}</b> of {total} · <button type="button" className="ux-lnk" onClick={() => finish(true)}>Give up</button>
          </span>
        </div>
        <ol className="ux-nta-grid" aria-label={`${group.name} members, in line-up order`}>
          {members.map((m, i) => {
            const isFound = found.includes(m.name);
            return (
              <li key={m.name} className={`ux-nta-slot${isFound ? ' is-found' : ''}${isFound && last === m.name ? ' is-new' : ''}`}>
                <span className="ux-nta-no" aria-hidden="true">{i + 1}</span>
                {isFound
                  ? <span className="ux-nta-nm">{m.name}</span>
                  : <><span className="ux-nta-nm" aria-hidden="true">?</span><span className="ux-sr">Not found yet</span></>}
              </li>
            );
          })}
        </ol>
      </div>
    );
  }

  const n = found.length;
  const time = formatSeconds(end?.seconds ?? ROUND_SECONDS);
  const line1 = `${n}/${total} ${group.name} members`;
  const line2 = `Named in ${time}`;
  const url = `${origin}${path}`;
  const storyFile = (): Promise<File | null> => storyCardFile({ image: null, line1, line2, kicker: 'Name them all', cta: 'Play at kpopquiz.org', gradient: STORY_KIT_GRADIENT }).catch(() => null);
  const saveStory = async (): Promise<void> => {
    const file = await storyFile();
    if (!file) { toast('Could not make the story image'); return; }
    if (typeof navigator.share === 'function' && navigator.canShare?.({ files: [file] })) {
      try { await navigator.share({ files: [file], title: line1 }); return; } catch (e) {
        if ((e as { name?: string } | null)?.name === 'AbortError') return;
      }
    }
    downloadFile(file);
    toast('Story image saved');
  };
  return (
    <div className="ux-nta" data-testid="nta" data-state="end">
      {head(resultHeadline(n, total))}
      <div className="ux-nta-res">
        <ol className="ux-nta-grid is-two" aria-label={`${group.name} members`}>
          {members.map((m, i) => {
            const isFound = found.includes(m.name);
            return (
              <li key={m.name} className={`ux-nta-slot ${isFound ? 'is-found' : 'is-missed'}`}>
                <span className="ux-nta-no" aria-hidden="true">{i + 1}</span>
                <span className="ux-nta-nm">{m.name}</span>
                <span className="ux-sr">{isFound ? ', found' : ', not found this time'}</span>
              </li>
            );
          })}
        </ol>
        <div className="ux-nta-score">
          <div className="ux-nta-big" data-testid="nta-score">{n}<small>/{total}</small></div>
          <p data-testid="nta-time">in {time}{n < total && end?.gaveUp ? ' · you gave up' : ''}</p>
          <div className="ux-nta-actions">
            <UxButton icon="share" onClick={() => setShareOpen(true)}>Share</UxButton>
            <UxButton variant="ghost" icon="redo" onClick={start}>Again</UxButton>
          </div>
          {stats && (stats.perfectPct !== null || stats.namedFirst) ? (
            <div className="ux-rows ux-nta-stats" data-testid="nta-stats">
              {stats.perfectPct !== null ? (
                <div className="ux-row">
                  <span>
                    <span className="ux-rt">{stats.perfectPct}% of rounds named all {total}</span>
                    <span className="ux-rs">From {stats.rounds.toLocaleString('en-US')} rounds</span>
                  </span>
                </div>
              ) : null}
              {stats.namedFirst ? (
                <div className="ux-row">
                  <span>
                    <span className="ux-rt">Named first most often: {stats.namedFirst}</span>
                    <span className="ux-rs">The name fans type before any other</span>
                  </span>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
      <ShareSheet
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        title="Share your round"
        preview={{ line1, line2 }}
        url={url}
        text={`I named ${n} of ${total} ${group.name} members in ${time}. Your turn.`}
        onStoryImage={saveStory}
        storyFile={storyFile}
      />
    </div>
  );
}
