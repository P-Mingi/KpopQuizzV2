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
  display_color: string;
  text_color: string;
}

interface SearchGroup {
  id: number;
  name: string;
  slug: string;
  display_color: string;
  text_color: string;
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
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-txt-tertiary"
          >
            <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => handleInputChange(e.target.value)}
            onFocus={() => { if (results && query.length >= 2) setShowDropdown(true); }}
            placeholder="Search quizzes, groups, or creators..."
            className="w-full pl-10 pr-4 py-3 rounded-full border border-border-light bg-surface-primary text-sm placeholder:text-txt-tertiary focus:outline-none focus:border-accent-pink focus:ring-1 focus:ring-accent-pink"
          />
        </div>
      </form>

      {showDropdown && (hasResults || noResults || loading) && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-surface-primary border border-border-light rounded-lg max-h-[400px] overflow-y-auto z-40">
          {loading && !results && (
            <div className="p-4 text-center text-sm text-txt-secondary">Searching...</div>
          )}

          {noResults && (
            <div className="p-4 text-center text-sm text-txt-secondary">
              No results for &apos;{query}&apos;
            </div>
          )}

          {hasResults && (
            <div className="py-2">
              {/* Quizzes section */}
              {results!.quizzes.length > 0 && (
                <div>
                  <p className="px-4 py-1.5 text-xs font-medium text-txt-tertiary uppercase">Quizzes</p>
                  {results!.quizzes.map((q) => (
                    <Link
                      key={q.id}
                      href={`/q/${q.slug}`}
                      onClick={() => setShowDropdown(false)}
                      className="flex items-center gap-2 px-4 py-2 hover:bg-surface-secondary transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-txt-primary truncate">{q.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span
                            className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                            style={{ backgroundColor: q.display_color, color: q.text_color }}
                          >
                            {q.group_name}
                          </span>
                          <span className="text-xs text-txt-tertiary">{formatCount(q.play_count)} plays</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}

              {/* Groups section */}
              {results!.groups.length > 0 && (
                <div>
                  <p className="px-4 py-1.5 text-xs font-medium text-txt-tertiary uppercase">Groups</p>
                  {results!.groups.map((g) => (
                    <Link
                      key={g.id}
                      href={`/group/${g.slug}`}
                      onClick={() => setShowDropdown(false)}
                      className="flex items-center gap-2 px-4 py-2 hover:bg-surface-secondary transition-colors"
                    >
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ backgroundColor: g.display_color, color: g.text_color }}
                      >
                        {g.name}
                      </span>
                      <span className="text-xs text-txt-tertiary">{g.quiz_count} quizzes</span>
                    </Link>
                  ))}
                </div>
              )}

              {/* Creators section */}
              {results!.creators.length > 0 && (
                <div>
                  <p className="px-4 py-1.5 text-xs font-medium text-txt-tertiary uppercase">Creators</p>
                  {results!.creators.map((c) => (
                    <Link
                      key={c.username}
                      href={`/u/${c.username}`}
                      onClick={() => setShowDropdown(false)}
                      className="flex items-center gap-2 px-4 py-2 hover:bg-surface-secondary transition-colors"
                    >
                      <UserAvatar
                        username={c.username}
                        avatarUrl={c.avatar_url}
                        bgColor={c.avatar_bg}
                        textColor={c.avatar_text}
                        size={24}
                      />
                      <span className="text-sm text-txt-primary">{c.username}</span>
                      <span className="text-xs text-txt-tertiary">{c.total_quizzes_created} quizzes</span>
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
