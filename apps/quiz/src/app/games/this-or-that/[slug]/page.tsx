import { notFound } from 'next/navigation';
import { getTotCategoryBySlug } from '@/lib/db/queries/this-or-that';
import { safeFetch } from '@/lib/error-handling';
import { ThisOrThatGame } from '@/components/game/this-or-that-game';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const category = await safeFetch(getTotCategoryBySlug(slug), null, '[tot] getCategory');
  if (!category) return { title: 'Game Not Found' };
  return {
    title: `${category.title} - This or That | KpopQuiz`,
    description: `${category.subtitle || category.title}. ${category.play_count} fans have played. 16 go in, 1 comes out.`,
    alternates: { canonical: `/games/this-or-that/${slug}` },
  };
}

export default async function ThisOrThatGamePage({ params }: PageProps) {
  const { slug } = await params;
  const category = await safeFetch(getTotCategoryBySlug(slug), null, '[tot] getCategory');
  if (!category) notFound();

  return (
    <div style={{ background: '#0C0C0E', minHeight: '100vh', color: '#fff' }}>
      <ThisOrThatGame category={category} />
    </div>
  );
}
