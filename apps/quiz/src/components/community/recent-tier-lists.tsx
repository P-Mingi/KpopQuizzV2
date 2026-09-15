import Link from 'next/link';

import { formatCount } from '@/lib/utils';
import type { CommunityTierList } from '@/lib/tier-list/db';

// Community "Recent tier lists" box (replaces the old across-the-Verse feed). A
// grid of the newest public tier lists, each a mini board preview (top tiers with
// real member initials) plus the real author and real like/view counts. Real data
// only: the section is min-gated (hidden when empty) so it never shows a stub.

function HeartIcon(): React.ReactElement {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="#E8457A" aria-hidden="true"><path d="M12 21s-6.7-4.3-9.3-8.3C.9 9.8 2.2 6.5 5.2 6c1.9-.3 3.6.8 4.8 2.3C11.2 6.8 12.9 5.7 14.8 6c3 .5 4.3 3.8 2.5 6.7C18.7 16.7 12 21 12 21z" /></svg>;
}
function EyeIcon(): React.ReactElement {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></svg>;
}

// Deterministic soft pastel for an item chip, keyed by its initials, so the mini
// board reads lively (per the validated design) without any per-item colour data.
const CHIP_PALETTE: Array<{ bg: string; text: string }> = [
  { bg: '#F3D9E8', text: '#B5345F' },
  { bg: '#E7DFF5', text: '#7B3FA8' },
  { bg: '#D9EAD3', text: '#4A7A3A' },
  { bg: '#FCE8CF', text: '#B5713A' },
  { bg: '#D9E9FB', text: '#2C5A8A' },
  { bg: '#FBE3E3', text: '#A34545' },
];
function chipColor(seed: string): { bg: string; text: string } {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return CHIP_PALETTE[h % CHIP_PALETTE.length]!;
}

function Card({ list }: { list: CommunityTierList }): React.ReactElement {
  return (
    <Link href={`/tier-list/l/${list.slug}`} className="rtl-card" aria-label={`${list.title} tier list by ${list.authorName ?? 'a fan'}`}>
      {/* Mini board preview */}
      <div className="rtl-board" aria-hidden="true">
        {list.rows.map((row) => (
          <div className="rtl-row" key={row.label}>
            <span className="rtl-tier" style={{ background: row.color }}>{row.label}</span>
            <span className="rtl-chips">
              {row.chips.map((c, i) => {
                const col = chipColor(c + i);
                return <span className="rtl-chip" key={i} style={{ background: col.bg, color: col.text }}>{c}</span>;
              })}
              {row.more > 0 ? <span className="rtl-more">+{row.more}</span> : null}
            </span>
          </div>
        ))}
      </div>

      <h3 className="rtl-title">{list.title}</h3>

      <div className="rtl-foot">
        <span className="rtl-author">
          {list.authorAvatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="rtl-avatar" src={list.authorAvatarUrl} alt="" width={26} height={26} referrerPolicy="no-referrer" />
          ) : (
            <span className="rtl-avatar rtl-avatar-init" style={{ background: list.authorBg, color: list.authorText }}>{list.authorInitial}</span>
          )}
          <span className="rtl-by">by {list.authorName ?? 'a fan'}</span>
        </span>
        <span className="rtl-stats">
          <span className="rtl-stat rtl-likes"><HeartIcon /> {formatCount(list.likes)}</span>
          <span className="rtl-stat rtl-views"><EyeIcon /> {formatCount(list.views)}</span>
        </span>
      </div>
    </Link>
  );
}

export function RecentTierLists({ lists }: { lists: CommunityTierList[] }): React.ReactElement | null {
  if (!lists || lists.length === 0) return null; // min-gate: no stub when empty
  return (
    <section className="rtl" aria-label="Recent tier lists">
      <div className="rtl-head">
        <p className="rtl-eyebrow">Recent tier lists</p>
        <Link href="/tier-list" className="rtl-all">Make yours</Link>
      </div>
      <div className="rtl-grid">
        {lists.map((l) => <Card key={l.slug} list={l} />)}
      </div>
    </section>
  );
}
