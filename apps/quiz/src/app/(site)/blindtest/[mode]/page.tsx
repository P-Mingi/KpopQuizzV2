import { notFound } from 'next/navigation';

import { getModeById, isGroupModeId, getGroupSlugFromModeId, STATIC_MODES } from '@/lib/blind-test-modes';
import { getPlayableStaticModes, isThemedModePlayable } from '@/lib/blind-test-playlists';
import { BlindTestPlayer } from '@/components/blind-test/blind-test-player';
import { BlindtestModeV11 } from '@/components/blindtest/ux-v1/mode-page';
import { BlindtestThemeV12, themeMetadata } from '@/components/blindtest/ux-v1/theme-page';
import { isThemePage, themeById } from '@/lib/growth/bt-themes';
import { UX_V1 } from '@/lib/ux-v1';
import { isUxV12 } from '@/lib/ux-v12';

import type { Metadata } from 'next';
import type { BlindTestMode } from '@/lib/blind-test-modes';

interface ModePageProps {
  params: Promise<{ mode: string }>;
}

// PERF NAV: this playlist page reads only `params` + STATIC_MODES (a code constant,
// zero DB) and mounts a client player, but a dynamic segment renders per-request
// (Cache-Control: no-store) unless it declares generateStaticParams. Declaring it
// flips the route from Dynamic to Static/ISR. The static (theme/era/difficulty)
// modes are a known finite DB-free list, so they prerender; group modes
// (group-<slug>) fall to on-demand ISR via the default dynamicParams.
export const revalidate = 3600;

// V12 (flag only): STATIC_MODES then also holds the themed modes, and a themed mode
// under 10 playable songs is hidden (G2's rule, lib/blind-test-playlists.ts): no
// prerendered page, no metadata, a 404 like any unknown mode. Flag off: the list
// is STATIC_MODES itself and no query runs, exactly as before.
export async function generateStaticParams(): Promise<Array<{ mode: string }>> {
  if (!isUxV12()) return STATIC_MODES.map((m) => ({ mode: m.id }));
  let modes = STATIC_MODES;
  try {
    modes = await getPlayableStaticModes();
  } catch {
    // No database at build (a preview without secrets): the pages render on demand
    // and decide there; prerender none of the themed ones.
    modes = STATIC_MODES.filter((m) => !isThemePage(m.id));
  }
  return modes.map((m) => ({ mode: m.id }));
}

/** Flag on: is this id a themed mode that must stay hidden? Flag off: never (no query). */
async function hiddenTheme(modeId: string): Promise<boolean> {
  if (!isUxV12() || !isThemePage(modeId)) return false;
  try {
    return !(await isThemedModePlayable(modeId));
  } catch {
    return true; // fail closed: no dead door when the count cannot be read
  }
}

export async function generateMetadata({ params }: ModePageProps): Promise<Metadata> {
  const { mode: modeId } = await params;

  if (isGroupModeId(modeId)) {
    const slug = getGroupSlugFromModeId(modeId) || '';
    const name = slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    return {
      title: `${name} Blind Test - K-pop Blind Test`,
      description: `How well do you know ${name}? Listen to clips and guess the song.`,
      alternates: { canonical: `/blindtest/${modeId}` },
    };
  }

  const mode = getModeById(modeId);
  if (!mode) return {};
  if (await hiddenTheme(modeId)) return {};

  // V12 themed playlist page: a new URL with its own title and description.
  const theme = isUxV12() && isThemePage(modeId) ? themeById(modeId) : undefined;
  if (theme) return themeMetadata(theme);

  return {
    title: `${mode.title} - K-pop Blind Test`,
    description: `${mode.description}. ${mode.song_count} songs, ${mode.clip_duration}s clips.`,
    alternates: { canonical: `/blindtest/${mode.id}` },
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
  if (await hiddenTheme(modeId)) notFound();

  // V12 (NEXT_PUBLIC_UX_V12 on top of v11): a themed playlist has its own page
  // (prototype `btpl`). Every v11 mode page below is untouched.
  const theme = isUxV12() && isThemePage(modeId) ? themeById(modeId) : undefined;
  if (theme) return <BlindtestThemeV12 theme={theme} />;

  // UX v11 (NEXT_PUBLIC_UX_V1, default off): same metadata and SEO copy, the v11
  // day-mode game preset to this mode instead of the legacy player (X1-001).
  if (UX_V1) return <BlindtestModeV11 mode={mode} />;

  return (
    <div className="py-6">
      <BlindTestPlayer mode={mode} />
    </div>
  );
}
