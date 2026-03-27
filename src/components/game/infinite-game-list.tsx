'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

import { GameCard } from '@/components/game/game-card';

import type { GameCardData } from '@/lib/db/types';

interface InfiniteGameListProps {
  initialGames: GameCardData[];
  fetchUrl: string;
}

export function InfiniteGameList({ initialGames, fetchUrl }: InfiniteGameListProps): React.ReactElement {
  const [games, setGames] = useState(initialGames);
  const [offset, setOffset] = useState(initialGames.length);
  const [hasMore, setHasMore] = useState(initialGames.length >= 20);
  const [loading, setLoading] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    try {
      const sep = fetchUrl.includes('?') ? '&' : '?';
      const res = await fetch(`${fetchUrl}${sep}offset=${offset}&limit=20`);
      if (!res.ok) throw new Error('Failed to load');
      const data: { games: GameCardData[] } = await res.json();
      setGames(prev => [...prev, ...data.games]);
      setOffset(prev => prev + data.games.length);
      setHasMore(data.games.length >= 20);
    } catch (err) {
      console.error('Failed to load more games:', err);
    } finally {
      setLoading(false);
    }
  }, [fetchUrl, offset, loading, hasMore]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      entries => { if (entries[0]?.isIntersecting) loadMore(); },
      { rootMargin: '200px' },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore]);

  return (
    <div>
      <div className="space-y-3">
        {games.map(game => (
          <GameCard key={game.id} game={game} />
        ))}
      </div>

      <div ref={sentinelRef} className="h-4" />

      {loading && (
        <div className="flex justify-center py-6">
          <div className="w-5 h-5 border-2 border-border-light border-t-accent-pink rounded-full animate-spin" />
        </div>
      )}

      {!hasMore && games.length > 0 && (
        <p className="text-center text-xs text-txt-tertiary py-6">All games loaded</p>
      )}
    </div>
  );
}
