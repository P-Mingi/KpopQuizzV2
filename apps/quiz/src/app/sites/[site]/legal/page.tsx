// Run O1 twin (rule 18) of apps/quiz/src/app/(site)/legal/page.tsx, lane H1: OtakuQuiz and Bunnyverse serve the same legal notice. The
// page reads its site from the registry (name, domain), so nothing is copied here. Fusion A5: the kpop page exports main's static
// metadata, so the twin builds its own from the copy keys (networkLegalMetadata, with the launch gate).
import { networkLegalMetadata } from '@/app/(site)/legal/page';

import type { Metadata } from 'next';

export { default } from '@/app/(site)/legal/page';

export function generateMetadata(): Metadata {
  return networkLegalMetadata();
}
