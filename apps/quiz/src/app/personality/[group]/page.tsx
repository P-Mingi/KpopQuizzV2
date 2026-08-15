import { notFound } from 'next/navigation';

import { PersonalityQuiz } from '@/components/personality/personality-quiz';
import {
  getPersonalityGroupBySlug, getPersonalityQuestions, getPersonalityGroups, getMemberCounts,
} from '@/lib/personality/data';
import { safeFetch } from '@/lib/error-handling';

import type { Metadata } from 'next';

// Workstream P: programmatic "Which {group} member are you?" quiz. The public
// URL /which-{slug}-member-are-you rewrites here via the middleware. ISR.
export const revalidate = 3600;

export async function generateStaticParams(): Promise<{ group: string }[]> {
  const groups = await safeFetch(getPersonalityGroups(), [], '[personality] generateStaticParams');
  return groups.map((g) => ({ group: g.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ group: string }> }): Promise<Metadata> {
  const { group: slug } = await params;
  const data = await getPersonalityGroupBySlug(slug);
  if (!data) return { title: 'Personality quiz', robots: { index: false, follow: true } };
  const name = data.group.name;
  const canonical = `/which-${slug}-member-are-you`;
  return {
    title: `Which ${name} Member Are You?`,
    description: `Take the free ${name} personality quiz: 10 questions, 1 result. Find out which ${name} member matches your vibe and see how you compare with other fans.`,
    alternates: { canonical },
    openGraph: {
      title: `Which ${name} Member Are You?`,
      description: `10 questions, 1 result. Find out which ${name} member you are.`,
      url: canonical,
    },
  };
}

export default async function PersonalityPage({ params }: { params: Promise<{ group: string }> }): Promise<React.ReactElement> {
  const { group: slug } = await params;
  const data = await getPersonalityGroupBySlug(slug);
  if (!data) notFound();

  const [questions, monthlyCounts] = await Promise.all([
    safeFetch(getPersonalityQuestions(), [], '[personality] questions'),
    safeFetch(getMemberCounts(data.group.id, 30), {}, '[personality] counts'),
  ]);

  if (questions.length === 0) notFound();

  return (
    <PersonalityQuiz group={data.group} questions={questions} profiles={data.profiles} monthlyCounts={monthlyCounts} />
  );
}
