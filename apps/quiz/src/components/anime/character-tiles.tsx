'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import { MemberTiles } from '@/components/group/ux-v1/member-tiles';
import { useSpoilerProgress } from '@/components/spoilers/use-spoiler-progress';
import { Icon } from '@/components/ux-v1/icon';
import { SectionHeader } from '@/components/ux-v1/section-header';
import { t, tPlural } from '@/lib/anime/copy';
import { characterImageSlug, ownerPictureOf } from '@/lib/anime/entity-images-rules';
import { MIN_OSHI_PICKS } from '@/lib/anime/types';

import type { MemberTile } from '@/components/group/ux-v1/member-tiles';
import type { EntityImage, OwnerPicture } from '@/lib/anime/entity-images-rules';
import type { CharacterTileData } from '@/lib/anime/series-model';
import type { CharacterRole } from '@/lib/anime/types';

interface CharacterTilesProps {
  readonly seriesSlug: string;
  readonly groupId: number;
  readonly name: string;
  /** The characters with no spoiler (spoiler_level 0): what the cached HTML carries. */
  readonly open: readonly CharacterTileData[];
  /** How many more exist; the page knows their number, never their names. */
  readonly lockedCount: number;
}

/** Monogram of a character: the first letters of the first two words (never an image). */
export function characterMonogram(name: string): string {
  const words = name.replace(/[^A-Za-z0-9 ]/g, ' ').trim().split(/\s+/).filter(Boolean);
  const out = words.length > 1 ? `${words[0]!.charAt(0)}${words[1]!.charAt(0)}` : (words[0] ?? name).slice(0, 2);
  return out.toUpperCase();
}

const ROLE_LABEL: Record<CharacterRole, string> = {
  main: t('hub.role.main'), supporting: t('hub.role.supporting'), antagonist: t('hub.role.antagonist'), other: t('hub.role.other'),
};

/** The oshi of the signed-in reader on this series: read once, written through RLS (favourite_characters, one row per series). */
function useOshi(groupId: number, signedIn: boolean): { pick: number | null; set(id: number | null): Promise<void> } {
  const [pick, setPick] = useState<number | null>(null);
  useEffect(() => {
    if (!signedIn) { setPick(null); return; }
    let live = true;
    void (async () => {
      try {
        const { createBrowserClient } = await import('@/lib/supabase/client');
        const { data } = await createBrowserClient().from('favourite_characters').select('character_id').eq('group_id', groupId).maybeSingle();
        if (live && data) setPick((data as { character_id: number }).character_id);
      } catch { /* the star simply starts empty */ }
    })();
    return () => { live = false; };
  }, [groupId, signedIn]);
  const set = useCallback(async (id: number | null): Promise<void> => {
    const before = pick;
    setPick(id);
    try {
      const { createBrowserClient } = await import('@/lib/supabase/client');
      const db = createBrowserClient();
      const { data: auth } = await db.auth.getUser();
      if (!auth.user) throw new Error('signed out');
      const { error } = id === null
        ? await db.from('favourite_characters').delete().eq('group_id', groupId).eq('user_id', auth.user.id)
        : await db.from('favourite_characters').upsert({ user_id: auth.user.id, group_id: groupId, character_id: id }, { onConflict: 'user_id,group_id' });
      if (error) throw error;
    } catch {
      setPick(before);
    }
  }, [groupId, pick]);
  return { pick, set };
}

/** Characters the reader's progress unlocks, read from the public table (RLS: published rows only). */
function useRevealed(seriesSlug: string, groupId: number, arc: number, ready: boolean, lockedCount: number): CharacterTileData[] {
  const [revealed, setRevealed] = useState<CharacterTileData[]>([]);
  useEffect(() => {
    if (!ready || lockedCount === 0 || arc <= 0) { setRevealed([]); return; }
    let live = true;
    void (async () => {
      try {
        const { createBrowserClient } = await import('@/lib/supabase/client');
        const { data } = await createBrowserClient().from('characters').select('id, slug, name, role')
          .eq('group_id', groupId).gt('spoiler_level', 0).lte('spoiler_level', arc).order('ord', { ascending: true });
        if (!live || !Array.isArray(data)) return;
        const rows = data as Array<Pick<CharacterTileData, 'id' | 'slug' | 'name' | 'role'>>;
        // The owner's portraits of the characters this reader has just unlocked, from the public table (anon may select the display columns).
        const pics: Record<string, OwnerPicture> = {};
        try {
          const keys = rows.map((c) => characterImageSlug(seriesSlug, c.slug));
          if (keys.length > 0) {
            const { data: imgs } = await createBrowserClient().from('entity_images')
              .select('kind, slug, path, width, height, focal_x, focal_y, source_url, author, license, license_note, updated_at')
              .eq('site_id', 'anime').eq('kind', 'character').in('slug', keys);
            for (const i of (Array.isArray(imgs) ? imgs : []) as EntityImage[]) pics[i.slug.slice(seriesSlug.length + 1)] = ownerPictureOf(i);
          }
        } catch { /* the tiles keep their monograms */ }
        if (live) setRevealed(rows.map((c) => ({ ...c, picks: null, ...(pics[c.slug] ? { image: pics[c.slug]! } : {}) })));
      } catch { /* the tiles stay locked */ }
    })();
    return () => { live = false; };
  }, [seriesSlug, groupId, arc, ready, lockedCount]);
  return revealed;
}

/** The owner's portrait of a character, laid over the face of its tile (the monogram stays under it for as long as the picture loads). The name is printed under it, so the picture is decorative. */
function Portrait({ picture }: { readonly picture: OwnerPicture }): React.ReactElement {
  return (
    <span className="anime-adm-portrait" data-testid="character-portrait">
      <Image src={picture.src} alt="" width={80} height={80} sizes="80px" className="anime-adm-portrait-img" style={{ objectPosition: picture.position }} />
    </span>
  );
}

/** The credit line of a portrait under CC BY or CC BY-SA (the others are credited on /credits). */
function PortraitCredit({ credit }: { readonly credit: NonNullable<OwnerPicture['credit']> }): React.ReactElement {
  return (
    <small className="anime-adm-credit" data-testid="portrait-credit">
      <a href={credit.sourceUrl} rel="noopener noreferrer" target="_blank">Photo: {credit.author}</a>
      {', '}
      <a href={credit.licenseUrl} rel="noopener noreferrer" target="_blank">{credit.license}</a>
    </small>
  );
}

/**
 * A3, the characters row: monogram tiles with a role shape (never an image), the oshi star, the number of picks from 30,
 * and a locked tile, without a name, for each character above the reader's progress. The server renders the spoiler-free
 * view; once the progress is known the tiles it unlocks are read from the public `characters` table. It reuses the
 * members row of the group hub (MemberTiles).
 */
export function CharacterTiles({ seriesSlug, groupId, name, open, lockedCount }: CharacterTilesProps): React.ReactElement | null {
  const { progress, ready, signedIn } = useSpoilerProgress(seriesSlug, groupId);
  const oshi = useOshi(groupId, signedIn);
  const revealed = useRevealed(seriesSlug, groupId, progress.arc, ready, lockedCount);
  if (open.length === 0 && lockedCount === 0) return null;
  const visible = [...open, ...revealed.filter((r) => !open.some((o) => o.id === r.id))];
  const locked = Math.max(0, lockedCount - revealed.length);
  const label = t('hub.characters');

  const star = (c: CharacterTileData): React.ReactNode => {
    const mine = oshi.pick === c.id;
    const text = mine ? t('oshi.remove') : t('oshi.button', { name: c.name });
    return signedIn ? (
      <button type="button" className={mine ? 'anime-o2-star anime-o2-star-on' : 'anime-o2-star'} aria-pressed={mine} aria-label={text} title={text} onClick={() => { void oshi.set(mine ? null : c.id); }}>
        <Icon name="star" size="sm" />
      </button>
    ) : (
      <Link href="/login" className="anime-o2-star" aria-label={t('oshi.signIn')} title={t('oshi.signIn')} prefetch={false}>
        <Icon name="star" size="sm" />
      </Link>
    );
  };

  const tiles: MemberTile[] = visible.map((c) => ({
    key: c.slug,
    name: c.name,
    monogram: characterMonogram(c.name),
    className: 'anime-o2-tile',
    faceClass: `anime-o2-role-${c.role}`,
    lead: (
      <>
        {c.image ? <Portrait picture={c.image} /> : null}
        {star(c)}
      </>
    ),
    note: (
      <>
        <small className="anime-o2-role">{ROLE_LABEL[c.role]}</small>
        {c.image?.credit ? <PortraitCredit credit={c.image.credit} /> : null}
        {c.picks !== null && c.picks >= MIN_OSHI_PICKS ? <small className="anime-o2-picks">{t('oshi.count', { count: c.picks.toLocaleString('en-US'), name: c.name })}</small> : null}
      </>
    ),
  }));
  for (let i = 0; i < locked; i++) {
    tiles.push({ key: `locked-${i}`, name: t('hub.locked'), monogram: '?', className: 'anime-o2-tile anime-o2-tile-locked', faceClass: 'anime-o2-role-locked' });
  }

  return (
    <section className="ux-sec anime-o2-characters" aria-labelledby="anime-o2-characters-h" data-testid="characters">
      <SectionHeader id="anime-o2-characters-h" title={label} icon="users" sub={locked > 0 ? tPlural('hub.lockedMore', locked) : undefined} />
      <MemberTiles label={label} groupName={name} tiles={tiles} />
    </section>
  );
}
