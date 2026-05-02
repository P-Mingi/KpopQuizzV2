/* global React, Icon, fmtCount, GroupLogo, Avatar, SectionHead, MiniQuizRow */
const { useState: useSb, useMemo: useMb, useEffect: useEb, useRef: useRb } = React;

// ───────────────────────────────────────────────────────────────────────────
// CARDS COLLECTION
// ───────────────────────────────────────────────────────────────────────────
function CardsPage({ onBack, onOpenCard, onOpenPack }) {
  const [filter, setFilter] = useSb('all');
  const cards = useMb(() => {
    if (filter === 'owned') return window.CARDS.filter((c) => c.owned);
    if (filter === 'missing') return window.CARDS.filter((c) => !c.owned);
    if (filter !== 'all') return window.CARDS.filter((c) => c.rarity === filter);
    return window.CARDS;
  }, [filter]);

  const owned = window.CARDS.filter((c) => c.owned).length;
  const total = window.CARDS.length;

  return (
    <div className="anim-fadeSlideUp" style={{ paddingTop: 12 }}>
      <button onClick={onBack} className="btn btn-ghost" style={{ marginBottom: 12, padding: '6px 10px', fontSize: 12 }}>
        <Icon.ArrowLeft size={12} /> Back
      </button>

      <div className="card" style={{
        padding: 18, marginBottom: 16, position: 'relative', overflow: 'hidden',
        background: 'linear-gradient(135deg, var(--accent-bg), color-mix(in srgb, var(--accent-bg) 70%, var(--bg-surface)))',
        borderColor: 'var(--accent-light)'
      }}>
        <div className="kicker" style={{ color: 'var(--accent)', marginBottom: 4 }}>Your collection</div>
        <h1 className="h-display" style={{ fontSize: 28 }}>{owned} <span style={{ color: 'var(--text-tertiary)' }}>/ {total} cards</span></h1>
        <div style={{ marginTop: 12, height: 8, background: 'rgba(255,255,255,0.5)', borderRadius: 9999, overflow: 'hidden' }}>
          <div style={{ width: `${owned / total * 100}%`, height: '100%', background: 'var(--accent)', borderRadius: 9999 }}></div>
        </div>
        <button onClick={onOpenPack} className="btn btn-primary" style={{ marginTop: 14, width: '100%' }}>
          <Icon.Sparkle size={14} /> Open booster pack · 200 byeol
        </button>
      </div>

      <div className="scrollbar-hide" style={{ display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 14, paddingBottom: 4 }}>
        {[
        { id: 'all', label: 'All' },
        { id: 'owned', label: 'Owned' },
        { id: 'missing', label: 'Missing' },
        { id: 'SSS', label: 'SSS', color: window.RARITIES.SSS.color },
        { id: 'SS', label: 'SS', color: window.RARITIES.SS.color },
        { id: 'SSR', label: 'SSR', color: window.RARITIES.SSR.color },
        { id: 'SR', label: 'SR', color: window.RARITIES.SR.color },
        { id: 'R', label: 'R', color: window.RARITIES.R.color }].
        map((t) =>
        <button key={t.id} onClick={() => setFilter(t.id)} style={{
          padding: '6px 12px', borderRadius: 9999,
          border: '1px solid ' + (filter === t.id ? 'var(--text-primary)' : 'var(--border)'),
          background: filter === t.id ? 'var(--text-primary)' : 'var(--bg-surface)',
          color: filter === t.id ? 'var(--bg-primary)' : 'var(--text-primary)',
          fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0,
          display: 'inline-flex', alignItems: 'center', gap: 6
        }}>
            {t.color && <span style={{ width: 6, height: 6, borderRadius: '50%', background: t.color }}></span>}
            {t.label}
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        {cards.map((c) => <CardTile key={c.id} card={c} onClick={() => c.owned && onOpenCard(c)} />)}
      </div>
    </div>);

}

function CardTile({ card, onClick }) {
  const g = window.GROUPS.find((x) => x.slug === card.group);
  const r = window.RARITIES[card.rarity];

  // Tier styling
  const tier = card.rarity;
  const isTopTier = tier === 'SSS' || tier === 'SS';
  const isMid = tier === 'SSR';

  // Photo art is mocked with a layered gradient using the group color + rarity color.
  const artBg = `
    radial-gradient(120% 80% at 30% 0%, color-mix(in srgb, ${r.color} 75%, #fff) 0%, transparent 55%),
    radial-gradient(120% 100% at 80% 100%, color-mix(in srgb, ${g.color} 90%, #000) 0%, transparent 60%),
    linear-gradient(160deg, ${r.color}, color-mix(in srgb, ${g.color} 70%, #000))
  `;

  if (!card.owned) {
    return (
      <button onClick={() => {}} style={{
        cursor: 'default', position: 'relative', aspectRatio: '5/7', borderRadius: 14,
        border: '1.5px dashed var(--border)',
        background: 'linear-gradient(180deg, var(--bg-elevated), var(--bg-surface))',
        padding: 0, overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute', top: 8, left: 8,
          padding: '3px 8px', borderRadius: 6, background: 'var(--bg-surface)',
          border: '1px solid var(--border)', color: 'var(--text-tertiary)',
          fontSize: 9, fontWeight: 800, letterSpacing: '0.08em'
        }}>{r.label}</div>
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 6, color: 'var(--text-tertiary)'
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            border: '1.5px dashed var(--text-tertiary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18
          }}>?</div>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Locked</div>
        </div>
        <div style={{
          position: 'absolute', bottom: 10, left: 0, right: 0, textAlign: 'center',
          fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase',
          letterSpacing: '0.06em'
        }}>{g.name}</div>
      </button>);

  }

  return (
    <button onClick={onClick} style={{
      cursor: 'pointer', position: 'relative', aspectRatio: '5/7',
      borderRadius: 14, padding: 0, border: 0,
      background: 'transparent',
      filter: `drop-shadow(0 14px 24px ${r.color}40)`,
      transition: 'transform 200ms ease'
    }}
    onMouseEnter={(e) => {e.currentTarget.style.transform = 'translateY(-3px) scale(1.015)';}}
    onMouseLeave={(e) => {e.currentTarget.style.transform = 'translateY(0) scale(1)';}}>
      <div style={{
        position: 'absolute', inset: 0, borderRadius: 14, overflow: 'hidden',
        background: `linear-gradient(160deg, color-mix(in srgb, ${g.color} 80%, #000), ${g.color})`,
        boxShadow: `inset 0 0 0 2px ${r.color}, 0 6px 20px -4px ${r.color}55`
      }}>
        {/* Group photo — FULL BLEED, no blend mode */}
        <img src={g.logo} alt={card.member} style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%',
          objectFit: 'cover'
        }} />

        {/* Foil sheen for SR+ */}
        {tier !== 'R' && <span className="holo-foil" />}
        {isTopTier && <span className="holo-prism" />}
        {isTopTier && <span className="holo-grain" />}

        {/* Bottom darken for legibility — only the lower 50% */}
        <div style={{
          position: 'absolute', inset: 0,
          background: `linear-gradient(180deg, transparent 50%, rgba(0,0,0,0.4) 75%, rgba(0,0,0,0.85) 100%)`
        }}></div>

        {/* Top stamp */}
        <div className="holo-stamp" style={{ top: 8, left: 10 }}>
          {g.name.replace(/\s/g, '')}
        </div>

        {/* Rarity gem (top-right) */}
        <div style={{
          position: 'absolute', top: 6, right: 6,
          padding: '3px 7px', borderRadius: 6,
          background: `linear-gradient(140deg, ${r.color}, color-mix(in srgb, ${r.color} 50%, #fff))`,
          color: '#fff',
          fontSize: 9, fontWeight: 900, letterSpacing: '0.08em',
          boxShadow: `0 2px 6px ${r.color}66, inset 0 1px 0 rgba(255,255,255,0.4)`
        }}>{r.label}</div>

        {/* Duplicate count chip */}
        {card.ownedCount > 1 &&
        <div style={{
          position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)',
          padding: '2px 7px', borderRadius: 9999,
          background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)',
          color: '#fff', fontSize: 9, fontWeight: 800, letterSpacing: '0.04em'
        }}>×{card.ownedCount}</div>
        }

        {/* Member name plate (bottom) */}
        <div style={{
          position: 'absolute', bottom: 8, left: 10, right: 10,
          color: '#fff', textAlign: 'left'
        }}>
          <div style={{
            fontSize: 8, fontWeight: 700, letterSpacing: '0.16em',
            opacity: 0.85, textTransform: 'uppercase'
          }}>{g.fandom}</div>
          <div style={{
            fontSize: 16, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.05,
            textShadow: '0 1px 6px rgba(0,0,0,0.65)',
            marginTop: 2
          }}>{card.member}</div>
        </div>

        {/* Embossed inner edge */}
        <span className="holo-edge" />
      </div>
    </button>);

}

// ───────────────────────────────────────────────────────────────────────────
// CARD DETAIL — cinematic, holographic
// ───────────────────────────────────────────────────────────────────────────
function CardDetail({ card, onBack }) {
  const g = window.GROUPS.find((x) => x.slug === card.group);
  const r = window.RARITIES[card.rarity];
  const tier = card.rarity;
  const isTopTier = tier === 'SSS' || tier === 'SS';

  const artBg = `
    radial-gradient(120% 80% at 30% 0%, color-mix(in srgb, ${r.color} 75%, #fff) 0%, transparent 55%),
    radial-gradient(120% 100% at 80% 100%, color-mix(in srgb, ${g.color} 90%, #000) 0%, transparent 60%),
    linear-gradient(160deg, ${r.color}, color-mix(in srgb, ${g.color} 70%, #000))
  `;

  // Card serial — deterministic from id
  const serial = String(parseInt(card.id.slice(1)) * 73).padStart(4, '0');

  return (
    <div className="anim-fadeSlideUp" style={{
      paddingTop: 12, position: 'relative', minHeight: '100vh',
      // ambient glow
      background: `
        radial-gradient(60% 40% at 50% 16%, ${r.color}30, transparent 70%),
        var(--bg-primary)
      `,
      marginInline: 'calc(-1 * var(--shell-pad-x, 16px))',
      paddingInline: 'var(--shell-pad-x, 16px)'
    }}>
      {/* Top bar */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 10
      }}>
        <button onClick={onBack} className="btn btn-ghost" style={{ padding: '6px 10px', fontSize: 12 }}>
          <Icon.ArrowLeft size={12} /> Collection
        </button>
        <div className="kicker" style={{ color: 'var(--text-tertiary)' }}>
          #{serial} · {g.name}
        </div>
        <button className="btn btn-ghost" style={{ padding: 8 }} aria-label="Share">
          <Icon.Share size={14} />
        </button>
      </div>

      {/* Hero card */}
      <div style={{
        margin: '14px auto 18px',
        width: 'min(82%, 320px)',
        position: 'relative'
      }}>
        <div className="holo-tilt" style={{
          aspectRatio: '5/7', borderRadius: 22, position: 'relative', overflow: 'hidden',
          background: artBg,
          boxShadow: `
            0 30px 60px -16px ${r.color}80,
            0 8px 28px -8px rgba(0,0,0,0.45),
            inset 0 0 0 3px ${r.color}
          `
        }}>
          <img src={g.logo} alt={g.name} style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%',
            objectFit: 'cover', mixBlendMode: 'soft-light', opacity: 0.95
          }} />

          <span className="holo-foil" style={{ opacity: isTopTier ? 0.7 : 0.55 }} />
          {isTopTier && <span className="holo-prism" />}
          {isTopTier && <span className="holo-grain" />}

          {/* Bottom darken */}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 35%, rgba(0,0,0,0.6))' }}></div>

          {/* Top stamp */}
          <div className="holo-stamp" style={{ top: 14, left: 18, fontSize: 11 }}>
            {g.fandom} OFFICIAL
          </div>

          {/* Rarity badge */}
          <div style={{
            position: 'absolute', top: 12, right: 12,
            padding: '6px 12px', borderRadius: 9,
            background: `linear-gradient(140deg, ${r.color}, color-mix(in srgb, ${r.color} 50%, #fff))`,
            color: '#fff',
            fontSize: 11, fontWeight: 900, letterSpacing: '0.1em',
            boxShadow: `0 4px 14px ${r.color}88, inset 0 1px 0 rgba(255,255,255,0.5)`
          }}>{r.label}</div>

          {/* Member monogram circle */}
          <div style={{
            position: 'absolute', left: '50%', top: '38%', transform: 'translateX(-50%)',
            width: '60%', aspectRatio: '1/1', borderRadius: '50%',
            background: `radial-gradient(circle at 35% 30%, color-mix(in srgb, ${g.color} 50%, #fff), color-mix(in srgb, ${g.color} 80%, #000))`,
            boxShadow: `0 10px 30px rgba(0,0,0,0.4), inset 0 0 0 2px rgba(255,255,255,0.4)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 900, fontSize: 64, letterSpacing: '-0.05em',
            textShadow: '0 2px 8px rgba(0,0,0,0.5)'
          }}>{card.member.charAt(0).toUpperCase()}</div>

          {/* Member nameplate */}
          <div style={{
            position: 'absolute', bottom: 22, left: 18, right: 18, color: '#fff', textAlign: 'center'
          }}>
            <div style={{
              fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', opacity: 0.85,
              textTransform: 'uppercase'
            }}>{g.name} · Bias Card</div>
            <div style={{
              fontSize: 32, fontWeight: 900, letterSpacing: '-0.03em', marginTop: 4, lineHeight: 1,
              textShadow: '0 2px 8px rgba(0,0,0,0.5)'
            }}>{card.member}</div>
            {/* Decorative serial line */}
            <div style={{
              marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 6, fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
              fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', opacity: 0.85
            }}>
              <span style={{ width: 22, height: 1, background: 'rgba(255,255,255,0.55)' }}></span>
              <span>#{serial}</span>
              <span style={{ width: 22, height: 1, background: 'rgba(255,255,255,0.55)' }}></span>
            </div>
          </div>

          <span className="holo-edge" />
        </div>

        {/* Reflection */}
        <div style={{
          position: 'absolute', left: '8%', right: '8%', top: '100%', height: 60,
          background: artBg, borderRadius: '0 0 22px 22px',
          opacity: 0.25, filter: 'blur(6px)',
          transform: 'scaleY(-1)', transformOrigin: 'top',
          maskImage: 'linear-gradient(180deg, rgba(0,0,0,0.7), transparent)'
        }}></div>
      </div>

      {/* Title block */}
      <div style={{ textAlign: 'center', marginTop: 80, marginBottom: 20 }}>
        <div className="kicker" style={{ color: r.color, marginBottom: 4 }}>
          {r.label} · {(r.weight * 100).toFixed(0)}% drop rate
        </div>
        <h2 className="h-display" style={{ fontSize: 30, lineHeight: 1.05 }}>{card.member}</h2>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
          {g.name} · {g.fandom}
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        <StatTile label="In your dex" value={`×${card.ownedCount}`} accent={r.color} />
        <StatTile label="Drop rate" value={`${(r.weight * 100).toFixed(0)}%`} accent={r.color} />
        <StatTile label="Trade value" value={`${Math.round(r.weight * -1 * 1000 + 200)}b`} accent={r.color} />
      </div>

      {/* Lore card */}
      <div className="card" style={{ padding: 16, marginTop: 16 }}>
        <div className="kicker" style={{ marginBottom: 8 }}>About this card</div>
        <p style={{ fontSize: 13, lineHeight: 1.55, color: 'var(--text-secondary)' }}>
          Pulled from the <strong>{g.name} signature pack</strong>. {r.label}-tier cards include a
          holographic foil treatment and a numbered serial — they&apos;re the rarest you&apos;ll find in
          a standard pack opening.
        </p>
      </div>

      {/* How to get more */}
      <div className="card" style={{ padding: 16, marginTop: 12, marginBottom: 32 }}>
        <div className="kicker" style={{ marginBottom: 12 }}>How to get more</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <PullSourceRow label="Standard pack" rate={`${(r.weight * 100).toFixed(0)}% per slot`} accent={r.color} />
          <PullSourceRow label={`${g.name} group pack`} rate={`${(r.weight * 200).toFixed(0)}% per slot`} accent={r.color} bonus />
          <PullSourceRow label="Weekly streak reward" rate="Guaranteed at 7 days" accent={r.color} />
        </div>

        <button className="btn btn-primary" style={{
          marginTop: 16, width: '100%',
          background: `linear-gradient(110deg, ${r.color}, color-mix(in srgb, ${r.color} 60%, #fff))`,
          borderColor: r.color,
          boxShadow: `0 8px 22px ${r.color}55`
        }}>
          <Icon.Sparkle size={14} /> Open a {g.name} pack
        </button>
        <button className="btn btn-ghost" style={{ marginTop: 8, width: '100%' }}>
          Trade duplicates for byeol
        </button>
      </div>
    </div>);

}

function StatTile({ label, value, accent }) {
  return (
    <div className="card" style={{ padding: 12, position: 'relative', overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: accent
      }}></div>
      <div className="kicker" style={{ marginTop: 4 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 900, marginTop: 4, letterSpacing: '-0.02em' }}>{value}</div>
    </div>);

}

function PullSourceRow({ label, rate, accent, bonus }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '10px 12px', borderRadius: 10,
      background: bonus ? `color-mix(in srgb, ${accent} 8%, var(--bg-elevated))` : 'var(--bg-elevated)',
      border: '1px solid ' + (bonus ? `${accent}55` : 'var(--border-subtle)')
    }}>
      <div style={{
        width: 28, height: 28, borderRadius: 8,
        background: `linear-gradient(140deg, ${accent}, color-mix(in srgb, ${accent} 50%, #fff))`,
        color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 12, fontWeight: 900
      }}>★</div>
      <div style={{ flex: 1, fontSize: 13, fontWeight: 700 }}>
        {label}
        {bonus && <span style={{
          marginLeft: 8, padding: '2px 6px', borderRadius: 5,
          background: accent, color: '#fff', fontSize: 9, fontWeight: 800, letterSpacing: '0.06em'
        }}>2× DROP</span>}
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'ui-monospace, "SF Mono", monospace' }}>{rate}</div>
    </div>);

}

// ───────────────────────────────────────────────────────────────────────────
// PACK OPENING
// ───────────────────────────────────────────────────────────────────────────
function PackOpeningPage({ onBack }) {
  const [stage, setStage] = useSb('idle'); // idle | opening | reveal
  const [revealed, setRevealed] = useSb([]);

  useEb(() => {
    if (stage === 'opening') {
      const t = setTimeout(() => {
        // Pick 5 random cards weighted by rarity
        const picks = [];
        for (let i = 0; i < 5; i++) {
          const r = Math.random();
          let rarity = 'R';
          if (r > 0.98) rarity = 'SSS';else
          if (r > 0.92) rarity = 'SS';else
          if (r > 0.80) rarity = 'SSR';else
          if (r > 0.55) rarity = 'SR';
          const eligible = window.CARDS.filter((c) => c.rarity === rarity);
          picks.push(eligible[Math.floor(Math.random() * eligible.length)] || window.CARDS[0]);
        }
        setRevealed(picks);
        setStage('reveal');
      }, 1800);
      return () => clearTimeout(t);
    }
  }, [stage]);

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 100,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20
    }}>
      <button onClick={onBack} className="btn btn-ghost" style={{
        position: 'absolute', top: 16, right: 16, color: '#fff', background: 'rgba(255,255,255,0.1)', borderColor: 'rgba(255,255,255,0.2)'
      }}>
        <Icon.X size={14} /> Close
      </button>

      {stage === 'idle' &&
      <div style={{ textAlign: 'center', color: '#fff' }}>
          <div style={{
          width: 200, height: 280, margin: '0 auto', borderRadius: 18,
          background: 'linear-gradient(160deg, var(--accent), #7F77DD)',
          boxShadow: '0 0 80px rgba(212,83,126,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          position: 'relative', animation: 'mascot-idle-kf 2.5s ease-in-out infinite'
        }}>
            <div style={{ fontSize: 64 }}>✨</div>
            <div style={{ position: 'absolute', top: 12, left: 12, right: 12, fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Booster Pack</div>
            <div style={{ position: 'absolute', bottom: 14, left: 12, right: 12, fontSize: 10, opacity: 0.8 }}>5 cards · 200 byeol</div>
          </div>
          <button onClick={() => setStage('opening')} className="btn btn-primary" style={{ marginTop: 28, padding: '14px 32px', fontSize: 15 }}>
            Tap to open
          </button>
        </div>
      }

      {stage === 'opening' &&
      <div style={{ textAlign: 'center', color: '#fff' }}>
          <div style={{
          width: 200, height: 280, margin: '0 auto', borderRadius: 18,
          background: 'linear-gradient(160deg, var(--accent), #7F77DD)',
          boxShadow: '0 0 120px rgba(212,83,126,0.9)',
          position: 'relative', overflow: 'hidden',
          animation: 'shake 0.4s ease-in-out infinite'
        }}>
            <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at center, rgba(255,255,255,0.6), transparent)', animation: 'cardGlow 0.8s ease-in-out infinite' }}></div>
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: 80 }}>✨</div>
          </div>
          <div className="kicker" style={{ marginTop: 24, color: 'rgba(255,255,255,0.7)' }}>Opening...</div>
        </div>
      }

      {stage === 'reveal' &&
      <div style={{ textAlign: 'center', color: '#fff', maxWidth: 720, width: '100%' }}>
          <div className="kicker" style={{ marginBottom: 6, opacity: 0.8 }}>You pulled</div>
          <h2 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 24 }}>{revealed.length} new cards</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
            {revealed.map((c, i) =>
          <div key={i} style={{
            animation: `cardLand 600ms cubic-bezier(0.34, 1.56, 0.64, 1) ${i * 140}ms backwards`,
            minWidth: 0
          }}>
                <CardTile card={{ ...c, owned: true, ownedCount: 1 }} />
              </div>
          )}
          </div>
          <button onClick={onBack} className="btn btn-primary" style={{ marginTop: 32, padding: '14px 32px', fontSize: 15 }}>
            Back to collection
          </button>
        </div>
      }
    </div>);

}

// ───────────────────────────────────────────────────────────────────────────
// GAMES HUB
// ───────────────────────────────────────────────────────────────────────────
function GamesHubPage({ onPlay, onBack, onLaunch }) {
  const [groupFilter, setGroupFilter] = useSb('all');
  const [search, setSearch] = useSb('');

  // ── Featured (top two) ──
  const featured = [
  {
    id: 'tot',
    kind: 'Tournament',
    title: 'This or That',
    tagline: 'Pick your bias in head-to-head idol matchups',
    sub: 'Multiple categories available',
    color: '#D4537E',
    streak: 7,
    reward: 50
  },
  {
    id: 'naa',
    kind: 'Memory',
    title: 'Name all members',
    tagline: 'Name every member before the timer runs out',
    sub: '20+ groups to challenge',
    color: '#7F77DD',
    streak: null,
    reward: 80
  }];


  // ── This or That row ──
  const totRows = [
  { id: 'r1', label: 'Boy group idols', a: 'Felix', aGroup: 'stray-kids', b: 'Jungkook', bGroup: 'bts', tag: 'Idols', count: 32, plays: 146 },
  { id: 'r2', label: 'Girl group idols', a: 'Sana', aGroup: 'twice', b: 'Jennie', bGroup: 'blackpink', tag: 'Idols', count: 32, plays: 138 },
  { id: 'r3', label: '4th gen girl group idols', a: 'Karina', aGroup: 'aespa', b: 'Wonyoung', bGroup: 'ive', tag: 'Idols', count: 31, plays: 134 },
  { id: 'r4', label: '4th gen boy group idols', a: 'Hyunjin', aGroup: 'stray-kids', b: 'Ni-ki', bGroup: 'enhypen', tag: 'Idols', count: 28, plays: 121 },
  { id: 'r5', label: 'Boy group idols', a: 'V', aGroup: 'bts', b: 'Jungkook', bGroup: 'bts', tag: 'BTS', count: 7, plays: 98 }];


  // ── Name all members row ──
  const naaRows = [
  { id: 'n1', label: 'Name all TREASURE members', tag: 'General K-pop', size: 10, plays: 99, time: '2:30', diff: 'Hard', accent: '#D4537E' },
  { id: 'n2', label: 'Name all TWICE members', tag: 'TWICE', size: 9, plays: 98, time: '2:00', diff: 'Medium', accent: '#F2C037' },
  { id: 'n3', label: 'Name all SEVENTEEN members', tag: 'SEVENTEEN', size: 13, plays: 92, time: '3:00', diff: 'Hard', accent: '#D4537E' },
  { id: 'n4', label: 'Name all NCT 127 members', tag: 'NCT', size: 9, plays: 86, time: '2:00', diff: 'Medium', accent: '#F2C037' },
  { id: 'n5', label: 'Name all aespa members', tag: 'aespa', size: 4, plays: 81, time: '1:00', diff: 'Easy', accent: '#639922' }];


  return (
    <div className="anim-fadeSlideUp" style={{ paddingTop: 12 }}>
      <button onClick={onBack} className="btn btn-ghost" style={{ marginBottom: 12, padding: '6px 10px', fontSize: 12 }}>
        <Icon.ArrowLeft size={12} /> Back
      </button>

      {/* ───── Featured games ───── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 12, marginBottom: 22 }}>
        <FeaturedGameCard data={featured[0]} onLaunch={onLaunch} dark />
        <FeaturedGameCard data={featured[1]} onLaunch={onLaunch} />
      </div>

      {/* ───── Search ───── */}
      <div style={{
        position: 'relative', marginBottom: 14
      }}>
        <Icon.Search size={14} style={{ position: 'absolute', top: '50%', left: 14, transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search games..."
          style={{
            width: '100%', padding: '12px 12px 12px 38px',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 12, fontSize: 13,
            color: 'var(--text-primary)'
          }} />
        
      </div>

      {/* ───── Group filter chips ───── */}
      <div style={{ position: 'relative', marginBottom: 18 }}>
        <div style={{
          display: 'flex', gap: 8, overflowX: 'auto', scrollbarWidth: 'none',
          paddingBottom: 4, paddingRight: 32
        }}>
          <GameChip active={groupFilter === 'all'} onClick={() => setGroupFilter('all')} label="All" accent="var(--accent)" filled />
          {window.GROUPS.slice(0, 12).map((g) =>
          <GameChip
            key={g.slug}
            active={groupFilter === g.slug}
            onClick={() => setGroupFilter(g.slug)}
            label={g.name}
            accent={g.color} />

          )}
        </div>
        {/* Right-edge fade so users know it scrolls */}
        <div style={{
          position: 'absolute', top: 0, right: 0, bottom: 4, width: 40,
          background: 'linear-gradient(90deg, transparent, var(--bg-canvas))',
          pointerEvents: 'none'
        }}></div>
      </div>

      {/* ───── This or That row ───── */}
      <GameRow
        title="This or that"
        seeAll="See all 20+"
        onClick={() => onLaunch('tot')}>
        
        {totRows.map((r) =>
        <ThisOrThatTile key={r.id} data={r} onClick={() => onLaunch('tot')} />
        )}
      </GameRow>

      {/* ───── Name all members row ───── */}
      <GameRow
        title="Name all members"
        seeAll="See all 24+"
        onClick={() => onLaunch('naa')}>
        
        {naaRows.map((r) =>
        <NameAllTile key={r.id} data={r} onClick={() => onLaunch('naa')} />
        )}
      </GameRow>

      <div style={{ height: 24 }}></div>
    </div>);

}

// ─── Featured hero card ────────────────────────────────────────────────────
function FeaturedGameCard({ data, onLaunch, dark }) {
  const bg = dark ?
  `radial-gradient(120% 90% at 0% 0%, ${data.color}55 0%, transparent 50%), linear-gradient(160deg, #1F1F1F 0%, #0F0F0F 100%)` :
  `radial-gradient(120% 90% at 100% 0%, ${data.color}33 0%, transparent 55%), linear-gradient(160deg, color-mix(in srgb, ${data.color} 18%, #fff) 0%, color-mix(in srgb, ${data.color} 8%, #fff) 100%)`;
  const fg = dark ? '#fff' : '#1F1F1F';
  const tagBg = dark ? `${data.color}33` : `${data.color}22`;
  const tagFg = dark ? data.color : data.color;

  return (
    <button onClick={() => onLaunch(data.id)} style={{
      position: 'relative', overflow: 'hidden',
      borderRadius: 18, padding: 18, border: `1px solid ${dark ? 'rgba(255,255,255,0.08)' : 'var(--border)'}`,
      background: bg, color: fg, cursor: 'pointer',
      textAlign: 'left',
      display: 'flex', flexDirection: 'column', gap: 12,
      minHeight: 180,
      transition: 'transform 200ms ease, box-shadow 200ms ease'
    }}
    onMouseEnter={(e) => {e.currentTarget.style.transform = 'translateY(-2px)';e.currentTarget.style.boxShadow = `0 14px 32px -10px ${data.color}55`;}}
    onMouseLeave={(e) => {e.currentTarget.style.transform = 'translateY(0)';e.currentTarget.style.boxShadow = 'none';}}>
      {/* Sparkle ornament */}
      <div aria-hidden style={{
        position: 'absolute', right: -20, top: -20, width: 140, height: 140,
        background: `radial-gradient(circle, ${data.color}55 0%, transparent 65%)`,
        filter: 'blur(8px)', pointerEvents: 'none'
      }}></div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, position: 'relative', zIndex: 1 }}>
        <span style={{
          padding: '4px 10px', borderRadius: 9999,
          background: tagBg, color: tagFg,
          fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase'
        }}>{data.kind}</span>
        {data.streak &&
        <span style={{
          padding: '4px 10px', borderRadius: 9999,
          background: dark ? 'rgba(242,192,55,0.15)' : '#FFF7E0',
          color: '#F2C037',
          fontSize: 10, fontWeight: 800, letterSpacing: '0.04em',
          display: 'inline-flex', alignItems: 'center', gap: 4
        }}>🔥 {data.streak}-day streak</span>
        }
      </div>

      <div style={{ flex: 1, minWidth: 0, position: 'relative', zIndex: 1 }}>
        <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.15, marginBottom: 6 }}>{data.title}</div>
        <div style={{ fontSize: 12, opacity: 0.75, lineHeight: 1.5, marginBottom: 8 }}>{data.tagline}</div>
        <div style={{ fontSize: 11, opacity: 0.55 }}>{data.sub}</div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, position: 'relative', zIndex: 1 }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '8px 16px', borderRadius: 9999,
          background: data.color, color: '#fff',
          fontSize: 13, fontWeight: 700
        }}>
          <Icon.Play size={11} /> {data.streak ? 'Continue' : 'Play'}
        </span>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          fontSize: 11, fontWeight: 700,
          color: '#F2C037'
        }}>
          <span style={{ fontSize: 12 }}>★</span> +{data.reward}
        </span>
      </div>
    </button>);

}

// ─── Group chip ────────────────────────────────────────────────────────────
function GameChip({ active, onClick, label, accent, filled }) {
  return (
    <button onClick={onClick} style={{
      flexShrink: 0,
      padding: '7px 14px', borderRadius: 9999,
      fontSize: 12, fontWeight: 700,
      cursor: 'pointer', whiteSpace: 'nowrap',
      transition: 'all 160ms ease',
      ...(active ? {
        background: accent, color: '#fff', border: `1px solid ${accent}`
      } : {
        background: 'transparent', color: 'var(--text-secondary)',
        border: '1px solid var(--border)'
      })
    }}>{label}</button>);

}

// ─── Section row with horizontal scroll ────────────────────────────────────
function GameRow({ title, seeAll, onClick, children }) {
  return (
    <section style={{ marginBottom: 22 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }}>{title}</h2>
        <button onClick={onClick} style={{
          background: 'transparent', border: 0, padding: 0, cursor: 'pointer',
          color: 'var(--accent)', fontSize: 12, fontWeight: 700
        }}>{seeAll}</button>
      </div>
      <div style={{ position: 'relative' }}>
        <div style={{
          display: 'flex', gap: 10, overflowX: 'auto', scrollbarWidth: 'none',
          paddingBottom: 4, paddingRight: 24,
          scrollSnapType: 'x mandatory'
        }}>
          {children}
        </div>
      </div>
    </section>);

}

// ─── This or That tile (arcade VS card) ────────────────────────────────────
function ThisOrThatTile({ data, onClick }) {
  const aGroup = window.GROUPS.find((g) => g.slug === data.aGroup) || { color: '#D4537E', logo: '' };
  const bGroup = window.GROUPS.find((g) => g.slug === data.bGroup) || { color: '#7F77DD', logo: '' };

  return (
    <button onClick={onClick} style={{
      flexShrink: 0, scrollSnapAlign: 'start',
      width: 280, padding: 0, border: 0, background: 'transparent',
      cursor: 'pointer', textAlign: 'left',
      borderRadius: 18, overflow: 'hidden',
      filter: `drop-shadow(0 8px 24px ${aGroup.color}30)`,
      transition: 'transform 200ms ease', transform: "translateY(0px)"
    }}
    onMouseEnter={(e) => {e.currentTarget.style.transform = 'translateY(-3px)';}}
    onMouseLeave={(e) => {e.currentTarget.style.transform = 'translateY(0)';}}>
      {/* Artwork */}
      <div style={{
        position: 'relative', height: 220, overflow: 'hidden',
        borderRadius: 18,
        background: `linear-gradient(110deg, ${aGroup.color}, ${bGroup.color})`
      }}>
        {/* Two halves with photos, separated by a slight angle */}
        <div style={{
          position: 'absolute', inset: 0, display: 'grid',
          gridTemplateColumns: '1fr 1fr'
        }}>
          <div style={{ position: 'relative', overflow: 'hidden' }}>
            <img src={aGroup.logo} alt="" style={{
              position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover',
              clipPath: 'polygon(0 0, 100% 0, 92% 100%, 0 100%)'
            }} />
            <div style={{
              position: 'absolute', inset: 0,
              clipPath: 'polygon(0 0, 100% 0, 92% 100%, 0 100%)',
              background: `linear-gradient(180deg, transparent 50%, rgba(0,0,0,0.7) 100%)`, height: "20px"
            }}></div>
          </div>
          <div style={{ position: 'relative', overflow: 'hidden' }}>
            <img src={bGroup.logo} alt="" style={{
              position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover',
              clipPath: 'polygon(8% 0, 100% 0, 100% 100%, 0 100%)'
            }} />
            <div style={{
              position: 'absolute', inset: 0,
              clipPath: 'polygon(8% 0, 100% 0, 100% 100%, 0 100%)',
              background: `linear-gradient(180deg, transparent 50%, rgba(0,0,0,0.7) 100%)`, borderRadius: "0px"
            }}></div>
          </div>
        </div>

        {/* Top-right tag */}
        <div style={{
          position: 'absolute', top: 10, right: 10,
          padding: '4px 9px', borderRadius: 9999,
          background: 'rgba(212,83,126,0.95)', color: '#fff',
          fontSize: 10, fontWeight: 800, letterSpacing: '0.04em'
        }}>{data.tag}</div>

        {/* Center VS medallion */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          width: 56, height: 56, borderRadius: '50%',
          background: 'radial-gradient(circle at 35% 30%, #2A2A2A, #0A0A0A)',
          boxShadow: '0 0 0 3px rgba(255,255,255,0.95), 0 8px 28px rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff',
          fontSize: 18, fontWeight: 900, letterSpacing: '0.04em'
        }}>VS</div>

        {/* Names */}
        <div style={{
          position: 'absolute', bottom: 12, left: 12,
          color: '#fff', fontSize: 13, fontWeight: 700,
          textShadow: '0 1px 4px rgba(0,0,0,0.6)'
        }}>{data.a}</div>
        <div style={{
          position: 'absolute', bottom: 12, right: 12,
          color: '#fff', fontSize: 13, fontWeight: 700,
          textShadow: '0 1px 4px rgba(0,0,0,0.6)'
        }}>{data.b}</div>
      </div>

      {/* Footer caption — outside the photo */}
      <div style={{
        marginTop: 0,
        background: '#1A1A1A',
        borderRadius: "0px", padding: "12px 14px 14px"

      }}>
        <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: '-0.01em', color: '#fff', marginBottom: 4 }}>{data.label}</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)' }}>
            {data.count} idols · {data.plays} plays
          </div>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 3,
            padding: '2px 7px', borderRadius: 9999,
            background: 'rgba(242,192,55,0.18)', color: '#F2C037',
            fontSize: 10, fontWeight: 800
          }}>★ +30</span>
        </div>
      </div>
    </button>);

}

// ─── Name-all-members tile (editorial) ─────────────────────────────────────
function NameAllTile({ data, onClick }) {
  // Build a fake member-grid: 7 cols × 2 rows, with some revealed (deterministic)
  const cells = 14;
  const reveal = []; // indices that show a real photo
  const hash = data.id.charCodeAt(data.id.length - 1);
  for (let i = 0; i < cells; i++) {
    if ((i + hash) % 2 === 1 && reveal.length < 6) reveal.push(i);
  }
  const memberPhotos = window.GROUPS.
  filter((g) => g.members.length >= 4).
  slice(hash % 6, hash % 6 + 6).
  map((g) => g.logo);

  return (
    <button onClick={onClick} style={{
      flexShrink: 0, scrollSnapAlign: 'start',
      width: 460, padding: 0, border: '1.5px solid var(--border)',
      borderRadius: 18, overflow: 'hidden',
      background: '#fff', cursor: 'pointer', textAlign: 'left',
      transition: 'transform 200ms ease, border-color 200ms ease, box-shadow 200ms ease'
    }}
    onMouseEnter={(e) => {e.currentTarget.style.transform = 'translateY(-2px)';e.currentTarget.style.borderColor = data.accent;e.currentTarget.style.boxShadow = `0 12px 28px -10px ${data.accent}40`;}}
    onMouseLeave={(e) => {e.currentTarget.style.transform = 'translateY(0)';e.currentTarget.style.borderColor = 'var(--border)';e.currentTarget.style.boxShadow = 'none';}}>
      {/* Member-grid preview */}
      <div style={{
        position: 'relative',
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gridTemplateRows: 'repeat(2, 1fr)',
        gap: 0,
        aspectRatio: '7 / 2',
        background: '#222'
      }}>
        {Array.from({ length: cells }).map((_, i) => {
          const isRevealed = reveal.includes(i);
          const photo = memberPhotos[reveal.indexOf(i) % memberPhotos.length];
          return (
            <div key={i} style={{
              position: 'relative', overflow: 'hidden',
              background: isRevealed ? 'transparent' : '#2A2A2A',
              borderRight: i % 7 === 6 ? 0 : '1px solid #1A1A1A',
              borderBottom: i < 7 ? '1px solid #1A1A1A' : 0
            }}>
              {isRevealed ?
              <img src={photo} alt="" style={{
                position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover'
              }} /> :

              <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'rgba(255,255,255,0.25)', fontSize: 22, fontWeight: 800
              }}>?</div>
              }
            </div>);

        })}

        {/* Difficulty pill (top-left of grid) */}
        <div style={{
          position: 'absolute', top: 8, left: 8,
          padding: '3px 9px', borderRadius: 8,
          background: data.accent, color: '#fff',
          fontSize: 10, fontWeight: 800, letterSpacing: '0.04em'
        }}>{data.diff}</div>

        {/* Timer pill (top-right of grid) */}
        <div style={{
          position: 'absolute', top: 8, right: 8,
          padding: '3px 9px', borderRadius: 8,
          background: 'rgba(255,255,255,0.95)', color: '#1F1F1F',
          fontSize: 10, fontWeight: 800,
          display: 'inline-flex', alignItems: 'center', gap: 4
        }}>
          <Icon.Clock size={10} /> {data.time}
        </div>

        {/* Member count pill (bottom-left of grid) */}
        <div style={{
          position: 'absolute', bottom: 8, left: 8,
          padding: '3px 9px', borderRadius: 8,
          background: 'rgba(255,255,255,0.95)', color: '#1F1F1F',
          fontSize: 10, fontWeight: 800
        }}>{data.size} members</div>
      </div>

      {/* Footer */}
      <div style={{ padding: '12px 14px 14px' }}>
        <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: '-0.01em', color: 'var(--text-primary)', marginBottom: 4 }}>{data.label}</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
            {data.tag} · {data.plays} plays
          </div>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 3,
            padding: '2px 7px', borderRadius: 9999,
            background: '#FFF7E0', color: '#B98800',
            fontSize: 10, fontWeight: 800
          }}>★ +{data.size * 10}</span>
        </div>
      </div>
    </button>);

}

// ───────────────────────────────────────────────────────────────────────────
// THIS OR THAT
// ───────────────────────────────────────────────────────────────────────────
function ThisOrThatGame({ onBack }) {
  const matchups = useMb(() => {
    const all = window.GROUPS;
    const pairs = [];
    for (let i = 0; i < 8; i++) {
      const a = all[Math.floor(Math.random() * all.length)];
      let b = all[Math.floor(Math.random() * all.length)];
      while (b.slug === a.slug) b = all[Math.floor(Math.random() * all.length)];
      pairs.push([a, b]);
    }
    return pairs;
  }, []);

  const [idx, setIdx] = useSb(0);
  const [score, setScore] = useSb(0);
  const [time, setTime] = useSb(60);
  const [picked, setPicked] = useSb(null);
  const [done, setDone] = useSb(false);

  useEb(() => {
    if (done) return;
    const t = setInterval(() => {
      setTime((prev) => {
        if (prev <= 1) {setDone(true);return 0;}
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [done]);

  const pick = (which) => {
    if (picked !== null || done) return;
    setPicked(which);
    setScore((s) => s + 1);
    setTimeout(() => {
      if (idx + 1 >= matchups.length) {setDone(true);return;}
      setIdx((i) => i + 1);
      setPicked(null);
    }, 350);
  };

  if (done) {
    return (
      <div className="anim-fadeSlideUp" style={{ paddingTop: 24, textAlign: 'center' }}>
        <div className="kicker" style={{ color: 'var(--accent)' }}>This or That · finished</div>
        <h1 className="h-display" style={{ marginTop: 8 }}>{score} picks</h1>
        <p className="muted" style={{ fontSize: 14, marginTop: 8 }}>You shared your taste in {score} matchups.</p>
        <button onClick={() => {setIdx(0);setScore(0);setTime(60);setDone(false);}} className="btn btn-primary" style={{ marginTop: 24 }}>
          Play again
        </button>
        <button onClick={onBack} className="btn btn-ghost" style={{ marginTop: 12, marginLeft: 0, display: 'block', width: '100%' }}>
          Back to games
        </button>
      </div>);

  }

  const [a, b] = matchups[idx];
  return (
    <div style={{ paddingTop: 12 }}>
      {/* HUD */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <button onClick={onBack} className="btn btn-ghost" style={{ padding: '6px 10px', fontSize: 12 }}>
          <Icon.X size={12} /> Quit
        </button>
        <div className="kicker" style={{ color: 'var(--accent)' }}>Round {idx + 1} of {matchups.length}</div>
        <div className="tabular-nums" style={{
          fontSize: 14, fontWeight: 800,
          padding: '4px 10px', borderRadius: 9999,
          background: time < 10 ? 'var(--wrong-bg)' : 'var(--bg-elevated)',
          color: time < 10 ? 'var(--wrong)' : 'var(--text-primary)'
        }}>
          0:{String(time).padStart(2, '0')}
        </div>
      </div>

      {/* Segmented round dots */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 22 }}>
        {matchups.map((_, i) =>
        <div key={i} style={{
          flex: 1, height: 3, borderRadius: 9999,
          background: i < idx ? 'var(--accent)' : i === idx ? 'var(--accent-light)' : 'var(--border)'
        }}></div>
        )}
      </div>

      <h2 className="h-display" style={{ fontSize: 22, textAlign: 'center', marginBottom: 4 }}>Who would you stan?</h2>
      <p className="muted" style={{ fontSize: 12, textAlign: 'center', marginBottom: 18 }}>Tap a side. No takebacks.</p>

      {/* Stacked split-card with diagonal divider */}
      <div style={{
        position: 'relative',
        borderRadius: 18,
        overflow: 'hidden',
        border: '1px solid var(--border)',
        background: 'var(--bg-surface)',
        height: 460,
        boxShadow: '0 24px 60px -28px rgba(0,0,0,0.25)'
      }}>
        {[a, b].map((g, i) => {
          const isTop = i === 0;
          const isPicked = picked === i;
          const isFaded = picked !== null && picked !== i;
          return (
            <button key={g.slug} onClick={() => pick(i)} style={{
              position: 'absolute', inset: 0,
              clipPath: isTop ?
              'polygon(0 0, 100% 0, 100% 42%, 0 58%)' :
              'polygon(0 58%, 100% 42%, 100% 100%, 0 100%)',
              background: `linear-gradient(${isTop ? '160deg' : '20deg'}, ${g.color}, color-mix(in srgb, ${g.color} 50%, #000))`,
              border: 0, padding: 0, cursor: 'pointer',
              transition: 'transform 220ms ease, opacity 220ms',
              transform: isPicked ? 'scale(1.03)' : 'scale(1)',
              opacity: isFaded ? 0.35 : 1,
              overflow: 'hidden'
            }}>
              <img src={g.logo} alt="" style={{
                position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover',
                mixBlendMode: 'luminosity', opacity: 0.5
              }} />
              <div style={{
                position: 'absolute', inset: 0,
                background: isTop ?
                `linear-gradient(180deg, transparent 30%, ${g.color}cc)` :
                `linear-gradient(0deg, transparent 30%, ${g.color}cc)`
              }}></div>

              {/* Side label */}
              <div style={{
                position: 'absolute',
                [isTop ? 'top' : 'bottom']: 18, left: 20, right: 20,
                color: '#fff', textAlign: 'left'
              }}>
                <div style={{
                  display: 'inline-block', padding: '3px 10px', borderRadius: 9999,
                  background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(6px)',
                  fontSize: 10, fontWeight: 800, letterSpacing: '0.12em',
                  textTransform: 'uppercase'
                }}>{isTop ? 'Pick A' : 'Pick B'}</div>
                <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.03em', marginTop: 8, lineHeight: 1 }}>{g.name}</div>
                <div style={{ fontSize: 11, fontWeight: 600, opacity: 0.85, marginTop: 4, letterSpacing: '0.04em' }}>{g.fandom}</div>
              </div>

              {/* Tap indicator */}
              {isPicked &&
              <div style={{
                position: 'absolute',
                [isTop ? 'top' : 'bottom']: '20%',
                right: 20,
                width: 44, height: 44, borderRadius: '50%',
                background: '#fff', color: g.color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                animation: 'popIn 200ms ease-out',
                boxShadow: '0 8px 24px rgba(0,0,0,0.3)'
              }}><Icon.Check size={22} /></div>
              }
            </button>);

        })}

        {/* VS badge */}
        <div style={{
          position: 'absolute',
          left: '50%', top: '50%', transform: 'translate(-50%, -50%) rotate(-12deg)',
          width: 72, height: 72, borderRadius: '50%',
          background: 'var(--bg-primary)',
          border: '3px solid var(--text-primary)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 22, fontWeight: 900, letterSpacing: '-0.02em',
          color: 'var(--text-primary)',
          boxShadow: '0 12px 28px rgba(0,0,0,0.35)',
          pointerEvents: 'none',
          fontStyle: 'italic'
        }}>VS</div>
      </div>

      {/* Tip strip */}
      <div style={{
        marginTop: 14, padding: '10px 14px', borderRadius: 12,
        background: 'var(--bg-elevated)', border: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: 'var(--text-secondary)'
      }}>
        <span style={{
          width: 22, height: 22, borderRadius: '50%', background: 'var(--accent)', color: '#fff',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          fontSize: 11, fontWeight: 800
        }}>i</span>
        Picks are anonymous and contribute to community taste data.
      </div>
    </div>);

}


Object.assign(window, { CardsPage, CardDetail, PackOpeningPage, GamesHubPage, ThisOrThatGame, CardTile });