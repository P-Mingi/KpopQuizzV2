// Neon Stage template: Concert poster vibes. Dark base, neon spotlight cones, glowy text.
// Adapted from prototype CardNeonStage for next/og at 1000x1500.
// No blur/backdrop-filter/text-shadow (Satori limitations) - replaced with solid overlays.

import type { CardTemplateProps } from './EditorialTemplate';

function lightenColor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const lr = Math.min(255, r + Math.round((255 - r) * 0.35));
  const lg = Math.min(255, g + Math.round((255 - g) * 0.35));
  const lb = Math.min(255, b + Math.round((255 - b) * 0.35));
  return `#${lr.toString(16).padStart(2, '0')}${lg.toString(16).padStart(2, '0')}${lb.toString(16).padStart(2, '0')}`;
}

// Pre-calculated star positions (deterministic, no Array.from in Satori)
const STARS = [
  { x: '0%', y: '0%', size: 3, bright: true },
  { x: '37%', y: '23%', size: 2, bright: false },
  { x: '74%', y: '46%', size: 3, bright: true },
  { x: '11%', y: '69%', size: 2, bright: false },
  { x: '48%', y: '92%', size: 3, bright: true },
  { x: '85%', y: '15%', size: 2, bright: false },
  { x: '22%', y: '38%', size: 3, bright: true },
  { x: '59%', y: '61%', size: 2, bright: false },
  { x: '96%', y: '84%', size: 3, bright: true },
  { x: '33%', y: '7%', size: 2, bright: false },
  { x: '70%', y: '30%', size: 3, bright: true },
  { x: '7%', y: '53%', size: 2, bright: false },
  { x: '44%', y: '76%', size: 3, bright: true },
  { x: '81%', y: '99%', size: 2, bright: false },
  { x: '18%', y: '22%', size: 3, bright: true },
];

export function NeonStageTemplate({
  title,
  subtitle,
  group,
  questions,
  difficulty,
  backgroundImage,
  themeColor,
}: CardTemplateProps) {
  const accent = lightenColor(themeColor);

  return (
    <div
      style={{
        width: 1000,
        height: 1500,
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden',
        background: 'linear-gradient(180deg, #050214 0%, #0d0420 50%, #1a0a2e 100%)',
      }}
    >
      {/* Background image overlay if provided (dimmed) */}
      {backgroundImage && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={backgroundImage}
            alt=""
            width={1000}
            height={1500}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: 1000,
              height: 1500,
              objectFit: 'cover',
              opacity: 0.25,
            }}
          />
          {/* Dark overlay on top of image */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(5,2,20,0.7)',
              display: 'flex',
            }}
          />
        </>
      )}

      {/* Neon spotlight cone 1 (no blur - using gradient with transparency) */}
      <div
        style={{
          position: 'absolute',
          top: '-150px',
          left: '200px',
          width: '600px',
          height: '1800px',
          background: `linear-gradient(180deg, ${accent}35, transparent 70%)`,
          transform: 'rotate(15deg)',
          display: 'flex',
        }}
      />

      {/* Neon spotlight cone 2 */}
      <div
        style={{
          position: 'absolute',
          top: '-150px',
          right: '100px',
          width: '500px',
          height: '1500px',
          background: `linear-gradient(180deg, ${themeColor}40, transparent 60%)`,
          transform: 'rotate(-20deg)',
          display: 'flex',
        }}
      />

      {/* Stars/dots */}
      {STARS.map((star, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: star.x,
            top: star.y,
            width: star.size * 3,
            height: star.size * 3,
            borderRadius: '50%',
            background: star.bright ? accent : '#fff',
            opacity: star.bright ? 0.6 : 0.3,
            display: 'flex',
          }}
        />
      ))}

      {/* Top branding */}
      <div
        style={{
          position: 'absolute',
          top: 75,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <span
          style={{
            fontSize: 36,
            fontWeight: 800,
            color: accent,
            letterSpacing: 10,
            textTransform: 'uppercase' as const,
          }}
        >
          * kpopquiz *
        </span>
      </div>

      {/* Title block - centered */}
      <div
        style={{
          position: 'absolute',
          top: '42%',
          left: 100,
          right: 100,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center' as const,
        }}
      >
        {/* "presents" label */}
        <div
          style={{
            display: 'flex',
            fontSize: 26,
            color: 'rgba(255,255,255,0.5)',
            letterSpacing: 12,
            textTransform: 'uppercase' as const,
            fontWeight: 600,
            marginBottom: 16,
          }}
        >
          presents
        </div>

        {/* Title */}
        <div
          style={{
            display: 'flex',
            fontSize: 108,
            fontWeight: 900,
            color: '#fff',
            lineHeight: 1,
            letterSpacing: -3,
            textAlign: 'center' as const,
            justifyContent: 'center',
          }}
        >
          {title}
        </div>

        {/* Subtitle */}
        <div
          style={{
            display: 'flex',
            fontSize: 32,
            color: 'rgba(255,255,255,0.6)',
            marginTop: 28,
            lineHeight: 1.4,
          }}
        >
          {subtitle}
        </div>

        {/* Group + difficulty */}
        <div
          style={{
            display: 'flex',
            fontSize: 32,
            color: accent,
            marginTop: 28,
            fontWeight: 600,
            letterSpacing: 3,
          }}
        >
          {group} · {difficulty}
        </div>
      </div>

      {/* Bottom CTA strip */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '48px 80px',
          background: 'linear-gradient(180deg, transparent, rgba(0,0,0,0.5))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span
          style={{
            fontSize: 30,
            color: 'rgba(255,255,255,0.5)',
            letterSpacing: 5,
            textTransform: 'uppercase' as const,
            fontWeight: 600,
          }}
        >
          {questions} questions
        </span>
        <span
          style={{
            fontSize: 30,
            color: accent,
            letterSpacing: 5,
            textTransform: 'uppercase' as const,
            fontWeight: 700,
          }}
        >
          play now &gt;
        </span>
      </div>
    </div>
  );
}
