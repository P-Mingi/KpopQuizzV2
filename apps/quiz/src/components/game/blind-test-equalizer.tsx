'use client';

import { useState, useEffect } from 'react';

interface BlindTestEqualizerProps {
  playing: boolean;
  timeLeft: number;
  clipDuration: number;
}

export function BlindTestEqualizer({ playing, timeLeft, clipDuration }: BlindTestEqualizerProps): React.ReactElement {
  const [bars, setBars] = useState([16, 28, 40, 32, 20]);

  useEffect(() => {
    if (!playing) {
      setBars([6, 6, 6, 6, 6]);
      return;
    }
    const interval = setInterval(() => {
      setBars(prev => prev.map(() => 12 + Math.random() * 36));
    }, 120);
    return () => clearInterval(interval);
  }, [playing]);

  const isUrgent = timeLeft <= 3 && playing;
  const circumference = 2 * Math.PI * 58;
  const ringOffset = circumference - (timeLeft / clipDuration) * circumference;

  return (
    <div className={`relative w-[120px] h-[120px] mx-auto mb-4 ${isUrgent ? 'animate-shake' : ''}`}>
      {/* Timer ring */}
      <svg className="absolute -top-1 -left-1" width="128" height="128" viewBox="0 0 128 128">
        <circle cx="64" cy="64" r="58" fill="none" stroke="var(--border)" strokeWidth="3" />
        <circle
          cx="64" cy="64" r="58" fill="none"
          stroke={isUrgent ? '#E24B4A' : '#ED93B1'}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={ringOffset}
          transform="rotate(-90 64 64)"
          style={{ transition: 'stroke-dashoffset 0.1s linear, stroke 0.3s' }}
        />
      </svg>

      {/* Equalizer bars */}
      <div className="w-full h-full rounded-full bg-[var(--bg-surface)] flex items-center justify-center gap-[3px]">
        {bars.map((h, i) => (
          <div
            key={i}
            className="w-1 rounded-full bg-[#ED93B1] transition-all duration-100"
            style={{ height: h }}
          />
        ))}
      </div>
    </div>
  );
}
