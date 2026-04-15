import { ModeSelect } from '@/components/modes/mode-select';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Play - Choose Your Mode | K-pop Blindtest',
};

export default function ModesPage() {
  return <ModeSelect />;
}
