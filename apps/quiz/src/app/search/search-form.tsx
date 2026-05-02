'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function SearchForm({ initial }: { initial: string }) {
  const [value, setValue] = useState(initial);
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = value.trim();
    if (q.length >= 2) {
      router.push(`/search?q=${encodeURIComponent(q)}`);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '12px 14px', marginBottom: 16,
      background: 'var(--bg-surface)', border: '1px solid var(--border)',
      borderRadius: 12,
    }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" />
      </svg>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search quizzes, groups, members..."
        autoFocus
        style={{
          flex: 1, border: 0, outline: 0, background: 'transparent',
          color: 'var(--text-primary)', fontSize: 14, fontFamily: 'inherit',
        }}
      />
      {value && (
        <button type="button" onClick={() => setValue('')} style={{
          background: 0, border: 0, color: 'var(--text-tertiary)', cursor: 'pointer', padding: 0, lineHeight: 1,
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}
    </form>
  );
}
