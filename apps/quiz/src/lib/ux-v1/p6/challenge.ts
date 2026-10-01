// Challenge a friend (DESIGN-SPEC 14.6, 16.7, 17.5; WIRING-MAP 12 "Challenge a
// friend", NEW): after a run, the player gets a link with the exact same songs,
// valid 48 hours. Stored in the existing `challenges` table (mig 046: short_code,
// frozen questions, creator stats, expires_at); each play of a link is one
// `challenge_attempts` row. Pure helpers here (validation, codes, shapes); the
// routes live in app/api/ux-v1/p6/challenge/**.
//
// Trust: the questions come from the creator's browser, so the server keeps only
// questions whose song exists and whose correct answer IS that song's title
// (song round) or artist (artist round), with four distinct choices including it.
// A forged "correct answer" cannot reach the friend.

export const CHALLENGE_TTL_MS = 48 * 3600 * 1000;
export const CHALLENGE_MIN = 5;
export const CHALLENGE_MAX = 15;
const MAX_TEXT = 200;
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O, 1/I
export const CODE_LENGTH = 6;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const CODE_RE = /^[A-HJ-NP-Z2-9]{6}$/;

/** One frozen round (the generate shape without the preview URL, which expires). */
export interface FrozenQuestion {
  song_id: string;
  question_type: 'artist' | 'title';
  question_text: string;
  correct_answer: string;
  choices: string[];
  reveal: { title: string; artist: string; album: string | null; cover: string | null };
  album_cover_medium: string | null;
  album_cover_big: string | null;
}

export interface ChallengeInput {
  /** generate's playlist id of the run ('all', a mix id or a group slug). */
  playlist: string;
  questions: FrozenQuestion[];
  /** Right answers (the score the friend has to match). */
  score: number;
  total: number;
  /** Display points of the run (lib/ux-v1/p6/points.ts), kept for the record. */
  points: number;
  timeMs: number;
  bestCombo: number;
}

/** Highest display points of one run: 15 fast right answers. */
const MAX_POINTS = 15 * 400;

export interface SongFacts { id: string; title: string; artist_name: string }

function str(v: unknown, max = MAX_TEXT): string | null {
  return typeof v === 'string' && v.length > 0 && v.length <= max ? v : null;
}
function int(v: unknown, min: number, max: number): number | null {
  return typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max ? v : null;
}
function url(v: unknown): string | null {
  const s = str(v, 500);
  return s && /^https:\/\//.test(s) ? s : null;
}

/** Shape check of the POST body (no DB). Returns null when anything is off. */
export function parseChallengeInput(body: unknown): ChallengeInput | null {
  if (!body || typeof body !== 'object') return null;
  const b = body as Record<string, unknown>;
  const playlist = str(b.playlist, 80);
  if (!playlist || !/^[a-z0-9-]+$/.test(playlist) || !Array.isArray(b.questions)) return null;
  if (b.questions.length < CHALLENGE_MIN || b.questions.length > CHALLENGE_MAX) return null;
  const questions: FrozenQuestion[] = [];
  const seen = new Set<string>();
  for (const raw of b.questions as unknown[]) {
    if (!raw || typeof raw !== 'object') return null;
    const q = raw as Record<string, unknown>;
    const id = str(q.song_id, 40);
    if (!id || !UUID_RE.test(id) || seen.has(id)) return null;
    seen.add(id);
    const type = q.question_type === 'artist' || q.question_type === 'title' ? q.question_type : null;
    const correct = str(q.correct_answer);
    const text = str(q.question_text, 80);
    if (!type || !correct || !text || !Array.isArray(q.choices) || q.choices.length !== 4) return null;
    const choices = (q.choices as unknown[]).map((c) => str(c));
    if (choices.some((c) => c === null) || new Set(choices).size !== 4 || !choices.includes(correct)) return null;
    const rv = (q.reveal ?? {}) as Record<string, unknown>;
    const title = str(rv.title);
    const artist = str(rv.artist);
    if (!title || !artist) return null;
    questions.push({
      song_id: id,
      question_type: type,
      question_text: text,
      correct_answer: correct,
      choices: choices as string[],
      reveal: { title, artist, album: str(rv.album), cover: url(rv.cover) },
      album_cover_medium: url(q.album_cover_medium),
      album_cover_big: url(q.album_cover_big),
    });
  }
  const total = int(b.total, CHALLENGE_MIN, CHALLENGE_MAX);
  const score = int(b.score, 0, CHALLENGE_MAX);
  const points = int(b.points, 0, MAX_POINTS);
  const timeMs = int(b.timeMs, 0, CHALLENGE_MAX * 10_000);
  const bestCombo = int(b.bestCombo, 0, CHALLENGE_MAX);
  if (total === null || total !== questions.length || score === null || score > total || points === null || timeMs === null || bestCombo === null || bestCombo > score) return null;
  return { playlist, questions, score, total, points, timeMs, bestCombo };
}

/**
 * Every question must match its song: the correct answer is the song's title (song
 * round) or its artist (artist round), and the reveal names the same song.
 */
export function questionsMatchSongs(questions: readonly FrozenQuestion[], songs: readonly SongFacts[]): boolean {
  const byId = new Map(songs.map((s) => [s.id, s]));
  return questions.every((q) => {
    const s = byId.get(q.song_id);
    if (!s) return false;
    const expected = q.question_type === 'title' ? s.title : s.artist_name;
    return q.correct_answer === expected && q.reveal.title === s.title && q.reveal.artist === s.artist_name;
  });
}

/** Random 6-character code (unambiguous alphabet). `rand` returns [0, 1). */
export function shortCode(rand: () => number = Math.random): string {
  let out = '';
  for (let i = 0; i < CODE_LENGTH; i++) out += CODE_ALPHABET[Math.floor(rand() * CODE_ALPHABET.length)] ?? 'A';
  return out;
}

/** The public link of a challenge (the hub opens it in the tap-to-play state). */
export function challengePath(code: string): string {
  return `/blindtest?c=${code}`;
}

export interface AttemptInput { score: number; total: number; points: number; timeMs: number; bestCombo: number }

export function parseAttemptInput(body: unknown, total: number): AttemptInput | null {
  if (!body || typeof body !== 'object') return null;
  const b = body as Record<string, unknown>;
  const t = int(b.total, 1, CHALLENGE_MAX);
  const score = int(b.score, 0, CHALLENGE_MAX);
  const points = int(b.points, 0, MAX_POINTS);
  const timeMs = int(b.timeMs, 0, CHALLENGE_MAX * 10_000);
  const bestCombo = int(b.bestCombo, 0, CHALLENGE_MAX);
  if (t === null || t !== total || score === null || score > t || points === null || timeMs === null || bestCombo === null || bestCombo > score) return null;
  return { score, total: t, points, timeMs, bestCombo };
}

/** What GET /api/ux-v1/p6/challenge/<code> returns (client-safe). */
export interface ChallengeView {
  code: string;
  playlist: string;
  label: string;
  creatorName: string;
  creatorScore: number;
  creatorTotal: number;
  expiresAt: string;
  expired: boolean;
  /** Frozen rounds with fresh preview URLs (empty when expired). */
  questions: (FrozenQuestion & { preview_url: string })[];
}

/** Win / lose line for the results (a tie counts as a win, like the prototype).
 *  `head` is the bold part, `tail` follows it. */
export function challengeOutcome(score: number, view: Pick<ChallengeView, 'creatorName' | 'creatorScore' | 'creatorTotal'>): { won: boolean; head: string; tail: string } {
  const theirs = `(${view.creatorScore}/${view.creatorTotal})`;
  if (score >= view.creatorScore) return { won: true, head: `You beat ${view.creatorName}`, tail: ` ${theirs}.` };
  return { won: false, head: `${view.creatorName} wins this one`, tail: ` ${theirs}. Same songs, one more try?` };
}
