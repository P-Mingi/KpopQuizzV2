// KpopCards (agent C): sound and vibration of the opening. WebAudio synthesis only (no file). Two separate switches (sound, vibration),
// and nothing plays before the player has touched the page: the audio context is created and resumed only inside a gesture, and every
// cue is dropped while the gesture flag is down. The numbers come from opening-plan.ts; the environment is injectable for the tests.
import { RIP, boomTones, canSound, canVibrate, flipTicks, humSpec, stingTones } from '@/lib/cards/opening-plan';

import type { OutputGate, SoundCue, ToneSpec } from '@/lib/cards/opening-plan';

/** The small part of the Web Audio API the engine uses, so a test can pass a recorder. */
export interface AudioLike {
  currentTime: number;
  sampleRate: number;
  state?: string;
  destination: unknown;
  resume?: () => Promise<void> | void;
  createOscillator: () => OscLike;
  createGain: () => GainLike;
  createBuffer: (ch: number, len: number, rate: number) => { getChannelData: (c: number) => Float32Array };
  createBufferSource: () => { buffer: unknown; connect: (n: unknown) => void; start: (t?: number) => void };
  createBiquadFilter: () => FilterLike;
}
interface ParamLike { value: number; setValueAtTime: (v: number, t: number) => void; exponentialRampToValueAtTime: (v: number, t: number) => void }
interface OscLike { type: string; frequency: ParamLike; connect: (n: unknown) => void; start: (t: number) => void; stop: (t: number) => void }
interface GainLike { gain: ParamLike; connect: (n: unknown) => void }
interface FilterLike { type: string; Q: { value: number }; frequency: ParamLike; connect: (n: unknown) => void }

export interface OutputEnv {
  makeAudio: () => AudioLike | null;
  vibrate: ((p: number | readonly number[]) => unknown) | null;
  /** True when the browser says the player has already touched the page (sticky user activation). */
  userActive: () => boolean;
}

export class OpeningOutput {
  private ctx: AudioLike | null = null;
  private touched = false;
  private sound = true;
  private vibration = true;
  constructor(private env: OutputEnv) {}

  /** The two switches of the top bar. */
  setPrefs(p: { sound: boolean; vibration: boolean }): void { this.sound = p.sound; this.vibration = p.vibration; }
  /** Call from a pointer, key or click handler: this is the gesture that unlocks sound and vibration, and that may start the audio context. */
  unlock(): void {
    this.touched = true;
    if (this.sound) this.audio();
  }
  get gate(): OutputGate { return { sound: this.sound, vibration: this.vibration, gesture: this.touched || this.env.userActive() }; }

  private audio(): AudioLike | null {
    try {
      if (!this.ctx) this.ctx = this.env.makeAudio();
      if (this.ctx && this.ctx.state === 'suspended') void this.ctx.resume?.();
      return this.ctx;
    } catch { return null; }
  }
  private ac(): AudioLike | null { return canSound(this.gate) ? this.audio() : null; }

  tone(t: ToneSpec): void {
    const a = this.ac();
    if (!a) return;
    try {
      const at = a.currentTime + t.at;
      const o = a.createOscillator();
      const g = a.createGain();
      o.type = t.type;
      o.frequency.setValueAtTime(t.freq, at);
      g.gain.setValueAtTime(0.0001, at);
      g.gain.exponentialRampToValueAtTime(t.vol, at + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, at + t.dur);
      o.connect(g); g.connect(a.destination);
      o.start(at); o.stop(at + t.dur + 0.05);
    } catch { /* a browser without it stays silent */ }
  }
  private rip(): void {
    const a = this.ac();
    if (!a) return;
    try {
      const len = Math.floor(a.sampleRate * RIP.sec);
      const b = a.createBuffer(1, len, a.sampleRate);
      const ch = b.getChannelData(0);
      for (let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, RIP.curve);
      const s = a.createBufferSource(); s.buffer = b;
      const f = a.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = RIP.q;
      f.frequency.setValueAtTime(RIP.from, a.currentTime);
      f.frequency.exponentialRampToValueAtTime(RIP.to, a.currentTime + RIP.sweep);
      const g = a.createGain(); g.gain.value = RIP.gain;
      s.connect(f); f.connect(g); g.connect(a.destination);
      s.start();
    } catch { /* silent */ }
  }
  private hum(ms: number): void {
    const a = this.ac();
    if (!a) return;
    try {
      const h = humSpec(ms);
      const t = a.currentTime;
      const o = a.createOscillator(); const g = a.createGain(); const f = a.createBiquadFilter();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(h.from, t); o.frequency.exponentialRampToValueAtTime(h.to, t + h.sec);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(h.peak, t + h.sec * 0.8);
      g.gain.exponentialRampToValueAtTime(0.0001, t + h.sec + 0.05);
      f.type = 'lowpass'; f.frequency.value = 1600;
      o.connect(f); f.connect(g); g.connect(a.destination);
      o.start(t); o.stop(t + h.sec + 0.1);
    } catch { /* silent */ }
  }

  /** Plays one cue (or nothing, when the sound switch is off or the player has not touched the page). */
  cue(c: SoundCue): void {
    if (!canSound(this.gate)) return;
    switch (c.kind) {
      case 'rip': this.rip(); break;
      case 'flip': flipTicks().forEach((t) => this.tone(t)); break;
      case 'sting': stingTones(c.ri).forEach((t) => this.tone(t)); break;
      case 'hum': this.hum(c.ms); break;
      case 'boom': boomTones().forEach((t) => this.tone(t)); this.rip(); break;
    }
  }
  /** navigator.vibrate, with its own switch. */
  vibrate(p: number | readonly number[] | null): void {
    if (p === null || !canVibrate(this.gate) || !this.env.vibrate) return;
    try { this.env.vibrate(p); } catch { /* not supported */ }
  }
  close(): void { try { void (this.ctx as { close?: () => unknown } | null)?.close?.(); } catch { /* ignore */ } this.ctx = null; }
}

/** The real browser environment. */
export function browserEnv(): OutputEnv {
  return {
    makeAudio: () => {
      const C = (window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext);
      return C ? (new C() as unknown as AudioLike) : null;
    },
    vibrate: typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function' ? (p) => navigator.vibrate(p as number | number[]) : null,
    userActive: () => (typeof navigator !== 'undefined' ? (navigator as unknown as { userActivation?: { hasBeenActive?: boolean } }).userActivation?.hasBeenActive === true : false),
  };
}
