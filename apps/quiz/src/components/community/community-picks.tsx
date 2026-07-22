import Link from 'next/link';

import { PersonCard } from '@/components/profile/person-card';
import { CommentReportButton } from '@/components/community/comment-report-button';

import type { CommunityComment } from '@/lib/db/queries/community';

// F2b B4 - Community picks, the comments wall. The latest quiz comments across
// the whole site, baked at ISR, so the community's voice is visible on the hub.
// Every row has a report button. Hides below MIN_COMMENTS (no thin wall).
const MIN_COMMENTS = 4;

export function CommunityPicks({ comments }: { comments: CommunityComment[] }): React.ReactElement | null {
  if (comments.length < MIN_COMMENTS) return null;

  return (
    <section style={card}>
      <style>{CSS}</style>
      <p style={seclab}>Community picks</p>
      <p style={sub}>What fans are saying across the quizzes.</p>

      <div className="cp-list">
        {comments.map((c) => (
          <div className="cp-row" key={c.id}>
            <div className="cp-top">
              {/* PersonCard owns the profile link; the report button is a sibling,
                  never nested inside it. */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <PersonCard person={c.person} compact showFollow={false} />
              </div>
              <span className="cp-ago">{c.ago}</span>
              <CommentReportButton quizId={c.quizId} />
            </div>

            <p className="cp-text">{c.content}</p>

            <div className="cp-meta">
              {c.score !== null && c.total !== null && (
                <span className="cp-score">after scoring {c.score}/{c.total}</span>
              )}
              <Link href={`/q/${c.quizSlug}`} className="cp-on">on {c.quizTitle}</Link>
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
  fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--txt3)', margin: 0,
};
const sub: React.CSSProperties = { fontSize: 11.5, color: 'var(--txt2)', margin: '4px 0 8px' };

const CSS = `
.cp-list{ display:flex; flex-direction:column; }
.cp-row{ padding:11px 0; border-top:1px solid var(--border); }
.cp-row:first-child{ border-top:none; }
.cp-top{ display:flex; align-items:center; gap:8px; }
.cp-ago{ font-size:11px; color:var(--txt3); flex-shrink:0; font-variant-numeric:tabular-nums; }
.cp-text{
  font-size:13.5px; color:var(--txt1); margin:6px 0 0; line-height:1.45; word-break:break-word;
  display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;
}
.cp-meta{ display:flex; align-items:center; gap:8px; margin-top:5px; flex-wrap:wrap; }
.cp-score{
  font-size:10.5px; font-weight:700; color:var(--brand-dark); background:var(--brand-light);
  border-radius:999px; padding:2px 8px;
}
.cp-on{ font-size:11.5px; color:var(--txt3); text-decoration:none; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.cp-on:hover{ color:var(--brand); }
`;
