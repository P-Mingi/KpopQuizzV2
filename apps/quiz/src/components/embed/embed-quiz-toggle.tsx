'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';

import { PUBLIC_EMBED_PARTNER } from '@/lib/embed/snippet';

// Code-split: the generator is fetched on the first click only.
const EmbedGenerator = dynamic(() => import('@/components/embed/embed-generator').then((m) => m.EmbedGenerator), { ssr: false });

// SEO Mission 3, part F.1: the public "Embed this quiz" button of the flag-off quiz page
// (the flag-on page uses components/quiz/ux-v1/embed.tsx, a sheet). Same generator as
// /admin/embed, locked to this quiz, partner key prefilled. The generator mounts only
// after a click, so the embed code is never part of the page's server HTML.
export function EmbedQuizToggle({ slug, title }: { slug: string; title: string }): React.ReactElement {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-4 max-w-2xl">
      <button type="button" className="btn-outline" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        Embed this quiz
      </button>
      {open ? (
        <div className="mt-3 p-4 rounded-xl border border-default bg-surface">
          <p className="text-sm text-secondary leading-relaxed">
            Paste this code into your site or blog to show the quiz to your readers. It shows a credit
            link above the quiz and resizes itself.
          </p>
          <EmbedGenerator quizzes={[{ slug, title }]} defaultPartner={PUBLIC_EMBED_PARTNER} partnerLabel="Your site (optional, for our referral stats)" />
        </div>
      ) : null}
    </div>
  );
}
