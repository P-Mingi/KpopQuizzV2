import { notFound } from 'next/navigation';
import Link from 'next/link';

import { createServerClient } from '@/lib/supabase/server';
import { GroupLogo } from '@/components/ui/group-logo';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { formatCount } from '@/lib/utils';
import { safeFetch } from '@/lib/error-handling';

import type { Metadata } from 'next';
import type { Group, Question } from '@/lib/db/types';

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------

type TriviaCategory = 'members' | 'music' | 'achievements' | 'history' | 'fun';

interface TriviaFact {
  fact: string;
  category: TriviaCategory;
  sourceQuizTitle: string;
  sourceQuizSlug: string;
}

// ------------------------------------------------------------------
// Categorization
// ------------------------------------------------------------------

function categorizeFact(fact: string, question: string): TriviaCategory {
  const text = (fact + ' ' + question).toLowerCase();

  if (/born|birthday|age|height|position|leader|maknae|vocalist|rapper|dancer|real name|stage name|mbti|blood type|hometown|family/.test(text)) {
    return 'members';
  }
  if (/album|song|track|single|release|chart|billboard|spotify|mv|music video|debut song|comeback|title track|b-side/.test(text)) {
    return 'music';
  }
  if (/record|award|first|million|billion|sold|guinness|mama|grammy|nominated|won|achievement|highest|most/.test(text)) {
    return 'achievements';
  }
  if (/debut|formed|agency|entertainment|trainee|pre-debut|military|hiatus|contract|disbanded|reunion/.test(text)) {
    return 'history';
  }
  return 'fun';
}

// ------------------------------------------------------------------
// Deduplication
// ------------------------------------------------------------------

function deduplicateFacts(facts: TriviaFact[]): TriviaFact[] {
  const seen = new Set<string>();
  return facts.filter(f => {
    const normalized = f.fact.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
    const key = normalized.slice(0, 60);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ------------------------------------------------------------------
// Data fetching
// ------------------------------------------------------------------

async function getTriviaFacts(groupId: number): Promise<TriviaFact[]> {
  const supabase = await createServerClient();

  const { data: quizzes, error } = await supabase
    .from('quizzes')
    .select('title, slug, questions')
    .eq('group_id', groupId)
    .eq('status', 'published')
    .order('play_count', { ascending: false })
    .limit(200);

  if (error) {
    console.error('[getTriviaFacts] query failed:', error);
    return [];
  }
  if (!quizzes) return [];

  const allFacts: TriviaFact[] = [];

  for (const quiz of quizzes) {
    const questions = quiz.questions as Question[];
    for (const q of questions) {
      if (q.fun_fact && q.fun_fact.trim().length > 20) {
        allFacts.push({
          fact: q.fun_fact.trim(),
          category: categorizeFact(q.fun_fact, q.question || ''),
          sourceQuizTitle: quiz.title,
          sourceQuizSlug: quiz.slug,
        });
      }
    }
  }

  return deduplicateFacts(allFacts);
}

// ------------------------------------------------------------------
// Category config
// ------------------------------------------------------------------

const CATEGORY_CONFIG: { key: TriviaCategory; title: string }[] = [
  { key: 'history', title: 'Origin story' },
  { key: 'members', title: 'About the members' },
  { key: 'music', title: 'Music and discography' },
  { key: 'achievements', title: 'Records and achievements' },
  { key: 'fun', title: 'Fun facts' },
];

const CATEGORY_ICONS: Record<TriviaCategory, React.ReactElement> = {
  history: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-[var(--text-secondary)]">
      <path d="M2 3h9v11H2V3z" stroke="currentColor" strokeWidth="1.2" />
      <path d="M5 1v3M11 3h3v11h-3" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  ),
  members: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-[var(--text-secondary)]">
      <circle cx="6" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M1 14c0-3 2.5-5 5-5s5 2 5 5" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="11" cy="5" r="2" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  ),
  music: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-[var(--text-secondary)]">
      <path d="M6 12V3l8-2v9" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="4" cy="12" r="2" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="12" cy="10" r="2" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  ),
  achievements: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-[var(--text-secondary)]">
      <path d="M8 1l2 4h4l-3 3 1 4-4-2-4 2 1-4-3-3h4z" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  ),
  fun: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-[var(--text-secondary)]">
      <path d="M8 1v2M3 3l1.5 1.5M13 3l-1.5 1.5M1 8h2M13 8h2M3 13l1.5-1.5M13 13l-1.5-1.5M8 13v2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  ),
};

// ------------------------------------------------------------------
// Fact card
// ------------------------------------------------------------------

function TriviaFactCard({ item }: { item: TriviaFact }) {
  return (
    <div className="group relative pl-5 border-l-2 border-[var(--border)] hover:border-[var(--accent-light)] transition-colors py-1">
      <p className="text-sm text-[var(--text-primary)] leading-relaxed">
        {item.fact}
      </p>
      <Link
        href={`/q/${item.sourceQuizSlug}`}
        className="inline-flex items-center gap-1 mt-2 text-xs text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
      >
        <span>Test yourself on this</span>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="translate-y-px">
          <path d="M4 3l3 3-3 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </Link>
    </div>
  );
}

// ------------------------------------------------------------------
// Metadata
// ------------------------------------------------------------------

export function generateGroupTriviaMetadata(group: Group): Metadata {
  const ogImage = `https://kpopquiz.org/api/og/group/${group.slug}`;

  return {
    title: `${group.name} Trivia - Fun Facts for ${group.fandom_name}s`,
    description: `How well do you really know ${group.name}? Discover surprising facts about the members, music, and achievements - then test yourself with fan-made quizzes.`,
    alternates: { canonical: `/${group.slug}-trivia` },
    openGraph: {
      title: `${group.name} Trivia | KpopQuiz`,
      description: `Fun facts about ${group.name} that even hardcore fans might not know.`,
      url: `https://kpopquiz.org/${group.slug}-trivia`,
      siteName: 'KpopQuiz',
      type: 'article',
      images: [{ url: ogImage, width: 1200, height: 630, alt: `${group.name} Trivia` }],
    },
    twitter: {
      card: 'summary_large_image',
      images: [ogImage],
    },
  };
}

// ------------------------------------------------------------------
// Page
// ------------------------------------------------------------------

export async function GroupTriviaPage({ group }: { group: Group }): Promise<React.ReactElement> {
  const uniqueFacts = await safeFetch(
    getTriviaFacts(group.id),
    [] as TriviaFact[],
    '[group-trivia] getTriviaFacts',
  );

  if (uniqueFacts.length < 12) {
    notFound();
  }

  const categorySections = CATEGORY_CONFIG
    .map(config => ({
      ...config,
      icon: CATEGORY_ICONS[config.key],
      facts: uniqueFacts.filter(f => f.category === config.key),
    }))
    .filter(section => section.facts.length >= 2);

  const singleCategory = categorySections.length === 1;

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <Breadcrumbs
        items={[
          { label: 'Home', href: '/' },
          { label: `${group.name} Quiz`, href: `/${group.slug}-quiz` },
          { label: `${group.name} Trivia` },
        ]}
      />

      {/* Hero */}
      <div className="text-center mb-10">
        {group.logo_url && (
          <div className="flex justify-center mb-4">
            <GroupLogo
              groupName={group.name}
              logoUrl={group.logo_url}
              displayColor={group.display_color}
              textColor={group.text_color}
              size={48}
            />
          </div>
        )}
        <h1 className="text-2xl font-medium text-[var(--text-primary)] mb-2">
          {group.name} trivia and fun facts
        </h1>
        <p className="text-sm text-[var(--text-secondary)] max-w-md mx-auto">
          {uniqueFacts.length} facts about {group.name} that even hardcore {group.fandom_name}s
          might not know - pulled from fan-made quizzes.
        </p>
      </div>

      {/* Quick stats */}
      <div className="flex justify-center gap-6 mb-10 pb-8 border-b border-[var(--border)]">
        <div className="text-center">
          <p className="text-lg font-medium text-[var(--text-primary)]">{formatCount(group.quiz_count)}</p>
          <p className="text-xs text-[var(--text-tertiary)]">quizzes</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-medium text-[var(--text-primary)]">{formatCount(group.total_plays)}</p>
          <p className="text-xs text-[var(--text-tertiary)]">plays</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-medium text-[var(--text-primary)]">{uniqueFacts.length}</p>
          <p className="text-xs text-[var(--text-tertiary)]">facts</p>
        </div>
      </div>

      {/* Fact sections */}
      {categorySections.map(section => (
        <section key={section.key} className="mb-10">
          {!singleCategory && (
            <div className="flex items-center gap-2 mb-5">
              {section.icon}
              <h2 className="text-lg font-medium text-[var(--text-primary)]">
                {section.title}
              </h2>
            </div>
          )}
          <div className="space-y-4">
            {section.facts.map((item, i) => (
              <TriviaFactCard key={i} item={item} />
            ))}
          </div>
        </section>
      ))}

      {/* CTA */}
      <div className="mt-12 pt-8 border-t border-[var(--border)] text-center">
        <p className="text-lg font-medium text-[var(--text-primary)] mb-2">
          Think you knew all of these?
        </p>
        <p className="text-sm text-[var(--text-secondary)] mb-5">
          Put your {group.name} knowledge to the test with fan-made quizzes.
        </p>
        <Link
          href={`/${group.slug}-quiz`}
          className="inline-block w-full sm:w-auto px-8 py-3 rounded-full bg-[var(--text-primary)] text-white text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Play {group.name} quizzes
        </Link>
      </div>

      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Article',
            headline: `${group.name} Trivia - ${uniqueFacts.length} Fun Facts`,
            description: `Surprising facts about ${group.name} that even hardcore ${group.fandom_name}s might not know.`,
            url: `https://kpopquiz.org/${group.slug}-trivia`,
            publisher: {
              '@type': 'Organization',
              name: 'KpopQuiz',
              url: 'https://kpopquiz.org',
            },
            about: {
              '@type': 'MusicGroup',
              name: group.name,
            },
            datePublished: group.created_at,
            dateModified: new Date().toISOString(),
          }),
        }}
      />
    </div>
  );
}
