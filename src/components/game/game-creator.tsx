'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { useToast } from '@/components/ui/toast-provider';

// ============================================
// Types
// ============================================

interface GroupOption {
  id: number;
  name: string;
  slug: string;
}

interface SavedMatchup {
  option_a: string;
  option_b: string;
}

interface GameCreatorProps {
  groups: GroupOption[];
}

// ============================================
// Sub-components
// ============================================

function ProgressDots({ step }: { step: number }): React.ReactElement {
  return (
    <div className="flex gap-1.5 items-center mb-6">
      {[1, 2, 3].map((s) => (
        <div
          key={s}
          className={`h-2 rounded-full transition-all duration-300 ${
            s === step
              ? 'w-6 bg-[#3C3489]'
              : s < step
                ? 'w-2 bg-correct-accent'
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
      <p className="text-xs text-txt-secondary mb-1">Step {step} of 3</p>
      <h1 className="text-lg font-medium text-txt-primary mb-1">{title}</h1>
      <p className="text-sm text-txt-secondary mb-5">{description}</p>
    </>
  );
}

const INPUT_CLASSES = 'w-full px-4 py-3 rounded-md border border-border-light bg-surface-primary text-sm text-txt-primary placeholder:text-txt-tertiary focus:outline-none focus:border-[#3C3489] focus:ring-1 focus:ring-[#3C3489] transition-colors';

// ============================================
// Main Component
// ============================================

export function GameCreator({ groups }: GameCreatorProps): React.ReactElement {
  const router = useRouter();
  const { showToast } = useToast();

  const [step, setStep] = useState(1);

  // Step 1: Group
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [customGroupName, setCustomGroupName] = useState('');

  // Step 2: Title + Matchups
  const [title, setTitle] = useState('');
  const [matchups, setMatchups] = useState<SavedMatchup[]>([
    { option_a: '', option_b: '' },
    { option_a: '', option_b: '' },
    { option_a: '', option_b: '' },
    { option_a: '', option_b: '' },
    { option_a: '', option_b: '' },
  ]);

  // Publishing
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState<{ slug: string } | null>(null);
  const [copyText, setCopyText] = useState('Copy link');

  // Helpers
  const selectedGroup = selectedGroupId ? groups.find((g) => g.id === selectedGroupId) : null;
  const groupName = selectedGroup?.name ?? customGroupName;
  const canContinueStep1 = selectedGroupId !== null || customGroupName.trim().length >= 2;
  const canContinueStep2 = title.trim().length >= 5 && matchups.filter(m => m.option_a.trim() && m.option_b.trim()).length >= 5;

  function updateMatchup(index: number, field: 'option_a' | 'option_b', value: string) {
    setMatchups(prev => prev.map((m, i) => i === index ? { ...m, [field]: value } : m));
  }

  function addMatchup() {
    if (matchups.length >= 15) return;
    setMatchups(prev => [...prev, { option_a: '', option_b: '' }]);
  }

  function removeMatchup(index: number) {
    if (matchups.length <= 5) return;
    setMatchups(prev => prev.filter((_, i) => i !== index));
  }

  async function handlePublish() {
    setPublishing(true);

    const validMatchups = matchups.filter(m => m.option_a.trim() && m.option_b.trim());

    const payload = {
      group_id: selectedGroupId ?? undefined,
      group_name: selectedGroupId ? undefined : customGroupName.trim() || undefined,
      title: title.trim(),
      matchups: validMatchups,
    };

    try {
      const res = await fetch('/api/game/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data: { error: string } = await res.json();
        console.error('Publish error:', data.error);
        showToast('Failed to publish game', 'error');
        setPublishing(false);
        return;
      }

      const data: { slug: string } = await res.json();
      setPublished(data);
    } catch {
      console.error('Publish failed');
      setPublishing(false);
    }
  }

  async function handleCopyUrl(slug: string) {
    const url = `${process.env.NEXT_PUBLIC_SITE_URL}/g/${slug}`;
    await navigator.clipboard.writeText(url);
    setCopyText('Copied!');
    setTimeout(() => setCopyText('Copy link'), 2000);
  }

  // ============================================
  // PUBLISHED SCREEN
  // ============================================

  if (published) {
    const gameUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/g/${published.slug}`;
    const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(`${title} -- play and see what % of fans agree 👀`)}&url=${encodeURIComponent(gameUrl)}`;
    const redditUrl = `https://www.reddit.com/r/kpoppers/submit?type=link&url=${encodeURIComponent(gameUrl)}&title=${encodeURIComponent(`${title} -- play and see what % of fans agree with you`)}`;

    return (
      <div className="text-center py-8">
        <div className="w-14 h-14 rounded-full bg-[#EEEDFE] flex items-center justify-center mx-auto animate-bounce-in">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M5 13l4 4L19 7" stroke="#3C3489" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        <h2 className="text-lg font-medium mt-4 text-txt-primary">Your game is live!</h2>
        <p className="text-sm text-txt-secondary mt-1">Share it and watch the votes roll in.</p>

        <div className="mt-6 bg-surface-secondary rounded-md px-4 py-3 flex items-center gap-2">
          <p className="text-sm text-txt-secondary flex-1 truncate">kpopquiz.org/g/{published.slug}</p>
          <button
            onClick={() => handleCopyUrl(published.slug)}
            className="px-3 py-1.5 rounded-full border border-border-light bg-surface-primary text-xs font-medium cursor-pointer hover:border-border-medium transition-colors flex-shrink-0"
          >
            {copyText}
          </button>
        </div>

        <div className="flex gap-2 justify-center mt-5">
          <a
            href={redditUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-5 py-2.5 rounded-full bg-[#FF4500] text-white text-sm font-medium"
          >
            Share on Reddit
          </a>
          <a
            href={tweetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-5 py-2.5 rounded-full bg-txt-primary text-white text-sm font-medium"
          >
            Share on X
          </a>
        </div>

        <div className="mt-4">
          <button
            onClick={() => router.push(`/g/${published.slug}`)}
            className="px-5 py-2.5 rounded-full border border-border-light text-sm font-medium bg-surface-primary hover:border-border-medium transition-colors"
          >
            View your game
          </button>
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
        <StepHeader step={1} title="Pick a group" description="Which group is your game about? Leave blank for general K-pop." />

        <div className="flex flex-wrap gap-2 mb-5">
          {groups.map((g) => (
            <button
              key={g.id}
              onClick={() => { setSelectedGroupId(g.id); setCustomGroupName(''); }}
              className={`px-4 py-2 rounded-full text-sm border cursor-pointer transition-colors ${
                selectedGroupId === g.id
                  ? 'border-[#3C3489] bg-[#EEEDFE] text-[#3C3489]'
                  : 'border-border-light text-txt-secondary bg-surface-primary hover:border-border-medium'
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

        <div className="flex gap-2 mt-5">
          <button
            onClick={() => setStep(2)}
            disabled={!canContinueStep1}
            className="flex-1 py-3 rounded-full bg-txt-primary text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Continue
          </button>
          <button
            onClick={() => { setSelectedGroupId(null); setCustomGroupName(''); setStep(2); }}
            className="px-6 py-3 rounded-full border border-border-light text-sm font-medium bg-surface-primary hover:border-border-medium transition-colors"
          >
            Skip (general K-pop)
          </button>
        </div>
      </div>
    );
  }

  // ============================================
  // STEP 2: Title + Matchups
  // ============================================

  if (step === 2) {
    const validCount = matchups.filter(m => m.option_a.trim() && m.option_b.trim()).length;
    const remaining = 5 - validCount;

    return (
      <div>
        <ProgressDots step={2} />
        <StepHeader step={2} title="Build your matchups" description="Give it a title and add at least 5 matchups." />

        <input
          type="text"
          placeholder="e.g. BTS vs EXO -- pick your favorite"
          maxLength={100}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={INPUT_CLASSES}
        />
        <p className="text-xs text-txt-tertiary text-right mt-1">{title.length}/100</p>

        <div className="mt-5 space-y-3">
          {matchups.map((m, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-xs text-txt-tertiary w-4 text-right flex-shrink-0">{i + 1}</span>
              <input
                type="text"
                placeholder="Option A"
                maxLength={100}
                value={m.option_a}
                onChange={(e) => updateMatchup(i, 'option_a', e.target.value)}
                className="flex-1 px-3 py-2.5 rounded-md border border-border-light bg-surface-primary text-sm text-txt-primary placeholder:text-txt-tertiary focus:outline-none focus:border-[#3C3489] transition-colors"
              />
              <span className="text-xs text-txt-tertiary font-medium">vs</span>
              <input
                type="text"
                placeholder="Option B"
                maxLength={100}
                value={m.option_b}
                onChange={(e) => updateMatchup(i, 'option_b', e.target.value)}
                className="flex-1 px-3 py-2.5 rounded-md border border-border-light bg-surface-primary text-sm text-txt-primary placeholder:text-txt-tertiary focus:outline-none focus:border-[#3C3489] transition-colors"
              />
              {matchups.length > 5 && (
                <button
                  onClick={() => removeMatchup(i)}
                  className="text-txt-tertiary hover:text-wrong-accent cursor-pointer p-1 flex-shrink-0"
                  aria-label={`Remove matchup ${i + 1}`}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                </button>
              )}
            </div>
          ))}
        </div>

        {matchups.length < 15 && (
          <button
            onClick={addMatchup}
            className="mt-3 text-sm text-[#3C3489] font-medium cursor-pointer hover:underline"
          >
            + Add matchup
          </button>
        )}

        <div className="flex gap-2 mt-6">
          <button
            onClick={() => setStep(1)}
            className="px-6 py-3 rounded-full border border-border-light text-sm font-medium bg-surface-primary hover:border-border-medium transition-colors"
          >
            Back
          </button>
          <button
            onClick={() => setStep(3)}
            disabled={!canContinueStep2}
            className="flex-1 py-3 rounded-full bg-txt-primary text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Review
          </button>
        </div>
        {remaining > 0 && (
          <p className="text-xs text-txt-secondary mt-2">Fill in at least {remaining} more matchup{remaining > 1 ? 's' : ''}</p>
        )}
      </div>
    );
  }

  // ============================================
  // STEP 3: Review and publish
  // ============================================

  const validMatchups = matchups.filter(m => m.option_a.trim() && m.option_b.trim());

  return (
    <div>
      <ProgressDots step={3} />
      <StepHeader step={3} title="Review and publish" description="Here's how your game will look." />

      {/* Preview card */}
      <div className="bg-surface-primary border border-border-light rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2.5">
          {groupName && (
            <span
              className="inline-block text-xs font-medium px-2.5 py-0.5 rounded-full"
              style={{ backgroundColor: selectedGroup?.id ? '#F1EFE8' : 'var(--bg-tertiary)', color: '#444441' }}
            >
              {groupName}
            </span>
          )}
          <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-[#EEEDFE] text-[#3C3489]">This or That</span>
          <span className="text-xs text-txt-secondary ml-auto">{validMatchups.length} matchups</span>
        </div>
        <p className="text-base font-medium leading-snug mb-2 text-txt-primary">{title}</p>
        <p className="text-xs text-txt-secondary">by <span className="font-medium text-txt-primary">you</span></p>
      </div>

      {/* Matchup preview */}
      <div className="mt-4 space-y-2">
        {validMatchups.slice(0, 4).map((m, i) => (
          <div key={i} className="bg-surface-secondary rounded-md p-3 flex items-center">
            <span className="text-xs text-txt-tertiary w-6 flex-shrink-0">#{i + 1}</span>
            <span className="text-sm font-medium text-txt-primary flex-1 text-center">{m.option_a}</span>
            <span className="text-xs text-txt-tertiary mx-2">vs</span>
            <span className="text-sm font-medium text-txt-primary flex-1 text-center">{m.option_b}</span>
          </div>
        ))}
        {validMatchups.length > 4 && (
          <p className="text-sm text-txt-secondary text-center mt-2">+ {validMatchups.length - 4} more matchups</p>
        )}
      </div>

      {/* Navigation */}
      <div className="flex gap-2 mt-6">
        <button
          onClick={() => setStep(2)}
          className="px-6 py-3 rounded-full border border-border-light text-sm font-medium bg-surface-primary hover:border-border-medium transition-colors"
        >
          Edit matchups
        </button>
        <button
          onClick={handlePublish}
          disabled={publishing}
          className="flex-1 py-3 rounded-full bg-txt-primary text-white text-sm font-medium disabled:opacity-60"
        >
          {publishing ? 'Publishing...' : 'Publish game'}
        </button>
      </div>
    </div>
  );
}
