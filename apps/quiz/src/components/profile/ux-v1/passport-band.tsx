'use client';

import { useEffect, useState } from 'react';

import { useUxMe } from '@/components/ux-v1/use-ux-me';

import { HEADER_EVENT } from './header-actions';
import { HeaderPicker } from './header-picker';

import { cssUrl } from '@/lib/ux-v1/p10/passport-model';

import type { BandMode } from '@/lib/ux-v1/p10/passport-model';

interface PassportBandProps {
  username: string;
  /** server = /me (owner known on the server); check = /u (ISR, resolved from /api/auth/me). */
  owner: 'server' | 'check';
  mode: BandMode;
  image: string | null;
  groupPhoto: string | null;
  /** Theme tint behind the photo. */
  tint: string;
}

/** Owner of this passport? /me knows it; /u asks the shared /api/auth/me read. */
export function useIsOwner(username: string, owner: 'server' | 'check'): boolean {
  const me = useUxMe();
  if (owner === 'server') return true;
  return Boolean(me?.profile && me.profile.username === username);
}

/**
 * Passport band (16.7 + 17.8): 120px (96 on phones), the fan's header image, else
 * their main group photo blurred over the theme tint, else the flat tint. The
 * owner gets "Change header" on it. Decorative (aria-hidden image layer).
 */
export function PassportBand({ username, owner, mode: initialMode, image: initialImage, groupPhoto, tint }: PassportBandProps): React.ReactElement {
  const isOwner = useIsOwner(username, owner);
  const [state, setState] = useState<{ mode: BandMode; image: string | null }>({ mode: initialMode, image: initialImage });

  useEffect(() => {
    const on = (e: Event): void => {
      const url = (e as CustomEvent<{ url: string | null }>).detail?.url ?? null;
      setState(url ? { mode: 'image', image: url } : { mode: groupPhoto ? 'group' : 'flat', image: null });
    };
    window.addEventListener(HEADER_EVENT, on);
    return () => window.removeEventListener(HEADER_EVENT, on);
  }, [groupPhoto]);

  const bg = cssUrl(state.mode === 'image' ? state.image : state.mode === 'group' ? groupPhoto : null);
  return (
    <div className={`p10-band is-${state.mode}`} style={{ ['--p10-tint' as string]: tint }} data-band={state.mode}>
      <i className="p10-bandimg" aria-hidden="true" style={bg ? { backgroundImage: bg } : undefined} />
      {isOwner ? <HeaderPicker variant="band" /> : null}
    </div>
  );
}
