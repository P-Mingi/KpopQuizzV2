'use client';

// KpopCards: the mount point of the opening (agent C's PackOpening) on the /kpopcards/open/... pages. It draws the pack(s) through the contract (one pack, five,
// the pack of the day, a focus pack, a pack bought with shards, or the guest's demo pack), applies the result to the wallet, and renders the opening full
// screen. On close it goes back to the lobby (or opens the next pack). Nothing here decides a result: the five cards come from the server.
// The `ovopen` class on <html> (the pages behind the opening are hidden) is PackOpening's own (agent C).
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';

import { useSignIn } from '@/components/ux-v1/sign-in-sheet';
import { analytics } from '@/lib/analytics';
import { kcPath } from '@/lib/cards/kc-paths';
import { isApiError as isKcError } from '@/lib/kpopcards/contract';
import { newKey } from '@/lib/kpopcards/registry';
import { packLook } from '@/lib/cards/kc-themes';
import { paletteFor } from '@/lib/cards/ui-palette';
import { isError } from '@/lib/cards/ui-api';

import { useCards } from './cards-provider';
import { markDemoUsed, demoUsed } from './demo-store';
import { PackOpening } from './pack-opening';

import type { ThemeId } from '@/lib/kpopcards/contract';
import type { OpenSpec } from '@/lib/cards/kc-open';
import type { OpenedCard, PackSource } from '@/lib/cards/types';

const ERRORS: Record<string, string> = {
  empty: 'No pack left. The next one comes soon.', shards: 'You need 50 shards for a pack.', forbidden: 'This account cannot open packs.', limit: 'That pack was already opened today.',
  network: 'The connection dropped. Try again.', failed: 'Something went wrong. Try again.', focus_used: 'Today’s focus pack is already opened.',
};

interface Dealt { cards: OpenedCard[]; source: PackSource; demo: boolean }

export function OpeningMount({ spec }: { spec: OpenSpec }): React.ReactElement | null {
  const c = useCards();
  const { status, api, kc, catalog, toast, now } = c;
  const router = useRouter();
  const signIn = useSignIn();
  const [dealt, setDealt] = useState<Dealt | null>(null);
  const started = useRef<string | null>(null);
  const key = JSON.stringify(spec);
  const w = c.lobby;

  useEffect(() => {
    if (status === 'loading' || !api || !kc) return;
    if (started.current === key) return;
    started.current = key;
    const back = (msg?: string): void => { if (msg) toast(msg); router.replace(kcPath.lobby); };
    void (async () => {
      if (spec.kind === 'demo') {
        if (status !== 'guest') { back(); return; }
        if (demoUsed()) { back('You already opened your demo pack on this device. Sign in to open real packs.'); return; }
        const r = await api.demoDraw();
        if (isError(r)) { back(ERRORS[r.error] ?? ERRORS.failed); return; }
        markDemoUsed(r.token);
        setDealt({ cards: r.cards, source: 'stock', demo: true });
        return;
      }
      if (status === 'guest') { signIn({ title: 'Sign in to open packs', sub: 'Your collection lives with your account.' }); back(); return; }
      if (status !== 'ready') { back(ERRORS.failed); return; }
      const entity = spec.kind === 'focus' ? ((): string | null => { for (const it of catalog.items) if (!it.locked && it.sec === spec.group && it.card.kind === 'group') return it.card.entity; return null; })() : null;
      if (spec.kind === 'focus' && !entity) { back(ERRORS.failed); return; }
      const r = await kc.open({
        key: newKey(),
        source: spec.kind === 'daily' ? 'daily' : spec.kind === 'focus' ? 'focus' : spec.from === 'shards' ? 'shards' : 'stock',
        ...(spec.kind === 'theme' ? { theme: spec.theme as ThemeId, packs: spec.packs } : { packs: 1 as const }),
        ...(entity ? { focus: entity } : {}),
      });
      if (isKcError(r)) {
        if (r.error === 'unauthorized') { signIn({ title: 'Sign in to open packs', sub: 'Your collection lives with your account.' }); back(); return; }
        back(ERRORS[r.error] ?? ERRORS.failed);
        return;
      }
      analytics.gameStart({ site: 'hub', game: 'cards', mode: 'classic', kind: 'cards_standard' });
      const last = r.packs[r.packs.length - 1]!;
      c.applyResult({ pack: { id: last.id, cards: last.cards.map((x) => ({ n: x.n, isNew: x.isNew, completesPair: x.completesPair })), newCount: last.newCount, packNo: last.packNo }, state: r.state });
      const cards: OpenedCard[] = r.packs.flatMap((p) => p.cards.map((x) => ({ n: x.n, isNew: x.isNew, completesPair: x.completesPair })));
      const source: PackSource = spec.kind === 'theme' && spec.from === 'shards' ? 'shards' : 'stock';
      setDealt({ cards, source, demo: false });
    })();
  }, [status, api, kc, key, spec, router, signIn, toast, c, catalog.items]);

  const look = useMemo(() => {
    const golden = w?.golden.next === true;
    if (spec.kind === 'daily') return packLook({ daily: w ? (() => { const p = paletteFor(`group:${w.daily.group.name}`); return { name: w.daily.group.name, a: p.a, c: p.c }; })() : null, golden });
    if (spec.kind === 'focus') { const g = catalog.sections.find((s) => s.id === spec.group); return packLook({ focus: { slug: spec.group, name: g?.name ?? spec.group, color: g?.color ?? '#FF3E86' }, golden }); }
    return packLook({ theme: spec.kind === 'theme' ? spec.theme : 'all', golden });
  }, [spec, catalog, now, w?.golden.next]);

  if (!dealt) return <div className="wrap page" aria-busy="true"><p className="lede" role="status">Getting your pack.</p></div>;
  // `look` and `packs` are the opening's extra props (see scratchpad B-mounts.md); the existing ones are cards, source, onClose and demo.
  const extra = { look, packs: spec.kind === 'theme' ? spec.packs : 1 };
  return (
    <PackOpening
      cards={dealt.cards} source={dealt.source} {...extra}
      onClose={(then) => { if (then === 'stock') router.replace(kcPath.open(spec.kind === 'theme' ? (spec.theme as 'all') : 'all')); else router.push(kcPath.lobby); }}
      {...(dealt.demo ? { demo: { onSignIn: () => { router.push(kcPath.lobby); signIn({ title: 'Sign in to keep your cards', sub: 'Your demo pack is added to your binder.' }); } } } : {})}
    />
  );
}
