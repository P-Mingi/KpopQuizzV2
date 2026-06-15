// Shared trivia types. Dependency-free so the corpus extraction script (run via
// tsx, outside the Next runtime) can import them too.

export type TriviaCategory = 'members' | 'music' | 'achievements' | 'history' | 'fun';

export interface TriviaFact {
  fact: string;
  category: TriviaCategory;
  sourceQuizTitle: string;
  sourceQuizSlug: string;
}
