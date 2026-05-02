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
  ownedCount?: number;
  onSetFeatured?: () => void;
}

export function CardDetailView({ card, isOwned, ownedCount = 0, onSetFeatured }: CardDetailProps) {
  const router = useRouter();
  const [loaded, setLoaded] = useState(false);
  const g = getGroupMeta(card.group_slug);
  const r = RARITY_CONFIG[card.rarity];
  const isTopTier = card.rarity === 'SSS' || card.rarity === 'SS';

  useEffect(() => {
    setTimeout(() => setLoaded(true), 100);
  }, []);

  const serial = String(card.card_number).padStart(4, '0');
  const dropPct = r.drop;

  return (
    <div style={{
      position: 'relative', minHeight: '80vh',
      background: `radial-gradient(60% 40% at 50% 16%, ${r.color}30, transparent 70%), var(--bg-primary)`,
    }}>
      {/* Top bar */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 10, padding: '0 4px',
      }}>
        <button onClick={() => router.push(`/cards/${card.group_slug}`)} style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          padding: '6px 10px', borderRadius: 10, fontSize: 12, fontWeight: 600,
          background: 'transparent', border: '1px solid var(--border)',
          color: 'var(--text-primary)', cursor: 'pointer',
        }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
          </svg>
          Collection
        </button>
        <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-tertiary)' }}>
          #{serial} {'\u00B7'} {g.name}
        </span>
        <button onClick={() => { if (navigator.share) navigator.share({ title: card.name, url: window.location.href }).catch(() => {}); }} style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          padding: 8, borderRadius: 10, background: 'transparent',
          border: '1px solid var(--border)', cursor: 'pointer',
        }} aria-label="Share">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
          </svg>
        </button>
      </div>

      {/* Hero card with holographic tilt */}
      <div style={{
        margin: '14px auto 18px',
        width: 'min(82%, 320px)',
        position: 'relative',
        opacity: loaded ? 1 : 0,
        transform: loaded ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.9)',
        transition: 'all 0.6s cubic-bezier(0.34,1.56,0.64,1)',
      }}>
        <div className="holo-tilt" style={{
          aspectRatio: '5/7', borderRadius: 22, position: 'relative', overflow: 'hidden',
          background: `linear-gradient(160deg, color-mix(in srgb, ${g.textColor} 80%, #000), ${g.textColor})`,
          boxShadow: `0 30px 60px -16px ${r.color}80, 0 8px 28px -8px rgba(0,0,0,0.45), inset 0 0 0 3px ${r.color}`,
        }}>
          {card.art_url ? (
            <img src={card.art_url} alt={card.name} style={{
              position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover',
              mixBlendMode: 'soft-light', opacity: 0.95,
            }} />
          ) : (
            <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(160deg, color-mix(in srgb, ${g.textColor} 80%, #000), ${g.textColor})` }} />
          )}

          {/* Member monogram circle */}
          <div style={{
            position: 'absolute', left: '50%', top: '38%', transform: 'translateX(-50%)',
            width: '60%', aspectRatio: '1/1', borderRadius: '50%',
            background: `radial-gradient(circle at 35% 30%, color-mix(in srgb, ${g.textColor} 50%, #fff), color-mix(in srgb, ${g.textColor} 80%, #000))`,
            boxShadow: '0 10px 30px rgba(0,0,0,0.4), inset 0 0 0 2px rgba(255,255,255,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 900, fontSize: 64, letterSpacing: '-0.05em',
            textShadow: '0 2px 8px rgba(0,0,0,0.5)',
          }}>{card.name.charAt(0).toUpperCase()}</div>

          <span className="holo-foil" style={{ opacity: isTopTier ? 0.7 : 0.55 }} />
          {isTopTier && <span className="holo-prism" />}
          {isTopTier && <span className="holo-grain" />}

          {/* Bottom darken */}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 35%, rgba(0,0,0,0.6))' }} />

          {/* Top stamp */}
          <div style={{
            position: 'absolute', top: 14, left: 18,
            letterSpacing: '0.16em', fontWeight: 900, textTransform: 'uppercase',
            color: '#fff', textShadow: '0 1px 2px rgba(0,0,0,0.35)', fontSize: 11,
          }}>{g.name} OFFICIAL</div>

          {/* Rarity badge */}
          <div style={{
            position: 'absolute', top: 12, right: 12,
            padding: '6px 12px', borderRadius: 9,
            background: `linear-gradient(140deg, ${r.color}, color-mix(in srgb, ${r.color} 50%, #fff))`,
            color: '#fff', fontSize: 11, fontWeight: 900, letterSpacing: '0.1em',
            boxShadow: `0 4px 14px ${r.color}88, inset 0 1px 0 rgba(255,255,255,0.5)`,
          }}>{r.label}</div>

          {/* Member nameplate */}
          <div style={{
            position: 'absolute', bottom: 22, left: 18, right: 18, color: '#fff', textAlign: 'center',
          }}>
            <div style={{
              fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', opacity: 0.85, textTransform: 'uppercase',
            }}>{g.name} {'\u00B7'} {card.era || 'Bias Card'}</div>
            <div style={{
              fontSize: 32, fontWeight: 900, letterSpacing: '-0.03em', marginTop: 4, lineHeight: 1,
              textShadow: '0 2px 8px rgba(0,0,0,0.5)',
            }}>{card.name}</div>
            <div style={{
              marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 6, fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
              fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', opacity: 0.85,
            }}>
              <span style={{ width: 22, height: 1, background: 'rgba(255,255,255,0.55)' }} />
              <span>#{serial}</span>
              <span style={{ width: 22, height: 1, background: 'rgba(255,255,255,0.55)' }} />
            </div>
          </div>

          <span className="holo-edge" />
        </div>

        {/* Reflection */}
        <div style={{
          position: 'absolute', left: '8%', right: '8%', top: '100%', height: 60,
          background: `linear-gradient(160deg, color-mix(in srgb, ${g.textColor} 80%, #000), ${g.textColor})`,
          borderRadius: '0 0 22px 22px',
          opacity: 0.25, filter: 'blur(6px)',
          transform: 'scaleY(-1)', transformOrigin: 'top',
          maskImage: 'linear-gradient(180deg, rgba(0,0,0,0.7), transparent)',
          WebkitMaskImage: 'linear-gradient(180deg, rgba(0,0,0,0.7), transparent)',
        }} />
      </div>

      {/* Title block */}
      <div style={{ textAlign: 'center', marginTop: 80, marginBottom: 20 }}>
        <div style={{
          fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
          letterSpacing: '0.12em', color: r.color, marginBottom: 4,
        }}>{r.label} {'\u00B7'} {dropPct} drop rate</div>
        <h2 style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.025em', lineHeight: 1.05, margin: 0 }}>{card.name}</h2>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
          {g.name} {'\u00B7'} {card.era || 'Collection'}
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        <StatTile label="In your dex" value={isOwned ? `\u00D7${ownedCount || 1}` : 'Locked'} accent={r.color} />
        <StatTile label="Drop rate" value={dropPct} accent={r.color} />
        <StatTile label="Trade value" value={`${Math.round(parseFloat(dropPct) * -10 + 200)}b`} accent={r.color} />
      </div>

      {/* About */}
      {card.description && (
        <div style={{
          background: 'var(--bg-surface)', border: '1px solid var(--border)',
          borderRadius: 14, boxShadow: 'var(--shadow-card)',
          padding: 16, marginTop: 16,
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-tertiary)', marginBottom: 8 }}>About this card</div>
          <p style={{ fontSize: 13, lineHeight: 1.55, color: 'var(--text-secondary)', margin: 0 }}>{card.description}</p>
        </div>
      )}

      {/* How to get more */}
      <div style={{
        background: 'var(--bg-surface)', border: '1px solid var(--border)',
        borderRadius: 14, boxShadow: 'var(--shadow-card)',
        padding: 16, marginTop: 12, marginBottom: 32,
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-tertiary)', marginBottom: 12 }}>How to get more</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <PullSourceRow label="Standard pack" rate={`${dropPct} per slot`} accent={r.color} />
          <PullSourceRow label={`${g.name} group pack`} rate={`${parseFloat(dropPct) * 2}% per slot`} accent={r.color} bonus />
          <PullSourceRow label="Weekly streak reward" rate="Guaranteed at 7 days" accent={r.color} />
        </div>

        <button onClick={() => router.push('/cards')} style={{
          marginTop: 16, width: '100%',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          padding: '10px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600,
          background: `linear-gradient(110deg, ${r.color}, color-mix(in srgb, ${r.color} 60%, #fff))`,
          color: '#fff', border: 'none', cursor: 'pointer',
          boxShadow: `0 8px 22px ${r.color}55`,
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8L12 2z"/>
          </svg>
          Open a {g.name} pack
        </button>

        {isOwned && onSetFeatured && (
          <button onClick={onSetFeatured} style={{
            marginTop: 8, width: '100%',
            padding: '10px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600,
            background: 'transparent', color: 'var(--text-primary)',
            border: '1px solid var(--border)', cursor: 'pointer',
          }}>
            Set as featured card
          </button>
        )}
      </div>
    </div>
  );
}

function StatTile({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div style={{
      background: 'var(--bg-surface)', border: '1px solid var(--border)',
      borderRadius: 14, boxShadow: 'var(--shadow-card)',
      padding: 12, position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: accent }} />
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-tertiary)', marginTop: 4 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 900, marginTop: 4, letterSpacing: '-0.02em' }}>{value}</div>
    </div>
  );
}

function PullSourceRow({ label, rate, accent, bonus }: { label: string; rate: string; accent: string; bonus?: boolean }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '10px 12px', borderRadius: 10,
      background: bonus ? `color-mix(in srgb, ${accent} 8%, var(--bg-elevated))` : 'var(--bg-elevated)',
      border: `1px solid ${bonus ? `${accent}55` : 'var(--border)'}`,
    }}>
      <div style={{
        width: 28, height: 28, borderRadius: 8,
        background: `linear-gradient(140deg, ${accent}, color-mix(in srgb, ${accent} 50%, #fff))`,
        color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 12, fontWeight: 900,
      }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8L12 2z"/>
        </svg>
      </div>
      <div style={{ flex: 1, fontSize: 13, fontWeight: 700 }}>
        {label}
        {bonus && (
          <span style={{
            marginLeft: 8, padding: '2px 6px', borderRadius: 5,
            background: accent, color: '#fff', fontSize: 9, fontWeight: 800, letterSpacing: '0.06em',
          }}>2x DROP</span>
        )}
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'ui-monospace, "SF Mono", monospace' }}>{rate}</div>
    </div>
  );
}
