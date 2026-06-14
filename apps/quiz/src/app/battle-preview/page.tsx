import { BattlePreview } from '@/components/battle-preview/battle-preview';

import type { Metadata } from 'next';

// Step E PROTOTYPE - non-wired async 1v1 battle UI for sign-off. Mock only.
export const metadata: Metadata = {
  title: 'Battle preview',
  robots: { index: false, follow: false },
};

export default function BattlePreviewPage(): React.ReactElement {
  return <BattlePreview />;
}
