/**
 * Text share format for result cards. Works as copy-paste on Twitter, Discord,
 * WhatsApp, Instagram DMs, etc. Inspired by Wordle's emoji grid.
 */

export interface ShareResult {
  correct: boolean;
  answered: string | null;
}

export interface ShareData {
  results: ShareResult[];
  totalScore: number;
  totalTime: number;
  streak: number;
  mode: string;
  playlist: string;
  /** When set, formats as a daily share (e.g. "Daily #47"). */
  dailyNumber?: number;
  /** Public site URL without protocol (e.g. "kpopblindtest.com"). */
  siteUrl?: string;
}

function formatTime(seconds: number): string {
  const total = Math.round(seconds);
  if (total >= 60) {
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}m${s}s`;
  }
  return `${total}s`;
}

function formatPlaylistLabel(playlist: string): string {
  if (playlist === 'all') return '';
  if (playlist === 'gg') return 'Girl groups';
  if (playlist === 'bg') return 'Boy groups';
  if (playlist === 'solo') return 'Solo';
  if (playlist.endsWith('-gen')) return playlist.replace('-gen', ' gen');
  // Fallback: raw group name (e.g. BLACKPINK)
  return playlist;
}

/**
 * Build the emoji grid: correct = green square, wrong = red square, no answer = black square.
 */
export function buildEmojiGrid(results: ShareResult[]): string {
  return results
    .map((r) => {
      if (r.correct) return '\uD83D\uDFE9'; // 🟩
      if (r.answered === null) return '\u2B1B'; // ⬛
      return '\uD83D\uDFE5'; // 🟥
    })
    .join('');
}

export function generateShareText(data: ShareData): string {
  const {
    results,
    totalScore,
    totalTime,
    streak,
    mode,
    playlist,
    dailyNumber,
    siteUrl = 'kpopblindtest.com',
  } = data;

  const grid = buildEmojiGrid(results);
  const correct = results.filter((r) => r.correct).length;
  const total = results.length;
  const isPerfect = correct === total && total > 0;
  const scoreText = isPerfect ? `${correct}/${total} PERFECT!` : `${correct}/${total}`;

  // Header line.
  let header = '\uD83C\uDFB5 K-pop Blindtest'; // 🎵
  const playlistLabel = formatPlaylistLabel(playlist);
  if (dailyNumber !== undefined) {
    header += ` - Daily #${dailyNumber}`;
  } else if (mode === 'challenge') {
    header += ' - Challenge Mode';
  } else if (playlistLabel) {
    header += ` - ${playlistLabel}`;
  }

  // Stats line.
  const parts: string[] = [`\u23F1 ${formatTime(totalTime)}`]; // ⏱
  if (streak > 1) parts.push(`\uD83D\uDD25 ${streak} streak`); // 🔥
  if (dailyNumber === undefined) {
    let pts = `\u26A1 ${totalScore.toLocaleString()}pts`; // ⚡
    if (mode === 'challenge') pts += ' (1.5x)';
    parts.push(pts);
  }
  const statsLine = parts.join(' \u00B7 '); // ·

  // CTA + URL.
  const cta = dailyNumber !== undefined ? 'How did you do?' : 'Can you beat me?';
  const url = dailyNumber !== undefined ? `${siteUrl}/daily` : siteUrl;

  return [header, '', `${grid} ${scoreText}`, statsLine, '', cta, url].join('\n');
}
