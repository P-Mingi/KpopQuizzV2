'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { ImageUploader } from '@/components/admin/image-uploader';
import { QuizTypeBadge } from '@/components/ui/quiz-type-badge';
import { QuestionListEditor, type QuestionData } from '@/components/quiz/question-list-editor';

interface Props {
  quiz: Record<string, unknown>;
  // 'admin' (default): PATCHes the admin API, can set status. 'owner': the quiz
  // creator editing their own quiz via the owner-scoped PUT, no status control.
  mode?: 'admin' | 'owner';
}

const INPUT = 'w-full px-3 py-2 rounded-md border border-default bg-primary text-sm text-primary focus:outline-none focus:border-accent transition-colors';

export function QuizEditor({ quiz, mode = 'admin' }: Props): React.ReactElement {
  const isOwner = mode === 'owner';
  const quizType = quiz.quiz_type as string;
  const slug = quiz.slug as string;
  const [title, setTitle] = useState(quiz.title as string);
  const [difficulty, setDifficulty] = useState(quiz.difficulty as string);
  const [status, setStatus] = useState(quiz.status as string);
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(
    (quiz.cover_image_url as string | null) ?? null,
  );
  const [questions, setQuestions] = useState<QuestionData[]>(
    (quiz.questions as QuestionData[]) ?? [],
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const group = quiz.groups as { id: number; name: string; slug: string } | null;

  const handleSave = useCallback(async () => {
    setSaving(true);
    setSaved(false);
    try {
      const res = isOwner
        ? await fetch(`/api/quiz/${quiz.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title,
              quiz_type: quizType,
              group_id: (quiz.group_id as number | null) ?? group?.id ?? null,
              difficulty,
              questions,
              settings: quiz.settings,
              cover_image_url: coverImageUrl,
            }),
          })
        : await fetch(`/api/admin/quiz/${quiz.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, difficulty, status, questions, cover_image_url: coverImageUrl }),
          });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        const data = (await res.json().catch(() => ({}))) as { error?: string; details?: string[] };
        alert(`Save failed: ${data.error ?? data.details?.join(', ') ?? 'Unknown error'}`);
      }
    } catch {
      alert('Save failed');
    } finally {
      setSaving(false);
    }
  }, [isOwner, quiz.id, quiz.group_id, quiz.settings, group, quizType, title, difficulty, status, questions, coverImageUrl]);

  return (
    <div className="py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          {isOwner ? (
            <Link href={`/q/${slug}`} className="text-secondary hover:text-primary text-sm">Your quiz</Link>
          ) : (
            <Link href="/admin" className="text-secondary hover:text-primary text-sm">Admin</Link>
          )}
          <span className="text-tertiary">/</span>
          <h1 className="text-lg font-semibold text-primary truncate max-w-md">Edit: {quiz.title as string}</h1>
        </div>
        <div className="flex items-center gap-2">
          {saved && <span className="text-xs text-correct-text">Saved!</span>}
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-btn text-white text-sm font-medium rounded-lg disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save changes'}
          </button>
        </div>
      </div>

      {/* Meta */}
      <div className="bg-primary border border-default rounded-lg p-5 mb-6 space-y-4">
        <div className="flex items-center gap-3">
          <QuizTypeBadge type={quizType} />
          {group && <span className="text-xs text-secondary">{group.name}</span>}
          <span className="text-xs text-tertiary">ID: {(quiz.id as string).slice(0, 8)}</span>
        </div>

        <div>
          <label className="text-xs text-tertiary block mb-1">Title</label>
          <input value={title} onChange={(e) => { setTitle(e.target.value); setSaved(false); }} className={INPUT} />
        </div>

        <div className="flex gap-4">
          <div>
            <label className="text-xs text-tertiary block mb-1">Difficulty</label>
            <select value={difficulty} onChange={(e) => { setDifficulty(e.target.value); setSaved(false); }} className={`${INPUT} w-32`}>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
          {/* Status is admin-only: owners never set flagged/removed on their own quiz. */}
          {!isOwner && (
            <div>
              <label className="text-xs text-tertiary block mb-1">Status</label>
              <select value={status} onChange={(e) => { setStatus(e.target.value); setSaved(false); }} className={`${INPUT} w-32`}>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="flagged">Flagged</option>
                <option value="removed">Removed</option>
              </select>
            </div>
          )}
        </div>

        <div>
          <ImageUploader
            value={coverImageUrl}
            onChange={(url) => {
              setCoverImageUrl(url ? url : null);
              setSaved(false);
            }}
            label="Cover image (shown on quiz card, trending card, start screen)"
          />
          <p className="text-[11px] text-tertiary mt-1">
            Paste any image URL (Pinterest, Imgur, etc.) or drop a file. Leave empty to fall back to the first question&apos;s image (image/intruder quizzes) or the group logo.
          </p>
        </div>
      </div>

      {/* Questions - shared list editor (Q-B3): reorder, duplicate, delete,
          inline validity badges, per-type inline editors. Same component the
          create funnel uses at step 2. */}
      <h2 className="text-sm font-semibold text-primary mb-3">{questions.length} Questions</h2>

      <QuestionListEditor
        questions={questions}
        quizType={quizType}
        onChange={(qs) => { setQuestions(qs); setSaved(false); }}
      />

      {/* Bottom save */}
      <div className="mt-6 flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2.5 bg-btn text-white text-sm font-medium rounded-lg disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save changes'}
        </button>
        {saved && <span className="text-sm text-correct-text">Changes saved!</span>}
        <Link
          href={isOwner ? `/q/${slug}` : '/admin'}
          className="text-sm text-secondary hover:text-primary ml-auto"
        >
          {isOwner ? 'Back to quiz' : 'Back to admin'}
        </Link>
      </div>
    </div>
  );
}
