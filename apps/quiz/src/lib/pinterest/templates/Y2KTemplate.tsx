// Y2K Aesthetic template: Pink + chunky text + sticker decorations + polaroid frame.
// Adapted from prototype CardY2K for next/og at 1000x1500.
// No blur/backdrop-filter/webkit-text-stroke (Satori limitations) - replaced with solid alternatives.

import type { CardTemplateProps } from './EditorialTemplate';

function darkenColor(hex: string, factor: number): string {
  const r = Math.round(parseInt(hex.slice(1, 3), 16) * factor);
  const g = Math.round(parseInt(hex.slice(3, 5), 16) * factor);
  const b = Math.round(parseInt(hex.slice(5, 7), 16) * factor);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function themedGradient(color: string): string {
  const mid = darkenColor(color, 0.45);
  const dark = darkenColor(color, 0.15);
  return `linear-gradient(155deg, ${color} 0%, ${mid} 50%, ${dark} 100%)`;
}

const PINK_SOFT = '#FFD6E3';
const PINK_BRIGHT = '#FF4F87';
const PINK = '#D4537E';

export function Y2KTemplate({
  title,
  group,
  questions,
  difficulty,
  backgroundImage,
  themeColor,
}: CardTemplateProps) {
  return (
    <div
      style={{
        width: 1000,
        height: 1500,
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden',
        background: `linear-gradient(135deg, ${PINK_SOFT} 0%, ${PINK_BRIGHT} 100%)`,
      }}
    >
      {/* Holo gradient strip overlay */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background:
            'linear-gradient(120deg, transparent 30%, rgba(255,255,255,0.4) 45%, rgba(154,122,204,0.3) 55%, transparent 70%)',
          opacity: 0.6,
          display: 'flex',
        }}
      />

      {/* Sparkle decorations */}
      <div style={{ position: 'absolute', left: 100, top: 180, fontSize: 48, color: '#fff', opacity: 0.85, display: 'flex' }}>*</div>
      <div style={{ position: 'absolute', left: 850, top: 270, fontSize: 42, color: '#fff', opacity: 0.85, display: 'flex' }}>+</div>
      <div style={{ position: 'absolute', left: 80, top: 1050, fontSize: 36, color: '#fff', opacity: 0.85, display: 'flex' }}>.</div>
      <div style={{ position: 'absolute', left: 820, top: 1125, fontSize: 48, color: '#fff', opacity: 0.85, display: 'flex' }}>*</div>
      <div style={{ position: 'absolute', left: 920, top: 675, fontSize: 36, color: '#fff', opacity: 0.85, display: 'flex' }}>.</div>
      <div style={{ position: 'absolute', left: 50, top: 600, fontSize: 32, color: '#fff', opacity: 0.85, display: 'flex' }}>+</div>

      {/* Inner polaroid-style card */}
      <div
        style={{
          position: 'absolute',
          top: 120,
          left: 100,
          right: 100,
          height: 825,
          borderRadius: 48,
          background: themedGradient(themeColor),
          boxShadow: '0 16px 48px rgba(0,0,0,0.18)',
          border: '8px solid #fff',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Background image inside polaroid */}
        {backgroundImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={backgroundImage}
            alt=""
            width={800}
            height={825}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: 800,
              height: 825,
              objectFit: 'cover',
            }}
          />
        )}

        {/* Inner glow gradient (always shown, looks good over both image and gradient) */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: backgroundImage
              ? 'linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.3) 100%)'
              : `radial-gradient(circle at 50% 30%, ${themeColor}60, transparent 70%)`,
            display: 'flex',
          }}
        />

        {/* Tape effect at top */}
        <div
          style={{
            position: 'absolute',
            top: -16,
            left: 304,
            width: 160,
            height: 48,
            background: 'rgba(255,255,255,0.6)',
            transform: 'rotate(-3deg)',
            borderRadius: 6,
            display: 'flex',
          }}
        />
      </div>

      {/* Branding sticker top-left */}
      <div
        style={{
          position: 'absolute',
          top: 65,
          left: 65,
          padding: '16px 32px',
          borderRadius: 999,
          background: '#000',
          color: '#fff',
          fontSize: 28,
          fontWeight: 800,
          letterSpacing: 5,
          textTransform: 'uppercase' as const,
          transform: 'rotate(-4deg)',
          display: 'flex',
        }}
      >
        kpopquiz
      </div>

      {/* Group sticker top-right */}
      <div
        style={{
          position: 'absolute',
          top: 65,
          right: 65,
          padding: '16px 32px',
          borderRadius: 999,
          background: '#fff',
          color: PINK,
          fontSize: 28,
          fontWeight: 800,
          letterSpacing: 3,
          textTransform: 'uppercase' as const,
          transform: 'rotate(3deg)',
          boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
          display: 'flex',
        }}
      >
        {group}
      </div>

      {/* Title block - big white text with black shadow offset */}
      <div
        style={{
          position: 'absolute',
          bottom: 270,
          left: 80,
          right: 80,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        {/* Black shadow layer (offset down-right) */}
        <div
          style={{
            position: 'absolute',
            top: 6,
            left: 6,
            right: -6,
            display: 'flex',
            fontSize: 88,
            fontWeight: 900,
            color: '#000',
            lineHeight: 1,
            letterSpacing: -2,
            justifyContent: 'center',
            textAlign: 'center' as const,
          }}
        >
          {title}
        </div>
        {/* Main white text on top */}
        <div
          style={{
            display: 'flex',
            fontSize: 88,
            fontWeight: 900,
            color: '#fff',
            lineHeight: 1,
            letterSpacing: -2,
            justifyContent: 'center',
            textAlign: 'center' as const,
          }}
        >
          {title}
        </div>
      </div>

      {/* Bottom info strip */}
      <div
        style={{
          position: 'absolute',
          bottom: 60,
          left: 80,
          right: 80,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* Difficulty pill */}
        <div
          style={{
            display: 'flex',
            fontSize: 30,
            fontWeight: 700,
            color: '#000',
            letterSpacing: 3,
            background: '#fff',
            padding: '10px 24px',
            borderRadius: 999,
          }}
        >
          {difficulty} · {questions}Q
        </div>
        {/* Play text */}
        <div
          style={{
            display: 'flex',
            fontSize: 30,
            fontWeight: 700,
            color: '#fff',
            letterSpacing: 3,
          }}
        >
          play &gt;&gt;
        </div>
      </div>
    </div>
  );
}
