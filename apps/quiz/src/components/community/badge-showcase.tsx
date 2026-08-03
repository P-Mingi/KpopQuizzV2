import { WorldLink } from '@/components/layout/world-link';

import { PersonCard } from '@/components/profile/person-card';

import type { BadgeEarn } from '@/lib/db/queries/community';

// F1.8 - Badge watch. Makes badges visible outside profiles: a horizontal shelf
// of the latest earns, baked at ISR from getLatestBadgeEarns. An aspiration
// surface ("someone just got that, I want it").
//
// Below 3 recent earns the section hides (M1.29 empty-data pattern). The query
// already excludes the founding_fan backfill and dedupes to one earn per badge,
// so the shelf shows variety rather than a single retro-grant burst.
const MIN_EARNS = 3;

export function BadgeShowcase({ earns }: { earns: BadgeEarn[] }): React.ReactElement | null {
  if (earns.length < MIN_EARNS) return null;

  return (
    <section style={card}>
      <style>{CSS}</style>
      <p style={seclab}>Badge watch</p>
      <div className="bw-shelf">
        {earns.map((e) => (
          <div className="bw-card" key={`${e.badgeId}:${e.person.username}`}>
            {/* Coin + badge name links to the earner (sibling to PersonCard's own
                link, never nested inside it). */}
            <WorldLink href={`/u/${e.person.username}`} className="bw-top">
              {e.icon ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={e.icon} alt="" className="bw-coin" width={44} height={44} loading="lazy" />
              ) : (
                <span className="bw-coin bw-coin-fallback">{e.badgeName.slice(0, 1).toUpperCase()}</span>
              )}
              <span className="bw-meta">
                <span className="bw-name">{e.badgeName}</span>
                <span className="bw-time">{e.ago}</span>
              </span>
            </WorldLink>
            <div className="bw-earner">
              <PersonCard person={e.person} compact showFollow={false} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

const card: React.CSSProperties = {
  background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 14, marginBottom: 12,
};
const seclab: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--txt3)', margin: '0 0 12px',
};

const CSS = `
.bw-shelf{
  display:flex; gap:10px; overflow-x:auto; padding-bottom:4px;
  scroll-snap-type:x proximity; -webkit-overflow-scrolling:touch;
}
.bw-shelf::-webkit-scrollbar{ height:0; }
.bw-card{
  flex:0 0 auto; width:172px; scroll-snap-align:start;
  border:1px solid var(--border); background:var(--surface-alt); border-radius:13px;
  padding:11px; display:flex; flex-direction:column; gap:9px;
}
.bw-top{ display:flex; align-items:center; gap:10px; text-decoration:none; min-width:0; }
.bw-coin{ width:44px; height:44px; object-fit:contain; flex-shrink:0; }
.bw-coin-fallback{
  display:grid; place-items:center; border-radius:50%;
  background:var(--surface); border:1px solid var(--border);
  font-size:16px; font-weight:800; color:var(--txt2);
}
.bw-meta{ display:flex; flex-direction:column; min-width:0; }
.bw-name{ font-size:13px; font-weight:800; color:var(--txt1); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.bw-name:hover{ color:var(--brand); }
.bw-time{ font-size:10.5px; color:var(--txt3); margin-top:1px; }
.bw-earner{ border-top:1px solid var(--border); padding-top:8px; }
`;
