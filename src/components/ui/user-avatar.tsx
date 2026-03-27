'use client';

import { useState } from 'react';

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

  if (avatarUrl && !imgError) {
    return (
      <div
        className="rounded-full overflow-hidden flex-shrink-0"
        style={{ width: size, height: size }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={avatarUrl}
          alt={username}
          onError={() => setImgError(true)}
          className="object-cover w-full h-full"
          width={size}
          height={size}
          loading="lazy"
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
