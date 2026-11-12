'use client';

// Bunnyverse Cards, lane U: the Binder page, ported from the prototype v4: pages of nine pockets (a spread of two on a wide screen, one
// page on a phone), one group per run of pages and the events at the end; or the grid of 36 a page with its sort. Filters by type, rarity,
// owned, missing and favorites; search; the completion count; the star on owned cards; locked pockets with their reason; "Recycle
// extras" with its exact shard count. The view and the sort live in the URL (?view=pages|grid&sort=rarity|number|newest).
// A pocket is a link to the card page (/cards/c/BV1-0042); a locked one links to the page of its entity with ?lock=<rarity>.
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { EDITIONS, LOCK_SENTENCES, RARITIES, RARITY_NAMES } from '@/lib/cards/rules';
import { isError } from '@/lib/cards/ui-api';
import { NO_FILTERS, SORTS, countByKind, extras, filterItems, ownedCount, paginate, sortItems } from '@/lib/cards/ui-model';
import { BinderBanner } from '@/components/cards-bridge/ads-client';
import { useSignIn } from '@/components/ux-v1/sign-in-sheet';

import { CardFront, Gem, LOCK_ICON } from './card-art';
import { useCards } from './cards-provider';
import { FavStar } from './fav-star';
import { reducedMotion } from './fx';

import type { AdsContext } from '@/lib/cards/ads';
import type { Filters, SortKey } from '@/lib/cards/ui-model';
import type { BinderItem } from '@/lib/cards/ui-types';
import type { CardKind, Rarity } from '@/lib/cards/types';

const GRID_PER_PAGE = 36;
const PER_PAGE = 9;

function Pocket({ item }: { item: BinderItem }): React.ReactElement {
  const { owned, newSet, clearNew } = useCards();
  if (item.locked) {
    const why = item.reason ? LOCK_SENTENCES[item.reason] : null;
    const href = item.anchor ? `/cards/c/${item.anchor}?lock=${item.rarity}` : '/cards';
    return (
      <Link className="pocket locked" href={href} aria-label={`${item.name}, ${EDITIONS[item.rarity].name}, not issued yet${why ? `. ${why}` : ''}`}>
        <span className="miss">
          <span className="mno">{EDITIONS[item.rarity].name}</span>
          <span className="mic">{LOCK_ICON}</span>
          <span><span className="mnm">{item.name}</span><span className="med">Not issued yet</span></span>
        </span>
      </Link>
    );
  }
  const d = item.card;
  const o = owned.get(d.n);
  const ed = EDITIONS[d.rarity].name;
  if (o) {
    return (
      <div className="pw">
        <Link className="pocket" href={`/cards/c/${d.num}`} onClick={() => clearNew(d.n)} aria-label={`${d.name}, ${ed}, ${RARITY_NAMES[d.rarity]}, ${o.copies} ${o.copies > 1 ? 'copies' : 'copy'}`}>
          {newSet.has(d.n) ? <span className="newb">New</span> : null}
          {o.copies > 1 ? <span className="cnt">&times;{o.copies}</span> : null}
          <CardFront card={d} />
        </Link>
        <FavStar n={d.n} name={d.name} edition={ed} />
      </div>
    );
  }
  return (
    <Link className="pocket" href={`/cards/c/${d.num}`} aria-label={`${d.name}, ${ed}, missing`}>
      <span className="miss">
        <span className="mno">{d.num}</span>
        <span className={`mic gc-${d.rarity}`}><Gem r={d.rarity} className="" /></span>
        <span><span className="mnm">{d.name}</span><span className="med">{ed} &middot; {RARITY_NAMES[d.rarity]}</span></span>
      </span>
    </Link>
  );
}

function PageOf({ page, index, sections }: { page: ReturnType<typeof paginate>[number] | undefined; index: number; sections: Map<string, { name: string; color: string }> }): React.ReactElement {
  if (!page) {
    return (
      <div className="page2" aria-hidden="true">
        <div className="p-head"><b>&nbsp;</b><span /></div>
        <ul className="pockets">{Array.from({ length: PER_PAGE }, (_, i) => <li key={i} className="pocket-li"><span className="pocket empty" /></li>)}</ul>
      </div>
    );
  }
  const sec = sections.get(page.sec);
  return (
    <div className="page2" data-p={index}>
      <div className="p-head">
        <b>{sec ? <><i style={{ background: sec.color }} />{sec.name}{page.cont ? <> <small>continued</small></> : null}</> : 'No card matches these filters'}</b>
        <span>Page {index + 1}</span>
      </div>
      <ul className="pockets">
        {Array.from({ length: PER_PAGE }, (_, i) => (page.items[i] ? <li key={page.items[i]!.i} className="pocket-li"><Pocket item={page.items[i]!} /></li> : <li key={`e${i}`} className="pocket-li"><span className="pocket empty" /></li>))}
      </ul>
    </div>
  );
}

export function BinderView({ ads }: { ads: AdsContext }): React.ReactElement {
  const c = useCards();
  const { status, state, catalog, owned, toast } = c;
  const router = useRouter();
  const path = usePathname();
  const params = useSearchParams();
  const signIn = useSignIn();
  const view: 'pages' | 'grid' = params.get('view') === 'grid' ? 'grid' : 'pages';
  const sortParam = params.get('sort');
  const sort: SortKey = SORTS.some((s) => s.key === sortParam) ? (sortParam as SortKey) : 'rarity';
  const [f, setF] = useState<Filters>(NO_FILTERS);
  const [page, setPage] = useState(0);
  const [gpage, setGpage] = useState(0);
  const [single, setSingle] = useState(false);
  const spreadWrap = useRef<HTMLDivElement>(null);
  const spreadRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 900px)');
    const on = (): void => setSingle(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);

  const setUrl = useCallback((patch: Record<string, string | null>): void => {
    const q = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) { if (v === null) q.delete(k); else q.set(k, v); }
    const s = q.toString();
    router.replace(`${path}${s ? `?${s}` : ''}`, { scroll: false });
  }, [params, path, router]);

  const sections = useMemo(() => new Map(catalog.sections.map((s) => [s.id, { name: s.name, color: s.color }])), [catalog.sections]);
  const list = useMemo(() => filterItems(catalog.items, f, owned), [catalog.items, f, owned]);
  const pages = useMemo(() => paginate(list, PER_PAGE), [list]);
  const sorted = useMemo(() => (view === 'grid' ? sortItems(list, sort, owned) : []), [list, sort, owned, view]);
  const total = catalog.cards.length;
  const own = ownedCount(catalog.cards, owned);
  const pct = total ? Math.round((own / total) * 1000) / 10 : 0;
  const kinds = useMemo(() => countByKind(catalog.cards, owned), [catalog.cards, owned]);
  const lockedCount = catalog.items.filter((i) => i.locked).length;
  const ex = useMemo(() => extras(catalog.cards, owned), [catalog.cards, owned]);
  const pc = Math.max(1, pages.length);
  const step = single ? 1 : 2;
  const pg = Math.max(0, Math.min(single ? page : page - (page % 2), pc - 1));
  const gpc = Math.max(1, Math.ceil(list.length / GRID_PER_PAGE));
  const gp = Math.max(0, Math.min(gpage, gpc - 1));

  const refilter = (next: Filters): void => { setF(next); setPage(0); setGpage(0); };

  // Turning a page: the page on the turning side is cloned and flipped over the spread (skipped under prefers-reduced-motion).
  const turn = useCallback((dir: 1 | -1): void => {
    const np = pg + dir * step;
    if (np < 0 || np >= pc) return;
    if (reducedMotion() || !spreadRef.current || !spreadWrap.current) { setPage(np); return; }
    const pagesEls = spreadRef.current.querySelectorAll<HTMLElement>('.page2');
    const src = single ? pagesEls[0] : dir > 0 ? pagesEls[1] : pagesEls[0];
    if (!src) { setPage(np); return; }
    const wrapR = spreadWrap.current.getBoundingClientRect();
    const r = src.getBoundingClientRect();
    const cl = src.cloneNode(true) as HTMLElement;
    cl.classList.add('turner');
    cl.setAttribute('aria-hidden', 'true');
    cl.querySelectorAll('a,button').forEach((x) => x.setAttribute('tabindex', '-1'));
    Object.assign(cl.style, { left: `${r.left - wrapR.left}px`, top: `${r.top - wrapR.top}px`, width: `${r.width}px`, height: `${r.height}px`, transformOrigin: `${dir > 0 ? 'left' : 'right'} center`, margin: '0' });
    setPage(np);
    spreadWrap.current.appendChild(cl);
    requestAnimationFrame(() => requestAnimationFrame(() => { cl.style.transform = `rotateY(${dir > 0 ? -178 : 178}deg)`; cl.style.filter = 'brightness(.85)'; }));
    setTimeout(() => cl.remove(), 720);
  }, [pc, pg, single, step]);

  const gGo = (dir: 1 | -1, fromBottom = false): void => {
    const np = gp + dir;
    if (np < 0 || np >= gpc) return;
    setGpage(np);
    if (fromBottom) {
      const el = document.getElementById('g-wrap');
      if (el) window.scrollTo({ top: Math.max(0, el.getBoundingClientRect().top + window.scrollY - (innerWidth <= 760 ? 80 : 88)), behavior: reducedMotion() ? 'auto' : 'smooth' });
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
      if (e.key === 'ArrowRight') { if (view === 'grid') gGo(1); else turn(1); }
      if (e.key === 'ArrowLeft') { if (view === 'grid') gGo(-1); else turn(-1); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  });

  const goSection = (id: string): void => {
    const k = pages.findIndex((p) => p.sec === id);
    if (k < 0) { toast(`No ${sections.get(id)?.name ?? ''} card matches these filters.`); return; }
    const np = single ? k : k - (k % 2);
    if (np === pg) return;
    const dir: 1 | -1 = np > pg ? 1 : -1;
    setPage(np - dir * step);
    requestAnimationFrame(() => turn(dir));
  };

  const swipe = useRef<number | null>(null);
  const recycle = async (): Promise<void> => {
    const r = await c.recycle();
    if (isError(r)) { toast('Could not recycle. Try again.'); return; }
    toast(`Recycled ${r.recycled} extras for ${r.shards} shards. One copy of each card stays in your binder.`);
  };

  const firstSec = pages[pg]?.sec;
  const guest = status === 'guest';
  const kindBtns: [Filters['kind'], string][] = [['all', 'All'], ['idol', 'Idols'], ['group', 'Groups'], ['event', 'Events']];
  const showBtns: [Filters['show'], string][] = [['all', 'All'], ['owned', 'Owned'], ['missing', 'Missing'], ['fav', 'Favorites']];
  const Pager = ({ id, bottom }: { id: string; bottom?: boolean }): React.ReactElement => (
    <nav className={`pager${bottom ? ' bot' : ''}`} id={id} aria-label={bottom ? 'Grid pages, bottom' : 'Grid pages'}>
      <button type="button" className="btn-quiet" onClick={() => gGo(-1, !!bottom)} disabled={gp <= 0}><span aria-hidden="true">&larr;</span> Previous</button>
      <span className="pg" aria-live={bottom ? undefined : 'polite'}>Page {gp + 1} / {gpc}</span>
      <button type="button" className="btn-quiet" onClick={() => gGo(1, !!bottom)} disabled={gp >= gpc - 1}>Next <span aria-hidden="true">&rarr;</span></button>
    </nav>
  );

  return (
    <div className="wrap page">
      <div className="b-head">
        <div><h1 className="h1" id="t-binder">Binder</h1><p className="lede" style={{ marginTop: 6 }}>Set 1. Tap any card to see it in full.</p></div>
        <div className="b-progress">
          <div className="lbl"><span><b className="num">{own}</b> of <b className="num">{total}</b> cards</span><span className="num">{pct}%</span></div>
          <span className="bar"><i style={{ width: `${pct}%` }} /></span>
          <div className="b-kinds">
            {(['idol', 'group', 'event'] as CardKind[]).filter((k) => kinds[k].all > 0).map((k) => `${({ idol: 'Idols', group: 'Groups', event: 'Events' })[k]} ${kinds[k].own}/${kinds[k].all}`).join(' · ')}
            {lockedCount ? ` · ${lockedCount} editions not issued yet` : ''}
          </div>
        </div>
      </div>
      {guest ? (
        <p className="b-note">You are not signed in, so every pocket is empty. <button type="button" className="btn-outline sm" onClick={() => signIn({ title: 'Sign in to see your binder', sub: 'Your collection lives with your account.' })}>Sign in</button></p>
      ) : null}

      <div className="b-tools">
        <div className="seg" role="group" aria-label="View">
          <button type="button" aria-pressed={view === 'pages'} onClick={() => setUrl({ view: null })}>Binder</button>
          <button type="button" aria-pressed={view === 'grid'} onClick={() => setUrl({ view: 'grid' })}>Grid</button>
        </div>
        <label className="search">
          <svg className="ico" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
          <input type="search" placeholder="Search an idol, group or event" aria-label="Search cards" value={f.q} onChange={(e) => refilter({ ...f, q: e.target.value })} />
        </label>
        <div className="b-actions">
          <button type="button" className="btn-outline" onClick={() => void recycle()} disabled={!ex.n || !state}>{ex.n ? `Recycle ${ex.n} extras (+${ex.shards} shards)` : 'No extras to recycle'}</button>
        </div>
        <span className="brk" aria-hidden="true" />
        <div className="fgroup" role="group" aria-label="Type">
          {kindBtns.filter(([v]) => v === 'all' || kinds[v].all > 0).map(([v, t]) => <button key={v} type="button" className="fpill" aria-pressed={f.kind === v} onClick={() => refilter({ ...f, kind: v })}>{t}</button>)}
        </div>
        <span className="fdiv" aria-hidden="true" />
        <div className="fgroup" role="group" aria-label="Rarity">
          {RARITIES.map((r: Rarity) => (
            <button key={r} type="button" className="fpill gemonly" aria-pressed={!!f.rar[r]} title={RARITY_NAMES[r]} aria-label={RARITY_NAMES[r]} onClick={() => refilter({ ...f, rar: { ...f.rar, [r]: !f.rar[r] } })}>
              <Gem r={r} className={`gem gc-${r}`} />
            </button>
          ))}
        </div>
        <span className="fdiv" aria-hidden="true" />
        <div className="fgroup" role="group" aria-label="Show">
          {showBtns.map(([v, t]) => <button key={v} type="button" className="fpill" aria-pressed={f.show === v} onClick={() => refilter({ ...f, show: v })}>{t}</button>)}
        </div>
      </div>

      {view === 'grid' ? (
        <div className="g-wrap" id="g-wrap">
          <div className="g-head">
            <div className="g-sort" role="group" aria-label="Sort">
              <span className="lbl" aria-hidden="true">Sort</span>
              {SORTS.map((s) => <button key={s.key} type="button" className="fpill" aria-pressed={sort === s.key} title={s.hint} onClick={() => { setGpage(0); setUrl({ sort: s.key === 'rarity' ? null : s.key, view: 'grid' }); }}>{s.label}</button>)}
            </div>
            <Pager id="pg-top" />
          </div>
          <ul className="grid" id="grid">
            {sorted.length ? sorted.slice(gp * GRID_PER_PAGE, gp * GRID_PER_PAGE + GRID_PER_PAGE).map((it) => <li key={it.i} className="pocket-li"><Pocket item={it} /></li>) : <li className="g-empty">No card matches these filters.</li>}
          </ul>
          <Pager id="pg-bot" bottom />
          <BinderBanner ctx={ads} />
        </div>
      ) : (
        <div className="b-body" id="b-body">
          <div>
            <div
              className="spread-wrap" ref={spreadWrap}
              onPointerDown={(e) => { if (e.pointerType !== 'mouse') swipe.current = e.clientX; }}
              onPointerUp={(e) => { if (swipe.current === null) return; const dx = e.clientX - swipe.current; swipe.current = null; if (Math.abs(dx) > 60) turn(dx < 0 ? 1 : -1); }}
            >
              <div className={`spread${single ? ' single' : ''}`} ref={spreadRef} id="spread">
                <PageOf page={pages[pg]} index={pg} sections={sections} />
                {single ? null : <PageOf page={pages[pg + 1]} index={pg + 1} sections={sections} />}
                {single ? null : <div className="spine" aria-hidden="true"><i /><i /><i /></div>}
              </div>
            </div>
            <div className="b-nav">
              <button type="button" className="btn-quiet" aria-label="Previous pages" onClick={() => turn(-1)} disabled={pg <= 0}><svg className="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg></button>
              <span className="pg" aria-live="polite">{single ? `Page ${pg + 1} of ${pc}` : `Pages ${pg + 1}–${Math.min(pc, pg + 2)} of ${pc}`}</span>
              <button type="button" className="btn-quiet" aria-label="Next pages" onClick={() => turn(1)} disabled={pg + step >= pc}><svg className="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg></button>
            </div>
            <BinderBanner ctx={ads} />
          </div>
          <nav className="idx" id="idx" aria-label="Binder sections">
            {catalog.sections.map((s) => {
              const o = s.ns.filter((n) => owned.has(n)).length;
              return (
                <button key={s.id} type="button" data-sec={s.id} style={{ '--t': s.color } as React.CSSProperties} aria-current={firstSec === s.id ? 'true' : 'false'} onClick={() => goSection(s.id)}>
                  <i /><span>{s.name}</span><small>{o}/{s.ns.length}</small>
                </button>
              );
            })}
          </nav>
        </div>
      )}
    </div>
  );
}
