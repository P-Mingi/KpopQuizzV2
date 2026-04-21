/**
 * Web Audio API synthesized sounds for the card pack opening.
 * No external audio files needed.
 */

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    return audioCtx;
  } catch {
    return null;
  }
}

function tone(freq: number, dur: number, type: OscillatorType = 'sine', vol = 0.12, delay = 0) {
  const ctx = getCtx();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(vol, ctx.currentTime + delay);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + dur);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(ctx.currentTime + delay);
  osc.stop(ctx.currentTime + delay + dur);
}

export function playTear() {
  // Noise burst simulating a tear
  const ctx = getCtx();
  if (!ctx) return;
  const bufferSize = ctx.sampleRate * 0.3;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = 2000;
  gain.gain.setValueAtTime(0.08, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
  source.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  source.start();
}

export function playFlipR() {
  tone(400, 0.15, 'sine', 0.08);
}

export function playFlipS() {
  tone(600, 0.2, 'triangle', 0.1);
  tone(900, 0.15, 'sine', 0.06, 0.05);
}

export function playFlipSS() {
  tone(500, 0.25, 'triangle', 0.1);
  tone(700, 0.2, 'triangle', 0.08, 0.1);
  tone(900, 0.15, 'sine', 0.06, 0.2);
}

export function playFlipSSS() {
  tone(400, 0.5, 'sawtooth', 0.06);
  tone(600, 0.4, 'triangle', 0.1, 0.15);
  tone(800, 0.35, 'triangle', 0.1, 0.3);
  tone(1000, 0.3, 'sine', 0.08, 0.45);
}

export function playNewCard() {
  tone(880, 0.12, 'sine', 0.1);
  tone(1100, 0.1, 'sine', 0.06, 0.06);
}

export function playDuplicate() {
  tone(200, 0.1, 'sine', 0.06);
}

export function playCelebration() {
  [500, 600, 700, 800, 1000].forEach((f, i) => tone(f, 0.35, 'triangle', 0.08, i * 0.08));
}

export function playFlipForRarity(rarity: string) {
  switch (rarity) {
    case 'SSS': playFlipSSS(); break;
    case 'SS': playFlipSS(); break;
    case 'S': playFlipS(); break;
    default: playFlipR();
  }
}
