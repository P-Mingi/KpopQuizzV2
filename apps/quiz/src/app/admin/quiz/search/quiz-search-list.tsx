'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { QuizTypeBadge } from '@/components/ui/quiz-type-badge';

interface Props {
  quizzes: Array<Record<string, unknown>>;
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-surface-secondary text-txt-secondary',
  published: 'bg-[#EAF3DE] text-[#27500A]',
  flagged: 'bg-[#FAEEDA] text-[#633806]',
  removed: 'bg-[#FBEAF0] text-[#72243E]',
};

export function QuizSearchList({ quizzes }: Props): React.ReactElement {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  const filtered = useMemo(() => {
    return quizzes.filter((q) => {
      if (typeFilter !== 'all' && q.quiz_type !== typeFilter) return false;
      if (search) {
        const s = search.toLowerCase();
        if (!(q.title as string).toLowerCase().includes(s)) return false;
      }
      return true;
    });
  }, [quizzes, search, typeFilter]);

  return (
    <div className="py-4">
      <h1 className="text-lg font-semibold text-txt-primary mb-4">Edit Quizzes</h1>

      <div className="flex gap-2 mb-4 flex-wrap">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by title..."
          className="flex-1 min-w-48 text-sm px-3 py-2 border border-border-light rounded-lg bg-surface-primary text-txt-primary"
        />
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="text-sm px-3 py-2 border border-border-light rounded-lg bg-surface-primary text-txt-primary"
        >
          <option value="all">All types</option>
          <option value="multiple_choice">Classic</option>
          <option value="true_false">True/False</option>
          <option value="guess_from_clues">Clues</option>
          <option value="image">Image</option>
          <option value="intruder">Intruder</option>
        </select>
      </div>

      <p className="text-xs text-txt-tertiary mb-3">{filtered.length} quizzes</p>

      <div className="bg-surface-primary border border-border-light rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-light bg-surface-secondary">
              <th className="text-left px-3 py-2 text-xs text-txt-secondary">Title</th>
              <th className="text-left px-3 py-2 text-xs text-txt-secondary w-20">Type</th>
              <th className="text-left px-3 py-2 text-xs text-txt-secondary w-20">Group</th>
              <th className="text-left px-3 py-2 text-xs text-txt-secondary w-20">Status</th>
              <th className="text-right px-3 py-2 text-xs text-txt-secondary w-20">Plays</th>
              <th className="text-right px-3 py-2 text-xs text-txt-secondary w-20">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((q) => {
              const group = q.groups as { name: string } | null;
              return (
                <tr key={q.id as string} className="border-b border-border-light last:border-0 hover:bg-surface-secondary/50">
                  <td className="px-3 py-2">
                    <Link href={`/q/${q.slug as string}`} className="text-txt-primary hover:underline font-medium truncate block max-w-xs">
                      {q.title as string}
                    </Link>
                  </td>
                  <td className="px-3 py-2">
                    <QuizTypeBadge type={q.quiz_type as string} />
                  </td>
                  <td className="px-3 py-2 text-xs text-txt-secondary">{group?.name ?? '-'}</td>
                  <td className="px-3 py-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[q.status as string] ?? ''}`}>
                      {(q.status as string).charAt(0).toUpperCase() + (q.status as string).slice(1)}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right text-xs text-txt-secondary">{(q.play_count as number).toLocaleString()}</td>
                  <td className="px-3 py-2 text-right">
                    <Link
                      href={`/admin/quiz/${q.id as string}/edit`}
                      className="text-xs text-accent-pink hover:underline font-medium"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
