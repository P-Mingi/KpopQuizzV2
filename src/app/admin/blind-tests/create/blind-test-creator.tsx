'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import { extractYouTubeId, parseYouTubeTitle, thumbnailUrl } from '@/lib/youtube';

import type { ClipMode } from '@/lib/db/types';

interface GroupOption {
  id: number;
  name: string;
  slug: string;
}

interface SongEntry {
  youtube_url: string;
  youtube_id: string;
  title: string;
  artist: string;
  clip_start: number;
  clip_mode: ClipMode;
  choices: [string, string, string, string];
  correct_index: number;
  loading: boolean;
  thumb: string;
}

function emptySong(): SongEntry {
  return {
    youtube_url: '', youtube_id: '', title: '', artist: '',
    clip_start: 0, clip_mode: 'chorus',
    choices: ['', '', '', ''], correct_index: 0,
    loading: false, thumb: '',
  };
}

export function BlindTestCreator({ groups }: { groups: GroupOption[] }): React.ReactElement {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [groupId, setGroupId] = useState<number | null>(null);
  const [clipDuration, setClipDuration] = useState(10);
  const [songs, setSongs] = useState<SongEntry[]>(() => Array.from({ length: 5 }, emptySong));
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [published, setPublished] = useState<{ slug: string } | null>(null);

  const updateSong = useCallback((index: number, updates: Partial<SongEntry>) => {
    setSongs(prev => prev.map((s, i) => i === index ? { ...s, ...updates } : s));
  }, []);

  const handleYouTubeUrl = useCallback(async (index: number, url: string) => {
    updateSong(index, { youtube_url: url });
    const videoId = extractYouTubeId(url);
    if (!videoId) return;

    updateSong(index, { youtube_id: videoId, loading: true, thumb: thumbnailUrl(videoId) });

    try {
      const res = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
      if (res.ok) {
        const data = await res.json();
        const parsed = parseYouTubeTitle(data.title);
        updateSong(index, {
          title: parsed.title,
          artist: parsed.artist,
          choices: [parsed.title, '', '', ''] as [string, string, string, string],
          correct_index: 0,
          loading: false,
        });
      } else {
        updateSong(index, { loading: false });
      }
    } catch {
      updateSong(index, { loading: false });
    }
  }, [updateSong]);

  async function handlePublish(status: 'published' | 'draft') {
    setError(null);
    setPublishing(true);

    try {
      const res = await fetch('/api/game/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          game_type: 'blind_test',
          title: title.trim(),
          group_id: groupId,
          clip_duration: clipDuration,
          status,
          songs: songs.map(s => ({
            youtube_id: s.youtube_id,
            title: s.title,
            artist: s.artist,
            clip_start: s.clip_start,
            clip_mode: s.clip_mode,
            choices: s.choices,
            correct_index: s.correct_index,
          })),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.details?.join(', ') || data.error || 'Failed to create');
        return;
      }

      const data = await res.json();
      if (status === 'published') {
        setPublished({ slug: data.slug });
      } else {
        router.push('/admin');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setPublishing(false);
    }
  }

  if (published) {
    return (
      <div className="text-center py-12 animate-fade-in">
        <p className="text-xl font-medium mb-2">Blind test is live!</p>
        <p className="text-sm text-[var(--text-secondary)] mb-6">kpopquiz.org/g/{published.slug}</p>
        <div className="flex gap-2 justify-center">
          <Link href={`/g/${published.slug}`} className="px-6 py-3 rounded-full bg-[var(--text-primary)] text-white text-sm font-medium">
            View game
          </Link>
          <Link href="/admin" className="px-6 py-3 rounded-full border border-[var(--border-light)] text-sm font-medium">
            Back to admin
          </Link>
        </div>
      </div>
    );
  }

  const completeSongs = songs.filter(s => s.youtube_id && s.choices.every(c => c.trim()) && s.title);
  const canPublish = title.trim().length >= 3 && groupId && completeSongs.length >= 5;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-medium">Create blind test</h1>
        <Link href="/admin" className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
          Back to admin
        </Link>
      </div>

      {/* Tips */}
      <div className="bg-[var(--bg-secondary)] rounded-xl p-4 mb-6 text-xs text-[var(--text-secondary)] space-y-1">
        <p>Use official MVs from the group's YouTube channel</p>
        <p>For chorus mode: set the start to where the main hook begins</p>
        <p>Write wrong answers from the SAME group's discography</p>
        <p>Mix title tracks and B-sides for variety</p>
      </div>

      {/* Title */}
      <div className="mb-4">
        <label className="text-xs font-medium text-[var(--text-secondary)] mb-1 block">Title</label>
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="BTS title tracks blind test"
          maxLength={100}
          className="w-full px-3 py-2.5 rounded-lg border border-[var(--border-light)] text-sm focus:border-[var(--border-medium)] focus:outline-none"
        />
        <p className="text-[10px] text-[var(--text-tertiary)] mt-1 text-right">{title.length}/100</p>
      </div>

      {/* Group */}
      <div className="mb-4">
        <label className="text-xs font-medium text-[var(--text-secondary)] mb-1 block">Group</label>
        <select
          value={groupId ?? ''}
          onChange={e => setGroupId(e.target.value ? Number(e.target.value) : null)}
          className="w-full px-3 py-2.5 rounded-lg border border-[var(--border-light)] text-sm focus:border-[var(--border-medium)] focus:outline-none bg-white"
        >
          <option value="">Select a group</option>
          {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
      </div>

      {/* Settings */}
      <div className="flex gap-4 mb-6">
        <div>
          <label className="text-xs font-medium text-[var(--text-secondary)] mb-1 block">Clip duration</label>
          <div className="flex gap-1">
            {[5, 10, 15].map(d => (
              <button
                key={d}
                onClick={() => setClipDuration(d)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium ${
                  clipDuration === d
                    ? 'bg-[var(--text-primary)] text-white'
                    : 'border border-[var(--border-light)] text-[var(--text-secondary)]'
                }`}
              >
                {d}s
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Songs */}
      <div className="space-y-4 mb-6">
        {songs.map((song, i) => (
          <div key={i} className="border border-[var(--border-light)] rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-[var(--text-secondary)]">Song {i + 1}</p>
              {songs.length > 5 && (
                <button
                  onClick={() => setSongs(prev => prev.filter((_, j) => j !== i))}
                  className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M3 3L11 11M11 3L3 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </button>
              )}
            </div>

            {/* YouTube URL */}
            <input
              type="text"
              value={song.youtube_url}
              onChange={e => handleYouTubeUrl(i, e.target.value)}
              placeholder="https://youtube.com/watch?v=..."
              className="w-full px-3 py-2 rounded-lg border border-[var(--border-light)] text-sm mb-2 focus:border-[var(--border-medium)] focus:outline-none"
            />

            {/* Thumbnail + detected info */}
            {song.youtube_id && (
              <div className="flex gap-3 mb-3">
                <img src={song.thumb} alt="" className="w-20 h-12 rounded object-cover flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <input
                    type="text"
                    value={song.title}
                    onChange={e => updateSong(i, { title: e.target.value })}
                    placeholder="Song title"
                    className="w-full px-2 py-1 text-sm border-b border-[var(--border-light)] focus:border-[var(--border-medium)] focus:outline-none mb-1"
                  />
                  <input
                    type="text"
                    value={song.artist}
                    onChange={e => updateSong(i, { artist: e.target.value })}
                    placeholder="Artist"
                    className="w-full px-2 py-1 text-xs text-[var(--text-secondary)] border-b border-[var(--border-light)] focus:border-[var(--border-medium)] focus:outline-none"
                  />
                </div>
              </div>
            )}

            {/* Clip mode */}
            {song.youtube_id && (
              <>
                <div className="flex gap-1 mb-2">
                  {(['chorus', 'intro', 'random', 'custom'] as const).map(mode => (
                    <button
                      key={mode}
                      onClick={() => updateSong(i, { clip_mode: mode, clip_start: mode === 'intro' ? 0 : song.clip_start })}
                      className={`px-3 py-1 rounded-full text-[11px] font-medium ${
                        song.clip_mode === mode
                          ? 'bg-[var(--text-primary)] text-white'
                          : 'border border-[var(--border-light)] text-[var(--text-secondary)]'
                      }`}
                    >
                      {mode.charAt(0).toUpperCase() + mode.slice(1)}
                    </button>
                  ))}
                </div>

                {/* Start time */}
                <div className="flex items-center gap-2 mb-3">
                  <label className="text-[11px] text-[var(--text-tertiary)]">Start at (sec):</label>
                  <input
                    type="number"
                    value={song.clip_start}
                    onChange={e => updateSong(i, { clip_start: Math.max(0, Number(e.target.value)) })}
                    min={0}
                    className="w-20 px-2 py-1 text-sm border border-[var(--border-light)] rounded focus:outline-none focus:border-[var(--border-medium)]"
                  />
                  <a
                    href={`https://youtube.com/watch?v=${song.youtube_id}&t=${song.clip_start}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-[var(--accent-pink)] hover:underline"
                  >
                    Open MV
                  </a>
                </div>

                {/* 4 choices */}
                <div className="space-y-1.5">
                  {song.choices.map((choice, ci) => (
                    <div key={ci} className="flex items-center gap-2">
                      <button
                        onClick={() => updateSong(i, { correct_index: ci })}
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                          song.correct_index === ci
                            ? 'border-[#97C459] bg-[#EAF3DE]'
                            : 'border-[var(--border-light)]'
                        }`}
                      >
                        {song.correct_index === ci && (
                          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                            <path d="M2 5L4 7L8 3" stroke="#27500A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </button>
                      <input
                        type="text"
                        value={choice}
                        onChange={e => {
                          const newChoices = [...song.choices] as [string, string, string, string];
                          newChoices[ci] = e.target.value;
                          updateSong(i, { choices: newChoices });
                        }}
                        placeholder={ci === 0 ? 'Correct answer' : `Wrong answer ${ci}`}
                        maxLength={100}
                        className="flex-1 px-2 py-1.5 text-sm border border-[var(--border-light)] rounded focus:outline-none focus:border-[var(--border-medium)]"
                      />
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Add song */}
      {songs.length < 15 && (
        <button
          onClick={() => setSongs(prev => [...prev, emptySong()])}
          className="w-full py-2.5 rounded-xl border border-dashed border-[var(--border-light)] text-sm text-[var(--text-secondary)] hover:border-[var(--border-medium)] mb-6"
        >
          + Add song
        </button>
      )}

      {error && (
        <p className="text-sm text-[#791F1F] bg-[#FCEBEB] px-4 py-2 rounded-lg mb-4">{error}</p>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={() => handlePublish('draft')}
          disabled={publishing || !title.trim()}
          className="flex-1 py-3 rounded-full border border-[var(--border-light)] text-sm font-medium disabled:opacity-50"
        >
          Save as draft
        </button>
        <button
          onClick={() => handlePublish('published')}
          disabled={publishing || !canPublish}
          className="flex-1 py-3 rounded-full bg-[var(--text-primary)] text-white text-sm font-medium disabled:opacity-50"
        >
          {publishing ? 'Publishing...' : 'Publish'}
        </button>
      </div>

      <p className="text-[10px] text-[var(--text-tertiary)] text-center mt-2">
        {completeSongs.length} of {songs.length} songs complete · Minimum 5 required
      </p>
    </div>
  );
}
