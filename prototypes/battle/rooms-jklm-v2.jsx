import { useState } from "react";

// ═══════════════════════════════════════
// KPOPQUIZ-ADAPTED PALETTE
// ═══════════════════════════════════════
const C = {
  bg: "#FAF9F6",
  bar: "#fff",
  barBorder: "#e8e6e0",
  playerBg: "#FAF9F6",
  card: "#fff",
  cardHover: "#FAF2F5",
  cardBorder: "#e8e6e0",
  scoreBg: "#D4537E",
  chatBg: "#F5EFF1",
  chatTabBar: "#fff",
  chatBorder: "#EADBE0",
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
  borderLight: "#f0ede8",
};

const PLAYERS = [
  { name: "Mina",          score: 78, answer: "Pink Venom",  initial: "M", color: "#D4537E", isHost: true,  isLeader: true, correct: 8, fastest: "1.2s" },
  { name: "felixstan",     score: 65, answer: null,           initial: "F", color: "#e8a060", correct: 7, fastest: "2.1s" },
  { name: "you",           score: 42, answer: "PINK PUN",     initial: "Y", color: "#9a7acc", isYou: true, correct: 5, fastest: "2.8s" },
  { name: "skzfanboy",     score: 33, answer: null,           initial: "S", color: "#27ae60", correct: 4, fastest: "3.2s" },
  { name: "rosie_bear",    score: 27, answer: null,           initial: "R", color: "#D4537E", correct: 3, fastest: "4.1s" },
  { name: "karinaStan",    score: 22, answer: null,           initial: "K", color: "#9a7acc", correct: 3, fastest: "5.0s" },
  { name: "BlinkForever",  score: 18, answer: null,           initial: "B", color: "#4a90d0", isGuest: true, correct: 2, fastest: "6.2s" },
  { name: "armybtsforever",score: 15, answer: "PINK BOMB",    initial: "A", color: "#e8a060", muted: true,   correct: 2, fastest: "5.5s" },
  { name: "TWICE_baby",    score: 12, answer: null,           initial: "T", color: "#4a90d0", correct: 1, fastest: "7.3s" },
  { name: "newjeansxoxo",  score: 9,  answer: null,           initial: "N", color: "#27ae60", isGuest: true, correct: 1, fastest: "8.4s" },
];

// ═══════════════════════════════════════
// ICONS
// ═══════════════════════════════════════
function ChatIcon() { return <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 4h12v8H8l-3 3v-3H3V4z" /></svg>; }
function UsersIcon() { return <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="6.5" cy="7" r="2.5"/><path d="M2 14a4.5 4.5 0 019 0"/><circle cx="12" cy="6" r="2"/><path d="M11 11.5a3.5 3.5 0 015 3"/></svg>; }
function BookIcon() { return <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v12l3-1.5L9 15l3-1.5L15 15V3l-3 1.5L9 3 6 4.5 3 3z"/></svg>; }
function HomeIcon() { return <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 8L9 3l6 5v7H3V8z"/><path d="M7 15v-4h4v4"/></svg>; }
function GearIcon() { return <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="9" r="2.5"/><path d="M9 1v3M9 14v3M1 9h3M14 9h3M3.5 3.5l2 2M12.5 12.5l2 2M3.5 14.5l2-2M12.5 5.5l2-2"/></svg>; }
function VolumeIcon() { return <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 7v4h3l4 3V4L5 7H2z"/><path d="M12 7c1 1 1 3 0 4M14 5c2 2 2 6 0 8" strokeOpacity="0.6"/></svg>; }
function MenuIcon() { return <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M3 5h14M3 10h14M3 15h14"/></svg>; }
function CopyIcon() { return <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="8" height="8" rx="1.5"/><path d="M5 3V2a1 1 0 011-1h6a1 1 0 011 1v8a1 1 0 01-1 1h-1"/></svg>; }
function ShareIcon() { return <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="3" cy="7" r="1.5"/><circle cx="11" cy="3" r="1.5"/><circle cx="11" cy="11" r="1.5"/><path d="M4.3 6.3l5.4-2.6M4.3 7.7l5.4 2.6"/></svg>; }
function ExitIcon() { return <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11v1a1 1 0 01-1 1H3a1 1 0 01-1-1V2a1 1 0 011-1h5a1 1 0 011 1v1M11 4l3 3-3 3M14 7H6"/></svg>; }
function FlagIcon() { return <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 2v11M3 2h8l-2 2 2 2H3"/></svg>; }

// ═══════════════════════════════════════
// PLAYER CARD (used in roster + tabs)
// ═══════════════════════════════════════
function PlayerCard({ p, compact = false }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        borderRadius: 10, display: "flex", overflow: "hidden",
        background: hover ? C.cardHover : C.card,
        border: `1px solid ${
          p.isYou ? C.pinkBorder
          : p.isLeader ? "rgba(232,160,96,0.4)"
          : C.cardBorder
        }`,
        position: "relative",
        boxShadow: p.isLeader ? "0 2px 12px rgba(232,160,96,0.15)" : "none",
        transition: "all 0.15s",
      }}
    >
      {p.isLeader && (
        <span style={{ position: "absolute", top: -8, right: 8, fontSize: 14, zIndex: 2 }}>👑</span>
      )}
      <div style={{
        flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        padding: "6px 4px", width: compact ? 48 : 56,
        background: p.isLeader ? "linear-gradient(180deg, rgba(232,160,96,0.06), transparent)" : "transparent",
      }}>
        <div style={{
          width: compact ? 30 : 36, height: compact ? 30 : 36, borderRadius: "50%",
          background: p.color,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: compact ? 12 : 14, fontWeight: 800, color: "#fff",
          marginBottom: 4,
          border: p.isLeader ? "2px solid #e8a060" : "none",
        }}>{p.initial}</div>
        <span style={{
          fontSize: compact ? 11 : 13, fontWeight: 800,
          color: p.isLeader ? "#e8a060" : C.textDark,
          lineHeight: 1,
        }}>{p.score}</span>
      </div>
      <div style={{
        flex: 1, padding: "8px 10px 8px 4px",
        display: "flex", flexDirection: "column", justifyContent: "center", minWidth: 0,
      }}>
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
            }}>host</span>
          )}
          {p.isYou && (
            <span style={{
              fontSize: 7, fontWeight: 700, padding: "1px 4px", borderRadius: 3,
              background: C.pinkLight, color: C.pink, flexShrink: 0,
            }}>you</span>
          )}
          {p.muted && (
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke={C.textLight} strokeWidth="1.3" style={{ flexShrink: 0, marginLeft: "auto" }}>
              <path d="M3 3l5 5M5.5 2v5M3.5 4v3a2 2 0 002 2" strokeLinecap="round" />
            </svg>
          )}
        </div>
        {p.answer && (
          <span style={{
            fontSize: 10, fontWeight: 600, color: p.color,
            textTransform: "uppercase", letterSpacing: 0.5,
            marginTop: 2, opacity: 0.85,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {p.answer.toUpperCase()}
          </span>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════
// CHAT PANEL TAB CONTENTS
// ═══════════════════════════════════════
function ChatTabContent() {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
        {[
          { user: "Mina",         color: "#D4537E", msg: "lets goooo first to 100",  time: "2m", isHost: true },
          { user: "felixstan",    color: "#e8a060", msg: "easy round lol",           time: "1m" },
          { user: "BlinkForever", color: "#4a90d0", msg: "?? what was that lyric",   time: "1m" },
          { user: "you",          color: "#9a7acc", msg: "wait i had pink venom but typed weird", time: "30s", isYou: true },
          { user: "skzfanboy",    color: "#27ae60", msg: "this lobby is fast",       time: "20s" },
          { user: "Mina",         color: "#D4537E", msg: "next round in 3...",       time: "5s", isHost: true },
        ].map((m, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: m.color }}>
                {m.user}{m.isHost && " 👑"}{m.isYou && " (you)"}
              </span>
              <span style={{ fontSize: 8, color: C.textLight }}>{m.time}</span>
            </div>
            <span style={{ fontSize: 12, color: C.textDark, lineHeight: 1.4 }}>{m.msg}</span>
          </div>
        ))}
      </div>
      <div style={{ padding: 10, borderTop: `1px solid ${C.chatBorder}`, background: "#fff" }}>
        <div style={{ display: "flex", gap: 6 }}>
          <input
            placeholder="Type a message..."
            style={{
              flex: 1, padding: "8px 12px", borderRadius: 10,
              background: C.bg, border: `1px solid ${C.borderLight}`,
              fontSize: 12, color: C.textDark, outline: "none",
            }}
          />
          <button style={{
            padding: "8px 14px", borderRadius: 10,
            background: C.pink, color: "#fff", border: "none",
            fontSize: 12, fontWeight: 600, cursor: "pointer",
          }}>Send</button>
        </div>
      </div>
    </div>
  );
}

function PlayersTabContent() {
  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8, minHeight: 0 }}>
      <p style={{ fontSize: 9, fontWeight: 700, color: C.textLight, textTransform: "uppercase", letterSpacing: 1, margin: 0, marginBottom: 2 }}>
        Player stats this game
      </p>
      {PLAYERS.map((p, i) => (
        <div key={p.name} style={{
          padding: "10px 12px", borderRadius: 10,
          background: "#fff", border: `1px solid ${p.isYou ? C.pinkBorder : p.isLeader ? "rgba(232,160,96,0.3)" : C.cardBorder}`,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{
              width: 18, fontSize: 10, fontWeight: 700, color: i === 0 ? C.amber : C.textMuted, textAlign: "center",
            }}>
              {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
            </span>
            <div style={{
              width: 26, height: 26, borderRadius: "50%", background: p.color,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 11, fontWeight: 800, color: "#fff", flexShrink: 0,
            }}>{p.initial}</div>
            <span style={{ fontSize: 12, fontWeight: 600, color: C.textDark, flex: 1 }}>
              {p.name}{p.isYou && <span style={{ color: C.textLight, fontWeight: 500 }}> (you)</span>}
            </span>
            <span style={{ fontSize: 14, fontWeight: 800, color: i === 0 ? C.amber : C.textDark }}>
              {p.score}
            </span>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 6, paddingLeft: 26 }}>
            <span style={{ fontSize: 9, color: C.textMuted }}>
              ✓ <strong style={{ color: C.textDark }}>{p.correct}</strong> correct
            </span>
            <span style={{ fontSize: 9, color: C.textMuted }}>
              ⚡ Fastest <strong style={{ color: C.textDark }}>{p.fastest}</strong>
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function RulesTabContent() {
  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "14px 14px", minHeight: 0 }}>
      <p style={{ fontSize: 14, fontWeight: 700, color: C.textDark, margin: 0, marginBottom: 6 }}>
        How to play
      </p>
      <p style={{ fontSize: 11, color: C.textMuted, margin: 0, marginBottom: 14, lineHeight: 1.5 }}>
        Real-time K-pop trivia battles. First player to <strong style={{ color: C.pink }}>100 points</strong> wins.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
        {[
          { num: "1", title: "Question reveals", desc: "Everyone sees the same question at the same time" },
          { num: "2", title: "Type your answer", desc: "Free-text input — typos OK, both 'BTS' and '방탄' work" },
          { num: "3", title: "Faster = more points", desc: "Up to 10 pts per round, scaled by how fast you answer" },
          { num: "4", title: "Race to 100", desc: "First player to reach 100 total points wins the game" },
        ].map(s => (
          <div key={s.num} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <div style={{
              width: 22, height: 22, borderRadius: "50%",
              background: C.pink, color: "#fff",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 11, fontWeight: 800, flexShrink: 0,
            }}>{s.num}</div>
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: C.textDark, margin: 0 }}>{s.title}</p>
              <p style={{ fontSize: 10, color: C.textMuted, margin: 0, marginTop: 1, lineHeight: 1.4 }}>{s.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Scoring formula card */}
      <div style={{
        padding: "10px 12px", borderRadius: 10, marginBottom: 14,
        background: C.pinkLight, border: `1px solid ${C.pinkBorder}`,
      }}>
        <p style={{ fontSize: 9, fontWeight: 700, color: C.pink, margin: 0, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>
          Scoring formula
        </p>
        <p style={{ fontSize: 10, color: C.textDark, margin: 0, lineHeight: 1.5, fontFamily: "monospace" }}>
          points = (timeRemaining / totalTime) × 10
        </p>
        <p style={{ fontSize: 9, color: C.textMuted, margin: 0, marginTop: 4, lineHeight: 1.4 }}>
          Answer in 0s → 10 pts · Answer at last second → ~1 pt · Wrong → 0 pts (no penalty, can retry)
        </p>
      </div>

      {/* Question types */}
      <p style={{ fontSize: 9, fontWeight: 700, color: C.textLight, textTransform: "uppercase", letterSpacing: 1, margin: 0, marginBottom: 6 }}>
        Question types
      </p>
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 14 }}>
        {[
          { icon: "🎤", label: "Lyric Battle" },
          { icon: "📸", label: "Cropped Photo" },
          { icon: "🎬", label: "MV Frame" },
          { icon: "💿", label: "Album Cover" },
          { icon: "📅", label: "Era Match" },
        ].map(t => (
          <span key={t.label} style={{
            fontSize: 9, fontWeight: 600, padding: "4px 8px", borderRadius: 12,
            background: "#fff", border: `1px solid ${C.cardBorder}`,
            color: C.textDark,
          }}>{t.icon} {t.label}</span>
        ))}
      </div>

      {/* Report question */}
      <button style={{
        width: "100%", padding: "10px 12px", borderRadius: 10,
        background: "#fff", border: `1px solid ${C.cardBorder}`,
        color: C.textMuted, fontSize: 11, fontWeight: 600, cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
      }}>
        <FlagIcon /> Report current question
      </button>
      <p style={{ fontSize: 9, color: C.textLight, textAlign: "center", margin: 0, marginTop: 6, lineHeight: 1.4 }}>
        Reports go to moderation. Wrong answers, NSFW, or too obscure questions get removed.
      </p>
    </div>
  );
}

function HomeTabContent() {
  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "14px", minHeight: 0 }}>
      {/* Room code prominent */}
      <div style={{
        padding: "16px 14px", borderRadius: 14,
        background: "linear-gradient(135deg, #1a0a1e, #3a1848 60%, #D4537E)",
        position: "relative", overflow: "hidden", marginBottom: 12,
      }}>
        <div style={{
          position: "absolute", top: -10, right: -10, width: 80, height: 80,
          borderRadius: "50%", background: "rgba(255,255,255,0.06)",
        }} />
        <p style={{ fontSize: 8, fontWeight: 700, color: "rgba(255,255,255,0.5)", margin: 0, textTransform: "uppercase", letterSpacing: 2 }}>
          Room code
        </p>
        <p style={{ fontSize: 36, fontWeight: 800, color: "#fff", margin: 0, marginTop: 2, fontFamily: "monospace", letterSpacing: 6 }}>
          7392
        </p>
        <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
          <button style={{
            flex: 1, padding: "6px 8px", borderRadius: 7,
            background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)",
            color: "#fff", fontSize: 10, fontWeight: 600, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
          }}>
            <CopyIcon /> Copy
          </button>
          <button style={{
            flex: 1, padding: "6px 8px", borderRadius: 7,
            background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)",
            color: "#fff", fontSize: 10, fontWeight: 600, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
          }}>
            <ShareIcon /> Share
          </button>
        </div>
      </div>

      {/* Game info */}
      <p style={{ fontSize: 9, fontWeight: 700, color: C.textLight, textTransform: "uppercase", letterSpacing: 1, margin: 0, marginBottom: 6 }}>
        Game info
      </p>
      <div style={{
        padding: "10px 12px", borderRadius: 10, marginBottom: 12,
        background: "#fff", border: `1px solid ${C.cardBorder}`,
      }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {[
            { k: "Host",        v: "Mina 👑",                 c: C.pink },
            { k: "Difficulty",  v: "Hard",                     c: C.red },
            { k: "Groups",      v: "BLACKPINK + 3 others",     c: C.purple || "#9a7acc" },
            { k: "Time / round", v: "15s",                     c: C.amber },
            { k: "Korean mode", v: "Off",                      c: C.textMuted },
            { k: "Privacy",     v: "🔒 Private",               c: C.textMuted },
          ].map(s => (
            <div key={s.k} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 10, color: C.textMuted }}>{s.k}</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: s.c }}>{s.v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Quick actions */}
      <p style={{ fontSize: 9, fontWeight: 700, color: C.textLight, textTransform: "uppercase", letterSpacing: 1, margin: 0, marginBottom: 6 }}>
        Quick actions
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 12 }}>
        <button style={{
          padding: "10px 12px", borderRadius: 10,
          background: "#fff", border: `1px solid ${C.cardBorder}`,
          fontSize: 11, fontWeight: 600, color: C.textDark, cursor: "pointer",
          display: "flex", alignItems: "center", gap: 8, textAlign: "left",
        }}>
          <span style={{ fontSize: 14 }}>🔗</span>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0 }}>Share link</p>
            <p style={{ fontSize: 8, color: C.textLight, margin: 0 }}>kpopquiz.org/r/7392</p>
          </div>
        </button>
        <button style={{
          padding: "10px 12px", borderRadius: 10,
          background: "#fff", border: `1px solid ${C.cardBorder}`,
          fontSize: 11, fontWeight: 600, color: C.textDark, cursor: "pointer",
          display: "flex", alignItems: "center", gap: 8, textAlign: "left",
        }}>
          <span style={{ fontSize: 14 }}>🏠</span>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0 }}>Back to room hub</p>
            <p style={{ fontSize: 8, color: C.textLight, margin: 0 }}>Browse other rooms</p>
          </div>
        </button>
      </div>

      {/* Leave button (danger) */}
      <button style={{
        width: "100%", padding: "10px 12px", borderRadius: 10,
        background: "rgba(231,76,60,0.06)", border: `1px solid rgba(231,76,60,0.2)`,
        fontSize: 11, fontWeight: 600, color: C.red, cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
      }}>
        <ExitIcon /> Leave room
      </button>
    </div>
  );
}

function SettingsTabContent() {
  const [chatHidden, setChatHidden] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [notifyOn, setNotifyOn] = useState(true);

  const Toggle = ({ on, onClick }) => (
    <div onClick={onClick} style={{
      width: 36, height: 20, borderRadius: 10,
      background: on ? C.pink : C.borderLight,
      position: "relative", cursor: "pointer", flexShrink: 0,
      transition: "background 0.15s",
    }}>
      <div style={{
        position: "absolute", top: 2, left: on ? 18 : 2,
        width: 16, height: 16, borderRadius: "50%",
        background: "#fff", transition: "left 0.15s",
        boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
      }} />
    </div>
  );

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "14px", minHeight: 0 }}>
      <p style={{ fontSize: 14, fontWeight: 700, color: C.textDark, margin: 0, marginBottom: 12 }}>
        Settings
      </p>

      <p style={{ fontSize: 9, fontWeight: 700, color: C.textLight, textTransform: "uppercase", letterSpacing: 1, margin: 0, marginBottom: 6 }}>
        Display
      </p>
      <div style={{
        padding: "4px 0", borderRadius: 10, marginBottom: 14,
        background: "#fff", border: `1px solid ${C.cardBorder}`,
      }}>
        {[
          { label: "Hide chat during rounds", desc: "Less distraction while answering", state: chatHidden, set: setChatHidden },
          { label: "Sound effects", desc: "Round start, correct answer chimes", state: soundOn, set: setSoundOn },
          { label: "Round notifications", desc: "Visual flash when round starts", state: notifyOn, set: setNotifyOn },
        ].map((s, i) => (
          <div key={s.label} style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "10px 12px",
            borderTop: i > 0 ? `1px solid ${C.borderLight}` : "none",
          }}>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: C.textDark, margin: 0 }}>{s.label}</p>
              <p style={{ fontSize: 9, color: C.textMuted, margin: 0, marginTop: 1 }}>{s.desc}</p>
            </div>
            <Toggle on={s.state} onClick={() => s.set(!s.state)} />
          </div>
        ))}
      </div>

      <p style={{ fontSize: 9, fontWeight: 700, color: C.textLight, textTransform: "uppercase", letterSpacing: 1, margin: 0, marginBottom: 6 }}>
        Your identity
      </p>
      <div style={{
        padding: "10px 12px", borderRadius: 10, marginBottom: 14,
        background: "#fff", border: `1px solid ${C.cardBorder}`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <div style={{
            width: 36, height: 36, borderRadius: "50%", background: "#9a7acc",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14, fontWeight: 800, color: "#fff",
          }}>Y</div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: C.textDark, margin: 0 }}>you (chaeyoung)</p>
            <p style={{ fontSize: 9, color: C.textMuted, margin: 0 }}>Logged in · Account avatar</p>
          </div>
        </div>
        <button style={{
          width: "100%", padding: "6px 10px", borderRadius: 8,
          background: C.bg, border: `1px solid ${C.cardBorder}`,
          fontSize: 10, fontWeight: 600, color: C.textMuted, cursor: "pointer",
        }}>Edit profile in settings →</button>
      </div>

      <p style={{ fontSize: 9, fontWeight: 700, color: C.textLight, textTransform: "uppercase", letterSpacing: 1, margin: 0, marginBottom: 6 }}>
        Help
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {[
          { icon: "❓", label: "Report a problem", desc: "Bug, glitch, abuse" },
          { icon: "💡", label: "Suggest a feature", desc: "What would make rooms better?" },
        ].map(b => (
          <button key={b.label} style={{
            padding: "8px 12px", borderRadius: 10,
            background: "#fff", border: `1px solid ${C.cardBorder}`,
            fontSize: 11, fontWeight: 600, color: C.textDark, cursor: "pointer",
            display: "flex", alignItems: "center", gap: 8, textAlign: "left",
          }}>
            <span style={{ fontSize: 13 }}>{b.icon}</span>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0 }}>{b.label}</p>
              <p style={{ fontSize: 9, color: C.textLight, margin: 0 }}>{b.desc}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════
// CHAT PANEL — 5 TABS now
// ═══════════════════════════════════════
function ChatPanel() {
  const [tab, setTab] = useState("chat");

  const TABS = [
    { id: "chat",     icon: <ChatIcon />,  label: "Chat",     hasUnread: true },
    { id: "players",  icon: <UsersIcon />, label: "Players" },
    { id: "rules",    icon: <BookIcon />,  label: "Rules" },
    { id: "home",     icon: <HomeIcon />,  label: "Home" },
    { id: "settings", icon: <GearIcon />,  label: "Settings" },
  ];

  return (
    <div style={{
      display: "flex", flexDirection: "column",
      width: 340, flexShrink: 0,
      background: C.chatBg,
      borderLeft: `1px solid ${C.chatBorder}`,
    }}>
      {/* Tab bar — 5 tabs */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-around",
        height: 48, background: C.chatTabBar, borderBottom: `1px solid ${C.chatBorder}`,
        padding: "0 4px",
      }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            title={t.label}
            style={{
              width: 40, height: 38, borderRadius: 8,
              background: tab === t.id ? C.pinkLight : "transparent",
              border: "none", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: tab === t.id ? C.pink : C.textMuted,
              position: "relative",
              transition: "all 0.15s",
            }}
          >
            {t.icon}
            {t.hasUnread && tab !== t.id && (
              <span style={{
                position: "absolute", top: 6, right: 6,
                width: 7, height: 7, borderRadius: "50%",
                background: C.pink,
              }} />
            )}
          </button>
        ))}
      </div>

      {/* Active tab content */}
      {tab === "chat" && <ChatTabContent />}
      {tab === "players" && <PlayersTabContent />}
      {tab === "rules" && <RulesTabContent />}
      {tab === "home" && <HomeTabContent />}
      {tab === "settings" && <SettingsTabContent />}
    </div>
  );
}

// ═══════════════════════════════════════
// GAME AREA — center column
// ═══════════════════════════════════════
function GameArea({ screen, onScreen }) {
  return (
    <main style={{
      flex: 1, minWidth: 0,
      display: "flex", flexDirection: "column",
      padding: "20px 24px",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 16 }}>
        <span style={{ fontSize: 14, color: C.textDark, fontWeight: 600 }}>
          Round 5 <span style={{ color: C.textLight }}>·</span>{" "}
          <span style={{ color: C.pink }}>Lyric Battle · Hard</span>
        </span>
        <button style={{
          padding: "5px 14px", borderRadius: 999,
          background: "#fff", border: `1px solid ${C.cardBorder}`,
          fontSize: 11, fontWeight: 600, color: C.textMuted, cursor: "pointer",
        }}>How to play</button>
      </div>

      {/* Dev toggle */}
      <div style={{ display: "flex", justifyContent: "center", gap: 4, marginBottom: 16 }}>
        {[
          { id: "active",   label: "Active question" },
          { id: "reveal",   label: "Answer reveal" },
          { id: "photo",    label: "Photo question" },
        ].map(s => (
          <button key={s.id} onClick={() => onScreen(s.id)} style={{
            padding: "4px 12px", borderRadius: 14,
            background: screen === s.id ? C.pink : "#fff",
            color: screen === s.id ? "#fff" : C.textMuted,
            border: `1px solid ${screen === s.id ? C.pink : C.cardBorder}`,
            fontSize: 9, fontWeight: 600, cursor: "pointer",
          }}>{s.label}</button>
        ))}
      </div>

      <div style={{
        flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        maxWidth: 600, width: "100%", margin: "0 auto",
      }}>
        {screen === "active" && <ActiveQuestion />}
        {screen === "reveal" && <AnswerReveal />}
        {screen === "photo" && <PhotoQuestion />}
      </div>

      {screen === "active" && <AnswerInput />}
      {screen === "photo" && <AnswerInput placeholder="Type the idol's name..." />}
      {screen === "reveal" && <NextRoundCountdown />}
    </main>
  );
}

function ActiveQuestion() {
  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}>
      <p style={{ fontSize: 13, color: C.textMuted, margin: 0, marginBottom: 10 }}>
        What song is this?
      </p>
      <div style={{
        width: "100%", padding: "32px 32px", borderRadius: 16,
        background: "#fff", border: `1.5px solid ${C.pinkBorder}`,
        boxShadow: "0 4px 24px rgba(212,83,126,0.06)",
        textAlign: "center", position: "relative",
      }}>
        <span style={{
          position: "absolute", top: 8, left: 14,
          fontSize: 36, color: C.pinkLight, lineHeight: 1, fontWeight: 700,
        }}>"</span>
        <p style={{
          fontSize: 22, fontWeight: 600, color: C.textDark, margin: 0, lineHeight: 1.5,
          fontStyle: "italic", padding: "0 20px",
        }}>
          Stop, look, listen baby<br />
          You so trendy
        </p>
        <span style={{
          position: "absolute", bottom: 0, right: 14,
          fontSize: 36, color: C.pinkLight, lineHeight: 1, fontWeight: 700,
        }}>"</span>
      </div>

      <div style={{ display: "flex", gap: 6, marginTop: 14, minHeight: 24 }}>
        <span style={{
          fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 12,
          background: "rgba(39,174,96,0.08)", color: C.green,
          display: "flex", alignItems: "center", gap: 4,
        }}>
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke={C.green} strokeWidth="2" strokeLinecap="round">
            <path d="M2 5.5l2 2 5-5" />
          </svg>
          Mina got it · 1.8s
        </span>
        <span style={{
          fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 12,
          background: "rgba(232,160,96,0.08)", color: C.amber,
          display: "flex", alignItems: "center", gap: 4,
        }}>
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke={C.amber} strokeWidth="2" strokeLinecap="round">
            <path d="M2 5.5l2 2 5-5" />
          </svg>
          felix got it · 3.2s
        </span>
      </div>
    </div>
  );
}

function PhotoQuestion() {
  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}>
      <p style={{ fontSize: 13, color: C.textMuted, margin: 0, marginBottom: 10 }}>
        Which idol is this?
      </p>
      <div style={{
        width: 320, height: 320, borderRadius: 16, overflow: "hidden",
        background: "linear-gradient(135deg, #f0e8f8, #d0c0e8 60%, #b098d0)",
        border: `2px solid ${C.pinkBorder}`,
        boxShadow: "0 8px 32px rgba(212,83,126,0.1)",
        position: "relative",
      }}>
        <div style={{
          position: "absolute", top: "32%", left: "20%", width: "60%", height: "18%",
          background: "linear-gradient(180deg, rgba(0,0,0,0.5), rgba(0,0,0,0.25))",
          borderRadius: "50%", filter: "blur(2px)",
        }} />
        <div style={{
          position: "absolute", top: "28%", left: "32%", width: 38, height: 14,
          background: "rgba(0,0,0,0.85)", borderRadius: "50%",
        }} />
        <div style={{
          position: "absolute", top: "60%", left: "30%", width: "40%", height: 10,
          background: "rgba(180,40,80,0.7)", borderRadius: 5, filter: "blur(1px)",
        }} />
        <div style={{
          position: "absolute", bottom: 8, right: 8,
          padding: "4px 9px", borderRadius: 6,
          background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)",
          fontSize: 9, fontWeight: 700, color: "#fff",
        }}>cropped photo</div>
      </div>

      <div style={{ display: "flex", gap: 6, marginTop: 14, minHeight: 24 }} />
    </div>
  );
}

function AnswerReveal() {
  return (
    <div style={{ width: "100%", textAlign: "center" }}>
      <p style={{ fontSize: 14, color: C.textMuted, margin: 0, marginBottom: 4, fontWeight: 600 }}>
        The answer was
      </p>
      <h1 style={{
        fontSize: 80, fontWeight: 800, color: C.textDark, margin: 0,
        marginBottom: 14, lineHeight: 1.05,
        background: "linear-gradient(135deg, #2c2c2a, #D4537E)",
        WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        backgroundClip: "text",
      }}>
        Pink Venom
      </h1>
      <p style={{ fontSize: 14, color: C.textDark, margin: 0, marginBottom: 6, maxWidth: 480, marginLeft: "auto", marginRight: "auto", lineHeight: 1.5 }}>
        From <strong>BLACKPINK</strong>'s pre-release single from <strong>BORN PINK</strong> (2022) 💖
      </p>
      <p style={{ fontSize: 12, color: C.textMuted, margin: 0, marginTop: 14 }}>
        <strong style={{ color: C.green }}>2 players</strong> got it · <strong style={{ color: C.amber }}>2 missed</strong>
      </p>
      <p style={{ fontSize: 11, color: C.textLight, margin: 0, marginTop: 4 }}>
        Submitted by <strong>kpopquizzz</strong>
      </p>
    </div>
  );
}

function AnswerInput({ placeholder = "Type the song title..." }) {
  const [val, setVal] = useState("");
  return (
    <div style={{ width: "100%", maxWidth: 600, margin: "20px auto 0" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <span style={{ fontSize: 11, color: C.textMuted }}>⏱</span>
        <div style={{ flex: 1, height: 6, borderRadius: 3, background: C.borderLight, overflow: "hidden" }}>
          <div style={{
            height: "100%", width: "62%",
            background: "linear-gradient(90deg, #27ae60, #76c893)",
            borderRadius: 3, transition: "width 0.1s linear",
            boxShadow: "0 0 8px rgba(39,174,96,0.4)",
          }} />
        </div>
        <span style={{ fontSize: 14, fontWeight: 800, color: C.green, fontFamily: "monospace", minWidth: 40, textAlign: "right" }}>
          9.2s
        </span>
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={val}
          onChange={e => setVal(e.target.value)}
          autoFocus
          placeholder={placeholder}
          style={{
            flex: 1, padding: "14px 18px", borderRadius: 12,
            background: "#fff", border: `2px solid ${val ? C.pink : C.cardBorder}`,
            fontSize: 15, fontWeight: 500, color: C.textDark, outline: "none",
            transition: "border 0.15s",
            boxShadow: val ? "0 4px 14px rgba(212,83,126,0.1)" : "none",
          }}
        />
        <button
          disabled={!val.trim()}
          style={{
            padding: "14px 24px", borderRadius: 12,
            background: val.trim() ? C.pink : C.borderLight,
            color: val.trim() ? "#fff" : C.textLight,
            border: "none", fontSize: 14, fontWeight: 700,
            cursor: val.trim() ? "pointer" : "default",
            boxShadow: val.trim() ? "0 4px 14px rgba(212,83,126,0.3)" : "none",
            transition: "all 0.15s",
          }}
        >Send →</button>
      </div>
      <p style={{ fontSize: 10, color: C.textLight, margin: 0, marginTop: 8, textAlign: "center" }}>
        💡 Typos OK · "BTS" or "방탄" both work
      </p>
    </div>
  );
}

function NextRoundCountdown() {
  return (
    <div style={{
      maxWidth: 360, margin: "20px auto 0",
      padding: "12px 18px", borderRadius: 12,
      background: C.pinkLight, border: `1px solid ${C.pinkBorder}`,
      display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
    }}>
      <div style={{ display: "flex", gap: 3 }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: 6, height: 6, borderRadius: "50%", background: C.pink,
            animation: `dotPulse 1.4s ${i * 0.2}s infinite`,
          }} />
        ))}
      </div>
      <span style={{ fontSize: 12, fontWeight: 600, color: C.pink }}>
        Next round starting in 3...
      </span>
    </div>
  );
}

// ═══════════════════════════════════════
// TOP BAR
// ═══════════════════════════════════════
function TopBar() {
  return (
    <header style={{
      display: "flex", alignItems: "center", padding: "0 20px",
      background: C.bar, height: 56,
      borderBottom: `1px solid ${C.barBorder}`,
      flexShrink: 0,
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
            Mina's Lyric Battle
          </p>
          <p style={{ fontSize: 9, color: C.textMuted, margin: 0 }}>
            <span style={{ display: "inline-block", width: 5, height: 5, borderRadius: "50%", background: C.green, marginRight: 4, verticalAlign: "middle" }}/>
            10 players · Hard mode
          </p>
        </div>
        <button style={{
          marginLeft: 8, padding: "4px 10px", borderRadius: 6,
          background: C.pinkLight, border: `1px solid ${C.pinkBorder}`,
          color: C.pink, fontSize: 10, fontWeight: 600, cursor: "pointer",
          display: "flex", alignItems: "center", gap: 4,
        }}>
          <CopyIcon /> Copy code
        </button>
      </div>

      <div style={{ flex: 1 }} />

      <div style={{
        marginRight: 16, padding: "4px 12px", borderRadius: 8,
        background: C.pinkLight, border: `1px solid ${C.pinkBorder}`,
        textAlign: "center",
      }}>
        <p style={{ fontSize: 8, fontWeight: 700, color: C.textMuted, margin: 0, textTransform: "uppercase", letterSpacing: 1 }}>
          Race to 100 · Round 5
        </p>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 6, color: C.textMuted }}>
        <VolumeIcon />
        <input type="range" defaultValue="60" style={{ width: 80, accentColor: C.pink }} />
      </div>

      <button style={{
        marginLeft: 12, padding: "5px 12px", borderRadius: 8,
        background: "transparent", border: `1px solid ${C.cardBorder}`,
        color: C.textMuted, fontSize: 11, fontWeight: 500, cursor: "pointer",
      }}>Leave</button>
    </header>
  );
}

// ═══════════════════════════════════════
// DESKTOP LAYOUT
// ═══════════════════════════════════════
function DesktopLayout({ screen, onScreen }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column",
      width: "100%", height: 720,
      background: C.bg,
      borderRadius: 12, overflow: "hidden",
      boxShadow: "0 8px 40px rgba(0,0,0,0.08)",
      border: `1px solid ${C.cardBorder}`,
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    }}>
      <TopBar />
      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        <GameArea screen={screen} onScreen={onScreen} />

        {/* COL 2: Player roster */}
        <aside style={{
          width: 300, flexShrink: 0,
          display: "flex", flexDirection: "column", gap: 6,
          padding: "16px 12px", overflowY: "auto",
          background: C.playerBg, borderLeft: `1px solid ${C.cardBorder}`,
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4, padding: "0 4px" }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: C.textLight, textTransform: "uppercase", letterSpacing: 1 }}>
              Players
            </span>
            <span style={{ fontSize: 9, fontWeight: 600, color: C.textMuted }}>
              {PLAYERS.length}/10
            </span>
          </div>
          {PLAYERS.map(p => <PlayerCard key={p.name} p={p} />)}
        </aside>

        {/* COL 3: Chat panel with 5 tabs */}
        <ChatPanel />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════
// MOBILE LAYOUT (now 4 bottom tabs)
// ═══════════════════════════════════════
function MobileLayout({ screen, onScreen }) {
  const [drawer, setDrawer] = useState(null); // null | 'players' | 'rules' | 'chat' | 'home' | 'settings'

  return (
    <div style={{
      width: 380, height: 740, position: "relative",
      background: C.bg, borderRadius: 28, overflow: "hidden",
      border: "10px solid #1a1a1a", boxShadow: "0 16px 50px rgba(0,0,0,0.25)",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      display: "flex", flexDirection: "column",
    }}>
      {/* Mobile top bar */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "12px 14px",
        background: C.bar, borderBottom: `1px solid ${C.barBorder}`,
        flexShrink: 0,
      }}>
        <button onClick={() => setDrawer(drawer === "home" ? null : "home")} style={{
          width: 32, height: 32, borderRadius: 8,
          background: drawer === "home" ? C.pinkLight : "#fff",
          border: `1px solid ${drawer === "home" ? C.pinkBorder : C.cardBorder}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: drawer === "home" ? C.pink : C.textMuted, cursor: "pointer",
        }}>
          <MenuIcon />
        </button>
        <div style={{
          padding: "4px 10px", borderRadius: 8,
          background: C.pink, color: "#fff",
          fontSize: 12, fontWeight: 800, fontFamily: "monospace",
        }}>7392</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: C.textDark, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            Round 5 · Hard
          </p>
          <p style={{ fontSize: 8, color: C.textMuted, margin: 0 }}>Race to 100</p>
        </div>
        <div style={{
          padding: "4px 10px", borderRadius: 8,
          background: C.pinkLight, border: `1px solid ${C.pinkBorder}`,
          textAlign: "center",
        }}>
          <p style={{ fontSize: 7, color: C.textLight, margin: 0, textTransform: "uppercase", letterSpacing: 1 }}>You</p>
          <p style={{ fontSize: 13, fontWeight: 800, color: C.pink, margin: 0, lineHeight: 1 }}>42</p>
        </div>
      </div>

      {/* Compact score strip */}
      <div style={{
        display: "flex", gap: 6, padding: "8px 12px",
        background: "#fff", borderBottom: `1px solid ${C.borderLight}`,
        overflowX: "auto", scrollbarWidth: "none", flexShrink: 0,
      }}>
        {PLAYERS.slice(0, 6).map((p, i) => (
          <div key={p.name} style={{
            flexShrink: 0, display: "flex", alignItems: "center", gap: 5,
            padding: "3px 8px 3px 3px", borderRadius: 14,
            background: p.isYou ? C.pinkLight : i === 0 ? "rgba(232,160,96,0.08)" : C.bg,
            border: `1px solid ${p.isYou ? C.pinkBorder : i === 0 ? "rgba(232,160,96,0.3)" : C.borderLight}`,
            position: "relative",
          }}>
            {i === 0 && <span style={{ position: "absolute", top: -7, right: -2, fontSize: 9 }}>👑</span>}
            <div style={{
              width: 20, height: 20, borderRadius: "50%", background: p.color,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 10, fontWeight: 800, color: "#fff",
            }}>{p.initial}</div>
            <span style={{ fontSize: 11, fontWeight: 800, color: C.textDark }}>{p.score}</span>
          </div>
        ))}
        <button onClick={() => setDrawer("players")} style={{
          flexShrink: 0, padding: "3px 10px", borderRadius: 14,
          background: C.bg, border: `1px solid ${C.borderLight}`,
          fontSize: 9, color: C.textMuted, cursor: "pointer",
        }}>+4 more</button>
      </div>

      {/* Game content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 14px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
        {screen === "active" && (
          <>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}>
              <span style={{
                fontSize: 8, fontWeight: 700, padding: "3px 9px", borderRadius: 6,
                background: C.pinkLight, color: C.pink,
                textTransform: "uppercase", letterSpacing: 1,
              }}>🎤 Lyric Battle</span>
            </div>
            <div style={{
              padding: "20px 18px", borderRadius: 14,
              background: "#fff", border: `1.5px solid ${C.pinkBorder}`,
              textAlign: "center",
              boxShadow: "0 4px 20px rgba(212,83,126,0.06)",
            }}>
              <p style={{
                fontSize: 17, fontWeight: 600, color: C.textDark, margin: 0, lineHeight: 1.5,
                fontStyle: "italic",
              }}>
                "Stop, look, listen baby<br />
                You so trendy"
              </p>
            </div>
            <p style={{ fontSize: 11, color: C.textMuted, textAlign: "center", margin: "12px 0 0" }}>
              What song is this?
            </p>
            <div style={{ display: "flex", justifyContent: "center", gap: 4, marginTop: 8, flexWrap: "wrap" }}>
              <span style={{
                fontSize: 9, fontWeight: 600, padding: "2px 8px", borderRadius: 10,
                background: "rgba(39,174,96,0.08)", color: C.green,
              }}>✓ Mina · 1.8s</span>
              <span style={{
                fontSize: 9, fontWeight: 600, padding: "2px 8px", borderRadius: 10,
                background: "rgba(232,160,96,0.08)", color: C.amber,
              }}>✓ felix · 3.2s</span>
            </div>
          </>
        )}

        {screen === "reveal" && (
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: C.textMuted, margin: 0, marginBottom: 4 }}>
              The answer was
            </p>
            <h1 style={{
              fontSize: 36, fontWeight: 800, color: C.textDark, margin: 0,
              background: "linear-gradient(135deg, #2c2c2a, #D4537E)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              lineHeight: 1.1, marginBottom: 8,
            }}>Pink Venom</h1>
            <p style={{ fontSize: 11, color: C.textDark, margin: 0 }}>
              <strong>BLACKPINK</strong> · BORN PINK (2022) 💖
            </p>
            <p style={{ fontSize: 9, color: C.textMuted, margin: "12px 0 0" }}>
              <strong style={{ color: C.green }}>2</strong> got it · <strong style={{ color: C.amber }}>2</strong> missed
            </p>
          </div>
        )}

        {screen === "photo" && (
          <>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}>
              <span style={{
                fontSize: 8, fontWeight: 700, padding: "3px 9px", borderRadius: 6,
                background: "rgba(74,144,208,0.1)", color: "#4a90d0",
                textTransform: "uppercase", letterSpacing: 1,
              }}>📸 Cropped Photo</span>
            </div>
            <div style={{
              width: 220, height: 220, margin: "0 auto",
              borderRadius: 14, overflow: "hidden",
              background: "linear-gradient(135deg, #f0e8f8, #d0c0e8)",
              border: `2px solid ${C.pinkBorder}`,
              position: "relative",
            }}>
              <div style={{
                position: "absolute", top: "32%", left: "20%", width: "60%", height: "18%",
                background: "linear-gradient(180deg, rgba(0,0,0,0.5), rgba(0,0,0,0.25))",
                borderRadius: "50%", filter: "blur(2px)",
              }} />
              <div style={{
                position: "absolute", top: "28%", left: "32%", width: 30, height: 12,
                background: "rgba(0,0,0,0.85)", borderRadius: "50%",
              }} />
            </div>
            <p style={{ fontSize: 11, color: C.textMuted, textAlign: "center", margin: "12px 0 0" }}>
              Which idol is this?
            </p>
          </>
        )}
      </div>

      {/* Bottom: input + timer (during active gameplay) */}
      {screen !== "reveal" && (
        <div style={{ padding: "10px 14px", background: "#fff", borderTop: `1px solid ${C.borderLight}`, flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 9, color: C.textMuted }}>⏱</span>
            <div style={{ flex: 1, height: 4, borderRadius: 2, background: C.borderLight, overflow: "hidden" }}>
              <div style={{ width: "62%", height: "100%", background: C.green, borderRadius: 2 }} />
            </div>
            <span style={{ fontSize: 11, fontWeight: 800, color: C.green, fontFamily: "monospace" }}>9.2s</span>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <input
              autoFocus
              placeholder="Type the song..."
              style={{
                flex: 1, padding: "10px 12px", borderRadius: 10,
                background: C.bg, border: `1.5px solid ${C.cardBorder}`,
                fontSize: 12, color: C.textDark, outline: "none",
              }}
            />
            <button style={{
              padding: "10px 16px", borderRadius: 10,
              background: C.pink, color: "#fff", border: "none",
              fontSize: 11, fontWeight: 700, cursor: "pointer",
            }}>Send</button>
          </div>
        </div>
      )}

      {screen === "reveal" && (
        <div style={{ padding: "10px 14px", background: "#fff", borderTop: `1px solid ${C.borderLight}`, flexShrink: 0 }}>
          <div style={{
            padding: "8px 14px", borderRadius: 10,
            background: C.pinkLight, border: `1px solid ${C.pinkBorder}`,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          }}>
            <div style={{ display: "flex", gap: 3 }}>
              {[0, 1, 2].map(i => <div key={i} style={{ width: 5, height: 5, borderRadius: "50%", background: C.pink, animation: `dotPulse 1.4s ${i * 0.2}s infinite` }} />)}
            </div>
            <span style={{ fontSize: 11, fontWeight: 600, color: C.pink }}>Round 6 in 3...</span>
          </div>
        </div>
      )}

      {/* Bottom tab bar — now 4 tabs (added Rules) */}
      <div style={{
        display: "flex", background: "#fff",
        borderTop: `1px solid ${C.borderLight}`, flexShrink: 0,
      }}>
        {[
          { id: "game",    icon: "🎮", label: "Game",    active: drawer === null && drawer !== "home" },
          { id: "players", icon: "👥", label: `Players`, active: drawer === "players", count: PLAYERS.length },
          { id: "rules",   icon: "📖", label: "Rules",   active: drawer === "rules" },
          { id: "chat",    icon: "💬", label: "Chat",    active: drawer === "chat", badge: 2 },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setDrawer(t.id === "game" ? null : (drawer === t.id ? null : t.id))}
            style={{
              flex: 1, padding: "8px 0", borderRadius: 0,
              background: t.active ? C.pinkLight : "transparent",
              border: "none", cursor: "pointer",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 1,
              borderTop: t.active ? `2px solid ${C.pink}` : "2px solid transparent",
              position: "relative",
            }}
          >
            <span style={{ fontSize: 14 }}>{t.icon}</span>
            <span style={{ fontSize: 8, fontWeight: 600, color: t.active ? C.pink : C.textMuted }}>
              {t.label}{t.count && ` · ${t.count}`}
            </span>
            {t.badge && !t.active && (
              <span style={{
                position: "absolute", top: 6, right: "26%",
                width: 14, height: 14, borderRadius: "50%",
                background: C.pink, color: "#fff",
                fontSize: 8, fontWeight: 800,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>{t.badge}</span>
            )}
          </button>
        ))}
      </div>

      {/* Drawer (any non-game tab) */}
      {drawer && (
        <div style={{
          position: "absolute", bottom: 50, left: 0, right: 0,
          height: drawer === "home" ? "75%" : "62%",
          background: "#fff",
          borderTopLeftRadius: 16, borderTopRightRadius: 16,
          borderTop: `1px solid ${C.cardBorder}`,
          boxShadow: "0 -8px 24px rgba(0,0,0,0.1)",
          animation: "drawerUp 0.25s ease-out",
          display: "flex", flexDirection: "column",
          zIndex: 10, overflow: "hidden",
        }}>
          <div style={{ padding: "8px 14px 4px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: 32, height: 4, borderRadius: 2, background: C.borderLight }} />
          </div>
          <div style={{ padding: "0 14px 8px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: C.textDark, margin: 0 }}>
              {drawer === "players" && `Players (${PLAYERS.length}/10)`}
              {drawer === "rules" && "How to play"}
              {drawer === "chat" && "Chat"}
              {drawer === "home" && "Room info"}
            </p>
            <button onClick={() => setDrawer(null)} style={{
              width: 24, height: 24, borderRadius: 6,
              background: C.bg, border: "none", cursor: "pointer",
              fontSize: 12, color: C.textMuted,
            }}>✕</button>
          </div>

          {drawer === "players" && <PlayersTabContent />}
          {drawer === "rules" && <RulesTabContent />}
          {drawer === "home" && <HomeTabContent />}
          {drawer === "chat" && <ChatTabContent />}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════
// MAIN
// ═══════════════════════════════════════
export default function RoomsJklmV2() {
  const [view, setView] = useState("desktop");
  const [screen, setScreen] = useState("active");

  return (
    <div style={{
      minHeight: "100vh", padding: "20px", background: "#EDE8E2",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    }}>
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        <div style={{ marginBottom: 16, textAlign: "center" }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: C.textDark, margin: 0 }}>
            Rooms — JKLM-style v2 (kpopquiz palette · 5 chat tabs)
          </p>
          <p style={{ fontSize: 10, color: C.textMuted, margin: 0, marginTop: 4 }}>
            Chat · Players · Rules · Home · Settings
          </p>
        </div>

        <div style={{ display: "flex", justifyContent: "center", gap: 4, marginBottom: 16 }}>
          {[
            { id: "desktop", label: "🖥 Desktop · 3-column" },
            { id: "mobile", label: "📱 Mobile · stacked" },
          ].map(v => (
            <button key={v.id} onClick={() => setView(v.id)} style={{
              padding: "6px 14px", borderRadius: 10,
              background: view === v.id ? C.pink : "#fff",
              color: view === v.id ? "#fff" : C.textMuted,
              border: `1px solid ${view === v.id ? C.pink : C.cardBorder}`,
              fontSize: 11, fontWeight: 600, cursor: "pointer",
            }}>{v.label}</button>
          ))}
        </div>

        <div style={{ display: "flex", justifyContent: "center" }}>
          {view === "desktop" && <DesktopLayout screen={screen} onScreen={setScreen} />}
          {view === "mobile" && <MobileLayout screen={screen} onScreen={setScreen} />}
        </div>

        {view === "mobile" && (
          <div style={{ display: "flex", justifyContent: "center", gap: 4, marginTop: 16 }}>
            {[
              { id: "active", label: "Active question" },
              { id: "reveal", label: "Answer reveal" },
              { id: "photo",  label: "Photo question" },
            ].map(s => (
              <button key={s.id} onClick={() => setScreen(s.id)} style={{
                padding: "5px 12px", borderRadius: 8,
                background: screen === s.id ? C.pink : "#fff",
                color: screen === s.id ? "#fff" : C.textMuted,
                border: `1px solid ${screen === s.id ? C.pink : C.cardBorder}`,
                fontSize: 10, fontWeight: 600, cursor: "pointer",
              }}>{s.label}</button>
            ))}
          </div>
        )}

        {/* Help text */}
        <div style={{ maxWidth: 720, margin: "20px auto 0", textAlign: "center" }}>
          <p style={{ fontSize: 10, color: C.textMuted, margin: 0, lineHeight: 1.6 }}>
            <strong style={{ color: C.textDark }}>Desktop:</strong> click each chat panel tab icon to navigate (Chat → Players → Rules → Home → Settings).
            <br />
            <strong style={{ color: C.textDark }}>Mobile:</strong> Game / Players / Rules / Chat in bottom bar · ☰ menu opens Home drawer.
          </p>
        </div>
      </div>

      <style>{`
        @keyframes dotPulse {
          0%, 60%, 100% { transform: scale(1); opacity: 0.7; }
          30% { transform: scale(1.3); opacity: 1; }
        }
        @keyframes drawerUp {
          0% { transform: translateY(100%); }
          100% { transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
