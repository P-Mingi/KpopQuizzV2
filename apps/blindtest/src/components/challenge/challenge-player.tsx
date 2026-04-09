'use client';

import { useEffect, useState } from 'react';
import { GamePlayer } from '@/components/game/game-player';

interface Props {
  shortCode: string;
  playlist: string;
  mode: string;
  difficulty: string;
}

/**
 * Client wrapper around GamePlayer for the challenge play flow. Reads the
 * optional nickname stored by the landing page and passes it to GamePlayer so
 * the attempt endpoint can record anonymous challengers under their chosen
 * display name.
 */
export function ChallengePlayer({ shortCode, playlist, mode, difficulty }: Props) {
  const [nickname, setNickname] = useState<string | undefined>(undefined);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(`kbt-challenge-name-${shortCode}`);
      if (stored) setNickname(stored);
    } catch {
      // ignore
    }
    setReady(true);
  }, [shortCode]);

  if (!ready) return null;

  return (
    <GamePlayer
      playlist={playlist}
      mode={mode}
      difficulty={difficulty}
      presetUrl={`/api/challenge/${shortCode}/questions`}
      challengeCode={shortCode}
      {...(nickname ? { challengePlayerName: nickname } : {})}
    />
  );
}
