import Link from 'next/link';

import { GroupLogo } from '@/components/ui/group-logo';
import { CommunityCtaLink } from '@/components/community/community-cta-link';
import { formatCount } from '@/lib/utils';

import type { WarMapEntry } from '@/lib/db/queries/community';

// F1.7 - Fandom war map. The belonging centerpiece: the top 30 groups by plays
// this week, baked at ISR from getFandomWarMap (one aggregate RPC + one small
// generation read). Replaces ByFandomFans as the belonging surface.
//
// Boards rule: with fewer than 4 groups that have plays this week the whole
// section hides (no thin, sad leaderboard). Every tile is a crawlable Link to
// the group page, so this is also an internal-link win.
const MIN_BOARD = 4;

export function FandomWarMap({ entries }: { entries: WarMapEntry[] }): React.ReactElement | null {
  if (entries.length < MIN_BOARD) return null;

  const podium = entries.slice(0, 3);
  const rest = entries.slice(3);

  return (
    <section style={card}>
      <style>{CSS}</style>
      <p style={seclab}>Fandom war</p>
      <p style={sub}>Which fandom is strongest this week?</p>

      <div className="wm-podium">
        {podium.map((g, i) => (
          <Link key={g.slug} href={`/${g.slug}-quiz`} className={`wm-pod wm-pod-${i + 1}`}>
            <span className="wm-medal" aria-hidden="true">{i + 1}</span>
            <span className="wm-pod-logo">
              <GroupLogo groupName={g.name} logoUrl={g.logoUrl} displayColor={g.color} textColor="#ffffff" size={48} />
            </span>
            <span className="wm-pod-name">{g.name}</span>
            {g.generation && <span className="wm-gen">{g.generation}</span>}
            <span className="wm-pod-stat">{formatCount(g.plays)} plays</span>
            <span className="wm-pod-sub">
              {formatCount(g.fans)} {g.fans === 1 ? 'fan' : 'fans'} <Delta delta={g.delta} />
            </span>
          </Link>
        ))}
      </div>

      {rest.length > 0 && (
        <div className="wm-grid">
          {rest.map((g, i) => (
            <Link key={g.slug} href={`/${g.slug}-quiz`} className="wm-tile">
              <span className="wm-rank">{i + 4}</span>
              <span className="wm-tile-logo">
                <GroupLogo groupName={g.name} logoUrl={g.logoUrl} displayColor={g.color} textColor="#ffffff" size={30} />
              </span>
              <span className="wm-tile-body">
                <span className="wm-tile-name">{g.name}</span>
                <span className="wm-tile-stat">{formatCount(g.plays)} plays &middot; {formatCount(g.fans)} {g.fans === 1 ? 'fan' : 'fans'}</span>
              </span>
              <Delta delta={g.delta} />
            </Link>
          ))}
        </div>
      )}

      <CommunityCtaLink href="/quizzes" to="quizzes" className="wm-cta">
        Defend your fandom, play a quiz
      </CommunityCtaLink>
    </section>
  );
}

// Up / down / flat vs the previous 7 days. null delta = a group with no plays
// last week, shown as "new" rather than a fake +infinity percentage.
function Delta({ delta }: { delta: number | null }): React.ReactElement {
  if (delta === null) return <span className="wm-delta wm-new">new</span>;
  if (delta === 0) return <span className="wm-delta wm-flat" aria-label="no change">&middot;</span>;
  const up = delta > 0;
  return (
    <span className={`wm-delta ${up ? 'wm-up' : 'wm-down'}`} aria-label={`${up ? 'up' : 'down'} ${Math.abs(delta)} percent`}>
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {up ? <polyline points="6 15 12 9 18 15" /> : <polyline points="6 9 12 15 18 9" />}
      </svg>
      {Math.abs(delta)}%
    </span>
  );
}

const card: React.CSSProperties = {
  background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 14, marginBottom: 12,
};
const seclab: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--txt3)', margin: 0,
};
const sub: React.CSSProperties = { fontSize: 11.5, color: 'var(--txt2)', margin: '4px 0 12px' };

const CSS = `
.wm-podium{ display:grid; grid-template-columns:repeat(3,1fr); gap:8px; margin-bottom:10px; }
.wm-pod{
  position:relative; display:flex; flex-direction:column; align-items:center; text-align:center;
  gap:3px; padding:14px 8px 12px; border-radius:14px; text-decoration:none;
  border:1px solid var(--border); background:var(--surface-alt); min-width:0;
  transition:border-color .16s ease, transform .16s ease;
}
.wm-pod:hover{ transform:translateY(-2px); }
.wm-pod-1{ border-color:color-mix(in srgb, #E8B923 60%, var(--border)); background:color-mix(in srgb, #E8B923 9%, var(--surface)); }
.wm-pod-2{ border-color:color-mix(in srgb, #A8B0B8 55%, var(--border)); }
.wm-pod-3{ border-color:color-mix(in srgb, #C68A4E 50%, var(--border)); }
.wm-medal{
  position:absolute; top:8px; left:8px; width:18px; height:18px; border-radius:50%;
  display:grid; place-items:center; font-size:10px; font-weight:800; color:#fff;
  background:var(--txt3);
}
.wm-pod-1 .wm-medal{ background:#E8B923; }
.wm-pod-2 .wm-medal{ background:#A8B0B8; }
.wm-pod-3 .wm-medal{ background:#C68A4E; }
.wm-pod-logo{ line-height:0; margin-bottom:2px; }
.wm-pod-name{ font-size:12.5px; font-weight:800; color:var(--txt1); max-width:100%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.wm-gen{ font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:0.05em; color:var(--txt3); }
.wm-pod-stat{ font-size:12px; font-weight:800; color:var(--brand); font-variant-numeric:tabular-nums; margin-top:1px; }
.wm-pod-sub{ display:inline-flex; align-items:center; gap:5px; font-size:10.5px; color:var(--txt3); font-variant-numeric:tabular-nums; }

.wm-grid{ display:grid; grid-template-columns:repeat(2,1fr); gap:6px; margin-bottom:12px; }
@media (min-width:560px){ .wm-grid{ grid-template-columns:repeat(3,1fr); } }
.wm-tile{
  display:flex; align-items:center; gap:8px; padding:8px 9px; border-radius:11px; text-decoration:none;
  border:1px solid var(--border); background:var(--surface-alt); min-width:0;
  transition:border-color .16s ease;
}
.wm-tile:hover{ border-color:var(--brand); }
.wm-rank{ font-size:11px; font-weight:800; color:var(--txt3); width:16px; flex-shrink:0; text-align:center; font-variant-numeric:tabular-nums; }
.wm-tile-logo{ line-height:0; flex-shrink:0; }
.wm-tile-body{ display:flex; flex-direction:column; min-width:0; flex:1; }
.wm-tile-name{ font-size:12px; font-weight:700; color:var(--txt1); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.wm-tile-stat{ font-size:9.5px; color:var(--txt3); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-variant-numeric:tabular-nums; }

.wm-delta{ display:inline-flex; align-items:center; gap:1px; font-size:10px; font-weight:700; flex-shrink:0; font-variant-numeric:tabular-nums; }
.wm-up{ color:#1a9d63; }
.wm-down{ color:#c0392b; }
.wm-flat, .wm-new{ color:var(--txt3); }
.wm-new{ font-size:9px; text-transform:uppercase; letter-spacing:0.04em; }

.wm-cta{
  display:block; text-align:center; text-decoration:none;
  background:var(--brand-btn); color:#fff; font-size:13px; font-weight:700;
  border-radius:11px; padding:11px; min-height:44px; line-height:22px;
  transition:background .16s ease;
}
.wm-cta:hover{ background:var(--brand-btn-hover); }
`;
