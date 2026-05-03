'use client';

import { useState, useEffect } from 'react';

interface EligibilityHintProps {
  contentType: 'quiz' | 'blindtest' | 'game_name_all';
  contentId?: string;
  maxReward: number;
}

interface Eligibility {
  is_eligible: boolean;
  reason: string;
  earned_today: number;
  daily_cap: number;
  max_reward: number;
}

export function ByeolEligibilityHint({ contentType, contentId, maxReward }: EligibilityHintProps) {
  const [eligibility, setEligibility] = useState<Eligibility | null>(null);

  useEffect(() => {
    const params = new URLSearchParams({ type: contentType });
    if (contentId) params.set('id', contentId);

    fetch(`/api/byeol/eligibility?${params.toString()}`)
      .then(r => r.ok ? r.json() : null)
      .then(setEligibility)
      .catch(() => null);
  }, [contentType, contentId]);

  // Loading or guest user
  if (!eligibility) {
    return (
      <p style={{ fontSize: 8, color: '#b4b2a9', textAlign: 'center', marginTop: 6 }}>
        Earn up to <span style={{ color: '#e8a060', fontWeight: 600 }}>{maxReward} {'\uBCC4'}</span> by completing this
      </p>
    );
  }

  // Layer 1: already earned for this content
  if (!eligibility.is_eligible && eligibility.reason === 'Already earned') {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
        marginTop: 6, padding: '4px 10px', borderRadius: 8,
        background: 'rgba(39,174,96,0.06)', border: '1px solid rgba(39,174,96,0.1)',
      }}>
        <span style={{ fontSize: 9, color: '#27ae60', fontWeight: 600 }}>Already earned</span>
        <span style={{ fontSize: 8, color: '#b4b2a9' }}> - replay for fun!</span>
      </div>
    );
  }

  // Layer 2: daily cap reached
  if (!eligibility.is_eligible && eligibility.reason === 'Daily cap reached') {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
        marginTop: 6, padding: '4px 10px', borderRadius: 8,
        background: 'rgba(232,160,96,0.06)', border: '1px solid rgba(232,160,96,0.12)',
      }}>
        <span style={{ fontSize: 9, color: '#e8a060', fontWeight: 600 }}>
          {eligibility.earned_today}/{eligibility.daily_cap} {'\uBCC4'} today
        </span>
        <span style={{ fontSize: 8, color: '#b4b2a9' }}> - resets at midnight UTC</span>
      </div>
    );
  }

  // Layer 2: still has room today
  if (eligibility.daily_cap > 0) {
    const remaining = eligibility.daily_cap - eligibility.earned_today;
    return (
      <p style={{ fontSize: 8, color: '#b4b2a9', textAlign: 'center', marginTop: 6 }}>
        Earn up to <span style={{ color: '#e8a060', fontWeight: 600 }}>{remaining} {'\uBCC4'}</span> more today
        <span style={{ color: '#d3d1c7' }}> ({eligibility.earned_today}/{eligibility.daily_cap})</span>
      </p>
    );
  }

  // Default: eligible Layer 1 content
  return (
    <p style={{ fontSize: 8, color: '#b4b2a9', textAlign: 'center', marginTop: 6 }}>
      Earn up to <span style={{ color: '#e8a060', fontWeight: 600 }}>{maxReward} {'\uBCC4'}</span> by completing this
    </p>
  );
}
