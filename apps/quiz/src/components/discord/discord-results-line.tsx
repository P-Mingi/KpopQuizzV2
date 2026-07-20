import { discordInviteWithUtm } from '@kpopquiz/shared/social-links';

// K2 - one tasteful line on result screens (quiz/blindtest/battle reveal).
// Subtle, sits near the share row; NOT a modal or popup. Carries
// utm_campaign=result-<surface> so K6 monitoring can attribute referrals.
export function DiscordResultsLine({
  surface,
  text = 'Compare with the community on Discord',
}: {
  surface:
    | 'quiz-result'
    | 'blindtest-result'
    | 'battle-reveal'
    // Workstream LOOP - the game results that now end in a shared ResultLoop.
    | 'this-or-that-result'
    | 'name-all-result'
    | 'duel-result';
  text?: string;
}): React.ReactElement {
  return (
    <a
      className="discord-results-line"
      href={discordInviteWithUtm(`result-${surface}`)}
      target="_blank"
      rel="noopener noreferrer"
    >
      <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M13.554 2.893A12.634 12.634 0 0 0 10.436 1.8a8.268 8.268 0 0 0-.404.817 11.828 11.828 0 0 0-3.502 0A8.923 8.923 0 0 0 6.149 1.8a12.67 12.67 0 0 0-3.12 1.095C.767 5.685.214 8.487.49 11.25A12.697 12.697 0 0 0 4.35 13.2a9.437 9.437 0 0 0 .834-1.35 8.202 8.202 0 0 1-1.313-.629c.11-.08.218-.163.322-.25a9.07 9.07 0 0 0 7.698 0c.105.09.213.173.323.25a8.23 8.23 0 0 1-1.316.63 9.394 9.394 0 0 0 .834 1.348 12.65 12.65 0 0 0 3.863-1.95c.334-3.212-.57-5.986-2.04-8.456ZM5.53 9.665c-.733 0-1.336-.667-1.336-1.487 0-.82.588-1.49 1.336-1.49.749 0 1.348.67 1.336 1.49 0 .82-.588 1.487-1.336 1.487Zm4.94 0c-.733 0-1.336-.667-1.336-1.487 0-.82.588-1.49 1.336-1.49.749 0 1.344.67 1.336 1.49-.003.82-.588 1.487-1.336 1.487Z" /></svg>
      {text} &rarr;
    </a>
  );
}
