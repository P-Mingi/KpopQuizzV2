// Run O1, lane PERS: the view of a Which character are you page, built from the rows of one series (anime build). Server only.
// The view has the shape of the kpop page's (server.ts getWmaPage) and goes to the same quiz component: same questions, same
// engine, same result card. What differs is the words: the result is a character with the profile text written for it, and the
// links are the series' own. Nothing is read from kpop tables and no kpop group photo or blind test is offered.

import { SITE } from '@/lib/site/registry';

import { getMemberCounts, getSeriesWmaData } from './data';
import { characterRoleLine, profileText, whichCharacterPath } from './series';
import { playerTraits } from './traits';
import { axisOptionIcon, buildDistribution } from './view';

import type { QuizView, ResultView } from './view';
import type { WmaPage } from './server';

export async function getCharacterPage(slug: string): Promise<WmaPage | null> {
  const data = await getSeriesWmaData(slug);
  if (!data) return null;
  const { group, questions, profiles } = data;
  // Loaded here, not at the top: the kpop build reaches this module too and must keep its module graph (the owner's images exist on this build only).
  const { getOwnerCharacterPictures } = await import('@/lib/anime/entity-images-read');
  const [counts, pictures] = await Promise.all([getMemberCounts(group.id), getOwnerCharacterPictures(group.slug)]);

  const results: ResultView[] = profiles.map((p) => ({
    id: p.id,
    name: p.name,
    role: characterRoleLine(p.role, p.affiliation, group.name),
    description: profileText(p),
    traits: playerTraits(p.axes),
    // The owner's portrait of the character (run O1, ADM) when one was uploaded; a result is shown only after the quiz, so no name is given away.
    photo: pictures[p.id]?.src ?? null,
  }));

  const view: QuizView = {
    quiz: 'wma',
    groupSlug: group.slug,
    kicker: 'Which character are you',
    kickerIcon: 'users',
    title: { before: 'Which ', em: group.name, after: ' character are you?' },
    lead: 'Eight questions about you, no right answers, no timer. Your result is the character whose way through the story is closest to yours. No result gives away the plot.',
    meta: [`${questions.length} questions`, 'About 2 minutes', 'No pictures needed'],
    cta: 'Start',
    eyebrow: 'You are',
    who: group.fandom ?? 'fans',
    questions: questions.map((q) => ({ text: q.text, options: q.options.map((o) => ({ text: o.text, icon: axisOptionIcon(o.weights) })) })),
    engine: { kind: 'axes', questions, profiles: profiles.map((p) => ({ id: p.id, name: p.name, axes: p.axes })) },
    results,
    distribution: buildDistribution(counts, profiles.map((p) => ({ id: p.id, label: p.name, key: p.name }))),
    shareUrl: `${SITE.url}${whichCharacterPath(group.slug)}`,
    shareKicker: `Which ${group.name} character are you`,
    // "Set as oshi" under the result (owner, 2026-10-26): saved for this series and this site only (the oshi save module of lib/personality).
    biasOffer: true,
  };
  return { group, view, blindtestSongs: null };
}
