// V-HARMONY-2B primitive - the ONE home-widget shell. Every home widget renders
// through this: the harmonized SectionHeader eyebrow (+ optional action) then its
// own body. One header grammar + one spacing rhythm across the widget family;
// each widget keeps its distinct body + accent.
//
// FRAME: `framed` wraps the widget in `verse-frame-rounded` - the SAME soft box
// the space-home ModuleFrame applies to registry modules - so standalone strips
// (which used to roll three different ad-hoc boxes) now share the one box. Widgets
// mounted through the module registry stay FRAMELESS here: ModuleFrame supplies
// their box from the outside (framing here too would double-box). `wrapClassName`
// overrides the frameless wrapper class so a converged widget keeps its exact
// prior spacing (e.g. 'v-module', or '' for a bare wrapper).
import { SectionHeader } from '@/components/verse/primitives/section-header';

export function WidgetShell({ eyebrow, action, accent = false, as = 'h3', framed = false, scoped = false, wrapClassName, aria, children }: {
  /** The eyebrow label. Omit for a header-less widget (e.g. a pull quote). */
  eyebrow?: React.ReactNode;
  /** Right-aligned header affordance (a "See all"/"All 17" link). */
  action?: React.ReactNode;
  /** Accent-tinted eyebrow (e.g. "Featured essay"). */
  accent?: boolean;
  as?: 'h2' | 'h3';
  /** Self-frame with the canonical soft box (standalone widgets only). */
  framed?: boolean;
  /** Carry `.verse-scope` on the box so the --verse-* frame tokens resolve on a
   * PLAY surface (quiz home / community hub), where they are otherwise unset. A
   * bare scope defaults --verse-accent to --brand, so the box tints to Play pink
   * and matches the surface. Never adds `.verse-page`, so the 720px reading
   * canvas + head stay byte-identical. Only meaningful with `framed`. */
  scoped?: boolean;
  /** Frameless wrapper class. Default 'v-module'; pass '' for a bare wrapper. */
  wrapClassName?: string;
  /** Optional aria-label for the widget region. */
  aria?: string;
  children: React.ReactNode;
}): React.ReactElement {
  const header = eyebrow != null ? <SectionHeader kicker={eyebrow} action={action} as={as} accent={accent} /> : null;
  const ariaProps = aria ? { 'aria-label': aria } : {};
  if (framed) {
    return (
      <section className={`verse-frame verse-frame-rounded${scoped ? ' verse-scope' : ''}${wrapClassName ? ` ${wrapClassName}` : ''}`} {...ariaProps}>
        {header}
        {children}
      </section>
    );
  }
  const cls = wrapClassName === undefined ? 'v-module' : wrapClassName;
  return (
    <div className={cls || undefined} {...ariaProps}>
      {header}
      {children}
    </div>
  );
}
