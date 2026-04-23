'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface QuizOfTheDayProps {
  quizSlug?: string;
  playedToday?: boolean;
  score?: number;
  totalQuestions?: number;
  playersToday?: number;
}

export function QuizOfTheDay({ quizSlug, playedToday = false, score, totalQuestions = 10, playersToday = 0 }: QuizOfTheDayProps) {
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

  return (
    <Link href={quizSlug ? `/q/${quizSlug}` : '/'} style={{
      display: "block", textDecoration: "none", color: "inherit",
      borderRadius: 14, overflow: "hidden", position: "relative",
      background: "#fff", border: "1.5px solid #F4C0D1",
      boxShadow: "0 2px 12px rgba(212,83,126,0.06)",
    }}>
      {/* Top accent bar */}
      <div style={{ height: 3, background: "linear-gradient(90deg, #D4537E, #ED93B1, #D4537E)", backgroundSize: "200% 100%", animation: "dailyShimmer 3s linear infinite" }} />

      <div style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: 12 }}>
        {/* Left: calendar-style date block */}
        <div style={{
          width: 48, height: 52, borderRadius: 10, flexShrink: 0,
          background: "linear-gradient(145deg, #D4537E, #C44A72)",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          boxShadow: "0 4px 12px rgba(212,83,126,0.25)",
        }}>
          <span style={{ fontSize: 8, fontWeight: 600, color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: 0.5 }}>
            {dayName}
          </span>
          <span style={{ fontSize: 20, fontWeight: 700, color: "#fff", lineHeight: 1 }}>
            {dayNum}
          </span>
          <span style={{ fontSize: 7, fontWeight: 600, color: "rgba(255,255,255,0.5)", textTransform: "uppercase" }}>
            {monthName}
          </span>
        </div>

        {/* Middle: info */}
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#2c2c2a" }}>Quiz of the day</span>
            {!playedToday && (
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#D4537E", animation: "pulse 2s infinite" }} />
            )}
          </div>

          {playedToday ? (
            <p style={{ fontSize: 10, color: "#b4b2a9", margin: 0, lineHeight: 1.4 }}>
              You scored <span style={{ fontWeight: 600, color: "#D4537E" }}>{score}/{totalQuestions}</span> -- come back tomorrow!
            </p>
          ) : (
            <p style={{ fontSize: 10, color: "#b4b2a9", margin: 0, lineHeight: 1.4 }}>
              Same questions for everyone. One attempt. Compare your score.
            </p>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="#D4537E" strokeWidth="1.2" strokeLinecap="round"><circle cx="5" cy="5" r="3.5" /><path d="M5 3v2l1.5 1" /></svg>
              <span style={{ fontSize: 9, fontWeight: 600, color: "#D4537E" }}>{timeLeft}</span>
            </div>
            <span style={{ fontSize: 9, color: "#d3d1c7" }}>&middot;</span>
            <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="#b4b2a9" strokeWidth="1.2" strokeLinecap="round"><circle cx="5" cy="3.5" r="2" /><path d="M1 9c0-2.2 1.8-4 4-4s4 1.8 4 4" /></svg>
              <span style={{ fontSize: 9, color: "#b4b2a9" }}>
                {(() => {
                  const today = new Date();
                  const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
                  const fakeCount = 24 + (((seed * 9301 + 49297) % 233280) % 123);
                  const displayed = playersToday > fakeCount ? playersToday : fakeCount;
                  return `${displayed} played today`;
                })()}
              </span>
            </div>
          </div>
        </div>

        {/* Right: play button or checkmark */}
        {playedToday ? (
          <div style={{
            width: 36, height: 36, borderRadius: 10, flexShrink: 0,
            background: "#EAF3DE", border: "1.5px solid #C0DD97",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#639922" strokeWidth="1.5" strokeLinecap="round"><path d="M3 7.5L5.8 10.2 11 4" /></svg>
          </div>
        ) : (
          <div style={{
            width: 36, height: 36, borderRadius: 10, flexShrink: 0,
            background: "#FAF2F5", border: "1.5px solid #F4C0D1",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="#D4537E"><path d="M4.5 2.5l7 4.5-7 4.5z" /></svg>
          </div>
        )}
      </div>
    </Link>
  );
}
