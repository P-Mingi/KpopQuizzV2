'use client';

import { useEffect, useRef } from 'react';

interface Props {
  combo: number;
  /** Incremented whenever a new particle burst should spawn. */
  trigger: number;
}

/**
 * Spawns an outward burst of particles when combo reaches 5+.
 * Absolutely positioned; parent must be `relative`.
 */
export function ComboParticles({ combo, trigger }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (combo < 5 || !containerRef.current) return;
    const container = containerRef.current;
    const particleCount = combo >= 8 ? 12 : 8;

    for (let i = 0; i < particleCount; i++) {
      const particle = document.createElement('div');
      const angle = (Math.PI * 2 * i) / particleCount + Math.random() * 0.5;
      const distance = 40 + Math.random() * 60;
      const color = i % 2 === 0 ? 'var(--combo)' : 'var(--accent)';

      particle.style.cssText = `
        position: absolute;
        width: 4px;
        height: 4px;
        border-radius: 50%;
        background: ${color};
        left: 50%;
        top: 50%;
        opacity: 1;
        transition: all 0.6s ease-out;
        pointer-events: none;
      `;
      container.appendChild(particle);

      // Kick off the animation on the next frame so the initial styles apply first.
      requestAnimationFrame(() => {
        particle.style.left = `calc(50% + ${Math.cos(angle) * distance}px)`;
        particle.style.top = `calc(50% + ${Math.sin(angle) * distance}px)`;
        particle.style.opacity = '0';
      });

      setTimeout(() => particle.remove(), 700);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 pointer-events-none overflow-visible"
      aria-hidden="true"
    />
  );
}
