// KpopCards (agent C): the sound engine and the two switches, with a recorder in place of Web Audio.
import { beforeEach, describe, expect, it } from 'vitest';

import { OpeningOutput } from './opening-sound';
import { applyServerPrefs, getPrefs, resetPrefsForTest, setPref, setPrefsSink, subscribePrefs } from './opening-prefs';

import type { AudioLike, OutputEnv } from './opening-sound';

function recorder(): { env: OutputEnv; made: { n: number }; oscs: number[]; noise: { n: number }; buzz: unknown[]; active: { v: boolean }; resumed: { n: number } } {
  const made = { n: 0 }; const oscs: number[] = []; const noise = { n: 0 }; const buzz: unknown[] = []; const active = { v: false }; const resumed = { n: 0 };
  const param = () => ({ value: 0, setValueAtTime: () => undefined, exponentialRampToValueAtTime: () => undefined });
  const audio: AudioLike = {
    currentTime: 0, sampleRate: 8000, state: 'suspended', destination: {},
    resume: () => { resumed.n += 1; },
    createOscillator: () => ({ type: '', frequency: { ...param() }, connect: () => undefined, start: () => { oscs.push(1); }, stop: () => undefined }),
    createGain: () => ({ gain: param(), connect: () => undefined }),
    createBuffer: (_c, len) => ({ getChannelData: () => new Float32Array(len) }),
    createBufferSource: () => ({ buffer: null, connect: () => undefined, start: () => { noise.n += 1; } }),
    createBiquadFilter: () => ({ type: '', Q: { value: 0 }, frequency: param(), connect: () => undefined }),
  };
  const env: OutputEnv = { makeAudio: () => { made.n += 1; return audio; }, vibrate: (p) => { buzz.push(p); return true; }, userActive: () => active.v };
  return { env, made, oscs, noise, buzz, active, resumed };
}

describe('nothing before a user gesture', () => {
  it('no audio context, no tone, no vibration until unlock()', () => {
    const r = recorder(); const o = new OpeningOutput(r.env);
    o.cue({ kind: 'sting', ri: 5 }); o.cue({ kind: 'rip' }); o.cue({ kind: 'boom' }); o.vibrate([10, 20]);
    expect(r.made.n).toBe(0); expect(r.oscs).toHaveLength(0); expect(r.noise.n).toBe(0); expect(r.buzz).toHaveLength(0);
  });
  it('unlock() creates the context once and resumes it; then cues play', () => {
    const r = recorder(); const o = new OpeningOutput(r.env);
    o.unlock(); o.unlock();
    expect(r.made.n).toBe(1); expect(r.resumed.n).toBeGreaterThan(0);
    o.cue({ kind: 'sting', ri: 2 }); o.cue({ kind: 'flip' });
    expect(r.oscs).toHaveLength(3 + 2);
    o.vibrate(18); expect(r.buzz).toEqual([18]);
  });
  it('the browser\'s own sticky activation counts as a gesture for vibration', () => {
    const r = recorder(); const o = new OpeningOutput(r.env);
    r.active.v = true; o.vibrate([12, 80, 12]);
    expect(r.buzz).toEqual([[12, 80, 12]]);
  });
});

describe('the two switches are separate', () => {
  it('sound off: no tone, vibration still works; vibration off: tones still play', () => {
    const r = recorder(); const o = new OpeningOutput(r.env);
    o.unlock();
    o.setPrefs({ sound: false, vibration: true });
    o.cue({ kind: 'sting', ri: 5 }); o.vibrate(18);
    expect(r.oscs).toHaveLength(0); expect(r.buzz).toEqual([18]);
    o.setPrefs({ sound: true, vibration: false });
    o.cue({ kind: 'flip' }); o.vibrate(18);
    expect(r.oscs).toHaveLength(2); expect(r.buzz).toEqual([18]);
  });
  it('a Full Art boom is two low tones and the noise of a tear; the rip is noise only; the hum is one tone', () => {
    const r = recorder(); const o = new OpeningOutput(r.env); o.unlock();
    o.cue({ kind: 'boom' }); expect(r.oscs).toHaveLength(2); expect(r.noise.n).toBe(1);
    o.cue({ kind: 'rip' }); expect(r.noise.n).toBe(2);
    o.cue({ kind: 'hum', ms: 1400 }); expect(r.oscs).toHaveLength(3);
  });
  it('a missing Web Audio or vibrate never throws', () => {
    const o = new OpeningOutput({ makeAudio: () => null, vibrate: null, userActive: () => true });
    o.unlock(); expect(() => { o.cue({ kind: 'sting', ri: 5 }); o.vibrate(5); o.close(); }).not.toThrow();
  });
});

describe('the prefs store', () => {
  beforeEach(() => { resetPrefsForTest(); const mem = new Map<string, string>(); (globalThis as { localStorage?: unknown }).localStorage = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => { mem.set(k, v); } }; });
  it('both are on by default and are kept in local storage', () => {
    expect(getPrefs()).toEqual({ sound: true, vibration: true });
    setPref('sound', false);
    resetPrefsForTest();
    expect(getPrefs()).toEqual({ sound: false, vibration: true });
  });
  it('tells its listeners and the server sink, but the server\'s own values are not echoed back', () => {
    const seen: unknown[] = []; const sunk: unknown[] = [];
    subscribePrefs((p) => seen.push(p)); setPrefsSink((p) => sunk.push(p));
    setPref('vibration', false); applyServerPrefs({ sound: false });
    expect(seen).toHaveLength(2); expect(sunk).toEqual([{ sound: true, vibration: false }]);
    expect(getPrefs()).toEqual({ sound: false, vibration: false });
  });
  it('a broken stored value falls back to on', () => {
    (globalThis as { localStorage?: { setItem: (k: string, v: string) => void } }).localStorage!.setItem('kpopcards:prefs', '{nope');
    expect(getPrefs()).toEqual({ sound: true, vibration: true });
  });
});
