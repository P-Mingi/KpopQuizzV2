'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { fuzzyMatch, getSuggestions } from '@/lib/fuzzy-match';

interface RevealState {
  correct: boolean;
  userAnswer: string | null;
}

interface Props {
  questionType: 'artist' | 'title';
  correctAnswer: string;
  allPossibleAnswers: string[];
  onSubmit: (answer: string | null) => void;
  disabled: boolean;
  revealState: RevealState | null;
}

export function ChallengeInput({
  questionType,
  correctAnswer,
  allPossibleAnswers,
  onSubmit,
  disabled,
  revealState,
}: Props) {
  const [input, setInput] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when enabled
  useEffect(() => {
    if (!disabled && inputRef.current) {
      inputRef.current.focus();
    }
  }, [disabled]);

  // Reset input when question changes
  useEffect(() => {
    if (!disabled) {
      setInput('');
      setSuggestions([]);
    }
  }, [disabled]);

  // Update suggestions as user types
  useEffect(() => {
    if (input.length >= 1 && !disabled) {
      setSuggestions(getSuggestions(input, allPossibleAnswers, 5));
    } else {
      setSuggestions([]);
    }
  }, [input, allPossibleAnswers, disabled]);

  const handleSubmit = useCallback((value: string) => {
    if (disabled || !value.trim()) return;

    const result = fuzzyMatch(value, correctAnswer);
    // Submit the canonical correct answer on match, raw input on miss
    onSubmit(result.matches ? correctAnswer : value);
    inputRef.current?.blur();
  }, [disabled, correctAnswer, onSubmit]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (suggestions.length > 0 && input.length >= 2) {
        handleSubmit(suggestions[0]!);
      } else {
        handleSubmit(input);
      }
    }
  };

  const handleSuggestionTap = (suggestion: string) => {
    if (disabled) return;
    setInput(suggestion);
    handleSubmit(suggestion);
  };

  // Reveal state
  if (revealState) {
    const isCorrect = revealState.correct;
    return (
      <div>
        <div
          className={`w-full py-3.5 px-5 rounded-xl border-[1.5px] text-[15px] font-medium text-center ${
            isCorrect
              ? 'bg-correct-bg border-correct text-correct-text'
              : 'bg-wrong-bg border-wrong text-wrong-text'
          }`}
        >
          {isCorrect ? '\u2713 ' : '\u2717 '}
          {revealState.userAnswer || '(no answer)'}
        </div>
        {!isCorrect && (
          <p className="text-center text-xs text-ghost mt-2">
            Correct: <span className="font-semibold text-correct-text">{correctAnswer}</span>
          </p>
        )}
      </div>
    );
  }

  // Input state
  return (
    <div>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={questionType === 'artist' ? 'Type the artist name...' : 'Type the song title...'}
          inputMode="search"
          enterKeyHint="go"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          className="w-full py-3.5 pl-5 pr-14 rounded-xl border-[1.5px] border-default bg-surface text-[15px] text-primary placeholder:text-ghost outline-none focus:border-accent transition-colors"
        />
        <button
          type="button"
          onClick={() => {
            if (suggestions.length > 0 && input.length >= 2) {
              handleSubmit(suggestions[0]!);
            } else {
              handleSubmit(input);
            }
          }}
          disabled={disabled || !input.trim()}
          className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-lg bg-accent text-primary flex items-center justify-center text-sm font-bold disabled:opacity-30 transition-opacity"
          aria-label="Submit answer"
        >
          &#9166;
        </button>
      </div>

      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {suggestions.map((s, i) => (
            <button
              key={`${s}-${i}`}
              type="button"
              onClick={() => handleSuggestionTap(s)}
              disabled={disabled}
              className={`px-3 py-1.5 rounded-lg text-[13px] border transition-colors active:scale-[0.97] ${
                i === 0
                  ? 'bg-accent-bg text-accent border-accent'
                  : 'bg-surface text-tertiary border-default hover:border-accent'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
