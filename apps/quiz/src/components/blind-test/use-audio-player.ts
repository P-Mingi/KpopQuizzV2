'use client';

import { useRef, useCallback, useState } from 'react';

export function useAudioPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // U-2d: the next question's audio, buffered during the current one so it plays
  // instantly instead of fetching the Deezer clip on demand at each question.
  const preloadRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const unlockedRef = useRef(false);

  /** Call this inside a click/tap handler to unlock audio on iOS/Safari. */
  const unlock = useCallback(() => {
    if (unlockedRef.current) return;
    // Create a silent audio context to unlock autoplay
    try {
      const ctx = new AudioContext();
      const buf = ctx.createBuffer(1, 1, 22050);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(ctx.destination);
      src.start(0);
      unlockedRef.current = true;
    } catch {
      // ignore
    }

    // Also create and play a silent HTML audio to unlock that path
    const silent = new Audio();
    silent.src = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';
    silent.volume = 0;
    silent.play().catch(() => {});
    unlockedRef.current = true;
  }, []);

  /** Buffer a clip ahead of time (next question) without playing it. */
  const preload = useCallback((previewUrl: string) => {
    if (!previewUrl) return;
    if (preloadRef.current && preloadRef.current.src === previewUrl) return;
    const a = new Audio();
    a.preload = 'auto';
    a.volume = 0.5;
    a.src = previewUrl;
    a.load(); // kick the browser to start buffering the clip now
    preloadRef.current = a;
  }, []);

  const load = useCallback((previewUrl: string) => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.removeAttribute('src');
      audioRef.current.load();
    }

    // Reuse the already-buffered element when it matches (instant playback),
    // otherwise create a fresh one.
    let audio: HTMLAudioElement;
    if (preloadRef.current && preloadRef.current.src === previewUrl) {
      audio = preloadRef.current;
      preloadRef.current = null;
    } else {
      audio = new Audio();
      audio.preload = 'auto';
      // Song preview sits below 1.0 to leave headroom for SFX (correct/wrong/tick/reveal).
      audio.volume = 0.5;
      audio.src = previewUrl;
    }

    audio.oncanplaythrough = () => setIsLoaded(true);
    audio.onplay = () => setIsPlaying(true);
    audio.onpause = () => setIsPlaying(false);
    audio.onended = () => setIsPlaying(false);
    audio.onerror = () => {
      console.error('Audio error for:', previewUrl);
      setIsPlaying(false);
    };

    audioRef.current = audio;
    // If the preloaded clip is already buffered we can mark it loaded now.
    setIsLoaded(audio.readyState >= 3);

    return audio;
  }, []);

  /** Load and immediately play (used after user gesture unlocks audio). */
  const loadAndPlay = useCallback((previewUrl: string) => {
    const audio = load(previewUrl);
    // Try to play immediately
    audio.play().catch(() => {
      // If immediate play fails, wait for canplaythrough
      audio.oncanplaythrough = () => {
        setIsLoaded(true);
        audio.play().catch(console.error);
      };
    });
  }, [load]);

  const play = useCallback(() => {
    audioRef.current?.play().catch(console.error);
  }, []);

  const pause = useCallback(() => {
    audioRef.current?.pause();
  }, []);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, []);

  const fadeOut = useCallback((durationMs: number = 500) => {
    const audio = audioRef.current;
    if (!audio) return;

    const startVolume = audio.volume;
    const steps = 20;
    const stepTime = durationMs / steps;
    let step = 0;

    const interval = setInterval(() => {
      step++;
      audio.volume = Math.max(0, startVolume * (1 - step / steps));
      if (step >= steps) {
        clearInterval(interval);
        audio.pause();
        audio.volume = startVolume;
      }
    }, stepTime);
  }, []);

  const cleanup = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.removeAttribute('src');
      audioRef.current = null;
    }
    if (preloadRef.current) {
      preloadRef.current.removeAttribute('src');
      preloadRef.current = null;
    }
  }, []);

  return { load, loadAndPlay, preload, play, pause, stop, fadeOut, cleanup, unlock, isPlaying, isLoaded, audioRef };
}
