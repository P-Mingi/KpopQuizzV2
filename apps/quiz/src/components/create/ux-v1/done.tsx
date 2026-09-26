'use client';

import { useState } from 'react';

import { Mascot } from '@/components/ui/mascot';
import { Icon } from '@/components/ux-v1/icon';
import { useUxToast } from '@/components/ux-v1/toast';
import { creatorNudge } from '@/lib/creator-progress';
import { copyShareLink } from '@/lib/share';

import type { CreateFunnel } from '@/lib/ux-v1/p5/use-create-funnel';

// Done state (prototype #pub-done): the live URL + Copy (the EXISTS tracked share
// link, POST /api/share/generate through lib/share copyShareLink), Open your quiz,
// Post a challenge (P8's community composer), the EXISTS creator-progress line and
// "Create another quiz".

export function P5Done({ f, onAnother }: { f: CreateFunnel; onAnother: () => void }): React.ReactElement | null {
  const toast = useUxToast();
  const [copied, setCopied] = useState(false);
  const p = f.published;
  if (!p) return null;
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://kpopquiz.org';
  const url = `${origin}/q/${p.slug}`;
  const nudge = creatorNudge(p.creator_stats);

  const copy = async (): Promise<void> => {
    const ok = await copyShareLink(p.id, p.slug);
    setCopied(ok);
    toast(ok ? 'Link copied' : 'Could not copy the link. Select it and copy it instead.');
    if (ok) window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="p5-done">
      <Mascot variant="celebrate" size={88} alt="" className="p5-done-m" />
      {nudge ? <p className="ux-help p5-nudge">{nudge.text}</p> : null}
      <div className="ux-urlbox p5-url">
        <span>{url.replace(/^https?:\/\//, '')}</span>
        <button type="button" className="ux-btn ux-btn-quiet ux-btn-sm" onClick={() => { void copy(); }}>{copied ? 'Copied' : 'Copy'}</button>
      </div>
      <div className="p5-done-a">
        <a className="ux-btn ux-btn-primary ux-btn-lg" href={`/q/${p.slug}`} target="_blank" rel="noopener noreferrer">
          Open your quiz<span className="ux-sr"> (opens in a new tab)</span>
        </a>
        <a className="ux-btn ux-btn-ghost ux-btn-lg" href={`/community?compose=challenge&quiz=${encodeURIComponent(p.slug)}`}>
          <Icon name="target" />Post a challenge
        </a>
      </div>
      <button type="button" className="ux-lnk p5-another" onClick={onAnother}>Create another quiz</button>
    </div>
  );
}
