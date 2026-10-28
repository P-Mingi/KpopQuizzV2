'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { Segmented } from '@/components/ux-v1/segmented';
import { importImage, listImages, removeImage, saveFocal, uploadImage } from '@/lib/anime/entity-images-api';
import { countImages, countsLine, filterSeries, withImage } from '@/lib/anime/entity-images-rules';

import { ImageSlot } from './image-slot';

import type { FetchLike } from '@/lib/anime/entity-images-api';
import type { AdminImage, AdminSeries, EntityKind, ImageFilter } from '@/lib/anime/entity-images-rules';
import type { ImagesApi } from './image-slot';

// FandomVerse: this build's base path, inlined by Next at build time ('' on kpop and hub, so the code is today's; '/anime' on the anime build).
const BASE_PATH = process.env.__NEXT_ROUTER_BASEPATH || '';

/** The calls of the real API (part 1), over the browser's fetch and XMLHttpRequest. */
export function realApi(fetcher: FetchLike): ImagesApi {
  return {
    upload: (args, onProgress) => uploadImage(args, onProgress),
    importUrl: (args) => importImage(fetcher, args),
    focal: (args) => saveFocal(fetcher, args),
    remove: (args) => removeImage(fetcher, args),
  };
}

interface ImagesAdminProps {
  /** The list when the page already has it (a test, a preview); otherwise it is read from the API when the page opens. */
  readonly initial?: readonly AdminSeries[] | undefined;
  readonly fetcher?: FetchLike | undefined;
  readonly api?: ImagesApi | undefined;
}

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'with', label: 'With image' },
  { value: 'without', label: 'Without image' },
] as const;

/**
 * The Images tab of /admin on fandomverse.org/anime: on the left the series (search, a with/without filter and a counter), on the right the
 * series you chose, its cover slot and one portrait slot for each of its characters. Everything is a real button, link or field, in
 * reading order, so the tab key walks it top to bottom and Enter or Space does what a click does.
 */
export function ImagesAdmin({ initial, fetcher, api }: ImagesAdminProps): React.ReactElement {
  const doFetch = useMemo<FetchLike>(() => fetcher ?? ((input, init) => fetch(input, init as RequestInit | undefined)), [fetcher]);
  const calls = useMemo<ImagesApi>(() => api ?? realApi(doFetch), [api, doFetch]);
  const [list, setList] = useState<readonly AdminSeries[]>(initial ?? []);
  const [state, setState] = useState<'loading' | 'ready' | 'failed'>(initial ? 'ready' : 'loading');
  const [failure, setFailure] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<ImageFilter>('all');
  const [chosen, setChosen] = useState<string | null>(initial?.[0]?.slug ?? null);

  const load = useCallback(() => {
    setState('loading');
    void listImages(doFetch).then((r) => {
      if (r.ok) { setList(r.value); setState('ready'); setChosen((c) => c ?? r.value[0]?.slug ?? null); }
      else { setFailure(r.message); setState('failed'); }
    });
  }, [doFetch]);

  useEffect(() => { if (!initial) load(); }, [initial, load]);

  const counts = useMemo(() => countImages(list), [list]);
  const shown = useMemo(() => filterSeries(list, query, filter), [list, query, filter]);
  const current = list.find((s) => s.slug === chosen) ?? null;

  const change = useCallback((kind: EntityKind, key: string, image: AdminImage | null) => {
    setList((l) => withImage(l, kind, key, image));
  }, []);

  return (
    <div className="anime-adm-images" data-testid="images-admin">
      <p className="anime-adm-counts" aria-live="polite" data-testid="counts">{countsLine(counts)}</p>
      <div className="anime-adm-cols">
        <section className="ux-panel anime-adm-list-box" aria-labelledby="anime-adm-list-h">
          <h2 id="anime-adm-list-h" className="ux-panel-h"><span>Series</span></h2>
          <div className="anime-adm-search">
            <label htmlFor="anime-adm-q" className="anime-adm-label">Search series or characters</label>
            <input id="anime-adm-q" className="ux-inp" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Death Note, Light..." autoComplete="off" />
            <Segmented<ImageFilter> label="Filter by image" options={[...FILTERS]} value={filter} onChange={setFilter} />
          </div>
          {state === 'loading' ? <p className="anime-adm-state" role="status">Loading the series...</p> : null}
          {state === 'failed' ? (
            <div className="anime-adm-state" role="alert">
              <p>{failure}</p>
              <button type="button" className="ux-btn ux-btn-ghost ux-btn-sm" onClick={load}>Try again</button>
            </div>
          ) : null}
          {state === 'ready' ? (
            <ul className="anime-adm-series-list" aria-label="Series" data-testid="series-list">
              {shown.map((s) => {
                const chars = s.characters.filter((c) => c.image).length;
                return (
                  <li key={s.slug}>
                    <button type="button" className="anime-adm-series" aria-current={s.slug === chosen ? 'true' : undefined} onClick={() => setChosen(s.slug)} data-slug={s.slug}>
                      <span className="anime-adm-series-name">{s.name}</span>
                      <small>{s.image ? 'Cover set' : 'No cover'} · {chars}/{s.characters.length} characters</small>
                    </button>
                  </li>
                );
              })}
              {shown.length === 0 ? <li className="anime-adm-state">No series match.</li> : null}
            </ul>
          ) : null}
        </section>

        <div className="anime-adm-detail" aria-live="off">
          {current ? (
            <>
              <h2 className="anime-adm-detail-h">{current.name}</h2>
              <p className="anime-adm-hint"><a href={`${BASE_PATH}/${current.slug}-quiz`} target="_blank" rel="noopener noreferrer">Open the series page</a></p>
              <ImageSlot
                key={`series:${current.slug}`}
                kind="series"
                slug={current.slug}
                title="Cover"
                hint="Shown on the series page, on quiz cards and in rows."
                frame="cover"
                image={current.image}
                bundled={current.bundled}
                api={calls}
                onChange={(img) => change('series', current.slug, img)}
              />
              <h3 className="anime-adm-sub">Characters ({current.characters.filter((c) => c.image).length}/{current.characters.length})</h3>
              {current.characters.length === 0 ? <p className="anime-adm-hint">This series has no published characters yet.</p> : null}
              <div className="anime-adm-grid" data-testid="characters-grid">
                {current.characters.map((c) => {
                  // The slug of a listed character is already the key of the routes: `<series>/<character>`.
                  const key = c.slug;
                  return (
                    <ImageSlot
                      key={`character:${key}`}
                      kind="character"
                      slug={key}
                      title={c.name}
                      hint={c.role ? `Role: ${c.role}` : undefined}
                      frame="portrait"
                      image={c.image}
                      bundled={null}
                      api={calls}
                      onChange={(img) => change('character', key, img)}
                    />
                  );
                })}
              </div>
            </>
          ) : state === 'ready' ? (
            <p className="anime-adm-state">Choose a series on the left.</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
