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
        <div className={`w-full py-3.5 px-5 rounded-xl border-[1.5px] text-[15px] font-medium ${
          isCorrect
            ? 'bg-[var(--correct-bg)] border-[var(--correct)] text-[var(--correct)]'
            : 'bg-[var(--wrong-bg)] border-[var(--wrong)] text-[var(--wrong)]'
        }`}>
          {isCorrect ? '\u2713 ' : '\u2717 '}
          {revealState.userAnswer || '(no answer)'}
        </div>
        {!isCorrect && (
          <p className="text-center text-sm text-text-secondary mt-2">
            Correct: <span className="font-semibold text-correct">{correctAnswer}</span>
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
          className="w-full py-3.5 px-5 pr-14 rounded-xl border-[1.5px] border-border-default bg-bg-secondary text-[15px] text-text-primary placeholder:text-text-ghost outline-none focus:border-pink-400 transition-colors"
        />
        <button
          onClick={() => {
            if (suggestions.length > 0 && input.length >= 2) {
              handleSubmit(suggestions[0]!);
            } else {
              handleSubmit(input);
            }
          }}
          disabled={disabled || !input.trim()}
          className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-lg bg-pink-600 text-white flex items-center justify-center text-sm font-bold disabled:opacity-30 transition-opacity"
        >
          &#9166;
        </button>
      </div>

      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {suggestions.map((s, i) => (
            <button
              key={`${s}-${i}`}
              onClick={() => handleSuggestionTap(s)}
              disabled={disabled}
              className={`px-3 py-1.5 rounded-lg text-[13px] border transition-colors active:scale-[0.97] ${
                i === 0
                  ? 'bg-bg-tertiary text-pink-400 border-pink-400'
                  : 'bg-bg-secondary text-text-secondary border-border-default'
              } hover:border-pink-400`}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
