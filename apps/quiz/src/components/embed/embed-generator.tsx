'use client';

import { useId, useMemo, useState } from 'react';

import { EMBED_CREDIT_HELP, buildEmbedSnippet, sanitizePartner } from '@/lib/embed/snippet';

// W4b item 4 - the generator UI. It is a thin shell over buildEmbedSnippet(), which is
// the tested single source of the snippet: the UI cannot produce a block the function
// would not, and in particular it cannot produce one without the outside-iframe link.
//
// SEO Mission 3, part F.1: the same generator serves /admin/embed (a quiz picker) and the
// public "Embed this quiz" button on every /q page (one quiz, the partner key prefilled).
export function EmbedGenerator({
  quizzes,
  defaultPartner = 'partner',
  partnerLabel = 'Partner key',
}: {
  quizzes: Array<{ slug: string; title: string }>;
  defaultPartner?: string;
  partnerLabel?: string;
}): React.ReactElement {
  const [slug, setSlug] = useState(quizzes[0]?.slug ?? '');
  const [partner, setPartner] = useState(defaultPartner);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [nofollow, setNofollow] = useState(false);
  const [copied, setCopied] = useState(false);
  const uid = useId().replace(/:/g, '');

  const quiz = quizzes.find((q) => q.slug === slug) ?? quizzes[0];

  const snippet = useMemo(
    () => (quiz ? buildEmbedSnippet({ slug: quiz.slug, title: quiz.title, partner, theme, nofollow }) : ''),
    [quiz, partner, theme, nofollow],
  );

  if (!quiz) return <p className="text-sm text-secondary mt-4">No published quizzes to embed yet.</p>;

  return (
    <div className="mt-5">
      {quizzes.length > 1 ? (
        <>
          <label className="block text-xs font-semibold text-secondary" htmlFor={`emb-quiz-${uid}`}>Quiz</label>
          <select
            id={`emb-quiz-${uid}`}
            className="w-full mt-1 p-2 rounded-lg border border-default bg-surface text-primary text-sm"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
          >
            {quizzes.map((q) => (
              <option key={q.slug} value={q.slug}>{q.title}</option>
            ))}
          </select>
        </>
      ) : null}

      <div className="flex flex-wrap gap-3 mt-3">
        <div className="flex-1 min-w-[180px]">
          <label className="block text-xs font-semibold text-secondary" htmlFor={`emb-partner-${uid}`}>{partnerLabel}</label>
          <input
            id={`emb-partner-${uid}`}
            className="w-full mt-1 p-2 rounded-lg border border-default bg-surface text-primary text-sm"
            value={partner}
            onChange={(e) => setPartner(e.target.value)}
            placeholder="nolae"
          />
          <p className="text-[11px] text-ghost mt-1">Used as: {sanitizePartner(partner) || 'partner'}</p>
        </div>
        <div>
          <label className="block text-xs font-semibold text-secondary" htmlFor={`emb-theme-${uid}`}>Theme</label>
          <select
            id={`emb-theme-${uid}`}
            className="mt-1 p-2 rounded-lg border border-default bg-surface text-primary text-sm"
            value={theme}
            onChange={(e) => setTheme(e.target.value === 'dark' ? 'dark' : 'light')}
          >
            <option value="light">light</option>
            <option value="dark">dark</option>
          </select>
        </div>
      </div>

      <label className="flex items-center gap-2 mt-3 text-sm text-primary">
        <input type="checkbox" checked={nofollow} onChange={(e) => setNofollow(e.target.checked)} />
        Mark the credit link nofollow
      </label>
      <p className="text-xs text-secondary mt-2 leading-relaxed">{EMBED_CREDIT_HELP}</p>

      <label className="sr-only" htmlFor={`emb-code-${uid}`}>Embed code</label>
      <textarea
        id={`emb-code-${uid}`}
        className="w-full mt-3 p-3 rounded-lg border border-default bg-surface text-primary text-[11px] font-mono"
        rows={12}
        readOnly
        value={snippet}
        onFocus={(e) => e.currentTarget.select()}
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
      <span className="sr-only" aria-live="polite">{copied ? 'Embed code copied' : ''}</span>
    </div>
  );
}
