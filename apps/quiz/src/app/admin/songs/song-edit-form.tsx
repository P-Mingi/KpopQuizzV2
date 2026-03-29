'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';

interface GroupOption { id: number; name: string }

interface SongFormData {
  title: string;
  artist: string;
  group_id: number | null;
  youtube_id: string;
  year: number;
  is_title_track: boolean;
  gender: string;
  generation: string;
  status: string;
  clip_intro: string;
  clip_chorus: string;
  clip_verse: string;
  clip_bridge: string;
  wrong_1: string;
  wrong_2: string;
  wrong_3: string;
}

interface SongEditFormProps {
  initial: SongFormData;
  groups: GroupOption[];
  onSave: (data: Record<string, unknown>) => Promise<boolean>;
  onDelete?: () => Promise<void>;
  showYouTubeInput?: boolean;
}

export function SongEditForm({ initial, groups, onSave, onDelete, showYouTubeInput }: SongEditFormProps): React.ReactElement {
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [previewingClip, setPreviewingClip] = useState<string | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [fetching, setFetching] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const playerRef = useRef<any>(null);
  const previewTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const set = (updates: Partial<SongFormData>) => setForm(prev => ({ ...prev, ...updates }));

  // YouTube player for clip preview
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      document.body.appendChild(tag);
    }
    const init = () => {
      playerRef.current = new window.YT.Player('admin-yt-preview', {
        height: '1', width: '1',
        playerVars: { autoplay: 0, controls: 0, disablekb: 1, fs: 0, modestbranding: 1, rel: 0 },
      } as Record<string, unknown>);
    };
    if (window.YT?.Player) init();
    else window.onYouTubeIframeAPIReady = init;
    return () => {
      if (previewTimeout.current) clearTimeout(previewTimeout.current);
      playerRef.current?.destroy();
    };
  }, []);

  function previewClip(clip: 'intro' | 'chorus' | 'verse' | 'bridge') {
    const start = Number(form[`clip_${clip}`]);
    if (isNaN(start) || !playerRef.current || !form.youtube_id) return;
    const dur = clip === 'intro' ? 5 : 10;

    if (previewingClip) {
      playerRef.current.pauseVideo();
      if (previewTimeout.current) clearTimeout(previewTimeout.current);
    }

    setPreviewingClip(clip);
    playerRef.current.loadVideoById({ videoId: form.youtube_id, startSeconds: start, endSeconds: start + dur });
    previewTimeout.current = setTimeout(() => {
      playerRef.current?.pauseVideo();
      setPreviewingClip(null);
    }, (dur + 1) * 1000);
  }

  function stopPreview() {
    playerRef.current?.pauseVideo();
    if (previewTimeout.current) clearTimeout(previewTimeout.current);
    setPreviewingClip(null);
  }

  async function fetchYouTube() {
    const match = youtubeUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
    if (!match) return;
    const videoId = match[1]!;

    setFetching(true);
    try {
      const res = await fetch(`/api/admin/youtube-info?id=${videoId}`);
      if (res.ok) {
        const data = await res.json();
        set({ youtube_id: videoId, title: data.title || '', artist: data.artist || '' });
      }
    } catch { /* */ }
    setFetching(false);
  }

  async function handleSave() {
    setError(null);
    setSuccess(false);
    setSaving(true);

    const payload: Record<string, unknown> = {
      title: form.title.trim(),
      artist: form.artist.trim(),
      group_id: form.group_id || null,
      youtube_id: form.youtube_id.trim(),
      year: form.year,
      is_title_track: form.is_title_track,
      gender: form.gender,
      generation: form.generation || null,
      status: form.status,
      clip_intro: form.clip_intro === '' ? null : Number(form.clip_intro),
      clip_chorus: form.clip_chorus === '' ? null : Number(form.clip_chorus),
      clip_verse: form.clip_verse === '' ? null : Number(form.clip_verse),
      clip_bridge: form.clip_bridge === '' ? null : Number(form.clip_bridge),
      wrong_answers: [form.wrong_1, form.wrong_2, form.wrong_3].filter(s => s.trim()),
    };

    if (!payload.title || !payload.youtube_id || !payload.year) {
      setError('Title, YouTube ID, and year are required');
      setSaving(false);
      return;
    }

    const ok = await onSave(payload);
    setSaving(false);
    if (ok) setSuccess(true);
    else setError('Failed to save');
  }

  return (
    <div className="max-w-2xl">
      {/* Hidden YT player */}
      <div style={{ position: 'fixed', width: 1, height: 1, overflow: 'hidden', opacity: 0, top: -100, left: -100 }}>
        <div id="admin-yt-preview" />
      </div>

      {/* YouTube URL input (add page only) */}
      {showYouTubeInput && (
        <div className="mb-6">
          <label className="text-xs text-[var(--text-secondary)] block mb-1">YouTube URL</label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="https://youtube.com/watch?v=..."
              value={youtubeUrl}
              onChange={e => setYoutubeUrl(e.target.value)}
              className="flex-1 px-3 py-2 rounded-lg border border-[var(--border-light)] text-sm focus:outline-none focus:border-[var(--border-medium)]"
            />
            <button
              onClick={fetchYouTube}
              disabled={fetching}
              className="px-4 py-2 rounded-lg border border-[var(--border-light)] text-sm font-medium hover:border-[var(--border-medium)] disabled:opacity-50"
            >
              {fetching ? '...' : 'Fetch'}
            </button>
          </div>
        </div>
      )}

      {/* Thumbnail */}
      {form.youtube_id && (
        <div className="flex gap-4 mb-6">
          <img
            src={`https://img.youtube.com/vi/${form.youtube_id}/hqdefault.jpg`}
            className="w-40 h-24 rounded-lg object-cover bg-[var(--bg-secondary)]"
            alt=""
          />
          <div>
            <p className="text-xs text-[var(--text-tertiary)] mb-1">ID: {form.youtube_id}</p>
            <a
              href={`https://www.youtube.com/watch?v=${form.youtube_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[var(--accent-pink)] hover:underline"
            >
              Open MV
            </a>
          </div>
        </div>
      )}

      {/* Basic info */}
      <div className="space-y-3 mb-6">
        <Field label="Title" value={form.title} onChange={v => set({ title: v })} />
        <Field label="Artist" value={form.artist} onChange={v => set({ artist: v })} />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-[var(--text-secondary)] block mb-1">Group</label>
            <select
              value={form.group_id ?? ''}
              onChange={e => set({ group_id: e.target.value ? Number(e.target.value) : null })}
              className="w-full px-3 py-2 rounded-lg border border-[var(--border-light)] text-sm bg-white"
            >
              <option value="">No group</option>
              {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
          <Field label="Year" value={String(form.year)} onChange={v => set({ year: Number(v) || 2024 })} type="number" />
        </div>

        <PillSelect label="Gender" value={form.gender} onChange={v => set({ gender: v })}
          options={[['bg', 'Boy group'], ['gg', 'Girl group'], ['solo_female', 'Solo F'], ['solo_male', 'Solo M'], ['mixed', 'Mixed']]} />
        <PillSelect label="Generation" value={form.generation} onChange={v => set({ generation: v })}
          options={[['2nd', '2nd'], ['3rd', '3rd'], ['4th', '4th'], ['5th', '5th']]} />
        <PillSelect label="Title track" value={form.is_title_track ? 'yes' : 'no'}
          onChange={v => set({ is_title_track: v === 'yes' })}
          options={[['yes', 'Yes'], ['no', 'No']]} />
        <PillSelect label="Status" value={form.status} onChange={v => set({ status: v })}
          options={[['active', 'Active'], ['inactive', 'Inactive'], ['broken', 'Broken']]} />
      </div>

      {/* Clip timestamps */}
      <div className="mb-6">
        <h3 className="text-sm font-medium mb-3">Clip timestamps</h3>
        <div className="space-y-2">
          {(['intro', 'chorus', 'verse', 'bridge'] as const).map(clip => {
            const key = `clip_${clip}` as keyof SongFormData;
            const val = form[key] as string;
            return (
              <div key={clip} className="flex items-center gap-3">
                <label className="text-xs text-[var(--text-secondary)] w-14 capitalize">{clip}</label>
                <input
                  type="number"
                  placeholder="-"
                  value={val}
                  onChange={e => set({ [key]: e.target.value } as Partial<SongFormData>)}
                  className="w-20 px-3 py-1.5 rounded-lg border border-[var(--border-light)] text-sm text-center focus:outline-none focus:border-[var(--border-medium)]"
                />
                <span className="text-xs text-[var(--text-tertiary)]">sec</span>
                <button
                  type="button"
                  onClick={() => previewingClip === clip ? stopPreview() : previewClip(clip)}
                  disabled={val === '' || !form.youtube_id}
                  className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                    previewingClip === clip
                      ? 'bg-[#FCEBEB] border-[#F09595] text-[#791F1F]'
                      : val === '' || !form.youtube_id
                        ? 'border-[var(--border-light)] text-[var(--text-tertiary)] cursor-not-allowed'
                        : 'border-[var(--border-light)] text-[var(--text-secondary)] hover:border-[var(--border-medium)]'
                  }`}
                >
                  {previewingClip === clip ? 'Stop' : `Preview ${clip === 'intro' ? '5s' : '10s'}`}
                </button>
                {val !== '' && form.youtube_id && (
                  <a
                    href={`https://www.youtube.com/watch?v=${form.youtube_id}&t=${val}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-[var(--text-tertiary)] hover:underline"
                  >
                    Open at time
                  </a>
                )}
              </div>
            );
          })}
        </div>
        <p className="text-[10px] text-[var(--text-tertiary)] mt-2">
          Leave empty if unknown. The song won't appear in modes using that clip point.
        </p>
      </div>

      {/* Wrong answers */}
      <div className="mb-8">
        <h3 className="text-sm font-medium mb-3">Wrong answers</h3>
        <div className="space-y-2">
          <Field label="" value={form.wrong_1} onChange={v => set({ wrong_1: v })} placeholder="Wrong answer 1" />
          <Field label="" value={form.wrong_2} onChange={v => set({ wrong_2: v })} placeholder="Wrong answer 2" />
          <Field label="" value={form.wrong_3} onChange={v => set({ wrong_3: v })} placeholder="Wrong answer 3" />
        </div>
      </div>

      {/* Messages */}
      {error && <p className="text-sm text-[#791F1F] bg-[#FCEBEB] px-4 py-2 rounded-lg mb-4">{error}</p>}
      {success && <p className="text-sm text-[#27500A] bg-[#EAF3DE] px-4 py-2 rounded-lg mb-4">Saved!</p>}

      {/* Actions */}
      <div className="flex items-center justify-between">
        {onDelete && (
          <button onClick={onDelete} className="text-xs text-[#A32D2D] hover:underline">Delete song</button>
        )}
        <div className="flex gap-2 ml-auto">
          <Link href="/admin/songs" className="px-4 py-2 rounded-full border border-[var(--border-light)] text-sm font-medium">
            Cancel
          </Link>
          <button onClick={handleSave} disabled={saving}
            className="px-4 py-2 rounded-full bg-[var(--text-primary)] text-white text-sm font-medium disabled:opacity-50">
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = 'text' }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}): React.ReactElement {
  return (
    <div>
      {label && <label className="text-xs text-[var(--text-secondary)] block mb-1">{label}</label>}
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 rounded-lg border border-[var(--border-light)] text-sm focus:outline-none focus:border-[var(--border-medium)]"
      />
    </div>
  );
}

function PillSelect({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: [string, string][];
}): React.ReactElement {
  return (
    <div>
      <label className="text-xs text-[var(--text-secondary)] block mb-1">{label}</label>
      <div className="flex gap-1.5 flex-wrap">
        {options.map(([val, display]) => (
          <button
            key={val}
            type="button"
            onClick={() => onChange(val)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              value === val
                ? 'bg-[var(--text-primary)] text-white'
                : 'border border-[var(--border-light)] text-[var(--text-secondary)] hover:border-[var(--border-medium)]'
            }`}
          >
            {display}
          </button>
        ))}
      </div>
    </div>
  );
}
