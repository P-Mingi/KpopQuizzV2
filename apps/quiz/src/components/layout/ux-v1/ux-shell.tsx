import { verseHidden } from '@/lib/verse/visibility';

import { UxShellLoader } from './ux-shell-loader';

/**
 * UX v11.2 shell (DESIGN-SPEC 16.5, 17.1), rendered by app/(site)/layout.tsx only
 * when NEXT_PUBLIC_UX_V1 is on. Server component that reads no cookies or headers
 * (pages keep their static / ISR mode); it hands the page and two server-only
 * facts to the client shell, which is code-split (UxShellLoader) so flag-off pages
 * never download it. Everything is server-rendered: nav links, footer links and
 * the page are in the static HTML; the account / streak / bell / search / sheets
 * are islands that hydrate.
 *
 * Replaces the Phase 1 232px sidebar shell (DECISIONS-LOG 2026-09-25, v10).
 */
export function UxShell({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <UxShellLoader showFandoms={!verseHidden()} year={new Date().getFullYear()}>
      {children}
    </UxShellLoader>
  );
}
