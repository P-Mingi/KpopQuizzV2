/**
 * Game sound engine. All sounds are synthesized on the fly via the Web Audio API;
 * no audio files needed. Each play* function is a no-op if the audio context
 * can't be obtained (SSR) or if the user has muted sounds via toggleSound.
 */

let audioCtx: AudioContext | null = null;

interface WebkitWindow extends Window {
  webkitAudioContext?: typeof AudioContext;
}

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const Ctor = window.AudioContext || (window as WebkitWindow).webkitAudioContext;
    if (!Ctor) return null;
    audioCtx = new Ctor();
  }
  // Resume if suspended (browser autoplay policy).
  if (audioCtx.state === 'suspended') {
    void audioCtx.resume();
  }
  return audioCtx;
}

function isSoundEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return localStorage.getItem('kbt-sound') !== 'false';
  } catch {
    return true;
  }
}

export function getSoundEnabled(): boolean {
  return isSoundEnabled();
}

export function toggleSound(): boolean {
  if (typeof window === 'undefined') return true;
  const next = !isSoundEnabled();
  try {
    localStorage.setItem('kbt-sound', String(next));
  } catch {
    // ignore
  }
  return next;
}

// ---- BUTTON TAP ----
// Soft 800Hz sine click, 80ms.
export function playTap(): void {
  if (!isSoundEnabled()) return;
  const ctx = getCtx();
  if (!ctx) return;
  try {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.value = 800;
    g.gain.setValueAtTime(0.1, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
    o.connect(g);
    g.connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.08);
  } catch {
    // ignore
  }
}

// ---- CORRECT ANSWER ----
// Rising C-E-G chime (523 -> 784 -> 1047 Hz), 300ms.
export function playCorrect(): void {
  if (!isSoundEnabled()) return;
  const ctx = getCtx();
  if (!ctx) return;
  try {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(523, ctx.currentTime);
    o.frequency.linearRampToValueAtTime(784, ctx.currentTime + 0.1);
    o.frequency.linearRampToValueAtTime(1047, ctx.currentTime + 0.2);
    g.gain.setValueAtTime(0.15, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    o.connect(g);
    g.connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.3);
  } catch {
    // ignore
  }
}

// ---- WRONG ANSWER ----
// Low 150Hz sawtooth buzz, 250ms.
export function playWrong(): void {
  if (!isSoundEnabled()) return;
  const ctx = getCtx();
  if (!ctx) return;
  try {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sawtooth';
    o.frequency.value = 150;
    g.gain.setValueAtTime(0.1, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    o.connect(g);
    g.connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.25);
  } catch {
    // ignore
  }
}

// ---- COMBO ----
// Pitch rises with combo count: base 400Hz + (combo * 80Hz), 150ms.
export function playCombo(comboCount: number): void {
  if (!isSoundEnabled()) return;
  const ctx = getCtx();
  if (!ctx) return;
  try {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.value = 400 + comboCount * 80;
    g.gain.setValueAtTime(0.12, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    o.connect(g);
    g.connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.15);
  } catch {
    // ignore
  }
}

// ---- TIMER TICK ----
// Sharp 1000Hz square click, 60ms.
export function playTick(): void {
  if (!isSoundEnabled()) return;
  const ctx = getCtx();
  if (!ctx) return;
  try {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'square';
    o.frequency.value = 1000;
    g.gain.setValueAtTime(0.08, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
    o.connect(g);
    g.connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.06);
  } catch {
    // ignore
  }
}

// ---- LEVEL UP ----
// C-E-G-C arpeggio (523, 659, 784, 1047 Hz), staggered 100ms.
export function playLevelUp(): void {
  if (!isSoundEnabled()) return;
  const ctx = getCtx();
  if (!ctx) return;
  try {
    const notes = [523, 659, 784, 1047];
    notes.forEach((freq, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.12, ctx.currentTime + i * 0.1);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.1 + 0.3);
      o.connect(g);
      g.connect(ctx.destination);
      o.start(ctx.currentTime + i * 0.1);
      o.stop(ctx.currentTime + i * 0.1 + 0.3);
    });
  } catch {
    // ignore
  }
}

// ---- PERFECT 10/10 ----
// 6-note celebration burst (C-E-G-A-C-E), 80ms apart, 400ms each.
export function playPerfect(): void {
  if (!isSoundEnabled()) return;
  const ctx = getCtx();
  if (!ctx) return;
  try {
    const notes = [523, 659, 784, 880, 1047, 1319];
    notes.forEach((freq, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.1, ctx.currentTime + i * 0.08);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.08 + 0.4);
      o.connect(g);
      g.connect(ctx.destination);
      o.start(ctx.currentTime + i * 0.08);
      o.stop(ctx.currentTime + i * 0.08 + 0.4);
    });
  } catch {
    // ignore
  }
}

// ---- STREAK ----
// Warm rising tone: 440 -> 660 Hz, 500ms.
export function playStreak(): void {
  if (!isSoundEnabled()) return;
  const ctx = getCtx();
  if (!ctx) return;
  try {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(440, ctx.currentTime);
    o.frequency.linearRampToValueAtTime(660, ctx.currentTime + 0.3);
    g.gain.setValueAtTime(0.08, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    o.connect(g);
    g.connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.5);
  } catch {
    // ignore
  }
}

// ---- SONG REVEAL ----
// Filtered noise whoosh, 300ms.
export function playReveal(): void {
  if (!isSoundEnabled()) return;
  const ctx = getCtx();
  if (!ctx) return;
  try {
    const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.3), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 3) * 0.1;
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start();
  } catch {
    // ignore
  }
}

// ---- Legacy shim (used by blind-test-game.tsx) ----
// Maps the old single-function API to the new individual functions.
export function playSound(name: 'correct' | 'wrong' | 'combo' | 'tick'): void {
  switch (name) {
    case 'correct':
      playCorrect();
      return;
    case 'wrong':
      playWrong();
      return;
    case 'combo':
      playCombo(3);
      return;
    case 'tick':
      playTick();
      return;
  }
}
