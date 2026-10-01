import { UX_ICONS } from '@/lib/ux-v1/a0/icons';

import type { UxIconName } from '@/lib/ux-v1/a0/icons';

export type { UxIconName };

interface IconProps {
  name: UxIconName;
  /** 16 (sm), 20 (default) or 24 (lg); any number sets width/height inline. */
  size?: 'sm' | 'md' | 'lg' | number;
  className?: string;
  /** Accessible name. Omit for decorative icons (the default: aria-hidden). */
  label?: string;
  style?: React.CSSProperties;
}

/**
 * Line icon from the v11 prototype set (20px, 1.5 stroke). Server-safe (no
 * hooks); inline SVG so it renders in the static HTML with no sprite request.
 */
export function Icon({ name, size = 'md', className, label, style }: IconProps): React.ReactElement {
  const [viewBox, inner] = UX_ICONS[name];
  const cls = ['ux-ico', size === 'sm' ? 'sm' : size === 'lg' ? 'lg' : '', className ?? ''].filter(Boolean).join(' ');
  const dim = typeof size === 'number' ? { width: size, height: size } : undefined;
  return (
    <svg
      className={cls}
      viewBox={viewBox}
      style={dim ? { ...dim, ...style } : style}
      aria-hidden={label ? undefined : true}
      role={label ? 'img' : undefined}
      aria-label={label}
      focusable="false"
      dangerouslySetInnerHTML={{ __html: inner }}
    />
  );
}
