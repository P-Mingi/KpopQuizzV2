'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';

import { createBrowserClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/toast-provider';
import { UserAvatar } from '@/components/ui/user-avatar';
import { SoundToggle } from '@/components/settings/sound-toggle';
import { HapticsToggle } from '@/components/settings/haptics-toggle';
import { RESERVED_USERNAMES } from '@/lib/constants';
import { PASSPORT_THEMES, PASSPORT_THEME_KEYS, ULT_MAX, BIAS_MAX } from '@/lib/passport-themes';

interface ProfileData {
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  avatar_bg: string;
  avatar_text: string;
  bio: string | null;
  ult_groups: string[];
  bias: string | null;
  profile_theme: string;
}

interface GroupOption { slug: string; name: string; color: string }

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
  const [ultGroups, setUltGroups] = useState<string[]>([]);
  const [bias, setBias] = useState('');
  const [profileTheme, setProfileTheme] = useState('default');
  const [allGroups, setAllGroups] = useState<GroupOption[]>([]);
  const [groupQuery, setGroupQuery] = useState('');
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

      const [{ data }, { data: groups }] = await Promise.all([
        supabase
          .from('profiles')
          .select('username, display_name, avatar_url, avatar_bg, avatar_text, bio, ult_groups, bias, profile_theme')
          .eq('id', user.id)
          .single(),
        supabase.from('groups').select('slug, name, display_color').order('name'),
      ]);

      if (data) {
        const p = data as ProfileData;
        setProfile(p);
        setUsername(p.username);
        setDisplayName(p.display_name ?? '');
        setAvatarUrl(p.avatar_url ?? '');
        setBio(p.bio ?? '');
        setUltGroups(Array.isArray(p.ult_groups) ? p.ult_groups : []);
        setBias(p.bias ?? '');
        setProfileTheme(p.profile_theme ?? 'default');
      }
      setAllGroups(((groups ?? []) as Array<{ slug: string; name: string; display_color: string }>).map((g) => ({ slug: g.slug, name: g.name, color: g.display_color })));
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

  const ultsChanged = profile && JSON.stringify(ultGroups) !== JSON.stringify(profile.ult_groups ?? []);
  const hasChanges = profile && (
    username !== profile.username ||
    displayName !== (profile.display_name ?? '') ||
    avatarUrl !== (profile.avatar_url ?? '') ||
    bio !== (profile.bio ?? '') ||
    ultsChanged ||
    bias !== (profile.bias ?? '') ||
    profileTheme !== (profile.profile_theme ?? 'default')
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
    if (ultsChanged) payload.ult_groups = ultGroups;
    if (bias !== (profile.bias ?? '')) payload.bias = bias || null;
    if (profileTheme !== (profile.profile_theme ?? 'default')) payload.profile_theme = profileTheme;

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
      setUltGroups(Array.isArray(data.profile.ult_groups) ? data.profile.ult_groups : []);
      setBias(data.profile.bias ?? '');
      setProfileTheme(data.profile.profile_theme ?? 'default');
      setUsernameStatus('same');
      showToast('Settings saved!', 'success');
      router.refresh();
    } catch {
      showToast('Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  }, [canSave, profile, username, displayName, avatarUrl, bio, ultsChanged, ultGroups, bias, profileTheme, showToast, router]);

  const toggleUlt = useCallback((slug: string) => {
    setUltGroups((cur) => cur.includes(slug) ? cur.filter((s) => s !== slug) : (cur.length >= ULT_MAX ? cur : [...cur, slug]));
  }, []);

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

        {/* Passport identity (M1.6) */}
        <div className="mb-6 pt-5 border-t border-default">
          <p className="text-sm font-medium text-primary mb-1">Ult groups</p>
          <p className="text-xs text-tertiary mb-2">Pick up to {ULT_MAX}. Pinned on your passport.</p>
          {ultGroups.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {ultGroups.map((slug) => {
                const g = allGroups.find((x) => x.slug === slug);
                return (
                  <button key={slug} onClick={() => toggleUlt(slug)} type="button"
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium"
                    style={{ background: 'var(--accent-bg)', border: '1px solid var(--accent)', color: 'var(--accent)' }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: g?.color ?? 'var(--accent)' }} />
                    {g?.name ?? slug}
                    <span aria-hidden="true">&times;</span>
                  </button>
                );
              })}
            </div>
          )}
          <input type="text" placeholder="Search groups..." value={groupQuery}
            onChange={(e) => setGroupQuery(e.target.value)} className={INPUT} />
          {groupQuery && (
            <div className="mt-2 max-h-52 overflow-y-auto border border-default rounded-md">
              {allGroups
                .filter((g) => g.name.toLowerCase().includes(groupQuery.toLowerCase()))
                .slice(0, 40)
                .map((g) => {
                  const selected = ultGroups.includes(g.slug);
                  const full = ultGroups.length >= ULT_MAX && !selected;
                  return (
                    <button key={g.slug} type="button" disabled={full}
                      onClick={() => { toggleUlt(g.slug); setGroupQuery(''); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-elevated disabled:opacity-40"
                      style={{ color: 'var(--text-primary)' }}>
                      <span style={{ width: 10, height: 10, borderRadius: '50%', background: g.color, flexShrink: 0 }} />
                      <span className="flex-1">{g.name}</span>
                      {selected && <span style={{ color: 'var(--accent)' }}>&#10003;</span>}
                    </button>
                  );
                })}
            </div>
          )}
        </div>

        {/* Bias */}
        <div className="mb-6">
          <p className="text-sm font-medium text-primary mb-1">Bias</p>
          <input type="text" placeholder="Your bias (e.g. Felix)" value={bias}
            onChange={(e) => setBias(e.target.value)} maxLength={BIAS_MAX} className={INPUT} />
          <p className="text-xs text-tertiary text-right mt-1">{bias.length}/{BIAS_MAX}</p>
        </div>

        {/* Passport theme */}
        <div className="mb-6">
          <p className="text-sm font-medium text-primary mb-2">Passport theme</p>
          <div className="flex flex-wrap gap-2">
            {PASSPORT_THEME_KEYS.map((key) => {
              const t = PASSPORT_THEMES[key]!;
              const on = profileTheme === key;
              return (
                <button key={key} type="button" onClick={() => setProfileTheme(key)}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium"
                  style={{ background: 'var(--bg-primary)', border: on ? `2px solid ${t.swatch}` : '1px solid var(--border)', color: 'var(--text-primary)' }}>
                  <span style={{ width: 14, height: 14, borderRadius: '50%', background: t.swatch }} />
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={!canSave}
          className="w-full py-3 rounded-full bg-accent text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
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
        <HapticsToggle />
      </div>

      {/* Disconnect */}
      <div className="bg-primary border border-default rounded-lg p-5 mt-4">
        <p className="text-sm font-medium text-primary mb-1">Account</p>
        <p className="text-xs text-tertiary mb-3">Sign out of your account on this device.</p>
        <button
          onClick={async () => {
            const supabase = createBrowserClient();
            await supabase.auth.signOut();
            router.push('/');
          }}
          className="w-full py-2.5 rounded-lg text-sm font-medium transition-colors"
          style={{
            background: 'transparent',
            border: '1px solid var(--wrong-border)',
            color: 'var(--wrong)',
          }}
        >
          Sign out
        </button>
      </div>

      <p className="text-xs text-tertiary mt-6 text-center">
        Need to delete your account? Contact us.
      </p>
    </div>
  );
}
