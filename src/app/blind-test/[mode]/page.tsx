import { notFound } from 'next/navigation';

import { getModeById, isGroupModeId, getGroupSlugFromModeId } from '@/lib/blind-test-modes';
import { BlindTestPlayer } from '@/components/blind-test/blind-test-player';

import type { Metadata } from 'next';
import type { BlindTestMode } from '@/lib/blind-test-modes';

interface ModePageProps {
  params: Promise<{ mode: string }>;
}

export async function generateMetadata({ params }: ModePageProps): Promise<Metadata> {
  const { mode: modeId } = await params;

  if (isGroupModeId(modeId)) {
    const slug = getGroupSlugFromModeId(modeId) || '';
    const name = slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    return {
      title: `${name} Blind Test - K-pop Blind Test`,
      description: `How well do you know ${name}? Listen to clips and guess the song.`,
      alternates: { canonical: `/blind-test/${modeId}` },
    };
  }

  const mode = getModeById(modeId);
  if (!mode) return {};

  return {
    title: `${mode.title} - K-pop Blind Test`,
    description: `${mode.description}. ${mode.song_count} songs, ${mode.clip_duration}s clips.`,
    alternates: { canonical: `/blind-test/${mode.id}` },
  };
}

export default async function BlindTestModePage({ params }: ModePageProps): Promise<React.ReactElement> {
  const { mode: modeId } = await params;

  let mode: BlindTestMode | undefined;

  if (isGroupModeId(modeId)) {
    const groupSlug = getGroupSlugFromModeId(modeId);
    if (!groupSlug) notFound();
    mode = {
      id: modeId,
      title: groupSlug!.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
      description: '',
      clip_point: 'chorus',
      clip_duration: 10,
      song_count: 10,
      difficulty: 'easy',
      filter: { group_slug: groupSlug! },
      category: 'group',
    };
  } else {
    mode = getModeById(modeId);
  }

  if (!mode) notFound();

  return (
    <div className="py-6">
      <BlindTestPlayer mode={mode} />
    </div>
  );
}
