'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

import { QuizTypeBadge } from '@/components/ui/quiz-type-badge';
import { DifficultyBadge } from '@/components/ui/difficulty-badge';
import { UserAvatar } from '@/components/ui/user-avatar';
import { GroupLogo } from '@/components/ui/group-logo';
import { formatCount } from '@/lib/utils';
import type { QuizCardData } from '@/lib/db/types';

interface Props {
  quiz: QuizCardData;
}

export function HomeQotd({ quiz }: Props) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    function calc() {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setUTCHours(24, 0, 0, 0);
      const diff = tomorrow.getTime() - now.getTime();
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setTimeLeft(`${h}h ${m}m`);
    }
    calc();
    const iv = setInterval(calc, 60000);
    return () => clearInterval(iv);
  }, []);

  return (
    <section style={{ marginBottom: 28 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
        <h2 style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.01em', color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--accent)" aria-hidden="true">
            <path d="M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8L12 2z"/>
          </svg>
          Quiz of the day
        </h2>
        <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-tertiary)' }}>
          Resets in {timeLeft}
        </span>
      </div>

      <Link href={`/q/${quiz.slug}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
        <div style={{
          background: 'var(--bg-surface)', border: '1px solid var(--border)',
          borderRadius: 14, boxShadow: 'var(--shadow-card)',
          overflow: 'hidden',
        }}>
          {/* Gradient header with group logo */}
          <div style={{
            height: 120, position: 'relative', overflow: 'hidden',
            background: `linear-gradient(135deg, ${quiz.display_color}, color-mix(in srgb, ${quiz.display_color} 60%, var(--accent)))`,
          }}>
            <div style={{
              position: 'absolute', inset: 0,
              backgroundImage: 'radial-gradient(circle at 20% 30%, rgba(255,255,255,0.18), transparent 40%), radial-gradient(circle at 80% 70%, rgba(255,255,255,0.10), transparent 40%)',
            }} />
            <div style={{ position: 'absolute', top: 14, left: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                background: 'rgba(0,0,0,0.32)', color: '#fff', fontSize: 10, fontWeight: 700,
                padding: '4px 8px', borderRadius: 9999, letterSpacing: '0.08em', textTransform: 'uppercase',
              }}>
                Today&apos;s pick
              </span>
            </div>
            <div style={{ position: 'absolute', bottom: -28, right: -10, opacity: 0.85, borderRadius: '50%', overflow: 'hidden', border: '2px solid var(--bg-surface)', boxShadow: 'var(--shadow-card)' }}>
              <GroupLogo groupName={quiz.group_name} logoUrl={quiz.logo_url} displayColor={quiz.display_color} textColor={quiz.text_color} size={140} />
            </div>
          </div>

          {/* Content */}
          <div style={{ padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <QuizTypeBadge type={quiz.quiz_type} size="sm" />
              <DifficultyBadge difficulty={quiz.difficulty} />
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.25, marginBottom: 6, letterSpacing: '-0.01em', margin: '0 0 6px' }}>
              {quiz.title}
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12, color: 'var(--text-secondary)', marginBottom: 14 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <UserAvatar
                  username={quiz.creator_username}
                  avatarUrl={quiz.creator_avatar_url}
                  bgColor={quiz.creator_avatar_bg}
                  textColor={quiz.creator_avatar_text}
                  size={20}
                />
                {quiz.creator_username}
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
                </svg>
                {formatCount(quiz.play_count)} plays
              </span>
            </div>
            <button style={{
              width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '10px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600,
              background: 'var(--accent)', color: 'var(--accent-fg)', border: '1px solid transparent',
              cursor: 'pointer',
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>
              Play today&apos;s quiz
            </button>
          </div>
        </div>
      </Link>
    </section>
  );
}
