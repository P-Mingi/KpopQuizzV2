import type { BlindTestSong, Difficulty } from '@/lib/db/types';

export function calculateDifficulty(songs: BlindTestSong[]): Difficulty {
  const modes = songs.map(s => s.clip_mode);
  const chorusCount = modes.filter(m => m === 'chorus').length;
  const randomCount = modes.filter(m => m === 'random').length;

  if (chorusCount >= songs.length * 0.7) return 'easy';
  if (randomCount >= songs.length * 0.5) return 'hard';
  return 'medium';
}

export function getHardestSong(songs: BlindTestSong[]): string {
  return songs.reduce((hardest, song) => {
    if (song.times_played === 0) return hardest;
    const rate = song.times_correct / song.times_played;
    const hardestRate = hardest.times_played === 0 ? 1 : hardest.times_correct / hardest.times_played;
    return rate < hardestRate ? song : hardest;
  }, songs[0]!).title;
}

export function calculateAvgScore(songs: BlindTestSong[]): number {
  const withPlays = songs.filter(s => s.times_played > 0);
  if (withPlays.length === 0) return 0;
  const totalRate = withPlays.reduce((sum, s) => sum + s.times_correct / s.times_played, 0);
  return Math.round((totalRate / withPlays.length) * 100);
}

export function shuffleChoices(
  choices: string[],
  correctIndex: number,
): { shuffled: string[]; correctIndex: number } {
  const items = choices.map((c, i) => ({ text: c, isCorrect: i === correctIndex }));
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j]!, items[i]!];
  }
  return {
    shuffled: items.map(x => x.text),
    correctIndex: items.findIndex(x => x.isCorrect),
  };
}

export function scoreLabel(scorePct: number): string {
  if (scorePct === 100) return 'Perfect score';
  if (scorePct >= 80) return 'Impressive';
  if (scorePct >= 60) return 'Not bad';
  if (scorePct >= 40) return 'Room to improve';
  return 'Better luck next time';
}
