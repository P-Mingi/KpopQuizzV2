'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getGroupMeta } from '@/lib/cards/constants';

// ---- Types (kept for back-compat with cards-landing) ----

interface PulledCard {
  card_id: string;
  card_number: number;
  name: string;
  rarity: string;
  is_new: boolean;
  duplicate_refund: number;
  group_slug: string;
  group_name: string;
  slug: string;
  art_url: string | null;
  tags: string[];
  position: string | null;
}

export interface PackOpenResult {
  pack_open_id: string;
  cards: PulledCard[];
  best_rarity: string;
  total_new: number;
  total_duplicates: number;
  byeol_refunded: number;
  pity_triggered: boolean;
  new_balance: number;
}

interface Props {
  result: PackOpenResult;
  packSlug: string;
  isStarter?: boolean;
  balance: number;
  onClose: () => void;
  onOpenAnother?: ((slug: string) => Promise<PackOpenResult | null>) | undefined;
}

const RARITY_ORDER: Record<string, number> = { R: 1, S: 2, SS: 3, SSS: 4 };

// ---- Component ----

export function PackOpeningOverlay({ result, packSlug, isStarter, balance, onClose, onOpenAnother }: Props) {
  const router = useRouter();
  const [phase, setPhase] = useState('pack');
  const [revealedCards, setRevealedCards] = useState<number[]>([]);
  const [currentResult, setCurrentResult] = useState(result);
  const [currentBalance, setCurrentBalance] = useState(balance);
  const [bestPullIdx, setBestPullIdx] = useState(-1);
  const [showSummary, setShowSummary] = useState(false);
  const [particles, setParticles] = useState<Array<{ id: number; x: number; delay: number; dur: number; size: number; color: string }>>([]);
  const [screenShake, setScreenShake] = useState(false);
  const [showSkip, setShowSkip] = useState(false);
  const audioRef = useRef<AudioContext | null>(null);
  const [scale, setScale] = useState(1);

  const CARDS = currentResult.cards;

  useEffect(() => {
    setCurrentBalance(currentResult.new_balance);
  }, [currentResult]);

  useEffect(() => {
    if (isStarter) return;
    const t = setTimeout(() => setShowSkip(true), 2000);
    return () => clearTimeout(t);
  }, [isStarter]);

  // Responsive scale: bigger cards on wider screens
  useEffect(() => {
    function update() {
      const w = window.innerWidth;
      setScale(w >= 1200 ? 1.8 : w >= 768 ? 1.4 : 1);
    }
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  /** Scale a pixel dimension */
  const s = (v: number) => Math.round(v * scale);
  /** Scale a font size (softer curve) */
  const f = (v: number) => Math.round(v * (1 + (scale - 1) * 0.65));

  function playTone(freq: number, dur: number, type: OscillatorType = 'triangle', vol = 0.08) {
    try {
      if (!audioRef.current) audioRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const ctx = audioRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(vol, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + dur);
    } catch { /* audio not available */ }
  }

  function playChord(freqs: number[], dur: number, delay = 60) {
    freqs.forEach((f, i) => setTimeout(() => playTone(f, dur, 'triangle', 0.06), i * delay));
  }

  function tearPack() {
    setPhase('tearing');
    playTone(200, 0.3, 'sawtooth', 0.04);
    setTimeout(() => playTone(150, 0.2, 'sawtooth', 0.03), 100);

    setTimeout(() => {
      setPhase('burst');
      playChord([400, 500, 600], 0.3, 40);
    }, 700);

    setTimeout(() => {
      setPhase('facedown');
      [0, 1, 2, 3, 4].forEach((i) => {
        setTimeout(() => playTone(300 + i * 40, 0.08, 'sine', 0.03), i * 80);
      });
    }, 1200);

    setTimeout(() => revealNext(0), 2000);
  }

  const revealNext = useCallback((idx: number) => {
    if (idx >= CARDS.length) {
      setTimeout(() => doBestPull(), 600);
      return;
    }
    setPhase('revealing');

    const card = CARDS[idx]!;
    const r = card.rarity;

    if (r === 'R') {
      playTone(400, 0.15, 'sine', 0.05);
    } else if (r === 'S') {
      playChord([500, 630], 0.25, 50);
    } else if (r === 'SS') {
      playChord([400, 500, 630, 800], 0.4, 60);
      setTimeout(() => { setScreenShake(true); setTimeout(() => setScreenShake(false), 400); }, 300);
    } else if (r === 'SSS') {
      playChord([350, 440, 550, 700, 880], 0.6, 70);
      setTimeout(() => { setScreenShake(true); setTimeout(() => setScreenShake(false), 600); }, 200);
    }

    setTimeout(() => {
      if (card.is_new) playTone(880, 0.12, 'sine', 0.04);
      else playTone(180, 0.08, 'sine', 0.03);
    }, 500);

    setRevealedCards(prev => [...prev, idx]);
    setTimeout(() => revealNext(idx + 1), 900);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [CARDS]);

  function doBestPull() {
    const bestIdx = CARDS.reduce((best, c, i) =>
      (RARITY_ORDER[c.rarity] ?? 0) > (RARITY_ORDER[CARDS[best]!.rarity] ?? 0) ? i : best, 0);
    setBestPullIdx(bestIdx);
    setPhase('bestpull');

    const best = CARDS[bestIdx]!;
    const bestG = getGroupMeta(best.group_slug);
    if (best.rarity === 'SS' || best.rarity === 'SSS') {
      playChord([400, 500, 600, 750, 900], 0.5, 80);
      setTimeout(() => playChord([500, 630, 800, 1000], 0.4, 60), 300);
      setParticles(Array.from({ length: 40 }, (_, i) => ({
        id: i, x: Math.random() * 100, delay: Math.random() * 2,
        dur: 3 + Math.random() * 3, size: 3 + Math.random() * 5,
        color: ['#e8a060', '#f0d0a0', '#ffe8c0', '#fff', bestG.textColor][i % 5]!,
      })));
    } else {
      playChord([400, 500, 630], 0.35, 70);
    }

    setTimeout(() => { setShowSummary(true); setPhase('summary'); }, 2500);
  }

  function handleSkip() {
    setRevealedCards(CARDS.map((_, i) => i));
    setShowSummary(true);
    setPhase('summary');
    const bestIdx = CARDS.reduce((best, c, i) =>
      (RARITY_ORDER[c.rarity] ?? 0) > (RARITY_ORDER[CARDS[best]!.rarity] ?? 0) ? i : best, 0);
    setBestPullIdx(bestIdx);
    if (CARDS[bestIdx]!.rarity === 'SS' || CARDS[bestIdx]!.rarity === 'SSS') {
      playChord([400, 500, 600, 750, 900], 0.5, 80);
    }
  }

  async function handleOpenAnother() {
    if (!onOpenAnother) return;
    const newResult = await onOpenAnother(packSlug);
    if (!newResult) return;
    setCurrentResult(newResult);
    setRevealedCards([]);
    setBestPullIdx(-1);
    setShowSummary(false);
    setParticles([]);
    setPhase('pack');
    setShowSkip(false);
    setTimeout(() => setShowSkip(true), 2000);
  }

  const bestCard = bestPullIdx >= 0 ? CARDS[bestPullIdx] : null;
  const bestG = bestCard ? getGroupMeta(bestCard.group_slug) : null;
  const bestIsTopTier = bestCard ? bestCard.rarity === 'SS' || bestCard.rarity === 'SSS' : false;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 100,
      background: "radial-gradient(ellipse at 50% 35%, #1a1028, #0e0818, #080410)",
      fontFamily: "'Quicksand', 'Segoe UI', sans-serif",
      animation: screenShake ? "shake 0.4s ease-out" : "none",
    }}>
      {/* Close */}
      <button onClick={onClose} style={{
        position: "absolute", top: 20, left: 20, zIndex: 110,
        fontSize: 12, color: "rgba(255,255,255,0.15)", background: "transparent",
        border: "none", cursor: "pointer",
      }}>{'\u2715'} Close</button>

      {/* Balance */}
      <div style={{
        position: "absolute", top: 20, right: 20, zIndex: 110,
        display: "flex", alignItems: "center", gap: 6, padding: "6px 12px",
        borderRadius: 8, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)",
      }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#e8a060" }}>{currentBalance}</span>
        <span style={{ fontSize: 9, color: "rgba(255,255,255,0.2)" }}>{'\uBCC4'}</span>
      </div>

      {/* Skip */}
      {showSkip && phase !== 'pack' && phase !== 'summary' && (
        <button onClick={handleSkip} style={{
          position: "absolute", top: 56, right: 20, zIndex: 110,
          padding: "6px 14px", borderRadius: 8,
          fontSize: 11, fontWeight: 500, color: "rgba(255,255,255,0.25)",
          background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)",
          cursor: "pointer",
        }}>Skip {'\u203A'}</button>
      )}

      {/* Ambient sparkles */}
      {Array.from({ length: 20 }).map((_, i) => (
        <div key={`sp${i}`} style={{
          position: "absolute",
          left: `${5 + (i * 47) % 90}%`,
          top: `${5 + (i * 31) % 80}%`,
          width: 2, height: 2, borderRadius: "50%",
          background: "rgba(255,255,255,0.08)",
          animation: `twinkle ${2 + (i % 3)}s ${(i * 0.3) % 2}s infinite`,
        }} />
      ))}

      {/* Falling particles */}
      {particles.map(p => (
        <div key={p.id} style={{
          position: "absolute", left: `${p.x}%`, top: -10,
          width: p.size, height: p.size, borderRadius: "50%",
          background: p.color, zIndex: 5,
          animation: `fall ${p.dur}s ${p.delay}s linear infinite`,
        }} />
      ))}

      {/* PACK DISPLAY */}
      {phase === 'pack' && (
        <div onClick={tearPack} style={{
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          height: "100vh", cursor: "pointer",
        }}>
          <div style={{
            width: s(160), height: s(230), borderRadius: s(18),
            background: "linear-gradient(155deg, #fff0f3, #ffe0e8, #ffd0d8)",
            border: "2.5px solid rgba(255,200,210,0.5)",
            boxShadow: "0 0 40px rgba(255,150,180,0.2), 0 8px 24px rgba(0,0,0,0.3)",
            animation: "packFloat 3s ease-in-out infinite",
            position: "relative", overflow: "hidden",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <div style={{
              position: "absolute", inset: 0,
              background: "linear-gradient(115deg, transparent 20%, rgba(255,255,255,0.25) 40%, transparent 60%)",
              animation: "shimmerSweep 2.5s ease-in-out infinite",
            }} />
            <div style={{
              position: "absolute", inset: 0, opacity: 0.04,
              backgroundImage: "repeating-linear-gradient(45deg, white 0px, white 1px, transparent 1px, transparent 8px)",
            }} />
            <div style={{ textAlign: "center", position: "relative", zIndex: 2 }}>
              <div style={{
                width: s(44), height: s(44), borderRadius: s(12),
                background: "rgba(255,255,255,0.4)", backdropFilter: "blur(8px)",
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: `0 auto ${s(8)}px`, fontSize: s(20),
              }}>{'\uD83C\uDCCF'}</div>
              <p style={{ fontSize: f(12), fontWeight: 700, color: "#d06080", margin: 0 }}>
                {isStarter ? 'Starter Pack' : packSlug === 'standard' ? 'Standard Pack' : 'Group Pack'}
              </p>
              <p style={{ fontSize: f(8), color: "rgba(220,100,140,0.5)", margin: 0, marginTop: 2 }}>
                {isStarter ? 'Welcome gift' : '5 cards inside'}
              </p>
            </div>
          </div>
          <p style={{ fontSize: f(10), color: "rgba(255,255,255,0.15)", marginTop: s(16), animation: "pulseText 2s infinite" }}>Tap to open...</p>
        </div>
      )}

      {/* TEARING */}
      {phase === 'tearing' && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", position: "relative" }}>
          <div style={{
            position: "absolute", width: s(160), height: s(115), borderRadius: `${s(18)}px ${s(18)}px 0 0`, overflow: "hidden",
            background: "linear-gradient(155deg, #fff0f3, #ffe0e8)",
            border: "2.5px solid rgba(255,200,210,0.5)", borderBottom: "none",
            animation: "tearTop 0.7s ease-in forwards",
          }} />
          <div style={{
            position: "absolute", width: s(160), height: s(115), borderRadius: `0 0 ${s(18)}px ${s(18)}px`, overflow: "hidden",
            background: "linear-gradient(155deg, #ffe0e8, #ffd0d8)",
            border: "2.5px solid rgba(255,200,210,0.5)", borderTop: "none",
            animation: "tearBottom 0.7s ease-in forwards",
          }} />
          <div style={{
            position: "absolute", width: s(250), height: s(250), borderRadius: "50%",
            background: "radial-gradient(circle, rgba(255,150,180,0.3), transparent 70%)",
            animation: "burstGlow 0.8s ease-out forwards",
          }} />
        </div>
      )}

      {/* BURST */}
      {phase === 'burst' && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
          <div style={{
            width: s(300), height: s(300), borderRadius: "50%",
            background: "radial-gradient(circle, rgba(255,200,220,0.15), transparent 60%)",
            animation: "burstExpand 0.5s ease-out forwards",
          }} />
        </div>
      )}

      {/* FACE DOWN + REVEALING */}
      {(phase === 'facedown' || phase === 'revealing') && (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          height: "100vh", gap: s(6),
        }}>
          {CARDS.map((card, i) => {
            const isRevealed = revealedCards.includes(i);
            const cardG = getGroupMeta(card.group_slug);
            const isTopTier = card.rarity === 'SS' || card.rarity === 'SSS';
            return (
              <div key={i} style={{
                width: s(62), textAlign: "center",
                animation: !isRevealed && phase === 'facedown' ? `cardLand 0.4s ${i * 0.08}s cubic-bezier(0.34,1.56,0.64,1) both` : "none",
              }}>
                <div style={{
                  width: s(62), height: s(93), borderRadius: s(10), position: "relative",
                  transformStyle: "preserve-3d", perspective: 600,
                }}>
                  {isRevealed ? (
                    <div style={{
                      width: s(62), height: s(93), borderRadius: s(10), overflow: "hidden",
                      position: "relative",
                      border: `2px solid ${cardG.textColor}40`,
                      boxShadow: (RARITY_ORDER[card.rarity] ?? 0) >= 3
                        ? `0 0 ${s(16)}px ${cardG.textColor}30, 0 ${s(4)}px ${s(12)}px rgba(0,0,0,0.3)`
                        : `0 ${s(4)}px ${s(12)}px rgba(0,0,0,0.2)`,
                      animation: "cardRevealPop 0.5s cubic-bezier(0.34,1.56,0.64,1)",
                    }}>
                      {card.art_url ? (
                        <img src={card.art_url} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <div style={{ position: "absolute", inset: 0, background: cardG.bg }} />
                      )}
                      {card.rarity !== 'R' && <span className="holo-foil" />}
                      {isTopTier && <span className="holo-prism" />}
                      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1.5, background: `${cardG.textColor}30` }} />
                      <div style={{
                        position: "absolute", top: s(3), right: s(3),
                        width: s(16), height: s(16), borderRadius: "50%",
                        background: "rgba(255,255,255,0.6)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: f(6), fontWeight: 800, color: cardG.textColor,
                      }}>{card.rarity}</div>
                      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: `${s(10)}px ${s(4)}px ${s(5)}px`, background: "linear-gradient(transparent, rgba(255,248,250,0.9))" }}>
                        <p style={{ fontSize: f(8), fontWeight: 700, color: cardG.textColor, margin: 0, textAlign: "center" }}>{card.name}</p>
                        <p style={{ fontSize: f(5), color: `${cardG.textColor}60`, margin: 0, textAlign: "center" }}>{cardG.abbr}</p>
                      </div>
                      <span className="holo-edge" />
                    </div>
                  ) : (
                    <div style={{
                      width: s(62), height: s(93), borderRadius: s(10),
                      background: "linear-gradient(155deg, #1a1028, #120a20)",
                      border: "1.5px solid rgba(255,255,255,0.06)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      position: "relative", overflow: "hidden",
                    }}>
                      <div style={{
                        position: "absolute", inset: 0, opacity: 0.03,
                        backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.5) 1px, transparent 1px)",
                        backgroundSize: "8px 8px",
                      }} />
                      <span style={{ fontSize: f(10), color: "rgba(255,255,255,0.06)", fontWeight: 800 }}>?</span>
                      <div style={{
                        position: "absolute", inset: 0,
                        background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.04), transparent)",
                        animation: `shimmerCard 2s ${i * 0.3}s infinite`,
                      }} />
                    </div>
                  )}
                </div>
                {isRevealed && (
                  <div style={{ marginTop: s(4), animation: "badgePop 0.3s cubic-bezier(0.34,1.56,0.64,1)" }}>
                    {card.is_new ? (
                      <span style={{ fontSize: f(7), fontWeight: 700, color: "#4CAF50", padding: `1px ${s(6)}px`, borderRadius: 4, background: "rgba(76,175,80,0.12)" }}>NEW</span>
                    ) : (
                      <span style={{ fontSize: f(7), color: "rgba(255,255,255,0.2)" }}>+{card.duplicate_refund}{'\uBCC4'}</span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* BEST PULL */}
      {phase === 'bestpull' && bestCard && bestG && (
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          height: "100vh",
        }}>
          <div style={{ display: "flex", gap: s(3), marginBottom: s(16), opacity: 0.3 }}>
            {CARDS.map((c, i) => {
              const cG = getGroupMeta(c.group_slug);
              return (
                <div key={i} style={{
                  width: s(28), height: s(42), borderRadius: s(6), position: "relative",
                  background: cG.bg, border: `1px solid ${cG.textColor}30`,
                  overflow: "hidden",
                }}>
                  {c.art_url && (
                    <img src={c.art_url} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                  )}
                  <div style={{ position: "absolute", top: 1, right: 1, fontSize: f(4), fontWeight: 800, color: cG.textColor, background: "rgba(255,255,255,0.5)", borderRadius: 3, padding: "0 2px" }}>{c.rarity}</div>
                </div>
              );
            })}
          </div>

          <p style={{ fontSize: f(9), color: "rgba(255,255,255,0.15)", letterSpacing: 3, textTransform: "uppercase", marginBottom: s(8), animation: "fadeUp 0.4s ease-out" }}>Best pull</p>

          <div style={{
            position: "relative",
            animation: "bestCardZoom 0.8s cubic-bezier(0.34,1.56,0.64,1)",
          }}>
            <div style={{
              position: "absolute", inset: -s(24), borderRadius: s(36),
              background: `radial-gradient(ellipse, ${bestG.textColor}${bestIsTopTier ? '40' : '25'}, transparent 70%)`,
              animation: "bestGlow 2.5s ease-in-out infinite",
            }} />
            <div style={{
              width: s(140), height: s(210), borderRadius: s(20), overflow: "hidden",
              position: "relative",
              border: `3px solid ${bestG.textColor}50`,
              boxShadow: bestIsTopTier
                ? `0 0 ${s(40)}px ${bestG.textColor}40, 0 0 ${s(80)}px ${bestG.textColor}20, 0 ${s(8)}px ${s(24)}px rgba(0,0,0,0.3)`
                : `0 0 ${s(30)}px ${bestG.textColor}20, 0 ${s(8)}px ${s(24)}px rgba(0,0,0,0.3)`,
            }}>
              {bestCard.art_url ? (
                <img src={bestCard.art_url} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <div style={{ position: "absolute", inset: 0, background: bestG.bg }} />
              )}
              {bestCard.rarity !== 'R' && <span className="holo-foil" />}
              {bestIsTopTier && <span className="holo-prism" />}
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `${bestG.textColor}30` }} />
              <div style={{
                position: "absolute", top: s(8), right: s(8),
                width: s(24), height: s(24), borderRadius: "50%",
                background: "rgba(255,255,255,0.65)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: f(9), fontWeight: 800, color: bestG.textColor,
              }}>{bestCard.rarity}</div>
              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: `${s(20)}px ${s(10)}px ${s(12)}px`, background: "linear-gradient(transparent, rgba(255,248,250,0.9))" }}>
                <p style={{ fontSize: f(15), fontWeight: 700, color: bestG.textColor, margin: 0, textAlign: "center" }}>{bestCard.name}</p>
                <p style={{ fontSize: f(7), color: `${bestG.textColor}60`, margin: 0, marginTop: 2, textAlign: "center" }}>{bestG.abbr}</p>
              </div>
              <span className="holo-edge" />
            </div>
          </div>

          <p style={{
            marginTop: s(12), fontSize: f(18), fontWeight: 800, color: bestG.textColor,
            letterSpacing: 3, textShadow: `0 0 20px ${bestG.textColor}40`,
            animation: "fadeUp 0.5s 0.3s both",
          }}>{bestCard.rarity} PULL!</p>
        </div>
      )}

      {/* SUMMARY */}
      {showSummary && (
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0,
          padding: s(16),
          background: "linear-gradient(transparent, rgba(8,4,16,0.95) 20%)",
          animation: "slideUp 0.4s ease-out",
        }}>
          <div style={{
            padding: s(14), borderRadius: s(14),
            background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)",
            backdropFilter: "blur(12px)",
            maxWidth: s(400), margin: "0 auto",
          }}>
            {/* Mini cards row */}
            <div style={{ display: "flex", justifyContent: "center", gap: s(4), marginBottom: s(8) }}>
              {CARDS.map((card, i) => {
                const cG = getGroupMeta(card.group_slug);
                return (
                  <div key={i} style={{
                    width: s(36), height: s(54), borderRadius: s(6), position: "relative",
                    background: cG.bg, border: `1px solid ${cG.textColor}30`,
                    overflow: "hidden",
                  }}>
                    {card.art_url && (
                      <img src={card.art_url} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                    )}
                    <div style={{ position: "absolute", top: 1, right: 1, fontSize: f(4), fontWeight: 800, color: cG.textColor, background: "rgba(255,255,255,0.5)", borderRadius: 3, padding: "0 2px" }}>{card.rarity}</div>
                    {card.is_new && (
                      <div style={{ position: "absolute", top: 1, left: 1, fontSize: f(3), fontWeight: 700, color: "#4CAF50", background: "rgba(76,175,80,0.15)", borderRadius: 2, padding: "0 2px" }}>NEW</div>
                    )}
                  </div>
                );
              })}
            </div>

            <div style={{ display: "flex", justifyContent: "center", gap: s(6), marginBottom: s(6) }}>
              {['R', 'S', 'SS', 'SSS'].map(r => {
                const count = CARDS.filter(c => c.rarity === r).length;
                return count > 0 ? (
                  <span key={r} style={{ fontSize: f(11), fontWeight: 700, color: "#fff" }}>{count}{'\u00D7'} {r}</span>
                ) : null;
              })}
            </div>
            <p style={{ fontSize: f(9), color: "rgba(255,255,255,0.2)", textAlign: "center", marginBottom: s(10) }}>
              {currentResult.total_new} new {'\u00B7'} {currentResult.total_duplicates} duplicate{currentResult.total_duplicates !== 1 ? 's' : ''} (+{currentResult.byeol_refunded}{'\uBCC4'})
              {currentResult.pity_triggered && ' \u00B7 \uD83C\uDF40 pity'}
            </p>

            {isStarter && (
              <p style={{ textAlign: "center", fontSize: f(11), color: "#D4537E", fontWeight: 600, marginBottom: s(8) }}>
                Welcome to your collection!
              </p>
            )}

            <div style={{ display: "flex", gap: s(6) }}>
              {!isStarter && onOpenAnother && (
                <button onClick={handleOpenAnother} disabled={currentBalance < 100} style={{
                  flex: 1, padding: `${s(10)}px 0`, borderRadius: s(10),
                  background: currentBalance >= 100 ? "#D4537E" : "rgba(255,255,255,0.05)",
                  color: currentBalance >= 100 ? "#fff" : "rgba(255,255,255,0.15)",
                  border: "none", fontSize: f(11), fontWeight: 700, cursor: currentBalance >= 100 ? "pointer" : "default",
                }}>Open another (100{'\uBCC4'})</button>
              )}
              <button onClick={() => { onClose(); router.push('/cards/collection'); }} style={{
                flex: 1, padding: `${s(10)}px 0`, borderRadius: s(10),
                background: "transparent", color: "rgba(255,255,255,0.35)",
                border: "1px solid rgba(255,255,255,0.06)",
                fontSize: f(11), fontWeight: 500, cursor: "pointer",
              }}>Collection</button>
            </div>
            <button onClick={onClose} style={{
              width: "100%", marginTop: s(6), padding: `${s(6)}px 0`,
              background: "transparent", border: "none",
              fontSize: f(9), color: "rgba(255,255,255,0.1)", cursor: "pointer",
            }}>{isStarter ? 'Explore cards' : 'Done'}</button>
          </div>
        </div>
      )}
    </div>
  );
}
