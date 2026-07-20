'use client';

import { useEffect } from 'react';

import { badgeIconFor } from '@/lib/badges';

import type { BadgeDefinition } from '@/lib/db/types';

interface Props {
  badge: BadgeDefinition;
  earned: boolean;
  earnedAt?: string | null;
  onClose: () => void;
}

// Badge lightbox (M1.15 follow-up). Tapping a coin opens it big enough to
// actually read the art, with what it is and how it is earned. Locked badges
// stay frosted here too, so opening one is a teaser rather than a spoiler.
export function BadgeDetailModal({ badge, earned, earnedAt, onClose }: Props): React.ReactElement {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const icon = badge.icon ?? badgeIconFor(badge.id);
  const earnedLabel = earnedAt
    ? new Date(earnedAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : null;

  return (
    <div
      className="bdm-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={badge.name}
      onClick={onClose}
    >
      <style>{MODAL_CSS}</style>
      <div className="bdm-panel" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="bdm-close" onClick={onClose} aria-label="Close">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>

        <div className={`bdm-art ${earned ? '' : 'is-locked'}`}>
          {icon ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={icon} alt={badge.name} className="bdm-img" />
          ) : (
            <span
              className="bdm-fallback"
              style={{ background: badge.color_bg, borderColor: badge.color_stroke, color: badge.color_text }}
            >
              {badge.name.slice(0, 1).toUpperCase()}
            </span>
          )}
        </div>

        <p className="bdm-name">{badge.name}</p>
        <p className="bdm-desc">{badge.description}</p>

        <span className={`bdm-state ${earned ? 'is-earned' : ''}`}>
          {earned ? (earnedLabel ? `Earned ${earnedLabel}` : 'Earned') : 'Not earned yet'}
        </span>
      </div>
    </div>
  );
}

const MODAL_CSS = `
.bdm-backdrop{
  position:fixed;inset:0;z-index:60;display:grid;place-items:center;padding:20px;
  background:rgba(0,0,0,.55);backdrop-filter:blur(2px);
}
.bdm-panel{
  position:relative;width:min(320px,100%);text-align:center;
  background:var(--surface);border:1px solid var(--border);border-radius:20px;
  padding:26px 22px 22px;box-shadow:0 24px 60px -20px rgba(0,0,0,.5);
}
.bdm-close{
  position:absolute;top:8px;right:8px;width:44px;height:44px;display:grid;place-items:center;
  border:none;background:transparent;color:var(--txt3);cursor:pointer;border-radius:50%;
}
.bdm-close:hover{color:var(--txt1)}
.bdm-art{width:150px;height:150px;margin:0 auto;display:grid;place-items:center}
.bdm-img{width:100%;height:100%;object-fit:contain}
.bdm-art.is-locked .bdm-img{filter:grayscale(1) blur(7px) contrast(.5);opacity:.32}
.bdm-fallback{
  width:110px;height:110px;border-radius:50%;border:2px solid;display:grid;place-items:center;
  font-weight:800;font-size:36px;
}
.bdm-art.is-locked .bdm-fallback{filter:grayscale(1) blur(6px);opacity:.34}
.bdm-name{font-size:17px;font-weight:700;color:var(--txt1);margin:14px 0 0}
.bdm-desc{font-size:13px;color:var(--txt2);margin:6px 0 0;line-height:1.5}
.bdm-state{
  display:inline-block;margin-top:14px;padding:5px 12px;border-radius:999px;
  font-size:11.5px;font-weight:600;color:var(--txt3);background:var(--surface-alt);
}
.bdm-state.is-earned{background:var(--brand-light);color:var(--brand-dark)}
@media (prefers-reduced-motion: no-preference){
  .bdm-panel{animation:bdmIn .18s cubic-bezier(.2,.8,.2,1) both}
  @keyframes bdmIn{from{opacity:0;transform:translateY(6px) scale(.98)}to{opacity:1;transform:none}}
}
`;
