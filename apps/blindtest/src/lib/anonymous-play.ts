const PLAY_COUNT_KEY = 'bt_anon_plays';
const SIGNUP_PROMPT_THRESHOLD = 3;

export function getAnonPlayCount(): number {
  if (typeof window === 'undefined') return 0;
  return parseInt(localStorage.getItem(PLAY_COUNT_KEY) || '0', 10);
}

export function incrementAnonPlayCount(): number {
  const count = getAnonPlayCount() + 1;
  localStorage.setItem(PLAY_COUNT_KEY, count.toString());
  return count;
}

export function shouldPromptSignup(): boolean {
  return getAnonPlayCount() >= SIGNUP_PROMPT_THRESHOLD;
}
