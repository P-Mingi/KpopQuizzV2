'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { ImageUploader } from '@/components/admin/image-uploader';
import { QuizTypeBadge } from '@/components/ui/quiz-type-badge';

interface IntruderOption {
  label: string;
  image_url: string | null;
}

interface QuestionData {
  question: string;
  options: string[] | IntruderOption[];
  correct: number | boolean;
  fun_fact?: string;
  image_url?: string | null;
  clues?: string[];
}

interface Props {
  quiz: Record<string, unknown>;
}

const INPUT = 'w-full px-3 py-2 rounded-md border border-default bg-primary text-sm text-primary focus:outline-none focus:border-accent transition-colors';

export function QuizEditor({ quiz }: Props): React.ReactElement {
  const quizType = quiz.quiz_type as string;
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

  const updateQuestion = useCallback((index: number, updated: QuestionData) => {
    setQuestions((prev) => prev.map((q, i) => (i === index ? updated : q)));
    setSaved(false);
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch(`/api/admin/quiz/${quiz.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          difficulty,
          status,
          questions,
          cover_image_url: coverImageUrl,
        }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        const data = await res.json();
        alert(`Save failed: ${data.error ?? 'Unknown error'}`);
      }
    } catch {
      alert('Save failed');
    } finally {
      setSaving(false);
    }
  }, [quiz.id, title, difficulty, status, questions, coverImageUrl]);

  return (
    <div className="py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="text-secondary hover:text-primary text-sm">Admin</Link>
          <span className="text-tertiary">/</span>
          <h1 className="text-lg font-semibold text-primary truncate max-w-md">Edit: {quiz.title as string}</h1>
        </div>
        <div className="flex items-center gap-2">
          {saved && <span className="text-xs text-correct-text">Saved!</span>}
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-accent text-white text-sm font-medium rounded-lg disabled:opacity-50"
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
          <div>
            <label className="text-xs text-tertiary block mb-1">Status</label>
            <select value={status} onChange={(e) => { setStatus(e.target.value); setSaved(false); }} className={`${INPUT} w-32`}>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="flagged">Flagged</option>
              <option value="removed">Removed</option>
            </select>
          </div>
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

      {/* Questions */}
      <h2 className="text-sm font-semibold text-primary mb-3">{questions.length} Questions</h2>

      <div className="space-y-4">
        {questions.map((q, i) => (
          <div key={i} className="bg-primary border border-default rounded-lg p-4">
            <p className="text-xs text-tertiary mb-3">Question {i + 1}</p>

            {/* ---- IMAGE QUIZ ---- */}
            {quizType === 'image' && (
              <>
                <div className="mb-3">
                  <ImageUploader
                    value={(q.image_url as string) || null}
                    onChange={(url) => updateQuestion(i, { ...q, image_url: url })}
                    label="Image"
                  />
                </div>
                <input
                  value={q.question}
                  onChange={(e) => updateQuestion(i, { ...q, question: e.target.value })}
                  placeholder="Question text"
                  className={`${INPUT} mb-3`}
                />
                <div className="space-y-2">
                  {(q.options as string[]).map((opt, j) => (
                    <div key={j} className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuestion(i, { ...q, correct: j })}
                        className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${q.correct === j ? 'border-correct-accent bg-correct' : 'border-default'}`}
                      />
                      <input
                        value={opt}
                        onChange={(e) => {
                          const newOpts = [...(q.options as string[])];
                          newOpts[j] = e.target.value;
                          updateQuestion(i, { ...q, options: newOpts });
                        }}
                        className={`flex-1 ${INPUT}`}
                      />
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* ---- INTRUDER QUIZ ---- */}
            {quizType === 'intruder' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(q.options as IntruderOption[]).map((opt, j) => (
                  <div key={j} className={`border rounded-lg p-2 ${q.correct === j ? 'border-[#7F77DD] bg-[#EEEDFE]' : 'border-default'}`}>
                    <ImageUploader
                      value={opt.image_url || null}
                      onChange={(url) => {
                        const newOpts = [...(q.options as IntruderOption[])];
                        newOpts[j] = { ...newOpts[j]!, image_url: url };
                        updateQuestion(i, { ...q, options: newOpts });
                      }}
                    />
                    <input
                      value={opt.label}
                      onChange={(e) => {
                        const newOpts = [...(q.options as IntruderOption[])];
                        newOpts[j] = { ...newOpts[j]!, label: e.target.value };
                        updateQuestion(i, { ...q, options: newOpts });
                      }}
                      placeholder="Label"
                      className={`w-full mt-2 ${INPUT}`}
                    />
                    <button
                      onClick={() => updateQuestion(i, { ...q, correct: j })}
                      className={`w-full mt-1.5 py-1 rounded text-xs font-medium transition-colors ${
                        q.correct === j
                          ? 'bg-[#EEEDFE] text-[#3C3489]'
                          : 'bg-surface text-tertiary'
                      }`}
                    >
                      {q.correct === j ? 'INTRUDER' : 'Mark as intruder'}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* ---- CLASSIC / TRUE_FALSE / CLUES ---- */}
            {(quizType === 'multiple_choice' || quizType === 'guess_from_clues') && (
              <>
                <input
                  value={q.question}
                  onChange={(e) => updateQuestion(i, { ...q, question: e.target.value })}
                  placeholder="Question text"
                  className={`${INPUT} mb-3`}
                />
                {quizType === 'guess_from_clues' && q.clues && (
                  <div className="mb-3 space-y-2">
                    {q.clues.map((clue, ci) => (
                      <input
                        key={ci}
                        value={clue}
                        onChange={(e) => {
                          const newClues = [...(q.clues ?? [])];
                          newClues[ci] = e.target.value;
                          updateQuestion(i, { ...q, clues: newClues });
                        }}
                        placeholder={`Clue ${ci + 1}`}
                        className={INPUT}
                      />
                    ))}
                  </div>
                )}
                <div className="space-y-2">
                  {(q.options as string[]).map((opt, j) => (
                    <div key={j} className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuestion(i, { ...q, correct: j })}
                        className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${q.correct === j ? 'border-correct-accent bg-correct' : 'border-default'}`}
                      />
                      <input
                        value={opt}
                        onChange={(e) => {
                          const newOpts = [...(q.options as string[])];
                          newOpts[j] = e.target.value;
                          updateQuestion(i, { ...q, options: newOpts });
                        }}
                        className={`flex-1 ${INPUT}`}
                      />
                    </div>
                  ))}
                </div>
              </>
            )}

            {quizType === 'true_false' && (
              <>
                <input
                  value={q.question}
                  onChange={(e) => updateQuestion(i, { ...q, question: e.target.value })}
                  placeholder="Question text"
                  className={`${INPUT} mb-3`}
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => updateQuestion(i, { ...q, correct: true })}
                    className={`flex-1 py-2 rounded-md border text-sm ${q.correct === true ? 'border-correct bg-correct-bg' : 'border-default'}`}
                  >
                    True
                  </button>
                  <button
                    onClick={() => updateQuestion(i, { ...q, correct: false })}
                    className={`flex-1 py-2 rounded-md border text-sm ${q.correct === false ? 'border-wrong bg-wrong-bg' : 'border-default'}`}
                  >
                    False
                  </button>
                </div>
              </>
            )}

            {/* Fun fact */}
            <input
              value={q.fun_fact ?? ''}
              onChange={(e) => updateQuestion(i, { ...q, fun_fact: e.target.value })}
              placeholder="Fun fact (optional)"
              className={`${INPUT} mt-3 text-secondary`}
            />
          </div>
        ))}
      </div>

      {/* Bottom save */}
      <div className="mt-6 flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2.5 bg-accent text-white text-sm font-medium rounded-lg disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save changes'}
        </button>
        {saved && <span className="text-sm text-correct-text">Changes saved!</span>}
        <Link href="/admin" className="text-sm text-secondary hover:text-primary ml-auto">
          Back to admin
        </Link>
      </div>
    </div>
  );
}
