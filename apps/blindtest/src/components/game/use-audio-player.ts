'use client';

import { useRef, useCallback, useState } from 'react';

export function useAudioPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
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

  const load = useCallback((previewUrl: string) => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.removeAttribute('src');
      audioRef.current.load();
    }

    const audio = new Audio();
    audio.preload = 'auto';
    audio.volume = 1;

    audio.oncanplaythrough = () => setIsLoaded(true);
    audio.onplay = () => setIsPlaying(true);
    audio.onpause = () => setIsPlaying(false);
    audio.onended = () => setIsPlaying(false);
    audio.onerror = () => {
      console.error('Audio error for:', previewUrl);
      setIsPlaying(false);
    };

    audio.src = previewUrl;
    audioRef.current = audio;
    setIsLoaded(false);

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
  }, []);

  return { load, loadAndPlay, play, pause, stop, fadeOut, cleanup, unlock, isPlaying, isLoaded, audioRef };
}
