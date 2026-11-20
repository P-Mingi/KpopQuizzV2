'use client';

// KpopCards: the Collection (v6 prototype #collection): all groups, or one group (/kpopcards/collection/<group>). Pages of nine pockets (a spread of two on a wide screen, one
// page on a phone), one group per run of pages and the events at the end; or the grid of 36 a page with its sort. Filters by type, rarity,
// owned, missing and favorites; search; the completion count; the star on owned cards; locked pockets with their reason; "Recycle
// extras" with its exact shard count. The view and the sort live in the URL (?view=pages|grid&sort=rarity|number|newest).
// A pocket is a link to the card page (/kpopcards/c/BV1-0042); a locked one links to the page of its entity with ?lock=<rarity>. A finished group page says
// Complete. On a phone the filters open in a panel from the bottom (the Filters button), and the active filters show as chips under the tools.
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { kcPath } from '@/lib/cards/kc-paths';
import { LOCK_SENTENCES, RARITIES, RARITY_LABEL } from '@/lib/cards/rules';
import { isError } from '@/lib/cards/ui-api';
import { isApiError } from '@/lib/kpopcards/contract';
import { NO_FILTERS, PANO_SECTION, SORTS, countByKind, countedCards, extras, filterItems, filterPanos, gridCells, gridPages, ownedCount, pageWords, paginate, panoCount, partLabel, partWord, sortItems } from '@/lib/cards/ui-model';
import { BinderBanner } from '@/components/cards-bridge/ads-client';
import { useSignIn } from '@/components/ux-v1/sign-in-sheet';

import { CardFront, Gem, Ico, LOCK_ICON } from './card-art';
import { useCards } from './cards-provider';
import { PocketFoot } from './fav-star';
import { PanoOpenContext, PanoPocket, PanoSheet } from './pano-pocket';
import { WishHeart } from './wish-toggle';
import { reducedMotion } from './fx';
import { flyReward } from './reward-fly';

import type { AdsContext } from '@/lib/cards/ads';
import type { Filters, SortKey } from '@/lib/cards/ui-model';
import type { BinderItem, SlimPano } from '@/lib/cards/ui-types';
import type { CardKind, Rarity } from '@/lib/cards/types';

const GRID_PER_PAGE = 36;
const PER_PAGE = 9;

/** A card's address with the binder's own query kept (view, sort, filters), so the sheet opens over the same binder and closing comes back to it. */
function cardHref(num: string, sp: URLSearchParams, lock?: string): string {
  const q = new URLSearchParams(sp.toString());
  q.delete('lock');
  if (lock) q.set('lock', lock);
  const s = q.toString();
  return `${kcPath.card(num)}${s ? `?${s}` : ''}`;
}

/** Lot 6: the pocket of an age-locked subject: its name and "Card coming". No date, no link, no number, no star, no heart, no "new" mark. */
export function SoonPocket({ name }: { name: string }): React.ReactElement {
  return (
    <div className="pw">
      <div className="pocket locked soon" role="img" aria-label={`${name}, Card coming`}>
        <span className="miss">
          <span className="mno" aria-hidden="true">&nbsp;</span>
          <span className="mic" aria-hidden="true">{LOCK_ICON}</span>
          <span><span className="mnm">{name}</span><span className="med">Card coming</span></span>
        </span>
      </div>
      <div className="pw-foot" />
    </div>
  );
}

function Pocket({ item }: { item: BinderItem }): React.ReactElement {
  const { owned, newSet, clearNew } = useCards();
  const sp = useSearchParams();
  if (item.locked && item.soon) return <SoonPocket name={item.name} />;
  if (item.locked) {
    const why = item.reason ? LOCK_SENTENCES[item.reason] : null;
    const href = item.anchor ? cardHref(item.anchor, sp, item.rarity) : kcPath.collection;
    // The 30 px band under a locked pocket is empty, so the rows line up with the cards around it.
    return (
      <div className="pw">
        <Link className="pocket locked" href={href} aria-label={`${item.name}, ${RARITY_LABEL[item.rarity]}, not issued yet${why ? `. ${why}` : ''}`}>
          <span className="miss">
            <span className="mno">{RARITY_LABEL[item.rarity]}</span>
            <span className="mic">{LOCK_ICON}</span>
            <span><span className="mnm">{item.name}</span><span className="med">Not issued yet</span></span>
          </span>
        </Link>
        <div className="pw-foot" />
      </div>
    );
  }
  const d = item.card;
  const o = owned.get(d.n);
  const ed = RARITY_LABEL[d.rarity];
  const half = partWord(d) ? `, ${partWord(d)} of the group photo` : '';
  if (o) {
    return (
      <div className="pw">
        <Link className="pocket" href={cardHref(d.num, sp)} onClick={() => clearNew(d.n)} aria-label={`${d.name}${half}, ${ed}, ${o.copies} ${o.copies > 1 ? 'copies' : 'copy'}${newSet.has(d.n) ? ', new' : ''}`}>
          <CardFront card={d} />
        </Link>
        <PocketFoot n={d.n} name={d.name} edition={ed} isNew={newSet.has(d.n)} copies={o.copies} />
      </div>
    );
  }
  // A missing card has the same 30 px band under it as an owned one, so the rows line up. Its slot holds the wishlist heart (lot 4 A1:
  // a heart under the missing cards; WishHeart draws nothing for a signed-out visitor).
  return (
    <div className="pw">
      <Link className="pocket" href={cardHref(d.num, sp)} aria-label={`${d.name}${half}, ${ed}, missing`}>
        <span className="miss">
          <span className="mno">{d.num}</span>
          <span className={`mic gc-${d.rarity}`}><Gem r={d.rarity} className="" /></span>
          <span><span className="mnm">{d.name}</span><span className="med">{ed}{d.part ? <> &middot; {partLabel(d)}</> : null}</span></span>
        </span>
      </Link>
      <PocketFoot n={d.n} name={d.name} edition={ed} slot={<WishHeart n={d.n} name={d.name} edition={ed} />} />
    </div>
  );
}

/** The pockets of a run of cells, in reading order (a pair's halves sit side by side, each in its own pocket as the prototype draws them). A null cell is an empty pocket. */
function Cells({ cells, hung = [] }: { cells: readonly (BinderItem | null)[]; /** Lot 7: the panoramas of the page, each drawn in a row of its own before the cell at `at`. */ hung?: readonly { at: number; pano: SlimPano }[] }): React.ReactElement {
  const at = (k: number): React.ReactNode => hung.filter((h) => h.at === k).map((h) => <PanoPocket key={`p${h.pano.p}`} pano={h.pano} />);
  return (
    <>
      {cells.map((a, k) => (
        <Fragment key={a ? a.i : `e${k}`}>
          {at(k)}
          {a ? <Pocket item={a} /> : <div className="pw"><span className="pocket empty" /><div className="pw-foot" /></div>}
        </Fragment>
      ))}
      {at(cells.length)}
    </>
  );
}

type Show = Filters['show'] | 'want';
const EMPTY = (k: string | number): React.ReactElement => <div key={k} className="pw"><span className="pocket empty" /><div className="pw-foot" /></div>;

function PageOf({ page, index, sections, done }: { page: ReturnType<typeof paginate>[number] | undefined; index: number; sections: Map<string, { name: string; color: string }>; done: boolean }): React.ReactElement {
  if (!page) {
    return (
      <div className="page2" aria-hidden="true">
        <div className="p-head"><b>&nbsp;</b><span /></div>
        <div className="pockets">{Array.from({ length: PER_PAGE }, (_, i) => EMPTY(i))}</div>
      </div>
    );
  }
  const sec = sections.get(page.sec);
  return (
    <div className={`page2${done ? ' done' : ''}`} data-p={index}>
      <div className="p-head">
        <b>{sec ? <><i style={{ background: sec.color }} />{sec.name}{page.cont ? <> <small>continued</small></> : null}{done ? <span className="p-done"><Ico name="check" />Complete</span> : null}</> : 'No card matches these filters'}</b>
        <span>Page {index + 1}</span>
      </div>
      <div className="pockets">
        <Cells cells={page.cells} hung={page.hung} />
        {Array.from({ length: Math.max(0, PER_PAGE - page.used) }, (_, i) => EMPTY(`f${i}`))}
      </div>
    </div>
  );
}

export function BinderView({ ads, only = null }: { ads: AdsContext; /** One group: its section id (a group's slug); null: every group. */ only?: string | null }): React.ReactElement {
  const c = useCards();
  const { status, state, catalog, owned, toast, panoOwned } = c;
  const router = useRouter();
  const path = usePathname();
  const params = useSearchParams();
  const signIn = useSignIn();
  const view: 'pages' | 'grid' = params.get('view') === 'grid' ? 'grid' : 'pages';
  const sortParam = params.get('sort');
  const sort: SortKey = SORTS.some((s) => s.key === sortParam) ? (sortParam as SortKey) : 'rarity';
  const [f, setF] = useState<Filters>(NO_FILTERS);
  // Lot 3 A17: only the cards of the wishlist (a value of "Show", on top of the other filters).
  const [show, setShow] = useState<Show>('all');
  const [panel, setPanel] = useState(false);
  const [viewPano, setViewPano] = useState<SlimPano | null>(null);
  const [page, setPage] = useState(0);
  const [gpage, setGpage] = useState(0);
  const [single, setSingle] = useState(false);
  const spreadWrap = useRef<HTMLDivElement>(null);
  const spreadRef = useRef<HTMLDivElement>(null);
  const fbtn = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 900px)');
    const on = (): void => setSingle(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  // The phone panel closes by itself when the screen grows past a phone (the prototype's resize rule).
  useEffect(() => {
    const on = (): void => { if (window.innerWidth > 760) setPanel(false); };
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);

  const setUrl = useCallback((patch: Record<string, string | null>): void => {
    const q = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) { if (v === null) q.delete(k); else q.set(k, v); }
    const s = q.toString();
    router.replace(`${path}${s ? `?${s}` : ''}`, { scroll: false });
  }, [params, path, router]);

  const sections = useMemo(() => new Map(catalog.sections.map((s) => [s.id, { name: s.name, color: s.color }])), [catalog.sections]);
  const sec = only ? catalog.sections.find((s) => s.id === only) ?? null : null;
  const wishSet = useMemo(() => new Set(state?.wishlist ?? []), [state?.wishlist]);
  const scoped = useMemo(() => (only ? catalog.items.filter((i) => i.sec === only) : catalog.items), [catalog.items, only]);
  // Owner decision 2026-11-18: his cards that are out of packs are in his collection, so they are in every count of the head.
  const counted = useMemo(() => countedCards(catalog, owned), [catalog, owned]);
  const scopedCards = useMemo(() => (only ? counted.filter((cd) => (sec?.ns ?? []).includes(cd.n)) : counted), [counted, only, sec]);
  const list = useMemo(() => {
    const l = filterItems(scoped, { ...f, show: show === 'want' ? 'all' : show }, owned);
    return show === 'want' ? l.filter((i) => !i.locked && wishSet.has(i.card.n)) : l;
  }, [scoped, f, show, owned, wishSet]);
  // Lot 7: the Panoramas section (its own page, /collection/panoramas, and the last pages of the whole binder). A panorama is never in the card list: the
  // ones that hang under their parts ride with the last part, the section lists them all, one a row, under the same filters.
  const isPano = only === PANO_SECTION;
  const panoShow = useMemo(() => (only === null || isPano ? filterPanos(catalog.panos, { ...f, show: show === 'want' ? 'fav' : show }, panoOwned) : []), [catalog.panos, f, show, only, isPano, panoOwned]);
  const pages = useMemo(() => paginate(list, PER_PAGE, 3, panoShow), [list, panoShow]);
  const gridList = useMemo(() => (view === 'grid' ? gridPages(sortItems(list, sort, owned), GRID_PER_PAGE) : []), [list, sort, owned, view]);
  const pc0 = useMemo(() => panoCount(catalog.panos, panoOwned), [catalog.panos, panoOwned]);
  const total = scopedCards.length;
  const own = ownedCount(scopedCards, owned);
  // The head of the page counts the panoramas on the Panoramas page, and the cards everywhere else (a panorama is never in the cards' count).
  const headTotal = isPano ? pc0.total : total;
  const headOwn = isPano ? pc0.own : own;
  const pct = headTotal ? Math.round((headOwn / headTotal) * 1000) / 10 : 0;
  const kinds = useMemo(() => countByKind(scopedCards, owned), [scopedCards, owned]);
  // Lot 6: the pockets of age-locked subjects are not editions that are not issued yet, and count nowhere.
  const lockedCount = scoped.filter((i) => i.locked && !i.soon).length;
  const [preview, setPreview] = useState<{ extras: number; shards: number } | null>(null);
  useEffect(() => {
    let live = true;
    if (!c.kc || c.status !== 'ready') return undefined;
    void c.kc.recyclePreview().then((r) => { if (live && !isApiError(r)) setPreview({ extras: r.extras, shards: r.shards }); });
    return () => { live = false; };
  }, [c.kc, c.status, owned]);
  // The server's figure (locked cards, Gold and Full Art extras left out); the local one until it answers.
  const local = useMemo(() => extras([...catalog.cards, ...catalog.retired], owned, true), [catalog.cards, catalog.retired, owned]);
  const ex = preview ? { n: preview.extras, shards: preview.shards } : local;
  const pc = Math.max(1, pages.length);
  const step = single ? 1 : 2;
  const pg = Math.max(0, Math.min(single ? page : page - (page % 2), pc - 1));
  const gpc = Math.max(1, gridList.length);
  const gp = Math.max(0, Math.min(gpage, gpc - 1));
  const secDone = useMemo(() => {
    const m = new Map<string, boolean>();
    for (const s of catalog.sections) m.set(s.id, s.panos ? s.panos.length > 0 && s.panos.every((p) => panoOwned.has(p)) : s.ns.length > 0 && s.ns.every((n) => owned.has(n)));
    return m;
  }, [catalog.sections, owned, panoOwned]);

  const refilter = (next: Filters, nextShow: Show = show): void => { setF(next); setShow(nextShow); setPage(0); setGpage(0); };

  // Turning a page: the page on the turning side is cloned and flipped over the spread (under reduced motion the spread fades instead).
  const turn = useCallback((dir: 1 | -1): void => {
    const np = pg + dir * step;
    if (np < 0 || np >= pc) return;
    if (reducedMotion() || !spreadRef.current || !spreadWrap.current) {
      setPage(np);
      const sp = spreadRef.current;
      if (sp) { sp.classList.remove('fade'); void sp.offsetWidth; sp.classList.add('fade'); }
      return;
    }
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
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT')) return;
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
    flyReward(document.getElementById('pill-shards'), r.shards, document.getElementById('recycle'));
    toast(`Recycled ${r.recycled} extras for ${r.shards} shards. One copy of each card stays, and locked cards, Gold and Full Art extras are never recycled.`);
  };

  const firstSec = pages[pg]?.sec;
  const guest = status === 'guest';
  const kindBtns: [Filters['kind'], string][] = [['all', 'All'], ['idol', 'Idols'], ['group', 'Group photos'], ['event', 'Events']];
  const showBtns: [Show, string][] = [['all', 'All'], ['owned', 'Owned'], ['missing', 'Missing'], ['fav', 'Favorites'], ...(guest ? [] : [['want', 'Wishlist'] as [Show, string]])];
  // The active filters, as the chips under the tools (phones): the type, each edition, "Show" and the search.
  const chips: { key: string; label: string; clear: () => void }[] = [];
  if (f.kind !== 'all') chips.push({ key: 'kind', label: kindBtns.find(([v]) => v === f.kind)?.[1] ?? '', clear: () => refilter({ ...f, kind: 'all' }) });
  for (const r of RARITIES) if (f.rar[r]) chips.push({ key: `r${r}`, label: RARITY_LABEL[r], clear: () => refilter({ ...f, rar: { ...f.rar, [r]: false } }) });
  if (show !== 'all') chips.push({ key: 'show', label: showBtns.find(([v]) => v === show)?.[1] ?? '', clear: () => refilter(f, 'all') });
  if (f.q.trim()) chips.push({ key: 'q', label: `\u201C${f.q.trim()}\u201D`, clear: () => refilter({ ...f, q: '' }) });
  const nFilters = chips.filter((x) => x.key !== 'q').length;
  const shown = list.filter((i) => !(i.locked && i.soon)).length;
  const doneLabel = shown ? `Show ${shown} card${shown === 1 ? '' : 's'}` : 'No card matches';
  const closePanel = (): void => { setPanel(false); fbtn.current?.focus(); };
  const Pager = ({ id, bottom }: { id: string; bottom?: boolean }): React.ReactElement => (
    <nav className={`pager${bottom ? ' bot' : ''}`} id={id} aria-label={bottom ? 'Grid pages, bottom' : 'Grid pages'}>
      <button type="button" className="btn-quiet" onClick={() => gGo(-1, !!bottom)} disabled={gp <= 0}><span aria-hidden="true">&larr;</span> Previous</button>
      <span className="pg" aria-live={bottom ? undefined : 'polite'}>Page {gp + 1} of {gpc}</span>
      <button type="button" className="btn-quiet" onClick={() => gGo(1, !!bottom)} disabled={gp >= gpc - 1}>Next <span aria-hidden="true">&rarr;</span></button>
    </nav>
  );
  const kindsLine = isPano ? 'Never counted in your cards' : (['idol', 'group', 'event'] as CardKind[]).filter((k) => kinds[k].all > 0).map((k) => `${({ idol: 'Idols', group: 'Group photos', event: 'Events' })[k]} ${kinds[k].own} of ${kinds[k].all}`).join(' \u00B7 ');
  // Lot 7: this group's panoramas, with their own count (a panorama is no card: it is in no total above).
  const scopePanos = only !== null && !isPano ? catalog.panos.filter((p) => scopedCards.some((cd) => p.cards.includes(cd.n))) : catalog.panos;
  const panoOwn = scopePanos.filter((p) => panoOwned.has(p.p)).length;

  return (
    <PanoOpenContext.Provider value={setViewPano}>
    <div className="wrap page">
      <div className="b-head">
        <div>
          <h1 className="h1" id="t-binder">{sec ? sec.name : 'Collection'}</h1>
          <p className="lede" style={{ marginTop: 6 }}>{sec ? <>Your {sec.name} binder. <Link href={kcPath.collection}>All groups</Link></> : 'Your binder, one page per group. Tap any card to see it in full.'}</p>
        </div>
        <div className="b-progress">
          <div className="lbl"><span><b className="num" id="b-own">{headOwn}</b> of <b className="num" id="b-total">{headTotal}</b> {isPano ? 'panoramas' : 'cards'}</span><span className="num" id="b-pct">{pct}%</span></div>
          <span className="bar"><i id="b-bar" style={{ width: `${pct}%` }} /></span>
          <div className="b-kinds" id="b-kinds">{kindsLine}{lockedCount ? `${kindsLine ? ' \u00B7 ' : ''}${lockedCount} editions not issued yet` : ''}{!isPano && scopePanos.length ? `${kindsLine || lockedCount ? ' \u00B7 ' : ''}Panoramas ${panoOwn} of ${scopePanos.length}` : ''}</div>
        </div>
      </div>
      {guest ? (
        <p className="b-note" id="b-note">You are not signed in, so every pocket is empty. <button type="button" className="btn-outline sm" onClick={() => signIn({ title: 'Sign in to see your binder', sub: 'Your collection lives with your account.' })}>Sign in</button></p>
      ) : c.protoExample ? (
        <p className="b-note" id="b-note">This binder starts with an example collection. &quot;Empty binder&quot; under Prototype controls starts from zero.</p>
      ) : null}

      <div className="b-tools">
        <div className="seg" id="f-view" role="group" aria-label="View">
          <button type="button" data-v="binder" aria-pressed={view === 'pages'} onClick={() => setUrl({ view: null })}>Binder</button>
          <button type="button" data-v="grid" aria-pressed={view === 'grid'} onClick={() => setUrl({ view: 'grid' })}>Grid</button>
        </div>
        <label className="search">
          <svg className="ico" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
          <input type="search" id="q" placeholder={catalog.cards.some((cd) => cd.kind === 'event') ? 'Search an idol, group or event' : 'Search an idol or a group'} aria-label="Search cards" value={f.q} onChange={(e) => refilter({ ...f, q: e.target.value })} />
        </label>
        <button type="button" ref={fbtn} className="btn-quiet fbtn" id="fbtn" aria-expanded={panel} aria-controls="fpanel" onClick={() => setPanel(true)}><Ico name="filter" />Filters{nFilters > 0 ? <span className="badge" id="fcount">{nFilters}</span> : null}</button>
        <div className="b-actions">
          <button type="button" className="btn-outline" id="recycle" onClick={() => void recycle()} disabled={!ex.n || !state}>{ex.n ? <>Recycle {ex.n} extras <span className="long">(+{ex.shards} shards)</span></> : 'No extras to recycle'}</button>
        </div>
        <span className="brk" aria-hidden="true" />
        <div className={`fpanel${panel ? ' open' : ''}`} id="fpanel" aria-label="Filters" {...(panel ? { role: 'dialog', 'aria-modal': true } : {})}>
          <div className="fpanel-head"><b>Filters</b><button type="button" className="close" id="fp-x" aria-label="Close the filters" onClick={closePanel}><Ico name="x" /></button></div>
          <span className="fh">Type</span>
          <div className="fgroup" id="f-kind" role="group" aria-label="Type">
            {kindBtns.filter(([v]) => v === 'all' || kinds[v].all > 0).map(([v, t]) => <button key={v} type="button" className="fpill" data-v={v} aria-pressed={f.kind === v} onClick={() => refilter({ ...f, kind: v })}>{t}</button>)}
          </div>
          <span className="fdiv" aria-hidden="true" />
          <span className="fh">Edition</span>
          <div className="fgroup" id="f-rar" role="group" aria-label="Edition">
            {RARITIES.map((r: Rarity) => (
              <button key={r} type="button" className="fpill gemonly" data-v={r} aria-pressed={!!f.rar[r]} title={RARITY_LABEL[r]} aria-label={RARITY_LABEL[r]} onClick={() => refilter({ ...f, rar: { ...f.rar, [r]: !f.rar[r] } })}>
                <Gem r={r} className={`gem gc-${r}`} /><span className="fl">{RARITY_LABEL[r]}</span>
              </button>
            ))}
          </div>
          <span className="fdiv" aria-hidden="true" />
          <span className="fh">Show</span>
          <div className="fgroup" id="f-show" role="group" aria-label="Show">
            {showBtns.map(([v, t]) => <button key={v} type="button" className="fpill" data-v={v} aria-pressed={show === v} onClick={() => refilter(f, v)}>{t}</button>)}
          </div>
          <div className="fpanel-foot"><button type="button" className="btn-quiet" id="fp-clear" onClick={() => refilter({ ...f, kind: 'all', rar: {} }, 'all')}>Clear all</button><button type="button" className="btn-primary" id="fp-done" onClick={closePanel}>{doneLabel}</button></div>
        </div>
      </div>
      <div className="chips" id="chips" aria-label="Active filters">
        {chips.map((x) => <button key={x.key} type="button" className="chip" aria-label={`Remove the filter ${x.label}`} onClick={x.clear}>{x.label}<Ico name="x" /></button>)}
      </div>

      {view === 'grid' ? (
        <div className="g-wrap" id="g-wrap">
          <div className="g-head">
            <div className="g-sort" id="g-sort" role="group" aria-label="Sort">
              <span className="lbl" aria-hidden="true">Sort</span>
              {SORTS.map((s) => <button key={s.key} type="button" className="fpill" data-v={s.key} aria-pressed={sort === s.key} title={s.hint} onClick={() => { setGpage(0); setUrl({ sort: s.key === 'rarity' ? null : s.key, view: 'grid' }); }}>{s.label}</button>)}
            </div>
            {isPano ? null : <Pager id="pg-top" />}
          </div>
          <div className="grid" id="grid">
            {isPano ? (panoShow.length ? panoShow.map((p) => <PanoPocket key={p.p} pano={p} />) : <p className="g-empty">No panorama matches these filters.</p>)
              : gridList.length ? <Cells cells={gridCells(gridList[gp] ?? [], gp < gpc - 1, GRID_PER_PAGE)} /> : <p className="g-empty">No card matches these filters.</p>}
          </div>
          {isPano ? null : <Pager id="pg-bot" bottom />}
          {only === null && catalog.panos.length ? <p className="pano-strip"><b>Panoramas {pc0.own} of {pc0.total}</b> The whole photo of a group, when you hold every card of it. <Link href={kcPath.group(PANO_SECTION)}>See the Panoramas</Link></p> : null}
        </div>
      ) : (
        <div className="b-body" id="b-body">
          <div>
            <div
              className="spread-wrap" id="spread-wrap" ref={spreadWrap}
              onPointerDown={(e) => { if (e.pointerType !== 'mouse') swipe.current = e.clientX; }}
              onPointerUp={(e) => { if (swipe.current === null) return; const dx = e.clientX - swipe.current; swipe.current = null; if (Math.abs(dx) > 60) turn(dx < 0 ? 1 : -1); }}
            >
              <div className={`spread${single ? ' single' : ''}`} ref={spreadRef} id="spread">
                <PageOf page={pages[pg]} index={pg} sections={sections} done={!!pages[pg] && secDone.get(pages[pg]!.sec) === true} />
                {single ? null : <PageOf page={pages[pg + 1]} index={pg + 1} sections={sections} done={!!pages[pg + 1] && secDone.get(pages[pg + 1]!.sec) === true} />}
                {single ? null : <div className="spine" aria-hidden="true"><i /><i /><i /></div>}
              </div>
            </div>
            <div className="b-nav">
              <button type="button" className="btn-quiet" id="pg-prev" aria-label="Previous pages" onClick={() => turn(-1)} disabled={pg <= 0}><svg className="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg></button>
              <span className="pg" id="pg-label" aria-live="polite">{pageWords(pg, pc, single)}</span>
              <button type="button" className="btn-quiet" id="pg-next" aria-label="Next pages" onClick={() => turn(1)} disabled={pg + step >= pc}><svg className="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg></button>
            </div>
            {c.fixture ? <div className="adslot" role="note"><b>Advertisement</b>Banner space, binder pages only. In the game a Google banner shows here, never next to an Open button.</div> : <BinderBanner ctx={ads} />}
          </div>
          <nav className="idx" id="idx" aria-label="Binder sections">
            {catalog.sections.map((s) => {
              const o = s.panos ? s.panos.filter((p) => panoOwned.has(p)).length : s.ns.filter((n) => owned.has(n)).length;
              const complete = secDone.get(s.id) === true;
              const inner = <><i /><span>{s.name}</span>{complete ? <span className="ok" title="Complete"><Ico name="check" /></span> : <small>{o}/{s.panos ? s.panos.length : s.ns.length}</small>}</>;
              return only !== null ? (
                <Link key={s.id} href={kcPath.group(s.id)} className="idx-link" style={{ '--t': s.color } as React.CSSProperties} aria-current={only === s.id ? 'true' : 'false'}>{inner}</Link>
              ) : (
                <button key={s.id} type="button" data-sec={s.id} style={{ '--t': s.color } as React.CSSProperties} aria-current={firstSec === s.id ? 'true' : 'false'} onClick={() => goSection(s.id)}>{inner}</button>
              );
            })}
          </nav>
        </div>
      )}
      {panel ? <div className="fscrim" id="fscrim" onClick={closePanel} /> : null}
      {viewPano ? <PanoSheet pano={viewPano} onClose={() => setViewPano(null)} /> : null}
      <footer className="foot"><Link href={kcPath.credits}>Photo credits</Link><Link href={kcPath.report}>Report a photo</Link><span>Every photo is free to reuse, credited on the card.</span></footer>
    </div>
    </PanoOpenContext.Provider>
  );
}
