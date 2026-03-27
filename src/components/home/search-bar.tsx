'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import { UserAvatar } from '@/components/ui/user-avatar';
import { formatCount } from '@/lib/utils';

interface SearchQuiz {
  id: string;
  title: string;
  slug: string;
  play_count: number;
  group_name: string;
  group_slug: string;
  display_color: string;
  text_color: string;
  group_logo_url: string | null;
}

interface SearchGroup {
  id: number;
  name: string;
  slug: string;
  display_color: string;
  text_color: string;
  logo_url: string | null;
  quiz_count: number;
}

interface SearchCreator {
  username: string;
  avatar_url: string | null;
  avatar_bg: string;
  avatar_text: string;
  total_quizzes_created: number;
}

interface SearchResults {
  quizzes: SearchQuiz[];
  groups: SearchGroup[];
  creators: SearchCreator[];
}

export function SearchBar(): React.ReactElement {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();

  // Debounced search
  const search = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults(null);
      setShowDropdown(false);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      if (!res.ok) return;
      const data: SearchResults = await res.json();
      setResults(data);
      setShowDropdown(true);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  const handleInputChange = useCallback((value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(value), 300);
  }, [search]);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setShowDropdown(false);
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim().length >= 2) {
      setShowDropdown(false);
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  const hasResults = results && (results.quizzes.length > 0 || results.groups.length > 0 || results.creators.length > 0);
  const noResults = results && !hasResults && query.length >= 2;

  return (
    <div ref={containerRef} className="relative mt-4 mb-4">
      <form onSubmit={handleSubmit}>
        <div className="relative">
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            className="absolute left-4 top-1/2 -translate-y-1/2 text-txt-tertiary"
          >
            <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M11 11L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => handleInputChange(e.target.value)}
            onFocus={() => { if (results && query.length >= 2) setShowDropdown(true); }}
            placeholder="Search quizzes or groups..."
            className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-border-light bg-surface-primary text-txt-primary placeholder:text-txt-tertiary focus:outline-none focus:border-border-medium transition-colors"
          />
        </div>
      </form>

      {showDropdown && (hasResults || noResults || loading) && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-surface-primary border border-border-light rounded-xl shadow-sm max-h-[420px] overflow-y-auto z-50">
          {loading && !results && (
            <div className="px-4 py-4 text-center">
              <p className="text-xs text-txt-tertiary">Searching...</p>
            </div>
          )}

          {noResults && (
            <div className="px-4 py-6 text-center">
              <p className="text-sm text-txt-tertiary">No results for &quot;{query}&quot;</p>
              <p className="text-xs text-txt-tertiary mt-1">Try a different group name or quiz title</p>
            </div>
          )}

          {hasResults && (
            <div>
              {/* Quizzes section */}
              {results!.quizzes.length > 0 && (
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-wider text-txt-tertiary px-4 pt-3 pb-1">
                    Quizzes
                  </p>
                  {results!.quizzes.map((q) => (
                    <Link
                      key={q.id}
                      href={`/q/${q.slug}`}
                      onClick={() => setShowDropdown(false)}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-surface-secondary transition-colors"
                    >
                      {/* Group logo */}
                      {q.group_logo_url ? (
                        <img
                          src={q.group_logo_url}
                          alt={q.group_name}
                          className="w-7 h-7 rounded-md object-contain flex-shrink-0"
                        />
                      ) : (
                        <div
                          className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: q.display_color }}
                        >
                          <span
                            className="text-[9px] font-medium"
                            style={{ color: q.text_color }}
                          >
                            {q.group_name?.slice(0, 3).toUpperCase()}
                          </span>
                        </div>
                      )}

                      {/* Text content */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-txt-primary truncate">{q.title}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span
                            className="text-[11px] font-medium px-1.5 py-0 rounded-full"
                            style={{ backgroundColor: q.display_color, color: q.text_color }}
                          >
                            {q.group_name}
                          </span>
                          <span className="text-[11px] text-txt-tertiary">·</span>
                          <span className="text-[11px] text-txt-tertiary">
                            {formatCount(q.play_count)} plays
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}

              {/* Divider between sections */}
              {results!.quizzes.length > 0 && results!.groups.length > 0 && (
                <div className="h-px bg-border-light mx-4" />
              )}

              {/* Groups section */}
              {results!.groups.length > 0 && (
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-wider text-txt-tertiary px-4 pt-3 pb-1">
                    Groups
                  </p>
                  {results!.groups.map((g) => (
                    <Link
                      key={g.id}
                      href={`/group/${g.slug}`}
                      onClick={() => setShowDropdown(false)}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-surface-secondary transition-colors"
                    >
                      {/* Group logo */}
                      {g.logo_url ? (
                        <img
                          src={g.logo_url}
                          alt={g.name}
                          className="w-7 h-7 rounded-md object-contain flex-shrink-0"
                        />
                      ) : (
                        <div
                          className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: g.display_color }}
                        >
                          <span
                            className="text-[9px] font-medium"
                            style={{ color: g.text_color }}
                          >
                            {g.name?.slice(0, 3).toUpperCase()}
                          </span>
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-txt-primary">{g.name}</p>
                        <p className="text-[11px] text-txt-tertiary mt-0.5">
                          {g.quiz_count} quizzes
                        </p>
                      </div>

                      {/* Chevron */}
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="flex-shrink-0">
                        <path d="M5 3L9 7L5 11" stroke="var(--text-tertiary)" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    </Link>
                  ))}
                </div>
              )}

              {/* Divider before creators */}
              {(results!.quizzes.length > 0 || results!.groups.length > 0) && results!.creators.length > 0 && (
                <div className="h-px bg-border-light mx-4" />
              )}

              {/* Creators section */}
              {results!.creators.length > 0 && (
                <div className="pb-1">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-txt-tertiary px-4 pt-3 pb-1">
                    Creators
                  </p>
                  {results!.creators.map((c) => (
                    <Link
                      key={c.username}
                      href={`/u/${c.username}`}
                      onClick={() => setShowDropdown(false)}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-surface-secondary transition-colors"
                    >
                      <UserAvatar
                        username={c.username}
                        avatarUrl={c.avatar_url}
                        bgColor={c.avatar_bg}
                        textColor={c.avatar_text}
                        size={28}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-txt-primary">{c.username}</p>
                        <p className="text-[11px] text-txt-tertiary mt-0.5">
                          {c.total_quizzes_created} {c.total_quizzes_created === 1 ? 'quiz' : 'quizzes'}
                        </p>
                      </div>

                      {/* Chevron */}
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="flex-shrink-0">
                        <path d="M5 3L9 7L5 11" stroke="var(--text-tertiary)" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
