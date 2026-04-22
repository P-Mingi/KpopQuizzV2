'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CardTile } from './card-tile';
import { RARITY_CONFIG, getGroupMeta, type Rarity } from '@/lib/cards/constants';
import {
  playTear, playFlipForRarity, playNewCard, playDuplicate, playCelebration,
} from '@/lib/cards/sounds';

// ---- Types ----

interface PulledCard {
  card_id: string;
  card_number: number;
  name: string;
  rarity: string;
  is_new: boolean;
  duplicate_refund: number;
  group_slug: string;
  group_name: string;
  slug: string;
  art_url: string | null;
  tags: string[];
  position: string | null;
}

export interface PackOpenResult {
  pack_open_id: string;
  cards: PulledCard[];
  best_rarity: string;
  total_new: number;
  total_duplicates: number;
  byeol_refunded: number;
  pity_triggered: boolean;
  new_balance: number;
}

type Phase = 'PACK_DISPLAY' | 'TEARING' | 'CARDS_DOWN' | 'REVEALING' | 'BEST_PULL' | 'SUMMARY';

interface Props {
  result: PackOpenResult;
  packSlug: string;
  isStarter?: boolean;
  balance: number;
  onClose: () => void;
  onOpenAnother?: ((slug: string) => Promise<PackOpenResult | null>) | undefined;
}

// ---- Helpers ----

function useMobile() {
  const [m, setM] = useState(false);
  useEffect(() => {
    setM(window.innerWidth < 768);
    const h = () => setM(window.innerWidth < 768);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  return m;
}

function genSparkles(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    dur: 1.5 + Math.random() * 2,
    delay: Math.random() * 3,
  }));
}

function genParticles(count: number, rarity: string) {
  const colors = rarity === 'SSS'
    ? ['#e8a060', '#f0d0a0', '#ffe8c0', '#fff']
    : ['#c0a0e8', '#d0c0f0', '#e8d0ff', '#fff'];
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    size: 2 + Math.random() * 4,
    dur: 2 + Math.random() * 3,
    delay: Math.random() * 2,
    color: colors[i % colors.length]!,
  }));
}

// ---- Card back ----

function CardBack({ size, delay = 0 }: { size: 'sm' | 'md'; delay?: number }) {
  const w = size === 'sm' ? 60 : 100;
  const h = size === 'sm' ? 90 : 150;
  return (
    <div
      className="relative overflow-hidden rounded-lg"
      style={{
        width: w, height: h,
        background: 'linear-gradient(155deg, #1a1a2e, #0f0f1a)',
        border: '2px solid #2a2a3a',
      }}
    >
      {/* Star pattern */}
      <div className="absolute inset-0 opacity-[0.06]" style={{
        backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)',
        backgroundSize: '12px 12px',
      }} />
      {/* Center logo */}
      <div className="absolute inset-0 flex items-center justify-center text-white/[0.08] font-bold"
        style={{ fontSize: size === 'sm' ? 8 : 11 }}>
        KQ
      </div>
      {/* Shimmer */}
      <div className="absolute inset-0 overflow-hidden">
        <div
          className="absolute top-0 h-full w-[60%] -skew-x-12"
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.04), transparent)',
            animation: `shimmer 2.5s ${delay}s ease-in-out infinite`,
          }}
        />
      </div>
    </div>
  );
}

// ---- Main component ----

export function PackOpeningOverlay({ result, packSlug, isStarter, balance, onClose, onOpenAnother }: Props) {
  const isMobile = useMobile();
  const [phase, setPhase] = useState<Phase>('PACK_DISPLAY');
  const [revealIndex, setRevealIndex] = useState(-1);
  const [showSkip, setShowSkip] = useState(false);
  const [currentBalance, setCurrentBalance] = useState(balance);
  const [currentResult, setCurrentResult] = useState(result);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cards = currentResult.cards;
  const bestCard = cards.reduce((best, c) => {
    const order = (RARITY_CONFIG[c.rarity as Rarity]?.order ?? 0);
    const bestOrder = (RARITY_CONFIG[best.rarity as Rarity]?.order ?? 0);
    return order > bestOrder ? c : best;
  }, cards[0]!);
  const sparkles = useRef(genSparkles(isMobile ? 12 : 20)).current;
  const particles = useRef(genParticles(isMobile ? 30 : 50, bestCard.rarity)).current;

  const groupMeta = getGroupMeta(cards[0]?.group_slug ?? 'bts');

  // Show skip after 2s (not for starter packs)
  useEffect(() => {
    if (isStarter) return;
    const t = setTimeout(() => setShowSkip(true), 2000);
    return () => clearTimeout(t);
  }, [isStarter]);

  // Update balance from result
  useEffect(() => {
    setCurrentBalance(currentResult.new_balance);
  }, [currentResult]);

  // Clean up timers
  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  // ---- Phase transitions ----

  const startTear = useCallback(() => {
    setPhase('TEARING');
    playTear();
    timerRef.current = setTimeout(() => {
      setPhase('CARDS_DOWN');
      timerRef.current = setTimeout(() => {
        setPhase('REVEALING');
        setRevealIndex(0);
      }, 600);
    }, 900);
  }, []);

  // Auto-reveal cards one by one
  useEffect(() => {
    if (phase !== 'REVEALING' || revealIndex < 0) return;
    if (revealIndex >= cards.length) {
      // All revealed, move to best pull
      timerRef.current = setTimeout(() => {
        setPhase('BEST_PULL');
        playCelebration();
        timerRef.current = setTimeout(() => setPhase('SUMMARY'), 2500);
      }, 800);
      return;
    }

    // Play sounds for current card
    const card = cards[revealIndex]!;
    playFlipForRarity(card.rarity);
    setTimeout(() => {
      if (card.is_new) playNewCard();
      else playDuplicate();
    }, 350);

    // Schedule next card
    timerRef.current = setTimeout(() => {
      setRevealIndex(i => i + 1);
    }, 700);
  }, [phase, revealIndex, cards]);

  const handleSkip = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setRevealIndex(cards.length);
    setPhase('SUMMARY');
    if (bestCard.rarity === 'SS' || bestCard.rarity === 'SSS') playCelebration();
  }, [cards.length, bestCard.rarity]);

  const handleOpenAnother = useCallback(async () => {
    if (!onOpenAnother) return;
    const newResult = await onOpenAnother(packSlug);
    if (!newResult) return;
    setCurrentResult(newResult);
    setRevealIndex(-1);
    setPhase('PACK_DISPLAY');
    setShowSkip(false);
    setTimeout(() => setShowSkip(true), 2000);
  }, [onOpenAnother, packSlug]);

  // Rarity breakdown for summary
  const rarityBreakdown = (['R', 'S', 'SS', 'SSS'] as const).map(r => ({
    rarity: r,
    count: cards.filter(c => c.rarity === r).length,
  }));

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden"
        style={{ background: 'radial-gradient(ellipse at 50% 40%, #141428, #0a0a12)' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* Ambient sparkles */}
        {sparkles.map(s => (
          <div key={s.id} className="absolute w-[2px] h-[2px] rounded-full bg-white/[0.12] pointer-events-none"
            style={{ left: `${s.x}%`, top: `${s.y}%`, animation: `sparkle ${s.dur}s ${s.delay}s infinite` }}
          />
        ))}

        {/* Close button */}
        <button onClick={onClose}
          className="absolute top-5 left-5 md:top-6 md:left-8 z-[110] text-xs text-white/15 hover:text-white/30 transition-colors cursor-pointer bg-transparent border-none">
          x Close
        </button>

        {/* Balance */}
        <div className="absolute top-5 right-5 md:top-6 md:right-8 z-[110] flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <span className="text-sm font-bold text-amber-500 tabular-nums">{currentBalance}</span>
          <span className="text-xs">&#11088;</span>
        </div>

        {/* Skip */}
        {showSkip && phase !== 'PACK_DISPLAY' && phase !== 'SUMMARY' && (
          <motion.button
            className="absolute top-14 right-5 md:top-16 md:right-8 z-[110] px-4 py-2 rounded-lg text-xs font-medium text-white/30 hover:text-white/50 transition-colors cursor-pointer"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.06)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={handleSkip}
          >
            Skip &rsaquo;
          </motion.button>
        )}

        {/* ---- PHASE 1: Pack display ---- */}
        {phase === 'PACK_DISPLAY' && (
          <motion.div
            className="text-center cursor-pointer"
            onClick={startTear}
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="relative mx-auto rounded-[18px] overflow-hidden"
              style={{
                width: isMobile ? 180 : 220,
                height: isMobile ? 260 : 320,
                background: `linear-gradient(135deg, ${groupMeta.textColor}, ${groupMeta.textColor}dd, ${groupMeta.textColor}99)`,
                border: `2px solid ${groupMeta.borderColor}`,
                boxShadow: `0 0 30px ${groupMeta.shadowColor}`,
                animation: 'packFloat 3s ease-in-out infinite',
              }}
            >
              <div className="absolute inset-0 opacity-[0.025]" style={{
                backgroundImage: 'repeating-linear-gradient(45deg, white 0px, white 1px, transparent 1px, transparent 8px)',
              }} />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="w-14 h-14 rounded-xl backdrop-blur-md flex items-center justify-center mb-3"
                  style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <span className="text-xl font-extrabold text-white/70">
                    {isStarter ? '!' : groupMeta.abbr}
                  </span>
                </div>
                <p className="text-[15px] font-bold text-white">
                  {isStarter ? 'Starter Pack' : packSlug === 'standard' ? 'Standard Pack' : `${groupMeta.name} Pack`}
                </p>
                <p className="text-[11px] text-white/50">
                  {isStarter ? 'Welcome gift' : '5 cards'}
                </p>
              </div>
            </div>
            <motion.p
              className="mt-6 text-xs text-white/25"
              animate={{ opacity: [0.2, 0.5, 0.2] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              Tap to open...
            </motion.p>
          </motion.div>
        )}

        {/* ---- PHASE 2: Tearing ---- */}
        {phase === 'TEARING' && (
          <div className="relative" style={{ width: isMobile ? 180 : 220, height: isMobile ? 260 : 320 }}>
            {/* Top half */}
            <motion.div
              className="absolute top-0 left-0 w-full overflow-hidden rounded-t-[18px]"
              style={{
                height: '50%',
                background: `linear-gradient(155deg, ${groupMeta.textColor}, ${groupMeta.textColor}dd)`,
                border: '2px solid rgba(212,83,126,0.35)',
                borderBottom: 'none',
              }}
              initial={{ x: 0, y: 0, rotate: 0, opacity: 1 }}
              animate={{ x: -200, y: -120, rotate: -12, opacity: 0 }}
              transition={{ duration: 0.8, ease: 'easeIn' }}
            />
            {/* Bottom half */}
            <motion.div
              className="absolute bottom-0 left-0 w-full overflow-hidden rounded-b-[18px]"
              style={{
                height: '50%',
                background: `linear-gradient(155deg, ${groupMeta.textColor}dd, ${groupMeta.textColor}99)`,
                border: '2px solid rgba(212,83,126,0.35)',
                borderTop: 'none',
              }}
              initial={{ x: 0, y: 0, rotate: 0, opacity: 1 }}
              animate={{ x: 200, y: 120, rotate: 12, opacity: 0 }}
              transition={{ duration: 0.8, ease: 'easeIn' }}
            />
            {/* Light burst */}
            <motion.div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{ width: 300, height: 300, background: 'radial-gradient(circle, rgba(212,83,126,0.35), transparent 70%)' }}
              initial={{ scale: 0.3, opacity: 0 }}
              animate={{ scale: 2.5, opacity: [0, 0.8, 0] }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
          </div>
        )}

        {/* ---- PHASE 3 & 4: Cards (face-down then revealing) ---- */}
        {(phase === 'CARDS_DOWN' || phase === 'REVEALING') && (
          <div className="flex gap-1.5 md:gap-3.5">
            {cards.map((card, i) => {
              const isRevealed = phase === 'REVEALING' && i <= revealIndex;
              return (
                <motion.div
                  key={`${card.card_id}-${i}`}
                  initial={{ y: 80, opacity: 0, scale: 0.6 }}
                  animate={{ y: 0, opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.08, duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
                  className="text-center"
                >
                  {isRevealed ? (
                    <div className="relative">
                      {/* Rarity glow */}
                      <motion.div
                        className="absolute rounded-xl"
                        style={{
                          inset: card.rarity === 'SSS' ? -8 : card.rarity === 'SS' ? -6 : -3,
                          background: getGroupMeta(card.group_slug).shadowColor,
                          filter: `blur(${card.rarity === 'SSS' ? 12 : card.rarity === 'SS' ? 9 : 4}px)`,
                          zIndex: -1,
                        }}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: [0, 1, 0.6] }}
                        transition={{ duration: 0.9 }}
                      />
                      <motion.div
                        initial={{ rotateY: 90, scale: 0.85 }}
                        animate={{ rotateY: 0, scale: 1 }}
                        transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
                        style={{ transformStyle: 'preserve-3d' }}
                      >
                        <CardTile card={card} owned={true} size="sm" showHoverEffect={false} />
                      </motion.div>
                      {/* NEW/DUP badge */}
                      <motion.div
                        className="mt-1"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.3, duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
                      >
                        {card.is_new ? (
                          <span className="text-[7px] md:text-[9px] px-1.5 py-0.5 rounded bg-green-900/25 text-green-400 font-bold">NEW</span>
                        ) : (
                          <span className="text-[7px] md:text-[9px] text-white/25">+{card.duplicate_refund}</span>
                        )}
                      </motion.div>
                    </div>
                  ) : (
                    <CardBack size={isMobile ? 'sm' : 'md'} delay={i * 0.3} />
                  )}
                </motion.div>
              );
            })}
          </div>
        )}

        {/* ---- PHASE 5: Best pull ---- */}
        {phase === 'BEST_PULL' && (
          <div className="text-center relative">
            {/* Falling particles for SS/SSS */}
            {(bestCard.rarity === 'SS' || bestCard.rarity === 'SSS') && particles.map(p => (
              <div key={p.id} className="absolute rounded-full pointer-events-none"
                style={{
                  left: `${p.x}%`, top: -10, width: p.size, height: p.size,
                  background: p.color, animation: `fall ${p.dur}s ${p.delay}s linear infinite`, zIndex: 5,
                }} />
            ))}

            {/* Mini card strip */}
            <div className="flex gap-1.5 justify-center mb-6 opacity-35">
              {cards.map((card, i) => (
                <div key={i} className="relative rounded-md overflow-hidden"
                  style={{
                    width: isMobile ? 36 : 50, height: isMobile ? 54 : 75,
                    background: getGroupMeta(card.group_slug).bg,
                    border: `1.5px solid ${getGroupMeta(card.group_slug).borderColor}`,
                  }}>
                  <span className="absolute top-0.5 right-0.5 text-[5px] md:text-[7px] font-extrabold px-1 rounded"
                    style={{ background: 'rgba(255,255,255,0.65)', color: getGroupMeta(card.group_slug).textColor }}>
                    {card.rarity}
                  </span>
                </div>
              ))}
            </div>

            <motion.p
              className="text-[10px] md:text-xs text-white/20 uppercase tracking-[4px] mb-3"
              initial={{ y: 16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.4 }}
            >
              Best pull
            </motion.p>

            <motion.div
              className="relative inline-block"
              initial={{ scale: 0.5, y: 40, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              transition={{ duration: 0.8, ease: [0.34, 1.56, 0.64, 1] }}
            >
              {/* Glow */}
              <motion.div
                className="absolute rounded-[36px]"
                style={{
                  inset: -28,
                  background: `radial-gradient(ellipse, ${getGroupMeta(bestCard.group_slug).shadowColor}, transparent 70%)`,
                  zIndex: -1,
                }}
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2.5, repeat: Infinity }}
              />
              <CardTile card={bestCard} owned={true} size="lg" showHoverEffect={false} />
            </motion.div>

            <motion.p
              className="mt-4 font-black tracking-[3px]"
              style={{
                fontSize: isMobile ? 18 : 22,
                color: getGroupMeta(bestCard.group_slug).textColor,
                textShadow: `0 0 24px ${getGroupMeta(bestCard.group_slug).shadowColor}, 0 0 48px ${getGroupMeta(bestCard.group_slug).shadowColor}`,
              }}
              initial={{ y: 16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              {bestCard.rarity} PULL!
            </motion.p>
          </div>
        )}

        {/* ---- PHASE 6: Summary ---- */}
        {phase === 'SUMMARY' && (
          <motion.div
            className="mx-4 md:mx-auto md:max-w-[420px] p-4 md:p-5 rounded-2xl w-full"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', backdropFilter: 'blur(12px)' }}
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            {/* Mini cards row */}
            <div className="flex gap-1.5 justify-center mb-3">
              {cards.map((card, i) => (
                <div key={i} className="relative rounded-md overflow-hidden"
                  style={{
                    width: isMobile ? 42 : 55, height: isMobile ? 63 : 82,
                    background: getGroupMeta(card.group_slug).bg,
                    border: `1.5px solid ${getGroupMeta(card.group_slug).borderColor}`,
                  }}>
                  <span className="absolute top-0.5 right-0.5 text-[5px] md:text-[6px] font-extrabold px-0.5 rounded"
                    style={{ background: 'rgba(255,255,255,0.65)', color: getGroupMeta(card.group_slug).textColor }}>
                    {card.rarity}
                  </span>
                  <div className="absolute bottom-0 left-0 right-0 p-0.5">
                    <p className="text-[5px] md:text-[6px] text-white/70 truncate font-medium">{card.name}</p>
                  </div>
                  {card.is_new && (
                    <span className="absolute top-0.5 left-0.5 text-[4px] px-0.5 rounded bg-green-900/40 text-green-400 font-bold">NEW</span>
                  )}
                </div>
              ))}
            </div>

            {/* Rarity breakdown */}
            <div className="flex justify-center gap-3 mb-2">
              {rarityBreakdown.filter(r => r.count > 0).map(({ rarity, count }) => (
                <span key={rarity} className="text-xs font-bold"
                  style={{ color: 'rgba(255,255,255,0.7)' }}>
                  {count}x {rarity}
                </span>
              ))}
            </div>

            {/* Stats */}
            <p className="text-[10px] text-white/25 text-center mb-3.5">
              {currentResult.total_new} new card{currentResult.total_new !== 1 ? 's' : ''}
              {currentResult.total_duplicates > 0 && ` \u00B7 ${currentResult.total_duplicates} dup${currentResult.total_duplicates !== 1 ? 's' : ''} (+${currentResult.byeol_refunded} B)`}
              {currentResult.pity_triggered && ' \u00B7 \uD83C\uDF40 pity'}
            </p>

            {isStarter && (
              <p className="text-center text-xs text-[#D4537E] font-medium mb-3">
                Welcome to your collection!
              </p>
            )}

            {/* Buttons */}
            <div className="flex gap-2">
              {!isStarter && onOpenAnother && (
                <button
                  onClick={handleOpenAnother}
                  disabled={currentBalance < 100}
                  className="flex-1 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  style={{
                    background: currentBalance >= 100 ? '#D4537E' : 'rgba(255,255,255,0.05)',
                    color: currentBalance >= 100 ? '#fff' : 'rgba(255,255,255,0.15)',
                  }}
                >
                  Open another ({currentBalance >= 100 ? '100' : 'need more'} B)
                </button>
              )}
              <button
                onClick={onClose}
                className="flex-1 py-3 rounded-xl text-xs font-medium text-white/45 border border-white/[0.08] hover:bg-white/[0.03] transition-colors cursor-pointer"
              >
                {isStarter ? 'Explore cards' : 'Done'}
              </button>
            </div>
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
