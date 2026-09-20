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
    title: q ? `Search: ${q}` : 'Search',
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

export default async function SearchPage({ searchParams }: SearchPageProps): Promise<React.ReactElement> {
  const { q } = await searchParams;
  const query = q?.trim() ?? '';

  if (query.length < 2) {
    return (
      <div className="py-6">
        <h1 className="text-xl font-bold text-primary mb-4">Search</h1>
        <SearchForm initial="" />
        <p className="text-sm text-secondary text-center py-8">Search quizzes, groups and creators. Try “BTS”.</p>
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

  const [qTitle, qGroup, peopleRes] = await Promise.all([
    supabase.from('quizzes').select(QUIZ_SELECT).eq('status', 'published').ilike('title', pattern).order('play_count', { ascending: false }).limit(12),
    hasGroups
      ? supabase.from('quizzes').select(QUIZ_SELECT).eq('status', 'published').in('group_id', groupIds).order('play_count', { ascending: false }).limit(12)
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

  interface PersonRow { username: string; display_name: string | null; avatar_url: string | null; avatar_bg: string; avatar_text: string; xp: number; follower_count: number }
  const people = (peopleRes.data ?? []) as PersonRow[];

  const hasResults = quizzes.length > 0 || groups.length > 0 || people.length > 0;

  // Fuzzy "always-propose" fallback: nothing matched → show popular picks.
  let fbQuizzes: QuizCardData[] = [];
  if (!hasResults) {
    const pq = await supabase.from('quizzes').select(QUIZ_SELECT).eq('status', 'published').order('play_count', { ascending: false }).limit(6);
    fbQuizzes = ((pq.data ?? []) as unknown as RawQuizRow[]).map(toQuizCardData);
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
        </div>
      )}
    </div>
  );
}
