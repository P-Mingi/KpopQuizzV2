import { useState, useEffect } from "react";

const SCREENS = [
  { id: "countdown", label: "1 · Countdown" },
  { id: "lyric", label: "2 · Lyric Q" },
  { id: "photo", label: "3 · Photo Q" },
  { id: "correct", label: "4 · ✓ Correct" },
  { id: "wrong", label: "5 · ✕ Wrong" },
  { id: "toast", label: "6 · Live update" },
  { id: "reveal", label: "7 · Round end" },
  { id: "leaderboard", label: "8 · Mid-game" },
  { id: "host-menu", label: "9 · Host menu" },
  { id: "pause", label: "10 · Pause" },
  { id: "report", label: "11 · Report" },
];

const PALETTE = {
  pink: "#D4537E",
  pinkLight: "rgba(212,83,126,0.06)",
  pinkBorder: "rgba(212,83,126,0.15)",
  bg: "#FAF9F6",
  white: "#fff",
  textDark: "#2c2c2a",
  textMuted: "#888780",
  textLight: "#b4b2a9",
  border: "#e8e6e0",
  borderLight: "#f0ede8",
  green: "#27ae60",
  amber: "#e8a060",
  purple: "#9a7acc",
  red: "#e74c3c",
  gameBg: "linear-gradient(160deg, #1a0a1e 0%, #2a1035 60%, #3a1848 100%)",
};

const PLAYERS = [
  { id: 1, name: "Mina", short: "M", color: "#D4537E", score: 78, isYou: false, isHost: true },
  { id: 2, name: "felix", short: "F", color: "#e8a060", score: 65, isYou: false },
  { id: 3, name: "you", short: "Y", color: "#9a7acc", score: 42, isYou: true },
  { id: 4, name: "BlinkF.", short: "B", color: "#4a90d0", score: 18, isYou: false, isGuest: true },
];

const SORTED = [...PLAYERS].sort((a, b) => b.score - a.score);

// ═══════════════════════════════════════
// SHARED COMPONENTS
// ═══════════════════════════════════════

function ScoreBar({ players = SORTED, leadingId = 1 }) {
  return (
    <div style={{
      display: "flex", gap: 4, padding: "8px 10px",
      background: "rgba(0,0,0,0.4)", backdropFilter: "blur(12px)",
      borderRadius: 12, overflowX: "auto", scrollbarWidth: "none",
    }}>
      {players.map((p, i) => (
        <div key={p.id} style={{
          flexShrink: 0, display: "flex", alignItems: "center", gap: 5,
          padding: "4px 8px 4px 4px", borderRadius: 14,
          background: p.isYou ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.04)",
          border: p.id === leadingId ? "1px solid rgba(232,160,96,0.5)" : "1px solid transparent",
          position: "relative",
        }}>
          {p.id === leadingId && (
            <span style={{ position: "absolute", top: -7, right: -2, fontSize: 9 }}>👑</span>
          )}
          <div style={{
            width: 18, height: 18, borderRadius: "50%",
            background: p.color, color: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 9, fontWeight: 800, flexShrink: 0,
          }}>{p.short}</div>
          <span style={{ fontSize: 9, fontWeight: 600, color: "rgba(255,255,255,0.85)" }}>
            {p.name}
          </span>
          <span style={{ fontSize: 11, fontWeight: 800, color: "#fff" }}>
            {p.score}
          </span>
        </div>
      ))}
    </div>
  );
}

function TimerBar({ percent, color }) {
  // Color shifts: green > 50%, amber 25-50%, red < 25%
  const c = percent > 50 ? "#27ae60" : percent > 25 ? "#e8a060" : "#e74c3c";
  return (
    <div style={{ position: "relative", height: 4, borderRadius: 2, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
      <div style={{
        height: "100%", width: `${percent}%`, background: color || c,
        borderRadius: 2, transition: "width 0.1s linear",
        boxShadow: `0 0 8px ${color || c}`,
      }} />
    </div>
  );
}

function ChatBubble({ collapsed, onToggle }) {
  return collapsed ? (
    <div onClick={onToggle} style={{
      padding: "8px 12px", borderRadius: 10,
      background: "rgba(0,0,0,0.4)", backdropFilter: "blur(8px)",
      border: "1px solid rgba(255,255,255,0.06)",
      display: "flex", alignItems: "center", gap: 6, cursor: "pointer",
    }}>
      <span style={{ fontSize: 11, color: "#e8a060", fontWeight: 600 }}>felix:</span>
      <span style={{ fontSize: 10, color: "rgba(255,255,255,0.7)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        easy round lol
      </span>
      <span style={{
        fontSize: 8, padding: "1px 5px", borderRadius: 4,
        background: PALETTE.pink, color: "#fff", fontWeight: 700,
      }}>+3</span>
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" strokeLinecap="round">
        <path d="M3 4l2 2 2-2" />
      </svg>
    </div>
  ) : (
    <div style={{
      borderRadius: 12, overflow: "hidden",
      background: "rgba(0,0,0,0.4)", backdropFilter: "blur(12px)",
      border: "1px solid rgba(255,255,255,0.06)",
    }}>
      <div onClick={onToggle} style={{
        padding: "6px 12px", display: "flex", alignItems: "center", justifyContent: "space-between",
        borderBottom: "1px solid rgba(255,255,255,0.06)", cursor: "pointer",
      }}>
        <span style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: 1 }}>
          Chat
        </span>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" strokeLinecap="round">
          <path d="M3 6l2-2 2 2" />
        </svg>
      </div>
      <div style={{ padding: "8px 12px", maxHeight: 110, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
        {[
          { user: "Mina", color: "#D4537E", msg: "lets go", host: true },
          { user: "felix", color: "#e8a060", msg: "easy round lol" },
          { user: "BlinkF.", color: "#4a90d0", msg: "?? what was that" },
        ].map((m, i) => (
          <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 5 }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: m.color, flexShrink: 0 }}>
              {m.user}{m.host && " 👑"}:
            </span>
            <span style={{ fontSize: 9, color: "rgba(255,255,255,0.85)" }}>{m.msg}</span>
          </div>
        ))}
      </div>
      <div style={{ padding: 6, borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", gap: 4 }}>
        <input
          placeholder="Type a message..."
          style={{
            flex: 1, padding: "5px 10px", borderRadius: 6,
            background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)",
            color: "#fff", fontSize: 9, outline: "none",
          }}
        />
        <button style={{
          padding: "5px 10px", borderRadius: 6,
          background: PALETTE.pink, color: "#fff", border: "none",
          fontSize: 9, fontWeight: 600, cursor: "pointer",
        }}>Send</button>
      </div>
    </div>
  );
}

function GameTopBar({ onMenuClick }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
      <div onClick={onMenuClick} style={{
        width: 32, height: 32, borderRadius: 8,
        background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)",
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer", flexShrink: 0,
      }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <div style={{ width: 14, height: 1.5, background: "rgba(255,255,255,0.7)", borderRadius: 1 }} />
          <div style={{ width: 14, height: 1.5, background: "rgba(255,255,255,0.7)", borderRadius: 1 }} />
          <div style={{ width: 14, height: 1.5, background: "rgba(255,255,255,0.7)", borderRadius: 1 }} />
        </div>
      </div>
      <div style={{
        flex: 1, padding: "5px 10px", borderRadius: 8,
        background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)",
      }}>
        <p style={{ fontSize: 8, fontWeight: 700, color: "rgba(255,255,255,0.4)", margin: 0, textTransform: "uppercase", letterSpacing: 1 }}>
          Round 5 · First to 100
        </p>
        <p style={{ fontSize: 11, fontWeight: 700, color: "#fff", margin: 0 }}>
          Lyric Battle · Hard
        </p>
      </div>
      <div style={{
        padding: "5px 10px", borderRadius: 8,
        background: "rgba(212,83,126,0.15)", border: "1px solid rgba(212,83,126,0.3)",
        textAlign: "center", flexShrink: 0,
      }}>
        <p style={{ fontSize: 7, fontWeight: 600, color: "rgba(255,255,255,0.5)", margin: 0, textTransform: "uppercase", letterSpacing: 1 }}>
          You
        </p>
        <p style={{ fontSize: 14, fontWeight: 800, color: "#fff", margin: 0 }}>42</p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════
// 1 — COUNTDOWN
// ═══════════════════════════════════════
function ScreenCountdown() {
  const [n, setN] = useState(3);
  useEffect(() => {
    if (n === 0) return;
    const t = setTimeout(() => setN(n === 1 ? 0 : n - 1), 1000);
    return () => clearTimeout(t);
  }, [n]);

  const display = n === 0 ? "GO!" : n;

  return (
    <div style={{
      minHeight: 600, background: PALETTE.gameBg,
      display: "flex", flexDirection: "column", padding: "16px 14px",
      position: "relative", overflow: "hidden",
    }}>
      {/* Decorative dots */}
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} style={{
          position: "absolute",
          left: `${(i * 41) % 100}%`,
          top: `${(i * 23) % 100}%`,
          width: 2 + (i % 3), height: 2 + (i % 3), borderRadius: "50%",
          background: "rgba(255,255,255,0.06)",
          animation: `twinkleSlow ${2 + (i % 3)}s ${(i * 0.3) % 2}s infinite`,
        }} />
      ))}

      <ScoreBar />

      <div style={{
        flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        position: "relative",
      }}>
        <p style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: 4, margin: 0, marginBottom: 16 }}>
          Round 5 · Get ready
        </p>

        {/* Pulsing ring + number */}
        <div style={{ position: "relative", width: 200, height: 200 }}>
          <div style={{
            position: "absolute", inset: 0, borderRadius: "50%",
            background: `radial-gradient(circle, ${n === 0 ? "rgba(39,174,96,0.3)" : "rgba(212,83,126,0.3)"}, transparent 60%)`,
            animation: "countPulse 1s ease-out infinite",
          }} />
          <div style={{
            position: "absolute", inset: 30, borderRadius: "50%",
            border: `3px solid ${n === 0 ? "rgba(39,174,96,0.6)" : "rgba(212,83,126,0.6)"}`,
            animation: "countRing 1s ease-out infinite",
          }} />
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: n === 0 ? 70 : 130, fontWeight: 800,
            color: n === 0 ? "#27ae60" : "#fff",
            animation: "countNum 1s ease-out",
            textShadow: n === 0 ? "0 0 40px rgba(39,174,96,0.6)" : "0 0 40px rgba(212,83,126,0.6)",
          }} key={n}>{display}</div>
        </div>

        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 24 }}>
          Lyric Battle · Hard
        </p>
      </div>

      <ChatBubble collapsed={true} />
    </div>
  );
}

// ═══════════════════════════════════════
// 2 — LYRIC QUESTION
// ═══════════════════════════════════════
function ScreenLyric() {
  const [answer, setAnswer] = useState("");
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <div style={{
      minHeight: 600, background: PALETTE.gameBg,
      display: "flex", flexDirection: "column", padding: "16px 14px",
    }}>
      <GameTopBar />
      <ScoreBar />

      {/* Question content area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "16px 0" }}>
        {/* Question type tag */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 5, marginBottom: 14 }}>
          <span style={{
            fontSize: 8, fontWeight: 700, padding: "3px 9px", borderRadius: 6,
            background: "rgba(212,83,126,0.2)", color: "#fff",
            textTransform: "uppercase", letterSpacing: 1,
          }}>🎤 Lyric Battle</span>
        </div>

        {/* The lyric */}
        <div style={{
          padding: "20px 18px", borderRadius: 14,
          background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
          backdropFilter: "blur(8px)",
          textAlign: "center",
        }}>
          <span style={{
            display: "block", fontSize: 32, fontWeight: 700, color: "rgba(255,255,255,0.2)", lineHeight: 1, marginBottom: 4,
          }}>"</span>
          <p style={{
            fontSize: 17, fontWeight: 600, color: "#fff", margin: 0, lineHeight: 1.5,
            fontStyle: "italic",
          }}>
            Stop, look, listen baby<br />
            You so trendy
          </p>
          <span style={{
            display: "block", fontSize: 32, fontWeight: 700, color: "rgba(255,255,255,0.2)", lineHeight: 1, marginTop: 4,
          }}>"</span>
        </div>

        {/* Question prompt */}
        <p style={{
          fontSize: 11, color: "rgba(255,255,255,0.5)", textAlign: "center",
          marginTop: 14, marginBottom: 4,
        }}>
          What song is this?
        </p>

        {/* Live updates row */}
        <div style={{ display: "flex", justifyContent: "center", gap: 4, marginTop: 8, minHeight: 18 }}>
          <span style={{
            fontSize: 9, fontWeight: 600, padding: "2px 8px", borderRadius: 10,
            background: "rgba(39,174,96,0.15)", color: "#27ae60",
            display: "flex", alignItems: "center", gap: 4,
            animation: "popIn 0.3s ease-out",
          }}>
            <span>✓</span> Mina got it
          </span>
        </div>
      </div>

      {/* Timer bar */}
      <div style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 9, fontWeight: 600, color: "rgba(255,255,255,0.5)", flexShrink: 0 }}>⏱</span>
        <div style={{ flex: 1 }}>
          <TimerBar percent={62} />
        </div>
        <span style={{ fontSize: 12, fontWeight: 800, color: "#27ae60", fontFamily: "monospace", flexShrink: 0 }}>
          9.2s
        </span>
      </div>

      {/* Answer input */}
      <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
        <input
          value={answer}
          onChange={e => setAnswer(e.target.value)}
          autoFocus
          placeholder="Type the song title..."
          style={{
            flex: 1, padding: "12px 14px", borderRadius: 12,
            background: "rgba(255,255,255,0.08)", border: "2px solid rgba(255,255,255,0.12)",
            color: "#fff", fontSize: 13, fontWeight: 500, outline: "none",
            boxShadow: "inset 0 1px 3px rgba(0,0,0,0.2)",
          }}
        />
        <button
          disabled={!answer.trim()}
          style={{
            padding: "12px 16px", borderRadius: 12,
            background: answer.trim() ? PALETTE.pink : "rgba(255,255,255,0.06)",
            color: answer.trim() ? "#fff" : "rgba(255,255,255,0.3)",
            border: "none", fontSize: 12, fontWeight: 700,
            cursor: answer.trim() ? "pointer" : "default",
            boxShadow: answer.trim() ? "0 4px 14px rgba(212,83,126,0.4)" : "none",
          }}
        >Send</button>
      </div>

      {/* Hint */}
      <p style={{ fontSize: 8, color: "rgba(255,255,255,0.3)", textAlign: "center", margin: 0, marginBottom: 8 }}>
        💡 Typos OK · "BTS" or "방탄" both work
      </p>

      {/* Chat */}
      <ChatBubble collapsed={!chatOpen} onToggle={() => setChatOpen(!chatOpen)} />
    </div>
  );
}

// ═══════════════════════════════════════
// 3 — PHOTO QUESTION
// ═══════════════════════════════════════
function ScreenPhoto() {
  const [answer, setAnswer] = useState("");

  return (
    <div style={{
      minHeight: 600, background: PALETTE.gameBg,
      display: "flex", flexDirection: "column", padding: "16px 14px",
    }}>
      <GameTopBar />
      <ScoreBar />

      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "12px 0" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 5, marginBottom: 12 }}>
          <span style={{
            fontSize: 8, fontWeight: 700, padding: "3px 9px", borderRadius: 6,
            background: "rgba(74,144,208,0.25)", color: "#fff",
            textTransform: "uppercase", letterSpacing: 1,
          }}>📸 Cropped Photo</span>
        </div>

        {/* The cropped photo placeholder */}
        <div style={{
          width: 220, height: 220, margin: "0 auto",
          borderRadius: 14, overflow: "hidden",
          position: "relative",
          background: "linear-gradient(135deg, #f0e8f8, #d0c0e8)",
          border: "2px solid rgba(255,255,255,0.15)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
        }}>
          {/* Simulated cropped facial feature - eye/lip area */}
          <div style={{
            position: "absolute", top: "30%", left: "20%", width: "60%", height: "20%",
            background: "linear-gradient(180deg, rgba(0,0,0,0.6), rgba(0,0,0,0.3))",
            borderRadius: "50%", filter: "blur(2px)",
          }} />
          <div style={{
            position: "absolute", top: "25%", left: "35%", width: 30, height: 12,
            background: "rgba(0,0,0,0.85)", borderRadius: "50%",
          }} />
          <div style={{
            position: "absolute", top: "60%", left: "30%", width: "40%", height: 8,
            background: "rgba(160,40,60,0.7)", borderRadius: 4, filter: "blur(1px)",
          }} />
          {/* Cropped indicator */}
          <div style={{
            position: "absolute", bottom: 6, right: 6,
            padding: "3px 7px", borderRadius: 6,
            background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)",
            fontSize: 8, fontWeight: 700, color: "#fff",
          }}>cropped</div>
        </div>

        <p style={{
          fontSize: 11, color: "rgba(255,255,255,0.5)", textAlign: "center",
          marginTop: 14, marginBottom: 4,
        }}>
          Which idol is this?
        </p>

        {/* Live updates */}
        <div style={{ display: "flex", justifyContent: "center", gap: 4, marginTop: 8, minHeight: 18 }} />
      </div>

      <div style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 9, color: "rgba(255,255,255,0.5)" }}>⏱</span>
        <div style={{ flex: 1 }}><TimerBar percent={84} /></div>
        <span style={{ fontSize: 12, fontWeight: 800, color: "#27ae60", fontFamily: "monospace" }}>12.6s</span>
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
        <input
          value={answer}
          onChange={e => setAnswer(e.target.value)}
          autoFocus
          placeholder="Type the idol's name..."
          style={{
            flex: 1, padding: "12px 14px", borderRadius: 12,
            background: "rgba(255,255,255,0.08)", border: "2px solid rgba(255,255,255,0.12)",
            color: "#fff", fontSize: 13, fontWeight: 500, outline: "none",
          }}
        />
        <button style={{
          padding: "12px 16px", borderRadius: 12,
          background: answer.trim() ? PALETTE.pink : "rgba(255,255,255,0.06)",
          color: answer.trim() ? "#fff" : "rgba(255,255,255,0.3)",
          border: "none", fontSize: 12, fontWeight: 700, cursor: "pointer",
        }}>Send</button>
      </div>

      <p style={{ fontSize: 8, color: "rgba(255,255,255,0.3)", textAlign: "center", margin: 0, marginBottom: 8 }}>
        💡 First name only is fine
      </p>

      <ChatBubble collapsed={true} />
    </div>
  );
}

// ═══════════════════════════════════════
// 4 — JUST ANSWERED CORRECTLY
// ═══════════════════════════════════════
function ScreenCorrect() {
  return (
    <div style={{
      minHeight: 600, background: PALETTE.gameBg,
      display: "flex", flexDirection: "column", padding: "16px 14px",
      position: "relative", overflow: "hidden",
    }}>
      {/* Green flash overlay */}
      <div style={{
        position: "absolute", inset: 0,
        background: "radial-gradient(ellipse at 50% 40%, rgba(39,174,96,0.25), transparent 60%)",
        animation: "correctFlash 0.6s ease-out",
        pointerEvents: "none",
      }} />

      <GameTopBar />
      <ScoreBar />

      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "16px 0", position: "relative", zIndex: 2 }}>
        {/* Big correct indicator */}
        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <div style={{
            width: 80, height: 80, borderRadius: "50%",
            background: "linear-gradient(145deg, #27ae60, #1e8449)",
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 8px 32px rgba(39,174,96,0.5)",
            animation: "correctPop 0.5s cubic-bezier(0.34,1.56,0.64,1)",
          }}>
            <svg width="44" height="44" viewBox="0 0 44 44" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round">
              <path d="M11 22l8 8 14-16" />
            </svg>
          </div>
        </div>

        {/* +X points */}
        <div style={{ textAlign: "center", marginBottom: 16, animation: "fadeUpFast 0.5s 0.2s both" }}>
          <p style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.4)", margin: 0, textTransform: "uppercase", letterSpacing: 2 }}>
            Correct!
          </p>
          <p style={{ fontSize: 48, fontWeight: 800, color: "#27ae60", margin: 0, lineHeight: 1, textShadow: "0 0 30px rgba(39,174,96,0.4)" }}>
            +8 <span style={{ fontSize: 24, color: "rgba(255,255,255,0.7)" }}>pts</span>
          </p>
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", margin: 0, marginTop: 4 }}>
            answered in 2.4s
          </p>
        </div>

        {/* Your answer */}
        <div style={{
          padding: "10px 14px", borderRadius: 10,
          background: "rgba(39,174,96,0.1)", border: "1px solid rgba(39,174,96,0.25)",
          textAlign: "center", animation: "fadeUpFast 0.5s 0.4s both",
        }}>
          <p style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", margin: 0, marginBottom: 2 }}>
            You answered:
          </p>
          <p style={{ fontSize: 14, fontWeight: 700, color: "#fff", margin: 0 }}>
            Pink Venom ✓
          </p>
        </div>

        {/* Waiting state */}
        <div style={{ textAlign: "center", marginTop: 24, animation: "fadeUpFast 0.5s 0.6s both" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <div style={{ display: "flex", gap: 3 }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{
                  width: 5, height: 5, borderRadius: "50%",
                  background: "rgba(255,255,255,0.4)",
                  animation: `dotPulse 1.4s ${i * 0.2}s infinite`,
                }} />
              ))}
            </div>
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.5)" }}>
              Waiting for others (2/4 answered)
            </span>
          </div>
        </div>
      </div>

      {/* Timer still ticking */}
      <div style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 9, color: "rgba(255,255,255,0.5)" }}>⏱</span>
        <div style={{ flex: 1 }}><TimerBar percent={45} /></div>
        <span style={{ fontSize: 12, fontWeight: 800, color: "#e8a060", fontFamily: "monospace" }}>6.7s</span>
      </div>

      <ChatBubble collapsed={true} />
    </div>
  );
}

// ═══════════════════════════════════════
// 5 — ANSWERED WRONG (can retry)
// ═══════════════════════════════════════
function ScreenWrong() {
  const [answer, setAnswer] = useState("Pink Punk");

  return (
    <div style={{
      minHeight: 600, background: PALETTE.gameBg,
      display: "flex", flexDirection: "column", padding: "16px 14px",
      position: "relative",
    }}>
      {/* Red flash */}
      <div style={{
        position: "absolute", inset: 0,
        background: "radial-gradient(ellipse at 50% 70%, rgba(231,76,60,0.18), transparent 60%)",
        animation: "wrongFlash 0.5s ease-out",
        pointerEvents: "none",
      }} />

      <GameTopBar />
      <ScoreBar />

      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "16px 0", position: "relative", zIndex: 2 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 5, marginBottom: 14 }}>
          <span style={{
            fontSize: 8, fontWeight: 700, padding: "3px 9px", borderRadius: 6,
            background: "rgba(212,83,126,0.2)", color: "#fff",
            textTransform: "uppercase", letterSpacing: 1,
          }}>🎤 Lyric Battle</span>
        </div>

        <div style={{
          padding: "18px 18px", borderRadius: 14,
          background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
          textAlign: "center",
        }}>
          <p style={{ fontSize: 17, fontWeight: 600, color: "#fff", margin: 0, lineHeight: 1.5, fontStyle: "italic" }}>
            Stop, look, listen baby<br />
            You so trendy
          </p>
        </div>

        {/* Wrong feedback */}
        <div style={{
          marginTop: 16, padding: "10px 14px", borderRadius: 10,
          background: "rgba(231,76,60,0.12)", border: "1px solid rgba(231,76,60,0.3)",
          display: "flex", alignItems: "center", gap: 8,
          animation: "shakeIt 0.4s ease-out",
        }}>
          <div style={{
            width: 24, height: 24, borderRadius: "50%",
            background: "rgba(231,76,60,0.3)",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#e74c3c" strokeWidth="2" strokeLinecap="round">
              <path d="M3.5 3.5l7 7M10.5 3.5l-7 7" />
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#e74c3c", margin: 0 }}>Not quite!</p>
            <p style={{ fontSize: 9, color: "rgba(255,255,255,0.6)", margin: 0 }}>"{answer}" — keep trying</p>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 9, color: "rgba(255,255,255,0.5)" }}>⏱</span>
        <div style={{ flex: 1 }}><TimerBar percent={32} /></div>
        <span style={{ fontSize: 12, fontWeight: 800, color: "#e8a060", fontFamily: "monospace" }}>4.8s</span>
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
        <input
          value=""
          autoFocus
          placeholder="Try again..."
          style={{
            flex: 1, padding: "12px 14px", borderRadius: 12,
            background: "rgba(255,255,255,0.08)", border: "2px solid rgba(231,76,60,0.4)",
            color: "#fff", fontSize: 13, outline: "none",
            animation: "shakeIt 0.4s ease-out",
          }}
        />
        <button style={{
          padding: "12px 16px", borderRadius: 12,
          background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.3)",
          border: "none", fontSize: 12, fontWeight: 700, cursor: "default",
        }}>Send</button>
      </div>

      <p style={{ fontSize: 8, color: "rgba(255,255,255,0.3)", textAlign: "center", margin: 0, marginBottom: 8 }}>
        Wrong attempts: 1 · No penalty
      </p>

      <ChatBubble collapsed={true} />
    </div>
  );
}

// ═══════════════════════════════════════
// 6 — LIVE UPDATE TOAST
// ═══════════════════════════════════════
function ScreenToast() {
  return (
    <div style={{
      minHeight: 600, background: PALETTE.gameBg,
      display: "flex", flexDirection: "column", padding: "16px 14px",
      position: "relative",
    }}>
      <GameTopBar />
      <ScoreBar />

      {/* Floating toast notification */}
      <div style={{
        position: "absolute", top: 130, left: "50%", transform: "translateX(-50%)",
        zIndex: 20,
        animation: "toastSlide 0.4s ease-out",
      }}>
        <div style={{
          padding: "8px 14px", borderRadius: 12,
          background: "linear-gradient(135deg, rgba(212,83,126,0.95), rgba(192,73,116,0.95))",
          border: "1px solid rgba(255,255,255,0.2)",
          backdropFilter: "blur(12px)",
          display: "flex", alignItems: "center", gap: 8,
          boxShadow: "0 8px 24px rgba(212,83,126,0.4)",
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: "50%",
            background: "#D4537E",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 13, fontWeight: 800, color: "#fff",
            border: "2px solid #fff",
          }}>M</div>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#fff", margin: 0 }}>
              Mina got it! ✓
            </p>
            <p style={{ fontSize: 8, color: "rgba(255,255,255,0.7)", margin: 0 }}>
              answered in 1.8s · +9 pts
            </p>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "16px 0" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 5, marginBottom: 14 }}>
          <span style={{
            fontSize: 8, fontWeight: 700, padding: "3px 9px", borderRadius: 6,
            background: "rgba(212,83,126,0.2)", color: "#fff",
            textTransform: "uppercase", letterSpacing: 1,
          }}>🎤 Lyric Battle</span>
        </div>

        <div style={{
          padding: "20px 18px", borderRadius: 14,
          background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
          textAlign: "center",
        }}>
          <p style={{ fontSize: 17, fontWeight: 600, color: "#fff", margin: 0, lineHeight: 1.5, fontStyle: "italic" }}>
            Stop, look, listen baby<br />
            You so trendy
          </p>
        </div>

        {/* Multiple players got it indicator */}
        <div style={{ display: "flex", justifyContent: "center", gap: 4, marginTop: 14 }}>
          {[
            { name: "Mina", color: "#D4537E", time: "1.8s", pts: 9 },
            { name: "felix", color: "#e8a060", time: "3.1s", pts: 7 },
          ].map((p, i) => (
            <span key={i} style={{
              fontSize: 9, fontWeight: 600, padding: "3px 8px", borderRadius: 10,
              background: `${p.color}25`, color: p.color,
              display: "flex", alignItems: "center", gap: 4,
            }}>
              <span>✓</span> {p.name} +{p.pts}
            </span>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 9, color: "rgba(255,255,255,0.5)" }}>⏱</span>
        <div style={{ flex: 1 }}><TimerBar percent={28} /></div>
        <span style={{ fontSize: 12, fontWeight: 800, color: "#e74c3c", fontFamily: "monospace" }}>4.2s</span>
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
        <input
          autoFocus
          placeholder="Quick! Type the song..."
          style={{
            flex: 1, padding: "12px 14px", borderRadius: 12,
            background: "rgba(255,255,255,0.08)", border: "2px solid rgba(231,76,60,0.4)",
            color: "#fff", fontSize: 13, outline: "none",
          }}
        />
        <button style={{
          padding: "12px 16px", borderRadius: 12,
          background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.3)",
          border: "none", fontSize: 12, fontWeight: 700,
        }}>Send</button>
      </div>

      <p style={{ fontSize: 8, color: "rgba(231,76,60,0.6)", textAlign: "center", margin: 0, marginBottom: 8, fontWeight: 600 }}>
        ⚠ 2 players answered — hurry!
      </p>

      <ChatBubble collapsed={true} />
    </div>
  );
}

// ═══════════════════════════════════════
// 7 — ROUND END / ANSWER REVEAL
// ═══════════════════════════════════════
function ScreenReveal() {
  return (
    <div style={{
      minHeight: 600, background: PALETTE.gameBg,
      display: "flex", flexDirection: "column", padding: "16px 14px",
    }}>
      <ScoreBar />

      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "16px 0" }}>
        {/* Reveal banner */}
        <div style={{ textAlign: "center", marginBottom: 18 }}>
          <p style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.4)", margin: 0, textTransform: "uppercase", letterSpacing: 2 }}>
            The answer was
          </p>
          <p style={{
            fontSize: 28, fontWeight: 800, color: "#fff", margin: 0, marginTop: 6,
            textShadow: "0 0 30px rgba(212,83,126,0.5)",
            animation: "fadeUpFast 0.5s ease-out",
          }}>
            Pink Venom
          </p>
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", margin: 0, marginTop: 4 }}>
            BLACKPINK · 2022
          </p>
        </div>

        {/* Who got it */}
        <div style={{
          padding: "12px 14px", borderRadius: 14,
          background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)",
          marginBottom: 12,
        }}>
          <p style={{ fontSize: 8, fontWeight: 700, color: "rgba(255,255,255,0.4)", margin: 0, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>
            🏆 Round results
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {[
              { name: "Mina", color: "#D4537E", time: "1.8s", pts: 9, place: 1 },
              { name: "felix", color: "#e8a060", time: "3.1s", pts: 7, place: 2 },
              { name: "you", color: "#9a7acc", time: "—", pts: 0, place: null, missed: true, isYou: true },
              { name: "BlinkF.", color: "#4a90d0", time: "—", pts: 0, place: null, missed: true },
            ].map((p, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "6px 10px", borderRadius: 8,
                background: p.isYou ? "rgba(154,122,204,0.1)" : "transparent",
                border: p.isYou ? "1px solid rgba(154,122,204,0.2)" : "1px solid transparent",
                opacity: p.missed ? 0.5 : 1,
              }}>
                {p.place && (
                  <span style={{
                    width: 18, height: 18, borderRadius: "50%",
                    background: p.place === 1 ? "rgba(232,160,96,0.25)" : "rgba(154,122,204,0.2)",
                    color: p.place === 1 ? "#e8a060" : "#9a7acc",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 9, fontWeight: 800, flexShrink: 0,
                  }}>{p.place}</span>
                )}
                {!p.place && <span style={{ width: 18, fontSize: 12, textAlign: "center" }}>—</span>}
                <span style={{ fontSize: 11, fontWeight: 600, color: p.color, flex: 1 }}>
                  {p.name}{p.isYou && " (you)"}
                </span>
                <span style={{ fontSize: 9, color: "rgba(255,255,255,0.5)", fontFamily: "monospace" }}>
                  {p.time}
                </span>
                <span style={{ fontSize: 11, fontWeight: 800, color: p.pts > 0 ? "#27ae60" : "rgba(255,255,255,0.3)", minWidth: 32, textAlign: "right" }}>
                  {p.pts > 0 ? `+${p.pts}` : "—"}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Source / explanation */}
        <div style={{
          padding: "10px 14px", borderRadius: 10,
          background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)",
        }}>
          <p style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", margin: 0 }}>
            From the chorus of "Pink Venom" — BLACKPINK's pre-release single from BORN PINK (2022).
          </p>
        </div>
      </div>

      {/* Next round timer */}
      <div style={{
        padding: "8px 14px", borderRadius: 10,
        background: "rgba(212,83,126,0.15)", border: "1px solid rgba(212,83,126,0.3)",
        display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
      }}>
        <div style={{ display: "flex", gap: 3 }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              width: 5, height: 5, borderRadius: "50%",
              background: "#fff",
              animation: `dotPulse 1.4s ${i * 0.2}s infinite`,
            }} />
          ))}
        </div>
        <span style={{ fontSize: 11, fontWeight: 600, color: "#fff" }}>
          Next round in 3...
        </span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════
// 8 — MID-GAME LEADERBOARD
// ═══════════════════════════════════════
function ScreenLeaderboard() {
  return (
    <div style={{
      minHeight: 600, background: PALETTE.gameBg,
      display: "flex", flexDirection: "column", padding: "16px 14px",
    }}>
      <div style={{ textAlign: "center", marginBottom: 16, marginTop: 8 }}>
        <p style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.4)", margin: 0, textTransform: "uppercase", letterSpacing: 2 }}>
          Standings · After round 5
        </p>
        <p style={{ fontSize: 22, fontWeight: 800, color: "#fff", margin: 0, marginTop: 4 }}>
          Race to <span style={{ color: "#e8a060" }}>100</span>
        </p>
      </div>

      <div style={{
        flex: 1, padding: "14px", borderRadius: 16,
        background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
        display: "flex", flexDirection: "column", gap: 8,
      }}>
        {SORTED.map((p, idx) => {
          const place = idx + 1;
          const placeColor = place === 1 ? "#e8a060" : place === 2 ? "#c0c0c0" : place === 3 ? "#cd7f32" : null;
          const close = p.score >= 75;
          return (
            <div key={p.id} style={{
              padding: "10px 12px", borderRadius: 12,
              background: p.isYou ? "rgba(154,122,204,0.1)" : "rgba(255,255,255,0.03)",
              border: `1px solid ${p.isYou ? "rgba(154,122,204,0.3)" : place === 1 ? "rgba(232,160,96,0.3)" : "rgba(255,255,255,0.06)"}`,
              animation: `fadeUpFast 0.4s ${idx * 0.1}s both`,
              position: "relative",
              overflow: "hidden",
            }}>
              {/* Win imminent indicator */}
              {close && place === 1 && (
                <div style={{
                  position: "absolute", top: 0, right: 0,
                  padding: "2px 8px", borderRadius: "0 12px 0 8px",
                  background: "rgba(232,160,96,0.3)", color: "#e8a060",
                  fontSize: 7, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1,
                  animation: "winnerPulse 1.5s infinite",
                }}>About to win!</div>
              )}

              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                {/* Place */}
                <div style={{
                  width: 28, height: 28, borderRadius: "50%",
                  background: placeColor ? `${placeColor}30` : "rgba(255,255,255,0.05)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 13, fontWeight: 800, color: placeColor || "rgba(255,255,255,0.6)",
                  flexShrink: 0, border: placeColor ? `1.5px solid ${placeColor}` : "none",
                }}>
                  {place === 1 ? "🥇" : place === 2 ? "🥈" : place === 3 ? "🥉" : place}
                </div>

                {/* Avatar */}
                <div style={{
                  width: 32, height: 32, borderRadius: "50%",
                  background: p.color,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 13, fontWeight: 800, color: "#fff", flexShrink: 0,
                }}>{p.short}</div>

                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: "#fff", margin: 0 }}>
                    {p.name}{p.isYou && <span style={{ fontSize: 9, color: "rgba(255,255,255,0.4)" }}> (you)</span>}
                    {p.isHost && <span style={{ marginLeft: 4 }}>👑</span>}
                  </p>
                  <p style={{ fontSize: 8, color: "rgba(255,255,255,0.4)", margin: 0 }}>
                    {p.score >= 90 ? "1 round to win" : `${Math.ceil((100 - p.score) / 8)} rounds to win`}
                  </p>
                </div>

                <div style={{ textAlign: "right" }}>
                  <p style={{ fontSize: 22, fontWeight: 800, color: "#fff", margin: 0, lineHeight: 1 }}>
                    {p.score}
                  </p>
                  <p style={{ fontSize: 8, color: "rgba(255,255,255,0.4)", margin: 0 }}>/ 100</p>
                </div>
              </div>

              {/* Progress bar */}
              <div style={{ height: 6, borderRadius: 3, background: "rgba(255,255,255,0.05)", overflow: "hidden" }}>
                <div style={{
                  height: "100%", width: `${p.score}%`,
                  background: place === 1
                    ? "linear-gradient(90deg, #e8a060, #f0c080)"
                    : `linear-gradient(90deg, ${p.color}, ${p.color}aa)`,
                  borderRadius: 3,
                  transition: "width 0.5s ease-out",
                  boxShadow: place === 1 ? "0 0 12px rgba(232,160,96,0.5)" : "none",
                }} />
              </div>
            </div>
          );
        })}
      </div>

      <div style={{
        marginTop: 12, padding: "8px 14px", borderRadius: 10,
        background: "rgba(212,83,126,0.15)", border: "1px solid rgba(212,83,126,0.3)",
        display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
      }}>
        <div style={{ display: "flex", gap: 3 }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{ width: 5, height: 5, borderRadius: "50%", background: "#fff", animation: `dotPulse 1.4s ${i * 0.2}s infinite` }} />
          ))}
        </div>
        <span style={{ fontSize: 11, fontWeight: 600, color: "#fff" }}>Round 6 starting...</span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════
// 9 — HOST MENU OPEN
// ═══════════════════════════════════════
function ScreenHostMenu() {
  return (
    <div style={{
      minHeight: 600, background: PALETTE.gameBg,
      display: "flex", flexDirection: "column", padding: "16px 14px",
      position: "relative",
    }}>
      <GameTopBar />
      <ScoreBar />

      {/* Dim overlay behind menu */}
      <div style={{
        position: "absolute", inset: 0,
        background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)",
        zIndex: 10,
      }} />

      {/* Slide-in menu from top-left */}
      <div style={{
        position: "absolute", top: 60, left: 14, right: 14, zIndex: 20,
        padding: "14px", borderRadius: 16,
        background: "rgba(20,10,30,0.95)", backdropFilter: "blur(16px)",
        border: "1px solid rgba(255,255,255,0.1)",
        boxShadow: "0 16px 40px rgba(0,0,0,0.5)",
        animation: "menuSlide 0.25s ease-out",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "#fff", margin: 0 }}>
            Host controls
          </p>
          <span style={{
            fontSize: 8, fontWeight: 700, padding: "2px 7px", borderRadius: 4,
            background: "rgba(232,160,96,0.15)", color: "#e8a060", textTransform: "uppercase", letterSpacing: 1,
          }}>👑 Host only</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {[
            { icon: "⏸", label: "Pause game", desc: "Freeze the timer", color: "#e8a060" },
            { icon: "⏭", label: "Skip this question", desc: "Move to next round", color: "#9a7acc" },
            { icon: "🚪", label: "End game early", desc: "Show final scores now", color: "#e74c3c", danger: true },
          ].map(a => (
            <button key={a.label} style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "10px 12px", borderRadius: 10,
              background: a.danger ? "rgba(231,76,60,0.08)" : "rgba(255,255,255,0.04)",
              border: `1px solid ${a.danger ? "rgba(231,76,60,0.2)" : "rgba(255,255,255,0.08)"}`,
              cursor: "pointer", textAlign: "left",
            }}>
              <span style={{ fontSize: 16 }}>{a.icon}</span>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: a.color, margin: 0 }}>{a.label}</p>
                <p style={{ fontSize: 8, color: "rgba(255,255,255,0.4)", margin: 0 }}>{a.desc}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Kick player section */}
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <p style={{ fontSize: 8, fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: 1, margin: 0, marginBottom: 6 }}>
            Manage players
          </p>
          {PLAYERS.filter(p => !p.isHost).map(p => (
            <div key={p.id} style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "6px 4px",
            }}>
              <div style={{
                width: 22, height: 22, borderRadius: "50%",
                background: p.color,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 10, fontWeight: 800, color: "#fff", flexShrink: 0,
              }}>{p.short}</div>
              <span style={{ fontSize: 10, fontWeight: 600, color: "#fff", flex: 1 }}>
                {p.name}{p.isYou && " (you)"}
              </span>
              {!p.isYou && (
                <button style={{
                  padding: "3px 9px", borderRadius: 6,
                  background: "transparent", border: "1px solid rgba(231,76,60,0.3)",
                  color: "#e74c3c", fontSize: 9, fontWeight: 600, cursor: "pointer",
                }}>Kick</button>
              )}
            </div>
          ))}
        </div>

        <button style={{
          width: "100%", marginTop: 10, padding: "8px 0", borderRadius: 8,
          background: "transparent", border: "1px solid rgba(255,255,255,0.1)",
          color: "rgba(255,255,255,0.5)", fontSize: 10, fontWeight: 500, cursor: "pointer",
        }}>Close</button>
      </div>

      {/* Background gameplay still visible (dimmed) */}
      <div style={{ flex: 1, opacity: 0.3, padding: "16px 0" }}>
        <div style={{
          padding: "20px 18px", borderRadius: 14,
          background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
          textAlign: "center",
        }}>
          <p style={{ fontSize: 17, fontWeight: 600, color: "#fff", margin: 0, fontStyle: "italic" }}>
            Stop, look, listen baby...
          </p>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════
// 10 — PAUSE STATE
// ═══════════════════════════════════════
function ScreenPause() {
  return (
    <div style={{
      minHeight: 600, background: PALETTE.gameBg,
      display: "flex", flexDirection: "column", padding: "16px 14px",
      position: "relative", overflow: "hidden",
    }}>
      {/* Dim everything */}
      <div style={{
        position: "absolute", inset: 0,
        background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)",
        zIndex: 5,
      }} />

      <div style={{ position: "relative", zIndex: 10 }}>
        <ScoreBar />
      </div>

      <div style={{
        flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        position: "relative", zIndex: 10,
      }}>
        {/* Pause icon */}
        <div style={{
          width: 80, height: 80, borderRadius: "50%",
          background: "rgba(232,160,96,0.15)", border: "2px solid rgba(232,160,96,0.4)",
          display: "flex", alignItems: "center", justifyContent: "center",
          marginBottom: 20,
          animation: "pausePulse 2s infinite",
        }}>
          <div style={{ display: "flex", gap: 6 }}>
            <div style={{ width: 8, height: 32, background: "#e8a060", borderRadius: 2 }} />
            <div style={{ width: 8, height: 32, background: "#e8a060", borderRadius: 2 }} />
          </div>
        </div>

        <p style={{ fontSize: 22, fontWeight: 800, color: "#fff", margin: 0 }}>Game paused</p>
        <p style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", margin: 0, marginTop: 6 }}>
          Paused by <span style={{ fontWeight: 700, color: "#D4537E" }}>Mina</span> 👑
        </p>

        {/* Frozen timer indicator */}
        <div style={{
          marginTop: 24, padding: "8px 16px", borderRadius: 10,
          background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>⏱</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.7)", fontFamily: "monospace" }}>
            8.4s frozen
          </span>
        </div>

        {/* Resume button (host only) */}
        <button style={{
          marginTop: 24, padding: "12px 28px", borderRadius: 12,
          background: PALETTE.pink, color: "#fff", border: "none",
          fontSize: 13, fontWeight: 700, cursor: "pointer",
          boxShadow: "0 4px 16px rgba(212,83,126,0.4)",
          display: "flex", alignItems: "center", gap: 6,
        }}>
          <span>▶</span> Resume game
        </button>
        <p style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", margin: 0, marginTop: 6 }}>
          Only the host can resume
        </p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════
// 11 — REPORT QUESTION
// ═══════════════════════════════════════
function ScreenReport() {
  const [reason, setReason] = useState(null);
  const [comment, setComment] = useState("");

  return (
    <div style={{
      minHeight: 600, background: PALETTE.gameBg,
      display: "flex", flexDirection: "column", padding: "16px 14px",
      position: "relative",
    }}>
      <div style={{
        position: "absolute", inset: 0,
        background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)",
        zIndex: 5,
      }} />

      {/* Modal */}
      <div style={{
        position: "absolute", top: "50%", left: 14, right: 14, transform: "translateY(-50%)",
        zIndex: 10,
        padding: "18px 16px", borderRadius: 16,
        background: "rgba(20,10,30,0.97)", backdropFilter: "blur(16px)",
        border: "1px solid rgba(255,255,255,0.1)",
        animation: "menuSlide 0.25s ease-out",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: "#fff", margin: 0 }}>
            Report this question
          </p>
          <span style={{ fontSize: 14, color: "rgba(255,255,255,0.4)", cursor: "pointer" }}>✕</span>
        </div>

        <p style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", margin: 0, marginBottom: 12, lineHeight: 1.5 }}>
          Help us improve the question pool. Reports go to moderation.
        </p>

        <p style={{ fontSize: 8, fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
          Why are you reporting?
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 12 }}>
          {[
            { id: "wrong", icon: "❌", label: "Wrong answer", desc: "The correct answer is incorrect" },
            { id: "hard", icon: "🤯", label: "Too obscure / hard", desc: "Even hardcore fans wouldn't know" },
            { id: "nsfw", icon: "🚫", label: "Inappropriate / NSFW", desc: "Sexual, violent, or harmful content" },
            { id: "spam", icon: "💩", label: "Spam / low quality", desc: "Joke, troll, or filler content" },
            { id: "other", icon: "❓", label: "Other", desc: "Something else" },
          ].map(r => {
            const sel = reason === r.id;
            return (
              <button key={r.id} onClick={() => setReason(r.id)} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "10px 12px", borderRadius: 10,
                background: sel ? "rgba(212,83,126,0.15)" : "rgba(255,255,255,0.03)",
                border: `1px solid ${sel ? "rgba(212,83,126,0.4)" : "rgba(255,255,255,0.06)"}`,
                cursor: "pointer", textAlign: "left",
              }}>
                <span style={{ fontSize: 16 }}>{r.icon}</span>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: sel ? "#fff" : "rgba(255,255,255,0.85)", margin: 0 }}>
                    {r.label}
                  </p>
                  <p style={{ fontSize: 8, color: "rgba(255,255,255,0.4)", margin: 0 }}>
                    {r.desc}
                  </p>
                </div>
                {sel && (
                  <div style={{
                    width: 16, height: 16, borderRadius: "50%",
                    background: PALETTE.pink,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round">
                      <path d="M1.5 4l1.5 1.5L6.5 2" />
                    </svg>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {reason && (
          <div style={{ marginBottom: 12, animation: "fadeUpFast 0.3s" }}>
            <p style={{ fontSize: 8, fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>
              Optional comment
            </p>
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value.slice(0, 200))}
              placeholder="Anything else helpful for moderators?"
              style={{
                width: "100%", padding: "8px 10px", borderRadius: 8,
                background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)",
                color: "#fff", fontSize: 10, outline: "none", boxSizing: "border-box",
                minHeight: 50, resize: "none", fontFamily: "inherit",
              }}
            />
            <p style={{ fontSize: 7, color: "rgba(255,255,255,0.3)", margin: 0, marginTop: 2, textAlign: "right" }}>
              {comment.length}/200
            </p>
          </div>
        )}

        <div style={{ display: "flex", gap: 6 }}>
          <button style={{
            flex: 1, padding: "10px 0", borderRadius: 10,
            background: "transparent", border: "1px solid rgba(255,255,255,0.1)",
            color: "rgba(255,255,255,0.5)", fontSize: 11, fontWeight: 500, cursor: "pointer",
          }}>Cancel</button>
          <button
            disabled={!reason}
            style={{
              flex: 1, padding: "10px 0", borderRadius: 10,
              background: reason ? PALETTE.pink : "rgba(255,255,255,0.06)",
              color: reason ? "#fff" : "rgba(255,255,255,0.3)",
              border: "none", fontSize: 11, fontWeight: 700,
              cursor: reason ? "pointer" : "default",
            }}
          >Submit report</button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════
// MAIN
// ═══════════════════════════════════════
export default function RoomsPrototype2() {
  const [screen, setScreen] = useState("countdown");

  const Active = {
    countdown: ScreenCountdown,
    lyric: ScreenLyric,
    photo: ScreenPhoto,
    correct: ScreenCorrect,
    wrong: ScreenWrong,
    toast: ScreenToast,
    reveal: ScreenReveal,
    leaderboard: ScreenLeaderboard,
    "host-menu": ScreenHostMenu,
    pause: ScreenPause,
    report: ScreenReport,
  }[screen];

  return (
    <div style={{
      minHeight: "100vh", background: "#0a0510",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    }}>
      <div style={{
        position: "sticky", top: 0, zIndex: 50,
        padding: "10px 12px",
        background: "rgba(10,5,16,0.95)", backdropFilter: "blur(8px)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: "#fff", margin: 0, marginBottom: 6, textAlign: "center" }}>
          Rooms — Prototype 2 · Active gameplay
        </p>
        <div style={{ display: "flex", gap: 4, overflowX: "auto", scrollbarWidth: "none" }}>
          {SCREENS.map(s => (
            <button key={s.id} onClick={() => setScreen(s.id)} style={{
              padding: "5px 10px", borderRadius: 8, whiteSpace: "nowrap",
              background: screen === s.id ? PALETTE.pink : "rgba(255,255,255,0.05)",
              color: screen === s.id ? "#fff" : "rgba(255,255,255,0.6)",
              border: `1px solid ${screen === s.id ? PALETTE.pink : "rgba(255,255,255,0.08)"}`,
              fontSize: 9, fontWeight: screen === s.id ? 600 : 500, cursor: "pointer",
            }}>{s.label}</button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 420, margin: "0 auto" }}>
        {Active && <Active />}
      </div>

      <style>{`
        @keyframes twinkleSlow {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
        @keyframes countPulse {
          0%, 100% { transform: scale(1); opacity: 0.5; }
          50% { transform: scale(1.1); opacity: 0.8; }
        }
        @keyframes countRing {
          0% { transform: scale(0.9); opacity: 0.8; }
          100% { transform: scale(1.2); opacity: 0; }
        }
        @keyframes countNum {
          0% { transform: scale(0.6); opacity: 0; }
          50% { transform: scale(1.1); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes correctPop {
          0% { transform: scale(0.4) rotate(-10deg); opacity: 0; }
          60% { transform: scale(1.15) rotate(5deg); opacity: 1; }
          100% { transform: scale(1) rotate(0); opacity: 1; }
        }
        @keyframes correctFlash {
          0% { opacity: 0; }
          30% { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes wrongFlash {
          0% { opacity: 0; }
          30% { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes shakeIt {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          50% { transform: translateX(3px); }
          75% { transform: translateX(-2px); }
        }
        @keyframes popIn {
          0% { transform: scale(0.7); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes fadeUpFast {
          0% { transform: translateY(8px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        @keyframes dotPulse {
          0%, 60%, 100% { transform: scale(1); opacity: 0.7; }
          30% { transform: scale(1.3); opacity: 1; }
        }
        @keyframes toastSlide {
          0% { transform: translate(-50%, -16px); opacity: 0; }
          100% { transform: translate(-50%, 0); opacity: 1; }
        }
        @keyframes menuSlide {
          0% { transform: translateY(-12px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        @keyframes pausePulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.05); opacity: 0.85; }
        }
        @keyframes winnerPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
