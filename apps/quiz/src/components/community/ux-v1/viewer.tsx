'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { useSignIn } from '@/components/ux-v1/sign-in-sheet';
import { useUxMe } from '@/components/ux-v1/use-ux-me';

import type { SignInRequest } from '@/components/ux-v1/sign-in-sheet';

// The signed-in fan's own community state, read once per page view through
// GET /api/ux-v1/p8/viewer (their follows, blog hearts and, once the pending store
// exists, their other hearts). Guests never call it (no auth cookie = no request,
// like lib/auth/use-me). Read only.

export interface P8ViewerState {
  /** null while unknown (loading or guest). */
  signedIn: boolean | null;
  username: string | null;
  avatarUrl: string | null;
  displayName: string | null;
  mainGroup: string | null;
  following: Set<string>;
  liked: Set<string>;
  /** Mark a like / follow locally after a successful toggle. */
  setLiked: (key: string, on: boolean) => void;
  setFollowing: (username: string, on: boolean) => void;
}

const EMPTY: P8ViewerState = {
  signedIn: null, username: null, avatarUrl: null, displayName: null, mainGroup: null,
  following: new Set(), liked: new Set(), setLiked: () => {}, setFollowing: () => {},
};

const Ctx = createContext<P8ViewerState>(EMPTY);

/** Key of a heart in the viewer's liked set: "<type>:<id>" (type 'essay' for blogs). */
export function likeKey(type: string, id: string): string {
  return `${type}:${id}`;
}

function hasAuthCookie(): boolean {
  try { return /(?:^|;\s*)sb-[a-z0-9-]+-auth-token/i.test(document.cookie); } catch { return true; }
}

export function P8ViewerProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const me = useUxMe();
  const [liked, setLikedSet] = useState<Set<string>>(new Set());
  const [following, setFollowingSet] = useState<Set<string>>(new Set());
  const profile = me?.profile ?? null;
  const signedIn = me === null ? null : !!profile;

  useEffect(() => {
    if (!signedIn || !hasAuthCookie()) return;
    let off = false;
    fetch('/api/ux-v1/p8/viewer', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { following?: string[]; liked?: string[] } | null) => {
        if (off || !d) return;
        setFollowingSet(new Set(d.following ?? []));
        setLikedSet(new Set(d.liked ?? []));
      })
      .catch(() => {});
    return () => { off = true; };
  }, [signedIn]);

  const setLiked = useCallback((key: string, on: boolean) => {
    setLikedSet((s) => { const n = new Set(s); if (on) n.add(key); else n.delete(key); return n; });
  }, []);
  const setFollowing = useCallback((u: string, on: boolean) => {
    setFollowingSet((s) => { const n = new Set(s); if (on) n.add(u); else n.delete(u); return n; });
  }, []);

  const value = useMemo<P8ViewerState>(() => ({
    signedIn,
    username: profile?.username ?? null,
    avatarUrl: profile?.avatar_url ?? null,
    displayName: profile?.display_name ?? profile?.username ?? null,
    mainGroup: profile?.ult_groups?.[0] ?? null,
    following, liked, setLiked, setFollowing,
  }), [signedIn, profile, following, liked, setLiked, setFollowing]);

  return <Ctx value={value}>{children}</Ctx>;
}

export function useP8Viewer(): P8ViewerState { return useContext(Ctx); }

/**
 * Runs `act` for a signed-in fan; a guest gets the sign-in sheet (16.6) with the
 * action stored so the page can resume it after sign-in (takePendingAction).
 */
export function useRequireAuth(): (req: SignInRequest, act: () => void) => void {
  const v = useP8Viewer();
  const signIn = useSignIn();
  return useCallback((req: SignInRequest, act: () => void) => {
    if (v.signedIn) { act(); return; }
    signIn(req);
  }, [v.signedIn, signIn]);
}
