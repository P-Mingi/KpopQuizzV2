'use client';

// Owner, 2026-11-10: the signed-in fan's photo on Bunnyverse, as on KpopQuiz and OtakuQuiz. The source is theirs: the avatar_url of the
// profile that /api/auth/me answers (the kpop nav's UxAvatar reads the same field through useMe), read in the browser only, so no page
// the server renders or caches carries anything personal. The rule of the fallback is theirs too: the initial when there is no photo,
// and here also when the photo fails to load. The mark is decorative (alt=""): the fan's name is always in the text beside it. The box
// (size, round, colours of the initial) is the caller's span, so the hub keeps the look it has today.
import { useState } from 'react';

import { useUxMe } from '@/components/ux-v1/use-ux-me';

/** The photo to draw: the profile's avatar_url, unless it is empty or this very URL already failed to load. */
export function mePhoto(avatarUrl: string | null | undefined, failed: string | null): string | null {
  const src = typeof avatarUrl === 'string' ? avatarUrl.trim() : '';
  if (!src || src === failed) return null;
  return /^https:\/\//.test(src) ? src : null;
}

export function HubMeAvatar({ initial, size }: { initial: string; size: number }): React.ReactElement {
  const me = useUxMe();
  const [failed, setFailed] = useState<string | null>(null);
  const src = mePhoto(me?.profile?.avatar_url, failed);
  if (!src) return <>{initial}</>;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- avatar hosts vary (OAuth, storage), as UxAvatar; tiny
    <img src={src} alt="" width={size} height={size} loading="lazy" decoding="async" referrerPolicy="no-referrer" data-me-photo="" onError={() => setFailed(src)} />
  );
}
