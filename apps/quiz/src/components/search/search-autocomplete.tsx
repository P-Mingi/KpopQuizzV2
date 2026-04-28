'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface Suggestion {
  type: 'group' | 'quiz' | 'tag';
  label: string;
  quizCount?: number;
  author?: string;
  slug?: string;
}

interface SearchAutocompleteProps {
  placeholder?: string;
}

const TYPE_COLORS: Record<string, { background: string; color: string }> = {
  group: { background: 'rgba(128,80,160,0.08)', color: '#8050a0' },
  quiz: { background: 'rgba(212,83,126,0.08)', color: '#D4537E' },
  tag: { background: 'rgba(232,160,96,0.08)', color: '#e8a060' },
};

export function SearchAutocomplete({ placeholder = 'Search quizzes, groups, idols...' }: SearchAutocompleteProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (query.length < 1) { setSuggestions([]); return; }

    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search/suggest?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data.suggestions || []);
          setShowDropdown(true);
        }
      } catch {
        // search is non-critical
      }
    }, 200);

    return () => clearTimeout(timeout);
  }, [query]);

  const handleSelect = (s: Suggestion) => {
    setShowDropdown(false);
    setQuery('');
    if (s.type === 'group') {
      router.push(`/quizzes?group=${encodeURIComponent(s.label)}`);
    } else if (s.type === 'quiz' && s.slug) {
      router.push(`/q/${s.slug}`);
    } else if (s.type === 'tag') {
      router.push(`/quizzes?tag=${encodeURIComponent(s.label)}`);
    } else {
      router.push(`/search?q=${encodeURIComponent(s.label)}`);
    }
  };

  const handleSubmit = () => {
    if (query.length > 0) {
      setShowDropdown(false);
      router.push(`/search?q=${encodeURIComponent(query)}`);
    }
  };

  return (
    <div ref={wrapperRef} style={{ position: 'relative' }}>
      <input
        value={query}
        onChange={e => { setQuery(e.target.value); setShowDropdown(true); }}
        onKeyDown={e => e.key === 'Enter' && handleSubmit()}
        onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
        placeholder={placeholder}
        style={{
          width: '100%', padding: '10px 12px 10px 32px', borderRadius: 10,
          background: '#fff', border: '1px solid #e8e6e0',
          fontSize: 11, color: '#2c2c2a', outline: 'none',
          boxSizing: 'border-box',
        }}
      />
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#b4b2a9" strokeWidth="1.5" strokeLinecap="round" style={{ position: 'absolute', left: 10, top: 11, pointerEvents: 'none' }} aria-hidden="true">
        <circle cx="6" cy="6" r="4" /><path d="M9.5 9.5L13 13" />
      </svg>
      {query.length > 0 && (
        <div onClick={() => { setQuery(''); setSuggestions([]); setShowDropdown(false); }} style={{ position: 'absolute', right: 10, top: 10, fontSize: 12, color: '#b4b2a9', cursor: 'pointer' }} aria-label="Clear search">{'\u2715'}</div>
      )}

      {showDropdown && suggestions.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, zIndex: 10,
          borderRadius: 10, background: '#fff', border: '1px solid #e8e6e0',
          boxShadow: '0 8px 24px rgba(0,0,0,0.08)', overflow: 'hidden',
        }}>
          {suggestions.map((s, i) => (
            <div key={i} onClick={() => handleSelect(s)} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 12px', cursor: 'pointer',
              borderBottom: i < suggestions.length - 1 ? '1px solid rgba(0,0,0,0.03)' : 'none',
            }}>
              <span style={{
                fontSize: 7, fontWeight: 600, padding: '1px 5px', borderRadius: 4,
                background: TYPE_COLORS[s.type]?.background ?? 'rgba(212,83,126,0.08)',
                color: TYPE_COLORS[s.type]?.color ?? '#D4537E',
              }}>{s.type}</span>
              <span style={{ fontSize: 10, fontWeight: 500, color: '#2c2c2a', flex: 1 }}>{s.label}</span>
              <span style={{ fontSize: 8, color: '#b4b2a9' }}>
                {s.quizCount ? `${s.quizCount} quizzes` : s.author ? `by ${s.author}` : ''}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
