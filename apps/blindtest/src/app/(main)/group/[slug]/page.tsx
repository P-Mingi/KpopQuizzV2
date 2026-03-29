import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createServerClient } from '@kpopquiz/shared/supabase/server';

import type { Metadata } from 'next';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createServerClient();
  const { data: group } = await supabase.from('groups').select('name').eq('slug', slug).single();
  if (!group) return {};

  const { count } = await supabase
    .from('blind_test_songs')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'active')
    .not('clip_chorus', 'is', null);

  return {
    title: `${group.name} Blind Test - Guess ${group.name} Songs | K-pop Blind Test`,
    description: `Can you name ${group.name} songs from just a clip? ${count ?? 0} songs available. Play free.`,
    alternates: { canonical: `/group/${slug}` },
  };
}

export default async function GroupPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createServerClient();

  const { data: group } = await supabase.from('groups').select('id, name, slug').eq('slug', slug).single();
  if (!group) return notFound();

  const { count: songCount } = await supabase
    .from('blind_test_songs')
    .select('id', { count: 'exact', head: true })
    .eq('group_id', group.id)
    .eq('status', 'active')
    .not('clip_chorus', 'is', null);

  // Top players for this group
  const { data: topMasteries } = await supabase
    .from('player_group_mastery')
    .select('mastery_level, mastery_xp, players!inner(username, avatar_bg, avatar_text, level)')
    .eq('group_id', group.id)
    .order('mastery_xp', { ascending: false })
    .limit(10);

  return (
    <div className="pt-5 pb-8">
      <p className="text-xl font-semibold mb-1">{group.name}</p>
      <p className="text-[13px] text-text-secondary mb-5">{songCount ?? 0} songs available</p>

      <Link
        href={`/play/group-${group.slug}`}
        className="block w-full py-3.5 rounded-[14px] bg-pink-400 text-bg-primary text-sm font-semibold text-center mb-6"
      >
        Play {group.name} blind test
      </Link>

      {(topMasteries ?? []).length > 0 && (
        <>
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-text-tertiary mb-2.5">
            Top {group.name} fans
          </p>
          <div className="rounded-[14px] bg-bg-secondary border border-border-default shadow-card overflow-hidden">
            {(topMasteries ?? []).map((entry, i) => {
              const p = entry.players as unknown as { username: string; avatar_bg: string; avatar_text: string; level: number } | null;
              if (!p) return null;
              return (
                <Link
                  key={i}
                  href={`/player/${p.username}`}
                  className="flex items-center gap-2.5 px-3.5 py-2.5 border-b border-border-default last:border-b-0"
                >
                  <span className={`text-xs font-semibold w-5 text-center ${
                    i === 0 ? 'text-streak' : i === 1 ? 'text-text-secondary' : i === 2 ? 'text-wrong' : 'text-text-tertiary'
                  }`}>
                    {i + 1}
                  </span>
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold"
                    style={{ backgroundColor: p.avatar_bg, color: p.avatar_text }}
                  >
                    {p.username.charAt(0).toUpperCase()}
                  </div>
                  <span className="flex-1 text-xs font-medium">{p.username}</span>
                  <span className="text-[11px] text-pink-400 font-semibold">Lv.{entry.mastery_level}</span>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
