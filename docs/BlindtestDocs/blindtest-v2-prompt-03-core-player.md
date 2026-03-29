# Prompt 3: Core Player — Gameplay, Scoring, Combo, MV Reveal

## Overview

Build the blind test player at `/play/[mode]`. This is where 90% of user time is spent. It must be polished, fast, and feel like a real game — not a quiz website.

**Reference the exact prototype designs from the strategy session. The gameplay screen MUST match the dark-mode mockups with pink accents.**

---

## Route: `src/app/(game)/play/[mode]/page.tsx`

This is a fullscreen game page — NO TopNav, NO BottomNav (handled by the `(game)` route group layout).

```tsx
import { BlindTestGame } from '@/components/game/blind-test-game';
import { getModeById, isGroupModeId, buildGroupModeFromSlug } from '@/lib/blind-test-modes';
import { notFound } from 'next/navigation';

export default function PlayPage({ params }: { params: { mode: string } }) {
  const mode = isGroupModeId(params.mode)
    ? buildGroupModeFromSlug(params.mode)
    : getModeById(params.mode);

  if (!mode) return notFound();
  return <BlindTestGame mode={mode} />;
}
```

---

## Game State Machine

The game has exactly 5 states:

```typescript
type GameState = 'intro' | 'loading' | 'playing' | 'reveal' | 'results';
```

| State | What's visible | Duration |
|-------|---------------|----------|
| `intro` | Mode title, description, difficulty badge, "Play" button | Until player taps Play |
| `loading` | Spinner / "Generating your round..." | 1-3 seconds (API call) |
| `playing` | Equalizer, timer ring, 4 answer buttons, score + combo | Until answer or timeout |
| `reveal` | MV video visible + playing, song title, artist, points earned, correct/wrong | 3 seconds, then "Next" button appears |
| `results` | Final score, stats, mastery XP, missed songs, share/play again | Until player navigates away |

### State transitions

```
intro → loading → playing → reveal → playing → reveal → ... → results
                     ↑                    |
                     └────────────────────┘ (next song)
```

---

## Component: `BlindTestGame`

```tsx
// src/components/game/blind-test-game.tsx
'use client';

export function BlindTestGame({ mode }: { mode: BlindTestMode }) {
  // ── State ──
  const [gameState, setGameState] = useState<GameState>('intro');
  const [round, setRound] = useState<RoundData | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [answers, setAnswers] = useState<SongAnswer[]>([]);

  // ── Per-song state ──
  const [timeLeft, setTimeLeft] = useState(mode.clip_duration);
  const [answered, setAnswered] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const [showNextButton, setShowNextButton] = useState(false);
  const [currentAnswer, setCurrentAnswer] = useState<SongAnswer | null>(null);

  // ── YouTube ──
  const playerRef = useRef<any>(null);
  const [playerReady, setPlayerReady] = useState(false);

  // ── Timer ──
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  // ── Equalizer ──
  const [eqBars, setEqBars] = useState([16, 28, 40, 32, 20]);

  // ... (implementation below)
}
```

---

## Scoring System — Continuous Formula

```typescript
// src/lib/scoring.ts

/**
 * Calculate points for a single correct answer.
 * Continuous formula: every millisecond matters.
 *
 * Formula: base + time_bonus
 *   base = 50 (you get 50 just for being correct)
 *   time_bonus = max(0, (clip_duration - answer_time) * (100 / clip_duration))
 *
 * Examples (10s clip):
 *   0.5s → 50 + 95 = 145 pts
 *   1.0s → 50 + 90 = 140 pts
 *   2.0s → 50 + 80 = 130 pts
 *   3.0s → 50 + 70 = 120 pts
 *   5.0s → 50 + 50 = 100 pts
 *   8.0s → 50 + 20 = 70 pts
 *   10.0s → 50 + 0 = 50 pts
 *
 * Examples (5s clip — intro/speed mode):
 *   0.5s → 50 + 90 = 140 pts
 *   2.0s → 50 + 60 = 110 pts
 *   5.0s → 50 + 0 = 50 pts
 *
 * Wrong answer or timeout: 0 pts
 */
export function calculatePoints(answerTime: number, clipDuration: number, correct: boolean): number {
  if (!correct) return 0;
  const base = 50;
  const timeBonus = Math.max(0, (clipDuration - answerTime) * (100 / clipDuration));
  return Math.round(base + timeBonus);
}

/**
 * Apply combo multiplier.
 * Combo builds on consecutive correct answers.
 *
 *   combo 0 (first correct): 1.0x
 *   combo 1: 1.0x
 *   combo 2: 1.05x
 *   combo 3: 1.1x
 *   combo 4: 1.15x
 *   combo 5: 1.2x
 *   combo 6+: 1.25x
 *   combo 10+: 1.5x
 *
 * Wrong answer resets combo to 0.
 */
export function getComboMultiplier(combo: number): number {
  if (combo >= 10) return 1.5;
  if (combo >= 6) return 1.25;
  if (combo >= 5) return 1.2;
  if (combo >= 4) return 1.15;
  if (combo >= 3) return 1.1;
  if (combo >= 2) return 1.05;
  return 1.0;
}

export function calculateFinalPoints(answerTime: number, clipDuration: number, correct: boolean, combo: number): number {
  const basePoints = calculatePoints(answerTime, clipDuration, correct);
  const multiplier = getComboMultiplier(combo);
  return Math.round(basePoints * multiplier);
}

/**
 * Speed label for visual feedback only (does NOT affect scoring).
 */
export function getSpeedLabel(answerTime: number): { label: string; color: string } {
  if (answerTime < 2) return { label: 'Lightning', color: '#ED93B1' };
  if (answerTime < 4) return { label: 'Fast', color: '#F4C0D1' };
  if (answerTime < 6) return { label: 'Nice', color: '#7A786E' };
  if (answerTime < 8) return { label: 'Slow', color: '#5A584E' };
  return { label: 'Close call', color: '#5A584E' };
}
```

---

## Question Types: "Name the Song" vs "Name the Artist"

Each round has a mix:
- **10-song round**: ~7 "name the song" + ~3 "name the artist" (randomized positions)
- **20-song speed round**: ~14 "name the song" + ~6 "name the artist"
- **5-song group mode (small pools)**: ~4 "name the song" + ~1 "name the artist"

### How "Name the Artist" works

The round generator (API) decides the question type per song when building the round:

```typescript
// In the generate API:
for (const song of selectedSongs) {
  const isArtistQuestion = Math.random() < 0.3; // 30% chance

  if (isArtistQuestion) {
    // Choices are group/artist NAMES
    // Wrong answers: same generation + same gender groups (convincing)
    const wrongArtists = await getConvincingWrongArtists(song, supabase);
    choices = shuffleArray([song.artist, ...wrongArtists]);
    correctIndex = choices.indexOf(song.artist);
    questionType = 'artist';
  } else {
    // Choices are song TITLES
    // Wrong answers: from the same artist's discography
    choices = shuffleArray([song.title, ...song.wrong_answers.slice(0, 3)]);
    correctIndex = choices.indexOf(song.title);
    questionType = 'title';
  }
}
```

### Getting convincing wrong artists

```typescript
async function getConvincingWrongArtists(song: BlindTestSong, supabase: any): Promise<string[]> {
  // Get 3 other artists from the same generation + same gender
  const { data } = await supabase
    .from('blind_test_songs')
    .select('artist')
    .eq('status', 'active')
    .eq('generation', song.generation)
    .eq('gender', song.gender)
    .neq('artist', song.artist)
    .not('clip_chorus', 'is', null);

  // Get unique artist names
  const uniqueArtists = [...new Set((data ?? []).map(s => s.artist))];

  // Shuffle and pick 3
  const shuffled = uniqueArtists.sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, 3);

  // If not enough from same gen+gender, fall back to any artist
  while (selected.length < 3) {
    const { data: fallback } = await supabase
      .from('blind_test_songs')
      .select('artist')
      .eq('status', 'active')
      .neq('artist', song.artist)
      .limit(10);

    const fallbackArtists = [...new Set((fallback ?? []).map(s => s.artist))];
    for (const a of fallbackArtists) {
      if (!selected.includes(a) && a !== song.artist) {
        selected.push(a);
        if (selected.length >= 3) break;
      }
    }
    break;
  }

  return selected;
}
```

### UI difference during gameplay

When the question type is "artist":

```tsx
{/* Show a subtle indicator above the choices */}
<p className="text-xs text-text-tertiary text-center mb-2">
  {currentSong.question_type === 'artist' ? 'Who sings this?' : 'Name the song'}
</p>
```

The answer buttons show artist/group names instead of song titles. Everything else (timer, equalizer, scoring, MV reveal) works identically.

On the reveal screen, always show BOTH the song title and artist regardless of question type.

---

## YouTube IFrame — Hidden Audio Player

### Setup

```typescript
useEffect(() => {
  if (typeof window === 'undefined') return;

  const loadYT = () => {
    if (window.YT && window.YT.Player) {
      initPlayer();
      return;
    }
    if (!document.getElementById('yt-api-script')) {
      const tag = document.createElement('script');
      tag.id = 'yt-api-script';
      tag.src = 'https://www.youtube.com/iframe_api';
      document.body.appendChild(tag);
    }
    window.onYouTubeIframeAPIReady = initPlayer;
  };

  const initPlayer = () => {
    playerRef.current = new window.YT.Player('yt-player', {
      height: '1',
      width: '1',
      playerVars: {
        autoplay: 0,
        controls: 0,
        disablekb: 1,
        fs: 0,
        modestbranding: 1,
        rel: 0,
        iv_load_policy: 3,
        playsinline: 1,
      },
      events: {
        onReady: () => setPlayerReady(true),
        onError: handleVideoError,
        onStateChange: handleStateChange,
      },
    });
  };

  loadYT();
}, []);
```

### Playing a song

```typescript
function playSong(song: RoundSong) {
  if (!playerRef.current) return;

  setAnswered(false);
  setShowVideo(false);
  setShowNextButton(false);
  setCurrentAnswer(null);
  setTimeLeft(mode.clip_duration);

  // Set size to 1x1 (hidden)
  playerRef.current.setSize(1, 1);

  playerRef.current.loadVideoById({
    videoId: song.youtube_id,
    startSeconds: song.clip_start,
    endSeconds: song.clip_start + mode.clip_duration,
  });

  startTimeRef.current = 0; // will be set when PLAYING state fires
  setGameState('playing');
}
```

### State change handler — timer starts on PLAYING

```typescript
function handleStateChange(event: any) {
  const state = event.data;

  if (state === window.YT.PlayerState.PLAYING) {
    if (!startTimeRef.current && !answered) {
      // Song actually started playing (not an ad)
      startTimeRef.current = Date.now();
      startTimer();
      startEqualizer();
    }
  }

  if (state === window.YT.PlayerState.ENDED) {
    if (!answered) {
      handleTimeout();
    }
  }
}
```

### Video error (region lock)

```typescript
function handleVideoError(event: any) {
  const code = event.data;
  if (code === 101 || code === 150) {
    // Skip this song silently
    skipSong();
  }
}

function skipSong() {
  // Mark as skipped in answers
  setAnswers(prev => [...prev, {
    song_id: round!.songs[currentIndex].song_id,
    question_type: round!.songs[currentIndex].question_type,
    picked: -1,
    correct: false,
    time: 0,
    points: 0,
    combo: 0,
    skipped: true,
  }]);
  goToNextSong();
}
```

---

## MV Reveal Behavior

When the player answers or time runs out:

1. `setAnswered(true)` + `setShowVideo(true)`
2. The YouTube player container transitions from hidden to visible via CSS
3. **Music keeps playing** — NO `pauseVideo()` call
4. Resize the YouTube player to fit the visible container
5. After **3 seconds**, `setShowNextButton(true)` — the "Next song" button fades in
6. Player taps "Next song" → hide video, load next song

### CSS toggle (same DOM element, different styles)

```tsx
<div
  id="yt-player-container"
  className={`mx-auto overflow-hidden transition-all duration-300 ease-out ${
    showVideo
      ? 'w-full max-w-[335px] rounded-[14px] mb-3 opacity-100'
      : 'w-px h-px absolute top-0 left-0 opacity-0 pointer-events-none'
  }`}
  style={showVideo ? { aspectRatio: '16/9' } : undefined}
>
  <div id="yt-player" style={{ width: '100%', height: '100%' }} />
</div>
```

### Resize player on reveal

```typescript
useEffect(() => {
  if (!playerRef.current) return;
  if (showVideo) {
    const container = document.getElementById('yt-player-container');
    if (container) {
      const w = container.clientWidth;
      const h = Math.round(w * 9 / 16);
      playerRef.current.setSize(w, h);
    }
  } else {
    playerRef.current.setSize(1, 1);
  }
}, [showVideo]);
```

### 3-second delay before "Next" button appears

```typescript
useEffect(() => {
  if (answered && !showNextButton) {
    const timer = setTimeout(() => {
      setShowNextButton(true);
    }, 3000);
    return () => clearTimeout(timer);
  }
}, [answered]);
```

---

## Timer

```typescript
function startTimer() {
  if (timerRef.current) clearInterval(timerRef.current);

  timerRef.current = setInterval(() => {
    const elapsed = (Date.now() - startTimeRef.current) / 1000;
    const remaining = mode.clip_duration - elapsed;

    if (remaining <= 0) {
      clearInterval(timerRef.current!);
      setTimeLeft(0);
      if (!answered) handleTimeout();
    } else {
      setTimeLeft(remaining);
    }
  }, 50); // update every 50ms for smooth ring animation
}

// Cleanup
useEffect(() => {
  return () => {
    if (timerRef.current) clearInterval(timerRef.current);
  };
}, []);
```

---

## Equalizer Animation

5 bars, random heights every 120ms while playing:

```typescript
useEffect(() => {
  if (gameState !== 'playing' || answered) return;
  const interval = setInterval(() => {
    setEqBars([...Array(5)].map(() => 12 + Math.random() * 36));
  }, 120);
  return () => clearInterval(interval);
}, [gameState, answered]);
```

---

## Answer Handling

```typescript
function pickAnswer(choiceIndex: number) {
  if (answered || gameState !== 'playing') return;

  const answerTime = (Date.now() - startTimeRef.current) / 1000;
  const song = round!.songs[currentIndex];
  const isCorrect = choiceIndex === song._answer.correct_index;

  // Stop timer
  if (timerRef.current) clearInterval(timerRef.current);

  // Calculate points
  const newCombo = isCorrect ? combo + 1 : 0;
  const points = calculateFinalPoints(answerTime, mode.clip_duration, isCorrect, isCorrect ? newCombo : 0);

  // Update state
  setAnswered(true);
  setShowVideo(true); // REVEAL THE MV
  setCombo(newCombo);
  if (newCombo > bestCombo) setBestCombo(newCombo);
  setScore(prev => prev + points);

  const answer: SongAnswer = {
    song_id: song.song_id,
    question_type: song.question_type,
    picked: choiceIndex,
    correct: isCorrect,
    time: Math.round(answerTime * 100) / 100,
    points,
    combo: newCombo,
  };
  setCurrentAnswer(answer);
  setAnswers(prev => [...prev, answer]);

  // Play sound effect
  if (isCorrect) {
    playSound('correct');
    if (newCombo >= 3) playSound('combo');
  } else {
    playSound('wrong');
  }

  setGameState('reveal');
}

function handleTimeout() {
  if (answered) return;

  if (timerRef.current) clearInterval(timerRef.current);

  setAnswered(true);
  setShowVideo(true);
  setTimeLeft(0);

  const answer: SongAnswer = {
    song_id: round!.songs[currentIndex].song_id,
    question_type: round!.songs[currentIndex].question_type,
    picked: -1,
    correct: false,
    time: mode.clip_duration,
    points: 0,
    combo: 0,
  };
  setCurrentAnswer(answer);
  setAnswers(prev => [...prev, answer]);
  setCombo(0);

  playSound('wrong');
  setGameState('reveal');
}
```

---

## "Next Song" Navigation

```typescript
function goToNextSong() {
  // Pause current video
  playerRef.current?.pauseVideo();

  const nextIdx = currentIndex + 1;
  if (nextIdx >= round!.songs.length) {
    finishGame();
  } else {
    setCurrentIndex(nextIdx);
    setShowVideo(false);
    setShowNextButton(false);
    playSong(round!.songs[nextIdx]);
  }
}
```

---

## Sound Effects

```typescript
// src/lib/sounds.ts

const SOUNDS = {
  correct: '/sounds/correct.mp3',
  wrong: '/sounds/wrong.mp3',
  combo: '/sounds/combo.mp3',
  tick: '/sounds/tick.mp3',
};

const audioCache: Record<string, HTMLAudioElement> = {};

export function preloadSounds() {
  Object.entries(SOUNDS).forEach(([key, src]) => {
    const audio = new Audio(src);
    audio.preload = 'auto';
    audio.volume = 0.3;
    audioCache[key] = audio;
  });
}

export function playSound(name: keyof typeof SOUNDS) {
  const audio = audioCache[name];
  if (!audio) return;
  audio.currentTime = 0;
  audio.play().catch(() => {}); // ignore autoplay errors
}
```

**Sound files**: Create simple sound effects using Web Audio API or use free game sounds:
- `correct.mp3` — short bright chime (0.3s)
- `wrong.mp3` — short low buzz (0.3s)
- `combo.mp3` — ascending "ding-ding" (0.4s)
- `tick.mp3` — subtle tick for last 3 seconds of timer (0.1s)

Place in `apps/blindtest/public/sounds/`.

If you can't create sound files, generate them using Web Audio API:

```typescript
export function generateSounds() {
  const ctx = new AudioContext();

  // Correct: two-tone chime
  function correct() {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
  }

  // Wrong: low buzz
  function wrong() {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, ctx.currentTime);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
  }

  return { correct, wrong };
}
```

---

## Gameplay UI — Exact Layout

### Playing state (listening to clip)

```
┌─────────────────────────────────────────────────┐
│ 3 of 10                          285 pts  3x ← │
│ ████████░░░░░░░░░░░░░░░░░░░░░░░░  (progress)   │
│                                                  │
│              ┌─────────┐                         │
│              │ ▎▌█▌▎   │  ← equalizer circle    │
│              │  (pink)  │  ← with timer ring     │
│              └─────────┘                         │
│                  7s                               │
│                                                  │
│         Who sings this?  ← (only for artist Q)  │
│                                                  │
│  ┌────────────────────────────────────────────┐  │
│  │  Supernova                                 │  │
│  └────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────┐  │
│  │  Next Level                                │  │
│  └────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────┐  │
│  │  Savage                                    │  │
│  └────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────┐  │
│  │  Black Mamba                               │  │
│  └────────────────────────────────────────────┘  │
│                                                  │
└─────────────────────────────────────────────────┘
```

### Reveal state (after answering — correct)

```
┌─────────────────────────────────────────────────┐
│ 3 of 10                          435 pts  4x    │
│ ████████░░░░░░░░░░░░░░░░░░░░░░░░                │
│                                                  │
│  ┌────────────────────────────────────────────┐  │
│  │                                            │  │
│  │          [MV VIDEO PLAYING]                │  │
│  │          (YouTube iframe visible)          │  │
│  │                                            │  │
│  └────────────────────────────────────────────┘  │
│              Supernova                            │
│              aespa                                │
│              +150  ← floats up and fades         │
│              Lightning ← speed label             │
│                                                  │
│  ┌──── correct (green bg + border) ───────────┐  │
│  │  Supernova                              ✓  │  │
│  └────────────────────────────────────────────┘  │
│  ┌──── dimmed ────────────────────────────────┐  │
│  │  Next Level                                │  │
│  └────────────────────────────────────────────┘  │
│  ┌──── dimmed ────────────────────────────────┐  │
│  │  Savage                                    │  │
│  └────────────────────────────────────────────┘  │
│  ┌──── dimmed ────────────────────────────────┐  │
│  │  Black Mamba                               │  │
│  └────────────────────────────────────────────┘  │
│                                                  │
│  ┌────────────────────────────────────────────┐  │
│  │              Next song                     │  │  ← appears after 3s
│  └────────────────────────────────────────────┘  │
│                                                  │
└─────────────────────────────────────────────────┘
```

### Reveal state (after answering — wrong)

Same layout but:
- Player's wrong pick has red bg + red border
- Correct answer has green bg + green border
- Other 2 choices are dimmed
- Points show "+0" in red
- "combo lost" text replaces combo badge
- No speed label

### Timer urgency (last 3 seconds)

- Timer ring stroke color changes from pink (#ED93B1) to red (#E24B4A)
- Timer text changes to red
- Equalizer circle gets `animate-shake` class
- Play `tick` sound every second

```typescript
useEffect(() => {
  if (timeLeft <= 3 && timeLeft > 0 && !answered && gameState === 'playing') {
    const tick = Math.ceil(timeLeft);
    // Play tick sound for each second boundary
    playSound('tick');
  }
}, [Math.ceil(timeLeft)]);
```

---

## Points Animation

When the player answers correctly, show the points floating up:

```tsx
{currentAnswer?.correct && (
  <p className="text-[15px] font-semibold text-correct mt-1.5 animate-pointsFloat">
    +{currentAnswer.points}
  </p>
)}

{currentAnswer && !currentAnswer.correct && (
  <p className="text-[15px] font-semibold text-wrong mt-1.5">
    +0
  </p>
)}
```

The `animate-pointsFloat` class (defined in globals.css) makes the "+150" float up 20px while fading out over 0.8 seconds.

---

## Combo Display

In the header, next to the score:

```tsx
<div className="flex items-center gap-1.5">
  <span className="text-[13px] font-medium text-pink-400">{score} pts</span>
  {combo >= 2 && (
    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-pink-100 text-pink-400">
      {combo}x combo
    </span>
  )}
  {currentAnswer && !currentAnswer.correct && combo === 0 && answers.length > 0 && answers[answers.length - 2]?.combo >= 2 && (
    <span className="text-[10px] font-medium text-wrong">
      combo lost
    </span>
  )}
</div>
```

Combo badge only appears at 2x or higher. At 1x (first correct), no badge. When combo breaks, briefly show "combo lost" in red.

---

## Finish Game + Record Play

```typescript
async function finishGame() {
  setGameState('results');
  playerRef.current?.pauseVideo();

  // Calculate XP
  const correctCount = answers.filter(a => a.correct).length;
  const totalTime = answers.reduce((sum, a) => sum + a.time, 0);
  const xpEarned = calculateXP(correctCount, bestCombo, answers);

  // Calculate group mastery XP updates
  const groupMasteryMap: Record<string, number> = {};
  for (const answer of answers) {
    if (!answer.correct || answer.skipped) continue;
    const song = round!.songs.find(s => s.song_id === answer.song_id);
    if (song?.group_id) {
      groupMasteryMap[song.group_id] = (groupMasteryMap[song.group_id] || 0) + 10; // +10 mastery XP per correct
    }
  }
  const groupMasteryUpdates = Object.entries(groupMasteryMap).map(([group_id, mastery_xp]) => ({ group_id, mastery_xp }));

  // Record play via API (if logged in)
  try {
    await fetch('/api/play/record', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode_id: mode.id,
        score,
        correct: correctCount,
        total: round!.songs.length,
        total_time: Math.round(totalTime * 100) / 100,
        best_combo: bestCombo,
        songs: answers,
        xp_earned: xpEarned,
        group_mastery_updates: groupMasteryUpdates,
      }),
    });
  } catch (e) {
    // Silently fail — don't block the results screen
  }

  // Check anonymous play count
  if (!user) {
    const count = incrementAnonPlayCount();
    if (shouldPromptSignup()) {
      setShowSignupPrompt(true);
    }
  }
}
```

### XP Calculation

```typescript
function calculateXP(correct: number, bestCombo: number, answers: SongAnswer[]): number {
  let xp = 0;
  xp += correct * 10;                    // +10 per correct
  xp += answers.filter(a => a.correct && a.time < 2).length * 5;  // +5 bonus for fast answers
  if (correct === answers.length) xp += 50;  // +50 for perfect round
  return xp;
}
```

---

## Generate API: `POST /api/play/generate`

```typescript
// src/app/(game)/api/play/generate/route.ts

export async function POST(req: Request) {
  const { mode_id } = await req.json();

  // Resolve mode (static or group)
  const mode = resolveMode(mode_id);
  if (!mode) return NextResponse.json({ error: 'Invalid mode' }, { status: 400 });

  const supabase = createServerClient();
  const clipColumn = `clip_${mode.clip_point}`;

  // Build query
  let query = supabase
    .from('blind_test_songs')
    .select('id, title, artist, youtube_id, wrong_answers, ' + clipColumn + ', group_id, generation, gender')
    .eq('status', 'active')
    .not(clipColumn, 'is', null);

  // Apply mode filters...
  // (same filter logic as before)

  const { data: allSongs } = await query;
  if (!allSongs || allSongs.length < mode.song_count) {
    return NextResponse.json({ error: 'Not enough songs', available: allSongs?.length }, { status: 400 });
  }

  // Randomly select songs
  const selected = [...allSongs].sort(() => Math.random() - 0.5).slice(0, mode.song_count);

  // Build round with question types
  const songs = await Promise.all(selected.map(async (song, i) => {
    const isArtistQuestion = Math.random() < 0.3;

    let choices: string[];
    let correctIndex: number;
    let questionType: 'title' | 'artist';

    if (isArtistQuestion) {
      questionType = 'artist';
      const wrongArtists = await getConvincingWrongArtists(song, supabase);
      const allChoices = [song.artist, ...wrongArtists];
      const shuffled = allChoices.sort(() => Math.random() - 0.5);
      choices = shuffled;
      correctIndex = shuffled.indexOf(song.artist);
    } else {
      questionType = 'title';
      const wrongTitles = (song.wrong_answers || []).slice(0, 3);
      while (wrongTitles.length < 3) wrongTitles.push('Unknown');
      const allChoices = [song.title, ...wrongTitles];
      const shuffled = allChoices.sort(() => Math.random() - 0.5);
      choices = shuffled;
      correctIndex = shuffled.indexOf(song.title);
    }

    return {
      song_id: song.id,
      youtube_id: song.youtube_id,
      clip_start: song[clipColumn],
      group_id: song.group_id,
      question_type: questionType,
      choices,
      _answer: {
        correct_index: correctIndex,
        title: song.title,
        artist: song.artist,
      },
    };
  }));

  return NextResponse.json({
    mode_id: mode.id,
    mode_title: mode.title,
    clip_duration: mode.clip_duration,
    songs,
  });
}
```

---

## Record Play API: `POST /api/play/record`

```typescript
// src/app/(game)/api/play/record/route.ts

export async function POST(req: Request) {
  const session = await getSession();
  const body = await req.json();
  const supabase = createServiceClient(); // service role for the DB function

  if (session?.user?.id) {
    // Logged in — record everything
    await supabase.rpc('record_bt_play', {
      p_player_id: session.user.id,
      p_mode_id: body.mode_id,
      p_score: body.score,
      p_correct: body.correct,
      p_total: body.total,
      p_total_time: body.total_time,
      p_best_combo: body.best_combo,
      p_songs: body.songs,
      p_xp_earned: body.xp_earned,
      p_group_mastery_updates: body.group_mastery_updates,
    });
  } else {
    // Anonymous — only record the play (no player stats update)
    await supabase.from('bt_plays').insert({
      player_id: null,
      mode_id: body.mode_id,
      score: body.score,
      correct: body.correct,
      total: body.total,
      total_time: body.total_time,
      best_combo: body.best_combo,
      songs: body.songs,
    });
  }

  return NextResponse.json({ success: true });
}
```

---

## Results Screen

After the last song, show the results. See the prototype mockup for exact layout.

Key elements:
- Score: `{correct}/{total}` in large text
- Label: "Perfect score" / "Impressive" / "Not bad" / "Room to improve" / "Better luck next time"
- Stats row: total points, avg speed, best combo
- XP earned badge + group mastery badges
- Missed songs with blurred thumbnails (tap to reveal)
- Group mastery bars earned this game
- "Play again" (outline button) + "Share result" (pink filled button)
- "Try another mode" link

"Play again" calls the generate API again for the same mode — new random songs.

---

## What NOT To Do

- Do NOT pause the YouTube video when the player answers — music keeps playing through the reveal
- Do NOT move the YouTube `<div id="yt-player">` in the DOM — only toggle CSS
- Do NOT start the timer before the YouTube PLAYING state fires (ads may play first)
- Do NOT auto-advance in solo mode — wait for manual "Next song" tap (after the 3-second delay)
- Do NOT show the correct answer before the player taps or times out
- Do NOT use purple anywhere — the accent color is PINK (#ED93B1) only
- Do NOT allow the timer to go below 0 — clamp at 0
- Do NOT send correct_index to the client before the answer — it's in `_answer` which the UI only reads after `answered === true`
- Do NOT forget to handle the case where the YouTube player isn't ready yet (show a loading state)
- Do NOT forget sound effects — they're essential to game feel
- Do NOT make answer buttons too small — minimum 56px height for mobile tap targets
- Do NOT show the combo badge at 1x — only show at 2x and above
