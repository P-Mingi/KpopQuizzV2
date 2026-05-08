// Editorial template: Magazine-cover style with full bleed gradient, dark overlay at bottom, big title.
// Adapted from prototype CardEditorial for next/og at 1000x1500.
// No blur/backdrop-filter/text-shadow (Satori limitations).

export interface CardTemplateProps {
  title: string;
  subtitle: string;
  group: string;
  questions: number;
  difficulty: string;
  backgroundImage: string | null;
  themeColor: string;
}

function lightenColor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const lr = Math.min(255, r + Math.round((255 - r) * 0.35));
  const lg = Math.min(255, g + Math.round((255 - g) * 0.35));
  const lb = Math.min(255, b + Math.round((255 - b) * 0.35));
  return `#${lr.toString(16).padStart(2, '0')}${lg.toString(16).padStart(2, '0')}${lb.toString(16).padStart(2, '0')}`;
}

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

export function EditorialTemplate({
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
        background: backgroundImage ? undefined : themedGradient(themeColor),
      }}
    >
      {/* Background image if provided */}
      {backgroundImage && (
        // eslint-disable-next-line @next/next/no-img-element
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
          }}
        />
      )}

      {/* Decorative spotlight (top-left) - solid radial gradient, no blur */}
      <div
        style={{
          position: 'absolute',
          top: '-150px',
          left: '-150px',
          width: '700px',
          height: '700px',
          borderRadius: '50%',
          background: `radial-gradient(circle, ${themeColor}60, transparent 70%)`,
          display: 'flex',
        }}
      />

      {/* Decorative spotlight (bottom-right) */}
      <div
        style={{
          position: 'absolute',
          bottom: '-300px',
          right: '-200px',
          width: '800px',
          height: '800px',
          borderRadius: '50%',
          background: `radial-gradient(circle, ${accent}25, transparent 60%)`,
          display: 'flex',
        }}
      />

      {/* Subtle light overlay */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background:
            'radial-gradient(circle at 30% 20%, rgba(255,255,255,0.06), transparent 40%)',
          display: 'flex',
        }}
      />

      {/* Top branding */}
      <div
        style={{
          position: 'absolute',
          top: 80,
          left: 80,
          right: 80,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', fontSize: 48, fontWeight: 800, color: '#fff', letterSpacing: -1 }}>
          kpop
          <span style={{ color: accent }}>quiz</span>
        </div>
        <div
          style={{
            display: 'flex',
            fontSize: 28,
            fontWeight: 700,
            padding: '10px 28px',
            borderRadius: 999,
            background: 'rgba(255,255,255,0.15)',
            color: '#fff',
            letterSpacing: 3,
            textTransform: 'uppercase' as const,
            border: '1px solid rgba(255,255,255,0.2)',
          }}
        >
          {group}
        </div>
      </div>

      {/* Bottom gradient overlay */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '55%',
          background:
            'linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0.85) 100%)',
          display: 'flex',
        }}
      />

      {/* Bottom content */}
      <div
        style={{
          position: 'absolute',
          bottom: 100,
          left: 100,
          right: 100,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Difficulty pill */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            alignSelf: 'flex-start',
            padding: '14px 32px',
            borderRadius: 999,
            background: `${accent}40`,
            border: `2px solid ${accent}80`,
            marginBottom: 32,
          }}
        >
          <span
            style={{
              fontSize: 28,
              fontWeight: 700,
              color: '#fff',
              letterSpacing: 3,
              textTransform: 'uppercase' as const,
            }}
          >
            {difficulty.toUpperCase()} · {questions} Q
          </span>
        </div>

        {/* Title */}
        <div
          style={{
            display: 'flex',
            fontSize: 96,
            fontWeight: 800,
            color: '#fff',
            lineHeight: 1.05,
            letterSpacing: -3,
          }}
        >
          {title}
        </div>

        {/* Subtitle */}
        <div
          style={{
            display: 'flex',
            fontSize: 36,
            color: 'rgba(255,255,255,0.75)',
            marginTop: 24,
            lineHeight: 1.4,
          }}
        >
          {subtitle}
        </div>

        {/* CTA bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: 48,
          }}
        >
          <span
            style={{
              fontSize: 32,
              color: accent,
              fontWeight: 700,
              letterSpacing: 3,
              textTransform: 'uppercase' as const,
            }}
          >
            Play at kpopquiz.org
          </span>
          <div
            style={{
              width: 100,
              height: 100,
              borderRadius: '50%',
              background: accent,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: `0 8px 32px ${themeColor}80`,
            }}
          >
            <svg
              width={44}
              height={44}
              viewBox="0 0 14 14"
              fill="none"
              stroke="#1a0612"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <path d="M5 3l4 4-4 4" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
