import { createServiceRoleClient } from '@/lib/db/supabase-server';
import { TotCategoryPicker } from '@/components/game/tot-category-picker';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'This or That - K-pop Tournament Game | KpopQuiz',
  description: 'Pick your favorite K-pop idol, group, or song in head-to-head matchups. Boy groups, girl groups, 4th gen, and more. Who is your #1?',
  alternates: { canonical: '/games/this-or-that' },
};

export default async function ThisOrThatPage() {
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from('tot_categories')
    .select('*, tot_items(id, name, color, image_url)')
    .eq('is_published', true)
    .order('play_count', { ascending: false });

  return (
    <div className="py-6">
      <TotCategoryPicker categories={data ?? []} />
    </div>
  );
}
