/**
 * Fuzzy matching engine for Challenge Mode.
 * Handles typos, special characters, partial matches, and Korean input.
 */

/** Normalize a string for comparison: lowercase, remove special chars, collapse spaces. */
export function normalize(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9가-힣ㄱ-ㅎㅏ-ㅣ\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Levenshtein distance between two strings. */
export function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array.from({ length: n + 1 }, () => 0));

  for (let i = 0; i <= m; i++) dp[i]![0] = i;
  for (let j = 0; j <= n; j++) dp[0]![j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i]![j] = Math.min(
        dp[i - 1]![j]! + 1,
        dp[i]![j - 1]! + 1,
        dp[i - 1]![j - 1]! + cost,
      );
    }
  }

  return dp[m]![n]!;
}

/** Check if input matches the correct answer with fuzzy tolerance. */
export function fuzzyMatch(
  input: string,
  correctAnswer: string,
): { matches: boolean; confidence: number } {
  const normInput = normalize(input);
  const normCorrect = normalize(correctAnswer);

  if (!normInput) return { matches: false, confidence: 0 };

  // Exact match
  if (normInput === normCorrect) return { matches: true, confidence: 1 };

  // Input contained in correct (partial match for long names)
  if (normCorrect.includes(normInput) && normInput.length >= 4) {
    const coverage = normInput.length / normCorrect.length;
    if (coverage >= 0.4) return { matches: true, confidence: 0.9 };
  }

  // Correct contained in input (overtyped)
  if (normInput.includes(normCorrect)) {
    return { matches: true, confidence: 0.85 };
  }

  // Levenshtein distance
  const distance = levenshtein(normInput, normCorrect);
  const maxLen = Math.max(normInput.length, normCorrect.length);

  let maxAllowed: number;
  if (maxLen <= 3) maxAllowed = 0;
  else if (maxLen <= 6) maxAllowed = 1;
  else if (maxLen <= 10) maxAllowed = 2;
  else maxAllowed = 3;

  if (distance <= maxAllowed) {
    return { matches: true, confidence: 1 - distance / maxLen };
  }

  // Word-by-word matching for multi-word answers
  const correctWords = normCorrect.split(' ');
  const inputWords = normInput.split(' ');

  if (correctWords.length > 1) {
    let matchedWords = 0;
    for (const iw of inputWords) {
      for (const cw of correctWords) {
        if (levenshtein(iw, cw) <= 1) {
          matchedWords++;
          break;
        }
      }
    }
    if (matchedWords >= Math.ceil(correctWords.length * 0.5) && matchedWords >= 1) {
      return { matches: true, confidence: 0.75 };
    }
  }

  return { matches: false, confidence: 0 };
}

/** Get auto-suggest candidates ranked by relevance. */
export function getSuggestions(
  input: string,
  possibleAnswers: string[],
  maxSuggestions: number = 5,
): string[] {
  if (!input || input.length < 1) return [];

  const normInput = normalize(input);
  if (!normInput) return [];

  const scored = possibleAnswers.map((answer) => {
    const normAnswer = normalize(answer);

    // Starts with input
    if (normAnswer.startsWith(normInput)) {
      return { answer, score: 100 - normAnswer.length };
    }

    // Contains input
    if (normAnswer.includes(normInput)) {
      return { answer, score: 50 - normAnswer.length };
    }

    // Any word starts with input
    const words = normAnswer.split(' ');
    if (words.some((w) => w.startsWith(normInput))) {
      return { answer, score: 30 - normAnswer.length };
    }

    // Fuzzy prefix match
    const prefix = normAnswer.slice(0, normInput.length + 2);
    const distance = levenshtein(normInput, prefix);
    if (distance <= 2) {
      return { answer, score: 20 - distance };
    }

    return { answer, score: -1 };
  });

  return scored
    .filter((s) => s.score >= 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxSuggestions)
    .map((s) => s.answer);
}
