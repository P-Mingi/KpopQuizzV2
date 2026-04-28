'use client';

import { useState } from 'react';

interface HoverableCardProps {
  children: React.ReactNode;
  onClick?: () => void;
  style?: React.CSSProperties;
}

export function HoverableCard({ children, onClick, style }: HoverableCardProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="hoverable-card"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
      style={{
        borderRadius: 12,
        background: '#fff',
        border: '1px solid #e8e6e0',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.15s ease-out',
        transform: hovered ? 'translateY(-3px)' : 'translateY(0)',
        boxShadow: hovered ? '0 8px 24px rgba(0,0,0,0.08)' : '0 1px 3px rgba(0,0,0,0.02)',
        ...style,
      }}
    >
      {children}
    </div>
  );
}
