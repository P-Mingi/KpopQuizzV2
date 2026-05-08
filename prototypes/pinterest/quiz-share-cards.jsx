import { useState } from "react";

// -----------------------------------------------
// PALETTE (kpopquiz)
// -----------------------------------------------
const C = {
  pink: "#D4537E",
  pinkBright: "#FF4F87",
  pinkSoft: "#FFD6E3",
  bg: "#FAF9F6",
  textDark: "#2c2c2a",
  textMuted: "#888780",
  textLight: "#b4b2a9",
  border: "#e8e6e0",
  amber: "#e8a060",
  purple: "#9a7acc",
  cyan: "#7ad6e0",
  cream: "#FFF6EA",
};

// Production dimensions
const FORMATS = [
  { id: "pinterest",  label: "Pinterest pin",   ratio: "2/3",       w: 1000, h: 1500, displayW: 220, displayH: 330 },
  { id: "square",     label: "Square (IG/Reddit)", ratio: "1/1",    w: 1080, h: 1080, displayW: 280, displayH: 280 },
  { id: "og",         label: "OG (Twitter/FB)", ratio: "1.91/1",    w: 1200, h: 630,  displayW: 360, displayH: 188 },
];

// Realistic K-pop quiz examples with themed gradients
const QUIZZES = [
  {
    id: "blackpink-era",
    title: "Guess the BLACKPINK Era",
    subtitle: "Match each photo to the right comeback",
    group: "BLACKPINK",
    questions: 20,
    difficulty: "Hard",
    bg: "linear-gradient(155deg, #ff4f8c 0%, #d4377a 35%, #6b1d3f 75%, #1a0612 100%)",
    accent: "#FF6FA0",
    glow: "rgba(255,79,140,0.5)",
    decoration: "\u{1F339}",
  },
  {
    id: "bts-lyric",
    title: "BTS Lyric Challenge",
    subtitle: "Can you finish every line?",
    group: "BTS",
    questions: 30,
    difficulty: "Medium",
    bg: "linear-gradient(155deg, #b893ff 0%, #6c4abf 40%, #2a1554 80%, #0a0420 100%)",
    accent: "#C5A8FF",
    glow: "rgba(184,147,255,0.45)",
    decoration: "\u{1F3B5}",
  },
  {
    id: "aespa-mv",
    title: "Name the aespa MV",
    subtitle: "From the first second of footage",
    group: "aespa",
    questions: 15,
    difficulty: "Insane",
    bg: "linear-gradient(155deg, #00d4d4 0%, #2080a0 30%, #1a3052 60%, #050818 100%)",
    accent: "#7AE5E5",
    glow: "rgba(0,212,212,0.5)",
    decoration: "\u{1F30A}",
  },
  {
    id: "newjeans-vibe",
    title: "Which NewJeans Era is This?",
    subtitle: "Spot the concept from a single frame",
    group: "NewJeans",
    questions: 12,
    difficulty: "Easy",
    bg: "linear-gradient(155deg, #ffe4cc 0%, #ffb8a0 35%, #ff7a8a 70%, #b94367 100%)",
    accent: "#FFC4B0",
    glow: "rgba(255,184,160,0.6)",
    decoration: "\u{1F430}",
  },
  {
    id: "skz-songs",
    title: "Stray Kids Track Quiz",
    subtitle: "Identify the song in 5 seconds",
    group: "Stray Kids",
    questions: 25,
    difficulty: "Hard",
    bg: "linear-gradient(155deg, #ff5e3a 0%, #c92518 35%, #4d0a0a 70%, #110000 100%)",
    accent: "#FF8268",
    glow: "rgba(255,94,58,0.5)",
    decoration: "\u{1F525}",
  },
  {
    id: "kpop-debut",
    title: "Guess the Debut Year",
    subtitle: "From every major K-pop group",
    group: "All groups",
    questions: 50,
    difficulty: "Medium",
    bg: "linear-gradient(155deg, #d4537e 0%, #9a4ac8 50%, #4a2390 100%)",
    accent: "#E76FA0",
    glow: "rgba(212,83,126,0.5)",
    decoration: "\u2728",
  },
];

// -----------------------------------------------
// VARIANT 1 - EDITORIAL
// Magazine-cover style. Full bleed gradient, gradient overlay at bottom, big title.
// -----------------------------------------------
function CardEditorial({ quiz, w, h }) {
  const isVertical = h > w * 1.2;
  const isWide = w > h * 1.5;
  return (
    <div style={{
      width: w, height: h, position: "relative", overflow: "hidden",
      borderRadius: 12, background: quiz.bg,
      boxShadow: "0 12px 40px rgba(0,0,0,0.18)",
      flexShrink: 0,
    }}>
      {/* Decorative spotlight effects */}
      <div style={{
        position: "absolute", top: "-15%", left: "-15%", width: "70%", height: "70%",
        borderRadius: "50%",
        background: `radial-gradient(circle, ${quiz.glow}, transparent 70%)`,
        filter: "blur(40px)",
      }} />
      <div style={{
        position: "absolute", bottom: "-20%", right: "-20%", width: "80%", height: "80%",
        borderRadius: "50%",
        background: `radial-gradient(circle, ${quiz.accent}33, transparent 60%)`,
        filter: "blur(50px)",
      }} />
      {/* Grain noise effect */}
      <div style={{
        position: "absolute", inset: 0,
        background: "radial-gradient(circle at 30% 20%, rgba(255,255,255,0.06), transparent 40%)",
        mixBlendMode: "overlay",
      }} />

      {/* Top branding */}
      <div style={{
        position: "absolute", top: w >= 360 ? 24 : isVertical ? 18 : 14,
        left: w >= 360 ? 24 : isVertical ? 18 : 14, right: w >= 360 ? 24 : isVertical ? 18 : 14,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        zIndex: 3,
      }}>
        <span style={{
          fontSize: w >= 360 ? 14 : isVertical ? 11 : 10,
          fontWeight: 800, color: "#fff", letterSpacing: -0.3,
          textShadow: "0 2px 12px rgba(0,0,0,0.4)",
        }}>
          kpop<span style={{ color: quiz.accent }}>quiz</span>
        </span>
        <span style={{
          fontSize: w >= 360 ? 9 : 7,
          fontWeight: 700, padding: "3px 8px", borderRadius: 999,
          background: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)",
          color: "#fff", letterSpacing: 1, textTransform: "uppercase",
          border: "1px solid rgba(255,255,255,0.2)",
        }}>{quiz.group}</span>
      </div>

      {/* Bottom gradient overlay */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        height: isVertical ? "55%" : isWide ? "70%" : "55%",
        background: "linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0.85) 100%)",
        zIndex: 2,
      }} />

      {/* Bottom content */}
      <div style={{
        position: "absolute",
        bottom: w >= 360 ? 28 : isVertical ? 22 : 16,
        left: w >= 360 ? 28 : isVertical ? 22 : 16,
        right: w >= 360 ? 28 : isVertical ? 22 : 16,
        zIndex: 4,
      }}>
        {/* Difficulty pill */}
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 4,
          padding: w >= 360 ? "4px 10px" : "2px 7px",
          borderRadius: 999,
          background: `${quiz.accent}40`, backdropFilter: "blur(8px)",
          border: `1px solid ${quiz.accent}80`,
          marginBottom: w >= 360 ? 10 : 6,
        }}>
          <span style={{
            fontSize: w >= 360 ? 9 : 7,
            fontWeight: 700, color: "#fff", letterSpacing: 1, textTransform: "uppercase",
          }}>{quiz.difficulty} · {quiz.questions} Q</span>
        </div>

        {/* Title */}
        <h1 style={{
          fontSize: w >= 360 ? 28 : isVertical ? 22 : 18,
          fontWeight: 800, color: "#fff", margin: 0,
          lineHeight: 1.05, letterSpacing: -0.8,
          textShadow: "0 2px 16px rgba(0,0,0,0.4)",
        }}>{quiz.title}</h1>

        {/* Subtitle */}
        {(isVertical || isWide || w >= 280) && (
          <p style={{
            fontSize: w >= 360 ? 12 : isVertical ? 10 : 9,
            color: "rgba(255,255,255,0.75)",
            margin: "6px 0 0", lineHeight: 1.4,
          }}>{quiz.subtitle}</p>
        )}

        {/* CTA bar */}
        <div style={{
          marginTop: w >= 360 ? 14 : isVertical ? 12 : 10,
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
        }}>
          <span style={{
            fontSize: w >= 360 ? 10 : 8,
            color: quiz.accent, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase",
          }}>Play at kpopquiz.org</span>
          <div style={{
            width: w >= 360 ? 30 : isVertical ? 24 : 20, height: w >= 360 ? 30 : isVertical ? 24 : 20,
            borderRadius: "50%", background: quiz.accent,
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: `0 4px 16px ${quiz.glow}`,
          }}>
            <svg width={w >= 360 ? 14 : 10} height={w >= 360 ? 14 : 10} viewBox="0 0 14 14" fill="none" stroke="#1a0612" strokeWidth="2.5" strokeLinecap="round">
              <path d="M5 3l4 4-4 4" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

// -----------------------------------------------
// VARIANT 2 - NEON STAGE
// Concert poster vibes. Dark base, neon shapes, glowy text.
// -----------------------------------------------
function CardNeonStage({ quiz, w, h }) {
  const isVertical = h > w * 1.2;
  const isWide = w > h * 1.5;
  return (
    <div style={{
      width: w, height: h, position: "relative", overflow: "hidden",
      borderRadius: 12,
      background: "linear-gradient(180deg, #050214 0%, #0d0420 50%, #1a0a2e 100%)",
      boxShadow: "0 12px 40px rgba(0,0,0,0.3)",
      flexShrink: 0,
    }}>
      {/* Neon spotlight cones */}
      <div style={{
        position: "absolute", top: "-10%", left: "20%", width: "60%", height: "120%",
        background: `linear-gradient(180deg, ${quiz.accent}50, transparent 70%)`,
        filter: "blur(30px)",
        transform: "rotate(15deg)",
      }} />
      <div style={{
        position: "absolute", top: "-10%", right: "10%", width: "50%", height: "100%",
        background: `linear-gradient(180deg, ${quiz.glow}, transparent 60%)`,
        filter: "blur(40px)",
        transform: "rotate(-20deg)",
      }} />

      {/* Stars/dots */}
      {[...Array(15)].map((_, i) => (
        <div key={i} style={{
          position: "absolute",
          left: `${(i * 37) % 100}%`,
          top: `${(i * 23) % 100}%`,
          width: 1 + (i % 2), height: 1 + (i % 2), borderRadius: "50%",
          background: i % 3 === 0 ? quiz.accent : "#fff",
          opacity: 0.3 + (i % 5) * 0.1,
          boxShadow: i % 4 === 0 ? `0 0 4px ${quiz.accent}` : "none",
        }} />
      ))}

      {/* Top branding */}
      <div style={{
        position: "absolute",
        top: w >= 360 ? 22 : isVertical ? 16 : 12,
        left: 0, right: 0,
        display: "flex", justifyContent: "center", zIndex: 3,
      }}>
        <span style={{
          fontSize: w >= 360 ? 11 : isVertical ? 9 : 8,
          fontWeight: 800, color: quiz.accent, letterSpacing: 3, textTransform: "uppercase",
          textShadow: `0 0 12px ${quiz.glow}`,
        }}>* kpopquiz *</span>
      </div>

      {/* Center group emoji decoration */}
      <div style={{
        position: "absolute",
        top: isVertical ? "20%" : isWide ? "20%" : "18%",
        left: 0, right: 0,
        display: "flex", justifyContent: "center", zIndex: 2,
      }}>
        <span style={{ fontSize: w >= 360 ? 36 : isVertical ? 30 : 22, filter: "drop-shadow(0 0 12px rgba(255,255,255,0.3))" }}>
          {quiz.decoration}
        </span>
      </div>

      {/* Title block */}
      <div style={{
        position: "absolute",
        top: "50%", left: w >= 360 ? 28 : 16, right: w >= 360 ? 28 : 16,
        transform: "translateY(-30%)",
        textAlign: "center", zIndex: 4,
      }}>
        <p style={{
          fontSize: w >= 360 ? 9 : 7,
          color: "rgba(255,255,255,0.5)",
          margin: 0, marginBottom: 4, letterSpacing: 4, textTransform: "uppercase", fontWeight: 600,
        }}>presents</p>
        <h1 style={{
          fontSize: w >= 360 ? 32 : isVertical ? 26 : 20,
          fontWeight: 900, color: "#fff", margin: 0,
          lineHeight: 1, letterSpacing: -1,
          textShadow: `0 0 20px ${quiz.glow}, 0 0 40px ${quiz.glow}`,
        }}>{quiz.title}</h1>
        <p style={{
          fontSize: w >= 360 ? 11 : 9,
          color: quiz.accent, margin: "8px 0 0", fontWeight: 600, letterSpacing: 1,
        }}>{quiz.group} · {quiz.difficulty}</p>
      </div>

      {/* Bottom CTA strip */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        padding: w >= 360 ? "14px 24px" : isVertical ? "10px 18px" : "8px 14px",
        background: "linear-gradient(180deg, transparent, rgba(0,0,0,0.5))",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        zIndex: 4,
      }}>
        <span style={{
          fontSize: w >= 360 ? 10 : 8,
          color: "rgba(255,255,255,0.5)", letterSpacing: 1.5, textTransform: "uppercase", fontWeight: 600,
        }}>{quiz.questions} questions</span>
        <span style={{
          fontSize: w >= 360 ? 10 : 8,
          color: quiz.accent, letterSpacing: 1.5, textTransform: "uppercase", fontWeight: 700,
          textShadow: `0 0 8px ${quiz.glow}`,
        }}>play now ></span>
      </div>
    </div>
  );
}

// -----------------------------------------------
// VARIANT 3 - Y2K AESTHETIC
// Pink + chunky outlined text + sticker decorations
// -----------------------------------------------
function CardY2K({ quiz, w, h }) {
  const isVertical = h > w * 1.2;
  const isWide = w > h * 1.5;
  return (
    <div style={{
      width: w, height: h, position: "relative", overflow: "hidden",
      borderRadius: 12,
      background: `linear-gradient(135deg, ${C.pinkSoft} 0%, ${C.pinkBright} 100%)`,
      boxShadow: "0 12px 40px rgba(0,0,0,0.15)",
      flexShrink: 0,
    }}>
      {/* Holo gradient strip */}
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(120deg, transparent 30%, rgba(255,255,255,0.4) 45%, rgba(154,122,204,0.3) 55%, transparent 70%)",
        opacity: 0.6,
      }} />

      {/* Inner image-like card (the "photo" area) */}
      <div style={{
        position: "absolute",
        top: w >= 360 ? "8%" : 12,
        left: w >= 360 ? "10%" : 16,
        right: w >= 360 ? "10%" : 16,
        height: isVertical ? "55%" : isWide ? "75%" : "60%",
        borderRadius: 14,
        background: quiz.bg,
        boxShadow: "0 8px 24px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.2)",
        border: "3px solid #fff",
        overflow: "hidden",
        zIndex: 2,
      }}>
        {/* Inner glow */}
        <div style={{
          position: "absolute", inset: 0,
          background: `radial-gradient(circle at 50% 30%, ${quiz.glow}, transparent 70%)`,
        }} />
        {/* Polaroid-style emoji centered */}
        <div style={{
          position: "absolute", top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
          fontSize: w >= 360 ? 56 : isVertical ? 44 : 32,
          filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.3))",
        }}>{quiz.decoration}</div>
      </div>

      {/* Branding sticker top-left */}
      <div style={{
        position: "absolute",
        top: w >= 360 ? 20 : isVertical ? 14 : 10,
        left: w >= 360 ? 20 : isVertical ? 14 : 10,
        zIndex: 3,
        padding: w >= 360 ? "5px 10px" : "3px 7px",
        borderRadius: 999,
        background: "#000", color: "#fff",
        fontSize: w >= 360 ? 9 : 7, fontWeight: 800,
        letterSpacing: 1.5, textTransform: "uppercase",
        transform: "rotate(-4deg)",
      }}>kpopquiz</div>

      {/* Group sticker top-right */}
      <div style={{
        position: "absolute",
        top: w >= 360 ? 20 : isVertical ? 14 : 10,
        right: w >= 360 ? 20 : isVertical ? 14 : 10,
        zIndex: 3,
        padding: w >= 360 ? "5px 10px" : "3px 7px",
        borderRadius: 999,
        background: "#fff", color: C.pink,
        fontSize: w >= 360 ? 9 : 7, fontWeight: 800,
        letterSpacing: 1, textTransform: "uppercase",
        transform: "rotate(3deg)",
        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
      }}>{quiz.group}</div>

      {/* Title with chunky outline */}
      <div style={{
        position: "absolute",
        bottom: w >= 360 ? "18%" : isVertical ? "22%" : isWide ? "12%" : "16%",
        left: w >= 360 ? 24 : 14,
        right: w >= 360 ? 24 : 14,
        textAlign: "center", zIndex: 4,
      }}>
        <h1 style={{
          fontSize: w >= 360 ? 26 : isVertical ? 22 : 16,
          fontWeight: 900, color: "#fff", margin: 0,
          lineHeight: 1, letterSpacing: -0.5,
          WebkitTextStroke: `${w >= 360 ? 2 : 1.5}px #000`,
          textShadow: "3px 3px 0 #000",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}>{quiz.title}</h1>
      </div>

      {/* Bottom info strip */}
      <div style={{
        position: "absolute", bottom: w >= 360 ? 18 : 10,
        left: w >= 360 ? 24 : 14, right: w >= 360 ? 24 : 14,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        zIndex: 4,
      }}>
        <span style={{
          fontSize: w >= 360 ? 10 : 8,
          fontWeight: 700, color: "#000", letterSpacing: 1,
          background: "#fff", padding: w >= 360 ? "3px 8px" : "2px 6px", borderRadius: 999,
        }}>{quiz.difficulty} · {quiz.questions}Q</span>
        <span style={{
          fontSize: w >= 360 ? 10 : 8,
          fontWeight: 700, color: "#fff", letterSpacing: 1,
        }}>play >></span>
      </div>
    </div>
  );
}

// -----------------------------------------------
// MAIN
// -----------------------------------------------
export default function QuizSharePrototype() {
  const [variant, setVariant] = useState("editorial");
  const [format, setFormat] = useState("pinterest");

  const fmt = FORMATS.find(f => f.id === format);
  const VARIANTS = {
    editorial: CardEditorial,
    neon: CardNeonStage,
    y2k: CardY2K,
  };
  const Card = VARIANTS[variant];

  return (
    <div style={{
      minHeight: "100vh", padding: "20px", background: "#EDE8E2",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    }}>
      <div style={{ maxWidth: 1400, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: 16, textAlign: "center" }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: C.textDark, margin: 0 }}>
            Quiz share cards - Pinterest / Instagram / Twitter
          </p>
          <p style={{ fontSize: 10, color: C.textMuted, margin: 0, marginTop: 2 }}>
            Pick a variant + format. Same data, different aesthetics. Generated server-side per quiz.
          </p>
        </div>

        {/* Variant selector */}
        <div style={{ marginBottom: 8 }}>
          <p style={{ fontSize: 9, fontWeight: 700, color: C.textLight, textTransform: "uppercase", letterSpacing: 1, margin: 0, marginBottom: 6, textAlign: "center" }}>
            Design variant
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: 6 }}>
            {[
              { id: "editorial", label: "Editorial",   desc: "Magazine cover" },
              { id: "neon",      label: "Neon Stage",  desc: "Concert poster" },
              { id: "y2k",       label: "Y2K",         desc: "Sticker aesthetic" },
            ].map(v => (
              <button key={v.id} onClick={() => setVariant(v.id)} style={{
                padding: "8px 16px", borderRadius: 10,
                background: variant === v.id ? C.pink : "#fff",
                color: variant === v.id ? "#fff" : C.textMuted,
                border: `1px solid ${variant === v.id ? C.pink : C.border}`,
                fontSize: 11, fontWeight: 600, cursor: "pointer",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
                minWidth: 110,
              }}>
                <span>{v.label}</span>
                <span style={{ fontSize: 8, opacity: 0.7 }}>{v.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Format selector */}
        <div style={{ marginBottom: 20, marginTop: 14 }}>
          <p style={{ fontSize: 9, fontWeight: 700, color: C.textLight, textTransform: "uppercase", letterSpacing: 1, margin: 0, marginBottom: 6, textAlign: "center" }}>
            Format
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: 6 }}>
            {FORMATS.map(f => (
              <button key={f.id} onClick={() => setFormat(f.id)} style={{
                padding: "6px 14px", borderRadius: 8,
                background: format === f.id ? C.pink : "#fff",
                color: format === f.id ? "#fff" : C.textMuted,
                border: `1px solid ${format === f.id ? C.pink : C.border}`,
                fontSize: 10, fontWeight: 600, cursor: "pointer",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
                minWidth: 130,
              }}>
                <span>{f.label}</span>
                <span style={{ fontSize: 8, opacity: 0.7 }}>{f.w}x{f.h}px</span>
              </button>
            ))}
          </div>
        </div>

        {/* Card grid */}
        <div style={{
          display: "flex", flexWrap: "wrap", gap: 24, justifyContent: "center",
          padding: "20px",
        }}>
          {QUIZZES.map(quiz => (
            <div key={quiz.id} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
              <Card quiz={quiz} w={fmt.displayW} h={fmt.displayH} />
              <p style={{ fontSize: 9, color: C.textLight, margin: 0, fontFamily: "monospace" }}>
                {quiz.id}.png
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
