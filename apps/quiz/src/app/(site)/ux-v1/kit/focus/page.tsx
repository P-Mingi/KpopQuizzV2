import { notFound } from 'next/navigation';

import { UxLink } from '@/components/ux-v1/button';
import { UxPage } from '@/components/ux-v1/page';
import { UX_V1 } from '@/lib/ux-v1';

import { KitAutofocusField } from './kit-autofocus-field';

import type { Metadata } from 'next';

// /ux-v1/kit/focus: route-focus fixture (shell.spec). A page that focuses its own
// field when it mounts: after a client navigation the shell must leave that focus
// where the page put it (UxRouteFocus only moves focus to the H1 when the page did
// not). Flag-on only (404 flag off), noindex, not in the sitemap, no data.

export const metadata: Metadata = {
  title: 'UX kit: route focus',
  robots: { index: false, follow: false },
};

export default function UxKitFocusPage(): React.ReactElement {
  if (!UX_V1) notFound();
  return (
    <UxPage width="text">
      <header className="ux-ph">
        <h1>Route focus fixture</h1>
        <p>This page focuses its own field when it opens, so the shell leaves the focus there.</p>
      </header>
      <KitAutofocusField />
      <p className="ux-help"><UxLink href="/ux-v1/kit" data-kit="back-to-kit">Back to the kit</UxLink></p>
    </UxPage>
  );
}
