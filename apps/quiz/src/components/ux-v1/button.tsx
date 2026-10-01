import Link from 'next/link';

import { Icon } from './icon';

import type { UxIconName } from './icon';

type Variant = 'primary' | 'ghost' | 'quiet';
type Size = 'sm' | 'md' | 'lg';

interface CommonProps {
  variant?: Variant | undefined;
  size?: Size | undefined;
  block?: boolean | undefined;
  /** Leading icon (18px). */
  icon?: UxIconName | undefined;
  /** Trailing icon (18px). */
  iconEnd?: UxIconName | undefined;
  className?: string | undefined;
  children?: React.ReactNode;
}

type ButtonProps = CommonProps & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'children'> & { href?: undefined };
type LinkProps = CommonProps & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'className' | 'children' | 'href'> & { href: string; prefetch?: boolean | undefined };

function cls(variant: Variant, size: Size, block: boolean | undefined, extra?: string): string {
  return ['ux-btn', `ux-btn-${variant}`, size === 'md' ? '' : `ux-btn-${size}`, block ? 'ux-btn-block' : '', extra ?? ''].filter(Boolean).join(' ');
}

/**
 * Pill button (DESIGN-SPEC 16.4: 48 / 40 / 32, 40 min on touch). With `href` it is
 * a real link (internal = next/link, external = <a>); otherwise a <button
 * type="button">. Pink budget (16.2): max one `primary` per view.
 */
export function UxButton(props: ButtonProps | LinkProps): React.ReactElement {
  const { variant = 'primary', size = 'md', block, icon, iconEnd, className, children, ...rest } = props;
  const inner = (
    <>
      {icon ? <Icon name={icon} /> : null}
      {children}
      {iconEnd ? <Icon name={iconEnd} /> : null}
    </>
  );
  const c = cls(variant, size, block, className);
  if (typeof props.href === 'string') {
    const { href, prefetch, ...a } = rest as Omit<LinkProps, keyof CommonProps>;
    if (/^https?:\/\//.test(href)) return <a href={href} className={c} {...a}>{inner}</a>;
    // Anchor attributes typed `X | undefined` do not fit next/link's exact optional props.
    return <Link href={href} className={c} {...(prefetch === undefined ? {} : { prefetch })} {...(a as object)}>{inner}</Link>;
  }
  const b = rest as Omit<ButtonProps, keyof CommonProps>;
  return <button type="button" className={c} {...b}>{inner}</button>;
}

interface UxLinkProps extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'className'> {
  href: string;
  /** Trailing icon, muted-free: links are pink-ink (17.1). */
  icon?: UxIconName;
  className?: string;
}

/** Text link: pink-ink, no underline until hover (17.1). */
export function UxLink({ href, icon, className, children, ...rest }: UxLinkProps): React.ReactElement {
  const c = ['ux-lnk', className ?? ''].filter(Boolean).join(' ');
  const inner = <>{children}{icon ? <Icon name={icon} /> : null}</>;
  if (/^https?:\/\//.test(href)) return <a href={href} className={c} {...rest}>{inner}</a>;
  return <Link href={href} className={c} {...(rest as object)}>{inner}</Link>;
}

interface IconButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'children'> {
  icon: UxIconName;
  /** Required accessible name. */
  label: string;
  bordered?: boolean;
  className?: string;
  children?: React.ReactNode;
}

/** 40px round icon button (44 on coarse pointers). */
export function UxIconButton({ icon, label, bordered, className, children, ...rest }: IconButtonProps): React.ReactElement {
  return (
    <button type="button" aria-label={label} className={['ux-ib', bordered ? 'ux-ib-bordered' : '', className ?? ''].filter(Boolean).join(' ')} {...rest}>
      <Icon name={icon} />
      {children}
    </button>
  );
}
