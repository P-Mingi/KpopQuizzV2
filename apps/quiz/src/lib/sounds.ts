/**
 * Web Audio API sound effects. No audio files - everything is synthesized.
 *
 * All functions are no-ops on the server and when sound is disabled. The
 * AudioContext is lazily created on first call (browsers require a user
 * gesture before audio can start) and reused across calls.
 */

const SOUND_STORAGE_KEY = 'sound_enabled';

type WebkitWindow = typeof window & {
  webkitAudioContext?: typeof AudioContext;
};

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const w = window as WebkitWindow;
    const Ctor = window.AudioContext || w.webkitAudioContext;
    if (!Ctor) return null;
    try {
      audioCtx = new Ctor();
    } catch {
      return null;
    }
  }
  if (audioCtx.state === 'suspended') {
    void audioCtx.resume();
  }
  return audioCtx;
}

export function isSoundEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(SOUND_STORAGE_KEY) !== 'false';
  } catch {
    return true;
  }
}

export function setSoundEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SOUND_STORAGE_KEY, String(enabled));
  } catch {
    // Ignore storage errors (private mode, quota, etc)
  }
}

export function toggleSound(): boolean {
  const next = !isSoundEnabled();
  setSoundEnabled(next);
  return next;
}

// ============================================
// BUTTON TAP - soft 800Hz sine click, 80ms
// ============================================

export function playTap(): void {
  if (!isSoundEnabled()) return;
  const ctx = getCtx();
  if (!ctx) return;
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
}

// ============================================
// CORRECT ANSWER - rising C-E-G chime, 300ms
// ============================================

export function playCorrect(): void {
  if (!isSoundEnabled()) return;
  const ctx = getCtx();
  if (!ctx) return;
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
}

// ============================================
// WRONG ANSWER - low 150Hz sawtooth buzz, 250ms
// ============================================

export function playWrong(): void {
  if (!isSoundEnabled()) return;
  const ctx = getCtx();
  if (!ctx) return;
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
}

// ============================================
// LEVEL UP - C-E-G-C arpeggio, 100ms apart
// ============================================

export function playLevelUp(): void {
  if (!isSoundEnabled()) return;
  const ctx = getCtx();
  if (!ctx) return;
  [523, 659, 784, 1047].forEach((freq, i) => {
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
}

// ============================================
// REACT POP - 600->900Hz pop, 120ms
// ============================================

export function playReact(): void {
  if (!isSoundEnabled()) return;
  const ctx = getCtx();
  if (!ctx) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(600, ctx.currentTime);
  o.frequency.linearRampToValueAtTime(900, ctx.currentTime + 0.08);
  g.gain.setValueAtTime(0.08, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
  o.connect(g);
  g.connect(ctx.destination);
  o.start();
  o.stop(ctx.currentTime + 0.12);
}

// ============================================
// COMMENT WHOOSH - filtered decaying noise, 200ms
// ============================================

export function playComment(): void {
  if (!isSoundEnabled()) return;
  const ctx = getCtx();
  if (!ctx) return;
  const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.2), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) {
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 3) * 0.06;
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(ctx.destination);
  source.start();
}

// ============================================
// PERFECT 10/10 - 6-note celebration, 80ms apart
// ============================================

export function playPerfect(): void {
  if (!isSoundEnabled()) return;
  const ctx = getCtx();
  if (!ctx) return;
  [523, 659, 784, 880, 1047, 1319].forEach((freq, i) => {
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
}

// ============================================
// STREAK - warm 440->660Hz rise, 500ms
// ============================================

export function playStreak(): void {
  if (!isSoundEnabled()) return;
  const ctx = getCtx();
  if (!ctx) return;
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
}

// ============================================
// SHARE SPARKLE - 4 ascending notes, 60ms apart
// ============================================

export function playShare(): void {
  if (!isSoundEnabled()) return;
  const ctx = getCtx();
  if (!ctx) return;
  [880, 1047, 1319, 1568].forEach((freq, i) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.06, ctx.currentTime + i * 0.06);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.06 + 0.2);
    o.connect(g);
    g.connect(ctx.destination);
    o.start(ctx.currentTime + i * 0.06);
    o.stop(ctx.currentTime + i * 0.06 + 0.2);
  });
}
