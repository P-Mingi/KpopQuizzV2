import { BlindTestGame } from '@/components/game/blind-test-game';
import { getModeById, isGroupModeId, buildGroupMode } from '@/lib/blind-test-modes';
import { notFound } from 'next/navigation';

import type { BlindTestMode } from '@/lib/blind-test-modes';

const DAILY_MODE: BlindTestMode = {
  id: 'daily',
  title: "Today's challenge",
  description: 'Same 10 songs for everyone. One shot.',
  clip_point: 'chorus',
  clip_duration: 10,
  song_count: 10,
  difficulty: 'medium',
  filter: {},
  category: 'special',
};

export default async function PlayPage({ params }: { params: Promise<{ mode: string }> }) {
  const { mode: modeId } = await params;

  let mode: BlindTestMode | undefined;

  if (modeId === 'daily') {
    mode = DAILY_MODE;
  } else if (isGroupModeId(modeId)) {
    const slug = modeId.replace('group-', '');
    mode = buildGroupMode({ name: slug, slug, song_count: 10 });
  } else {
    mode = getModeById(modeId);
  }

  if (!mode) return notFound();

  return <BlindTestGame mode={mode} />;
}
