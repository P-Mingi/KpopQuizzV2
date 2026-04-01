'use client';

import { useRef, useCallback, useState } from 'react';

export function useAudioPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const load = useCallback((previewUrl: string) => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }

    const audio = new Audio();
    audio.preload = 'auto';

    audio.oncanplaythrough = () => setIsLoaded(true);
    audio.onplay = () => setIsPlaying(true);
    audio.onpause = () => setIsPlaying(false);
    audio.onended = () => setIsPlaying(false);

    audio.src = previewUrl;
    audioRef.current = audio;
    setIsLoaded(false);

    return audio;
  }, []);

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
      audioRef.current.src = '';
      audioRef.current = null;
    }
  }, []);

  return { load, play, pause, stop, fadeOut, cleanup, isPlaying, isLoaded, audioRef };
}
