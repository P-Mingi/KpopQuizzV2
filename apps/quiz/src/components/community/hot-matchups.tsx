import Link from 'next/link';

import { formatCount } from '@/lib/utils';

import type { HotMatchup } from '@/lib/db/queries/community';

// F2b B6 - This week's matchups. Battles v2 are anonymous, so instead of a
// nonexistent "battle winner" this shows the duel matchups fans voted on most
// this week (the spec's fallback). Baked at ISR. Each row links to that
// matchup's live fan ranking. Hides under MIN_BOARD (no thin board).
const MIN_BOARD = 4;

export function HotMatchups({ matchups }: { matchups: HotMatchup[] }): React.ReactElement | null {
  if (matchups.length < MIN_BOARD) return null;

  return (
    <section style={card}>
      <style>{CSS}</style>
      <p style={seclab}>This week&apos;s matchups</p>
      <p style={sub}>The head-to-heads fans voted on most.</p>

      <div className="hm-list">
        {matchups.map((m, i) => (
          <Link key={`${m.groupSlug}:${m.questionType}`} href={`/rankings/${m.groupSlug}/${m.questionType}`} className="hm-row">
            <span className="hm-rank">{i + 1}</span>
            <span className="hm-body">
              <span className="hm-prompt">{m.prompt}</span>
              <span className="hm-votes">{formatCount(m.votes)} votes this week</span>
            </span>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--txt3)', flexShrink: 0 }} aria-hidden="true">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </Link>
        ))}
      </div>
    </section>
  );
}

const card: React.CSSProperties = {
  background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 14, marginBottom: 12,
};
const seclab: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--txt3)', margin: 0,
};
const sub: React.CSSProperties = { fontSize: 11.5, color: 'var(--txt2)', margin: '4px 0 8px' };

const CSS = `
.hm-list{ display:flex; flex-direction:column; }
.hm-row{ display:flex; align-items:center; gap:11px; padding:10px 0; border-top:1px solid var(--border); text-decoration:none; }
.hm-row:first-child{ border-top:none; }
.hm-rank{ font-size:13px; font-weight:800; color:var(--txt3); width:16px; text-align:center; flex-shrink:0; font-variant-numeric:tabular-nums; }
.hm-body{ display:flex; flex-direction:column; min-width:0; flex:1; }
.hm-prompt{ font-size:13.5px; font-weight:700; color:var(--txt1); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.hm-row:hover .hm-prompt{ color:var(--brand); }
.hm-votes{ font-size:11px; color:var(--txt3); margin-top:2px; font-variant-numeric:tabular-nums; }
`;
