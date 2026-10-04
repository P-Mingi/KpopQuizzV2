'use client';

import { useState } from 'react';
import Image from 'next/image';

import { Icon } from '@/components/ux-v1/icon';

import type { UxIconName } from '@/lib/ux-v1/a0/icons';

/** One picture candidate: a URL next/image accepts and its focal point. */
export interface ThumbCandidate { src: string; position: string }

/**
 * The New quizzes thumb (owner, F7b 2026-10-04): never an empty or grey tile.
 * The quiz type icon is always drawn in the tile, under the picture, so the tile is
 * never blank while the picture loads (Firefox only starts a lazy image once it is
 * close to the viewport, and the tile showed its grey ground until then). A picture
 * that fails to load is dropped for the next candidate (quiz picture, then group
 * photo, then group logo), and with no candidate left the icon alone remains. The
 * picture is a fixed 56 x 56 image (1x and 2x candidates), loaded eagerly: six small
 * files.
 */
export function NewThumb({ candidates, icon }: { candidates: ThumbCandidate[]; icon: UxIconName }): React.ReactElement {
  const [index, setIndex] = useState(0);
  const pick = candidates[index];
  return (
    <span className={`ux-thumb p1-glyph p1-nthumb${pick ? ' p1-thumb' : ' is-glyph'}`} aria-hidden="true" data-thumb={pick ? 'picture' : 'icon'}>
      <Icon name={icon} />
      {pick ? (
        <Image
          key={pick.src}
          src={pick.src}
          alt=""
          width={56}
          height={56}
          loading="eager"
          className="p1-nimg"
          style={{ objectPosition: pick.position }}
          onError={() => setIndex((i) => i + 1)}
        />
      ) : null}
    </span>
  );
}
