'use client';

import { useMemo, useState } from 'react';

import { buildEmbedSnippet, sanitizePartner } from '@/lib/embed/snippet';

// W4b item 4 - the generator UI. It is a thin shell over buildEmbedSnippet(), which is
// the tested single source of the snippet: the UI cannot produce a block the function
// would not, and in particular it cannot produce one without the outside-iframe link.
export function EmbedGenerator({ quizzes }: { quizzes: Array<{ slug: string; title: string }> }): React.ReactElement {
  const [slug, setSlug] = useState(quizzes[0]?.slug ?? '');
  const [partner, setPartner] = useState('partner');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [copied, setCopied] = useState(false);

  const quiz = quizzes.find((q) => q.slug === slug) ?? quizzes[0];

  const snippet = useMemo(
    () => (quiz ? buildEmbedSnippet({ slug: quiz.slug, title: quiz.title, partner, theme }) : ''),
    [quiz, partner, theme],
  );

  if (!quiz) return <p className="text-sm text-secondary mt-4">No published quizzes to embed yet.</p>;

  return (
    <div className="mt-5">
      <label className="block text-xs font-semibold text-secondary">Quiz</label>
      <select
        className="w-full mt-1 p-2 rounded-lg border border-default bg-surface text-primary text-sm"
        value={slug}
        onChange={(e) => setSlug(e.target.value)}
      >
        {quizzes.map((q) => (
          <option key={q.slug} value={q.slug}>{q.title}</option>
        ))}
      </select>

      <div className="flex gap-3 mt-3">
        <div className="flex-1">
          <label className="block text-xs font-semibold text-secondary">Partner key</label>
          <input
            className="w-full mt-1 p-2 rounded-lg border border-default bg-surface text-primary text-sm"
            value={partner}
            onChange={(e) => setPartner(e.target.value)}
            placeholder="nolae"
          />
          <p className="text-[11px] text-ghost mt-1">Used as: {sanitizePartner(partner) || 'partner'}</p>
        </div>
        <div>
          <label className="block text-xs font-semibold text-secondary">Theme</label>
          <select
            className="mt-1 p-2 rounded-lg border border-default bg-surface text-primary text-sm"
            value={theme}
            onChange={(e) => setTheme(e.target.value === 'dark' ? 'dark' : 'light')}
          >
            <option value="light">light</option>
            <option value="dark">dark</option>
          </select>
        </div>
      </div>

      <textarea
        className="w-full mt-4 p-3 rounded-lg border border-default bg-surface text-primary text-[11px] font-mono"
        rows={16}
        readOnly
        value={snippet}
      />
      <button
        type="button"
        className="btn-primary mt-2"
        onClick={() => {
          void navigator.clipboard?.writeText(snippet).then(() => {
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1800);
          });
        }}
      >
        {copied ? 'Copied' : 'Copy snippet'}
      </button>
    </div>
  );
}
