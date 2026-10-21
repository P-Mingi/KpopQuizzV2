'use client';

// Run O1, lot (b), lane P1: the pieces of /settings that differ on a world site (rule 18: components/profile/ux-v1/settings.tsx
// renders them in place of its kpop sections when it gets a `world` prop; kpop never reaches this file). The series the member
// follows with "watching since", the oshi tag (a character of the main series, never one above the reader's spoiler progress),
// and the account rows (the network passport, sign out here, sign out everywhere).

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { OshiTag } from '@/components/passport-ui/oshi-tag';
import { useSpoilerProgress } from '@/components/spoilers/use-spoiler-progress';
import { Icon } from '@/components/ux-v1/icon';
import { canPickOshi } from '@/lib/passport-ui/oshi';
import { fmt } from '@/lib/passport-ui/fmt';

import type { OshiCharacter } from '@/lib/passport-ui/oshi';
import type { SettingsWorld } from '@/lib/passport-ui/settings-world';
import type { SpoilerProgress } from '@/lib/anime/types';

// ---------------------------------------------------------------------------------------------------------------
// Your series, watching since
// ---------------------------------------------------------------------------------------------------------------

export function WorldSeriesSection({ world, picked, names, onAdd, onRemove, since, onSince }: {
  world: SettingsWorld;
  picked: readonly string[];
  names: ReadonlyMap<string, string>;
  onAdd: () => void;
  onRemove: (slug: string) => void;
  since: string;
  onSince: (year: string) => void;
}): React.ReactElement {
  const w = world.words;
  const year = new Date().getFullYear();
  return (
    <section className="ux-sec" aria-labelledby="p10-s-fandom">
      <h2 className="ux-h2" id="p10-s-fandom">{w.anime}</h2>
      <p className="p10-lead">{w.animeLead}</p>
      <div className="ux-chips p10-fandom" role="group" aria-label={w.yourSeries}>
        {picked.map((slug, i) => {
          const name = names.get(slug) ?? slug;
          return (
            <span key={slug} className="p10-gchip">
              <span className="ux-gav" aria-hidden="true">{name.slice(0, 1)}</span>
              {name}{i === 0 ? ` · ${w.mainTag}` : ''}
              <button type="button" className="p10-gchip-x" aria-label={`Remove ${name}`} onClick={() => onRemove(slug)}><Icon name="x" size="sm" /></button>
            </span>
          );
        })}
        {picked.length < world.seriesMax ? (
          <button type="button" className="ux-chip" onClick={onAdd} aria-haspopup="dialog"><Icon name="plus" size="sm" />{w.addSeries}</button>
        ) : null}
      </div>
      <p className="ux-help">{fmt(w.seriesHelp, { max: world.seriesMax })}</p>
      <div className="ux-field">
        <label htmlFor="p10-s-stan">{w.watchingSince} <small>Optional</small></label>
        <select className="ux-inp p10-select" id="p10-s-stan" value={since} onChange={(e) => onSince(e.target.value)}>
          <option value="">Not set</option>
          {Array.from({ length: year - 1960 }, (_, k) => year - k).map((y) => <option key={y} value={String(y)}>{y}</option>)}
        </select>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// Oshi
// ---------------------------------------------------------------------------------------------------------------

export interface OshiPick {
  readonly groupId: number;
  /** A character the progress reached, or null to clear the series' oshi. */
  readonly character: OshiCharacter | null;
  readonly progress: SpoilerProgress;
}

/** Characters of a series for the oshi chips (public table, published rows only). */
function useCharacters(groupId: number | null): OshiCharacter[] {
  const [rows, setRows] = useState<OshiCharacter[]>([]);
  useEffect(() => {
    if (groupId === null) { setRows([]); return; }
    let live = true;
    void (async () => {
      try {
        const { createBrowserClient } = await import('@/lib/supabase/client');
        const { data } = await createBrowserClient().from('characters').select('id, slug, name, spoiler_level').eq('group_id', groupId).order('ord', { ascending: true }).limit(60);
        if (live) setRows(((data ?? []) as OshiCharacter[]).filter((c) => typeof c.id === 'number'));
      } catch { if (live) setRows([]); }
    })();
    return () => { live = false; };
  }, [groupId]);
  return rows;
}

/**
 * The oshi tag of the main series: one chip per character the reader has reached, one locked chip (no name) for each
 * character above their progress, a field for a tag of their own. Picking a locked chip is refused with the series'
 * message and changes nothing. The chosen name is the tag; `onPick` carries the character so the save can write
 * `favourite_characters` too.
 */
export function OshiPicker({ world, series, value, onTag, onPick }: {
  world: SettingsWorld;
  series: { id: number; slug: string; name: string } | null;
  value: string;
  onTag: (text: string) => void;
  onPick: (pick: OshiPick) => void;
}): React.ReactElement {
  const w = world.words;
  const [custom, setCustom] = useState('');
  const [refused, setRefused] = useState<string | null>(null);
  const chars = useCharacters(series?.id ?? null);
  const progressState = useSpoilerProgress(series?.slug ?? '-', series?.id ?? 0, true);
  const progress = progressState.progress;

  if (!series) return <p className="ux-help">{fmt(w.oshiNeedSeries, { member: 'character' })}</p>;

  const open = chars.filter((c) => canPickOshi(c, progress));
  const locked = chars.length - open.length;
  const choose = (c: OshiCharacter): void => {
    setRefused(null);
    onTag(c.name.slice(0, 40));
    onPick({ groupId: series.id, character: c, progress });
  };
  const clear = (): void => { setRefused(null); onTag(''); onPick({ groupId: series.id, character: null, progress }); };

  return (
    <>
      {value ? <p className="ux-help" aria-live="polite"><OshiTag name={value} /></p> : null}
      <div className="p10-flair-row" role="radiogroup" aria-label={w.oshiPick}>
        {open.map((c) => (
          <button key={c.id} type="button" role="radio" aria-checked={value === c.name} className="p10-fopt" onClick={() => choose(c)}>
            <Icon name={world.pickIcon} size="sm" />{c.name}
          </button>
        ))}
        {Array.from({ length: locked }, (_, i) => (
          <button key={`locked-${i}`} type="button" role="radio" aria-checked={false} aria-disabled="true" className="p10-fopt anime-locked-oshi" title={fmt(w.oshiLocked, { name: series.name })} onClick={() => setRefused(fmt(w.oshiRefused, { name: series.name }))}>
            ?
          </button>
        ))}
        <button type="button" role="radio" aria-checked={!value} className="p10-fopt" onClick={clear}>{w.oshiNone}</button>
      </div>
      {refused ? <p className="ux-err" role="alert">{refused}</p> : null}
      <form className="ux-urlrow" onSubmit={(e) => {
        e.preventDefault();
        const v = custom.trim().slice(0, 40);
        if (!v) { document.getElementById('p10-s-bias')?.focus(); return; }
        setRefused(null);
        onTag(v);
        onPick({ groupId: series.id, character: null, progress });
        setCustom('');
      }}>
        <label className="ux-sr" htmlFor="p10-s-bias">{w.oshiCustom}</label>
        <input className="ux-inp" id="p10-s-bias" maxLength={40} placeholder={w.oshiCustom} value={custom} onChange={(e) => setCustom(e.target.value)} />
        <button type="submit" className="ux-btn ux-btn-ghost">Use</button>
      </form>
    </>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// Account rows
// ---------------------------------------------------------------------------------------------------------------

/** The network passport, then "sign out of this site only" and "sign out everywhere" (the registry's signOutModes). */
export function WorldAccountRows({ world, onSignOut }: { world: SettingsWorld; onSignOut: (scope: 'local' | 'global') => void }): React.ReactElement {
  const w = world.words;
  return (
    <>
      <div className="p10-srow">
        <span className="p10-srow-g"><b>{w.passportRow}</b><small>{w.passportSub}</small></span>
        <Link className="ux-btn ux-btn-ghost ux-btn-sm" href={world.passportHref} prefetch={false}>{w.passportRow}</Link>
      </div>
      {world.signOutModes.includes('local') ? (
        <div className="p10-srow">
          <span className="p10-srow-g"><b>{w.signOutHere}</b><small>{w.signOutHereSub}</small></span>
          <button type="button" className="ux-btn ux-btn-ghost ux-btn-sm" onClick={() => onSignOut('local')}>{w.signOutHere}</button>
        </div>
      ) : null}
      {world.signOutModes.includes('global') ? (
        <div className="p10-srow">
          <span className="p10-srow-g"><b>{w.signOutEverywhere}</b><small>{w.signOutEverywhereSub}</small></span>
          <button type="button" className="ux-btn ux-btn-ghost ux-btn-sm" onClick={() => onSignOut('global')}>{w.signOutEverywhere}</button>
        </div>
      ) : null}
    </>
  );
}
