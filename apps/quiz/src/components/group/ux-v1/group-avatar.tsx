import Image from 'next/image';

import { initials } from '@/lib/ux-v1/p3/model';

interface GroupAvatarProps {
  name: string;
  /** /idols/<Group>.jpg (the site's own 736 to 1200 px photo), or null. */
  photo: string | null;
  /** Rendered size in px (80 rail, 40 rows, 32 A to Z). */
  size: number;
  className?: string;
  /** Eager-load (first row above the fold). */
  priority?: boolean;
  /** A site's own picture (a typographic title card) in place of the photo or the monogram. Default: none. */
  art?: React.ReactNode;
}

/**
 * Round group avatar of the v11 groups pages (prototype .gav): the group photo
 * through next/image at the rendered size (never the 480 px copies, 17.3), else
 * neutral two-letter initials on surface-2 (16.8). Decorative: the group name is
 * always printed next to it. Hooks-free, so server and client islands share it.
 */
export function GroupAvatar({ name, photo, size, className, priority, art }: GroupAvatarProps): React.ReactElement {
  const cls = ['p3-gav', photo || art ? '' : 'is-ini', className ?? ''].filter(Boolean).join(' ');
  return (
    <span className={cls} style={{ width: size, height: size }} aria-hidden="true">
      {art ?? (photo ? (
        <Image src={photo} alt="" width={size} height={size} sizes={`${size}px`} priority={priority === true} />
      ) : initials(name))}
    </span>
  );
}
