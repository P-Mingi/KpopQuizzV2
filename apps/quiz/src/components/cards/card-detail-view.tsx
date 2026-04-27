'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getGroupMeta, RARITY_CONFIG } from '@/lib/cards/constants';
import type { Rarity } from '@/lib/cards/constants';

interface CardDetailProps {
  card: {
    name: string;
    group_slug: string;
    group_name: string;
    rarity: Rarity;
    era: string;
    position?: string;
    card_number: number;
    total_cards: number;
    tags?: string[];
    description?: string;
    art_url?: string | null;
    slug: string;
    idol_info?: {
      real_name?: string;
      birthday?: string;
      nationality?: string;
      height?: string;
      zodiac?: string;
      mbti?: string;
    };
  };
  isOwned: boolean;
  onSetFeatured?: () => void;
}

export function CardDetailView({ card, isOwned, onSetFeatured }: CardDetailProps) {
  const router = useRouter();
  const [loaded, setLoaded] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const g = getGroupMeta(card.group_slug);
  const r = RARITY_CONFIG[card.rarity];

  // Derive accent bg/border from group colors
  const accentBg = `${g.shadowColor.replace(/[\d.]+\)$/, '0.08)')}`;
  const accentBorder = `${g.shadowColor.replace(/[\d.]+\)$/, '0.15)')}`;

  useEffect(() => {
    setTimeout(() => setLoaded(true), 100);
    setTimeout(() => setShowInfo(true), 500);
  }, []);

  const cardNum = String(card.card_number).padStart(3, '0');
  const totalCards = String(card.total_cards).padStart(3, '0');

  const detailRows = [
    card.idol_info?.real_name && ['Real name', card.idol_info.real_name],
    ['Group', card.group_name],
    card.position && ['Position', card.position],
    ['Era', card.era],
    card.idol_info?.birthday && ['Birthday', card.idol_info.birthday],
    card.idol_info?.nationality && ['Nationality', card.idol_info.nationality],
    card.idol_info?.height && ['Height', card.idol_info.height],
    card.idol_info?.zodiac && ['Zodiac', card.idol_info.zodiac],
    card.idol_info?.mbti && ['MBTI', card.idol_info.mbti],
  ].filter(Boolean) as [string, string][];

  return (
    <div style={{
      fontFamily: "'Quicksand', 'Segoe UI', sans-serif",
    }}>
      <div style={{ maxWidth: 440, margin: "0 auto" }}>

        {/* Back nav */}
        <div style={{
          display: "flex", alignItems: "center", gap: 6, marginBottom: 20,
          opacity: loaded ? 1 : 0, transform: loaded ? "translateY(0)" : "translateY(-8px)",
          transition: "all 0.4s ease-out",
        }}>
          <div onClick={() => router.push(`/cards/${card.group_slug}`)} style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#b4b2a9" strokeWidth="1.5" strokeLinecap="round">
              <path d="M10 3L5 8l5 5" />
            </svg>
            <span style={{ fontSize: 11, color: "#b4b2a9", fontWeight: 500 }}>{card.group_name} collection</span>
          </div>
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 9, color: "#d3d1c7" }}>#{cardNum} / {totalCards}</span>
        </div>

        {/* Floating card */}
        <div style={{
          display: "flex", justifyContent: "center", marginBottom: 24,
          opacity: loaded ? 1 : 0,
          transform: loaded ? "translateY(0) scale(1)" : "translateY(20px) scale(0.9)",
          transition: "all 0.6s cubic-bezier(0.34,1.56,0.64,1)",
        }}>
          <div style={{ position: "relative" }}>
            {/* Glow behind card */}
            <div style={{
              position: "absolute", inset: -20,
              background: `radial-gradient(ellipse, ${g.shadowColor}, transparent 70%)`,
              filter: "blur(20px)",
              animation: "cardGlow 3s ease-in-out infinite",
            }} />

            {/* The card */}
            <div style={{
              width: 180, height: 270, borderRadius: 20, overflow: "hidden",
              position: "relative",
              border: `${r.borderWidth}px solid ${g.borderColor}`,
              boxShadow: `0 8px 32px ${g.shadowColor}, 0 0 20px ${g.shadowColor}`,
              animation: "cardFloat 4s ease-in-out infinite",
            }}>
              {card.art_url ? (
                <img src={card.art_url} alt={card.name} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <>
                  <div style={{ position: "absolute", inset: 0, background: g.bg }} />
                  <div style={{ position: "absolute", top: 12, right: 35, width: 16, height: 16, borderRadius: "50%", background: "rgba(255,255,255,0.35)", border: `1px solid ${g.bubbleBorder}` }} />
                  <div style={{ position: "absolute", top: 38, right: 14, width: 10, height: 10, borderRadius: "50%", background: "rgba(255,255,255,0.3)", border: `1px solid ${g.bubbleBorder}` }} />
                  <div style={{ position: "absolute", top: 24, left: 20, width: 8, height: 8, borderRadius: "50%", background: "rgba(255,255,255,0.25)" }} />
                  <div style={{ position: "absolute", top: 60, left: 40, width: 12, height: 12, borderRadius: "50%", background: "rgba(255,255,255,0.2)" }} />
                  <div style={{ position: "absolute", top: 18, left: 12, fontSize: 7, color: g.starColor }}>{'\u2726'}</div>
                  <div style={{ position: "absolute", top: 55, right: 25, fontSize: 5, color: g.starColor }}>{'\u2727'}</div>
                  <div style={{ position: "absolute", top: 42, left: 60, fontSize: 4, color: g.starColor }}>{'\u2726'}</div>
                </>
              )}
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${g.ribbonA}, ${g.ribbonB}, ${g.ribbonA})` }} />
              <div style={{
                position: "absolute", bottom: 0, left: 0, right: 0,
                padding: "22px 10px 12px",
                background: `linear-gradient(transparent, ${g.fadeBg} 30%, ${g.fadeBgStrong})`,
              }}>
                <p style={{ fontSize: 16, fontWeight: 700, color: g.textColor, margin: 0, textAlign: "center" }}>{card.name}</p>
                <p style={{ fontSize: 8, color: g.textMuted, margin: 0, marginTop: 2, textAlign: "center", letterSpacing: 1 }}>{card.group_name} {g.emoji}</p>
              </div>
              {card.tags && card.tags.length > 0 && (
                <div style={{ position: "absolute", bottom: 42, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 3 }}>
                  {card.tags.slice(0, 2).map(t => (
                    <span key={t} style={{ fontSize: 5.5, color: g.textColor, opacity: 0.6, padding: "1px 6px", borderRadius: 10, background: "rgba(255,255,255,0.5)", border: `0.5px solid ${g.bubbleBorder}` }}>{t}</span>
                  ))}
                </div>
              )}
              <div style={{
                position: "absolute", top: 8, right: 8,
                width: 26, height: 26, borderRadius: "50%",
                background: "rgba(255,255,255,0.65)", backdropFilter: "blur(4px)",
                border: `1.5px solid ${g.borderColor}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 10, fontWeight: 800, color: g.textColor,
              }}>{card.rarity}</div>
              <div style={{
                position: "absolute", top: 8, left: 8,
                fontSize: 7, fontWeight: 700, color: g.textColor, opacity: 0.6,
                padding: "2px 6px", borderRadius: 10,
                background: "rgba(255,255,255,0.5)", backdropFilter: "blur(4px)",
              }}>{'\u2661'} {g.abbr}</div>

              {!isOwned && (
                <div style={{
                  position: "absolute", inset: 0, borderRadius: 20,
                  background: "rgba(0,0,0,0.25)", backdropFilter: "blur(2px)",
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" strokeLinecap="round">
                    <rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" />
                  </svg>
                  <p style={{ fontSize: 8, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>Not collected yet</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Card info */}
        <div style={{
          opacity: showInfo ? 1 : 0,
          transform: showInfo ? "translateY(0)" : "translateY(16px)",
          transition: "all 0.5s ease-out",
        }}>
          <div style={{ textAlign: "center", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 4 }}>
              <span style={{ fontSize: 9, color: "#d3d1c7", fontWeight: 500 }}>#{cardNum}</span>
              <span style={{
                fontSize: 9, fontWeight: 800, color: g.textColor,
                padding: "2px 8px", borderRadius: 8,
                background: accentBg, border: `1px solid ${accentBorder}`,
              }}>{card.rarity} {'\u00B7'} {r.drop}</span>
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "#2c2c2a", margin: 0 }}>{card.name}</h2>
            <p style={{ fontSize: 11, color: "#b4b2a9", margin: 0, marginTop: 3 }}>{card.era}</p>
          </div>

          {card.description && (
            <div style={{
              padding: "12px 14px", borderRadius: 14,
              background: "#fff", border: "1px solid rgba(0,0,0,0.04)",
              marginBottom: 8,
            }}>
              <p style={{ fontSize: 9, fontWeight: 700, color: "#b4b2a9", margin: 0, marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>About</p>
              <p style={{ fontSize: 11, color: "#555550", margin: 0, lineHeight: 1.6 }}>{card.description}</p>
            </div>
          )}

          {detailRows.length > 0 && (
            <div style={{
              padding: "12px 14px", borderRadius: 14,
              background: "#fff", border: "1px solid rgba(0,0,0,0.04)",
              marginBottom: 8,
            }}>
              <p style={{ fontSize: 9, fontWeight: 700, color: "#b4b2a9", margin: 0, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>Details</p>
              {detailRows.map(([label, val], i) => (
                <div key={label} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "6px 0",
                  borderBottom: i < detailRows.length - 1 ? "1px solid rgba(0,0,0,0.03)" : "none",
                }}>
                  <span style={{ fontSize: 10, color: "#b4b2a9", fontWeight: 500 }}>{label}</span>
                  <span style={{ fontSize: 10, color: "#2c2c2a", fontWeight: 600 }}>{val}</span>
                </div>
              ))}
            </div>
          )}

          <div style={{
            padding: "12px 14px", borderRadius: 14,
            background: accentBg, border: `1px solid ${accentBorder}`,
            marginBottom: 8,
          }}>
            <p style={{ fontSize: 9, fontWeight: 700, color: "#b4b2a9", margin: 0, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>How to get this card</p>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 10, color: "#888780" }}>Rarity</span>
              <span style={{ fontSize: 10, fontWeight: 700, color: g.textColor }}>{card.rarity} ({r.drop} per slot)</span>
            </div>
            <p style={{ fontSize: 9, color: "#888780", margin: 0, marginBottom: 8 }}>Available in:</p>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {['Standard Pack', `${card.group_name} Group Pack`].map(p => (
                <span key={p} style={{
                  fontSize: 9, fontWeight: 600, color: g.textColor,
                  padding: "4px 10px", borderRadius: 8,
                  background: "rgba(255,255,255,0.6)", border: `1px solid ${accentBorder}`,
                }}>{p}</span>
              ))}
            </div>
            <button
              onClick={() => router.push('/cards')}
              style={{
                width: "100%", marginTop: 12, padding: "10px 0", borderRadius: 10,
                background: g.textColor, color: "#fff", border: "none",
                fontSize: 12, fontWeight: 600, cursor: "pointer",
              }}
            >Open a pack</button>
          </div>

          {isOwned && onSetFeatured && (
            <button
              onClick={onSetFeatured}
              style={{
                width: "100%", padding: "10px 0", borderRadius: 10,
                background: "transparent", border: `1px solid ${accentBorder}`,
                fontSize: 11, fontWeight: 600, color: g.textColor, cursor: "pointer",
              }}
            >{'\u2661'} Set as featured card</button>
          )}
        </div>
      </div>
    </div>
  );
}
