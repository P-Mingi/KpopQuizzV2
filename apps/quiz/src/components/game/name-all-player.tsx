'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';

import { playFound, playPerfect } from '@/lib/sounds';
import { findMatch, formatTimer, getScoreLabel, getInitials, spawnParticles } from '@/lib/name-all-utils';

import type { GameWithGroup, NameAllMember } from '@/lib/db/types';

type Phase = 'start' | 'playing' | 'result';
type Mode = 'blind' | 'photo';

interface NameAllPlayerProps {
  game: GameWithGroup;
}

// ---- Member Cell (blind mode) ----

function BlindMemberCell({
  member,
  isFound,
  isHinted,
  hintLetter,
  justFound,
}: {
  member: NameAllMember;
  isFound: boolean;
  isHinted: boolean;
  hintLetter: string | undefined;
  justFound: boolean;
}) {
  const cellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (justFound && cellRef.current) {
      spawnParticles(cellRef.current);
    }
  }, [justFound]);

  if (isFound) {
    return (
      <div
        ref={cellRef}
        className={`flex flex-col items-center justify-center rounded-xl bg-[#EAF3DE] p-2 relative ${justFound ? 'animate-pop-in' : ''}`}
        style={{ aspectRatio: '3/4' }}
      >
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold mb-1"
          style={{ backgroundColor: member.color || '#0F6E56' }}
        >
          {getInitials(member.name)}
        </div>
        <p className="text-[11px] font-medium text-[#27500A] text-center leading-tight truncate w-full">
          {member.name}
        </p>
        <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-[#0F6E56] flex items-center justify-center animate-check-pop">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5.5L4 7.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
      </div>
    );
  }

  if (isHinted) {
    return (
      <div
        className="flex flex-col items-center justify-center rounded-xl bg-[#EEEDFE] p-2"
        style={{ aspectRatio: '3/4' }}
      >
        <p className="text-lg font-bold text-[#3C3489] mb-1">{hintLetter}_</p>
        <p className="text-[10px] text-[#3C3489] italic">hint</p>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col items-center justify-center rounded-xl bg-[#F0EDE8] p-2"
      style={{ aspectRatio: '3/4' }}
    >
      <p className="text-2xl font-bold text-[var(--text-tertiary)] mb-1">?</p>
      <p className="text-[10px] text-[var(--text-tertiary)]">???</p>
    </div>
  );
}

// ---- Photo Card (photo mode) ----

function PhotoMemberCard({
  member,
  isFound,
  justFound,
  onMatch,
}: {
  member: NameAllMember;
  isFound: boolean;
  justFound: boolean;
  onMatch: () => void;
}) {
  const [value, setValue] = useState('');
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (justFound && cardRef.current) {
      spawnParticles(cardRef.current);
    }
  }, [justFound]);

  function handleChange(v: string) {
    setValue(v);
    if (v.length < 2) return;
    const clean = v.trim().toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ');
    const allNames = [member.name, ...member.aliases].map(n => n.trim().toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' '));
    const matched = allNames.some(name =>
      name === clean || (clean.length >= 3 && name.startsWith(clean) && clean.length >= name.length - 1)
    );
    if (matched) {
      onMatch();
      setValue('');
    }
  }

  return (
    <div
      ref={cardRef}
      className={`rounded-xl overflow-hidden border-2 transition-colors ${
        isFound ? 'border-[#97C459]' : 'border-[var(--border)]'
      } ${justFound ? 'animate-pop-in' : ''}`}
    >
      <div className="relative" style={{ aspectRatio: '3/4' }}>
        {member.photo_url ? (
          <Image
            src={member.photo_url}
            alt={isFound ? member.name : 'Member'}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 33vw, 25vw"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ backgroundColor: (member.color || '#888') + '20' }}
          >
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center text-white text-lg font-bold"
              style={{ backgroundColor: member.color || '#888' }}
            >
              {getInitials(member.name)}
            </div>
          </div>
        )}
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent px-2 py-2">
          <p className="text-white text-xs font-medium truncate">
            {isFound ? member.name : 'Who is this?'}
          </p>
        </div>
        {isFound && (
          <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-[#0F6E56] flex items-center justify-center animate-check-pop">
            <svg width="12" height="12" viewBox="0 0 10 10" fill="none"><path d="M2 5.5L4 7.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
        )}
      </div>
      {!isFound && (
        <div className="p-1.5">
          <input
            type="text"
            value={value}
            onChange={e => handleChange(e.target.value)}
            placeholder="..."
            className="w-full text-xs px-2 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] outline-none focus:border-[var(--accent)] transition-colors"
          />
        </div>
      )}
    </div>
  );
}

// ---- Main Component ----

export function NameAllPlayer({ game }: NameAllPlayerProps): React.ReactElement {
  const rawContent = game.content as unknown as Record<string, unknown>;

  // Normalize: old format uses 'members', new format uses 'items'
  const members: NameAllMember[] = (
    (rawContent.members as NameAllMember[]) ??
    ((rawContent.items as Array<{ name: string; aliases: string[]; color?: string; position?: string; group?: string }>)?.map((item, i) => ({
      name: item.name,
      aliases: item.aliases ?? [],
      photo_url: null,
      position: item.group ?? item.position ?? '',
      color: item.color ?? ['#D4537E', '#7F77DD', '#0F6E56', '#BA7517', '#378ADD', '#E67E22', '#9B59B6', '#2ECC71'][i % 8],
    }))) ??
    []
  );
  const totalTime = (rawContent.timer_seconds as number) ?? 60;
  const isSongGame = game.game_type === 'name_all_songs' || game.game_type === 'name_top_songs';
  const albumName = (rawContent.album as string) ?? null;
  const artistName = (rawContent.artist as string) ?? null;

  const [phase, setPhase] = useState<Phase>('start');
  const [mode, setMode] = useState<Mode>('blind');
  const [found, setFound] = useState<Set<string>>(new Set());
  const [timeLeft, setTimeLeft] = useState(totalTime);
  const [hintsLeft, setHintsLeft] = useState(3);
  const [hintedMembers, setHintedMembers] = useState<Map<string, string>>(new Map());
  const [inputValue, setInputValue] = useState('');
  const [lastFound, setLastFound] = useState<string | null>(null);
  const [koreanText, setKoreanText] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const foundRef = useRef<Set<string>>(found);
  foundRef.current = found;

  // Timer
  useEffect(() => {
    if (phase !== 'playing') return;

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          // Small delay so state settles before phase change
          setTimeout(() => endGame(), 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  function startGame() {
    setPhase('playing');
    setFound(new Set());
    setTimeLeft(totalTime);
    setHintsLeft(3);
    setHintedMembers(new Map());
    setInputValue('');
    setLastFound(null);
    setKoreanText(null);
    setTimeout(() => inputRef.current?.focus(), 100);
  }

  function endGame() {
    if (timerRef.current) clearInterval(timerRef.current);
    submitPlay();
    setPhase('result');
  }

  function giveUp() {
    endGame();
  }

  async function submitPlay() {
    try {
      await fetch(`/api/game/${game.id}/play`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          choices: {
            score: foundRef.current.size,
            total: members.length,
            time_taken: totalTime - timeLeft,
            mode,
            found_members: [...foundRef.current],
          },
        }),
      });
    } catch (err) {
      console.error('Failed to submit play:', err);
    }
  }

  const handleInputChange = useCallback((value: string) => {
    setInputValue(value);
    if (value.length < 2) return;

    const match = findMatch(value, members, foundRef.current);
    if (match) {
      const newFound = new Set([...foundRef.current, match.name]);
      setFound(newFound);
      foundRef.current = newFound;
      setInputValue('');
      setLastFound(match.name);
      setKoreanText(match.name);
      playFound();

      if (newFound.size === members.length) {
        playPerfect();
        setTimeout(() => endGame(), 800);
      }

      setTimeout(() => setLastFound(null), 1500);
      setTimeout(() => setKoreanText(null), 700);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [members]);

  function useHint() {
    if (hintsLeft <= 0) return;
    const unfound = members.filter(m => !found.has(m.name) && !hintedMembers.has(m.name));
    if (unfound.length === 0) return;

    const pick = unfound[Math.floor(Math.random() * unfound.length)]!;

    if (mode === 'photo') {
      // In photo mode, hints auto-reveal a member
      const newFound = new Set([...found, pick.name]);
      setFound(newFound);
      foundRef.current = newFound;
      setLastFound(pick.name);
      playFound();
      setTimeout(() => setLastFound(null), 1500);

      if (newFound.size === members.length) {
        playPerfect();
        setTimeout(() => endGame(), 800);
      }
    } else {
      // In blind mode, show first letter
      const letter = pick.name.charAt(0).toUpperCase();
      setHintedMembers(prev => new Map([...prev, [pick.name, letter]]));
    }

    setHintsLeft(prev => prev - 1);
  }

  const foundPct = members.length > 0 ? (found.size / members.length) * 100 : 0;
  const progressColor = foundPct > 50 ? '#0F6E56' : foundPct >= 30 ? '#BA7517' : '#A32D2D';

  // ---- RENDER ----

  return (
    <div>
      {/* START PHASE */}
      {phase === 'start' && (
        <div className="text-center animate-fade-in">
          <div className="mb-4">
            <Link
              href="/games"
              className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              &larr; Back to Games
            </Link>
          </div>

          {/* Group logo */}
          <div className="flex justify-center mb-4">
            {game.logo_url ? (
              <div
                className="w-[60px] h-[60px] rounded-full overflow-hidden border-2"
                style={{ borderColor: game.display_color || 'var(--border)' }}
              >
                <Image src={game.logo_url} alt={game.group_name || ''} width={60} height={60} className="object-cover" />
              </div>
            ) : (
              <div
                className="w-[60px] h-[60px] rounded-full flex items-center justify-center text-white text-lg font-bold"
                style={{ backgroundColor: game.display_color || '#888' }}
              >
                {game.group_name ? getInitials(game.group_name) : '?'}
              </div>
            )}
          </div>

          <h1 className="text-xl font-medium mb-1">
            {game.title}
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mb-1">
            {isSongGame && albumName ? `${albumName} - ${artistName}` : (game.group_name || '')}
          </p>
          <p className="text-xs text-[var(--text-tertiary)] mb-6">
            {members.length} {isSongGame ? 'songs' : game.game_type === 'name_all_groups' ? 'groups' : game.game_type === 'name_all_idols' ? 'idols' : 'members'} / {formatTimer(totalTime)}
          </p>

          <p className="text-xs text-[var(--text-tertiary)] mb-3 font-medium uppercase tracking-wide">
            Choose your mode
          </p>

          {/* Mode cards */}
          <div className="grid grid-cols-2 gap-3 mb-6 max-w-sm mx-auto">
            <button
              onClick={() => setMode('blind')}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                mode === 'blind'
                  ? 'border-[var(--accent)] bg-[var(--accent-bg)]'
                  : 'border-[var(--border)] hover:border-[var(--text-tertiary)]'
              }`}
            >
              <p className="text-sm font-medium mb-1">Blind mode</p>
              <p className="text-[11px] text-[var(--text-secondary)] leading-snug">
                No clues, pure memory. For hardcore fans.
              </p>
            </button>
            <button
              onClick={() => setMode('photo')}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                mode === 'photo'
                  ? 'border-[var(--accent)] bg-[var(--accent-bg)]'
                  : 'border-[var(--border)] hover:border-[var(--text-tertiary)]'
              }`}
            >
              <p className="text-sm font-medium mb-1">Photo mode</p>
              <p className="text-[11px] text-[var(--text-secondary)] leading-snug">
                See photos, type names. For everyone.
              </p>
            </button>
          </div>

          <button
            onClick={startGame}
            className="px-10 py-3 rounded-full bg-[var(--text-primary)] text-white text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Start game
          </button>
        </div>
      )}

      {/* PLAYING PHASE */}
      {phase === 'playing' && (
        <div className="animate-question-in">
          {/* Header bar */}
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={giveUp}
              className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              Quit
            </button>
            <p className={`text-sm font-medium tabular-nums ${timeLeft < 30 ? 'text-[#A32D2D]' : ''}`}>
              {formatTimer(timeLeft)}
            </p>
            <p className="text-xs text-[var(--text-secondary)] tabular-nums">
              {found.size}/{members.length}
            </p>
          </div>

          {/* Progress bar */}
          <div className="h-[3px] bg-[var(--border)] rounded-full mb-5">
            <div
              className="h-[3px] rounded-full transition-all duration-400"
              style={{ width: `${foundPct}%`, backgroundColor: progressColor }}
            />
          </div>

          {/* BLIND MODE GRID */}
          {mode === 'blind' && (
            <>
              <div className="grid grid-cols-4 md:grid-cols-5 gap-2 mb-4 relative">
                {members.map(member => (
                  <BlindMemberCell
                    key={member.name}
                    member={member}
                    isFound={found.has(member.name)}
                    isHinted={hintedMembers.has(member.name)}
                    hintLetter={hintedMembers.get(member.name)}
                    justFound={lastFound === member.name}
                  />
                ))}
                {/* Korean floating text */}
                {koreanText && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span className="text-lg font-bold text-[var(--accent)] animate-korean-float">
                      {koreanText}!
                    </span>
                  </div>
                )}
              </div>

              {/* Status text */}
              <div className="h-6 flex items-center justify-center mb-2">
                {lastFound && (
                  <p className="text-sm font-medium text-[#0F6E56] animate-slide-in-up">
                    {lastFound} found!
                  </p>
                )}
              </div>

              {/* Input */}
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={e => handleInputChange(e.target.value)}
                placeholder="Type a member name..."
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-white text-sm outline-none focus:border-[var(--accent)] transition-colors mb-3"
              />

              {/* Action buttons */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={useHint}
                  disabled={hintsLeft <= 0}
                  className="flex-1 py-2.5 rounded-xl border border-[var(--border)] text-xs font-medium disabled:opacity-40 transition-opacity"
                >
                  Hint ({hintsLeft} left)
                </button>
                <button
                  onClick={giveUp}
                  className="flex-1 py-2.5 rounded-xl border border-[var(--border)] text-xs font-medium text-[#A32D2D] hover:bg-[#FCEBEB] transition-colors"
                >
                  Give up
                </button>
              </div>

              {/* Stats row */}
              <div className="flex justify-center gap-6 text-[11px] text-[var(--text-tertiary)]">
                <span>Found: {found.size}</span>
                <span>Left: {members.length - found.size}</span>
                <span>Time: {formatTimer(timeLeft)}</span>
              </div>
            </>
          )}

          {/* PHOTO MODE GRID */}
          {mode === 'photo' && (
            <>
              <div className="grid grid-cols-3 md:grid-cols-4 gap-2 mb-4">
                {members.map(member => (
                  <PhotoMemberCard
                    key={member.name}
                    member={member}
                    isFound={found.has(member.name)}
                    justFound={lastFound === member.name}
                    onMatch={() => {
                      const newFound = new Set([...found, member.name]);
                      setFound(newFound);
                      foundRef.current = newFound;
                      setLastFound(member.name);
                      playFound();

                      if (newFound.size === members.length) {
                        playPerfect();
                        setTimeout(() => endGame(), 800);
                      }

                      setTimeout(() => setLastFound(null), 1500);
                    }}
                  />
                ))}
              </div>

              {/* Status + actions */}
              <div className="h-6 flex items-center justify-center mb-2">
                {lastFound && (
                  <p className="text-sm font-medium text-[#0F6E56] animate-slide-in-up">
                    {lastFound} found!
                  </p>
                )}
              </div>

              <div className="flex gap-2 mb-4">
                <button
                  onClick={useHint}
                  disabled={hintsLeft <= 0}
                  className="flex-1 py-2.5 rounded-xl border border-[var(--border)] text-xs font-medium disabled:opacity-40 transition-opacity"
                >
                  Hint ({hintsLeft} left)
                </button>
                <button
                  onClick={giveUp}
                  className="flex-1 py-2.5 rounded-xl border border-[var(--border)] text-xs font-medium text-[#A32D2D] hover:bg-[#FCEBEB] transition-colors"
                >
                  Give up
                </button>
              </div>

              <div className="flex justify-center gap-6 text-[11px] text-[var(--text-tertiary)]">
                <span>Found: {found.size}</span>
                <span>Left: {members.length - found.size}</span>
                <span>Time: {formatTimer(timeLeft)}</span>
              </div>
            </>
          )}
        </div>
      )}

      {/* RESULT PHASE */}
      {phase === 'result' && (() => {
        const { label, stars } = getScoreLabel(found.size, members.length);
        const missed = members.filter(m => !found.has(m.name));
        const timeTaken = totalTime - timeLeft;

        return (
          <div className="text-center animate-result-in">
            {/* Stars */}
            <div className="flex justify-center gap-1 mb-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <svg
                  key={i}
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill={i < stars ? '#EF9F27' : 'none'}
                  stroke={i < stars ? '#EF9F27' : '#D3D1C7'}
                  strokeWidth="1.5"
                >
                  <path d="M10 2l2.35 4.76 5.25.77-3.8 3.7.9 5.24L10 13.97l-4.7 2.5.9-5.24-3.8-3.7 5.25-.77L10 2z" />
                </svg>
              ))}
            </div>

            <p className="text-4xl font-medium mb-1">{found.size}/{members.length}</p>
            <p className="text-sm text-[var(--text-secondary)] mb-6">{label}</p>

            {/* Full grid */}
            <div className="grid grid-cols-4 md:grid-cols-5 gap-2 mb-5">
              {members.map(member => {
                const wasFound = found.has(member.name);
                return (
                  <div
                    key={member.name}
                    className={`flex flex-col items-center justify-center rounded-xl p-2 ${
                      wasFound ? 'bg-[#EAF3DE]' : 'bg-[#FCEBEB] opacity-70'
                    }`}
                    style={{ aspectRatio: '3/4' }}
                  >
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold mb-1"
                      style={{ backgroundColor: member.color || (wasFound ? '#0F6E56' : '#A32D2D') }}
                    >
                      {getInitials(member.name)}
                    </div>
                    <p className={`text-[11px] font-medium text-center leading-tight truncate w-full ${
                      wasFound ? 'text-[#27500A]' : 'text-[#791F1F]'
                    }`}>
                      {member.name}
                    </p>
                    {wasFound && (
                      <div className="mt-0.5">
                        <svg width="12" height="12" viewBox="0 0 10 10" fill="none">
                          <path d="M2 5.5L4 7.5L8 3" stroke="#0F6E56" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Missed list */}
            {missed.length > 0 && (
              <div className="text-left mb-5">
                <p className="text-sm font-medium mb-2">Missed</p>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  {missed.map(m => m.name).join(', ')}
                </p>
              </div>
            )}

            {/* Stats */}
            <div className="flex justify-center gap-6 text-xs text-[var(--text-secondary)] mb-6">
              <span>Found: {found.size}</span>
              <span>Time: {formatTimer(timeTaken)}</span>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setPhase('start');
                  setTimeLeft(totalTime);
                }}
                className="flex-1 py-3 rounded-full border border-[var(--border)] text-sm font-medium"
              >
                Try again
              </button>
              <Link
                href="/games"
                className="flex-1 py-3 rounded-full bg-[var(--text-primary)] text-white text-sm font-medium text-center"
              >
                Back to games
              </Link>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
