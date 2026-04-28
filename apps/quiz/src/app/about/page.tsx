'use client';

import { useState } from 'react';

const FAQS = [
  { q: 'What is KpopQuiz?', a: 'A fan-made platform to play K-pop quizzes, collect fancards, and compete with other fans.' },
  { q: 'What is Byeol?', a: "Byeol (\uBCC4, 'star' in Korean) is our virtual currency. Earn it by playing quizzes and creating content, then spend it to open card packs." },
  { q: 'Do I need an account?', a: 'You can play quizzes without an account. Sign in to track scores, collect cards, earn XP, and create your own quizzes.' },
  { q: 'How do I create a quiz?', a: "Tap 'Create' in the navigation bar. Choose a quiz type, add questions, and publish. You'll earn Byeol when others play your quiz." },
  { q: 'What are fancards?', a: 'Collectible idol cards with 4 rarity tiers: R (Rare), S (Super Rare), SS (Ultra Rare), SSS (Legendary). Open packs to collect them all.' },
];

export default function AboutPage() {
  const [tab, setTab] = useState<'about' | 'faq'>('about');
  const [openFaq, setOpenFaq] = useState(0);

  return (
    <div style={{ maxWidth: 520, margin: '0 auto', padding: '24px 16px' }}>
      {/* Tab switcher */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 14 }}>
        {([{ id: 'about' as const, label: 'About' }, { id: 'faq' as const, label: 'FAQ' }]).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: '6px 14px', borderRadius: 8,
            background: tab === t.id ? '#D4537E' : '#fff',
            color: tab === t.id ? '#fff' : '#888780',
            border: `1px solid ${tab === t.id ? '#D4537E' : '#e8e6e0'}`,
            fontSize: 10, fontWeight: 600, cursor: 'pointer',
          }}>{t.label}</button>
        ))}
      </div>

      {tab === 'about' && (
        <div style={{ borderRadius: 14, background: '#fff', border: '1px solid #e8e6e0', overflow: 'hidden' }}>
          <div style={{
            padding: '20px 16px', textAlign: 'center',
            background: 'linear-gradient(135deg, rgba(212,83,126,0.04), rgba(232,160,96,0.04))',
            borderBottom: '1px solid rgba(0,0,0,0.04)',
          }}>
            <p style={{ fontSize: 18, fontWeight: 700, color: '#2c2c2a', margin: 0 }}>
              <span style={{ fontWeight: 800 }}>kpop</span><span style={{ color: '#D4537E' }}>quiz</span>
            </p>
            <p style={{ fontSize: 10, color: '#888780', margin: 0, marginTop: 4 }}>Made with {'\u2661'} by fans, for fans</p>
          </div>
          <div style={{ padding: '14px 16px' }}>
            <p style={{ fontSize: 11, color: '#555550', margin: 0, lineHeight: 1.7, marginBottom: 12 }}>
              KpopQuiz is a community platform where K-pop fans create and play quizzes about their favorite groups, collect digital fancards, and compete on leaderboards.
            </p>
            <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
              {[
                { num: '42k+', label: 'Quizzes played' },
                { num: '500+', label: 'Quizzes created' },
                { num: '3k+', label: 'Fans weekly' },
              ].map(s => (
                <div key={s.label} style={{
                  flex: 1, padding: '8px', borderRadius: 8, textAlign: 'center',
                  background: 'rgba(212,83,126,0.03)', border: '1px solid rgba(212,83,126,0.06)',
                }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#D4537E', margin: 0 }}>{s.num}</p>
                  <p style={{ fontSize: 7, color: '#b4b2a9', margin: 0, marginTop: 2 }}>{s.label}</p>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                { icon: '\uD83C\uDFAE', title: '5 quiz types', desc: 'Classic, Image, Intruder, True/False, Clues' },
                { icon: '\uD83C\uDCCF', title: 'Fancard collection', desc: '52 cards across 5 groups with gacha system' },
                { icon: '\u2B50', title: 'Byeol economy', desc: 'Earn currency by playing and creating' },
                { icon: '\uD83D\uDCCA', title: 'Leaderboards', desc: 'Compete for top spots weekly and all-time' },
              ].map(f => (
                <div key={f.title} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0' }}>
                  <span style={{ fontSize: 16 }}>{f.icon}</span>
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 600, color: '#2c2c2a', margin: 0 }}>{f.title}</p>
                    <p style={{ fontSize: 8, color: '#888780', margin: 0, marginTop: 1 }}>{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'faq' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {FAQS.map((faq, i) => (
            <div key={i} onClick={() => setOpenFaq(openFaq === i ? -1 : i)} style={{
              borderRadius: 10, background: '#fff',
              border: `1px solid ${openFaq === i ? 'rgba(212,83,126,0.15)' : '#e8e6e0'}`,
              overflow: 'hidden', cursor: 'pointer',
              transition: 'border-color 0.15s',
            }}>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 12px',
                background: openFaq === i ? 'rgba(212,83,126,0.03)' : 'transparent',
              }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#2c2c2a' }}>{faq.q}</span>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke={openFaq === i ? '#D4537E' : '#b4b2a9'} strokeWidth="1.5" strokeLinecap="round" style={{
                  transition: 'transform 0.2s', transform: openFaq === i ? 'rotate(180deg)' : 'rotate(0deg)', flexShrink: 0,
                }}><path d="M3 4.5L6 7.5 9 4.5" /></svg>
              </div>
              {openFaq === i && (
                <div style={{ padding: '0 12px 10px' }}>
                  <p style={{ fontSize: 10, color: '#888780', margin: 0, lineHeight: 1.6 }}>{faq.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
