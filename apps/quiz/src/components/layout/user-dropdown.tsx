'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { createBrowserClient } from '@/lib/supabase/client';
import { UserAvatar } from '@/components/ui/user-avatar';
import { getLevelInfo } from '@/lib/constants';
import { formatCount } from '@/lib/utils';

interface UserDropdownProps {
  username: string;
  avatarUrl: string | null;
  avatarBg: string;
  avatarText: string;
  xp: number;
}

export function UserDropdown({ username, avatarUrl, avatarBg, avatarText, xp }: UserDropdownProps): React.ReactElement {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const levelInfo = getLevelInfo(xp);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    const supabase = createBrowserClient();
    await supabase.auth.signOut();
    setOpen(false);
    router.refresh();
  };

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setOpen(!open)}
        aria-label="User menu"
        className="cursor-pointer"
      >
        <UserAvatar username={username} avatarUrl={avatarUrl} bgColor={avatarBg} textColor={avatarText} size={24} />
      </button>

      {open && (
        <div className="absolute right-0 top-8 w-48 bg-primary border border-default rounded-lg py-1 z-50">
          <Link
            href={`/u/${username}`}
            onClick={() => setOpen(false)}
            className="block px-4 py-2 text-sm text-primary hover:bg-surface transition-colors"
          >
            My quizzes
          </Link>
          <Link
            href="/settings"
            onClick={() => setOpen(false)}
            className="block px-4 py-2 text-sm text-primary hover:bg-surface transition-colors"
          >
            Settings
          </Link>
          <div className="border-t border-default my-1" />
          <div className="px-4 py-2 text-xs text-secondary">
            Lv.{levelInfo.level} {levelInfo.name} · {formatCount(xp)} XP
          </div>
          <div className="border-t border-default my-1" />
          <button
            onClick={handleSignOut}
            className="block w-full text-left px-4 py-2 text-sm text-primary hover:bg-surface transition-colors"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
