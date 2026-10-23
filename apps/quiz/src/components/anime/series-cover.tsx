import { SeriesArt } from './series-art';

/** The word of each quiz type on a card (the same words as the type chips of the hub). */
export const QUIZ_TYPE_WORD: Readonly<Record<string, string>> = {
  multiple_choice: 'Classic',
  true_false: 'True or false',
  guess_from_clues: 'Clues',
  image: 'Image',
  intruder: 'Odd one out',
};

/**
 * The cover of a quiz card on anime, in place of the empty grey block: the art of the series as a strip (the card), and as a
 * square (the stacked phone list, where the cover is a 96 px thumb). The sheet shows one of the two. The series is named
 * for assistive technology by the picture itself. Hooks-free.
 */
export function SeriesCover({ slug, name }: { slug: string; name: string }): React.ReactElement {
  return (
    <>
      <span className="anime-o2-art-strip"><SeriesArt slug={slug} title={name} size="card" label={name} /></span>
      <span className="anime-o2-art-sq"><SeriesArt slug={slug} title={name} size="avatar" label={name} /></span>
    </>
  );
}
