import { notFound } from 'next/navigation';

import { getModeById } from '@/lib/blind-test-modes';
import { BlindTestPlayer } from '@/components/blind-test/blind-test-player';

import type { Metadata } from 'next';

interface ModePageProps {
  params: Promise<{ mode: string }>;
}

export async function generateMetadata({ params }: ModePageProps): Promise<Metadata> {
  const { mode: modeId } = await params;
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
  const mode = getModeById(modeId);
  if (!mode) notFound();

  return (
    <div className="py-6">
      <BlindTestPlayer mode={mode} />
    </div>
  );
}
