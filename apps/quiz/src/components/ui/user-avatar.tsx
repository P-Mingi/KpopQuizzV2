'use client';

import { useState } from 'react';
import Image from 'next/image';

import { isConfiguredImageHost } from '@/lib/image-hosts';

interface UserAvatarProps {
  username: string;
  avatarUrl: string | null;
  bgColor: string;
  textColor: string;
  size: number;
}

export function UserAvatar({ username, avatarUrl, bgColor, textColor, size }: UserAvatarProps): React.ReactElement {
  const [imgError, setImgError] = useState(false);

  const initials = username.slice(0, 2).toUpperCase();
  const fontSize = Math.round(size * 0.4);

  // next/image throws during render on a host missing from remotePatterns (lib/image-hosts.ts),
  // so one profile with such an avatar (a share.google link, 2026-10-13) took /pt/leaderboard
  // down with a 500. An avatar on an unregistered host shows the initials instead.
  if (avatarUrl && !imgError && isConfiguredImageHost(avatarUrl)) {
    return (
      <div
        className="rounded-full overflow-hidden flex-shrink-0"
        style={{ width: size, height: size }}
      >
        <Image
          src={avatarUrl}
          alt={username}
          onError={() => setImgError(true)}
          className="object-cover w-full h-full"
          width={size}
          height={size}
          sizes={`${size}px`}
          referrerPolicy="no-referrer"
        />
      </div>
    );
  }

  return (
    <div
      className="rounded-full flex items-center justify-center font-medium flex-shrink-0"
      style={{
        width: size,
        height: size,
        backgroundColor: bgColor,
        color: textColor,
        fontSize,
      }}
    >
      {initials}
    </div>
  );
}
