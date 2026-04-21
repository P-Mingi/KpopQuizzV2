'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface ByeolGainProps {
  amount: number;
  xpBonusAmount?: number;
  newBalance: number;
  canOpenPack: boolean;
}

export function ByeolGain({ amount, xpBonusAmount = 0, newBalance, canOpenPack }: ByeolGainProps) {
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [count, setCount] = useState(0);
  const [sparkles, setSparkles] = useState<Array<{ id: number; x: number; y: number; delay: number; size: number }>>([]);
  const [showCTA, setShowCTA] = useState(false);
  const [pulsed, setPulsed] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);

  function playTone(freq: number, dur: number, type: OscillatorType = 'sine') {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + dur);
    } catch { /* audio not available */ }
  }

  useEffect(() => {
    const entranceTimer = setTimeout(() => {
      setVisible(true);

      playTone(400, 0.2, 'triangle');
      setTimeout(() => playTone(500, 0.2, 'triangle'), 80);
      setTimeout(() => playTone(650, 0.3, 'triangle'), 160);

      let current = 0;
      const step = Math.max(1, Math.ceil(amount / 20));
      const countInterval = setInterval(() => {
        current += step;
        if (current >= amount) { current = amount; clearInterval(countInterval); }
        setCount(current);
        if (current > 0 && current < amount && current % Math.ceil(amount / 4) === 0) {
          playTone(550 + current * 3, 0.1, 'sine');
        }
      }, 30);

      const celebTimer = setTimeout(() => {
        setPulsed(true);

        playTone(600, 0.15, 'triangle');
        setTimeout(() => playTone(750, 0.15, 'triangle'), 100);
        setTimeout(() => playTone(900, 0.25, 'triangle'), 200);

        setSparkles(
          Array.from({ length: 12 }, (_, i) => ({
            id: i,
            x: 20 + Math.random() * 60,
            y: Math.random() * 100,
            delay: Math.random() * 0.5,
            size: 3 + Math.random() * 4,
          }))
        );

        if (canOpenPack) {
          setTimeout(() => setShowCTA(true), 400);
        }
      }, 800);

      return () => {
        clearInterval(countInterval);
        clearTimeout(celebTimer);
      };
    }, 700);

    return () => clearTimeout(entranceTimer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [amount, canOpenPack]);

  if (!visible) return null;

  const oldBalance = newBalance - amount - (xpBonusAmount || 0);

  return (
    <div style={{ marginTop: 8, animation: "byeolSlideIn 0.4s cubic-bezier(0.34,1.56,0.64,1)" }}>
      <div style={{
        padding: "10px 12px", borderRadius: 10, position: "relative", overflow: "hidden",
        background: "linear-gradient(135deg, rgba(232,160,96,0.06), rgba(232,160,96,0.02))",
        border: "1px solid rgba(232,160,96,0.15)",
      }}>
        {/* Sparkles */}
        {sparkles.map(s => (
          <div key={s.id} style={{
            position: "absolute", left: `${s.x}%`, top: `${s.y}%`,
            width: s.size, height: s.size, borderRadius: "50%",
            background: "#e8a060", opacity: 0,
            animation: `byeolSparkle 0.8s ${s.delay}s ease-out forwards`,
          }} />
        ))}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", position: "relative", zIndex: 2 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8,
              background: "rgba(232,160,96,0.12)",
              display: "flex", alignItems: "center", justifyContent: "center",
              animation: pulsed ? "byeolIconPulse 0.6s ease-out" : "none",
              boxShadow: pulsed ? "0 0 12px rgba(232,160,96,0.25)" : "none",
              transition: "box-shadow 0.3s",
            }}>
              <span style={{ fontSize: 14 }}>&#11088;</span>
            </div>
            <div>
              <span style={{ fontSize: 10, fontWeight: 600, color: "#854F0B" }}>Byeol earned</span>
              <div style={{ display: "flex", alignItems: "center", gap: 3, marginTop: 1 }}>
                <span style={{ fontSize: 8, color: "#b4b2a9" }}>Balance: {oldBalance} &rarr; {newBalance}</span>
              </div>
            </div>
          </div>

          <div style={{ textAlign: "right" }}>
            <span style={{
              fontSize: 18, fontWeight: 700, color: "#e8a060",
              fontVariantNumeric: "tabular-nums",
              animation: pulsed ? "byeolNumberPop 0.4s ease-out" : "none",
              display: "inline-block",
            }}>
              +{count}
            </span>
            <span style={{ fontSize: 10, color: "#e8a060", marginLeft: 2, fontWeight: 500 }}>B</span>
          </div>
        </div>

        {showCTA && (
          <div style={{
            marginTop: 8, paddingTop: 8,
            borderTop: "1px solid rgba(232,160,96,0.1)",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            animation: "byeolSlideIn 0.3s ease-out",
          }}>
            <span style={{ fontSize: 9, color: "#b4b2a9" }}>You can open a pack!</span>
            <div
              onClick={() => router.push('/cards')}
              style={{
                display: "flex", alignItems: "center", gap: 3,
                padding: "4px 10px", borderRadius: 6,
                background: "rgba(232,160,96,0.1)", border: "1px solid rgba(232,160,96,0.15)",
                cursor: "pointer",
              }}
            >
              <span style={{ fontSize: 9, fontWeight: 600, color: "#e8a060" }}>Open pack</span>
              <span style={{ fontSize: 8 }}>&#127183;</span>
            </div>
          </div>
        )}
      </div>

      {xpBonusAmount > 0 && pulsed && (
        <p style={{
          fontSize: 8, color: "#d3d1c7", textAlign: "center", marginTop: 6,
          animation: "byeolSlideIn 0.3s 0.2s both",
        }}>
          +{xpBonusAmount} B bonus from XP conversion
        </p>
      )}
    </div>
  );
}
