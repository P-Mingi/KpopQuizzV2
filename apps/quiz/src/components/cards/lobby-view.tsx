'use client';

// KpopCards: the lobby (v6 prototype, #lobby): the pack on its stage with the stack, the Open buttons and three chips (next pack, midnight top-up, Gold
// guarantee); Choose your pack; Can't wait?; Almost there; the last pull; the six colour boxes; the pull history. Nothing is decided here: the wallet and the
// cards come from /api/cards. The opening itself is /kpopcards/open/<theme> (agent C's PackOpening, mounted by OpeningMount).
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { RewardedAdButton } from '@/components/cards-bridge/ads-client';
import { useSignIn } from '@/components/ux-v1/sign-in-sheet';
import { mainButton, pityProgress } from '@/lib/cards/economy';
import { ECON_ERRORS, craftCard, isEconError, wishCard } from '@/lib/cards/economy-api';
import { isApiError } from '@/lib/kpopcards/contract';
import { paletteFor } from '@/lib/cards/ui-palette';
import { EDITION_RARITY } from '@/lib/cards/kc-editions';
import { kcPath } from '@/lib/cards/kc-paths';
import { THEMES, THEME_KEY, isThemeId, packLook, themeBy } from '@/lib/cards/kc-themes';
import { whenLabel } from '@/lib/cards/kc-time';
import { weekOf } from '@/lib/cards/kc-views';
import { PERIOD_MS, RARITIES, RARITY_LABEL, SHARD_PACK_COST } from '@/lib/cards/rules';
import { fmtClock, fmtHours, ownedCount } from '@/lib/cards/ui-model';
import { pushState, turnOff, turnOn } from '@/lib/cards/push-client';

import { CardFront, Gem, Ico } from './card-art';
import { useCards } from './cards-provider';
import { PocketFoot } from './fav-star';
import { flyReward } from './reward-fly';
import { tilt } from './kc-tilt';
import { OddsBox } from './odds-box';
import { OpenDemo } from './open-demo';

import type { AdsContext } from '@/lib/cards/ads';
import type { AlmostItem } from '@/lib/kpopcards/contract';
import type { PushState } from '@/lib/cards/push-client';
import type { Rarity } from '@/lib/cards/types';
import type { WeekView } from '@/lib/cards/kc-views';
import type { CatalogOdds } from '@/lib/cards/types';

// The prototype controls exist in a development fixture only: the lazy import sits behind the production check, so a production build drops it.
const ProtoControls = process.env.NODE_ENV !== 'production' ? lazy(() => import('./proto-controls').then((m) => ({ default: m.ProtoControls }))) : null;

type Vars = React.CSSProperties & Record<`--${string}`, string | number>;

const SOURCE_LABEL: Record<string, string> = { stock: 'Pack', shards: 'Bought with shards', ad: 'Pack', bonus: 'Bonus pack', focus: 'Focus pack', daily: 'Pack of the day', demo: 'Demo pack' };

function PackFace({ c, title, golden, count = '5 CARDS' }: { c: readonly string[]; title: string; golden: boolean; count?: string }): { style: Vars; className: string; body: React.ReactElement } {
  return {
    style: { '--p1': c[0]!, '--p2': c[1]!, '--p3': c[2]! },
    className: golden ? ' golden' : '',
    body: (
      <>
        <span className="pk"><span className="pk-face" /><span className="pk-crimp t" /><span className="pk-crimp b" /></span>
        <span className="pk-body"><span className="pk-word">Kpop<b>Cards</b></span><span className="pk-title">{title}</span></span>
        <span className="pk-count">{count}</span>
      </>
    ),
  };
}

export interface LobbyProps { ads: AdsContext; odds: CatalogOdds | null }

export function LobbyView({ ads, odds }: LobbyProps): React.ReactElement {
  const c = useCards();
  const { status, now, catalog, owned, lastPack, byN, toast, kc } = c;
  const w = c.lobby;
  // The box shows only what the server grants (decision 28): the quiz of the day is no source of packs while bridges.quizOfDay.enabled is false.
  const quizOn = (w?.bridges?.quizOfDay as { enabled: boolean } | undefined)?.enabled === true;
  const router = useRouter();
  const signIn = useSignIn();
  const ready = status === 'ready' && w !== null;
  const guest = status === 'guest';
  const [theme, setThemeState] = useState<string>('all');
  const [swap, setSwap] = useState(0);
  const [adReady, setAdReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const adBtn = useRef<HTMLButtonElement | null>(null);
  const packRef = useRef<HTMLButtonElement | null>(null);
  const [push, setPush] = useState<PushState>('unsupported');
  const [focusG, setFocusG] = useState('');

  useEffect(() => { if (w) setThemeState(w.theme); else { try { const t = localStorage.getItem(THEME_KEY); if (isThemeId(t)) setThemeState(t); } catch { /* private mode */ } } }, [w?.theme]);
  useEffect(() => { void pushState().then(setPush); }, []);
  useEffect(() => tilt(packRef.current, 12), []);

  const total = catalog.cards.length;
  const daily = useMemo(() => { if (!w) return null; const p = paletteFor(`group:${w.daily.group.name}`); return { slug: w.daily.group.slug, name: w.daily.group.name, a: p.a, c: p.c }; }, [w]);
  const own = useMemo(() => ownedCount(catalog.cards, owned), [catalog.cards, owned]);
  const lv = w ? { label: `Level ${w.level.level} \u00B7 ${w.level.title}`, nextLabel: `${w.level.toNext} more card${w.level.toNext === 1 ? '' : 's'} to level ${w.level.nextLevel}`, progress: w.level.progress / 10 } : { label: '', nextLabel: '', progress: 0 };
  const stock = w?.stock ?? 0;
  const cap = w?.cap ?? 10;
  const nextMs = w?.nextAt && now !== null ? Math.max(0, Date.parse(w.nextAt) - now) : 0;
  const midMs = w && now !== null ? Math.max(0, Date.parse(w.midnightAt) - now) : 0;
  const full = ready && stock >= cap;
  const rested = ready && (w?.timerLeft ?? 1) <= 0 && !full;
  const golden = w?.golden.next === true;
  const toGolden = w ? w.golden.packsUntil : null;
  const look = packLook({ theme, golden });
  const face = PackFace({ c: look.c, title: look.title, golden: look.golden });

  const main = mainButton({ stock, shards: w?.shards ?? 0, adsLeft: w?.adsLeft ?? 0, adsAvailable: adReady && !!w?.adsEnabled, adShards: w?.adShards ?? 25, nextMs: w?.nextAt ? nextMs : null });
  const hasPack = stock > 0;
  const canShards = (w?.shards ?? 0) >= SHARD_PACK_COST;

  const goOpen = useCallback((kind: 'stock' | 'shards', packs: 1 | 5 = 1): void => {
    const q = kind === 'shards' ? '?from=shards' : '';
    router.push(packs === 5 ? kcPath.open(themeBy(theme).id, 5) : `${kcPath.open(themeBy(theme).id)}${q}`);
  }, [router, theme]);

  const primary = (): void => {
    if (guest) { signIn({ title: 'Sign in to open packs', sub: 'Your collection lives with your account.' }); return; }
    if (!ready) return;
    if (main.kind === 'open') goOpen('stock');
    else if (main.kind === 'shards') goOpen('shards');
    else if (main.kind === 'ad') adBtn.current?.click();
    else toast(`${main.label}.`);
  };

  const choose = (id: string): void => {
    if (id === theme) return;
    setThemeState(id);
    try { localStorage.setItem(THEME_KEY, id); } catch { /* private mode */ }
    if (isThemeId(id)) void kc?.prefs({ theme: id });
    setSwap((n) => n + 1);
  };

  const togglePush = async (): Promise<void> => {
    if (busy) return;
    setBusy(true);
    try {
      const next = push === 'on' ? await turnOff() : await turnOn();
      setPush(next);
      toast(next === 'on' ? 'You’ll get one notification when your packs are ready, never between 22:00 and 08:00.' : next === 'denied' ? 'Notifications are blocked in your browser settings.' : 'Notifications off.');
    } finally { setBusy(false); }
  };

  const [almost, setAlmost] = useState<AlmostItem[]>([]);
  const [friends, setFriends] = useState<{ pos: number; nickname: string; pct: number; me: boolean }[]>([]);
  useEffect(() => {
    if (!kc || !ready) return;
    let live = true;
    void kc.almost(4).then((r) => { if (live && !isApiError(r)) setAlmost(r.items); });
    void kc.ranking('friends').then((r) => { if (live && !isApiError(r)) { const i = r.rows.findIndex((x) => x.me); const top = i >= 4 ? [...r.rows.slice(0, 3), r.rows[i]!] : r.rows.slice(0, 4); setFriends(top.map((x) => ({ pos: x.pos, nickname: x.nickname, pct: x.pct, me: x.me }))); } });
    return () => { live = false; };
  }, [kc, ready, w?.stock, w?.shards, own]);
  const last = useMemo(() => {
    if (lastPack) return lastPack.map((p) => ({ card: byN.get(p.n), isNew: p.isNew })).filter((x) => x.card);
    if (w?.last) return w.last.cards.map((p) => ({ card: byN.get(p.n), isNew: p.isNew })).filter((x) => x.card);
    return [];
  }, [lastPack, owned, byN, w?.last]);
  const topCards = useMemo(() => [...owned.keys()].map((n) => byN.get(n)).filter((x): x is NonNullable<typeof x> => !!x).sort((a, b) => RARITIES.indexOf(b.rarity) - RARITIES.indexOf(a.rarity) || a.n - b.n).slice(0, 3), [owned, byN]);
  const groups = useMemo(() => catalog.sections.filter((s) => s.id !== 'events' && s.id !== 'soloists'), [catalog.sections]);
  useEffect(() => { if (!focusG && groups[0]) setFocusG(groups[0].id); }, [focusG, groups]);
  const focusGroup = groups.find((g) => g.id === focusG) ?? groups[0] ?? null;
  const focusUsed = w?.focusUsed === true;
  const adsLeft = w?.adsLeft ?? 0;
  const adShards = w?.adShards ?? 25;
  const shards = w?.shards ?? 0;
  const pityLeft = w?.guarantee.left ?? null;
  const dailyUsed = w?.daily.used === true;
  const hl = ready && (w?.golden.opened ?? 0) > 0 && push === 'off';
  const timerCap = w?.timerCap ?? 40;
  const weekView = useMemo(() => (w ? weekOf(w.week, now ?? 0) : null), [w, now]);
  const timerUsed = w?.timerUsed ?? 0;

  const guestText = guest ? (c.demo ? <><b>Not signed in yet?</b> Open one demo pack, no account needed. Sign in with your Bunnyverse passport to keep the cards.</> : <><b>Not signed in yet?</b> Sign in with your Bunnyverse passport to keep a stack of packs and your collection.</>) : null;

  return (
    <div className="wrap page packs2 lobby">
      <div className="p-head2">
        <h1 className="h1" id="t-lobby">Your packs</h1>
        <p className="lede">A free pack every 10 minutes, up to {cap} waiting. The stack is full again at midnight, Paris time.</p>
      </div>
      {guest ? (
        <div className="guest" id="guest">
          <p id="guest-t">{guestText}</p>
          {c.demo ? <OpenDemo className="btn-primary" id="guest-demo" /> : null}
          <button type="button" className="btn-quiet" id="guest-in" onClick={() => signIn({ title: 'Sign in to open packs', sub: 'Your collection lives with your account.' })}>Sign in</button>
        </div>
      ) : null}
      {/* Lot 5: the quiet "still there?" check. After 2 hours without an action the server pauses the pack timer; one tap restarts it. It never costs a pack. */}
      {ready && w?.stillThere?.due ? (
        <div className="nudge" id="still-there" role="status">
          <p><b>Still there?</b> Your pack timer is paused after a while without any action. Tap to start it again. Nothing is taken.</p>
          <button type="button" className="btn-primary" id="still-btn" onClick={() => { void c.kc?.stillThere().then(() => c.refresh()); }}>I&rsquo;m here</button>
        </div>
      ) : null}

      <div className="stage" id="stage">
        <span className={`golden-chip${golden ? ' now' : ''}`} id="golden-chip" hidden={!ready || toGolden === null}>
          <svg className="gem" viewBox="0 0 24 24" aria-hidden="true"><use href="#bvc-g-UR" /></svg>
          <span className="lg">{golden ? 'Next pack is golden' : `Golden pack in ${toGolden} packs`}</span><span className="sh">{golden ? 'Golden next' : `Golden in ${toGolden}`}</span>
        </span>
        <button type="button" ref={packRef} key={swap} id="pack" className={`pack float${face.className}${swap ? ' swap' : ''}`} style={face.style} aria-label={guest ? 'Sign in to open a pack' : 'Open a pack'} aria-disabled={guest || !ready || hasPack || !main.disabled ? 'false' : 'true'} onClick={primary}>
          {face.body}
        </button>
        <i className="stage-floor" aria-hidden="true" />
        {ready ? (
          <div className="stackrow">
            <div className="stack" id="stack" aria-hidden="true">{Array.from({ length: Math.max(cap, stock) }, (_, i) => <i key={i} className={i < stock ? 'on' : undefined} />)}</div>
            <p className="stack-label" id="stack-label" aria-live="polite"><b className="num">{stock}</b> of {cap} packs ready{stock > cap ? ' (with bonus packs)' : ''}</p>
          </div>
        ) : null}
        <div className="openrow">
          <button type="button" className="btn-primary xl" id="open-btn" onClick={primary} disabled={busy || (!guest && (!ready || main.disabled))}><span id="open-label">{guest ? 'Sign in to open' : !ready ? 'Open a pack' : main.label}</span></button>
          {ready ? <button type="button" className="btn-x5" id="open5-btn" disabled={stock < 5} title={stock < 5 ? 'Needs 5 packs ready' : 'Open 5 packs at once'} onClick={() => goOpen('stock', 5)}>Open 5</button> : null}
        </div>
        <p className="hint" id="cta-sub">{guest ? 'Packs belong to your account.' : !ready ? '' : hasPack ? 'You can also tap the pack.' : rested ? 'The timer is done for today. Midnight brings the stack back to full.' : main.kind === 'wait' && w?.nextAt ? `Or wait ${fmtClock(nextMs)} for a free pack.` : ''}</p>
        {ready ? (
          <div className="ichips">
            <span className="ichip">
              <span className="ring"><svg viewBox="0 0 48 48" aria-hidden="true"><circle className="bg" cx="24" cy="24" r="20" /><circle className="fg" id="ring-fg" cx="24" cy="24" r="20" strokeDasharray="125.66" strokeDashoffset={full ? 0 : rested ? 125.66 : (125.66 * (nextMs / PERIOD_MS)).toFixed(2)} /></svg></span>
              <span className="ct"><b className="num" id="timer-t">{full ? 'Stack full' : rested ? 'Daily limit' : fmtClock(nextMs)}</b><small id="timer-l">{full ? 'open one to start the timer' : rested ? `${timerCap} of ${timerCap} today, back at midnight` : `next pack · ${timerUsed} of ${timerCap} today`}</small></span>
            </span>
            <span className="ichip">
              <span className="moon"><svg className="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" /></svg></span>
              <span className="ct"><b className="num" id="mid-t">{fmtHours(midMs)}</b><small>to the midnight refill</small></span>
            </span>
            {pityLeft !== null ? (
              <span className="ichip gold">
                <span className="moon gold"><svg className="gem" viewBox="0 0 24 24" aria-hidden="true"><use href="#bvc-g-UR" /></svg></span>
                <span className="ct"><b className="num" id="pity-t">{pityLeft <= 1 ? 'Next pack' : `${pityLeft} packs`}</b><small id="pity-l">{pityLeft <= 1 ? 'brings a sure Gold' : 'to a sure Gold'}</small></span>
                <span className="pity" aria-hidden="true"><i id="pity-bar" style={{ width: `${pityProgress(pityLeft).toFixed(1)}%` }} /></span>
              </span>
            ) : null}
          </div>
        ) : null}
      </div>

      <section className="shelf" aria-labelledby="t-shelf">
        <div className="shelf-head"><h2 className="h2" id="t-shelf">Choose your pack</h2><span>Same odds in every pack</span></div>
        <div className="shelf-row" id="shelf" role="radiogroup" aria-label="Packs">
          {daily ? (
            <div className="sp daily" style={{ '--p1': daily.a, '--p2': '#B48CFF', '--p3': daily.c } as Vars}>
              <span className="ribbon2">{dailyUsed ? 'Opened today' : 'Free today'}</span>
              <span className="sp-pack"><span>{daily.name}</span></span>
              <b>Pack of the day</b>
              <small>{daily.name} only {'·'} {dailyUsed ? 'a new one at midnight' : ready ? `${fmtHours(midMs)} left` : 'free once a day'}</small>
              <button type="button" className="sp-go" id="daily-btn" disabled={!ready || dailyUsed} onClick={() => router.push(kcPath.open('daily'))}>{dailyUsed ? 'Opened' : 'Open free'}</button>
            </div>
          ) : null}
          {THEMES.map((t) => (
            <button key={t.id} type="button" className="sp" role="radio" aria-checked={theme === t.id} data-theme={t.id} style={{ '--p1': t.c[0], '--p2': t.c[1], '--p3': t.c[2] } as Vars} onClick={() => choose(t.id)}>
              <span className="sp-pack"><span>{t.title}</span></span>
              <b>{t.name}</b>
              <small>{(w?.themes.find((x) => x.id === t.id)?.cards ?? (t.id === 'all' ? total : null)) !== null ? `${w?.themes.find((x) => x.id === t.id)?.cards ?? total} cards` : 'Themed pack'}</small>
              <span className="sp-sel">{theme === t.id ? <><Ico name="check" />Selected</> : 'Choose'}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="boost" aria-labelledby="t-boost">
        <div className="boost-head"><h2 className="h2" id="t-boost">Can&rsquo;t wait?</h2><span>Three ways to get more</span></div>
        <div className="tiles">
          {ready && w && w.adsEnabled ? (
            <div className="tile ad" id="tile-ad">
              <span className="ribbon">Free</span>
              <span className="t-ico"><svg className="ico" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="3" /><path d="M10 9.5v5l4.5-2.5z" /></svg></span>
              <h3>Watch an ad</h3>
              <p className="big"><span>+{adShards}</span><small>shards</small></p>
              <p id="ad-s">{adsLeft > 0 ? `${adsLeft} left today. Two ads open a pack.` : 'No ads left today. More after midnight.'}</p>
              <div className="t-act">
                {adsLeft > 0 ? (
                  <RewardedAdButton ctx={ads} className="btn-ad" buttonRef={adBtn} onAvailable={setAdReady} onGranted={(r) => { toast(`+${r.gained} shards from the ad.`); flyReward(document.getElementById('pill-shards'), r.gained, adBtn.current); void c.refresh(); }} label={<><span className="play"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5z" /></svg></span><span id="ad-lbl">Watch an ad</span></>} />
                ) : <button type="button" className="btn-ad" disabled><span className="play"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5z" /></svg></span><span id="ad-lbl">Back at midnight</span></button>}
              </div>
            </div>
          ) : null}
          <div className="tile sh" id="tile-sh">
            <span className="t-ico"><svg className="gem" viewBox="0 0 24 24" aria-hidden="true"><use href="#bvc-g-R" /></svg></span>
            <h3>Use {SHARD_PACK_COST} shards</h3>
            <p className="big"><span id="sh-n">{shards}</span><small>of {SHARD_PACK_COST}</small></p>
            <span className="sh-bar"><i id="sh-bar" style={{ width: `${Math.min(100, (shards / SHARD_PACK_COST) * 100)}%` }} /></span>
            <p id="sh-s">{canShards ? (shards >= SHARD_PACK_COST * 2 ? `Enough for ${Math.floor(shards / SHARD_PACK_COST)} packs` : 'Ready to open a pack') : `${SHARD_PACK_COST - shards} more to open a pack`}</p>
            <div className="t-act"><button type="button" className="btn-sh" id="buy-btn" disabled={!ready || !canShards} onClick={() => goOpen('shards')}>{canShards ? 'Open a pack' : 'Not enough shards yet'}</button></div>
          </div>
          {push !== 'unsupported' || c.fixture ? (
            <div className={`tile nt${hl ? ' hl' : ''}`} id="tile-nt">
              {hl ? <span className="rec" id="nt-rec">Suggested</span> : null}
              <span className="t-ico"><svg className="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15z" /><path d="M10 20a2 2 0 0 0 4 0" /></svg></span>
              <h3>Notify me</h3>
              <p>One notification when your {cap} packs are ready. Never between 22:00 and 08:00.</p>
              <div className="t-act"><button type="button" className="btn-nt" id="notify" aria-pressed={push === 'on'} disabled={busy || push === 'denied' || push === 'unsupported' || !ready} onClick={() => void togglePush()}><Ico name="check" /><span id="nt-lbl">{push === 'denied' ? 'Blocked' : push === 'on' ? 'On' : 'Turn on'}</span></button></div>
            </div>
          ) : null}
        </div>
        <p className="craft-hint">Missing a card? Craft it with shards from its page in the binder.</p>
      </section>

      <section className="almost" aria-labelledby="t-almost">
        <div className="sec-head"><h2 className="h2" id="t-almost">Almost there</h2><span>Cards that would finish something</span></div>
        <div className="almost-row" id="almost">
          {almost.length ? almost.map((x) => {
            const m = byN.get(x.next.n);
            if (!m) return null;
            const col = paletteFor(`group:${x.name}`).dot;
            return (
              <div className="al" key={`${x.type}-${x.id}`} style={{ '--c': col } as Vars}>
                <span className="al-card"><CardFront card={m} /></span>
                <span className="al-txt"><b>{x.name}</b><small>{x.type === 'group' ? `${x.missing} card${x.missing > 1 ? 's' : ''} to finish${x.rewardPacks ? ` \u00B7 +${x.rewardPacks} pack${x.rewardPacks > 1 ? 's' : ''}` : ''}` : `1 edition left: ${RARITY_LABEL[m.rarity]}`}</small><span className="bar"><i style={{ width: `${((x.owned / x.total) * 100).toFixed(0)}%` }} /></span></span>
                {x.type === 'idol' ? (
                  x.craft?.canAfford ? <button type="button" className="al-btn" onClick={async () => { const r = await craftCard(m.n); if (isEconError(r)) toast(ECON_ERRORS[r.error] ?? ECON_ERRORS.failed!); else toast(`${m.name} is in your binder. ${r.card.cost} shards spent.`); await c.refresh(); }}>Craft {'\u00B7'} {x.craft.cost}</button>
                  : ready ? <button type="button" className="al-btn" aria-pressed={x.wished} onClick={async () => { const r = await wishCard(m.n, !x.wished); if (isEconError(r)) toast(ECON_ERRORS[r.error] ?? ECON_ERRORS.failed!); else await c.refresh(); }}>{x.wished ? 'Wished' : 'Wishlist'}</button> : null
                ) : <Link className="al-btn" href={kcPath.group(x.slug)}>Show</Link>}
              </div>
            );
          }) : <p className="emptyline">Open a few packs: groups and idols close to complete show up here.</p>}
        </div>
      </section>

      <div className="col">
        <div className="sec-head"><h2 className="h2">Last pull</h2><span id="last-when">{last.length ? 'Tap a card to see it in full' : ''}</span></div>
        {last.length ? (
          <div className="strip" id="last">
            {last.map((x, i) => (
              <div className="pw" key={`${x.card!.n}-${i}`}>
                <Link className="pocket" href={kcPath.card(x.card!.num)} aria-label={`${x.card!.name}, ${RARITY_LABEL[x.card!.rarity]}${x.isNew ? ', new' : ''}`}><CardFront card={x.card!} /></Link>
                <PocketFoot n={x.card!.n} name={x.card!.name} edition={RARITY_LABEL[x.card!.rarity]} isNew={x.isNew} copies={1} />
              </div>
            ))}
          </div>
        ) : <p className="emptyline" id="last-empty">Your last 5 cards will show here.</p>}

        <div className="more">
          <div className="mx m-coll">
            <div className="mx-head"><span className="mx-ico"><Ico name="binder" /></span><h2 className="h2">Your collection</h2></div>
            <div className="coll-row">
              <span className="ringbig"><svg viewBox="0 0 80 80" aria-hidden="true"><circle className="bg" cx="40" cy="40" r="34" /><circle className="fg" id="coll-ring" cx="40" cy="40" r="34" strokeDasharray="213.6" strokeDashoffset={(213.6 * (1 - (total ? own / total : 0))).toFixed(1)} /></svg><b className="num" id="a-pct">{total ? Math.round((own / total) * 100) : 0}%</b></span>
              <div className="coll-txt"><p><b className="num" id="a-own">{own}</b> of <span className="num" id="a-total">{total}</span> cards</p><p className="lvl" id="a-lvl">{lv.label}</p><span className="bar"><i id="a-bar" style={{ width: `${lv.progress * 100}%` }} /></span><small id="a-next">{lv.nextLabel}</small></div>
            </div>
            <div className="mini-fan" id="mini-fan" aria-hidden="true">{topCards.map((d, i) => <span key={d.n} style={{ '--i': i } as Vars}><CardFront card={d} /></span>)}</div>
            <Link href={kcPath.collection} className="mx-btn">Open the collection</Link>
          </div>
          <div className="mx m-week">
            <div className="mx-head"><span className="mx-ico"><Ico name="goals" /></span><h2 className="h2">This week</h2><span className="mx-aside" id="wk-left">{weekView?.leftLabel ?? ''}</span></div>
            <WeekList week={weekView} />
            <Link href={kcPath.missions} className="mx-btn">All missions and sets</Link>
          </div>
          {groups.length ? (
            <div className="mx m-focus" id="m-focus" style={focusGroup ? ({ '--fg': focusGroup.color } as Vars) : undefined}>
              <div className="mx-head"><span className="mx-ico"><svg className="ico" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5" /><path d="M12 3.5v4M12 16.5v4M3.5 12h4M16.5 12h4" /></svg></span><h2 className="h2">Focus pack</h2><span className="mx-aside">Once a day</span></div>
              <p className="small">One of your packs brings 2 of its 5 cards from the group you pick. The odds for each edition stay the same.</p>
              <label className="hint" htmlFor="focus-g" style={{ display: 'block', marginTop: 12 }}>Group</label>
              <select className="fsel" id="focus-g" style={{ marginTop: 6 }} value={focusG} onChange={(e) => setFocusG(e.target.value)}>{groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</select>
              <div className="row2"><button type="button" className="btn-primary" id="focus-btn" disabled={!ready || focusUsed || !hasPack || !focusGroup} onClick={() => focusGroup && router.push(kcPath.focus(focusGroup.id))}>Open a focus pack</button><small id="focus-s">{focusUsed ? 'Used today. The next one comes after midnight.' : !ready || !hasPack ? 'No pack ready right now.' : 'Uses one of your packs.'}</small></div>
            </div>
          ) : null}
          <div className="mx m-rank">
            <div className="mx-head"><span className="mx-ico"><Ico name="trophy" /></span><h2 className="h2">Friends</h2><span className="mx-aside">By completion</span></div>
            <ol className="rk-mini" id="rk-mini">
              {friends.map((x) => <li key={`${x.pos}-${x.nickname}`} className={x.me ? 'me' : undefined}><span className="pos">{x.pos}</span><span className="av sm">{x.nickname.charAt(0).toUpperCase()}</span><b>{x.me ? 'You' : x.nickname}</b><span className="num">{x.pct}%</span></li>)}
            </ol>
            <Link href={kcPath.ranking} className="mx-btn">Full ranking</Link>
          </div>
          <div className="mx m-quiz">
            <div className="mx-head"><span className="mx-ico"><Ico name="help" /></span><h2 className="h2">On kpopquiz.org</h2><span className="mx-aside">{quizOn ? '+1 pack each' : '+1 pack a win'}</span></div>
            {w?.bridges?.kpopdle.enabled !== false ? <a className="qrow" href="https://kpopquiz.org/kpopdle" target="_blank" rel="noopener"><b>Kpopdle</b><span>Guess today&rsquo;s idol. A win gives a pack.</span></a> : null}
            {quizOn ? <a className="qrow" href="https://kpopquiz.org" target="_blank" rel="noopener"><b>Quiz of the day</b><span>Finish it for a pack, opened here.</span></a> : null}
            <a className="qrow" href="https://kpopquiz.org" target="_blank" rel="noopener"><b>Your passport</b><span>One account for kpopquiz.org and KpopCards.</span></a>
          </div>
          <div className="mx m-odds" id="odds-box">
            <div className="mx-head"><span className="mx-ico"><svg className="gem" viewBox="0 0 24 24" aria-hidden="true"><use href="#bvc-g-L" /></svg></span><h2 className="h2">Drop rates</h2><span className="mx-aside">The same for everyone</span></div>
            <OddsBox odds={odds} pityLeft={pityLeft} />
          </div>
        </div>

        {(w?.recent ?? []).length > 0 ? (
          <div id="hist-wrap">
            <div className="sec-head"><h2 className="h2">Pull history</h2><span>Your last 10 packs</span></div>
            <ol className="hist" id="hist">
              {(w?.recent ?? []).map((h) => { const r: Rarity = EDITION_RARITY[h.best]; return (
                <li key={h.at}><span className="when">{now !== null ? whenLabel(Date.parse(h.at), now) : ''}</span><span className="best"><Gem r={r} className={`gem gc-${r}`} />{RARITY_LABEL[r]}</span><span>{SOURCE_LABEL[h.source] ?? 'Pack'}</span>{h.newCount !== null ? <span className="nw"><b>{h.newCount}</b> new</span> : null}</li>
              ); })}
            </ol>
          </div>
        ) : null}
      </div>

      {ProtoControls && c.fixture ? <Suspense fallback={null}><ProtoControls /></Suspense> : null}
      <footer className="foot"><Link href={kcPath.credits}>Photo credits</Link><Link href={kcPath.report}>Report a photo</Link><span>KpopCards is free. Packs are never sold. bunnyverse.org/kpopcards, part of Bunnyverse.</span></footer>
    </div>
  );
}

export function WeekList({ week }: { week: WeekView | null }): React.ReactElement {
  if (!week) return <ul className="wk" id="wk-mini"><li className="done" hidden /></ul>;
  return (
    <ul className="wk" id="wk-mini">
      {week.items.map((x) => { const v = Math.min(x.value, x.target); const done = v >= x.target; return (
        <li key={x.key} className={done ? 'done' : ''}><span className="tick"><Ico name="check" /></span><span>{x.label}</span><small>{v} of {x.target}</small><span className="bar"><i style={{ width: `${(v / x.target) * 100}%` }} /></span></li>
      ); })}
    </ul>
  );
}
