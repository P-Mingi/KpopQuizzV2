type Width = 'wide' | 'text' | 'stage' | 'full';

interface UxPageProps {
  children: React.ReactNode;
  /** Content column (DESIGN-SPEC 16.4): wide 1120 (home, groups, quizzes, blindtest,
   *  community, hub, passport), text 720 (quiz, create, post, leaderboard, ranked,
   *  settings, notifications), stage 600 (games, results), full = no column. */
  width?: Width;
  /** Page padding (top 56 / bottom 112; mobile 28 / 64). Default on. */
  padded?: boolean;
  /** Shell mode, applied server side with no flash: `focus` hides nav, tab bar and
   *  footer (games); `create` hides the tab bar and footer (create funnel). For a
   *  mode that changes on the client (quiz page -> in-game) use useShellMode(). */
  shell?: 'focus' | 'create';
  className?: string;
  id?: string;
}

const COL: Record<Width, string> = { wide: 'ux-wrap', text: 'ux-col', stage: 'ux-stage', full: '' };

/**
 * Root of every v11 page. Its `.ux-page` class opts the page out of the legacy
 * 720 frame the shell keeps for pages that are not redesigned yet, and scopes the
 * v11 base styles. Server component.
 */
export function UxPage({ children, width = 'wide', padded = true, shell, className, id }: UxPageProps): React.ReactElement {
  const cls = ['ux-page', COL[width], padded ? 'ux-pg' : '', className ?? ''].filter(Boolean).join(' ');
  return <div id={id} className={cls} data-shell={shell}>{children}</div>;
}
