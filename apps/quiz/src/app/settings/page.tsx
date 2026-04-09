'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';

import { createBrowserClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/toast-provider';
import { UserAvatar } from '@/components/ui/user-avatar';
import { SoundToggle } from '@/components/settings/sound-toggle';
import { RESERVED_USERNAMES } from '@/lib/constants';

interface ProfileData {
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  avatar_bg: string;
  avatar_text: string;
  bio: string | null;
}

type UsernameStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid' | 'same';

export default function SettingsPage(): React.ReactElement {
  const router = useRouter();
  const { showToast } = useToast();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [bio, setBio] = useState('');
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>('same');
  const [usernameError, setUsernameError] = useState('');
  const [avatarPreviewError, setAvatarPreviewError] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load profile
  useEffect(() => {
    async function load() {
      const supabase = createBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('profiles')
        .select('username, display_name, avatar_url, avatar_bg, avatar_text, bio')
        .eq('id', user.id)
        .single();

      if (data) {
        const p = data as ProfileData;
        setProfile(p);
        setUsername(p.username);
        setDisplayName(p.display_name ?? '');
        setAvatarUrl(p.avatar_url ?? '');
        setBio(p.bio ?? '');
      }
      setLoading(false);
    }
    load();
  }, []);

  // Username validation
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!profile) return;

    if (username === profile.username) {
      setUsernameStatus('same');
      setUsernameError('');
      return;
    }

    if (!/^[a-z0-9_]+$/.test(username)) {
      setUsernameStatus('invalid');
      setUsernameError('Only lowercase letters, numbers, and underscores');
      return;
    }
    if (username.length < 3) {
      setUsernameStatus('invalid');
      setUsernameError('At least 3 characters');
      return;
    }
    if (RESERVED_USERNAMES.includes(username as typeof RESERVED_USERNAMES[number])) {
      setUsernameStatus('invalid');
      setUsernameError('This username is reserved');
      return;
    }

    setUsernameStatus('checking');
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/auth/check-username?username=${encodeURIComponent(username)}`);
        if (!res.ok) { setUsernameStatus('invalid'); setUsernameError('Could not check'); return; }
        const data: { available: boolean } = await res.json();
        setUsernameStatus(data.available ? 'available' : 'taken');
        setUsernameError(data.available ? '' : 'Already taken');
      } catch {
        setUsernameStatus('invalid');
        setUsernameError('Could not check');
      }
    }, 300);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [username, profile]);

  // Avatar preview
  useEffect(() => {
    setAvatarPreviewError(false);
  }, [avatarUrl]);

  const hasChanges = profile && (
    username !== profile.username ||
    displayName !== (profile.display_name ?? '') ||
    avatarUrl !== (profile.avatar_url ?? '') ||
    bio !== (profile.bio ?? '')
  );

  const canSave = hasChanges && !saving &&
    (username === profile?.username || usernameStatus === 'available');

  const handleSave = useCallback(async () => {
    if (!canSave || !profile) return;
    setSaving(true);

    const payload: Record<string, unknown> = {};
    if (username !== profile.username) payload.username = username;
    if (displayName !== (profile.display_name ?? '')) payload.display_name = displayName || null;
    if (avatarUrl !== (profile.avatar_url ?? '')) payload.avatar_url = avatarUrl || null;
    if (bio !== (profile.bio ?? '')) payload.bio = bio || null;

    try {
      const res = await fetch('/api/auth/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data: { error: string } = await res.json();
        showToast(data.error, 'error');
        setSaving(false);
        return;
      }

      const data: { profile: ProfileData } = await res.json();
      setProfile(data.profile);
      setUsername(data.profile.username);
      setDisplayName(data.profile.display_name ?? '');
      setAvatarUrl(data.profile.avatar_url ?? '');
      setBio(data.profile.bio ?? '');
      setUsernameStatus('same');
      showToast('Settings saved!', 'success');
      router.refresh();
    } catch {
      showToast('Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  }, [canSave, profile, username, displayName, avatarUrl, bio, showToast, router]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-5 h-5 border-2 border-default border-t-accent rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return <p className="text-sm text-secondary py-12 text-center">Profile not found.</p>;
  }

  const INPUT = 'w-full px-4 py-3 rounded-md border border-default bg-primary text-sm text-primary placeholder:text-tertiary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors';

  return (
    <div className="py-6">
      <h1 className="text-xl font-medium text-primary">Settings</h1>
      <p className="text-sm text-secondary mt-1 mb-6">Manage your profile</p>

      <div className="bg-primary border border-default rounded-lg p-5">

        {/* Profile picture */}
        <div className="mb-6">
          <p className="text-sm font-medium text-primary mb-3">Profile picture</p>
          <div className="flex items-start gap-4">
            <UserAvatar
              username={username}
              avatarUrl={avatarUrl && !avatarPreviewError ? avatarUrl : null}
              bgColor={profile.avatar_bg}
              textColor={profile.avatar_text}
              size={80}
            />
            <div className="flex-1">
              <input
                type="text"
                placeholder="Paste an image URL (https://...)"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                className={INPUT}
              />
              <p className="text-xs text-tertiary mt-1">Use a direct link to a .jpg or .png</p>
              {avatarPreviewError && avatarUrl && (
                <p className="text-xs text-wrong-text mt-1">Couldn&apos;t load this image. Make sure it&apos;s a direct image link.</p>
              )}
              {avatarUrl && (
                <button
                  onClick={() => setAvatarUrl('')}
                  className="text-xs text-wrong-text mt-2 underline cursor-pointer"
                >
                  Remove picture
                </button>
              )}
              {/* Hidden img to test URL validity */}
              {avatarUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarUrl}
                  alt=""
                  onError={() => setAvatarPreviewError(true)}
                  onLoad={() => setAvatarPreviewError(false)}
                  className="hidden"
                  referrerPolicy="no-referrer"
                />
              )}
            </div>
          </div>
        </div>

        {/* Username */}
        <div className="mb-6">
          <p className="text-sm font-medium text-primary mb-1">Username</p>
          <p className="text-sm text-secondary mb-2">Current: @{profile.username}</p>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase())}
            maxLength={20}
            className={INPUT}
          />
          <div className="h-5 mt-1">
            {usernameStatus === 'checking' && <p className="text-xs text-secondary">Checking...</p>}
            {usernameStatus === 'available' && <p className="text-xs text-correct-text">&#10003; Available!</p>}
            {usernameStatus === 'taken' && <p className="text-xs text-wrong-text">&#10007; {usernameError}</p>}
            {usernameStatus === 'invalid' && <p className="text-xs text-wrong-text">{usernameError}</p>}
          </div>
          {username !== profile.username && usernameStatus !== 'same' && (
            <p className="text-xs text-type-clue-text mt-1">Changing your username will break any existing links to your profile.</p>
          )}
        </div>

        {/* Display name */}
        <div className="mb-6">
          <p className="text-sm font-medium text-primary mb-1">Display name</p>
          <input
            type="text"
            placeholder="Your display name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={40}
            className={INPUT}
          />
          <p className="text-xs text-tertiary mt-1">Optional. If not set, your username is shown.</p>
        </div>

        {/* Bio */}
        <div className="mb-6">
          <p className="text-sm font-medium text-primary mb-1">Bio</p>
          <textarea
            placeholder="Tell other fans about yourself..."
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={160}
            rows={3}
            className={`${INPUT} resize-none`}
          />
          <p className="text-xs text-tertiary text-right mt-1">{bio.length}/160</p>
        </div>

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={!canSave}
          className="w-full py-3 rounded-full bg-txt-primary text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {saving ? (
            <span className="flex items-center justify-center">
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            </span>
          ) : (
            'Save changes'
          )}
        </button>
      </div>

      {/* Preferences */}
      <div className="bg-primary border border-default rounded-lg p-5 mt-4">
        <p className="text-sm font-medium text-primary mb-2">Preferences</p>
        <SoundToggle />
      </div>

      <p className="text-xs text-tertiary mt-6 text-center">
        Need to delete your account? Contact us.
      </p>
    </div>
  );
}
