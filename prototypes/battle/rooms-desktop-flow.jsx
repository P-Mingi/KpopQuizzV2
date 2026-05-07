import { useState } from "react";

// ═══════════════════════════════════════
// SHARED PALETTE & DATA
// ═══════════════════════════════════════
const C = {
  bg: "#FAF9F6",
  bar: "#fff",
  barBorder: "#e8e6e0",
  card: "#fff",
  cardHover: "#FAF2F5",
  cardBorder: "#e8e6e0",
  pink: "#D4537E",
  pinkHover: "#C44A72",
  pinkLight: "rgba(212,83,126,0.08)",
  pinkBorder: "rgba(212,83,126,0.15)",
  textDark: "#2c2c2a",
  textMuted: "#888780",
  textLight: "#b4b2a9",
  amber: "#e8a060",
  green: "#27ae60",
  red: "#e74c3c",
  purple: "#9a7acc",
  borderLight: "#f0ede8",
  chatBg: "#F5EFF1",
  chatBorder: "#EADBE0",
};

const SCREENS = [
  { id: "hub",          label: "1 · Hub" },
  { id: "join",         label: "2 · Join" },
  { id: "guest",        label: "3 · Guest setup" },
  { id: "host-lobby",   label: "4 · Host Lobby" },
  { id: "player-lobby", label: "5 · Player Lobby" },
];

const PLAYERS = [
  { name: "Mina",         score: 0, initial: "M", color: "#D4537E", isHost: true,  isYou: false },
  { name: "felixstan",    score: 0, initial: "F", color: "#e8a060" },
  { name: "you",          score: 0, initial: "Y", color: "#9a7acc", isYou: true },
  { name: "BlinkForever", score: 0, initial: "B", color: "#4a90d0", isGuest: true },
];

// ═══════════════════════════════════════
// SITE NAVBAR (for hub, join, guest pages)
// ═══════════════════════════════════════
function SiteNavbar() {
  return (
    <header style={{
      display: "flex", alignItems: "center", padding: "0 24px",
      background: "#fff", height: 60,
      borderBottom: `1px solid ${C.barBorder}`,
      flexShrink: 0,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontSize: 18, fontWeight: 800, color: C.textDark, letterSpacing: -0.4 }}>
          kpop<span style={{ color: C.pink }}>quiz</span>
        </span>
      </div>

      <nav style={{ display: "flex", alignItems: "center", gap: 4, marginLeft: 32 }}>
        {[
          { label: "Quizzes", href: "/quizzes" },
          { label: "Blindtest", href: "/blindtest" },
          { label: "Games", href: "/games" },
          { label: "Battle", href: "/battle", active: true, isNew: true },
          { label: "Cards", href: "/cards" },
        ].map(item => (
          <a key={item.label} style={{
            padding: "6px 12px", borderRadius: 8,
            background: item.active ? C.pinkLight : "transparent",
            color: item.active ? C.pink : C.textMuted,
            fontSize: 13, fontWeight: item.active ? 600 : 500, cursor: "pointer",
            position: "relative", textDecoration: "none",
            display: "flex", alignItems: "center", gap: 5,
          }}>
            {item.label}
            {item.isNew && (
              <span style={{
                fontSize: 7, fontWeight: 800, padding: "1px 5px", borderRadius: 4,
                background: C.pink, color: "#fff", textTransform: "uppercase", letterSpacing: 0.5,
              }}>NEW</span>
            )}
          </a>
        ))}
      </nav>

      <div style={{ flex: 1 }} />

      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          padding: "5px 10px", borderRadius: 8,
          background: "rgba(232,160,96,0.08)", border: `1px solid rgba(232,160,96,0.2)`,
          display: "flex", alignItems: "center", gap: 5,
        }}>
          <span style={{ fontSize: 12 }}>⭐</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: C.amber }}>4,287 별</span>
        </div>
        <div style={{
          width: 32, height: 32, borderRadius: "50%",
          background: C.purple, color: "#fff",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 13, fontWeight: 800, cursor: "pointer",
        }}>Y</div>
      </div>
    </header>
  );
}

// ═══════════════════════════════════════
// SCREEN 1: HUB (/battle)
// ═══════════════════════════════════════
function ScreenHub() {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: C.bg }}>
      <SiteNavbar />
      <div style={{ flex: 1, overflowY: "auto", padding: "32px 24px" }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          {/* Hero */}
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <span style={{
              display: "inline-block", padding: "4px 12px", borderRadius: 999,
              background: C.pinkLight, border: `1px solid ${C.pinkBorder}`,
              fontSize: 10, fontWeight: 700, color: C.pink,
              textTransform: "uppercase", letterSpacing: 1, marginBottom: 14,
            }}>⚡ NEW · Real-time multiplayer</span>
            <h1 style={{ fontSize: 38, fontWeight: 800, color: C.textDark, margin: 0, lineHeight: 1.1 }}>
              Play <span style={{
                background: "linear-gradient(135deg, #D4537E, #e8a060)",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              }}>K-pop trivia battles</span> with friends
            </h1>
            <p style={{ fontSize: 14, color: C.textMuted, maxWidth: 540, margin: "12px auto 0", lineHeight: 1.5 }}>
              Real-time rooms · 2-8 players · K-pop questions only · First to 100 points wins. Free to play, anyone can join with a code.
            </p>
          </div>

          {/* Two CTA cards side by side */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 32 }}>
            {/* Create */}
            <div style={{
              padding: "32px 28px", borderRadius: 18,
              background: "linear-gradient(135deg, #1a0a1e 0%, #3a1848 50%, #D4537E 100%)",
              cursor: "pointer", position: "relative", overflow: "hidden",
              minHeight: 220,
            }}>
              <div style={{
                position: "absolute", top: -30, right: -30, width: 180, height: 180,
                borderRadius: "50%", background: "rgba(255,255,255,0.06)",
              }} />
              <div style={{
                position: "absolute", bottom: -50, right: 50, width: 120, height: 120,
                borderRadius: "50%", background: "rgba(212,83,126,0.3)", filter: "blur(40px)",
              }} />
              <div style={{ position: "relative", zIndex: 2 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 22 }}>⚡</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: 2 }}>
                    Host a room
                  </span>
                </div>
                <p style={{ fontSize: 28, fontWeight: 800, color: "#fff", margin: 0, lineHeight: 1.1 }}>Create room</p>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", margin: 0, marginTop: 8, lineHeight: 1.5 }}>
                  Get a 4-digit code, invite up to 8 friends, set the rules. Hosting requires an account.
                </p>
                <div style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  marginTop: 22, padding: "10px 22px", borderRadius: 10,
                  background: "#fff", color: C.pink,
                  fontSize: 13, fontWeight: 700,
                }}>Create room →</div>
              </div>
            </div>

            {/* Join */}
            <div style={{
              padding: "32px 28px", borderRadius: 18,
              background: "#fff", border: `1.5px solid ${C.pinkBorder}`,
              cursor: "pointer", minHeight: 220, position: "relative",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 22 }}>🎟</span>
                <span style={{ fontSize: 10, fontWeight: 700, color: C.textLight, textTransform: "uppercase", letterSpacing: 2 }}>
                  Have a code?
                </span>
              </div>
              <p style={{ fontSize: 28, fontWeight: 800, color: C.textDark, margin: 0, lineHeight: 1.1 }}>Join with code</p>
              <p style={{ fontSize: 13, color: C.textMuted, margin: 0, marginTop: 8, lineHeight: 1.5 }}>
                Enter the 4-digit code your friend gave you. Guests can join — no account needed.
              </p>
              <div style={{ display: "flex", gap: 6, marginTop: 22 }}>
                {["", "", "", ""].map((_, i) => (
                  <div key={i} style={{
                    width: 38, height: 44, borderRadius: 8,
                    border: `1.5px solid ${C.cardBorder}`, background: C.bg,
                  }} />
                ))}
                <div style={{
                  display: "inline-flex", alignItems: "center",
                  padding: "0 16px", borderRadius: 8,
                  background: C.pink, color: "#fff",
                  fontSize: 13, fontWeight: 700, cursor: "pointer",
                }}>Join →</div>
              </div>
            </div>
          </div>

          {/* How it works */}
          <div style={{
            padding: "24px 28px", borderRadius: 16,
            background: C.pinkLight, border: `1px solid ${C.pinkBorder}`,
            marginBottom: 28,
          }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: C.pink, margin: 0, textTransform: "uppercase", letterSpacing: 1, marginBottom: 14 }}>
              How it works
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12 }}>
              {[
                { num: "1", title: "Create or join", desc: "Host gets a 4-digit code · Players use the code to join" },
                { num: "2", title: "Set the rules", desc: "Difficulty · Groups · Time per round · Korean mode" },
                { num: "3", title: "Answer fast", desc: "Free-text input · Faster = more points · Up to 10 pts/round" },
                { num: "4", title: "Race to 100", desc: "First player to 100 total points wins the game" },
              ].map(s => (
                <div key={s.num}>
                  <div style={{
                    width: 28, height: 28, borderRadius: "50%",
                    background: C.pink, color: "#fff",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 13, fontWeight: 800, marginBottom: 8,
                  }}>{s.num}</div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: C.textDark, margin: 0, marginBottom: 4 }}>{s.title}</p>
                  <p style={{ fontSize: 11, color: C.textMuted, margin: 0, lineHeight: 1.4 }}>{s.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Recent rooms */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: C.textDark, margin: 0 }}>
                Your recent rooms
              </p>
              <a style={{ fontSize: 11, color: C.pink, fontWeight: 600, cursor: "pointer", textDecoration: "none" }}>
                View all →
              </a>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
              {[
                { code: "7392", host: "Mina",      lastPlayed: "3h ago",   players: 4 },
                { code: "1456", host: "skzfanboy", lastPlayed: "yesterday", players: 6 },
                { code: "8821", host: "rosie_bear", lastPlayed: "3d ago",   players: 3 },
              ].map(r => (
                <div key={r.code} style={{
                  padding: "12px 14px", borderRadius: 12,
                  background: "#fff", border: `1px solid ${C.cardBorder}`,
                  cursor: "pointer", display: "flex", alignItems: "center", gap: 10,
                }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: 8,
                    background: C.pink, color: "#fff",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 13, fontWeight: 800, fontFamily: "monospace", flexShrink: 0,
                  }}>{r.code}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: C.textDark, margin: 0 }}>by {r.host}</p>
                    <p style={{ fontSize: 9, color: C.textLight, margin: 0 }}>{r.lastPlayed} · {r.players} played</p>
                  </div>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke={C.textLight} strokeWidth="1.5" strokeLinecap="round">
                    <path d="M5 3l4 4-4 4" />
                  </svg>
                </div>
              ))}
            </div>
          </div>

          {/* Question creation CTA */}
          <div style={{
            padding: "16px 20px", borderRadius: 14,
            background: "linear-gradient(135deg, rgba(154,122,204,0.08), rgba(212,83,126,0.04))",
            border: `1px solid rgba(154,122,204,0.2)`,
            display: "flex", alignItems: "center", gap: 14,
          }}>
            <div style={{
              width: 48, height: 48, borderRadius: 10,
              background: C.purple, color: "#fff",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 22, flexShrink: 0,
            }}>✍️</div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: C.textDark, margin: 0 }}>
                Create your own questions
              </p>
              <p style={{ fontSize: 11, color: C.textMuted, margin: 0, marginTop: 2 }}>
                Submit lyric battles, cropped photos, or MV frames. Approved questions appear in everyone's games.
              </p>
            </div>
            <button style={{
              padding: "8px 16px", borderRadius: 10,
              background: "#fff", border: `1px solid rgba(154,122,204,0.3)`,
              color: C.purple, fontSize: 12, fontWeight: 600, cursor: "pointer",
            }}>Submit a question →</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════
// SCREEN 2: JOIN (/battle/join)
// ═══════════════════════════════════════
function ScreenJoin() {
  const [code, setCode] = useState(["", "", "", ""]);
  const updateDigit = (i, val) => {
    if (val.length > 1) val = val.slice(-1);
    if (!/^\d?$/.test(val)) return;
    const next = [...code];
    next[i] = val;
    setCode(next);
  };
  const isComplete = code.every(c => c !== "");

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: C.bg }}>
      <SiteNavbar />
      <div style={{ flex: 1, overflowY: "auto", padding: "40px 24px" }}>
        <div style={{ maxWidth: 760, margin: "0 auto" }}>
          {/* Back link */}
          <a style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            fontSize: 12, color: C.textMuted, cursor: "pointer", textDecoration: "none",
            marginBottom: 24,
          }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M9 3L4.5 7 9 11" />
            </svg>
            Back to Battle hub
          </a>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 32 }}>
            {/* Left: code input */}
            <div style={{
              padding: "40px 32px", borderRadius: 18,
              background: "#fff", border: `1px solid ${C.cardBorder}`,
              boxShadow: "0 2px 24px rgba(0,0,0,0.04)",
            }}>
              <p style={{ fontSize: 22, fontWeight: 800, color: C.textDark, margin: 0 }}>
                Enter room code
              </p>
              <p style={{ fontSize: 12, color: C.textMuted, margin: 0, marginTop: 6, marginBottom: 28 }}>
                The host shared a 4-digit code with you. Type it below to join.
              </p>

              <div style={{ display: "flex", gap: 12, marginBottom: 28 }}>
                {code.map((digit, i) => (
                  <input
                    key={i}
                    value={digit}
                    onChange={e => updateDigit(i, e.target.value)}
                    type="text" inputMode="numeric" maxLength={1}
                    style={{
                      width: 80, height: 96, borderRadius: 14,
                      background: digit ? C.pinkLight : C.bg,
                      border: `2px solid ${digit ? C.pinkBorder : C.cardBorder}`,
                      fontSize: 40, fontWeight: 800, textAlign: "center",
                      color: C.textDark, outline: "none", transition: "all 0.15s",
                    }}
                  />
                ))}
              </div>

              <button disabled={!isComplete} style={{
                width: "100%", padding: "14px 0", borderRadius: 12,
                background: isComplete ? C.pink : C.borderLight,
                color: isComplete ? "#fff" : C.textLight,
                border: "none", fontSize: 14, fontWeight: 700,
                cursor: isComplete ? "pointer" : "default",
                boxShadow: isComplete ? "0 6px 18px rgba(212,83,126,0.3)" : "none",
              }}>Join room</button>

              <p style={{ fontSize: 11, color: C.textLight, textAlign: "center", margin: "12px 0 0" }}>
                Don't have a code?{" "}
                <span style={{ color: C.pink, fontWeight: 600, cursor: "pointer" }}>Create one →</span>
              </p>
            </div>

            {/* Right: recent rooms */}
            <div>
              <p style={{ fontSize: 10, fontWeight: 700, color: C.textLight, textTransform: "uppercase", letterSpacing: 1, margin: 0, marginBottom: 10 }}>
                Recent rooms
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {[
                  { code: "7392", host: "Mina",      lastPlayed: "3h ago" },
                  { code: "1456", host: "skzfanboy", lastPlayed: "yesterday" },
                  { code: "8821", host: "rosie_bear", lastPlayed: "3d ago" },
                ].map(r => (
                  <div key={r.code} style={{
                    padding: "10px 12px", borderRadius: 10,
                    background: "#fff", border: `1px solid ${C.cardBorder}`,
                    cursor: "pointer", display: "flex", alignItems: "center", gap: 10,
                  }}>
                    <span style={{
                      fontSize: 14, fontWeight: 800, color: C.pink, fontFamily: "monospace", letterSpacing: 2,
                    }}>{r.code}</span>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 11, color: C.textDark, margin: 0, fontWeight: 600 }}>by {r.host}</p>
                      <p style={{ fontSize: 9, color: C.textLight, margin: 0 }}>{r.lastPlayed}</p>
                    </div>
                  </div>
                ))}
              </div>

              <p style={{ fontSize: 10, fontWeight: 700, color: C.textLight, textTransform: "uppercase", letterSpacing: 1, margin: "20px 0 8px" }}>
                Tip
              </p>
              <div style={{
                padding: "10px 12px", borderRadius: 10,
                background: C.pinkLight, border: `1px solid ${C.pinkBorder}`,
              }}>
                <p style={{ fontSize: 10, color: C.textDark, margin: 0, lineHeight: 1.5 }}>
                  💡 Codes are auto-typed when pasted. Try copying a code and clicking the first input.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════
// SCREEN 3: GUEST SETUP (/battle/r/[code]/guest)
// ═══════════════════════════════════════
function ScreenGuest() {
  const [name, setName] = useState("BlinkForever");
  const colors = ["#D4537E", "#9a7acc", "#e8a060", "#4a90d0", "#27ae60", "#e74c3c"];
  const [colorIdx, setColorIdx] = useState(0);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: C.bg }}>
      <SiteNavbar />
      <div style={{ flex: 1, overflowY: "auto", padding: "40px 24px" }}>
        <div style={{ maxWidth: 480, margin: "0 auto" }}>
          {/* Back */}
          <a style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            fontSize: 12, color: C.textMuted, cursor: "pointer", textDecoration: "none",
            marginBottom: 24,
          }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M9 3L4.5 7 9 11" />
            </svg>
            Back
          </a>

          <div style={{
            padding: "32px 28px", borderRadius: 18,
            background: "#fff", border: `1px solid ${C.cardBorder}`,
            boxShadow: "0 2px 24px rgba(0,0,0,0.04)",
          }}>
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <p style={{ fontSize: 11, color: C.textMuted, margin: 0, marginBottom: 4 }}>
                Joining room
              </p>
              <p style={{ fontSize: 26, fontWeight: 800, color: C.pink, margin: 0, fontFamily: "monospace", letterSpacing: 4 }}>
                7392
              </p>
            </div>

            {/* Avatar preview */}
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
              <div style={{ position: "relative" }}>
                <div style={{
                  width: 100, height: 100, borderRadius: "50%",
                  background: colors[colorIdx],
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 42, fontWeight: 800, color: "#fff",
                  boxShadow: `0 8px 28px ${colors[colorIdx]}40`,
                  transition: "all 0.2s",
                }}>
                  {(name[0] || "?").toUpperCase()}
                </div>
              </div>
            </div>

            {/* Color picker */}
            <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 24 }}>
              {colors.map((c, i) => (
                <div key={c} onClick={() => setColorIdx(i)} style={{
                  width: 28, height: 28, borderRadius: "50%", background: c,
                  border: `2.5px solid ${i === colorIdx ? "#2c2c2a" : "transparent"}`,
                  cursor: "pointer",
                  transform: i === colorIdx ? "scale(1.1)" : "scale(1)",
                  transition: "all 0.15s",
                }} />
              ))}
            </div>

            <div style={{ marginBottom: 18 }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: C.textLight, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
                Username
              </p>
              <input
                value={name}
                onChange={e => setName(e.target.value.slice(0, 20))}
                placeholder="Pick a name..."
                style={{
                  width: "100%", padding: "12px 14px", borderRadius: 12,
                  background: C.bg, border: `1.5px solid ${C.cardBorder}`,
                  fontSize: 15, fontWeight: 600, color: C.textDark,
                  outline: "none", boxSizing: "border-box",
                }}
              />
              <p style={{ fontSize: 9, color: C.textLight, margin: 0, marginTop: 4 }}>
                {name.length}/20 · Visible to other players · Saved on your device
              </p>
            </div>

            <div style={{
              padding: "10px 12px", borderRadius: 10,
              background: C.pinkLight, border: `1px solid ${C.pinkBorder}`,
              marginBottom: 16,
            }}>
              <p style={{ fontSize: 10, color: C.textDark, margin: 0, lineHeight: 1.5 }}>
                💡 <strong>Sign in</strong> to track wins, earn Byeol, and use your account avatar.{" "}
                <span style={{ color: C.pink, fontWeight: 600, cursor: "pointer" }}>Sign in →</span>
              </p>
            </div>

            <button disabled={name.length < 2} style={{
              width: "100%", padding: "14px 0", borderRadius: 12,
              background: name.length >= 2 ? C.pink : C.borderLight,
              color: name.length >= 2 ? "#fff" : C.textLight,
              border: "none", fontSize: 14, fontWeight: 700,
              cursor: name.length >= 2 ? "pointer" : "default",
              boxShadow: name.length >= 2 ? "0 6px 18px rgba(212,83,126,0.3)" : "none",
            }}>Join as {name || "guest"} →</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════
// SHARED ROOM TOP BAR
// ═══════════════════════════════════════
function RoomTopBar() {
  return (
    <header style={{
      display: "flex", alignItems: "center", padding: "0 20px",
      background: C.bar, height: 56,
      borderBottom: `1px solid ${C.barBorder}`, flexShrink: 0,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: C.textDark, letterSpacing: -0.3 }}>
          <span style={{ fontWeight: 800 }}>kpop</span><span style={{ color: C.pink }}>quiz</span>
        </span>
        <span style={{ fontSize: 11, color: C.textLight }}>·</span>
        <span style={{ fontSize: 11, color: C.textMuted, fontFamily: "monospace" }}>/r/7392</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginLeft: 24 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: C.pink, color: "#fff",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 13, fontWeight: 800, fontFamily: "monospace",
        }}>7392</div>
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: C.textDark, margin: 0, lineHeight: 1.1 }}>
            Mina's room
          </p>
          <p style={{ fontSize: 9, color: C.textMuted, margin: 0 }}>
            <span style={{ display: "inline-block", width: 5, height: 5, borderRadius: "50%", background: C.green, marginRight: 4, verticalAlign: "middle" }}/>
            Lobby · Waiting for players
          </p>
        </div>
      </div>
      <div style={{ flex: 1 }} />
      <button style={{
        padding: "5px 12px", borderRadius: 8,
        background: "transparent", border: `1px solid ${C.cardBorder}`,
        color: C.textMuted, fontSize: 11, fontWeight: 500, cursor: "pointer",
      }}>Leave</button>
    </header>
  );
}

// ═══════════════════════════════════════
// PLAYER CARD (compact for roster)
// ═══════════════════════════════════════
function PlayerCard({ p, canKick }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        borderRadius: 10, display: "flex", overflow: "hidden",
        background: hover ? C.cardHover : C.card,
        border: `1px solid ${p.isYou ? C.pinkBorder : C.cardBorder}`,
        transition: "all 0.15s", position: "relative",
      }}
    >
      <div style={{
        flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        padding: "6px 4px", width: 48,
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: "50%",
          background: p.color,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 13, fontWeight: 800, color: "#fff",
        }}>{p.initial}</div>
      </div>
      <div style={{
        flex: 1, padding: "8px 10px 8px 4px",
        display: "flex", alignItems: "center", justifyContent: "space-between", minWidth: 0, gap: 6,
      }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{
              fontSize: 12, fontWeight: p.isYou ? 700 : 600, color: C.textDark,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>{p.name}</span>
            {p.isHost && (
              <span style={{
                fontSize: 7, fontWeight: 700, padding: "1px 4px", borderRadius: 3,
                background: "rgba(232,160,96,0.12)", color: C.amber,
                textTransform: "uppercase", flexShrink: 0,
              }}>👑 host</span>
            )}
            {p.isYou && (
              <span style={{
                fontSize: 7, fontWeight: 700, padding: "1px 4px", borderRadius: 3,
                background: C.pinkLight, color: C.pink, flexShrink: 0,
              }}>you</span>
            )}
            {p.isGuest && (
              <span style={{
                fontSize: 7, fontWeight: 600, padding: "1px 4px", borderRadius: 3,
                background: C.borderLight, color: C.textLight, flexShrink: 0,
              }}>guest</span>
            )}
          </div>
        </div>
        {canKick && !p.isHost && !p.isYou && (
          <button style={{
            padding: "3px 8px", borderRadius: 5,
            background: "transparent", border: `1px solid ${C.cardBorder}`,
            fontSize: 8, color: C.textLight, cursor: "pointer", flexShrink: 0,
          }}>Kick</button>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════
// CHAT PANEL — SMALLER + CLOSEABLE
// ═══════════════════════════════════════
function ChatPanelClosable({ open, onToggle }) {
  const [tab, setTab] = useState("chat");

  if (!open) {
    // Closed state — thin sidebar
    return (
      <aside style={{
        width: 44, flexShrink: 0,
        background: C.chatBg, borderLeft: `1px solid ${C.chatBorder}`,
        display: "flex", flexDirection: "column", alignItems: "center",
        padding: "12px 0",
      }}>
        <button onClick={onToggle} style={{
          width: 32, height: 32, borderRadius: 8,
          background: "#fff", border: `1px solid ${C.chatBorder}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: C.pink, cursor: "pointer", marginBottom: 8,
          position: "relative",
        }} title="Open chat">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M3 4h10v7H7l-3 3v-3H3V4z" />
          </svg>
          <span style={{
            position: "absolute", top: -3, right: -3,
            width: 14, height: 14, borderRadius: "50%",
            background: C.pink, color: "#fff",
            fontSize: 8, fontWeight: 800,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>3</span>
        </button>
        <span style={{
          fontSize: 8, color: C.textMuted,
          writingMode: "vertical-rl", textOrientation: "mixed",
          marginTop: 4, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1,
        }}>Open chat</span>
      </aside>
    );
  }

  const TABS = [
    { id: "chat",     icon: <ChatIcon />,  hasUnread: true },
    { id: "players",  icon: <UsersIcon /> },
    { id: "rules",    icon: <BookIcon /> },
    { id: "home",     icon: <HomeIcon /> },
    { id: "settings", icon: <GearIcon /> },
  ];

  return (
    <aside style={{
      display: "flex", flexDirection: "column",
      width: 280, flexShrink: 0,
      background: C.chatBg, borderLeft: `1px solid ${C.chatBorder}`,
    }}>
      {/* Tab bar with close button */}
      <div style={{
        display: "flex", alignItems: "center",
        height: 44, background: "#fff",
        borderBottom: `1px solid ${C.chatBorder}`,
        padding: "0 4px",
      }}>
        <div style={{ display: "flex", flex: 1, justifyContent: "space-around" }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} title={t.id} style={{
              width: 32, height: 32, borderRadius: 6,
              background: tab === t.id ? C.pinkLight : "transparent",
              border: "none", cursor: "pointer", position: "relative",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: tab === t.id ? C.pink : C.textMuted,
            }}>
              {t.icon}
              {t.hasUnread && tab !== t.id && (
                <span style={{
                  position: "absolute", top: 4, right: 4,
                  width: 6, height: 6, borderRadius: "50%", background: C.pink,
                }} />
              )}
            </button>
          ))}
        </div>
        <button onClick={onToggle} title="Close chat" style={{
          width: 28, height: 28, borderRadius: 6,
          background: "transparent", border: "none", cursor: "pointer",
          color: C.textMuted, marginLeft: 4,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 16,
        }}>✕</button>
      </div>

      {/* Tab content (just chat for prototype) */}
      <div style={{ flex: 1, overflowY: "auto", padding: "10px 12px", display: "flex", flexDirection: "column", gap: 8, minHeight: 0 }}>
        {tab === "chat" && [
          { user: "Mina",         color: "#D4537E", msg: "anyone else in?",       time: "2m", isHost: true },
          { user: "felixstan",    color: "#e8a060", msg: "joining now",            time: "1m" },
          { user: "BlinkForever", color: "#4a90d0", msg: "lets go",                time: "30s" },
        ].map((m, i) => (
          <div key={i}>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: m.color }}>
                {m.user}{m.isHost && " 👑"}
              </span>
              <span style={{ fontSize: 8, color: C.textLight }}>{m.time}</span>
            </div>
            <span style={{ fontSize: 11, color: C.textDark }}>{m.msg}</span>
          </div>
        ))}
        {tab !== "chat" && (
          <p style={{ fontSize: 10, color: C.textMuted, textAlign: "center", marginTop: 24 }}>
            <em>{tab} tab content (full version in v2 prototype)</em>
          </p>
        )}
      </div>

      {/* Input */}
      {tab === "chat" && (
        <div style={{ padding: 8, borderTop: `1px solid ${C.chatBorder}`, background: "#fff" }}>
          <div style={{ display: "flex", gap: 4 }}>
            <input placeholder="Message..." style={{
              flex: 1, padding: "6px 10px", borderRadius: 8,
              background: C.bg, border: `1px solid ${C.borderLight}`,
              fontSize: 11, outline: "none",
            }} />
            <button style={{
              padding: "6px 10px", borderRadius: 8,
              background: C.pink, color: "#fff", border: "none",
              fontSize: 10, fontWeight: 600, cursor: "pointer",
            }}>Send</button>
          </div>
        </div>
      )}
    </aside>
  );
}

// Icons (compact)
function ChatIcon() { return <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M2.5 3.5h10v6.5H6.5l-2.5 2.5v-2.5H2.5V3.5z"/></svg>; }
function UsersIcon() { return <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="5.5" cy="6" r="2"/><path d="M2 11.5a3.5 3.5 0 017 0"/><circle cx="10" cy="5" r="1.7"/><path d="M9 10a2.8 2.8 0 014 2.5"/></svg>; }
function BookIcon() { return <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M2.5 2.5v10l2.5-1.25L7.5 12.5l2.5-1.25L12.5 12.5v-10L10 3.75 7.5 2.5 5 3.75 2.5 2.5z"/></svg>; }
function HomeIcon() { return <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M2.5 6.5L7.5 2.5l5 4v6h-10v-6z"/><path d="M5.5 12.5v-3.5h4v3.5"/></svg>; }
function GearIcon() { return <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="7.5" cy="7.5" r="2"/><path d="M7.5 1v2.5M7.5 11.5V14M1 7.5h2.5M11.5 7.5H14"/></svg>; }

// ═══════════════════════════════════════
// SCREEN 4: HOST LOBBY (3-col, smaller chat, closeable)
// ═══════════════════════════════════════
function ScreenHostLobby() {
  const [chatOpen, setChatOpen] = useState(true);
  const [difficulty, setDifficulty] = useState("Medium");
  const [groupMode, setGroupMode] = useState("All");
  const [time, setTime] = useState(15);
  const [korean, setKorean] = useState(false);
  const [privacy, setPrivacy] = useState("private");

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: C.bg }}>
      <RoomTopBar />
      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        {/* CENTER: settings + start button */}
        <main style={{ flex: 1, minWidth: 0, padding: "20px 24px", overflowY: "auto" }}>
          <div style={{ maxWidth: 600, margin: "0 auto" }}>
            {/* Big room code card */}
            <div style={{
              padding: "20px 24px", borderRadius: 16, marginBottom: 18,
              background: "linear-gradient(135deg, #1a0a1e, #3a1848 60%, #D4537E)",
              position: "relative", overflow: "hidden",
            }}>
              <div style={{
                position: "absolute", top: -20, right: -20, width: 140, height: 140,
                borderRadius: "50%", background: "rgba(255,255,255,0.06)",
              }} />
              <div style={{ position: "relative", zIndex: 2 }}>
                <p style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.5)", margin: 0, textTransform: "uppercase", letterSpacing: 2 }}>
                  Share this code
                </p>
                <p style={{ fontSize: 56, fontWeight: 800, color: "#fff", margin: 0, marginTop: 2, fontFamily: "monospace", letterSpacing: 12 }}>
                  7392
                </p>
                <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                  <button style={{
                    flex: 1, padding: "8px 12px", borderRadius: 10,
                    background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)",
                    color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer",
                  }}>📋 Copy code</button>
                  <button style={{
                    flex: 1, padding: "8px 12px", borderRadius: 10,
                    background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)",
                    color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer",
                  }}>🔗 Share link</button>
                </div>
              </div>
            </div>

            {/* Settings panel */}
            <div style={{
              padding: "18px 20px", borderRadius: 14, marginBottom: 14,
              background: "#fff", border: `1px solid ${C.cardBorder}`,
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: C.textDark }}>⚙ Game settings</span>
                <span style={{
                  fontSize: 8, fontWeight: 700, padding: "2px 7px", borderRadius: 4,
                  background: "rgba(232,160,96,0.12)", color: C.amber, textTransform: "uppercase", letterSpacing: 1,
                }}>👑 Host only</span>
              </div>

              {/* Difficulty */}
              <SettingRow label="Difficulty">
                <div style={{ display: "flex", gap: 4 }}>
                  {["Easy", "Medium", "Hard", "Insane"].map(d => (
                    <button key={d} onClick={() => setDifficulty(d)} style={{
                      flex: 1, padding: "7px 0", borderRadius: 8,
                      background: difficulty === d ? C.pink : C.bg,
                      color: difficulty === d ? "#fff" : C.textMuted,
                      border: `1px solid ${difficulty === d ? C.pink : C.cardBorder}`,
                      fontSize: 11, fontWeight: difficulty === d ? 600 : 500, cursor: "pointer",
                    }}>{d}</button>
                  ))}
                </div>
              </SettingRow>

              <SettingRow label="Group filter">
                <div style={{ display: "flex", gap: 4 }}>
                  {["All groups", "Specific groups", "By generation"].map(m => (
                    <button key={m} onClick={() => setGroupMode(m)} style={{
                      flex: 1, padding: "7px 0", borderRadius: 8,
                      background: groupMode === m ? C.pinkLight : C.bg,
                      color: groupMode === m ? C.pink : C.textMuted,
                      border: `1px solid ${groupMode === m ? C.pinkBorder : C.cardBorder}`,
                      fontSize: 11, fontWeight: groupMode === m ? 600 : 500, cursor: "pointer",
                    }}>{m}</button>
                  ))}
                </div>
              </SettingRow>

              <SettingRow label="Time per round">
                <div style={{ display: "flex", gap: 4 }}>
                  {[10, 15, 20, 30].map(t => (
                    <button key={t} onClick={() => setTime(t)} style={{
                      flex: 1, padding: "7px 0", borderRadius: 8,
                      background: time === t ? C.pink : C.bg,
                      color: time === t ? "#fff" : C.textMuted,
                      border: `1px solid ${time === t ? C.pink : C.cardBorder}`,
                      fontSize: 11, fontWeight: time === t ? 600 : 500, cursor: "pointer",
                    }}>{t}s</button>
                  ))}
                </div>
              </SettingRow>

              <div style={{ display: "flex", gap: 8 }}>
                <SettingToggle label="🇰🇷 Korean mode" desc="Accept Korean answers" on={korean} onChange={setKorean} />
                <SettingToggle label="🔒 Private room" desc="Only via code" on={privacy === "private"} onChange={(v) => setPrivacy(v ? "private" : "public")} />
              </div>
            </div>

            <p style={{ fontSize: 10, color: C.textLight, textAlign: "center", margin: "0 0 14px" }}>
              First to 100 points wins · Up to 10 pts per round
            </p>

            <button style={{
              width: "100%", padding: "16px 0", borderRadius: 14,
              background: C.pink, color: "#fff", border: "none",
              fontSize: 15, fontWeight: 700, cursor: "pointer",
              boxShadow: "0 6px 20px rgba(212,83,126,0.35)",
            }}>Start game →</button>
          </div>
        </main>

        {/* COL 2: Player roster */}
        <aside style={{
          width: 260, flexShrink: 0,
          display: "flex", flexDirection: "column", gap: 5,
          padding: "16px 12px", overflowY: "auto",
          background: C.bg, borderLeft: `1px solid ${C.cardBorder}`,
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4, padding: "0 4px" }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: C.textLight, textTransform: "uppercase", letterSpacing: 1 }}>
              Players
            </span>
            <span style={{ fontSize: 9, fontWeight: 600, color: C.textMuted }}>
              {PLAYERS.length}/8
            </span>
          </div>
          {PLAYERS.map(p => <PlayerCard key={p.name} p={p} canKick={true} />)}
          <div style={{
            marginTop: 4, padding: "10px", borderRadius: 10,
            background: C.pinkLight, border: `1px dashed ${C.pinkBorder}`,
            textAlign: "center",
          }}>
            <p style={{ fontSize: 10, color: C.pink, fontWeight: 600, margin: 0 }}>
              🎟 Up to {8 - PLAYERS.length} more can join
            </p>
          </div>
        </aside>

        <ChatPanelClosable open={chatOpen} onToggle={() => setChatOpen(!chatOpen)} />
      </div>
    </div>
  );
}

// Helpers
function SettingRow({ label, children }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <p style={{ fontSize: 9, fontWeight: 700, color: C.textLight, textTransform: "uppercase", letterSpacing: 1, margin: 0, marginBottom: 5 }}>
        {label}
      </p>
      {children}
    </div>
  );
}

function SettingToggle({ label, desc, on, onChange }) {
  return (
    <div onClick={() => onChange(!on)} style={{
      flex: 1, padding: "10px 12px", borderRadius: 10,
      background: on ? C.pinkLight : C.bg,
      border: `1px solid ${on ? C.pinkBorder : C.cardBorder}`,
      cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
    }}>
      <div style={{
        width: 30, height: 18, borderRadius: 9,
        background: on ? C.pink : C.borderLight,
        position: "relative", flexShrink: 0, transition: "background 0.15s",
      }}>
        <div style={{
          position: "absolute", top: 2, left: on ? 14 : 2,
          width: 14, height: 14, borderRadius: "50%",
          background: "#fff", transition: "left 0.15s",
          boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
        }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: on ? C.pink : C.textDark, margin: 0 }}>{label}</p>
        <p style={{ fontSize: 8, color: C.textMuted, margin: 0 }}>{desc}</p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════
// SCREEN 5: PLAYER LOBBY (read-only settings)
// ═══════════════════════════════════════
function ScreenPlayerLobby() {
  const [chatOpen, setChatOpen] = useState(true);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: C.bg }}>
      <RoomTopBar />
      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        <main style={{ flex: 1, minWidth: 0, padding: "20px 24px", overflowY: "auto" }}>
          <div style={{ maxWidth: 600, margin: "0 auto" }}>
            {/* Smaller code card for non-host */}
            <div style={{
              padding: "14px 18px", borderRadius: 12, marginBottom: 14,
              background: "#fff", border: `1px solid ${C.cardBorder}`,
              display: "flex", alignItems: "center", gap: 14,
            }}>
              <div>
                <p style={{ fontSize: 8, fontWeight: 700, color: C.textLight, margin: 0, textTransform: "uppercase", letterSpacing: 1 }}>
                  Room
                </p>
                <p style={{ fontSize: 28, fontWeight: 800, color: C.pink, margin: 0, fontFamily: "monospace", letterSpacing: 6 }}>
                  7392
                </p>
              </div>
              <div style={{ flex: 1 }} />
              <button style={{
                padding: "6px 12px", borderRadius: 8,
                background: C.pinkLight, border: `1px solid ${C.pinkBorder}`,
                color: C.pink, fontSize: 11, fontWeight: 600, cursor: "pointer",
              }}>📋 Copy</button>
              <button style={{
                padding: "6px 12px", borderRadius: 8,
                background: C.pinkLight, border: `1px solid ${C.pinkBorder}`,
                color: C.pink, fontSize: 11, fontWeight: 600, cursor: "pointer",
              }}>🔗 Share</button>
            </div>

            {/* Read-only settings */}
            <div style={{
              padding: "16px 18px", borderRadius: 14, marginBottom: 14,
              background: C.bg, border: `1px solid ${C.borderLight}`,
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: C.textDark }}>⚙ Game settings</span>
                <span style={{ fontSize: 9, color: C.textLight }}>🔒 Set by host</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {[
                  { k: "Difficulty",    v: "Hard",                    c: C.red },
                  { k: "Groups",        v: "BLACKPINK + 3 others",    c: C.purple },
                  { k: "Time / round",  v: "15s",                     c: C.amber },
                  { k: "Korean mode",   v: "Off",                     c: C.textMuted },
                  { k: "Privacy",       v: "🔒 Private",              c: C.textMuted },
                ].map(s => (
                  <div key={s.k} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "8px 12px", borderRadius: 8, background: "#fff",
                  }}>
                    <span style={{ fontSize: 11, color: C.textMuted }}>{s.k}</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: s.c }}>{s.v}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Waiting message */}
            <div style={{
              padding: "16px 0", borderRadius: 14,
              background: C.borderLight, textAlign: "center",
            }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                <div style={{ display: "flex", gap: 4 }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{
                      width: 7, height: 7, borderRadius: "50%", background: C.textLight,
                      animation: `dotBounce 1.4s ${i * 0.2}s infinite`,
                    }} />
                  ))}
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color: C.textMuted }}>
                  Waiting for host to start...
                </span>
              </div>
            </div>

            <p style={{ fontSize: 10, color: C.textLight, textAlign: "center", margin: "12px 0 0" }}>
              First to 100 points wins · Up to 10 pts per round
            </p>
          </div>
        </main>

        <aside style={{
          width: 260, flexShrink: 0,
          display: "flex", flexDirection: "column", gap: 5,
          padding: "16px 12px", overflowY: "auto",
          background: C.bg, borderLeft: `1px solid ${C.cardBorder}`,
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4, padding: "0 4px" }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: C.textLight, textTransform: "uppercase", letterSpacing: 1 }}>
              Players
            </span>
            <span style={{ fontSize: 9, fontWeight: 600, color: C.textMuted }}>
              {PLAYERS.length}/8
            </span>
          </div>
          {PLAYERS.map(p => <PlayerCard key={p.name} p={p} canKick={false} />)}
        </aside>

        <ChatPanelClosable open={chatOpen} onToggle={() => setChatOpen(!chatOpen)} />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════
// MAIN
// ═══════════════════════════════════════
export default function RoomsDesktopFlow() {
  const [screen, setScreen] = useState("hub");

  const Active = {
    hub: ScreenHub,
    join: ScreenJoin,
    guest: ScreenGuest,
    "host-lobby": ScreenHostLobby,
    "player-lobby": ScreenPlayerLobby,
  }[screen];

  return (
    <div style={{
      minHeight: "100vh", padding: "20px", background: "#EDE8E2",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    }}>
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        <div style={{ marginBottom: 12, textAlign: "center" }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: C.textDark, margin: 0 }}>
            Battle Rooms — Desktop flow
          </p>
          <p style={{ fontSize: 10, color: C.textMuted, margin: 0, marginTop: 2 }}>
            Hub → Join → Guest setup → Host Lobby → Player Lobby · Chat panel: smaller (280px) + closeable
          </p>
        </div>

        <div style={{ display: "flex", justifyContent: "center", gap: 4, marginBottom: 16 }}>
          {SCREENS.map(s => (
            <button key={s.id} onClick={() => setScreen(s.id)} style={{
              padding: "5px 12px", borderRadius: 8,
              background: screen === s.id ? C.pink : "#fff",
              color: screen === s.id ? "#fff" : C.textMuted,
              border: `1px solid ${screen === s.id ? C.pink : C.cardBorder}`,
              fontSize: 10, fontWeight: 600, cursor: "pointer",
            }}>{s.label}</button>
          ))}
        </div>

        {/* Desktop frame */}
        <div style={{
          width: "100%", height: 800,
          background: "#fff", borderRadius: 12, overflow: "hidden",
          boxShadow: "0 8px 40px rgba(0,0,0,0.08)",
          border: `1px solid ${C.cardBorder}`,
        }}>
          {Active && <Active />}
        </div>
      </div>

      <style>{`
        @keyframes dotBounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.6; }
          30% { transform: translateY(-4px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
