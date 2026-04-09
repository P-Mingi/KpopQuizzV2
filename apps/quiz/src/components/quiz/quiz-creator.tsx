'use client';

import { useState, useRef, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

import { useToast } from '@/components/ui/toast-provider';
import { QuizTypeBadge } from '@/components/ui/quiz-type-badge';
import { ImageUploader } from '@/components/admin/image-uploader';
import { CoverUpload } from '@/components/create/cover-upload';

import type { QuizType, Difficulty } from '@/lib/db/types';

// ============================================
// Types
// ============================================

interface GroupOption {
  id: number;
  name: string;
  slug: string;
}

interface IntruderOptionData {
  label: string;
  image_url: string;
}

interface SavedQuestion {
  question: string;
  options: string[] | IntruderOptionData[];
  correct: number;
  fun_fact: string;
  clues?: string[];
  image_url?: string;
}

interface QuizCreatorProps {
  groups: GroupOption[];
}

// ============================================
// Sub-components
// ============================================

function ProgressDots({ step }: { step: number }): React.ReactElement {
  return (
    <div className="flex gap-1.5 items-center mb-6">
      {[1, 2, 3, 4].map((s) => (
        <div
          key={s}
          className={`h-2 rounded-full transition-all duration-300 ${
            s === step
              ? 'w-6 bg-accent-light'
              : s < step
                ? 'w-2 bg-correct'
                : 'w-2 bg-border-light'
          }`}
        />
      ))}
    </div>
  );
}

function StepHeader({ step, title, description }: { step: number; title: string; description: string }): React.ReactElement {
  return (
    <>
      <p className="text-xs text-secondary mb-1">Step {step} of 4</p>
      <h1 className="text-lg font-medium text-primary mb-1">{title}</h1>
      <p className="text-sm text-secondary mb-5">{description}</p>
    </>
  );
}

const INPUT_CLASSES = 'w-full px-4 py-3 rounded-md border border-default bg-primary text-sm text-primary placeholder:text-tertiary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors';

// ============================================
// Main Component
// ============================================

export function QuizCreator({ groups }: QuizCreatorProps): React.ReactElement {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { showToast } = useToast();
  const preselectedGroup = searchParams.get('group');
  const editId = searchParams.get('edit');
  const isEditMode = Boolean(editId);

  const [step, setStep] = useState(1);
  const [editLoading, setEditLoading] = useState(Boolean(editId));
  const [previousQuizType, setPreviousQuizType] = useState<QuizType | null>(null);

  // Step 1
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(() => {
    if (preselectedGroup) {
      const found = groups.find((g) => g.slug === preselectedGroup);
      return found ? found.id : null;
    }
    return null;
  });
  const [customGroupName, setCustomGroupName] = useState('');

  // Step 2
  const [title, setTitle] = useState('');
  const [quizType, setQuizType] = useState<QuizType>('multiple_choice');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);

  // Step 3
  const [savedQuestions, setSavedQuestions] = useState<SavedQuestion[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [currentOptions, setCurrentOptions] = useState(['', '', '', '']);
  const [currentCorrect, setCurrentCorrect] = useState(0);
  const [currentFunFact, setCurrentFunFact] = useState('');
  const [currentClues, setCurrentClues] = useState(['', '', '']);
  const [currentTFCorrect, setCurrentTFCorrect] = useState(true);
  const [currentImageUrl, setCurrentImageUrl] = useState('');
  const [currentIntruderOptions, setCurrentIntruderOptions] = useState<IntruderOptionData[]>([
    { label: '', image_url: '' }, { label: '', image_url: '' },
    { label: '', image_url: '' }, { label: '', image_url: '' },
  ]);
  const [currentIntruderIndex, setCurrentIntruderIndex] = useState(0);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Step 4
  const [timerEnabled, setTimerEnabled] = useState(true);
  const [shuffleEnabled, setShuffleEnabled] = useState(true);
  const [showAnswers, setShowAnswers] = useState(false);

  // Publishing
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState<{ slug: string } | null>(null);
  const [copyText, setCopyText] = useState('Copy');

  // ============================================
  // Edit mode: fetch quiz data
  // ============================================

  useEffect(() => {
    if (!editId) return;

    async function fetchQuiz() {
      try {
        const res = await fetch(`/api/quiz/${editId}/edit`);
        if (!res.ok) {
          showToast('Quiz not found or you don\'t have permission to edit it', 'error');
          router.replace('/create');
          return;
        }

        const data = await res.json();

        // Pre-fill step 1: group
        if (data.group) {
          const matchingGroup = groups.find(g => g.id === data.group.id);
          if (matchingGroup) {
            setSelectedGroupId(matchingGroup.id);
          }
        }

        // Pre-fill step 2: title, type, difficulty, cover
        setTitle(data.title);
        setQuizType(data.quiz_type);
        setPreviousQuizType(data.quiz_type);
        if (data.difficulty) setDifficulty(data.difficulty);
        if (typeof data.cover_image_url === 'string') setCoverImageUrl(data.cover_image_url);

        // Pre-fill step 3: questions
        // Convert true_false questions back to editor format (boolean correct -> index)
        const questions: SavedQuestion[] = (data.questions as Record<string, unknown>[]).map(q => {
          if (data.quiz_type === 'true_false') {
            return {
              question: q.question as string,
              options: ['True', 'False'],
              correct: (q.correct as boolean) === true ? 0 : 1,
              fun_fact: (q.fun_fact as string) ?? '',
            };
          }
          const result: SavedQuestion = {
            question: q.question as string,
            options: q.options as string[],
            correct: q.correct as number,
            fun_fact: (q.fun_fact as string) ?? '',
          };
          if (Array.isArray(q.clues)) {
            result.clues = q.clues as string[];
          }
          if (typeof q.image_url === 'string') {
            result.image_url = q.image_url;
          }
          return result;
        });
        setSavedQuestions(questions);

        // Pre-fill step 4: settings
        if (data.settings) {
          const settings = data.settings as Record<string, unknown>;
          setTimerEnabled(settings.timer as boolean ?? true);
          setShuffleEnabled(settings.shuffle as boolean ?? true);
          setShowAnswers(settings.show_answers as boolean ?? false);
        }

      } catch {
        showToast('Failed to load quiz', 'error');
        router.replace('/create');
      } finally {
        setEditLoading(false);
      }
    }

    fetchQuiz();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId]);

  // ============================================
  // Helpers
  // ============================================

  const selectedGroup = selectedGroupId ? groups.find((g) => g.id === selectedGroupId) : null;
  const groupName = selectedGroup?.name ?? customGroupName;
  const fandomName = selectedGroup
    ? (groups.find((g) => g.id === selectedGroupId) as GroupOption & { fandom_name?: string })?.fandom_name ?? 'fan'
    : 'fan';

  const canContinueStep1 = selectedGroupId !== null || customGroupName.trim().length >= 2;
  const effectiveGroupId = selectedGroupId === -1 ? null : selectedGroupId;
  const canContinueStep2 = title.trim().length >= 5;
  const canContinueStep3 = savedQuestions.length >= 5;

  function resetEditor() {
    setCurrentQuestion('');
    setCurrentOptions(['', '', '', '']);
    setCurrentCorrect(0);
    setCurrentFunFact('');
    setCurrentClues(['', '', '']);
    setCurrentTFCorrect(true);
    setCurrentImageUrl('');
    setCurrentIntruderOptions([
      { label: '', image_url: '' }, { label: '', image_url: '' },
      { label: '', image_url: '' }, { label: '', image_url: '' },
    ]);
    setCurrentIntruderIndex(0);
  }

  function canSaveQuestion(): boolean {
    if (quizType !== 'intruder' && !currentQuestion.trim()) return false;

    if (quizType === 'multiple_choice') {
      return currentOptions.every((o) => o.trim().length > 0);
    }
    if (quizType === 'true_false') {
      return true;
    }
    if (quizType === 'guess_from_clues') {
      return currentOptions.every((o) => o.trim().length > 0) && currentClues.every((c) => c.trim().length > 0);
    }
    if (quizType === 'image') {
      return !!currentImageUrl && currentOptions.every((o) => o.trim().length > 0);
    }
    if (quizType === 'intruder') {
      return currentIntruderOptions.every((o) => o.label.trim().length > 0 && o.image_url.length > 0);
    }
    return false;
  }

  function handleEditQuestion(index: number) {
    const q = savedQuestions[index];
    if (!q) return;
    setCurrentQuestion(q.question);
    if (quizType === 'true_false') {
      setCurrentTFCorrect(q.correct === 0);
    } else if (quizType === 'intruder') {
      setCurrentIntruderOptions(q.options as IntruderOptionData[]);
      setCurrentIntruderIndex(q.correct);
    } else {
      setCurrentOptions(q.options as string[]);
      setCurrentCorrect(q.correct);
    }
    setCurrentFunFact(q.fun_fact || '');
    setCurrentClues(q.clues || ['', '', '']);
    setCurrentImageUrl(q.image_url || '');
    setEditingIndex(index);
  }

  function handleSaveQuestion() {
    if (!canSaveQuestion()) return;
    if (editingIndex === null && savedQuestions.length >= 20) return;

    let q: SavedQuestion;

    if (quizType === 'intruder') {
      q = {
        question: 'Find the intruder',
        options: currentIntruderOptions.map((o) => ({ label: o.label.trim(), image_url: o.image_url })),
        correct: currentIntruderIndex,
        fun_fact: currentFunFact.trim(),
      };
    } else {
      q = {
        question: currentQuestion.trim(),
        options: quizType === 'true_false' ? ['True', 'False'] : currentOptions.map((o) => o.trim()),
        correct: quizType === 'true_false' ? (currentTFCorrect ? 0 : 1) : currentCorrect,
        fun_fact: currentFunFact.trim(),
      };
    }

    if (quizType === 'guess_from_clues') {
      q.clues = currentClues.map((c) => c.trim());
    }

    if (quizType === 'image') {
      q.image_url = currentImageUrl;
    }

    if (editingIndex !== null) {
      setSavedQuestions((prev) => prev.map((existing, i) => (i === editingIndex ? q : existing)));
      setEditingIndex(null);
    } else {
      setSavedQuestions((prev) => [...prev, q]);
    }
    resetEditor();
    setTimeout(() => listRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  }

  function handleDeleteQuestion(index: number) {
    if (editingIndex === index) {
      setEditingIndex(null);
      resetEditor();
    } else if (editingIndex !== null && index < editingIndex) {
      setEditingIndex(editingIndex - 1);
    }
    setSavedQuestions((prev) => prev.filter((_, i) => i !== index));
  }

  async function handlePublish() {
    setPublishing(true);

    const payload = {
      group_id: effectiveGroupId ?? undefined,
      group_name: effectiveGroupId ? undefined : (customGroupName.trim() || 'General K-pop'),
      title: title.trim(),
      quiz_type: quizType,
      difficulty,
      cover_image_url: coverImageUrl ?? undefined,
      questions: quizType === 'true_false'
        ? savedQuestions.map((q) => ({ ...q, correct: q.correct === 0 }))
        : savedQuestions,
      settings: {
        timer: timerEnabled,
        timer_seconds: 15,
        shuffle: shuffleEnabled,
        show_answers: showAnswers,
      },
    };

    try {
      if (isEditMode && editId) {
        // Update existing quiz
        const res = await fetch(`/api/quiz/${editId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const data: { error: string } = await res.json();
          console.error('Update error:', data.error);
          setPublishing(false);
          return;
        }

        const data: { slug: string } = await res.json();
        showToast('Quiz updated!', 'success');
        router.push(`/q/${data.slug}`);
      } else {
        // Create new quiz
        const res = await fetch('/api/quiz/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const data = await res.json();
          console.error('Publish error:', JSON.stringify(data));
          setPublishing(false);
          return;
        }

        const data: { slug: string } = await res.json();
        setPublished(data);
      }
    } catch {
      console.error(isEditMode ? 'Update failed' : 'Publish failed');
      setPublishing(false);
    }
  }

  async function handleCopyUrl(slug: string) {
    const url = `${process.env.NEXT_PUBLIC_SITE_URL}/q/${slug}`;
    await navigator.clipboard.writeText(url);
    setCopyText('Copied!');
    setTimeout(() => setCopyText('Copy'), 2000);
  }

  // ============================================
  // PUBLISHED SCREEN
  // ============================================

  if (editLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-5 h-5 border-2 border-default border-t-accent rounded-full animate-spin" />
      </div>
    );
  }

  if (published) {
    const quizUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/q/${published.slug}`;
    const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(`I just created a ${groupName} quiz! Think you can pass it? 🎵`)}&url=${encodeURIComponent(quizUrl)}`;

    return (
      <div className="text-center py-8">
        <div className="w-14 h-14 rounded-full bg-correct-bg flex items-center justify-center mx-auto animate-bounce-in">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M5 13l4 4L19 7" stroke="var(--correct-text)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        <h2 className="text-lg font-medium mt-4 text-primary">Your quiz is live!</h2>
        <p className="text-sm text-secondary mt-1">Share it with your fandom and watch the plays roll in.</p>

        <div className="mt-6 bg-surface rounded-md px-4 py-3 flex items-center gap-2">
          <p className="text-sm text-secondary flex-1 truncate">kpopquiz.org/q/{published.slug}</p>
          <button
            onClick={() => handleCopyUrl(published.slug)}
            className="px-3 py-1.5 rounded-full border border-default bg-primary text-xs font-medium cursor-pointer hover:border-default transition-colors flex-shrink-0"
          >
            {copyText}
          </button>
        </div>

        <div className="flex gap-2 justify-center mt-5">
          <a
            href={tweetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-5 py-2.5 rounded-full bg-txt-primary text-white text-sm font-medium"
          >
            Share on X
          </a>
          <button
            onClick={() => handleCopyUrl(published.slug)}
            className="px-5 py-2.5 rounded-full border border-default text-sm font-medium bg-primary hover:border-default transition-colors"
          >
            Share on Discord
          </button>
        </div>

        <div className="mt-6 pt-5 border-t border-default">
          <p className="text-xs text-secondary">Pro tip</p>
          <p className="text-sm mt-1 text-primary">
            Tweet &quot;Only real {fandomName}s can pass my quiz&quot; with the link - fan challenge posts get 5x more engagement.
          </p>
        </div>
      </div>
    );
  }

  // ============================================
  // STEP 1: Pick a group
  // ============================================

  if (step === 1) {
    return (
      <div>
        <ProgressDots step={1} />
        <StepHeader step={1} title="Pick a group" description="Which group is your quiz about?" />

        <div className="flex flex-wrap gap-2 mb-5">
          {/* None option */}
          <button
            onClick={() => { setSelectedGroupId(-1); setCustomGroupName(''); }}
            className={`px-5 py-2 rounded-full text-sm font-medium border-2 cursor-pointer transition-colors ${
              selectedGroupId === -1
                ? 'border-accent bg-accent-bg text-accent-hover'
                : 'border-default text-primary bg-surface hover:border-accent'
            }`}
          >
            None / General K-pop
          </button>
          {groups.map((g) => (
            <button
              key={g.id}
              onClick={() => { setSelectedGroupId(g.id); setCustomGroupName(''); }}
              className={`px-4 py-2 rounded-full text-sm border cursor-pointer transition-colors ${
                selectedGroupId === g.id
                  ? 'border-accent bg-accent-bg text-accent-hover'
                  : 'border-default text-secondary bg-primary hover:border-default'
              }`}
            >
              {g.name}
            </button>
          ))}
        </div>

        <input
          type="text"
          placeholder="Or type a group name..."
          value={customGroupName}
          onChange={(e) => { setCustomGroupName(e.target.value); setSelectedGroupId(null); }}
          className={`${INPUT_CLASSES} mt-3`}
        />

        {customGroupName.trim().length >= 2 && !selectedGroupId && !groups.some((g) => g.name.toLowerCase() === customGroupName.trim().toLowerCase()) && (
          <p className="text-xs text-secondary mt-2 flex items-start gap-1.5">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="flex-shrink-0 mt-0.5">
              <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
              <path d="M8 7v4M8 5h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            &quot;{customGroupName.trim()}&quot; is not in our database yet. It will be added automatically when you publish your quiz.
          </p>
        )}

        <button
          onClick={() => setStep(2)}
          disabled={!canContinueStep1}
          className="w-full mt-5 py-3 rounded-full bg-txt-primary text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Continue
        </button>
      </div>
    );
  }

  // ============================================
  // STEP 2: Name your quiz
  // ============================================

  if (step === 2) {
    return (
      <div>
        <ProgressDots step={2} />
        <StepHeader step={2} title="Name your quiz" description="Make it catchy - challenge titles get 3x more plays." />

        <input
          type="text"
          placeholder="e.g. Only real STAYs can score 10/10 on this"
          maxLength={100}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={INPUT_CLASSES}
        />
        <p className="text-xs text-tertiary text-right mt-1">{title.length}/100</p>

        <div className="mt-5">
          <p className="text-sm text-secondary mb-2">
            Cover image <span className="text-tertiary font-normal">(optional)</span>
          </p>
          <CoverUpload value={coverImageUrl} onChange={setCoverImageUrl} />
          <p className="text-[11px] text-ghost mt-1.5">
            Shown on the quiz card and start screen. Image and Intruder quizzes auto-pick a cover from your first question if you skip this.
          </p>
        </div>

        <div className="mt-5">
          <p className="text-sm text-secondary mb-2">Quiz type</p>
          <div className="flex flex-col gap-2.5">
            {([
              { type: 'multiple_choice' as QuizType, name: 'Multiple choice', desc: '4 options, 1 correct answer per question' },
              { type: 'true_false' as QuizType, name: 'True or false', desc: 'Fast-paced, great for trivia facts' },
              { type: 'guess_from_clues' as QuizType, name: 'Guess from clues', desc: 'Give 3 clues, they guess the idol or song' },
              { type: 'image' as QuizType, name: 'Image quiz', desc: 'Show a photo, guess the idol/album/group' },
              { type: 'intruder' as QuizType, name: 'Intruder', desc: '4 images, find the one that doesn\'t belong' },
            ]).map((t) => (
              <button
                key={t.type}
                onClick={() => {
                  if (isEditMode && savedQuestions.length > 0 && t.type !== quizType) {
                    if (!confirm('Changing quiz type will clear all your questions. Continue?')) return;
                    setSavedQuestions([]);
                    resetEditor();
                  }
                  setQuizType(t.type);
                }}
                className={`p-4 rounded-lg border cursor-pointer transition-colors text-left ${
                  quizType === t.type
                    ? 'border-accent bg-primary'
                    : 'border-default bg-primary hover:border-default'
                }`}
              >
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-primary">{t.name}</p>
                  <QuizTypeBadge type={t.type} />
                </div>
                <p className="text-xs text-secondary mt-0.5">{t.desc}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5">
          <p className="text-sm text-secondary mb-2">Difficulty</p>
          <div className="flex gap-2">
            {(['easy', 'medium', 'hard'] as const).map(level => (
              <button
                key={level}
                type="button"
                onClick={() => setDifficulty(level)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  difficulty === level
                    ? 'bg-txt-primary text-white'
                    : 'border border-default text-secondary hover:border-default'
                }`}
              >
                {level.charAt(0).toUpperCase() + level.slice(1)}
              </button>
            ))}
          </div>
          <p className="text-xs text-tertiary mt-1.5">
            {difficulty === 'easy' && 'Most fans should be able to pass this'}
            {difficulty === 'medium' && 'Requires solid knowledge of the group'}
            {difficulty === 'hard' && 'Only hardcore fans will pass'}
          </p>
        </div>

        <div className="flex gap-2 mt-6">
          <button
            onClick={() => setStep(1)}
            className="px-6 py-3 rounded-full border border-default text-sm font-medium bg-primary hover:border-default transition-colors"
          >
            Back
          </button>
          <button
            onClick={() => {
              resetEditor();
              if (!isEditMode || (previousQuizType && previousQuizType !== quizType)) {
                setSavedQuestions([]);
              }
              if (isEditMode) setPreviousQuizType(quizType);
              setStep(3);
            }}
            disabled={!canContinueStep2}
            className="flex-1 py-3 rounded-full bg-txt-primary text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  // ============================================
  // STEP 3: Add questions
  // ============================================

  if (step === 3) {
    const remaining = 5 - savedQuestions.length;

    return (
      <div>
        <ProgressDots step={3} />
        <StepHeader step={3} title="Add your questions" description="Minimum 5, maximum 20. Click the circle to mark the correct answer." />

        {/* Saved questions list */}
        <div ref={listRef}>
          {savedQuestions.map((q, i) => (
            <div
              key={i}
              onClick={() => editingIndex !== i && handleEditQuestion(i)}
              className={`rounded-md px-4 py-3 mb-2 flex justify-between items-center cursor-pointer transition-colors ${editingIndex === i ? 'bg-correct-bg ring-1 ring-correct-accent' : 'bg-surface hover:bg-elevated'}`}
            >
              <div className="flex items-center min-w-0">
                <span className="text-xs text-secondary flex-shrink-0">Q{i + 1}</span>
                <span className="text-sm font-medium ml-2 truncate">{q.question.length > 40 ? q.question.slice(0, 40) + '...' : q.question}</span>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); handleDeleteQuestion(i); }}
                className="text-tertiary hover:text-wrong cursor-pointer p-1 flex-shrink-0"
                aria-label={`Delete question ${i + 1}`}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
              </button>
            </div>
          ))}
        </div>

        {/* Question editor */}
        {(savedQuestions.length < 20 || editingIndex !== null) && (
          <div className="bg-primary border border-default rounded-lg p-5 mt-2">
            <p className="text-xs text-secondary mb-2">
              {editingIndex !== null ? `Editing question ${editingIndex + 1}` : `Question ${savedQuestions.length + 1}`}
            </p>

            {quizType !== 'intruder' && (
              <input
                type="text"
                placeholder="Type your question..."
                value={currentQuestion}
                onChange={(e) => setCurrentQuestion(e.target.value)}
                maxLength={500}
                className={INPUT_CLASSES}
              />
            )}

            {/* Multiple choice answers */}
            {quizType === 'multiple_choice' && (
              <div className="mt-4">
                <p className="text-xs text-secondary mb-2">Answers (click circle for correct answer)</p>
                {['A', 'B', 'C', 'D'].map((label, i) => (
                  <div key={i} className="flex items-center gap-2 mb-2.5">
                    <button
                      onClick={() => setCurrentCorrect(i)}
                      className={`w-5 h-5 rounded-full border-2 cursor-pointer flex items-center justify-center flex-shrink-0 ${
                        currentCorrect === i
                          ? 'border-correct-accent bg-correct'
                          : 'border-default'
                      }`}
                      aria-label={`Mark answer ${label} as correct`}
                    >
                      {currentCorrect === i && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </button>
                    <input
                      type="text"
                      placeholder={`Answer ${label}`}
                      value={currentOptions[i] ?? ''}
                      onChange={(e) => {
                        const next = [...currentOptions];
                        next[i] = e.target.value;
                        setCurrentOptions(next);
                      }}
                      maxLength={200}
                      className={`flex-1 ${INPUT_CLASSES}`}
                    />
                  </div>
                ))}
              </div>
            )}

            {/* True/false answers */}
            {quizType === 'true_false' && (
              <div className="mt-4">
                <p className="text-xs text-secondary mb-2">Correct answer</p>
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => setCurrentTFCorrect(true)}
                    className={`flex-1 py-3 rounded-md border text-sm ${
                      currentTFCorrect
                        ? 'border-correct bg-correct-bg text-correct-text'
                        : 'border-default bg-primary text-primary'
                    }`}
                  >
                    True
                  </button>
                  <button
                    onClick={() => setCurrentTFCorrect(false)}
                    className={`flex-1 py-3 rounded-md border text-sm ${
                      !currentTFCorrect
                        ? 'border-wrong bg-wrong-bg text-wrong-text'
                        : 'border-default bg-primary text-primary'
                    }`}
                  >
                    False
                  </button>
                </div>
              </div>
            )}

            {/* Guess from clues */}
            {quizType === 'guess_from_clues' && (
              <>
                <div className="mt-4">
                  <p className="text-xs text-secondary mb-2">Clues (give 3 hints, easiest last)</p>
                  {['Clue 1 (hardest)', 'Clue 2', 'Clue 3 (easiest)'].map((ph, i) => (
                    <input
                      key={i}
                      type="text"
                      placeholder={ph}
                      value={currentClues[i] ?? ''}
                      onChange={(e) => {
                        const next = [...currentClues];
                        next[i] = e.target.value;
                        setCurrentClues(next);
                      }}
                      maxLength={200}
                      className={`${INPUT_CLASSES} mb-2`}
                    />
                  ))}
                </div>
                <div className="mt-4">
                  <p className="text-xs text-secondary mb-2">Answer options (click circle for correct answer)</p>
                  {['A', 'B', 'C', 'D'].map((label, i) => (
                    <div key={i} className="flex items-center gap-2 mb-2.5">
                      <button
                        onClick={() => setCurrentCorrect(i)}
                        className={`w-5 h-5 rounded-full border-2 cursor-pointer flex items-center justify-center flex-shrink-0 ${
                          currentCorrect === i
                            ? 'border-correct-accent bg-correct'
                            : 'border-default'
                        }`}
                        aria-label={`Mark answer ${label} as correct`}
                      >
                        {currentCorrect === i && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </button>
                      <input
                        type="text"
                        placeholder={`Answer ${label}`}
                        value={currentOptions[i] ?? ''}
                        onChange={(e) => {
                          const next = [...currentOptions];
                          next[i] = e.target.value;
                          setCurrentOptions(next);
                        }}
                        maxLength={200}
                        className={`flex-1 ${INPUT_CLASSES}`}
                      />
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Image quiz */}
            {quizType === 'image' && (
              <>
                <div className="mt-4 mb-3">
                  <ImageUploader
                    value={currentImageUrl || null}
                    onChange={(url) => setCurrentImageUrl(url)}
                    label="Image"
                  />
                </div>
                <div className="mt-4">
                  <p className="text-xs text-secondary mb-2">Answers (click circle for correct answer)</p>
                  {['A', 'B', 'C', 'D'].map((label, i) => (
                    <div key={i} className="flex items-center gap-2 mb-2.5">
                      <button
                        onClick={() => setCurrentCorrect(i)}
                        className={`w-5 h-5 rounded-full border-2 cursor-pointer flex items-center justify-center flex-shrink-0 ${
                          currentCorrect === i
                            ? 'border-correct-accent bg-correct'
                            : 'border-default'
                        }`}
                      >
                        {currentCorrect === i && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </button>
                      <input
                        type="text"
                        placeholder={`Answer ${label}`}
                        value={currentOptions[i] ?? ''}
                        onChange={(e) => {
                          const next = [...currentOptions];
                          next[i] = e.target.value;
                          setCurrentOptions(next);
                        }}
                        maxLength={200}
                        className={`flex-1 ${INPUT_CLASSES}`}
                      />
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Intruder quiz */}
            {quizType === 'intruder' && (
              <div className="mt-4">
                <p className="text-xs text-secondary mb-2">4 images (mark one as the intruder)</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {currentIntruderOptions.map((opt, i) => (
                    <div key={i} className={`border rounded-lg p-2 ${currentIntruderIndex === i ? 'border-[#7F77DD] bg-[#EEEDFE]' : 'border-default'}`}>
                      <ImageUploader
                        value={opt.image_url || null}
                        onChange={(url) => {
                          const next = [...currentIntruderOptions];
                          next[i] = { ...next[i]!, image_url: url };
                          setCurrentIntruderOptions(next);
                        }}
                      />
                      <input
                        type="text"
                        value={opt.label}
                        onChange={(e) => {
                          const next = [...currentIntruderOptions];
                          next[i] = { ...next[i]!, label: e.target.value };
                          setCurrentIntruderOptions(next);
                        }}
                        placeholder={`Name ${i + 1}`}
                        className={`w-full mt-2 ${INPUT_CLASSES}`}
                      />
                      <button
                        onClick={() => setCurrentIntruderIndex(i)}
                        className={`w-full mt-1.5 py-1 rounded text-xs font-medium transition-colors ${
                          currentIntruderIndex === i
                            ? 'bg-[#EEEDFE] text-[#3C3489]'
                            : 'bg-surface text-tertiary hover:bg-elevated'
                        }`}
                      >
                        {currentIntruderIndex === i ? 'INTRUDER' : 'Mark as intruder'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Fun fact */}
            <input
              type="text"
              placeholder="Fun fact shown after answering (optional)"
              value={currentFunFact}
              onChange={(e) => setCurrentFunFact(e.target.value)}
              maxLength={280}
              className={`${INPUT_CLASSES} mt-4`}
            />

            <div className="flex gap-2 mt-4">
              <button
                onClick={handleSaveQuestion}
                disabled={!canSaveQuestion()}
                className="px-5 py-2.5 rounded-full bg-txt-primary text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {editingIndex !== null ? 'Update question' : 'Save question'}
              </button>
              {editingIndex !== null && (
                <button
                  onClick={() => { setEditingIndex(null); resetEditor(); }}
                  className="px-5 py-2.5 rounded-full border border-default text-sm font-medium hover:border-default transition-colors"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        )}

        <div className="flex gap-2 mt-5">
          <button
            onClick={() => setStep(2)}
            className="px-6 py-3 rounded-full border border-default text-sm font-medium bg-primary hover:border-default transition-colors"
          >
            Back
          </button>
          <button
            onClick={() => setStep(4)}
            disabled={!canContinueStep3}
            className="flex-1 py-3 rounded-full bg-txt-primary text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Review quiz
          </button>
        </div>
        {!canContinueStep3 && remaining > 0 && (
          <p className="text-xs text-secondary mt-2">Add at least {remaining} more question{remaining > 1 ? 's' : ''}</p>
        )}
      </div>
    );
  }

  // ============================================
  // STEP 4: Review and publish
  // ============================================

  return (
    <div>
      <ProgressDots step={4} />
      <StepHeader step={4} title="Review and publish" description="Here's how your quiz will look to players." />

      {/* Preview card */}
      <div className="bg-primary border border-default rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2.5">
          {selectedGroup && (
            <span
              className="inline-block text-xs font-medium px-2.5 py-0.5 rounded-full"
              style={{ backgroundColor: '#F1EFE8', color: '#444441' }}
            >
              {selectedGroup.name}
            </span>
          )}
          {customGroupName && !selectedGroup && (
            <span className="inline-block text-xs font-medium px-2.5 py-0.5 rounded-full bg-elevated text-primary">
              {customGroupName}
            </span>
          )}
          <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-${difficulty}-bg text-${difficulty}-text`}>
            {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
          </span>
          <span className="text-xs text-secondary ml-auto">{savedQuestions.length} questions</span>
        </div>
        <p className="text-base font-medium leading-snug mb-2 text-primary">{title}</p>
        <p className="text-xs text-secondary">by <span className="font-medium text-primary">you</span></p>
      </div>

      {/* Question preview */}
      <div className="mt-4">
        {savedQuestions.slice(0, 3).map((q, i) => (
          <div key={i} className="bg-surface rounded-md p-4 mb-2">
            <p className="text-xs text-secondary">Q{i + 1}</p>
            <p className="text-sm font-medium mt-1 text-primary">{q.question}</p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {q.options.map((opt, j) => (
                <span
                  key={j}
                  className={`text-xs px-2.5 py-1 rounded-full border ${
                    j === q.correct
                      ? 'bg-correct-bg text-correct-text border-correct'
                      : 'bg-primary text-secondary border-default'
                  }`}
                >
                  {typeof opt === 'string' ? opt : (opt as IntruderOptionData).label}
                </span>
              ))}
            </div>
          </div>
        ))}
        {savedQuestions.length > 3 && (
          <p className="text-sm text-secondary text-center mt-2">+ {savedQuestions.length - 3} more questions</p>
        )}
      </div>

      {/* Settings */}
      <div className="mt-5 flex flex-col gap-3">
        <label className="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" checked={timerEnabled} onChange={(e) => setTimerEnabled(e.target.checked)} className="w-4 h-4 accent-accent" />
          <span className="text-sm text-primary">Show timer (15s per question)</span>
        </label>
        <label className="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" checked={shuffleEnabled} onChange={(e) => setShuffleEnabled(e.target.checked)} className="w-4 h-4 accent-accent" />
          <span className="text-sm text-primary">Shuffle question order</span>
        </label>
        <label className="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" checked={showAnswers} onChange={(e) => setShowAnswers(e.target.checked)} className="w-4 h-4 accent-accent" />
          <span className="text-sm text-primary">Allow players to see correct answers after finishing</span>
        </label>
      </div>

      {/* Navigation */}
      <div className="flex gap-2 mt-6">
        <button
          onClick={() => setStep(3)}
          className="px-6 py-3 rounded-full border border-default text-sm font-medium bg-primary hover:border-default transition-colors"
        >
          Edit questions
        </button>
        <button
          onClick={handlePublish}
          disabled={publishing}
          className="flex-1 py-3 rounded-full bg-txt-primary text-white text-sm font-medium disabled:opacity-60"
        >
          {publishing
            ? (isEditMode ? 'Saving...' : 'Publishing...')
            : (isEditMode ? 'Save changes' : 'Publish quiz')
          }
        </button>
      </div>
    </div>
  );
}
