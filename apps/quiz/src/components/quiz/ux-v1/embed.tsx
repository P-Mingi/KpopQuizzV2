'use client';

import { useState } from 'react';

import { EmbedGenerator } from '@/components/embed/embed-generator';
import { Icon } from '@/components/ux-v1/icon';
import { Sheet } from '@/components/ux-v1/sheet';
import { useIsClient } from '@/components/ux-v1/use-is-client';
import { PUBLIC_EMBED_PARTNER } from '@/lib/embed/snippet';

// SEO Mission 3, part F.1: the public "Embed this quiz" button. It opens the same
// generator as /admin/embed, locked to this quiz, with the partner key prefilled. The
// generator only mounts inside the sheet, after a click: the embed code is a tool, not
// page content, so none of it is in the quiz page's server HTML.
export function P4EmbedButton({ slug, title }: { slug: string; title: string }): React.ReactElement {
  const [open, setOpen] = useState(false);
  const ready = useIsClient();

  return (
    <>
      <button type="button" className="p4-report" onClick={() => setOpen(true)} aria-haspopup="dialog" data-ready={ready ? '' : undefined}>
        <Icon name="link" />Embed this quiz
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Embed this quiz" width={560}>
        <p className="ux-sh-p">
          Paste this code into your site or blog to show the quiz to your readers. It shows a credit
          link above the quiz and resizes itself.
        </p>
        <EmbedGenerator quizzes={[{ slug, title }]} defaultPartner={PUBLIC_EMBED_PARTNER} partnerLabel="Your site (optional, for our referral stats)" />
      </Sheet>
    </>
  );
}
