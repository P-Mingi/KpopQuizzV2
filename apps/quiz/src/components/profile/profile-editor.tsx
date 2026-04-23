'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';

interface ProfileEditorProps {
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  avatarBg: string;
  avatarText: string;
  bio: string | null;
}

export function ProfileEditor({
  username: initialUsername,
  displayName: initialDisplayName,
  avatarUrl: initialAvatarUrl,
  avatarBg,
  avatarText,
  bio: initialBio,
}: ProfileEditorProps): React.ReactElement {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [username, setUsername] = useState(initialUsername);
  const [displayName, setDisplayName] = useState(initialDisplayName ?? '');
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl ?? '');
  const [bio, setBio] = useState(initialBio ?? '');
  const [avatarPreview, setAvatarPreview] = useState(initialAvatarUrl);
  const [uploading, setUploading] = useState(false);
  const [imgError, setImgError] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);

  function handleCancel() {
    setUsername(initialUsername);
    setDisplayName(initialDisplayName ?? '');
    setAvatarUrl(initialAvatarUrl ?? '');
    setAvatarPreview(initialAvatarUrl);
    setBio(initialBio ?? '');
    setError('');
    setImgError(false);
    setEditing(false);
  }

  async function handleFileUpload(file: File) {
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be under 5MB');
      return;
    }
    setUploading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/quiz/upload-image', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Upload failed');
        return;
      }
      setAvatarUrl(data.url);
      setAvatarPreview(data.url);
      setImgError(false);
    } catch {
      setError('Upload failed');
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setError('');

    const payload: Record<string, unknown> = {};

    if (username !== initialUsername) {
      payload.username = username.toLowerCase().trim();
    }
    if (displayName !== (initialDisplayName ?? '')) {
      payload.display_name = displayName.trim() || null;
    }
    if (avatarUrl !== (initialAvatarUrl ?? '')) {
      payload.avatar_url = avatarUrl.trim() || null;
    }
    if (bio !== (initialBio ?? '')) {
      payload.bio = bio.trim() || null;
    }

    if (Object.keys(payload).length === 0) {
      setEditing(false);
      setSaving(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Failed to save');
        setSaving(false);
        return;
      }
      // Reload page to reflect changes
      window.location.reload();
    } catch {
      setError('Failed to save');
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="mt-3 px-4 py-1.5 rounded-full border border-default text-xs font-medium text-secondary hover:border-accent hover:text-accent transition-colors cursor-pointer"
      >
        Edit profile
      </button>
    );
  }

  const initials = username.slice(0, 2).toUpperCase();

  return (
    <div className="mt-4 bg-surface border border-default rounded-xl p-5 max-w-md">
      <h3 className="text-sm font-medium text-primary mb-4">Edit profile</h3>

      {/* Avatar */}
      <div className="flex items-center gap-4 mb-4">
        <div className="relative">
          {avatarPreview && !imgError ? (
            <div className="w-16 h-16 rounded-full overflow-hidden">
              <Image
                src={avatarPreview}
                alt={username}
                width={64}
                height={64}
                className="object-cover w-full h-full"
                onError={() => setImgError(true)}
                referrerPolicy="no-referrer"
              />
            </div>
          ) : (
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center font-medium"
              style={{ backgroundColor: avatarBg, color: avatarText, fontSize: 24 }}
            >
              {initials}
            </div>
          )}
          {uploading && (
            <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="px-3 py-1.5 rounded-full border border-default text-xs font-medium text-primary hover:border-accent transition-colors cursor-pointer disabled:opacity-50"
          >
            {uploading ? 'Uploading...' : 'Upload photo'}
          </button>
          {avatarPreview && (
            <button
              type="button"
              onClick={() => { setAvatarUrl(''); setAvatarPreview(null); setImgError(false); }}
              className="text-[11px] text-secondary hover:text-wrong transition-colors cursor-pointer"
            >
              Remove photo
            </button>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFileUpload(file);
            e.target.value = '';
          }}
        />
      </div>

      {/* Avatar URL */}
      <div className="mb-3">
        <label className="text-[11px] text-secondary mb-1 block">Or paste an image link</label>
        <input
          type="text"
          placeholder="https://..."
          value={avatarUrl}
          onChange={(e) => {
            setAvatarUrl(e.target.value);
            setAvatarPreview(e.target.value || null);
            setImgError(false);
          }}
          className="w-full px-3 py-2 rounded-md border border-default bg-primary text-sm text-primary placeholder:text-tertiary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
        />
      </div>

      {/* Username */}
      <div className="mb-3">
        <label className="text-[11px] text-secondary mb-1 block">Username</label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
          maxLength={20}
          className="w-full px-3 py-2 rounded-md border border-default bg-primary text-sm text-primary placeholder:text-tertiary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
        />
        <p className="text-[10px] text-ghost mt-0.5">3-20 characters, lowercase letters, numbers, underscores</p>
      </div>

      {/* Display name */}
      <div className="mb-3">
        <label className="text-[11px] text-secondary mb-1 block">Display name <span className="text-ghost">(optional)</span></label>
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          maxLength={40}
          placeholder={username}
          className="w-full px-3 py-2 rounded-md border border-default bg-primary text-sm text-primary placeholder:text-tertiary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
        />
      </div>

      {/* Bio */}
      <div className="mb-4">
        <label className="text-[11px] text-secondary mb-1 block">Bio <span className="text-ghost">(optional)</span></label>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          maxLength={160}
          rows={2}
          placeholder="Tell fans about yourself..."
          className="w-full px-3 py-2 rounded-md border border-default bg-primary text-sm text-primary placeholder:text-tertiary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors resize-none"
        />
        <p className="text-[10px] text-ghost text-right">{bio.length}/160</p>
      </div>

      {error && (
        <p className="text-xs text-wrong mb-3">{error}</p>
      )}

      <div className="flex gap-2">
        <button
          onClick={handleCancel}
          disabled={saving}
          className="px-4 py-2 rounded-full border border-default text-xs font-medium text-secondary hover:border-default transition-colors cursor-pointer"
        >
          Cancel
        </button>
        <button
          onClick={() => void handleSave()}
          disabled={saving || uploading || username.trim().length < 3}
          className="px-5 py-2 rounded-full bg-accent text-white text-xs font-medium disabled:opacity-50 cursor-pointer"
        >
          {saving ? 'Saving...' : 'Save changes'}
        </button>
      </div>
    </div>
  );
}
