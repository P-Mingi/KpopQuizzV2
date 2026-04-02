'use client';

import { useState, useCallback, useRef } from 'react';
import { calculateFinalPoints, getComboMultiplier } from '@/lib/scoring';

export interface Question {
  song_id: string;
  question_type: 'artist' | 'title';
  question_text: string;
  preview_url: string;
  album_cover_medium: string | null;
  album_cover_big: string | null;
  correct_answer: string;
  choices: string[];
  reveal: { title: string; artist: string; album: string | null; cover: string | null };
}

export interface SongResult {
  question: Question;
  answered: string | null;
  correct: boolean;
  points: number;
  timeElapsed: number;
  combo: number;
}

export type GamePhase = 'loading' | 'playing' | 'reveal' | 'results';

export interface GameState {
  phase: GamePhase;
  questions: Question[];
  currentIndex: number;
  results: SongResult[];
  totalScore: number;
  currentCombo: number;
  bestCombo: number;
  timerDuration: number;
  playlist: string;
  mode: string;
  difficulty: string;
}

export function useGameState() {
  const [state, setState] = useState<GameState>({
    phase: 'loading',
    questions: [],
    currentIndex: 0,
    results: [],
    totalScore: 0,
    currentCombo: 0,
    bestCombo: 0,
    timerDuration: 15,
    playlist: 'all',
    mode: 'quick',
    difficulty: 'all',
  });

  const [lastPoints, setLastPoints] = useState(0);
  const timerStartRef = useRef(0);

  const startGame = useCallback((questions: Question[], timerDuration: number, playlist: string, mode: string, difficulty: string) => {
    setState({
      phase: 'playing',
      questions,
      currentIndex: 0,
      results: [],
      totalScore: 0,
      currentCombo: 0,
      bestCombo: 0,
      timerDuration,
      playlist,
      mode,
      difficulty,
    });
    timerStartRef.current = Date.now();
    setLastPoints(0);
  }, []);

  const submitAnswer = useCallback((choice: string | null) => {
    setState((prev) => {
      if (prev.phase !== 'playing') return prev;

      const question = prev.questions[prev.currentIndex];
      if (!question) return prev;

      const timeElapsed = (Date.now() - timerStartRef.current) / 1000;
      const correct = choice !== null && choice === question.correct_answer;
      const newCombo = correct ? prev.currentCombo + 1 : 0;
      const comboForCalc = correct ? newCombo : 0;
      let points = calculateFinalPoints(timeElapsed, prev.timerDuration, correct, comboForCalc);

      // 1.5x multiplier for challenge mode
      if (prev.mode === 'challenge') {
        points = Math.round(points * 1.5);
      }

      const result: SongResult = {
        question,
        answered: choice,
        correct,
        points,
        timeElapsed,
        combo: comboForCalc,
      };

      const newScore = prev.totalScore + points;
      const newBestCombo = Math.max(prev.bestCombo, newCombo);

      setLastPoints(correct ? points : 0);

      return {
        ...prev,
        phase: 'reveal',
        results: [...prev.results, result],
        totalScore: newScore,
        currentCombo: newCombo,
        bestCombo: newBestCombo,
      };
    });
  }, []);

  const nextSong = useCallback(() => {
    setState((prev) => {
      const nextIndex = prev.currentIndex + 1;
      if (nextIndex >= prev.questions.length) {
        // Apply perfect round bonus
        const allCorrect = prev.results.every((r) => r.correct);
        const bonus = allCorrect ? 2000 : 0;
        return {
          ...prev,
          phase: 'results',
          totalScore: prev.totalScore + bonus,
        };
      }
      timerStartRef.current = Date.now();
      setLastPoints(0);
      return {
        ...prev,
        phase: 'playing',
        currentIndex: nextIndex,
      };
    });
  }, []);

  const currentQuestion = state.questions[state.currentIndex] ?? null;
  const comboMultiplier = getComboMultiplier(state.currentCombo);
  const correctCount = state.results.filter((r) => r.correct).length;
  const avgSpeed = state.results.length > 0
    ? state.results.reduce((sum, r) => sum + r.timeElapsed, 0) / state.results.length
    : 0;

  return {
    state,
    currentQuestion,
    lastPoints,
    comboMultiplier,
    correctCount,
    avgSpeed,
    startGame,
    submitAnswer,
    nextSong,
  };
}
