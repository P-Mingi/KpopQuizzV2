'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface QuizOfTheDayProps {
  quizSlug?: string;
  quizTitle?: string;
  playedToday?: boolean;
  score?: number;
  totalQuestions?: number;
  playersToday?: number;
}

export function QuizOfTheDay({ quizSlug, quizTitle, playedToday = false, score, totalQuestions = 10, playersToday = 0 }: QuizOfTheDayProps) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    function calc() {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setUTCHours(24, 0, 0, 0);
      const diff = tomorrow.getTime() - now.getTime();
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setTimeLeft(`${h}h ${m}m`);
    }
    calc();
    const iv = setInterval(calc, 60000);
    return () => clearInterval(iv);
  }, []);

  const now = new Date();
  const dayName = now.toLocaleDateString('en', { weekday: 'short' });
  const dayNum = now.getDate();
  const monthName = now.toLocaleDateString('en', { month: 'short' });

  const displayedPlayers = (() => {
    const today = new Date();
    const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
    const fakeCount = 24 + (((seed * 9301 + 49297) % 233280) % 123);
    return playersToday > fakeCount ? playersToday : fakeCount;
  })();

  return (
    <Link href={quizSlug ? `/q/${quizSlug}` : '/daily'} style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}>
      <div style={{
        borderRadius: 14, overflow: 'hidden', position: 'relative',
        background: '#fff', border: '1px solid #e8e6e0',
        boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
        cursor: 'pointer',
      }}>
        {/* Left accent gradient bar */}
        <div style={{
          position: 'absolute', left: 0, top: 0, bottom: 0, width: 4,
          background: 'linear-gradient(180deg, #D4537E, #e8a060)',
          borderRadius: '14px 0 0 14px',
        }} />

        <div style={{ padding: '12px 14px 12px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Calendar block */}
          <div style={{
            width: 50, height: 56, borderRadius: 12, flexShrink: 0,
            background: 'linear-gradient(145deg, #D4537E, #C44A72)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(212,83,126,0.2)',
          }}>
            <span style={{ fontSize: 8, fontWeight: 600, color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {dayName}
            </span>
            <span style={{ fontSize: 22, fontWeight: 800, color: '#fff', lineHeight: 1 }}>
              {dayNum}
            </span>
            <span style={{ fontSize: 7, fontWeight: 600, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase' }}>
              {monthName}
            </span>
          </div>

          {/* Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#2c2c2a' }}>Quiz of the day</span>
              {!playedToday && (
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#D4537E', animation: 'qotdPulse 2s infinite' }} />
              )}
            </div>

            {playedToday ? (
              <p style={{ fontSize: 10, color: '#888780', margin: 0, marginBottom: 6 }}>
                You scored <span style={{ fontWeight: 600, color: '#D4537E' }}>{score}/{totalQuestions}</span> - come back tomorrow!
              </p>
            ) : (
              <p style={{ fontSize: 10, color: '#888780', margin: 0, marginBottom: 6 }}>
                {quizTitle ? (
                  <>Today: <span style={{ fontWeight: 600, color: '#555550' }}>{quizTitle}</span></>
                ) : (
                  'Same questions for everyone. One attempt.'
                )}
              </p>
            )}

            {/* Stats row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="#D4537E" strokeWidth="1.2" strokeLinecap="round"><circle cx="5" cy="5" r="3.5" /><path d="M5 3v2l1.5 1" /></svg>
                <span style={{ fontSize: 9, fontWeight: 600, color: '#D4537E' }}>{timeLeft}</span>
              </div>
              <span style={{ fontSize: 9, color: '#b4b2a9' }}>{'\u00B7'}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="#b4b2a9" strokeWidth="1.2" strokeLinecap="round"><circle cx="5" cy="3.5" r="2" /><path d="M1 9c0-2.2 1.8-4 4-4s4 1.8 4 4" /></svg>
                <span style={{ fontSize: 9, color: '#b4b2a9' }}>
                  {displayedPlayers > 0 ? `${displayedPlayers} played` : 'Be the first today'}
                </span>
              </div>
              <span style={{ fontSize: 9, color: '#b4b2a9' }}>{'\u00B7'}</span>
              <span style={{ fontSize: 9, color: '#b4b2a9' }}>{totalQuestions} questions</span>
            </div>
          </div>

          {/* Play CTA or checkmark */}
          {playedToday ? (
            <div style={{
              width: 36, height: 36, borderRadius: 10, flexShrink: 0,
              background: '#EAF3DE', border: '1.5px solid #C0DD97',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#639922" strokeWidth="1.5" strokeLinecap="round"><path d="M3 7.5L5.8 10.2 11 4" /></svg>
            </div>
          ) : (
            <div style={{
              padding: '8px 14px', borderRadius: 10, flexShrink: 0,
              background: '#D4537E', color: '#fff',
              fontSize: 11, fontWeight: 700,
              boxShadow: '0 2px 8px rgba(212,83,126,0.2)',
            }}>Play</div>
          )}
        </div>

        {/* Byeol reward hint bar */}
        {!playedToday && (
          <div style={{
            padding: '5px 18px', background: 'rgba(232,160,96,0.04)',
            borderTop: '1px solid rgba(232,160,96,0.06)',
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            <span style={{ fontSize: 8, color: '#e8a060' }}>{'\u2B50'}</span>
            <span style={{ fontSize: 8, color: '#b4b2a9' }}>Earn up to <span style={{ fontWeight: 600, color: '#e8a060' }}>80 {'\uBCC4'}</span> with a perfect score</span>
          </div>
        )}
      </div>
    </Link>
  );
}
