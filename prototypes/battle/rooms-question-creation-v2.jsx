import { useState } from "react";

const C = {
  bg: "#FAF9F6",
  card: "#fff",
  cardHover: "#FAF2F5",
  cardBorder: "#e8e6e0",
  pink: "#D4537E",
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
  barBorder: "#e8e6e0",
};

const SCREENS = [
  { id: "hub",       label: "1 · My Questions" },
  { id: "form",      label: "2 · Create question" },
  { id: "submitted", label: "3 · Submitted" },
  { id: "admin",     label: "4 · Admin (email)" },
];

const PROMPTS = [
  "What song is this?",
  "Which idol is this?",
  "What album is this?",
  "What era is this?",
  "What MV is this from?",
  "What group is this?",
  "What year is this from?",
];

const GROUPS = ["BTS", "BLACKPINK", "Stray Kids", "aespa", "TWICE", "NewJeans", "SEVENTEEN", "IVE", "EXO", "Red Velvet", "(G)I-DLE", "ITZY"];

const MY_QUESTIONS = [
  {
    id: "q1", prompt: "What song is this?",
    text: "Stop look listen baby you so trendy",
    answer: "Pink Venom",
    group: "BLACKPINK", difficulty: "Hard",
    status: "approved",
    plays: 247, solveRate: "89%",
    submittedAt: "5 days ago",
  },
  {
    id: "q2", prompt: "Which idol is this?",
    image: true,
    answer: "Jungkook",
    group: "BTS", difficulty: "Easy",
    status: "pending",
    submittedAt: "2 hours ago",
  },
  {
    id: "q3", prompt: "What album is this?",
    image: true,
    answer: "Born Pink",
    group: "BLACKPINK", difficulty: "Easy",
    status: "approved",
    plays: 89, solveRate: "94%",
    submittedAt: "1 week ago",
  },
  {
    id: "q4", prompt: "What song is this?",
    text: "I'm a savage classy bougie ratchet",
    answer: "Savage",
    group: "aespa", difficulty: "Easy",
    status: "rejected",
    rejectionReason: "Already in the question pool. Try a less popular line.",
    submittedAt: "3 days ago",
  },
  {
    id: "q5", prompt: "What era is this?",
    image: true,
    answer: "Map of the Soul: 7",
    group: "BTS", difficulty: "Hard",
    status: "draft",
    submittedAt: "yesterday",
  },
];

// ═══════════════════════════════════════
// SHARED NAVBAR
// ═══════════════════════════════════════
function SiteNavbar() {
  return (
    <header style={{
      display: "flex", alignItems: "center", padding: "0 24px",
      background: "#fff", height: 60, borderBottom: `1px solid ${C.barBorder}`, flexShrink: 0,
    }}>
      <span style={{ fontSize: 18, fontWeight: 800, color: C.textDark, letterSpacing: -0.4 }}>
        kpop<span style={{ color: C.pink }}>quiz</span>
      </span>
      <nav style={{ display: "flex", gap: 4, marginLeft: 32 }}>
        {[
          { label: "Quizzes" },
          { label: "Blindtest" },
          { label: "Games" },
          { label: "Battle", active: true },
          { label: "Cards" },
        ].map(item => (
          <a key={item.label} style={{
            padding: "6px 12px", borderRadius: 8,
            background: item.active ? C.pinkLight : "transparent",
            color: item.active ? C.pink : C.textMuted,
            fontSize: 13, fontWeight: item.active ? 600 : 500, cursor: "pointer", textDecoration: "none",
          }}>{item.label}</a>
        ))}
      </nav>
      <div style={{ flex: 1 }} />
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: C.amber }}>⭐ 4,287 별</span>
        <div style={{
          width: 32, height: 32, borderRadius: "50%", background: C.purple,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 13, fontWeight: 800, color: "#fff",
        }}>Y</div>
      </div>
    </header>
  );
}

// ═══════════════════════════════════════
// SCREEN 1: MY QUESTIONS (unchanged from v1)
// ═══════════════════════════════════════
function ScreenHub() {
  const [filter, setFilter] = useState("all");
  const filtered = filter === "all" ? MY_QUESTIONS : MY_QUESTIONS.filter(q => q.status === filter);

  const stats = {
    all: MY_QUESTIONS.length,
    draft: MY_QUESTIONS.filter(q => q.status === "draft").length,
    pending: MY_QUESTIONS.filter(q => q.status === "pending").length,
    approved: MY_QUESTIONS.filter(q => q.status === "approved").length,
    rejected: MY_QUESTIONS.filter(q => q.status === "rejected").length,
  };
  const totalPlays = MY_QUESTIONS.filter(q => q.status === "approved").reduce((s, q) => s + (q.plays || 0), 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: C.bg }}>
      <SiteNavbar />
      <div style={{ flex: 1, overflowY: "auto", padding: "32px 24px" }}>
        <div style={{ maxWidth: 1080, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24, gap: 16 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6, fontSize: 11, color: C.textMuted }}>
                <span style={{ cursor: "pointer" }}>Battle</span>
                <span>/</span>
                <span style={{ color: C.textDark, fontWeight: 600 }}>My questions</span>
              </div>
              <h1 style={{ fontSize: 28, fontWeight: 800, color: C.textDark, margin: 0 }}>
                My questions
              </h1>
              <p style={{ fontSize: 13, color: C.textMuted, margin: 0, marginTop: 4 }}>
                Submit a question, the admin reviews it. Approved questions go live in everyone's Battle games.
              </p>
            </div>
            <button style={{
              padding: "10px 20px", borderRadius: 12,
              background: C.pink, color: "#fff", border: "none",
              fontSize: 13, fontWeight: 700, cursor: "pointer",
              boxShadow: "0 4px 16px rgba(212,83,126,0.3)",
              display: "flex", alignItems: "center", gap: 6, flexShrink: 0,
            }}>
              <span style={{ fontSize: 16 }}>+</span> New question
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 20 }}>
            {[
              { label: "Submitted",    value: stats.all,       color: C.textDark },
              { label: "Approved",     value: stats.approved,  color: C.green,   sub: `${totalPlays} plays` },
              { label: "Pending",      value: stats.pending,   color: C.amber,   sub: "in review" },
              { label: "Earned",       value: "+340 별",        color: C.pink,    sub: "from approved Qs" },
            ].map(s => (
              <div key={s.label} style={{
                padding: "14px 16px", borderRadius: 12,
                background: "#fff", border: `1px solid ${C.cardBorder}`,
              }}>
                <p style={{ fontSize: 22, fontWeight: 800, color: s.color, margin: 0, lineHeight: 1 }}>{s.value}</p>
                <p style={{ fontSize: 10, color: C.textMuted, margin: 0, marginTop: 4 }}>{s.label}</p>
                {s.sub && <p style={{ fontSize: 8, color: C.textLight, margin: 0, marginTop: 1 }}>{s.sub}</p>}
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: 4, marginBottom: 14, borderBottom: `1px solid ${C.cardBorder}` }}>
            {[
              { id: "all",      label: "All",      count: stats.all },
              { id: "draft",    label: "Drafts",   count: stats.draft },
              { id: "pending",  label: "Pending",  count: stats.pending },
              { id: "approved", label: "Approved", count: stats.approved },
              { id: "rejected", label: "Rejected", count: stats.rejected },
            ].map(t => (
              <button key={t.id} onClick={() => setFilter(t.id)} style={{
                padding: "8px 14px", background: "transparent", border: "none",
                borderBottom: filter === t.id ? `2px solid ${C.pink}` : "2px solid transparent",
                fontSize: 12, fontWeight: filter === t.id ? 600 : 500,
                color: filter === t.id ? C.pink : C.textMuted,
                cursor: "pointer", marginBottom: -1,
                display: "flex", alignItems: "center", gap: 5,
              }}>
                {t.label}
                {t.count > 0 && (
                  <span style={{
                    fontSize: 9, padding: "1px 6px", borderRadius: 999,
                    background: filter === t.id ? C.pink : C.borderLight,
                    color: filter === t.id ? "#fff" : C.textMuted, fontWeight: 700,
                  }}>{t.count}</span>
                )}
              </button>
            ))}
          </div>

          {filtered.length === 0 && (
            <div style={{ padding: "60px 20px", borderRadius: 14, background: "#fff", border: `1px dashed ${C.cardBorder}`, textAlign: "center" }}>
              <span style={{ fontSize: 36, opacity: 0.4 }}>📝</span>
              <p style={{ fontSize: 13, color: C.textMuted, margin: "8px 0 0" }}>No questions in this category yet.</p>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {filtered.map(q => <QuestionRow key={q.id} q={q} />)}
          </div>
        </div>
      </div>
    </div>
  );
}

function QuestionRow({ q }) {
  const statusConfig = {
    draft:    { label: "DRAFT",    bg: "rgba(180,178,169,0.15)", color: C.textLight },
    pending:  { label: "PENDING",  bg: "rgba(232,160,96,0.12)",   color: C.amber },
    approved: { label: "APPROVED", bg: "rgba(39,174,96,0.1)",     color: C.green },
    rejected: { label: "REJECTED", bg: "rgba(231,76,60,0.1)",     color: C.red },
  }[q.status];

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 14,
      padding: "14px 16px", borderRadius: 12,
      background: "#fff", border: `1px solid ${C.cardBorder}`,
      cursor: "pointer", transition: "all 0.15s",
    }}>
      {/* Content thumbnail */}
      <div style={{
        width: 48, height: 48, borderRadius: 10, flexShrink: 0,
        background: q.image
          ? "linear-gradient(135deg, #f0e8f8, #d0c0e8)"
          : C.pinkLight,
        border: `1px solid ${C.pinkBorder}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: q.image ? 18 : 16,
      }}>
        {q.image ? "📸" : "💬"}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
          <span style={{
            fontSize: 8, fontWeight: 700, padding: "2px 6px", borderRadius: 4,
            background: statusConfig.bg, color: statusConfig.color, letterSpacing: 1,
          }}>{statusConfig.label}</span>
          <span style={{ fontSize: 9, color: C.textLight }}>· {q.submittedAt}</span>
        </div>
        <p style={{
          fontSize: 11, color: C.textMuted, margin: 0,
          fontStyle: "italic", marginBottom: 1,
        }}>{q.prompt}</p>
        <p style={{
          fontSize: 13, fontWeight: 600, color: C.textDark, margin: 0,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {q.text ? `"${q.text}"` : "[image content]"}
          <span style={{ color: C.textMuted, fontWeight: 500 }}> → </span>
          <span style={{ color: C.pink }}>{q.answer}</span>
        </p>
        <p style={{ fontSize: 10, color: C.textLight, margin: 0, marginTop: 2 }}>
          {q.group} · {q.difficulty}
        </p>
        {q.status === "rejected" && q.rejectionReason && (
          <p style={{
            fontSize: 10, color: C.red, margin: "6px 0 0",
            padding: "5px 10px", borderRadius: 6,
            background: "rgba(231,76,60,0.06)", border: "1px solid rgba(231,76,60,0.15)",
          }}>⚠ {q.rejectionReason}</p>
        )}
      </div>

      {q.status === "approved" && (
        <div style={{ display: "flex", gap: 14, flexShrink: 0 }}>
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: 13, fontWeight: 800, color: C.textDark, margin: 0 }}>{q.plays}</p>
            <p style={{ fontSize: 8, color: C.textLight, margin: 0 }}>plays</p>
          </div>
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: 13, fontWeight: 800, color: C.green, margin: 0 }}>{q.solveRate}</p>
            <p style={{ fontSize: 8, color: C.textLight, margin: 0 }}>solve rate</p>
          </div>
        </div>
      )}

      <button style={{
        padding: "6px 12px", borderRadius: 8,
        background: q.status === "draft" ? C.pink : "transparent",
        color: q.status === "draft" ? "#fff" : C.textMuted,
        border: q.status === "draft" ? "none" : `1px solid ${C.cardBorder}`,
        fontSize: 11, fontWeight: 600, cursor: "pointer", flexShrink: 0,
      }}>
        {q.status === "draft" ? "Continue" : q.status === "rejected" ? "Resubmit" : "View"} →
      </button>
    </div>
  );
}

// ═══════════════════════════════════════
// SCREEN 2: UNIFIED FORM (no type selector)
// ═══════════════════════════════════════
function ScreenForm() {
  const [prompt, setPrompt] = useState("What song is this?");
  const [customPrompt, setCustomPrompt] = useState(false);
  const [text, setText] = useState("Stop, look, listen baby\nYou so trendy");
  const [hasImage, setHasImage] = useState(false);
  const [answer, setAnswer] = useState("Pink Venom");
  const [variants, setVariants] = useState(["pink venom"]);
  const [newVariant, setNewVariant] = useState("");
  const [group, setGroup] = useState("BLACKPINK");
  const [difficulty, setDifficulty] = useState("Hard");

  const addVariant = () => {
    if (!newVariant.trim()) return;
    setVariants([...variants, newVariant.trim().toLowerCase()]);
    setNewVariant("");
  };

  const isValid = (text.length > 5 || hasImage) && answer.length > 0 && group && difficulty;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: C.bg }}>
      <SiteNavbar />
      <div style={{ flex: 1, overflowY: "auto", padding: "32px 24px" }}>
        <div style={{ maxWidth: 1080, margin: "0 auto" }}>
          {/* Breadcrumb */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14, fontSize: 11, color: C.textMuted }}>
            <span style={{ cursor: "pointer" }}>Battle</span>
            <span>/</span>
            <span style={{ cursor: "pointer" }}>My questions</span>
            <span>/</span>
            <span style={{ color: C.textDark, fontWeight: 600 }}>New question</span>
          </div>

          <h1 style={{ fontSize: 24, fontWeight: 800, color: C.textDark, margin: 0 }}>
            Create a new question
          </h1>
          <p style={{ fontSize: 12, color: C.textMuted, margin: 0, marginTop: 4, marginBottom: 24 }}>
            Add text, an image, or both — the system figures out the format. Submitting sends an email to the admin for review.
          </p>

          {/* 2-column: form + sticky preview */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 24, alignItems: "flex-start" }}>
            {/* LEFT: form */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

              {/* SECTION 1: The question */}
              <Section title="❓ The question">
                <Field label="What are you asking players?" hint="Pick a common prompt or write your own">
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 6 }}>
                    {PROMPTS.map(p => (
                      <button key={p} onClick={() => { setPrompt(p); setCustomPrompt(false); }} style={{
                        padding: "5px 11px", borderRadius: 999,
                        background: prompt === p && !customPrompt ? C.pink : "#fff",
                        color: prompt === p && !customPrompt ? "#fff" : C.textMuted,
                        border: `1px solid ${prompt === p && !customPrompt ? C.pink : C.cardBorder}`,
                        fontSize: 11, fontWeight: prompt === p && !customPrompt ? 600 : 500, cursor: "pointer",
                      }}>{p}</button>
                    ))}
                    <button onClick={() => setCustomPrompt(true)} style={{
                      padding: "5px 11px", borderRadius: 999,
                      background: customPrompt ? C.pinkLight : "#fff",
                      color: customPrompt ? C.pink : C.textMuted,
                      border: `1px dashed ${customPrompt ? C.pinkBorder : C.cardBorder}`,
                      fontSize: 11, fontWeight: 500, cursor: "pointer",
                    }}>+ Custom</button>
                  </div>
                  {customPrompt && (
                    <input
                      value={prompt}
                      onChange={e => setPrompt(e.target.value)}
                      autoFocus
                      placeholder="e.g. 'Who's the leader of this group?'"
                      style={{
                        width: "100%", padding: "10px 14px", borderRadius: 10,
                        background: C.bg, border: `1.5px solid ${C.pinkBorder}`,
                        fontSize: 12, color: C.textDark, outline: "none", boxSizing: "border-box",
                      }}
                    />
                  )}
                </Field>

                <Field label="Content" hint="Add text, an image, or both — at least one is required">
                  {/* Text */}
                  <div style={{ marginBottom: 10 }}>
                    <p style={{ fontSize: 9, fontWeight: 700, color: C.textLight, textTransform: "uppercase", letterSpacing: 1, margin: 0, marginBottom: 5 }}>
                      💬 Text (optional)
                    </p>
                    <textarea
                      value={text}
                      onChange={e => setText(e.target.value)}
                      placeholder="Lyric, quote, hint... (optional)"
                      rows={3}
                      style={{
                        width: "100%", padding: "10px 14px", borderRadius: 10,
                        background: C.bg, border: `1.5px solid ${C.cardBorder}`,
                        fontSize: 13, fontFamily: "inherit", color: C.textDark,
                        outline: "none", resize: "vertical", boxSizing: "border-box",
                        lineHeight: 1.5,
                      }}
                    />
                  </div>

                  {/* Image */}
                  <div>
                    <p style={{ fontSize: 9, fontWeight: 700, color: C.textLight, textTransform: "uppercase", letterSpacing: 1, margin: 0, marginBottom: 5 }}>
                      📸 Image (optional)
                    </p>
                    {!hasImage ? (
                      <div onClick={() => setHasImage(true)} style={{
                        padding: "20px", borderRadius: 10,
                        background: C.bg, border: `1.5px dashed ${C.cardBorder}`,
                        textAlign: "center", cursor: "pointer",
                      }}>
                        <span style={{ fontSize: 22, opacity: 0.5 }}>📁</span>
                        <p style={{ fontSize: 11, color: C.textMuted, margin: "4px 0 0" }}>
                          Drop image here or click to upload · Max 5MB
                        </p>
                      </div>
                    ) : (
                      <div style={{ display: "flex", gap: 10, alignItems: "center", padding: "10px", borderRadius: 10, background: C.bg, border: `1px solid ${C.cardBorder}` }}>
                        <div style={{
                          width: 60, height: 60, borderRadius: 8, overflow: "hidden", flexShrink: 0,
                          background: "linear-gradient(135deg, #f0e8f8, #d0c0e8)",
                          position: "relative",
                        }}>
                          <div style={{
                            position: "absolute", top: "32%", left: "20%", width: "60%", height: "18%",
                            background: "rgba(0,0,0,0.4)", borderRadius: "50%", filter: "blur(2px)",
                          }} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: 11, fontWeight: 600, color: C.textDark, margin: 0 }}>jungkook_2025.jpg</p>
                          <p style={{ fontSize: 9, color: C.textLight, margin: 0 }}>2.4 MB · 1080×1080</p>
                        </div>
                        <button onClick={() => setHasImage(false)} style={{
                          padding: "5px 10px", borderRadius: 6,
                          background: "rgba(231,76,60,0.05)", border: "1px solid rgba(231,76,60,0.2)",
                          color: C.red, fontSize: 10, fontWeight: 600, cursor: "pointer",
                        }}>Remove</button>
                      </div>
                    )}
                  </div>
                </Field>
              </Section>

              {/* SECTION 2: The answer */}
              <Section title="✅ The answer">
                <Field label="Correct answer" hint="The exact answer players need to type">
                  <input
                    value={answer}
                    onChange={e => setAnswer(e.target.value)}
                    style={{
                      width: "100%", padding: "12px 14px", borderRadius: 10,
                      background: C.bg, border: `1.5px solid ${C.cardBorder}`,
                      fontSize: 14, fontWeight: 600, color: C.textDark,
                      outline: "none", boxSizing: "border-box",
                    }}
                  />
                </Field>
                <Field label="Accepted variants (optional)" hint="Common typos or alternatives. Fuzzy matching auto-handles capitalization, spaces, hyphens.">
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 6 }}>
                    {variants.map(v => (
                      <span key={v} style={{
                        display: "inline-flex", alignItems: "center", gap: 4,
                        padding: "4px 8px 4px 10px", borderRadius: 999,
                        background: C.pinkLight, border: `1px solid ${C.pinkBorder}`,
                        fontSize: 11, color: C.pink, fontFamily: "monospace",
                      }}>
                        {v}
                        <button onClick={() => setVariants(variants.filter(x => x !== v))} style={{
                          border: "none", background: "transparent",
                          color: C.pink, fontSize: 12, cursor: "pointer", padding: 0, lineHeight: 1,
                        }}>×</button>
                      </span>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <input
                      value={newVariant}
                      onChange={e => setNewVariant(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && addVariant()}
                      placeholder="e.g. pinkvenom"
                      style={{
                        flex: 1, padding: "8px 12px", borderRadius: 8,
                        background: C.bg, border: `1px solid ${C.cardBorder}`,
                        fontSize: 11, color: C.textDark, outline: "none",
                      }}
                    />
                    <button onClick={addVariant} style={{
                      padding: "8px 14px", borderRadius: 8,
                      background: "#fff", border: `1px solid ${C.cardBorder}`,
                      color: C.textMuted, fontSize: 11, fontWeight: 600, cursor: "pointer",
                    }}>+ Add</button>
                  </div>
                </Field>
              </Section>

              {/* SECTION 3: Categorization */}
              <Section title="🎵 Categorization">
                <Field label="Group" hint="">
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {GROUPS.map(g => (
                      <button key={g} onClick={() => setGroup(g)} style={{
                        padding: "5px 11px", borderRadius: 6,
                        background: group === g ? C.pink : "#fff",
                        color: group === g ? "#fff" : C.textMuted,
                        border: `1px solid ${group === g ? C.pink : C.cardBorder}`,
                        fontSize: 10, fontWeight: group === g ? 600 : 500, cursor: "pointer",
                      }}>{g}</button>
                    ))}
                  </div>
                </Field>
                <Field label="Difficulty" hint="">
                  <div style={{ display: "flex", gap: 4 }}>
                    {[
                      { id: "Easy",   color: C.green },
                      { id: "Medium", color: C.amber },
                      { id: "Hard",   color: C.red },
                      { id: "Insane", color: C.purple },
                    ].map(d => (
                      <button key={d.id} onClick={() => setDifficulty(d.id)} style={{
                        flex: 1, padding: "8px 0", borderRadius: 8,
                        background: difficulty === d.id ? d.color : "#fff",
                        color: difficulty === d.id ? "#fff" : C.textMuted,
                        border: `1px solid ${difficulty === d.id ? d.color : C.cardBorder}`,
                        fontSize: 11, fontWeight: difficulty === d.id ? 600 : 500, cursor: "pointer",
                      }}>{d.id}</button>
                    ))}
                  </div>
                </Field>
              </Section>

              {/* Submit area */}
              <div style={{
                padding: "12px 16px", borderRadius: 12,
                background: C.pinkLight, border: `1px solid ${C.pinkBorder}`,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <span style={{ fontSize: 16 }}>📧</span>
                  <p style={{ fontSize: 11, color: C.textDark, margin: 0, lineHeight: 1.5 }}>
                    Submitting sends an email to the admin. Reviewed within 48h. You'll get notified when approved.
                  </p>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button style={{
                    flex: 1, padding: "11px 0", borderRadius: 10,
                    background: "#fff", border: `1px solid ${C.cardBorder}`,
                    color: C.textMuted, fontSize: 12, fontWeight: 600, cursor: "pointer",
                  }}>Save as draft</button>
                  <button disabled={!isValid} style={{
                    flex: 2, padding: "11px 0", borderRadius: 10,
                    background: isValid ? C.pink : C.borderLight,
                    color: isValid ? "#fff" : C.textLight,
                    border: "none", fontSize: 12, fontWeight: 700,
                    cursor: isValid ? "pointer" : "default",
                    boxShadow: isValid ? "0 4px 14px rgba(212,83,126,0.3)" : "none",
                  }}>Submit for review →</button>
                </div>
              </div>
            </div>

            {/* RIGHT: live preview (sticky) */}
            <div style={{ position: "sticky", top: 20 }}>
              <p style={{ fontSize: 9, fontWeight: 700, color: C.textLight, textTransform: "uppercase", letterSpacing: 1, margin: 0, marginBottom: 8 }}>
                Live preview — what players will see
              </p>
              <div style={{
                padding: "20px 18px", borderRadius: 16,
                background: "linear-gradient(160deg, #1a0a1e 0%, #2a1035 60%, #3a1848 100%)",
                boxShadow: "0 12px 32px rgba(0,0,0,0.15)",
              }}>
                {/* Difficulty pill */}
                <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
                  <span style={{
                    fontSize: 8, fontWeight: 700, padding: "3px 9px", borderRadius: 6,
                    background: "rgba(212,83,126,0.2)", color: "#fff",
                    textTransform: "uppercase", letterSpacing: 1,
                  }}>{difficulty} · {group}</span>
                </div>

                {/* Image (if present) */}
                {hasImage && (
                  <div style={{
                    width: 180, height: 180, margin: "0 auto 12px",
                    borderRadius: 12, overflow: "hidden",
                    background: "linear-gradient(135deg, #f0e8f8, #d0c0e8)",
                    border: "2px solid rgba(255,255,255,0.15)",
                    position: "relative",
                  }}>
                    <div style={{
                      position: "absolute", top: "32%", left: "20%", width: "60%", height: "18%",
                      background: "rgba(0,0,0,0.5)", borderRadius: "50%", filter: "blur(2px)",
                    }} />
                  </div>
                )}

                {/* Text content (if present) */}
                {text && (
                  <div style={{
                    padding: "14px 14px", borderRadius: 12,
                    background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
                    textAlign: "center", marginBottom: 10,
                  }}>
                    <p style={{
                      fontSize: 14, fontWeight: 600, color: "#fff", margin: 0, lineHeight: 1.5,
                      fontStyle: "italic", whiteSpace: "pre-line",
                    }}>"{text}"</p>
                  </div>
                )}

                {!text && !hasImage && (
                  <div style={{ padding: "30px 14px", textAlign: "center" }}>
                    <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", margin: 0, fontStyle: "italic" }}>
                      Add text or an image to see your preview
                    </p>
                  </div>
                )}

                {/* Question prompt */}
                <p style={{ fontSize: 10, color: "rgba(255,255,255,0.6)", textAlign: "center", margin: "10px 0 8px", fontWeight: 600 }}>
                  {prompt}
                </p>

                {/* Timer + input mock */}
                <div style={{
                  marginTop: 10, padding: "8px 12px", borderRadius: 8,
                  background: "rgba(255,255,255,0.05)",
                  display: "flex", alignItems: "center", gap: 8,
                }}>
                  <span style={{ fontSize: 9, color: "rgba(255,255,255,0.5)" }}>⏱</span>
                  <div style={{ flex: 1, height: 3, borderRadius: 2, background: "rgba(255,255,255,0.1)", overflow: "hidden" }}>
                    <div style={{ width: "70%", height: "100%", background: C.green }} />
                  </div>
                  <span style={{ fontSize: 9, color: "rgba(255,255,255,0.7)", fontFamily: "monospace" }}>10.5s</span>
                </div>
              </div>

              {/* Validation card */}
              <div style={{
                marginTop: 12, padding: "12px 14px", borderRadius: 12,
                background: "#fff", border: `1px solid ${C.cardBorder}`,
              }}>
                <p style={{ fontSize: 9, fontWeight: 700, color: C.textLight, textTransform: "uppercase", letterSpacing: 1, margin: 0, marginBottom: 8 }}>
                  Ready to submit?
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {[
                    { ok: !!prompt, label: "Question prompt picked" },
                    { ok: text.length > 5 || hasImage, label: "Has text or an image" },
                    { ok: answer.length > 0, label: "Has a correct answer" },
                    { ok: !!group, label: "Group selected" },
                    { ok: !!difficulty, label: "Difficulty set" },
                  ].map((v, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{
                        width: 14, height: 14, borderRadius: "50%",
                        background: v.ok ? "rgba(39,174,96,0.15)" : "rgba(180,178,169,0.1)",
                        color: v.ok ? C.green : C.textLight,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 8, fontWeight: 800, flexShrink: 0,
                      }}>{v.ok ? "✓" : "○"}</span>
                      <span style={{ fontSize: 10, color: v.ok ? C.textDark : C.textMuted }}>{v.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════
// SCREEN 3: SUBMITTED (with email focus)
// ═══════════════════════════════════════
function ScreenSubmitted() {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: C.bg }}>
      <SiteNavbar />
      <div style={{ flex: 1, overflowY: "auto", padding: "60px 24px", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ maxWidth: 460, textAlign: "center" }}>
          {/* Animated email + checkmark */}
          <div style={{ position: "relative", display: "inline-block", marginBottom: 18 }}>
            <div style={{
              width: 92, height: 92, borderRadius: "50%",
              background: "linear-gradient(145deg, #27ae60, #1e8449)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 12px 40px rgba(39,174,96,0.3)",
              animation: "popIn 0.5s cubic-bezier(0.34,1.56,0.64,1)",
            }}>
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round">
                <path d="M12 24l8 8 16-18" />
              </svg>
            </div>
            <div style={{
              position: "absolute", top: -4, right: -10,
              width: 36, height: 36, borderRadius: "50%",
              background: "#fff", border: `2px solid ${C.borderLight}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
              fontSize: 16,
            }}>📧</div>
          </div>

          <h1 style={{ fontSize: 26, fontWeight: 800, color: C.textDark, margin: "0 0 6px" }}>
            Sent to admin!
          </h1>
          <p style={{ fontSize: 13, color: C.textMuted, margin: 0, lineHeight: 1.6 }}>
            Your question is now in the admin's inbox. Reviewed within 48h.
          </p>

          {/* Email card */}
          <div style={{
            margin: "20px 0 24px", padding: "12px 14px", borderRadius: 12,
            background: "#fff", border: `1px solid ${C.cardBorder}`,
            textAlign: "left",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, paddingBottom: 8, borderBottom: `1px solid ${C.borderLight}` }}>
              <div style={{
                width: 28, height: 28, borderRadius: 6, background: C.pinkLight,
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14,
              }}>📨</div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 10, color: C.textLight, margin: 0 }}>Email sent to</p>
                <p style={{ fontSize: 12, fontWeight: 700, color: C.textDark, margin: 0, fontFamily: "monospace" }}>
                  admin@kpopquiz.org
                </p>
              </div>
              <span style={{
                fontSize: 8, fontWeight: 700, padding: "2px 7px", borderRadius: 4,
                background: "rgba(232,160,96,0.15)", color: C.amber, textTransform: "uppercase", letterSpacing: 1,
              }}>PENDING</span>
            </div>
            <p style={{ fontSize: 11, color: C.textMuted, margin: 0, lineHeight: 1.5 }}>
              <strong style={{ color: C.textDark }}>Subject:</strong> New Battle question — "Pink Venom" (BLACKPINK · Hard)<br />
              <strong style={{ color: C.textDark }}>From:</strong> @you (chaeyoung)<br />
            </p>
          </div>

          {/* Status timeline */}
          <div style={{
            padding: "14px 16px", borderRadius: 12,
            background: "#fff", border: `1px solid ${C.cardBorder}`,
            textAlign: "left", marginBottom: 18,
          }}>
            <p style={{ fontSize: 9, fontWeight: 700, color: C.textLight, textTransform: "uppercase", letterSpacing: 1, margin: 0, marginBottom: 10 }}>
              What happens next
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              {[
                { state: "done",    icon: "✓",  label: "Sent to admin",     desc: "Just now" },
                { state: "current", icon: "👀", label: "Admin reviews",      desc: "~48 hours · You'll get an email" },
                { state: "future",  icon: "🎉", label: "Approved? +30 별",   desc: "Question goes live in the pool" },
              ].map((s, i) => (
                <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: "50%",
                    background: s.state === "done" ? "rgba(39,174,96,0.15)"
                              : s.state === "current" ? "rgba(232,160,96,0.15)"
                              : "rgba(180,178,169,0.1)",
                    color: s.state === "done" ? C.green
                         : s.state === "current" ? C.amber
                         : C.textLight,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 10, fontWeight: 800, flexShrink: 0,
                    border: s.state === "current" ? `1.5px dashed ${C.amber}` : "none",
                  }}>{s.icon}</div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 11, fontWeight: 600, color: s.state === "future" ? C.textMuted : C.textDark, margin: 0 }}>
                      {s.label}
                    </p>
                    <p style={{ fontSize: 9, color: C.textLight, margin: 0, marginTop: 1 }}>{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button style={{
              flex: 1, padding: "11px 0", borderRadius: 10,
              background: "#fff", border: `1px solid ${C.cardBorder}`,
              color: C.textMuted, fontSize: 12, fontWeight: 600, cursor: "pointer",
            }}>+ Create another</button>
            <button style={{
              flex: 1, padding: "11px 0", borderRadius: 10,
              background: C.pink, color: "#fff", border: "none",
              fontSize: 12, fontWeight: 700, cursor: "pointer",
            }}>View my questions →</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════
// SCREEN 4: ADMIN EMAIL VIEW (this is what YOU see in your inbox)
// ═══════════════════════════════════════
function ScreenAdmin() {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#f0eee9" }}>
      <SiteNavbar />
      <div style={{ flex: 1, overflowY: "auto", padding: "32px 24px" }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          {/* Email header note */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14, fontSize: 11, color: C.textMuted }}>
            <span>📧 What you (admin) see in your inbox</span>
          </div>

          {/* Email envelope */}
          <div style={{
            borderRadius: 14, overflow: "hidden",
            background: "#fff", border: `1px solid ${C.cardBorder}`,
            boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
          }}>
            {/* Email header */}
            <div style={{
              padding: "16px 20px",
              borderBottom: `1px solid ${C.borderLight}`,
              background: C.bg,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: "50%", background: C.pink,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 14, fontWeight: 800, color: "#fff",
                }}>K</div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: C.textDark, margin: 0 }}>
                    KpopQuiz Battle <span style={{ color: C.textLight, fontWeight: 500, fontSize: 11 }}>&lt;noreply@kpopquiz.org&gt;</span>
                  </p>
                  <p style={{ fontSize: 10, color: C.textMuted, margin: 0 }}>
                    to: admin@kpopquiz.org · 2 hours ago
                  </p>
                </div>
                <span style={{
                  fontSize: 8, fontWeight: 700, padding: "2px 7px", borderRadius: 4,
                  background: "rgba(232,160,96,0.15)", color: C.amber,
                  textTransform: "uppercase", letterSpacing: 1,
                }}>REVIEW</span>
              </div>
              <p style={{ fontSize: 16, fontWeight: 700, color: C.textDark, margin: 0 }}>
                New Battle question — "Pink Venom" (BLACKPINK · Hard)
              </p>
            </div>

            {/* Email body */}
            <div style={{ padding: "20px 24px" }}>
              <p style={{ fontSize: 13, color: C.textDark, margin: 0, marginBottom: 16, lineHeight: 1.5 }}>
                Hey,<br />
                <br />
                <strong>@chaeyoung</strong> just submitted a new question for the Battle question pool. Quick review:
              </p>

              {/* Question card */}
              <div style={{
                padding: "14px 16px", borderRadius: 12, marginBottom: 16,
                background: C.bg, border: `1px solid ${C.cardBorder}`,
              }}>
                <p style={{ fontSize: 9, fontWeight: 700, color: C.textLight, textTransform: "uppercase", letterSpacing: 1, margin: 0, marginBottom: 10 }}>
                  The question
                </p>

                {/* Preview as in-game */}
                <div style={{
                  padding: "16px 14px", borderRadius: 10, marginBottom: 12,
                  background: "linear-gradient(160deg, #1a0a1e, #2a1035)",
                  textAlign: "center",
                }}>
                  <p style={{
                    fontSize: 14, fontWeight: 600, color: "#fff", margin: 0, lineHeight: 1.5,
                    fontStyle: "italic",
                  }}>
                    "Stop, look, listen baby<br />
                    You so trendy"
                  </p>
                  <p style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", margin: "8px 0 0" }}>
                    What song is this?
                  </p>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 12 }}>
                  <Row label="Answer">
                    <strong style={{ color: C.textDark }}>Pink Venom</strong>
                  </Row>
                  <Row label="Variants">
                    <span style={{ fontFamily: "monospace", color: C.pink, fontSize: 11 }}>pink venom, pinkvenom</span>
                  </Row>
                  <Row label="Group">
                    <strong style={{ color: C.pink }}>BLACKPINK</strong>
                  </Row>
                  <Row label="Difficulty">
                    <span style={{ color: C.red, fontWeight: 600 }}>Hard</span>
                  </Row>
                  <Row label="Submitter">
                    @chaeyoung · 23 questions submitted (18 approved)
                  </Row>
                </div>
              </div>

              <p style={{ fontSize: 12, color: C.textMuted, margin: "0 0 14px", lineHeight: 1.5 }}>
                One-click decisions below. Or open the full moderation panel if you need to edit before approving.
              </p>

              {/* Action buttons (the email's CTA) */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <a style={{
                  padding: "12px 18px", borderRadius: 10,
                  background: C.green, color: "#fff",
                  fontSize: 13, fontWeight: 700, cursor: "pointer", textDecoration: "none",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  boxShadow: "0 4px 14px rgba(39,174,96,0.3)",
                }}>
                  ✓ Approve & publish
                </a>
                <div style={{ display: "flex", gap: 6 }}>
                  <a style={{
                    flex: 1, padding: "11px 16px", borderRadius: 10,
                    background: "#fff", border: `1.5px solid ${C.amber}`,
                    color: C.amber, fontSize: 12, fontWeight: 600, cursor: "pointer", textDecoration: "none",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                  }}>
                    ✎ Edit on the site
                  </a>
                  <a style={{
                    flex: 1, padding: "11px 16px", borderRadius: 10,
                    background: "rgba(231,76,60,0.05)", border: "1px solid rgba(231,76,60,0.3)",
                    color: C.red, fontSize: 12, fontWeight: 600, cursor: "pointer", textDecoration: "none",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                  }}>
                    ✕ Reject (with reason)
                  </a>
                </div>
              </div>

              <p style={{ fontSize: 10, color: C.textLight, margin: "16px 0 0", lineHeight: 1.5 }}>
                These buttons are signed magic links — clicking takes the action without needing to log in. Expires in 7 days.
              </p>
            </div>

            {/* Email footer */}
            <div style={{
              padding: "10px 20px",
              background: C.bg, borderTop: `1px solid ${C.borderLight}`,
            }}>
              <p style={{ fontSize: 9, color: C.textLight, margin: 0, textAlign: "center" }}>
                Sent automatically by KpopQuiz Battle · 17 questions pending review · <span style={{ color: C.pink, fontWeight: 600, cursor: "pointer" }}>Open admin panel →</span>
              </p>
            </div>
          </div>

          {/* Note about the system */}
          <div style={{
            marginTop: 20, padding: "14px 16px", borderRadius: 12,
            background: C.pinkLight, border: `1px solid ${C.pinkBorder}`,
          }}>
            <p style={{ fontSize: 11, color: C.textDark, margin: 0, lineHeight: 1.6 }}>
              💡 <strong>How email moderation works:</strong> Each submission triggers an email with one-click action buttons (signed magic links).
              Click ✓ Approve and the question goes live instantly. Click ✕ Reject and the user gets notified with your feedback.
              No login required from the email — perfect for moderating from your phone.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════
function Section({ title, children }) {
  return (
    <div style={{
      padding: "16px 18px", borderRadius: 14,
      background: "#fff", border: `1px solid ${C.cardBorder}`,
    }}>
      <p style={{ fontSize: 13, fontWeight: 700, color: C.textDark, margin: 0, marginBottom: 12 }}>{title}</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>{children}</div>
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <div>
      <div style={{ marginBottom: 6 }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: C.textDark, margin: 0 }}>{label}</p>
        {hint && <p style={{ fontSize: 9, color: C.textMuted, margin: 0, marginTop: 1 }}>{hint}</p>}
      </div>
      {children}
    </div>
  );
}

function Row({ label, children }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "3px 0" }}>
      <span style={{ fontSize: 11, color: C.textMuted }}>{label}</span>
      <span style={{ fontSize: 12 }}>{children}</span>
    </div>
  );
}

// ═══════════════════════════════════════
// MAIN
// ═══════════════════════════════════════
export default function QuestionCreationV2() {
  const [screen, setScreen] = useState("hub");
  const Active = {
    hub:       ScreenHub,
    form:      ScreenForm,
    submitted: ScreenSubmitted,
    admin:     ScreenAdmin,
  }[screen];

  return (
    <div style={{
      minHeight: "100vh", padding: "20px", background: "#EDE8E2",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    }}>
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        <div style={{ marginBottom: 12, textAlign: "center" }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: C.textDark, margin: 0 }}>
            Question Creation v2 — JKLM-style (no type selector, email-based moderation)
          </p>
          <p style={{ fontSize: 10, color: C.textMuted, margin: 0, marginTop: 2 }}>
            One unified form: prompt + content (text/image/both) + answer + tags · Submit emails admin · One-click approve/reject from inbox
          </p>
        </div>

        <div style={{ display: "flex", justifyContent: "center", gap: 4, marginBottom: 16, flexWrap: "wrap" }}>
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

        <div style={{
          width: "100%", height: 820,
          background: "#fff", borderRadius: 12, overflow: "hidden",
          boxShadow: "0 8px 40px rgba(0,0,0,0.08)",
          border: `1px solid ${C.cardBorder}`,
        }}>
          {Active && <Active />}
        </div>
      </div>

      <style>{`
        @keyframes popIn {
          0% { transform: scale(0.5); opacity: 0; }
          70% { transform: scale(1.1); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
