import Link from 'next/link';
import { GroupLogo } from '@/components/ui/group-logo';
import type { Group } from '@/lib/db/types';

interface Props {
  groups: Group[];
}

export function HomeGroupRail({ groups }: Props) {
  const visible = groups.filter(g => g.quiz_count > 0).slice(0, 10);
  if (visible.length === 0) return null;

  return (
    <section style={{ marginBottom: 28 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
        <h2 style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.01em', color: 'var(--text-primary)', margin: 0 }}>
          Browse by group
        </h2>
        <Link href="/quizzes" style={{
          fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em',
          color: 'var(--accent)', textDecoration: 'none',
        }}>
          All 30+ {'\u2192'}
        </Link>
      </div>
      <div className="scrollbar-hide" style={{
        display: 'flex', gap: 14, overflowX: 'auto',
        margin: '0 -16px', padding: '4px 16px 8px',
      }}>
        {visible.map(g => (
          <Link key={g.slug} href={`/${g.slug}-quiz`} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
            flexShrink: 0, width: 64, textDecoration: 'none', color: 'inherit',
          }}>
            <GroupLogo
              groupName={g.name}
              logoUrl={g.logo_url}
              displayColor={g.display_color}
              textColor={g.text_color}
              size={56}
            />
            <span style={{ fontSize: 11, fontWeight: 600, textAlign: 'center', lineHeight: 1.2 }}>{g.name}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
