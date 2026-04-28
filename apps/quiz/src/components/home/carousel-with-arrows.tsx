'use client';

import { useRef } from 'react';

interface CarouselWithArrowsProps {
  children: React.ReactNode;
}

export function CarouselWithArrows({ children }: CarouselWithArrowsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: number) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: direction * 240, behavior: 'smooth' });
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      {/* Left arrow */}
      <button
        className="carousel-arrow"
        onClick={() => scroll(-1)}
        aria-label="Scroll left"
        style={{
          position: 'absolute', left: -4, top: '50%', transform: 'translateY(-50%)', zIndex: 5,
          width: 28, height: 28, borderRadius: '50%',
          background: '#fff', border: '1px solid #e8e6e0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer',
        }}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#888780" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
          <path d="M7.5 2.5L4 6l3.5 3.5" />
        </svg>
      </button>

      {/* Right arrow */}
      <button
        className="carousel-arrow"
        onClick={() => scroll(1)}
        aria-label="Scroll right"
        style={{
          position: 'absolute', right: -4, top: '50%', transform: 'translateY(-50%)', zIndex: 5,
          width: 28, height: 28, borderRadius: '50%',
          background: '#fff', border: '1px solid #e8e6e0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer',
        }}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#888780" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
          <path d="M4.5 2.5L8 6l-3.5 3.5" />
        </svg>
      </button>

      {/* Right fade-out gradient */}
      <div style={{
        position: 'absolute', right: 0, top: 0, bottom: 0, width: 40, zIndex: 3,
        background: 'linear-gradient(90deg, transparent, var(--bg-primary))',
        pointerEvents: 'none',
      }} />

      {/* Scrollable container */}
      <div
        ref={scrollRef}
        className="flex gap-2 overflow-x-auto scrollbar-hide pb-1"
      >
        {children}
      </div>
    </div>
  );
}
