'use client';

import { useState } from 'react';
import Link from 'next/link';
import { BoosterPack } from '@/components/cards/booster-pack';
import { PackOpeningOverlay, type PackOpenResult } from '@/components/cards/pack-opening-overlay';
import { RARITY_CONFIG } from '@/lib/cards/constants';

interface GroupStat {
  slug: string;
  name: string;
  abbr: string;
  color: string;
  total: number;
  owned: number;
}

interface Props {
  data: {
    isLoggedIn: boolean;
    userId: string | null;
    byeol: number;
    groupStats: GroupStat[];
    totalCards: number;
    totalOwned: number;
    needsStarter: boolean;
    recentPulls: unknown[];
    rotation: {
      groupSlug: string;
      groupName: string;
      nextGroupName: string;
      endsAt: string;
      msRemaining: number;
    };
    packs: Array<{ slug: string; cost: number; pack_type: string; group_slug: string | null }>;
  };
}

function formatCountdown(ms: number): string {
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  if (days > 0) return `${days}d ${hours}h left`;
  return `${hours}h left`;
}

export function CardsLanding({ data }: Props) {
  const [showEarnInfo, setShowEarnInfo] = useState(false);
  const [starterOpened, setStarterOpened] = useState(!data.needsStarter);
  const [showOverlay, setShowOverlay] = useState(false);
  const [packResult, setPackResult] = useState<PackOpenResult | null>(null);
  const [overlayPackSlug, setOverlayPackSlug] = useState('');
  const [isStarterOpen, setIsStarterOpen] = useState(false);
  const [currentByeol, setCurrentByeol] = useState(data.byeol);

  const standardPack = data.packs.find(p => p.pack_type === 'standard');
  const groupPack = data.packs.find(p => p.group_slug === data.rotation.groupSlug);

  async function callOpenPack(packSlug: string): Promise<PackOpenResult | null> {
    if (!data.isLoggedIn || !data.userId) return null;
    try {
      const { createBrowserClient } = await import('@/lib/supabase/client');
      const supabase = createBrowserClient();
      const { data: result, error } = await supabase.rpc('dev_open_card_pack', {
        p_user_id: data.userId,
        p_pack_slug: packSlug,
      });
      if (error) { alert(error.message); return null; }
      return result as PackOpenResult;
    } catch (err) {
      console.error(err);
      return null;
    }
  }

  async function handleOpenPack(packSlug: string) {
    const result = await callOpenPack(packSlug);
    if (!result) return;
    setPackResult(result);
    setOverlayPackSlug(packSlug);
    setIsStarterOpen(false);
    setCurrentByeol(result.new_balance);
    setShowOverlay(true);
  }

  async function handleOpenStarter() {
    if (!data.isLoggedIn || !data.userId) return;
    try {
      const { createBrowserClient } = await import('@/lib/supabase/client');
      const supabase = createBrowserClient();
      const { data: result, error } = await supabase.rpc('dev_open_starter_pack', { p_user_id: data.userId });
      if (error) { alert(error.message); return; }
      if (result?.already_opened) return;
      setStarterOpened(true);
      // Show starter result in overlay
      const starterResult: PackOpenResult = {
        pack_open_id: 'starter',
        cards: result.cards,
        best_rarity: 'R',
        total_new: result.cards.length,
        total_duplicates: 0,
        byeol_refunded: 0,
        pity_triggered: false,
        new_balance: currentByeol,
      };
      setPackResult(starterResult);
      setOverlayPackSlug('starter');
      setIsStarterOpen(true);
      setShowOverlay(true);
    } catch (err) {
      console.error(err);
    }
  }

  async function handleOpenAnother(slug: string): Promise<PackOpenResult | null> {
    const result = await callOpenPack(slug);
    if (result) setCurrentByeol(result.new_balance);
    return result;
  }

  return (
    <div className="pb-12">
      {/* Auth banner */}
      {!data.isLoggedIn && (
        <div className="p-4 rounded-xl bg-[#FAF2F5] border border-[#F4C0D1] text-center mb-6">
          <p className="text-sm font-medium text-[#993556]">Sign in to start collecting cards and earning Byeol</p>
          <Link href="/login" className="inline-block mt-2 px-5 py-2 rounded-lg bg-[#D4537E] text-white text-xs font-semibold">
            Sign in
          </Link>
        </div>
      )}

      {/* Starter pack banner */}
      {data.isLoggedIn && !starterOpened && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 mb-6">
          <p className="text-sm font-bold text-amber-900 mb-1">Welcome to Cards!</p>
          <p className="text-xs text-amber-700 mb-3">Here&apos;s a free starter pack with 5 cards to get you started.</p>
          <button
            onClick={handleOpenStarter}
            className="px-5 py-2 rounded-lg bg-[#D4537E] text-white text-xs font-semibold hover:bg-[#C44A72] transition-colors"
          >
            Open your starter pack
          </button>
        </div>
      )}

      {/* Balance */}
      {data.isLoggedIn && (
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-lg font-bold text-primary">Open Packs</h1>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-100">
            <span className="text-sm font-bold text-amber-600 tabular-nums">{currentByeol.toLocaleString()}</span>
            <span className="text-xs">&#11088;</span>
          </div>
        </div>
      )}

      {/* Pack shop */}
      <div className="flex gap-4 justify-center mb-4 overflow-x-auto pb-2">
        <BoosterPack
          type="standard"
          cost={standardPack?.cost ?? 100}
          onClick={() => handleOpenPack(standardPack?.slug ?? 'standard')}
          disabled={!data.isLoggedIn || currentByeol < (standardPack?.cost ?? 100)}
        />
        <BoosterPack
          type="group"
          cost={groupPack?.cost ?? 150}
          groupSlug={data.rotation.groupSlug}
          endsIn={formatCountdown(data.rotation.msRemaining)}
          onClick={() => handleOpenPack(groupPack?.slug ?? 'standard')}
          disabled={!data.isLoggedIn || currentByeol < (groupPack?.cost ?? 150)}
        />
      </div>

      {/* Pack info */}
      <div className="text-center mb-6">
        <p className="text-[10px] text-tertiary mb-1">
          R {RARITY_CONFIG.R.drop} &middot; S {RARITY_CONFIG.S.drop} &middot; SS {RARITY_CONFIG.SS.drop} &middot; SSS {RARITY_CONFIG.SSS.drop}
        </p>
        <p className="text-[10px] text-tertiary">Every pack: guaranteed at least 1 S or higher</p>
        <p className="text-[10px] text-secondary mt-1">
          Rotation: {data.rotation.groupName} this week &middot; Next: {data.rotation.nextGroupName}
        </p>
      </div>

      {/* How to earn */}
      <button
        onClick={() => setShowEarnInfo(!showEarnInfo)}
        className="w-full text-left text-xs font-medium text-tertiary hover:text-secondary transition-colors mb-3"
      >
        How to earn &#11088; Byeol {showEarnInfo ? '\u25B2' : '\u25BC'}
      </button>
      {showEarnInfo && (
        <div className="grid grid-cols-2 gap-2 mb-6 text-[10px] text-secondary">
          {[
            ['Play quizzes', '30-50 B'],
            ['Daily quiz', '50-80 B'],
            ['Blindtest', '30 B'],
            ['Name All perfect', '50 B'],
            ['This or That', '20 B'],
            ['Quiz creation', '30 B'],
            ['Daily login', '20 B'],
            ['7-day streak', '100 B'],
          ].map(([src, amt]) => (
            <div key={src as string} className="flex justify-between px-3 py-1.5 rounded-lg bg-elevated">
              <span>{src}</span>
              <span className="font-medium text-amber-600">{amt}</span>
            </div>
          ))}
        </div>
      )}

      {/* Collection overview */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-primary">My Collection</h2>
          <Link href="/cards/collection" className="text-[11px] font-medium text-accent hover:underline">
            View all {data.totalOwned}/{data.totalCards} &rarr;
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
          {data.groupStats.map(g => (
            <Link key={g.slug} href={`/cards/${g.slug}`}>
              <div className="p-3.5 rounded-xl border border-[#E8E6E0] bg-white hover:border-[#D4537E] transition-all cursor-pointer">
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center text-[10px] font-extrabold text-white/70"
                    style={{ background: g.color }}>
                    {g.abbr}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-primary">{g.name}</p>
                    <p className="text-[10px] text-secondary">{g.owned}/{g.total} cards</p>
                  </div>
                </div>
                <div className="h-[5px] rounded-full bg-[#F0EDE8] overflow-hidden">
                  <div className="h-[5px] rounded-full bg-[#D4537E] transition-all duration-500"
                    style={{ width: `${g.total > 0 ? (g.owned / g.total) * 100 : 0}%` }} />
                </div>
                {g.owned === g.total && g.total > 0 && (
                  <div className="mt-2 flex items-center gap-1 text-[9px] font-semibold text-[#D4537E]">
                    <span>&#10003;</span> Complete!
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Pack opening overlay */}
      {showOverlay && packResult && (
        <PackOpeningOverlay
          result={packResult}
          packSlug={overlayPackSlug}
          isStarter={isStarterOpen}
          balance={currentByeol}
          onClose={() => {
            setShowOverlay(false);
            window.location.reload();
          }}
          onOpenAnother={isStarterOpen ? undefined : handleOpenAnother}
        />
      )}
    </div>
  );
}
