interface LangOption {
  /** BCP 47 code: en, fr, es, id. */
  code: string;
  /** The language in its own words: "Français". */
  label: string;
  /** That language's own page (each landing is a real URL). */
  href: string;
}

interface LangSwitchProps {
  options: readonly LangOption[];
  /** Code of the page being shown. */
  current: string;
  /** Accessible name of the group, in the page language ("Page language"). */
  label: string;
  className?: string | undefined;
}

/**
 * v12 language switch (prototype `.langsw`): a pill row, the current language on
 * the pink fill. The prototype switches copy in place; the real landings are four
 * URLs, so each pill is a plain link (`hreflang`, `lang`, `aria-current="page"`)
 * that a crawler follows, with a full page load so the new page sets its own
 * `<html lang>`. Server-safe.
 */
export function LangSwitch({ options, current, label, className }: LangSwitchProps): React.ReactElement {
  return (
    <nav className={['ux-langsw', className ?? ''].filter(Boolean).join(' ')} aria-label={label}>
      {options.map((o) => (
        <a key={o.code} href={o.href} hrefLang={o.code} lang={o.code} aria-current={o.code === current ? 'page' : undefined}>{o.label}</a>
      ))}
    </nav>
  );
}
