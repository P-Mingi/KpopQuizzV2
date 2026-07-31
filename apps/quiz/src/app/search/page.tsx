import Link from 'next/link';

import { createServerClient, createPublicReadClient } from '@/lib/supabase/server';
import { UserAvatar } from '@/components/ui/user-avatar';
import { QuizCard } from '@/components/ui/quiz-card';
import { Mascot } from '@/components/ui/mascot';
import { FollowButton } from '@/components/profile/follow-button';
import { formatCount } from '@/lib/utils';
import { getLevelInfo } from '@/lib/constants';
import { getTitleForLevel } from '@/lib/level-titles';
import { SearchForm } from './search-form';

import type { Metadata } from 'next';
import type { QuizCardData } from '@/lib/db/types';

interface SearchPageProps {
  searchParams: Promise<{ q?: string }>;
}

export async function generateMetadata({ searchParams }: SearchPageProps): Promise<Metadata> {
  const { q } = await searchParams;
  return {
    title: q ? `Search: ${q} | KpopQuiz` : 'Search | KpopQuiz',
    robots: { index: false, follow: true },
  };
}

const QUIZ_SELECT = `
  id, title, slug, quiz_type, difficulty, language, play_count, total_score_sum, total_completions, like_count, created_at, questions, cover_image_url, group_id,
  groups!inner (name, slug, display_color, text_color, fandom_name, logo_url),
  profiles!inner (username, avatar_url, avatar_bg, avatar_text)
`;

interface RawQuizRow {
  id: string; title: string; slug: string; quiz_type: string; difficulty: string; language?: string;
  play_count: number; total_score_sum: number; total_completions: number; like_count: number;
  created_at: string; questions: unknown[]; cover_image_url: string | null;
  groups: { name: string; slug: string; display_color: string; text_color: string; fandom_name: string; logo_url: string | null };
  profiles: { username: string; avatar_url: string | null; avatar_bg: string; avatar_text: string };
}

function toQuizCardData(row: RawQuizRow): QuizCardData {
  return {
    id: row.id, title: row.title, slug: row.slug,
    quiz_type: row.quiz_type as QuizCardData['quiz_type'],
    difficulty: row.difficulty as QuizCardData['difficulty'],
    language: (row.language as QuizCardData['language']) ?? 'en',
    play_count: row.play_count, total_score_sum: row.total_score_sum,
    total_completions: row.total_completions, like_count: row.like_count ?? 0,
    created_at: row.created_at,
    group_name: row.groups.name, group_slug: row.groups.slug,
    display_color: row.groups.display_color, text_color: row.groups.text_color,
    logo_url: row.groups.logo_url, fandom_name: row.groups.fandom_name,
    creator_username: row.profiles.username, creator_avatar_url: row.profiles.avatar_url,
    creator_avatar_bg: row.profiles.avatar_bg, creator_avatar_text: row.profiles.avatar_text,
    question_count: Array.isArray(row.questions) ? row.questions.length : 0,
    cover_image_url: row.cover_image_url ?? null,
  };
}

// ---- Games (unified result shape) ----
interface GameResult {
  id: string; slug: string; title: string;
  kind: 'tot' | 'nam'; label: string; href: string;
  plays: number; preview: string | null;
}

function firstImage(items: unknown): string | null {
  if (!Array.isArray(items)) return null;
  for (const it of items as Array<Record<string, unknown>>) {
    const img = (it?.image_url as string | undefined) ?? (it?.photo_url as string | undefined);
    if (img) return img;
  }
  return null;
}

function totToResult(r: { id: string; slug: string; title: string; play_count: number; tot_items?: { image_url: string | null }[] }): GameResult {
  return { id: r.id, slug: r.slug, title: r.title, kind: 'tot', label: 'This or That', href: `/games/this-or-that/${r.slug}`, plays: r.play_count, preview: firstImage(r.tot_items) };
}
function gameToResult(r: { id: string; slug: string; title: string; play_count: number; content: unknown }): GameResult {
  const raw = (r.content ?? {}) as Record<string, unknown>;
  const items = (raw.items as unknown) ?? (raw.members as unknown) ?? [];
  return { id: r.id, slug: r.slug, title: r.title, kind: 'nam', label: 'Name all', href: `/games/name-all/${r.slug}`, plays: r.play_count, preview: firstImage(items) };
}

/** A game rendered with the same .quiz-card shell as quizzes, for a harmonized grid. */
function GameResultCard({ game }: { game: GameResult }): React.ReactElement {
  const tint = game.kind === 'tot'
    ? { bg: 'var(--tot-bg)', fg: 'var(--tot-icon)' }
    : { bg: 'var(--nam-bg)', fg: 'var(--nam-icon)' };
  return (
    <Link href={game.href} className="quiz-card" aria-label={`${game.title}, ${game.label} game`}>
      <div className="quiz-cover" style={{ background: tint.bg }}>
        {game.preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={game.preview} alt={`${game.title} preview`} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: tint.fg }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="6" y1="11" x2="10" y2="11" /><line x1="8" y1="9" x2="8" y2="13" /><line x1="15" y1="12" x2="15.01" y2="12" /><line x1="18" y1="10" x2="18.01" y2="10" /><rect x="2" y="6" width="20" height="12" rx="2" /></svg>
          </span>
        )}
      </div>
      <div className="quiz-body">
        <div className="badge-row">
          <span className="badge" style={{ background: tint.bg, color: tint.fg }}>{game.label}</span>
        </div>
        <p className="quiz-title">{game.title}</p>
        <div className="quiz-meta">
          <span className="quiz-plays">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
            {formatCount(game.plays)}
          </span>
        </div>
      </div>
    </Link>
  );
}

export default async function SearchPage({ searchParams }: SearchPageProps): Promise<React.ReactElement> {
  const { q } = await searchParams;
  const query = q?.trim() ?? '';

  if (query.length < 2) {
    return (
      <div className="py-6">
        <h1 className="text-xl font-bold text-primary mb-4">Search</h1>
        <SearchForm initial="" />
        <p className="text-sm text-secondary text-center py-8">Search quizzes, games, groups and creators. Try “BTS”.</p>
      </div>
    );
  }

  const supabase = await createServerClient();
  const publicDb = createPublicReadClient();
  // Sanitize for ilike/.in (strip chars that break PostgREST filters).
  const safe = query.replace(/[%,()]/g, ' ').trim();
  const pattern = `%${safe}%`;
  // Stricter term for the PostgREST .or() string filter (M1.9 people search).
  const orTerm = safe.replace(/[^a-zA-Z0-9 _-]/g, '').trim();

  // Groups first so we can also match quizzes/games by group (e.g. "bts" → BTS content).
  const groupsRes = await supabase
    .from('groups')
    .select('id, name, slug, fandom_name, display_color, text_color, quiz_count')
    .ilike('name', pattern)
    .order('quiz_count', { ascending: false })
    .limit(10);
  const groups = (groupsRes.data ?? []) as Array<{ id: number; name: string; slug: string; fandom_name: string | null; display_color: string; text_color: string; quiz_count: number }>;
  const groupIds = groups.map((g) => g.id);
  const hasGroups = groupIds.length > 0;

  const [qTitle, qGroup, totRes, gTitle, gGroup, peopleRes] = await Promise.all([
    supabase.from('quizzes').select(QUIZ_SELECT).eq('status', 'published').ilike('title', pattern).order('play_count', { ascending: false }).limit(12),
    hasGroups
      ? supabase.from('quizzes').select(QUIZ_SELECT).eq('status', 'published').in('group_id', groupIds).order('play_count', { ascending: false }).limit(12)
      : Promise.resolve({ data: [] as unknown[] }),
    supabase.from('tot_categories').select('id, slug, title, play_count, tot_items(image_url)').eq('is_published', true).ilike('title', pattern).order('play_count', { ascending: false }).limit(6),
    supabase.from('games').select('id, title, slug, play_count, content').eq('status', 'published').ilike('title', pattern).order('play_count', { ascending: false }).limit(6),
    hasGroups
      ? supabase.from('games').select('id, title, slug, play_count, content').eq('status', 'published').in('group_id', groupIds).order('play_count', { ascending: false }).limit(6)
      : Promise.resolve({ data: [] as unknown[] }),
    // M1.9 people search: username OR display_name, banned excluded, index-backed
    // (mig 094 trigram GIN). Cookie-free public read, NANO-cheap, limit 20.
    orTerm.length >= 2
      ? publicDb.from('profiles')
          .select('username, display_name, avatar_url, avatar_bg, avatar_text, xp, follower_count')
          .or(`username.ilike.*${orTerm}*,display_name.ilike.*${orTerm}*`)
          .is('banned_at', null)
          .order('follower_count', { ascending: false })
          .limit(20)
      : Promise.resolve({ data: [] as unknown[] }),
  ]);

  // Merge + dedupe quizzes (title-match ∪ group-match).
  const quizMap = new Map<string, RawQuizRow>();
  for (const r of [...(qTitle.data ?? []), ...(qGroup.data ?? [])] as unknown as RawQuizRow[]) quizMap.set(r.id, r);
  const quizzes = [...quizMap.values()].map(toQuizCardData).slice(0, 12);

  // Merge + dedupe games.
  const gameMap = new Map<string, GameResult>();
  for (const r of (totRes.data ?? []) as Array<{ id: string; slug: string; title: string; play_count: number; tot_items?: { image_url: string | null }[] }>) {
    gameMap.set(`t-${r.id}`, totToResult(r));
  }
  for (const r of [...(gTitle.data ?? []), ...(gGroup.data ?? [])] as Array<{ id: string; slug: string; title: string; play_count: number; content: unknown }>) {
    gameMap.set(`g-${r.id}`, gameToResult(r));
  }
  const games = [...gameMap.values()].sort((a, b) => b.plays - a.plays).slice(0, 8);

  interface PersonRow { username: string; display_name: string | null; avatar_url: string | null; avatar_bg: string; avatar_text: string; xp: number; follower_count: number }
  const people = (peopleRes.data ?? []) as PersonRow[];

  const hasResults = quizzes.length > 0 || games.length > 0 || groups.length > 0 || people.length > 0;

  // Fuzzy "always-propose" fallback: nothing matched → show popular picks.
  let fbQuizzes: QuizCardData[] = [];
  let fbGames: GameResult[] = [];
  if (!hasResults) {
    const [pq, pt, pg] = await Promise.all([
      supabase.from('quizzes').select(QUIZ_SELECT).eq('status', 'published').order('play_count', { ascending: false }).limit(6),
      supabase.from('tot_categories').select('id, slug, title, play_count, tot_items(image_url)').eq('is_published', true).order('play_count', { ascending: false }).limit(2),
      supabase.from('games').select('id, title, slug, play_count, content').eq('status', 'published').order('play_count', { ascending: false }).limit(2),
    ]);
    fbQuizzes = ((pq.data ?? []) as unknown as RawQuizRow[]).map(toQuizCardData);
    fbGames = [
      ...((pt.data ?? []) as Array<{ id: string; slug: string; title: string; play_count: number; tot_items?: { image_url: string | null }[] }>).map(totToResult),
      ...((pg.data ?? []) as Array<{ id: string; slug: string; title: string; play_count: number; content: unknown }>).map(gameToResult),
    ];
  }

  return (
    <div className="py-6">
      <h1 className="text-xl font-bold text-primary mb-4">Search</h1>
      <SearchForm initial={query} />

      {hasResults ? (
        <div className="mt-6 flex flex-col gap-8">
          {quizzes.length > 0 && (
            <section>
              <p className="sec-label">Quizzes</p>
              <div className="cards-grid">
                {quizzes.map((q, i) => <QuizCard key={q.id} quiz={q} index={i} />)}
              </div>
            </section>
          )}

          {games.length > 0 && (
            <section>
              <p className="sec-label">Games</p>
              <div className="cards-grid">
                {games.map((g) => <GameResultCard key={`${g.kind}-${g.id}`} game={g} />)}
              </div>
            </section>
          )}

          {groups.length > 0 && (
            <section>
              <p className="sec-label">Fandom spaces</p>
              <div className="flex flex-wrap gap-2">
                {groups.map((g) => (
                  <Link key={`space-${g.id}`} href={`/verse/${g.slug}`} className="px-4 py-2 rounded-full text-sm font-semibold border transition-opacity hover:opacity-85"
                    style={{ borderColor: '#7c5cfc', color: '#7c5cfc' }}>
                    {g.fandom_name ?? g.name} · the {g.name} home
                  </Link>
                ))}
              </div>
            </section>
          )}

          {groups.length > 0 && (
            <section>
              <p className="sec-label">Groups</p>
              <div className="flex flex-wrap gap-2">
                {groups.map((g) => (
                  <Link key={g.id} href={`/quizzes?group=${g.slug}`} className="px-4 py-2 rounded-full text-sm font-medium transition-opacity hover:opacity-85"
                    style={{ backgroundColor: g.display_color, color: g.text_color }}>
                    {g.name} ({g.quiz_count})
                  </Link>
                ))}
              </div>
            </section>
          )}

          {people.length > 0 && (
            <section>
              <p className="sec-label">People</p>
              <div className="flex flex-col gap-2">
                {people.map((p) => {
                  const level = getLevelInfo(p.xp).level;
                  const title = getTitleForLevel(level).en;
                  return (
                    <div key={p.username}
                      className="flex items-center gap-3 p-3 rounded-xl border border-default">
                      <Link href={`/u/${p.username}`} className="flex items-center gap-3 flex-1 min-w-0 hover:opacity-90 transition-opacity">
                        <UserAvatar username={p.username} avatarUrl={p.avatar_url} bgColor={p.avatar_bg} textColor={p.avatar_text} size={40} />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-primary truncate">{p.display_name ?? p.username}</p>
                          <p className="text-xs text-secondary truncate">Lv {level} {'·'} {title} {'·'} {formatCount(p.follower_count)} {p.follower_count === 1 ? 'follower' : 'followers'}</p>
                        </div>
                      </Link>
                      <FollowButton profileUsername={p.username} />
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-8">
          <div className="text-center py-2">
            {/* F5 - sad mascot above the no-exact-match message. */}
            <div className="flex justify-center mb-2"><Mascot variant="sad" size={88} /></div>
            <p className="text-sm text-secondary">
              No exact match for <strong className="text-primary">“{query}”</strong>. Here&apos;s what fans are playing right now.
            </p>
          </div>
          {fbQuizzes.length > 0 && (
            <section>
              <p className="sec-label">Popular quizzes</p>
              <div className="cards-grid">
                {fbQuizzes.map((q, i) => <QuizCard key={q.id} quiz={q} index={i} />)}
              </div>
            </section>
          )}
          {fbGames.length > 0 && (
            <section>
              <p className="sec-label">Popular games</p>
              <div className="cards-grid">
                {fbGames.map((g) => <GameResultCard key={`${g.kind}-${g.id}`} game={g} />)}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
