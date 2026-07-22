import Link from 'next/link';

import { CountUp } from '@/components/ui/count-up';

import type { TodayStats } from '@/lib/db/queries/community';

// F1.2 - Today in numbers. The daily rhythm anchor, placed directly under the
// page H1. Baked at ISR from getTodayStats (one RPC, resets at UTC midnight).
//
// Honesty rules: a zero cell shows "-" rather than 0, so an early-morning UTC
// visit reads as "not yet" instead of "dead". If literally everything is zero
// (and no hot group), the whole strip hides, same M1.29 empty-data pattern.
//
// Layout: 2x2 on a phone, 4-up once there is room. Four full labels ("groups
// mastered") do not fit one row at 375px without truncation, and truncated
// labels read worse than an honest 2x2.
export function TodayStrip({ stats }: { stats: TodayStats }): React.ReactElement | null {
  const allZero =
    stats.playsToday === 0 &&
    stats.quizzesToday === 0 &&
    stats.mastersToday === 0 &&
    !stats.hotGroup;
  if (allZero) return null;

  return (
    <>
      <div className="today-strip">
        <style>{CSS}</style>
        <Cell value={stats.playsToday} label="plays today" />
        <Cell value={stats.quizzesToday} label="quizzes made" />
        <Cell value={stats.mastersToday} label="groups mastered" />
        {stats.hotGroup ? (
          <Link href={`/${stats.hotGroup.slug}-quiz`} className="today-cell today-hot">
            <div className="today-hot-row">
              {stats.hotGroup.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={stats.hotGroup.logoUrl} alt="" width={18} height={18} className="today-hot-logo" />
              ) : null}
              <span className="today-hot-name">{stats.hotGroup.name}</span>
            </div>
            <div className="today-label">hottest group</div>
          </Link>
        ) : (
          <Cell value={0} label="hottest group" />
        )}
      </div>
      <p style={{ margin: '-6px 0 16px', fontSize: 12, textAlign: 'right' }}>
        <Link href="/stats" style={{ color: 'var(--brand)', fontWeight: 600, textDecoration: 'none' }}>
          See the full K-pop fan data {'->'}
        </Link>
      </p>
    </>
  );
}

function Cell({ value, label }: { value: number; label: string }): React.ReactElement {
  return (
    <div className="today-cell">
      <div className="today-value" style={{ color: value > 0 ? 'var(--txt1)' : 'var(--txt3)' }}>
        {value > 0 ? <CountUp value={value} compact /> : '-'}
      </div>
      <div className="today-label">{label}</div>
    </div>
  );
}

const CSS = `
.today-strip{ display:grid; grid-template-columns:repeat(2,1fr); gap:8px; margin-bottom:16px; }
@media (min-width:480px){ .today-strip{ grid-template-columns:repeat(4,1fr); } }
.today-cell{
  background:var(--surface-alt); border-radius:10px; padding:10px 12px; min-width:0;
  text-decoration:none; display:block;
}
.today-value{ font-size:18px; font-weight:800; font-variant-numeric:tabular-nums; line-height:1.1; }
.today-label{
  font-size:10px; text-transform:uppercase; letter-spacing:0.05em; color:var(--txt3);
  margin-top:3px; line-height:1.25;
}
.today-hot-row{ display:flex; align-items:center; gap:6px; }
.today-hot-logo{ width:18px; height:18px; border-radius:5px; object-fit:cover; flex-shrink:0; }
.today-hot-name{
  font-size:14px; font-weight:800; color:var(--txt1); min-width:0;
  overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
}
.today-hot:hover .today-hot-name{ color:var(--brand); }
`;
