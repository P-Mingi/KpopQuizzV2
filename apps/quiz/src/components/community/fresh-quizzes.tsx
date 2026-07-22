import Link from 'next/link';

import { GroupLogo } from '@/components/ui/group-logo';
import { CommunityCtaLink } from '@/components/community/community-cta-link';
import { formatCount } from '@/lib/utils';

import type { QuizCardData } from '@/lib/db/types';

// F2b B5 - Fresh quizzes shelf. The newest published quizzes, baked at ISR, so
// the hub always shows there is new stuff to play. A compact 2-col grid of
// tiles; the whole tile links to the quiz (creator shown as text, not a nested
// link). Ends on a "Make your own" card into /create.
//
// A stale shelf is a dead signal, so it hides unless at least MIN_FRESH quizzes
// were published in the last 30 days.
const MIN_FRESH = 3;
const THIRTY_DAYS_MS = 30 * 24 * 3600_000;

export function FreshQuizzes({ quizzes, nowMs }: { quizzes: QuizCardData[]; nowMs: number }): React.ReactElement | null {
  const fresh = quizzes.filter((q) => nowMs - new Date(q.created_at).getTime() <= THIRTY_DAYS_MS);
  if (fresh.length < MIN_FRESH) return null;

  return (
    <section style={card}>
      <style>{CSS}</style>
      <p style={seclab}>Fresh quizzes</p>
      <p style={sub}>Newly made by the community.</p>

      <div className="fq-grid">
        {fresh.map((q) => (
          <Link key={q.id} href={`/q/${q.slug}`} className="fq-tile">
            <span className="fq-logo">
              <GroupLogo groupName={q.group_name} logoUrl={q.logo_url} displayColor={q.display_color} textColor={q.text_color} size={34} />
            </span>
            <span className="fq-body">
              <span className="fq-title">{q.title}</span>
              <span className="fq-meta">by {q.creator_username} &middot; {formatCount(q.play_count)} plays</span>
            </span>
          </Link>
        ))}

        {/* End cap: make your own. */}
        <CommunityCtaLink href="/create" to="create" className="fq-tile fq-make">
          <span className="fq-make-plus" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
          </span>
          <span className="fq-body">
            <span className="fq-title">Make your own</span>
            <span className="fq-meta">Build a quiz in minutes</span>
          </span>
        </CommunityCtaLink>
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
const sub: React.CSSProperties = { fontSize: 11.5, color: 'var(--txt2)', margin: '4px 0 10px' };

const CSS = `
.fq-grid{ display:grid; grid-template-columns:1fr; gap:8px; }
@media (min-width:440px){ .fq-grid{ grid-template-columns:1fr 1fr; } }
.fq-tile{
  display:flex; align-items:center; gap:10px; padding:10px; border-radius:12px; text-decoration:none;
  border:1px solid var(--border); background:var(--surface-alt); min-width:0;
  transition:border-color .16s ease;
}
.fq-tile:hover{ border-color:var(--brand); }
.fq-logo{ line-height:0; flex-shrink:0; }
.fq-body{ display:flex; flex-direction:column; min-width:0; }
.fq-title{
  font-size:13px; font-weight:700; color:var(--txt1); line-height:1.25;
  display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;
}
.fq-meta{ font-size:10.5px; color:var(--txt3); margin-top:2px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.fq-make{ background:var(--brand-light); border-color:var(--brand); border-style:dashed; }
.fq-make .fq-title{ color:var(--brand-dark); }
.fq-make-plus{
  width:34px; height:34px; border-radius:9px; flex-shrink:0; display:grid; place-items:center;
  background:var(--brand-btn); color:#fff;
}
`;
