import Link from 'next/link';

import { GENERATIONS_HUB_PATH, generationAnswer } from '@/lib/generations/generations';

import type { GenerationLabel } from '@/lib/generations/generations';

/**
 * The visible answer to "What generation is {name}?" on a group hub: the sentence from the
 * generation file, its sources as links next to it (rulebook 3.8 and 5.5), and the hub that
 * owns the cluster, linked with its anchor (rulebook 8.1). The plain text is
 * generationAnswerText (lib/generations/generations.ts).
 */
export function GenerationAnswer({ name, label }: { name: string; label: GenerationLabel }): React.ReactElement {
  return (
    <>
      {generationAnswer(name, label)} {label.sources.length === 1 ? 'Source: ' : 'Sources: '}
      {label.sources.map((s, i) => (
        <span key={s.id}>
          {i > 0 ? '; ' : ''}
          <a href={s.url}>{s.short}</a>
        </span>
      ))}
      . Every group, era by era: <Link href={GENERATIONS_HUB_PATH}>K-pop generations</Link>.
    </>
  );
}
